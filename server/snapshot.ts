import { validStaffProfiles } from '../shared/staffProfiles.ts';
import { validGovernance } from '../shared/memberGovernance.ts';
import { INITIAL_INSIGHT_POSTS, validInsightPosts } from '../shared/insightPosts.ts';
import { validSalaryEstimate } from '../shared/salary.ts';
import { legacyObservation, validArchive } from '../shared/paketindexArchive.ts';
import { LEGACY_MARKET_TITLE, MARKET_TITLE, neutralPlaceholder, validMapPoint } from '../shared/portalContent.ts';
import type { CMSStore, DeliveryStatsData, MarketIntelligenceSource, TechPartner } from '../src/types.ts';
import { INITIAL_CMS_DATA } from './seedData.ts';

function hasOwn(obj: object, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

// Only migrate newly introduced fields/versions. Never mutate the input object and
// never restore deleted entities once a snapshot is at schemaVersion >= 3.
export function upgradeSnapshot(value: unknown): unknown {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return value;
  const obj = value as Record<string, unknown>;
  let next: Record<string, unknown> = obj;
  const ensureClone = () => {
    if (next === obj) next = { ...obj };
    return next;
  };

  if (!hasOwn(obj, 'logisticsProviders')) {
    ensureClone().logisticsProviders = structuredClone(INITIAL_CMS_DATA.logisticsProviders);
  }
  if (!hasOwn(obj, 'news')) {
    ensureClone().news = structuredClone(INITIAL_CMS_DATA.news);
  }
  if (!hasOwn(obj, 'paketindex')) {
    ensureClone().paketindex = structuredClone(INITIAL_CMS_DATA.paketindex);
  }
  if (!hasOwn(obj, 'pageContent')) {
    ensureClone().pageContent = structuredClone(INITIAL_CMS_DATA.pageContent);
  }

  if (!hasOwn(obj, 'contactForms')) {
    ensureClone().contactForms = structuredClone(INITIAL_CMS_DATA.contactForms);
  }
  if (!hasOwn(obj, 'directMessages')) {
    ensureClone().directMessages = [];
  }

  const pages = next.pageContent as CMSStore['pageContent'] | undefined;
  if (pages?.marknad?.title === LEGACY_MARKET_TITLE) {
    ensureClone().pageContent = { ...pages, marknad: { ...pages.marknad,
      title: MARKET_TITLE, heroHighlight: 'insikter, partners och möjligheter.' } };
  }
  const forms = next.contactForms as CMSStore['contactForms'];
  if (Array.isArray(forms) && forms.some((form) => Array.isArray(form.fields) && form.fields.some(
    (field) => field.placeholder && neutralPlaceholder(field.placeholder) !== field.placeholder))) {
    ensureClone().contactForms = forms.map((form) => ({ ...form, fields: form.fields.map(
      (field) => field.placeholder ? { ...field, placeholder: neutralPlaceholder(field.placeholder) } : field) }));
  }

  const version = typeof obj.schemaVersion === 'number' ? obj.schemaVersion : 1;
  const seedPartnersById = new Map(INITIAL_CMS_DATA.partners.map((p) => [p.id, p]));

  if (version < 2) {
    const draft = ensureClone();
    if (Array.isArray(obj.partners)) {
      const upgradedPartners: TechPartner[] = (obj.partners as TechPartner[]).map((partner) => {
        const seed = seedPartnersById.get(partner.id);
        if (seed?.carrierMetrics && !partner.carrierMetrics) {
          return { ...partner, carrierMetrics: structuredClone(seed.carrierMetrics) };
        }
        return partner;
      });
      const hasIboxen = upgradedPartners.some(
        (p) => p.id === 'p-iboxen' || p.name.toLowerCase().includes('iboxen')
      );
      const seedIboxen = seedPartnersById.get('p-iboxen');
      if (!hasIboxen && seedIboxen) {
        upgradedPartners.push(structuredClone(seedIboxen));
      }
      draft.partners = upgradedPartners;
    }
  }

  if (version < 3) {
    const draft = ensureClone();
    const currentPartners = Array.isArray(draft.partners) ? (draft.partners as TechPartner[]) : [];
    draft.partners = currentPartners.map((partner) => {
      const isCarrier =
        partner.subType === 'Transportör' ||
        (partner.cat === 'Logistik & Last-mile' && Boolean(partner.carrierMetrics));
      if (!isCarrier) return partner;

      const seed = seedPartnersById.get(partner.id);
      const copy: TechPartner = { ...partner };
      delete copy.customerCount;

      if (copy.carrierMetrics || seed?.carrierMetrics) {
        const currentMetrics = copy.carrierMetrics ?? seed!.carrierMetrics!;
        const seedMetrics = seed?.carrierMetrics;
        copy.carrierMetrics = {
          ...seedMetrics,
          ...currentMetrics,
          parcelLockers:
            partner.id === 'p-dhl' && currentMetrics.parcelLockers === 1100
              ? 750
              : currentMetrics.parcelLockers,
          homeDeliveryPct:
            partner.id === 'p-iboxen' && currentMetrics.homeDeliveryPct === 70
              ? 0
              : currentMetrics.homeDeliveryPct,
          lockerNote: currentMetrics.lockerNote ?? seedMetrics?.lockerNote,
          weightLimits: currentMetrics.weightLimits ?? seedMetrics?.weightLimits,
          dimensionLimits: currentMetrics.dimensionLimits ?? seedMetrics?.dimensionLimits,
          websiteUrl: currentMetrics.websiteUrl ?? seedMetrics?.websiteUrl,
          integrations:
            Array.isArray(currentMetrics.integrations) && currentMetrics.integrations.length > 0
              ? currentMetrics.integrations
              : seedMetrics?.integrations,
        };
      }
      if (partner.id === 'p-iboxen' && seed && copy.desc === 'Transportörsoberoende, rikstäckande infrastruktur för öppna paketboxar utomhus som delas av Sveriges ledande last-mile-bolag.') {
        copy.desc = seed.desc;
      }
      if (partner.id === 'p-dhl' && seed && Array.isArray(copy.keyStrengths)) {
        copy.keyStrengths = copy.keyStrengths.map((s) =>
          s.includes('1 100+ boxar') ? '1 750+ svenska ombud & 750 egna boxar (+ 1 200 iBoxen)' : s
        );
      }
      return copy;
    });

    if (draft.deliveryStats && typeof draft.deliveryStats === 'object') {
      const ds = { ...(draft.deliveryStats as DeliveryStatsData) };
      if (Array.isArray(ds.receptionChannels)) {
        const legacyLocker = ds.receptionChannels.find((c) => c.id === 'rc-locker' && c.sharePct === 46);
        if (legacyLocker) {
          ds.receptionChannels = structuredClone(INITIAL_CMS_DATA.deliveryStats.receptionChannels);
        }
      }
      if (Array.isArray(ds.carrierCoverage)) {
        ds.carrierCoverage = ds.carrierCoverage.map((row) =>
          row.id === 'cc-dhl' && row.parcelLockersCount === 1100
            ? {
                ...row,
                parcelLockersCount: 750,
                boxNetworkNote: '750 egna skåp + tillgång till 1 200 iBoxen-skåp via partnerupplägg',
              }
            : row
        );
      }
      draft.deliveryStats = ds;
    }

    if (Array.isArray(draft.intelligenceSources)) {
      const seedPi = INITIAL_CMS_DATA.intelligenceSources.find((s) => s.id === 'paketindex');
      draft.intelligenceSources = (draft.intelligenceSources as MarketIntelligenceSource[]).map((src) =>
        src.id === 'paketindex' && src.headlineValue === '182 milj paket' && seedPi
          ? structuredClone(seedPi)
          : src
      );
    }

    draft.schemaVersion = 3;
  }

  if (version < 4) {
    const draft = ensureClone();
    if (!Array.isArray(draft.contactForms) || draft.contactForms.length === 0) {
      draft.contactForms = structuredClone(INITIAL_CMS_DATA.contactForms);
    }
    draft.schemaVersion = 4;
  }

  if (!hasOwn(obj, 'insightPosts')) ensureClone().insightPosts = structuredClone(INITIAL_INSIGHT_POSTS);
  if (!hasOwn(obj, 'paketindexArchive')) {
    const legacy = next.paketindex as CMSStore['paketindex'];
    ensureClone().paketindexArchive = legacyObservation(legacy);
  }
  return next;
}

export function validateSnapshot(value: unknown): value is CMSStore {
  if (!value || typeof value !== 'object') return false;
  const store = value as Record<string, unknown>;
  const arrays = ['merchants', 'partners', 'logisticsProviders', 'news', 'events', 'sessions', 'jobs', 'recruitmentSites',
    'orderBenchmarks', 'shippingTiers', 'laws', 'intelligenceSources', 'techStackShares',
    'adBanners', 'contactForms', 'contactMessages', 'timeline', 'communityThreads', 'communityMembers', 'directMessages'];
  return (store.staffProfiles === undefined || validStaffProfiles(store.staffProfiles)) && (store.memberGovernance === undefined || validGovernance(store.memberGovernance)) && (store.insightPosts === undefined || validInsightPosts(store.insightPosts)) && (Array.isArray(store.jobs) && store.jobs.every((job) => job && (job.salaryEstimate == null || validSalaryEstimate(job.salaryEstimate)))) && (store.paketindexArchive === undefined || validArchive(store.paketindexArchive)) && (store.mapPoints === undefined || (Array.isArray(store.mapPoints) &&
    store.mapPoints.every(validMapPoint) && new Set(store.mapPoints.map((point) => point.id)).size === store.mapPoints.length)) && arrays.every((key) => Array.isArray(store[key])) &&
    ['regions', 'deliveryStats', 'paketindex', 'pageContent'].every((key) => store[key] !== null &&
      typeof store[key] === 'object' && !Array.isArray(store[key])) &&
    (Array.isArray(store.contactMessages) && store.contactMessages.every((message)=>message && (message.assignedStaffUid === undefined || (typeof message.assignedStaffUid === 'string' && message.assignedStaffUid.length > 0 && message.assignedStaffUid.length <= 128)))) &&
    typeof store.updatedAt === 'string';
}
