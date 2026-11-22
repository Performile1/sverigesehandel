import { validHomeWidgets } from '../shared/homeWidgets.ts';
import type { HomeWidgetLayout } from '../src/types.ts';
import { editorialConflict, editorialChange, lifecycleInput } from './editorialHistory.ts';
import { publiclyVisible, validSaleCases, validCmsImage } from '../shared/editorialLifecycle.ts';
import type { EditorialKind, EditorialLifecycle } from '../src/types.ts';
import { normalizeLoginEmail } from '../shared/authOptions.ts';
import { INITIAL_START_GUIDE } from '../shared/startGuide.ts';
import { validChapter, validGuide, saleDetails, validSaleListings } from '../shared/commerce.ts';
import type { GuideChapter, SaleListing } from '../src/types.ts';
import type { UserInvitation } from './userInvitation.ts';
import { parseCmsUserInput } from './cmsUsers.ts';
import type { ResolvedCmsUser } from './cmsUsers.ts';
import { validStaffProfile, validStaffProfiles } from '../shared/staffProfiles.ts';
import type { StaffProfile } from '../src/types.ts';
import { isBlocked, emptyGovernance } from '../shared/memberGovernance.ts';
import { runGovernance, companyWorkspace, assertCommunityAction, companyInboxAvailable } from './memberGovernance.ts';
import type { CmsIdentity } from './authPolicy.ts';
import { INITIAL_INSIGHT_POSTS, validInsightPost, validInsightPosts } from '../shared/insightPosts.ts';
import type { InsightPost } from '../src/types.ts';
import { validSalaryEstimate } from '../shared/salary.ts';
import { observationKey, parseArchiveCsv, validArchive, validObservation, legacyObservation } from '../shared/paketindexArchive.ts';
import type { PaketindexObservation } from '../src/types.ts';
import type { CmsImage } from '../src/types.ts';
import { validMapPoint } from '../shared/portalContent.ts';
import type { MapPoint } from '../src/types.ts';
import { articleUrl, jobSummary } from '../shared/editorial.ts';
import { AsyncLocalStorage } from 'node:async_hooks';
import fs from 'fs';
import path from 'path';
import type {
  AdBanner,
  CategoryOrderBenchmark,
  CMSStore,
  CommunityComment,
  CommunityDirectMessage,
  CommunityMember,
  CommunityMemberType,
  CommunityThread,
  ContactFormConfig,
  ContactMessage,
  ContactMessageStatus,
  DCSession,
  DeliveryStatsData,
  PublicMemberProfile,
  EcommerceEvent,
  EcommerceJob,
  EcommerceLaw,
  EcommerceNewsItem,
  FormRoutingMode,
  JobValidityStatus,
  LogisticsProvider,
  MarketIntelligenceSource,
  Merchant,
  PageContentMap,
  PaketindexData,
  RecruitmentSite,
  RegionMetric,
  ShippingCostTier,
  TechPartner,
  TechStackShare,
  TimelineMilestone,
} from '../src/types.ts';
import { INITIAL_CMS_DATA } from './seedData.ts';
import { upgradeSnapshot } from './snapshot.ts';

// Keep each Firestore transaction's synchronous domain operations isolated.
// The file adapter below remains available for the original local data tooling.
const requestStore = new AsyncLocalStorage<{ store: CMSStore; changed: boolean }>();

export function withStore<T>(store: CMSStore, operation: () => T) {
  const state = { store: structuredClone(store), changed: false };
  const value = requestStore.run(state, operation);
  return { value, ...state };
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'cms-db.json');
let memoryFallbackStore: CMSStore | null = null;

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function defaultExpiryIso(daysAhead = 45): string {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  return d.toISOString().slice(0, 10);
}

function isValidHttpsUrl(url: string | undefined): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url.trim());
    return (
      (parsed.protocol === 'https:' || parsed.protocol === 'http:') &&
      parsed.hostname.includes('.') &&
      !parsed.hostname.includes('example.') &&
      !parsed.hostname.includes('localhost')
    );
  } catch {
    return false;
  }
}

function evaluateJobValidity(job: EcommerceJob, today: string): {
  jobStatus: JobValidityStatus;
  status: 'published' | 'draft';
  validationNote: string;
} {
  if (job.jobStatus === 'closed') {
    return {
      jobStatus: 'closed',
      status: 'draft',
      validationNote: job.validationNote || 'Stängd av redaktör',
    };
  }

  const textBlob = `${job.title} ${job.desc} ${job.postedAt}`.toLowerCase();
  if (
    textBlob.includes('tillsatt') ||
    textBlob.includes('stängd annons') ||
    textBlob.includes('ansökningstid passerad') ||
    textBlob.includes('utgången')
  ) {
    return {
      jobStatus: 'expired',
      status: 'draft',
      validationNote: 'Stängd automatiskt: annonsen markerad som utgången/tillsatt',
    };
  }

  if (job.expiresAt && /^\d{4}-\d{2}-\d{2}$/.test(job.expiresAt) && job.expiresAt < today) {
    return {
      jobStatus: 'expired',
      status: 'draft',
      validationNote: `Stängd automatiskt: sista ansökningsdag passerad (${job.expiresAt})`,
    };
  }

  if (!isValidHttpsUrl(job.applyUrl)) {
    return {
      jobStatus: 'expired',
      status: 'draft',
      validationNote: 'Stängd automatiskt: ogiltig eller saknad ansökningslänk',
    };
  }

  return {
    jobStatus: 'active',
    status: job.status === 'draft' ? 'draft' : 'published',
    validationNote: job.validationNote || 'Aktiv annons · verifierad länk',
  };
}

function mergeSeedMerchants(existing: Merchant[]): { list: Merchant[]; changed: boolean } {
  const seedById = new Map(INITIAL_CMS_DATA.merchants.map((m) => [m.id, m]));
  let changed = false;

  const updatedExisting = existing.map((m) => {
    const seed = seedById.get(m.id);
    if (!seed) return m;
    if (!m.yoyGrowth || !m.revenueNumericM) {
      changed = true;
      return {
        ...seed,
        ...m,
        revenue: m.revenue.includes('>') || m.revenue.includes('–') ? seed.revenue : m.revenue,
        revenueNumericM: m.revenueNumericM ?? seed.revenueNumericM,
        yoyGrowth: m.yoyGrowth ?? seed.yoyGrowth,
        yoyGrowthPct: m.yoyGrowthPct ?? seed.yoyGrowthPct,
        revenueYear: m.revenueYear ?? seed.revenueYear,
      };
    }
    return m;
  });

  const existingKeys = new Set(
    updatedExisting.flatMap((m) => [m.id.toLowerCase(), m.name.toLowerCase(), m.domain.toLowerCase()])
  );
  const toAdd = INITIAL_CMS_DATA.merchants.filter(
    (s) =>
      !existingKeys.has(s.id.toLowerCase()) &&
      !existingKeys.has(s.name.toLowerCase()) &&
      !existingKeys.has(s.domain.toLowerCase())
  );

  if (toAdd.length > 0) changed = true;
  return { list: [...updatedExisting, ...toAdd], changed };
}

function mergeSeedPartners(existing: TechPartner[]): { list: TechPartner[]; changed: boolean } {
  const seedById = new Map(INITIAL_CMS_DATA.partners.map((p) => [p.id, p]));
  let changed = false;

  const updatedExisting = existing.map((p) => {
    const seed = seedById.get(p.id);
    if (!seed) return p;
    const isCarrier = p.subType === 'Transportör' || seed.subType === 'Transportör';
    const needsUpgrade = isCarrier
      ? Boolean(p.customerCount) ||
        !p.carrierMetrics ||
        !p.carrierMetrics.weightLimits ||
        !p.carrierMetrics.websiteUrl ||
        !p.carrierMetrics.integrations ||
        (p.id === 'p-iboxen' && p.carrierMetrics.homeDeliveryPct === 70) ||
        (p.id === 'p-dhl' && p.carrierMetrics.parcelLockers === 1100)
      : !p.customerCount || !p.subType || !p.pricingModel;

    if (needsUpgrade) {
      changed = true;
      const next: TechPartner = {
        ...seed,
        ...p,
        subType: p.subType ?? seed.subType,
        pricingModel: p.pricingModel ?? seed.pricingModel,
        setupTime: p.setupTime ?? seed.setupTime,
        bestFor: p.bestFor ?? seed.bestFor,
        keyStrengths: p.keyStrengths && p.keyStrengths.length > 0 ? p.keyStrengths : seed.keyStrengths,
        carrierMetrics: seed.carrierMetrics
          ? {
              ...seed.carrierMetrics,
              ...(p.carrierMetrics ?? {}),
              parcelLockers:
                p.id === 'p-dhl' && p.carrierMetrics?.parcelLockers === 1100
                  ? 750
                  : p.carrierMetrics?.parcelLockers ?? seed.carrierMetrics.parcelLockers,
              homeDeliveryPct:
                p.id === 'p-iboxen' && p.carrierMetrics?.homeDeliveryPct === 70
                  ? 0
                  : p.carrierMetrics?.homeDeliveryPct ?? seed.carrierMetrics.homeDeliveryPct,
              lockerNote: p.carrierMetrics?.lockerNote ?? seed.carrierMetrics.lockerNote,
              weightLimits: p.carrierMetrics?.weightLimits ?? seed.carrierMetrics.weightLimits,
              dimensionLimits: p.carrierMetrics?.dimensionLimits ?? seed.carrierMetrics.dimensionLimits,
              websiteUrl: p.carrierMetrics?.websiteUrl ?? seed.carrierMetrics.websiteUrl,
              integrations:
                p.carrierMetrics?.integrations && p.carrierMetrics.integrations.length > 0
                  ? p.carrierMetrics.integrations
                  : seed.carrierMetrics.integrations,
            }
          : p.carrierMetrics,
      };
      if (isCarrier) {
        delete next.customerCount;
      } else {
        next.customerCount = p.customerCount ?? seed.customerCount;
      }
      return next;
    }
    return p;
  });

  const existingKeys = new Set(
    updatedExisting.flatMap((p) => [p.id.toLowerCase(), p.name.toLowerCase(), p.domain.toLowerCase()])
  );
  const toAdd = INITIAL_CMS_DATA.partners.filter(
    (s) =>
      !existingKeys.has(s.id.toLowerCase()) &&
      !existingKeys.has(s.name.toLowerCase()) &&
      !existingKeys.has(s.domain.toLowerCase())
  );

  if (toAdd.length > 0) changed = true;
  return { list: [...updatedExisting, ...toAdd], changed };
}

function mergeAndValidateJobs(existing: EcommerceJob[]): { list: EcommerceJob[]; changed: boolean } {
  const seedById = new Map(INITIAL_CMS_DATA.jobs.map((j) => [j.id, j]));
  const today = todayIso();
  let changed = false;

  const updatedExisting = existing.map((j) => {
    const seed = seedById.get(j.id);
    const merged: EcommerceJob = seed
      ? {
          ...seed,
          ...j,
          expiresAt: j.expiresAt ?? seed.expiresAt,
          verifiedAt: j.verifiedAt ?? seed.verifiedAt,
        }
      : {
          ...j,
          expiresAt: j.expiresAt ?? defaultExpiryIso(45),
          verifiedAt: j.verifiedAt ?? today,
        };

    const check = evaluateJobValidity(merged, today);
    if (
      merged.jobStatus !== check.jobStatus ||
      merged.status !== check.status ||
      merged.validationNote !== check.validationNote
    ) {
      changed = true;
    }

    return {
      ...merged,
      jobStatus: check.jobStatus,
      status: check.status,
      validationNote: check.validationNote,
    };
  });

  const existingIds = new Set(updatedExisting.map((j) => j.id));
  const missingSeed = INITIAL_CMS_DATA.jobs.filter((s) => !existingIds.has(s.id));
  if (missingSeed.length > 0) changed = true;

  return { list: [...updatedExisting, ...missingSeed], changed };
}

function ensureStoreFile(): CMSStore {
  const state = requestStore.getStore();
  if (state) return state.store;
  if (memoryFallbackStore && !fs.existsSync(DB_FILE)) {
    return memoryFallbackStore;
  }
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(DB_FILE)) {
      fs.writeFileSync(DB_FILE, JSON.stringify(INITIAL_CMS_DATA, null, 2), 'utf-8');
      return structuredClone(INITIAL_CMS_DATA);
    }
  } catch {
    if (!memoryFallbackStore) memoryFallbackStore = structuredClone(INITIAL_CMS_DATA);
    return memoryFallbackStore;
  }
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    const parsed = JSON.parse(raw) as Partial<CMSStore>;

    const baseMerchants = Array.isArray(parsed.merchants) ? parsed.merchants : INITIAL_CMS_DATA.merchants;
    const basePartners = Array.isArray(parsed.partners) ? parsed.partners : INITIAL_CMS_DATA.partners;
    const baseJobs =
      Array.isArray(parsed.jobs) && parsed.jobs.length > 0 ? parsed.jobs : INITIAL_CMS_DATA.jobs;

    const mergedMerchants = mergeSeedMerchants(baseMerchants);
    const mergedPartners = mergeSeedPartners(basePartners);
    const mergedJobs = mergeAndValidateJobs(baseJobs);

    const baseLogistics = Array.isArray(parsed.logisticsProviders)
      ? parsed.logisticsProviders
      : INITIAL_CMS_DATA.logisticsProviders;
    const hadDream = baseLogistics.some(
      (l) => l.id === 'lp-dreamlogistics' || l.name.toLowerCase() === 'dreamlogistics'
    );
    const seedShelfless = INITIAL_CMS_DATA.logisticsProviders.find((s) => s.id === 'lp-shelfless');
    let shelflessUpgraded = false;
    const cleanedLogistics = baseLogistics
      .filter((l) => l.id !== 'lp-dreamlogistics' && l.name.toLowerCase() !== 'dreamlogistics')
      .map((l) => {
        if (
          l.id === 'lp-shelfless' &&
          seedShelfless &&
          !l.desc.includes('tidigare DreamLogistics')
        ) {
          shelflessUpgraded = true;
          return { ...seedShelfless, updatedAt: l.updatedAt };
        }
        return l;
      });
    const existingLogIds = new Set(cleanedLogistics.map((l) => l.id));
    const missingSeedLogistics = INITIAL_CMS_DATA.logisticsProviders.filter(
      (s) => !existingLogIds.has(s.id)
    );
    const mergedLogistics = [...cleanedLogistics, ...missingSeedLogistics];
    const logisticsChanged =
      hadDream || shelflessUpgraded || missingSeedLogistics.length > 0 || !parsed.logisticsProviders;

    const rawRegions = parsed.regions ?? INITIAL_CMS_DATA.regions;
    let regionsChanged = !parsed.regions;
    const mergedRegions: Record<string, RegionMetric> = { ...rawRegions };
    for (const [key, seedReg] of Object.entries(INITIAL_CMS_DATA.regions)) {
      const existingReg = mergedRegions[key];
      if (!existingReg) {
        mergedRegions[key] = seedReg;
        regionsChanged = true;
      } else if (
        existingReg.populationDensityPerKm2 === undefined ||
        existingReg.lockersPer10kResidents === undefined ||
        existingReg.homeDeliveryEveningPct === undefined
      ) {
        mergedRegions[key] = { ...seedReg, ...existingReg };
        regionsChanged = true;
      }
    }

    const rawDelivery = parsed.deliveryStats;
    const deliveryChanged =
      !rawDelivery ||
      !Array.isArray(rawDelivery.carrierCoverage) ||
      rawDelivery.carrierCoverage.length === 0 ||
      !Array.isArray(rawDelivery.lockerNetworks) ||
      rawDelivery.lockerNetworks.length === 0;
    const mergedDelivery: DeliveryStatsData = rawDelivery
      ? {
          ...INITIAL_CMS_DATA.deliveryStats,
          ...rawDelivery,
          carrierCoverage:
            Array.isArray(rawDelivery.carrierCoverage) && rawDelivery.carrierCoverage.length > 0
              ? rawDelivery.carrierCoverage
              : INITIAL_CMS_DATA.deliveryStats.carrierCoverage,
          lockerNetworks:
            Array.isArray(rawDelivery.lockerNetworks) && rawDelivery.lockerNetworks.length > 0
              ? rawDelivery.lockerNetworks
              : INITIAL_CMS_DATA.deliveryStats.lockerNetworks,
        }
      : INITIAL_CMS_DATA.deliveryStats;

    const upgradedRaw = upgradeSnapshot(parsed) as Partial<CMSStore>;
    const hydrated: CMSStore = {
      schemaVersion: 3,
      merchants: mergedMerchants.list,
      partners: mergedPartners.list,
      logisticsProviders: mergedLogistics,
      news: Array.isArray(upgradedRaw.news) ? upgradedRaw.news : INITIAL_CMS_DATA.news,
      events:
        Array.isArray(upgradedRaw.events) && upgradedRaw.events.length > 0
          ? upgradedRaw.events
          : INITIAL_CMS_DATA.events,
      sessions: upgradedRaw.sessions ?? INITIAL_CMS_DATA.sessions,
      jobs: mergedJobs.list,
      recruitmentSites:
        Array.isArray(upgradedRaw.recruitmentSites) && upgradedRaw.recruitmentSites.length > 0
          ? upgradedRaw.recruitmentSites
          : INITIAL_CMS_DATA.recruitmentSites,
      regions: mergedRegions,
      mapPoints: Array.isArray(parsed.mapPoints) ? parsed.mapPoints : [],
      paketindexArchive: upgradedRaw.paketindexArchive,
      insightPosts: upgradedRaw.insightPosts,
      startGuide: upgradedRaw.startGuide,
      homeWidgets: upgradedRaw.homeWidgets,
      editorialHistory: upgradedRaw.editorialHistory,
      saleCases: upgradedRaw.saleCases,
      saleListings: upgradedRaw.saleListings,
      memberGovernance: upgradedRaw.memberGovernance,
      staffProfiles: upgradedRaw.staffProfiles,
      orderBenchmarks:
        Array.isArray(upgradedRaw.orderBenchmarks) && upgradedRaw.orderBenchmarks.length > 0
          ? upgradedRaw.orderBenchmarks
          : INITIAL_CMS_DATA.orderBenchmarks,
      shippingTiers:
        Array.isArray(upgradedRaw.shippingTiers) && upgradedRaw.shippingTiers.length > 0
          ? upgradedRaw.shippingTiers
          : INITIAL_CMS_DATA.shippingTiers,
      deliveryStats: mergedDelivery,
      paketindex:
        upgradedRaw.paketindex && typeof upgradedRaw.paketindex === 'object'
          ? upgradedRaw.paketindex
          : INITIAL_CMS_DATA.paketindex,
      pageContent:
        upgradedRaw.pageContent && typeof upgradedRaw.pageContent === 'object'
          ? { ...INITIAL_CMS_DATA.pageContent, ...upgradedRaw.pageContent }
          : INITIAL_CMS_DATA.pageContent,
      laws:
        Array.isArray(upgradedRaw.laws) && upgradedRaw.laws.length > 0
          ? upgradedRaw.laws
          : INITIAL_CMS_DATA.laws,
      intelligenceSources:
        Array.isArray(upgradedRaw.intelligenceSources) && upgradedRaw.intelligenceSources.length > 0
          ? upgradedRaw.intelligenceSources
          : INITIAL_CMS_DATA.intelligenceSources,
      techStackShares:
        Array.isArray(upgradedRaw.techStackShares) && upgradedRaw.techStackShares.length > 0
          ? upgradedRaw.techStackShares
          : INITIAL_CMS_DATA.techStackShares,
      adBanners:
        Array.isArray(upgradedRaw.adBanners) && upgradedRaw.adBanners.length > 0
          ? upgradedRaw.adBanners
          : INITIAL_CMS_DATA.adBanners,
      contactForms:
        Array.isArray(upgradedRaw.contactForms) && upgradedRaw.contactForms.length > 0
          ? upgradedRaw.contactForms
          : INITIAL_CMS_DATA.contactForms,
      contactMessages: Array.isArray(upgradedRaw.contactMessages) ? upgradedRaw.contactMessages : [],
      timeline: upgradedRaw.timeline ?? INITIAL_CMS_DATA.timeline,
      communityThreads: upgradedRaw.communityThreads ?? INITIAL_CMS_DATA.communityThreads,
      communityMembers: upgradedRaw.communityMembers ?? [],
      directMessages: Array.isArray(upgradedRaw.directMessages) ? upgradedRaw.directMessages : [],
      updatedAt: upgradedRaw.updatedAt ?? new Date().toISOString(),
    };

    const rawReceptionLegacy = mergedDelivery.receptionChannels?.some(
      (c) => c.id === 'rc-locker' && c.sharePct === 46
    );
    if (rawReceptionLegacy && upgradedRaw.deliveryStats?.receptionChannels) {
      hydrated.deliveryStats = {
        ...hydrated.deliveryStats,
        receptionChannels: upgradedRaw.deliveryStats.receptionChannels,
      };
    }

    if (
      mergedMerchants.changed ||
      mergedPartners.changed ||
      mergedJobs.changed ||
      regionsChanged ||
      deliveryChanged ||
      (parsed.schemaVersion ?? 1) < 4 ||
      !parsed.paketindex ||
      !parsed.pageContent ||
      !parsed.contactForms ||
      !parsed.news ||
      !parsed.events ||
      !parsed.jobs ||
      !parsed.recruitmentSites ||
      !parsed.orderBenchmarks ||
      !parsed.shippingTiers ||
      !parsed.laws ||
      !parsed.intelligenceSources ||
      !parsed.techStackShares ||
      !parsed.adBanners ||
      logisticsChanged
    ) {
      try {
        fs.writeFileSync(DB_FILE, JSON.stringify(hydrated, null, 2), 'utf-8');
      } catch {
        memoryFallbackStore = hydrated;
      }
    }
    return hydrated;
  } catch {
    const fresh = structuredClone(INITIAL_CMS_DATA);
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(fresh, null, 2), 'utf-8');
    } catch {
      memoryFallbackStore = fresh;
    }
    return fresh;
  }
}

function saveStore(store: CMSStore): CMSStore {
  const state = requestStore.getStore();
  if (state) {
    store.updatedAt = new Date().toISOString();
    state.store = store;
    state.changed = true;
    return store;
  }
  store.updatedAt = new Date().toISOString();
  memoryFallbackStore = store;
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(store, null, 2), 'utf-8');
  } catch {
    // Keep memoryFallbackStore in read-only environments
  }
  return store;
}

export function getStore(): CMSStore {
  return ensureStoreFile();
}

export function replaceStore(newStore: CMSStore): CMSStore {
  return saveStore(newStore);
}

export function resetStore(): CMSStore {
  return saveStore({
    ...structuredClone(INITIAL_CMS_DATA),
    contactMessages: [],
    communityMembers: [],
    directMessages: [],
  });
}

export function upsertMerchant(input: Partial<Merchant> & { name: string }): { merchant: Merchant; created: boolean } {
  const store = ensureStoreFile();
  const now = new Date().toISOString();
  const cleanName = input.name.trim();
  const cleanDomain = (input.domain || '').trim().toLowerCase();

  const existingIdx = store.merchants.findIndex(
    (m) =>
      (input.id && m.id === input.id) ||
      m.name.toLowerCase() === cleanName.toLowerCase() ||
      (cleanDomain && m.domain.toLowerCase() === cleanDomain)
  );

  if (existingIdx >= 0) {
    const existing = store.merchants[existingIdx];
    const updated: Merchant = {
      ...existing,
      ...input,
      id: existing.id,
      name: cleanName || existing.name,
      domain: cleanDomain || existing.domain,
      annualPackages:
        'annualPackages' in input
          ? typeof input.annualPackages === 'number' && input.annualPackages > 0
            ? Math.round(input.annualPackages)
            : undefined
          : existing.annualPackages,
      updatedAt: now,
    };
    store.merchants[existingIdx] = updated;
    saveStore(store);
    return { merchant: updated, created: false };
  }

  const created: Merchant = {
    id: input.id || `m-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: cleanName,
    domain: cleanDomain || `${cleanName.toLowerCase().replace(/[^a-z0-9]/g, '')}.se`,
    city: input.city?.trim() || 'Stockholm',
    region: input.region || 'svealand',
    category: input.category || 'Övrigt',
    trustpilot: typeof input.trustpilot === 'number' ? input.trustpilot : 4.5,
    reviews: input.reviews || '1 000+',
    revenue: input.revenue || '100–500M SEK',
    revenueNumericM: input.revenueNumericM,
    annualPackages:
      typeof input.annualPackages === 'number' && input.annualPackages > 0
        ? Math.round(input.annualPackages)
        : undefined,
    yoyGrowth: input.yoyGrowth || '+8% YoY',
    yoyGrowthPct: typeof input.yoyGrowthPct === 'number' ? input.yoyGrowthPct : 8,
    revenueYear: input.revenueYear || '2025/2026',
    platform: input.platform || 'Shopify Plus / Headless',
    paymentProvider: input.paymentProvider || 'Klarna & Swish',
    carrier: input.carrier || 'PostNord, Instabox',
    certs: Array.isArray(input.certs) && input.certs.length > 0 ? input.certs : ['Trygg E-handel'],
    desc: input.desc?.trim() || `Svensk e-handlare baserad i ${input.city || 'Sverige'}.`,
    status: input.status || 'published',
    sourceUrl: input.sourceUrl,
    updatedAt: now,
  };

  store.merchants.unshift(created);
  saveStore(store);
  return { merchant: created, created: true };
}

export function batchAddMerchants(items: Array<Partial<Merchant> & { name: string }>): { added: Merchant[]; skipped: string[] } {
  const store = ensureStoreFile();
  const now = new Date().toISOString();
  const added: Merchant[] = [];
  const skipped: string[] = [];

  for (const input of items) {
    const cleanName = input.name.trim();
    if (!cleanName) continue;
    const cleanDomain = (input.domain || '').trim().toLowerCase();
    const exists = store.merchants.some(
      (m) =>
        m.name.toLowerCase() === cleanName.toLowerCase() ||
        (cleanDomain && m.domain.toLowerCase() === cleanDomain)
    );
    if (exists) {
      skipped.push(cleanName);
      continue;
    }

    const created: Merchant = {
      id: `m-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: cleanName,
      domain: cleanDomain || `${cleanName.toLowerCase().replace(/[^a-z0-9]/g, '')}.se`,
      city: input.city?.trim() || 'Sverige',
      region: input.region || 'svealand',
      category: input.category || 'Övrigt',
      trustpilot: typeof input.trustpilot === 'number' ? input.trustpilot : 4.4,
      reviews: input.reviews || 'Verifierad',
      revenue: input.revenue || '100–500M SEK',
      revenueNumericM: input.revenueNumericM,
      annualPackages:
        typeof input.annualPackages === 'number' && input.annualPackages > 0
          ? Math.round(input.annualPackages)
          : undefined,
      yoyGrowth: input.yoyGrowth || '+8% YoY',
      yoyGrowthPct: typeof input.yoyGrowthPct === 'number' ? input.yoyGrowthPct : 8,
      revenueYear: input.revenueYear || '2025/2026',
      platform: input.platform || 'Modern E-handel',
      paymentProvider: input.paymentProvider || 'Klarna & Swish',
      carrier: input.carrier || 'PostNord, Instabox',
      certs: Array.isArray(input.certs) && input.certs.length > 0 ? input.certs : ['Trygg E-handel'],
      desc: input.desc?.trim() || `Svensk e-handlare inom ${input.category || 'digital handel'}.`,
      status: input.status || 'published',
      sourceUrl: input.sourceUrl,
      updatedAt: now,
    };
    store.merchants.unshift(created);
    added.push(created);
  }

  saveStore(store);
  return { added, skipped };
}

export function deleteMerchant(id: string): boolean {
  const store = ensureStoreFile();
  const before = store.merchants.length;
  store.merchants = store.merchants.filter((m) => m.id !== id);
  if (store.merchants.length === before) return false;
  saveStore(store);
  return true;
}

export function upsertPartner(input: Partial<TechPartner> & { name: string }): { partner: TechPartner; created: boolean } {
  const store = ensureStoreFile();
  const now = new Date().toISOString();
  const cleanName = input.name.trim();
  const cleanDomain = (input.domain || '').trim().toLowerCase();

  const existingIdx = store.partners.findIndex(
    (p) =>
      (input.id && p.id === input.id) ||
      p.name.toLowerCase() === cleanName.toLowerCase() ||
      (cleanDomain && p.domain.toLowerCase() === cleanDomain)
  );

  if (existingIdx >= 0) {
    const existing = store.partners[existingIdx];
    const resolvedSubType = input.subType ?? existing.subType;
    const isCarrier = resolvedSubType === 'Transportör';
    const updated: TechPartner = {
      ...existing,
      ...input,
      id: existing.id,
      name: cleanName || existing.name,
      domain: cleanDomain || existing.domain,
      introEmail:
        'introEmail' in input
          ? input.introEmail?.trim() || undefined
          : existing.introEmail,
      introRoutingMode: input.introRoutingMode ?? existing.introRoutingMode,
      updatedAt: now,
    };
    delete updated.hasDirectIntroEmail;
    delete updated.hasCompanyIntroInbox;
    if (isCarrier) {
      delete updated.customerCount;
    }
    store.partners[existingIdx] = updated;
    saveStore(store);
    return { partner: updated, created: false };
  }

  const resolvedSubType = input.subType || input.cat || 'E-handelsplattform';
  const isCarrier = resolvedSubType === 'Transportör';
  const created: TechPartner = {
    id: input.id || `p-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: cleanName,
    domain: cleanDomain || `${cleanName.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`,
    cat: input.cat || 'E-handelsplattform',
    subType: resolvedSubType,
    origin: input.origin?.trim() || 'Stockholm',
    stack: input.stack?.trim() || 'Cloud · API-first',
    ...(isCarrier
      ? {}
      : { customerCount: input.customerCount?.trim() || 'Verifierade nordiska kunder' }),
    pricingModel: input.pricingModel?.trim() || 'SaaS / Avtal',
    setupTime: input.setupTime?.trim() || '1–4 veckor',
    bestFor: input.bestFor?.trim() || 'Svenska e-handlare i tillväxt',
    keyStrengths: Array.isArray(input.keyStrengths) ? input.keyStrengths : [],
    ...(input.carrierMetrics ? { carrierMetrics: input.carrierMetrics } : {}),
    notableClients: Array.isArray(input.notableClients) ? input.notableClients : [],
    desc: input.desc?.trim() || 'Teknisk partner för nordisk e-handel.',
    ...(input.introEmail?.trim() ? { introEmail: input.introEmail.trim() } : {}),
    ...(input.introRoutingMode ? { introRoutingMode: input.introRoutingMode } : {}),
    status: input.status || 'published',
    sourceUrl: input.sourceUrl,
    updatedAt: now,
  };

  store.partners.unshift(created);
  saveStore(store);
  return { partner: created, created: true };
}

export function batchAddPartners(items: Array<Partial<TechPartner> & { name: string }>): { added: TechPartner[]; skipped: string[] } {
  const store = ensureStoreFile();
  const now = new Date().toISOString();
  const added: TechPartner[] = [];
  const skipped: string[] = [];

  for (const input of items) {
    const cleanName = input.name.trim();
    if (!cleanName) continue;
    const cleanDomain = (input.domain || '').trim().toLowerCase();
    const exists = store.partners.some(
      (p) =>
        p.name.toLowerCase() === cleanName.toLowerCase() ||
        (cleanDomain && p.domain.toLowerCase() === cleanDomain)
    );
    if (exists) {
      skipped.push(cleanName);
      continue;
    }

    const resolvedSubType = input.subType || input.cat || 'E-handelsplattform';
    const isCarrier = resolvedSubType === 'Transportör';
    const created: TechPartner = {
      id: `p-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: cleanName,
      domain: cleanDomain || `${cleanName.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`,
      cat: input.cat || 'E-handelsplattform',
      subType: resolvedSubType,
      origin: input.origin?.trim() || 'Stockholm',
      stack: input.stack?.trim() || 'SaaS · API-first',
      ...(isCarrier
        ? {}
        : { customerCount: input.customerCount?.trim() || 'Nordiska & globala handlare' }),
      pricingModel: input.pricingModel?.trim() || 'SaaS / Transaktionsbaserad',
      setupTime: input.setupTime?.trim() || '1–4 veckor',
      bestFor: input.bestFor?.trim() || 'Växande svenska e-handlare',
      keyStrengths: Array.isArray(input.keyStrengths) ? input.keyStrengths : [],
      ...(input.carrierMetrics ? { carrierMetrics: input.carrierMetrics } : {}),
      notableClients: Array.isArray(input.notableClients) ? input.notableClients : [],
      desc: input.desc?.trim() || `Nordisk tech-partner inom ${input.cat || 'e-handel'}.`,
      status: input.status || 'published',
      sourceUrl: input.sourceUrl,
      updatedAt: now,
    };
    store.partners.unshift(created);
    added.push(created);
  }

  saveStore(store);
  return { added, skipped };
}

export function deletePartner(id: string): boolean {
  const store = ensureStoreFile();
  const before = store.partners.length;
  store.partners = store.partners.filter((p) => p.id !== id);
  if (store.partners.length === before) return false;
  saveStore(store);
  return true;
}

export function upsertEvent(input: Partial<EcommerceEvent> & { name: string }): EcommerceEvent {
  const store = ensureStoreFile();
  const idx = input.id ? store.events.findIndex((e) => e.id === input.id) : -1;
  if (idx >= 0) {
    const updated: EcommerceEvent = { ...store.events[idx], ...input };
    store.events[idx] = updated;
    saveStore(store);
    return updated;
  }
  const created: EcommerceEvent = {
    id: `ev-${Date.now()}`,
    name: input.name.trim(),
    dateLabel: input.dateLabel || '2027',
    city: input.city || 'Stockholm',
    venue: input.venue || 'Stockholm',
    organizer: input.organizer || 'Branscharrangör',
    ticketInfo: input.ticketInfo || 'Branschregistrering',
    focusAreas: Array.isArray(input.focusAreas) ? input.focusAreas : ['E-handel'],
    audienceType: input.audienceType || 'E-handlare och partners',
    website: input.website || '',
    desc: input.desc || '',
    featured: input.featured ?? false,
    status: input.status || 'published',
  };
  store.events.push(created);
  saveStore(store);
  return created;
}

export function deleteEvent(id: string): boolean {
  const store = ensureStoreFile();
  const before = store.events.length;
  store.events = store.events.filter((e) => e.id !== id);
  if (store.events.length === before) return false;
  saveStore(store);
  return true;
}

export function upsertSession(input: Partial<DCSession> & { title: string }): DCSession {
  const store = ensureStoreFile();
  const idx = input.id ? store.sessions.findIndex((s) => s.id === input.id) : -1;
  if (idx >= 0) {
    const updated: DCSession = { ...store.sessions[idx], ...input };
    store.sessions[idx] = updated;
    saveStore(store);
    return updated;
  }
  const created: DCSession = {
    id: `dc-${Date.now()}`,
    time: input.time || 'Dag 1 · 12:00',
    stage: input.stage || 'Main Stage',
    track: input.track || 'AI & Data',
    title: input.title.trim(),
    speaker: input.speaker || 'Meddelas inom kort',
    status: input.status || 'published',
  };
  store.sessions.push(created);
  saveStore(store);
  return created;
}

export function deleteSession(id: string): boolean {
  const store = ensureStoreFile();
  const before = store.sessions.length;
  store.sessions = store.sessions.filter((s) => s.id !== id);
  if (store.sessions.length === before) return false;
  saveStore(store);
  return true;
}

export function upsertJob(input: Partial<EcommerceJob> & { title: string; company: string }): EcommerceJob {
  if (input.salaryEstimate != null && !validSalaryEstimate(input.salaryEstimate)) {
    throw Object.assign(new Error('Ogiltigt lönespann: ange min/max, yrke, geografiskt underlag, källa, statistikår och metod.'), { status: 400 });
  }
  const store = ensureStoreFile();
  const today = todayIso();
  if (input.summary !== undefined && (typeof input.summary !== 'string' || input.summary.length > 240)) {
    throw Object.assign(new Error('Jobbets ingress får vara högst 240 tecken.'), { status: 400 });
  }
  if (input.desc !== undefined && typeof input.desc !== 'string') {
    throw Object.assign(new Error('Jobbeskrivningen måste vara text.'), { status: 400 });
  }
  const idx = input.id ? store.jobs.findIndex((j) => j.id === input.id) : -1;
  if (idx >= 0) {
    const merged: EcommerceJob = { ...store.jobs[idx], ...input };
    if (input.jobStatus === 'active' && input.status === 'published') {
      merged.validationNote = 'Aktiv annons · verifierad av redaktör';
      merged.verifiedAt = today;
      if (!merged.expiresAt || merged.expiresAt < today) {
        merged.expiresAt = defaultExpiryIso(45);
      }
    }
    merged.summary = jobSummary(merged);
    store.jobs[idx] = merged;
    saveStore(store);
    return merged;
  }
  const expiresAt = input.expiresAt || defaultExpiryIso(45);
  const created: EcommerceJob = {
    id: `j-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    title: input.title.trim(),
    company: input.company.trim(),
    city: input.city || 'Stockholm',
    workModel: input.workModel || 'Hybrid',
    roleCategory: input.roleCategory || 'E-commerce Management',
    seniority: input.seniority || 'Mid / Senior',
    salaryRange: input.salaryRange,
    salaryEstimate: input.salaryEstimate,
    applyUrl: input.applyUrl || 'https://ehandel.se/jobb',
    skills: Array.isArray(input.skills) ? input.skills : [],
    desc: input.desc || '',
    summary: jobSummary({ summary: input.summary, desc: input.desc || '' }),
    postedAt: input.postedAt || 'Just nu',
    expiresAt,
    verifiedAt: today,
    jobStatus: input.jobStatus || (expiresAt < today ? 'expired' : 'active'),
    validationNote:
      input.validationNote ||
      (expiresAt < today ? `Utgången (${expiresAt})` : 'Aktiv annons · verifierad'),
    status: expiresAt < today ? 'draft' : input.status || 'published',
  };
  store.jobs.unshift(created);
  saveStore(store);
  return created;
}

export function batchAddJobs(items: Array<Partial<EcommerceJob> & { title: string; company: string }>): { added: EcommerceJob[]; skipped: string[] } {
  for (const item of items) {
    if (item.salaryEstimate != null && !validSalaryEstimate(item.salaryEstimate)) {
      throw Object.assign(new Error('Ogiltigt källunderlag för lönespann.'), { status: 400 });
    }
    if ((item.summary !== undefined && (typeof item.summary !== 'string' || item.summary.length > 240)) ||
        (item.desc !== undefined && typeof item.desc !== 'string')) {
      throw Object.assign(new Error('Ogiltig jobbtext eller ingress över 240 tecken.'), { status: 400 });
    }
  }
  const store = ensureStoreFile();
  const today = todayIso();
  const added: EcommerceJob[] = [];
  const skipped: string[] = [];

  for (const input of items) {
    const title = input.title?.trim();
    const company = input.company?.trim();
    if (!title || !company) continue;
    const expiresAt = input.expiresAt || defaultExpiryIso(45);
    if (expiresAt < today || !isValidHttpsUrl(input.applyUrl)) {
      skipped.push(`${title} (${company}) – utgången eller ogiltig länk`);
      continue;
    }

    const exists = store.jobs.some(
      (j) =>
        j.title.toLowerCase() === title.toLowerCase() &&
        j.company.toLowerCase() === company.toLowerCase()
    );
    if (exists) {
      skipped.push(`${title} (${company})`);
      continue;
    }
    const created: EcommerceJob = {
      id: `j-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      title,
      company,
      city: input.city || 'Stockholm',
      workModel: input.workModel || 'Hybrid',
      roleCategory: input.roleCategory || 'E-commerce Management',
      seniority: input.seniority || 'Mid / Senior',
      salaryRange: input.salaryRange,
      salaryEstimate: input.salaryEstimate,
      applyUrl: input.applyUrl || 'https://ehandel.se/jobb',
      skills: Array.isArray(input.skills) ? input.skills : [],
      desc: input.desc || `Roll inom svensk e-handel hos ${company}.`,
      summary: jobSummary({ summary: input.summary, desc: input.desc || '' }),
      postedAt: 'Nyupptäckt',
      expiresAt,
      verifiedAt: today,
      jobStatus: 'active',
      validationNote: 'Aktiv annons · verifierad vid import',
      status: input.status || 'published',
    };
    store.jobs.unshift(created);
    added.push(created);
  }
  saveStore(store);
  return { added, skipped };
}

export function validateAndCloseInvalidJobs(): {
  totalChecked: number;
  activeCount: number;
  closedCount: number;
  newlyClosedTitles: string[];
} {
  const store = ensureStoreFile();
  const today = todayIso();
  const newlyClosedTitles: string[] = [];

  store.jobs = store.jobs.map((job) => {
    const check = evaluateJobValidity(job, today);
    const wasActive = job.status === 'published' && job.jobStatus !== 'expired' && job.jobStatus !== 'closed';
    if (wasActive && check.jobStatus !== 'active') {
      newlyClosedTitles.push(`${job.title} (${job.company})`);
    }
    return {
      ...job,
      verifiedAt: today,
      jobStatus: check.jobStatus,
      status: check.status,
      validationNote: check.validationNote,
    };
  });

  saveStore(store);
  const activeCount = store.jobs.filter((j) => j.status === 'published' && j.jobStatus === 'active').length;
  const closedCount = store.jobs.length - activeCount;

  return {
    totalChecked: store.jobs.length,
    activeCount,
    closedCount,
    newlyClosedTitles,
  };
}

export function deleteJob(id: string): boolean {
  const store = ensureStoreFile();
  const before = store.jobs.length;
  store.jobs = store.jobs.filter((j) => j.id !== id);
  if (store.jobs.length === before) return false;
  saveStore(store);
  return true;
}

export function upsertRecruiter(input: Partial<RecruitmentSite> & { name: string }): RecruitmentSite {
  const store = ensureStoreFile();
  const idx = input.id ? store.recruitmentSites.findIndex((r) => r.id === input.id) : -1;
  if (idx >= 0) {
    const updated: RecruitmentSite = { ...store.recruitmentSites[idx], ...input };
    store.recruitmentSites[idx] = updated;
    saveStore(store);
    return updated;
  }
  const created: RecruitmentSite = {
    id: `rec-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name: input.name.trim(),
    domain: (input.domain || '').replace(/^https?:\/\//, '') || 'ehandel.se/jobb',
    type: input.type || 'Rekryteringsbyrå',
    rolesCovered: Array.isArray(input.rolesCovered) && input.rolesCovered.length > 0
      ? input.rolesCovered
      : ['E-commerce Management'],
    coverage: input.coverage || 'Hela Sverige',
    desc: input.desc || 'Rekryteringsaktör inom svensk e-handel.',
    status: input.status || 'published',
  };
  store.recruitmentSites.unshift(created);
  saveStore(store);
  return created;
}

export function batchAddRecruiters(items: Array<Partial<RecruitmentSite> & { name: string }>): { added: RecruitmentSite[]; skipped: string[] } {
  const store = ensureStoreFile();
  const added: RecruitmentSite[] = [];
  const skipped: string[] = [];

  for (const input of items) {
    const cleanName = input.name?.trim();
    if (!cleanName) continue;
    const exists = store.recruitmentSites.some(
      (r) => r.name.toLowerCase() === cleanName.toLowerCase()
    );
    if (exists) {
      skipped.push(cleanName);
      continue;
    }
    const created: RecruitmentSite = {
      id: `rec-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: cleanName,
      domain: (input.domain || '').replace(/^https?:\/\//, '') || `${cleanName.toLowerCase().replace(/[^a-z0-9]/g, '')}.se`,
      type: input.type || 'Rekryteringsbyrå',
      rolesCovered: Array.isArray(input.rolesCovered) && input.rolesCovered.length > 0
        ? input.rolesCovered
        : ['E-commerce Management'],
      coverage: input.coverage || 'Hela Sverige',
      desc: input.desc || 'Specialiserad rekryteringspartner för svenska e-handelsroller.',
      status: input.status || 'published',
    };
    store.recruitmentSites.unshift(created);
    added.push(created);
  }
  saveStore(store);
  return { added, skipped };
}

export function deleteRecruiter(id: string): boolean {
  const store = ensureStoreFile();
  const before = store.recruitmentSites.length;
  store.recruitmentSites = store.recruitmentSites.filter((r) => r.id !== id);
  if (store.recruitmentSites.length === before) return false;
  saveStore(store);
  return true;
}

export function upsertMapPoint(input: MapPoint): MapPoint {
  if (!validMapPoint(input)) {
    throw Object.assign(new Error('Ange namn, region, status och giltiga koordinater inom kartans område (latitud 55–69,5; longitud 10–25).'), { status: 400 });
  }
  const store = ensureStoreFile();
  const point: MapPoint = { id: input.id, label: input.label.trim(), description: input.description.trim(),
    regionKey: input.regionKey, longitude: input.longitude, latitude: input.latitude, status: input.status };
  const points = store.mapPoints || [];
  const index = points.findIndex((existing) => existing.id === point.id);
  if (index < 0) points.push(point);
  else points[index] = point;
  store.mapPoints = points;
  saveStore(store);
  return point;
}

export function deleteMapPoint(id: string): boolean {
  const store = ensureStoreFile();
  const points = store.mapPoints || [];
  if (!points.some((point) => point.id === id)) return false;
  store.mapPoints = points.filter((point) => point.id !== id);
  saveStore(store);
  return true;
}

export function updateRegion(key: string, patch: Partial<RegionMetric>): RegionMetric | null {
  const store = ensureStoreFile();
  if (!store.regions[key]) return null;
  store.regions[key] = { ...store.regions[key], ...patch };
  saveStore(store);
  return store.regions[key];
}

export function updateOrderBenchmark(
  id: string,
  patch: Partial<CategoryOrderBenchmark>
): CategoryOrderBenchmark | null {
  const store = ensureStoreFile();
  const idx = store.orderBenchmarks.findIndex((b) => b.id === id);
  if (idx < 0) return null;
  store.orderBenchmarks[idx] = { ...store.orderBenchmarks[idx], ...patch, id };
  saveStore(store);
  return store.orderBenchmarks[idx];
}

export function updateShippingTier(
  id: string,
  patch: Partial<ShippingCostTier>
): ShippingCostTier | null {
  const store = ensureStoreFile();
  const idx = store.shippingTiers.findIndex((t) => t.id === id);
  if (idx < 0) return null;
  store.shippingTiers[idx] = { ...store.shippingTiers[idx], ...patch, id };
  saveStore(store);
  return store.shippingTiers[idx];
}

export function updateDeliveryStats(patch: Partial<DeliveryStatsData>): DeliveryStatsData {
  const store = ensureStoreFile();
  store.deliveryStats = { ...store.deliveryStats, ...patch };
  saveStore(store);
  return store.deliveryStats;
}

export function upsertLaw(input: Partial<EcommerceLaw> & { title: string }): EcommerceLaw {
  const store = ensureStoreFile();
  const idx = input.id ? store.laws.findIndex((l) => l.id === input.id) : -1;
  if (idx >= 0) {
    const updated: EcommerceLaw = { ...store.laws[idx], ...input };
    store.laws[idx] = updated;
    saveStore(store);
    return updated;
  }
  const created: EcommerceLaw = {
    id: `law-${Date.now()}`,
    title: input.title.trim(),
    category: input.category || 'Konsumenträtt',
    authority: input.authority || 'Konsumentverket',
    effectiveDate: input.effectiveDate || 'Gällande',
    summary: input.summary || '',
    requirements: Array.isArray(input.requirements) ? input.requirements : [],
    penaltyInfo: input.penaltyInfo || 'Föreläggande eller marknadsstörningsavgift.',
  };
  store.laws.unshift(created);
  saveStore(store);
  return created;
}

export function deleteLaw(id: string): boolean {
  const store = ensureStoreFile();
  const before = store.laws.length;
  store.laws = store.laws.filter((l) => l.id !== id);
  if (store.laws.length === before) return false;
  saveStore(store);
  return true;
}

function resolveMemberByIdentity(
  members: CommunityMember[],
  uid?: string,
  email?: string
): CommunityMember | undefined {
  const cleanEmail = email?.trim().toLowerCase();
  return members.find(
    (m) =>
      (uid && m.authorUid === uid) ||
      (!m.authorUid && cleanEmail && m.email.trim().toLowerCase() === cleanEmail)
  );
}

const VALID_MEMBER_TYPES: CommunityMemberType[] = [
  'E-handlare / Butik',
  'Tjänsteleverantör / Byrå',
  'Transportör / Logistik / 3PL',
  'Plattform / PSP / SaaS',
];

function normalizeMemberType(value?: string): CommunityMemberType {
  if (value && VALID_MEMBER_TYPES.includes(value as CommunityMemberType)) {
    return value as CommunityMemberType;
  }
  return 'E-handlare / Butik';
}

export function addCommunityThread(input: {
  channel: string;
  author: string;
  title: string;
  body?: string;
  authorUid?: string;
  authorEmail?: string;
}): CommunityThread {
  const store = ensureStoreFile();
  assertCommunityAction(store, input.authorUid, 'postingEnabled');
  const profile = resolveMemberByIdentity(store.communityMembers, input.authorUid, input.authorEmail);
  const cleanBody = input.body?.trim();
  const thread: CommunityThread = {
    ...(input.authorUid ? { authorUid: input.authorUid } : {}),
    ...(profile?.role ? { authorRole: profile.role } : {}),
    ...(profile?.company ? { authorCompany: profile.company } : {}),
    ...(profile?.memberType ? { authorMemberType: normalizeMemberType(profile.memberType) } : {}),
    id: `c-${Date.now()}`,
    channel: input.channel || '#ai-och-data',
    author: input.author.trim() || profile?.name || 'Verifierad Medlem',
    title: input.title.trim(),
    ...(cleanBody ? { body: cleanBody } : {}),
    votes: 1,
    replies: 0,
    comments: [],
    time: 'Just nu',
  };
  store.communityThreads.unshift(thread);
  saveStore(store);
  return thread;
}

export function addCommunityComment(
  threadId: string,
  input: {
    author: string;
    body: string;
    authorUid?: string;
    authorEmail?: string;
  }
): CommunityThread | null {
  const store = ensureStoreFile();
  assertCommunityAction(store, input.authorUid, 'commentsEnabled');
  if (store.memberGovernance?.hidden.some((h) => h.threadId === threadId && !h.commentId)) throw Object.assign(new Error('Innehållet är dolt.'), { status: 403 });
  const thread = store.communityThreads.find((t) => t.id === threadId);
  if (!thread) return null;

  const profile = resolveMemberByIdentity(store.communityMembers, input.authorUid, input.authorEmail);
  const comment: CommunityComment = {
    id: `cm-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    author: input.author.trim() || profile?.name || 'Verifierad Medlem',
    ...(profile?.role ? { authorRole: profile.role } : {}),
    ...(profile?.company ? { authorCompany: profile.company } : {}),
    ...(profile?.memberType ? { authorMemberType: normalizeMemberType(profile.memberType) } : {}),
    ...(input.authorUid ? { authorUid: input.authorUid } : {}),
    body: input.body.trim(),
    createdAt: new Date().toISOString(),
  };
  const existingComments = Array.isArray(thread.comments) ? thread.comments : [];
  thread.comments = [...existingComments, comment].slice(-50);
  thread.replies = Math.max(thread.replies || 0, 0) === existingComments.length
    ? thread.comments.length
    : (thread.replies || 0) + 1;
  saveStore(store);
  return thread;
}

export function upvoteCommunityThread(id: string, uid?: string): CommunityThread | null {
  const store = ensureStoreFile();
  assertCommunityAction(store, uid, 'postingEnabled');
  if (store.memberGovernance?.hidden.some((h) => h.threadId === id && !h.commentId)) throw Object.assign(new Error('Innehållet är dolt.'), { status: 403 });
  const thread = store.communityThreads.find((t) => t.id === id);
  if (!thread) return null;
  thread.votes += 1;
  saveStore(store);
  return thread;
}

export function deleteCommunityThread(id: string): boolean {
  const store = ensureStoreFile();
  const before = store.communityThreads.length;
  store.communityThreads = store.communityThreads.filter((t) => t.id !== id);
  if (store.communityThreads.length === before) return false;
  saveStore(store);
  return true;
}

export function addCommunityMember(input: {
  name: string;
  email: string;
  memberType?: CommunityMemberType | string;
  role: string;
  city: string;
  company?: string;
  website?: string;
  linkedinUrl?: string;
  annualOrders?: string;
  platform?: string;
  serviceFocus?: string;
  interests?: string[];
  motivation?: string;
  authorUid?: string;
}): CommunityMember {
  const store = ensureStoreFile();
  assertCommunityAction(store, input.authorUid, 'registrationEnabled');
  const normalizedEmail = input.email.trim().toLowerCase();
  const cleanWebsite = input.website?.trim();
  const resolvedType = normalizeMemberType(input.memberType);
  const cleanInterests = Array.isArray(input.interests)
    ? input.interests.map((item) => String(item).trim()).filter(Boolean).slice(0, 10)
    : undefined;

  const existingIdx = store.communityMembers.findIndex(
    (m) => m.email.trim().toLowerCase() === normalizedEmail
  );

  if (existingIdx >= 0) {
    const existing = store.communityMembers[existingIdx];
    if (existing.authorUid && existing.authorUid !== input.authorUid) throw Object.assign(new Error('Medlemsprofilen tillhör ett annat konto.'), { status: 403 });
    const updated: CommunityMember = {
      ...existing,
      name: input.name.trim(),
      email: input.email.trim(),
      memberType: input.memberType ? resolvedType : existing.memberType || 'E-handlare / Butik',
      role: input.role.trim(),
      city: input.city.trim(),
      company: input.company?.trim() || existing.company,
      website: cleanWebsite || existing.website,
      linkedinUrl: input.linkedinUrl?.trim() || existing.linkedinUrl,
      annualOrders: input.annualOrders?.trim() || existing.annualOrders,
      platform: input.platform?.trim() || existing.platform,
      serviceFocus: input.serviceFocus?.trim() || existing.serviceFocus,
      interests: cleanInterests && cleanInterests.length > 0 ? cleanInterests : existing.interests,
      motivation: input.motivation?.trim() || existing.motivation,
      authorUid: input.authorUid || existing.authorUid,
    };
    store.communityMembers[existingIdx] = updated;
    saveStore(store);
    return updated;
  }

  const member: CommunityMember = {
    id: `mem-${Date.now()}`,
    name: input.name.trim(),
    email: input.email.trim(),
    memberType: resolvedType,
    role: input.role.trim(),
    city: input.city.trim(),
    ...(input.company?.trim() ? { company: input.company.trim() } : {}),
    ...(cleanWebsite ? { website: cleanWebsite } : {}),
    ...(input.linkedinUrl?.trim() ? { linkedinUrl: input.linkedinUrl.trim() } : {}),
    ...(input.annualOrders?.trim() ? { annualOrders: input.annualOrders.trim() } : {}),
    ...(input.platform?.trim() ? { platform: input.platform.trim() } : {}),
    ...(input.serviceFocus?.trim() ? { serviceFocus: input.serviceFocus.trim() } : {}),
    ...(cleanInterests && cleanInterests.length > 0 ? { interests: cleanInterests } : {}),
    ...(input.motivation?.trim() ? { motivation: input.motivation.trim() } : {}),
    verificationStatus: 'pending',
    ...(input.authorUid ? { authorUid: input.authorUid } : {}),
    createdAt: new Date().toISOString(),
  };
  store.communityMembers.unshift(member);
  if (store.communityMembers.length > 500) {
    store.communityMembers = store.communityMembers.slice(0, 500);
  }
  saveStore(store);
  return member;
}

export function updateCommunityMemberStatus(
  id: string,
  verificationStatus: 'pending' | 'verified' | 'rejected',
  actor?: CmsIdentity
): CommunityMember | null {
  const store = ensureStoreFile();
  if (actor && !store.communityMembers.some((m)=>m.id===id)) return null;
  if (actor) { runGovernance(store,actor,'member-status',{id,status:verificationStatus}); saveStore(store); return store.communityMembers.find((m)=>m.id===id) || null; }
  const idx = store.communityMembers.findIndex((m) => m.id === id);
  if (idx < 0) return null;
  const updated: CommunityMember = {
    ...store.communityMembers[idx],
    verificationStatus,
    verifiedAt: verificationStatus === 'verified' ? new Date().toISOString() : undefined,
  };
  store.communityMembers[idx] = updated;
  saveStore(store);
  return updated;
}

export function deleteCommunityMember(id: string, actor?: CmsIdentity): boolean {
  const store = ensureStoreFile();
  if (actor && !store.communityMembers.some((m)=>m.id===id)) return false;
  if (actor) { runGovernance(store,actor,'member-delete',{id}); saveStore(store); return true; }
  const before = store.communityMembers.length;
  store.communityMembers = store.communityMembers.filter((m) => m.id !== id);
  if (store.communityMembers.length === before) return false;
  saveStore(store);
  return true;
}

export function getMemberDirectory(requesterUid?: string, requesterEmail?: string): PublicMemberProfile[] {
  const store = ensureStoreFile();
  assertCommunityAction(store, requesterUid, 'directoryEnabled');
  const cleanEmail = requesterEmail?.trim().toLowerCase();
  const rank = (status?: string) => (status === 'verified' ? 0 : 1);

  return (store.communityMembers || [])
    .filter((m) => !m.directoryHidden && m.verificationStatus !== 'rejected' && !store.memberGovernance?.blocks.some((b) => b.uid === m.authorUid))
    .slice()
    .sort((a, b) => rank(a.verificationStatus) - rank(b.verificationStatus))
    .map((m): PublicMemberProfile => ({
      id: m.id,
      name: m.name,
      memberType: normalizeMemberType(m.memberType),
      role: m.role,
      city: m.city,
      ...(m.company ? { company: m.company } : {}),
      ...(m.website ? { website: m.website } : {}),
      ...(m.platform ? { platform: m.platform } : {}),
      ...(m.serviceFocus ? { serviceFocus: m.serviceFocus } : {}),
      ...(m.interests && m.interests.length > 0 ? { interests: m.interests } : {}),
      verificationStatus: m.verificationStatus || 'pending',
      isSelf: Boolean(
        (requesterUid && m.authorUid === requesterUid) ||
        (!m.authorUid && cleanEmail && m.email.trim().toLowerCase() === cleanEmail)
      ),
    }));
}

function getUserMemberIds(members: CommunityMember[], uid: string, email?: string): Set<string> {
  const cleanEmail = email?.trim().toLowerCase();
  const ids = new Set<string>();
  for (const m of members) {
    if ((uid && m.authorUid === uid) || (!m.authorUid && cleanEmail && m.email.trim().toLowerCase() === cleanEmail)) {
      ids.add(m.id);
    }
  }
  return ids;
}

export function getDirectMessagesForUser(uid: string, email?: string): {
  messages: CommunityDirectMessage[];
  myMemberIds: string[];
} {
  const store = ensureStoreFile();
  assertCommunityAction(store, uid, 'messagesEnabled');
  const myMemberIds = getUserMemberIds(store.communityMembers || [], uid, email);
  const all = Array.isArray(store.directMessages) ? store.directMessages : [];
  const filtered = all.filter(
    (msg) =>
      msg.senderUid === uid ||
      (msg.recipientUid && msg.recipientUid === uid) ||
      (msg.senderMemberId && myMemberIds.has(msg.senderMemberId)) ||
      myMemberIds.has(msg.recipientMemberId)
  );
  return {
    messages: filtered,
    myMemberIds: Array.from(myMemberIds),
  };
}

export function sendDirectMessage(input: {
  senderUid: string;
  senderName: string;
  senderEmail?: string;
  recipientMemberId: string;
  subject: string;
  body: string;
}): CommunityDirectMessage | null {
  const store = ensureStoreFile();
  assertCommunityAction(store, input.senderUid, 'messagesEnabled');
  const recipient = (store.communityMembers || []).find(
    (m) => m.id === input.recipientMemberId && m.verificationStatus !== 'rejected'
  );
  if (!recipient || (recipient.authorUid && store.memberGovernance?.blocks.some((b) => b.uid === recipient.authorUid))) return null;

  const senderProfile = resolveMemberByIdentity(
    store.communityMembers || [],
    input.senderUid,
    input.senderEmail
  );

  const dm: CommunityDirectMessage = {
    id: `dm-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    ...(senderProfile ? { senderMemberId: senderProfile.id } : {}),
    senderUid: input.senderUid,
    senderName: senderProfile?.name || input.senderName.trim() || 'Verifierad medlem',
    ...(senderProfile?.company ? { senderCompany: senderProfile.company } : {}),
    ...(senderProfile?.memberType
      ? { senderMemberType: normalizeMemberType(senderProfile.memberType) }
      : {}),
    recipientMemberId: recipient.id,
    ...(recipient.authorUid ? { recipientUid: recipient.authorUid } : {}),
    recipientName: recipient.name,
    ...(recipient.company ? { recipientCompany: recipient.company } : {}),
    subject: input.subject.trim(),
    body: input.body.trim(),
    read: false,
    createdAt: new Date().toISOString(),
  };

  if (!Array.isArray(store.directMessages)) {
    store.directMessages = [];
  }
  store.directMessages.unshift(dm);
  if (store.directMessages.length > 400) {
    store.directMessages = store.directMessages.slice(0, 400);
  }
  saveStore(store);
  return dm;
}

export function markDirectMessageRead(
  id: string,
  uid: string,
  email?: string
): { status: 'ok'; message: CommunityDirectMessage } | { status: 'not_found' } | { status: 'forbidden' } {
  const store = ensureStoreFile();
  assertCommunityAction(store, uid, 'messagesEnabled');
  const all = Array.isArray(store.directMessages) ? store.directMessages : [];
  const msg = all.find((m) => m.id === id);
  if (!msg) return { status: 'not_found' };

  const myMemberIds = getUserMemberIds(store.communityMembers || [], uid, email);
  const isRecipient =
    (msg.recipientUid && msg.recipientUid === uid) || myMemberIds.has(msg.recipientMemberId);
  if (!isRecipient) return { status: 'forbidden' };

  if (!msg.read) {
    msg.read = true;
    saveStore(store);
  }
  return { status: 'ok', message: msg };
}

export function upsertAdBanner(input: Partial<AdBanner> & { headline: string }): AdBanner {
  const store = ensureStoreFile();
  const idx = input.id ? store.adBanners.findIndex((b) => b.id === input.id) : -1;
  if (idx >= 0) {
    const updated: AdBanner = { ...store.adBanners[idx], ...input };
    store.adBanners[idx] = updated;
    saveStore(store);
    return updated;
  }
  const created: AdBanner = {
    id: `ad-${Date.now()}`,
    placement: input.placement || 'marknad-mid',
    placementLabel: input.placementLabel || 'Anpassad annonsplats',
    dimensions: input.dimensions || '980 × 120 px',
    mode: input.mode || 'active',
    sponsorName: input.sponsorName?.trim() || 'Sponsor',
    kicker: input.kicker?.trim() || 'Annons',
    headline: input.headline.trim(),
    body: input.body?.trim() || '',
    ctaLabel: input.ctaLabel?.trim() || 'Läs mer',
    targetUrl: input.targetUrl?.trim() || 'https://sverigesehandel.se',
    internalTab: input.internalTab,
    theme: input.theme || 'navy',
    active: input.active ?? true,
  };
  store.adBanners.unshift(created);
  saveStore(store);
  return created;
}

export function deleteAdBanner(id: string): boolean {
  const store = ensureStoreFile();
  const before = store.adBanners.length;
  store.adBanners = store.adBanners.filter((b) => b.id !== id);
  if (store.adBanners.length === before) return false;
  saveStore(store);
  return true;
}

export function upsertContactForm(
  input: Partial<ContactFormConfig> & { name: string }
): ContactFormConfig {
  const store = ensureStoreFile();
  const list = Array.isArray(store.contactForms) ? [...store.contactForms] : [];
  const now = new Date().toISOString();
  const idx = input.id ? list.findIndex((f) => f.id === input.id) : -1;

  if (idx >= 0) {
    const existing = list[idx];
    const updated: ContactFormConfig = {
      ...existing,
      ...input,
      id: existing.id,
      name: input.name.trim() || existing.name,
      recipientEmail: (input.recipientEmail ?? existing.recipientEmail ?? 'hej@sverigesehandel.se').trim(),
      fields: Array.isArray(input.fields) && input.fields.length > 0 ? input.fields : existing.fields,
      updatedAt: now,
    };
    list[idx] = updated;
    store.contactForms = list;
    saveStore(store);
    return updated;
  }

  const created: ContactFormConfig = {
    id: input.id || `form-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name: input.name.trim(),
    purpose: input.purpose || 'contact',
    page: input.page || 'kontakt',
    position: input.position || 'bottom',
    active: input.active ?? true,
    theme: input.theme || 'light',
    kicker: input.kicker?.trim() || 'Kontakt & Rådgivning',
    title: input.title?.trim() || input.name.trim(),
    subtitle: input.subtitle?.trim() || 'Fyll i uppgifterna nedan så återkommer vi snabbt.',
    submitLabel: input.submitLabel?.trim() || 'Skicka förfrågan',
    successMessage: input.successMessage?.trim() || 'Tack! Din förfrågan har mottagits.',
    routingMode: input.routingMode || 'self',
    recipientEmail: input.recipientEmail?.trim() || store.pageContent?.kontakt?.contactEmail?.trim() || 'hej@sverigesehandel.se',
    allowRequesterChoice: Boolean(input.allowRequesterChoice),
    fields:
      Array.isArray(input.fields) && input.fields.length > 0
        ? input.fields
        : structuredClone(INITIAL_CMS_DATA.contactForms[0].fields),
    updatedAt: now,
  };
  list.push(created);
  store.contactForms = list;
  saveStore(store);
  return created;
}

export function deleteContactForm(id: string): boolean {
  const store = ensureStoreFile();
  const list = Array.isArray(store.contactForms) ? store.contactForms : [];
  const before = list.length;
  store.contactForms = list.filter((f) => f.id !== id);
  if (store.contactForms.length === before) return false;
  saveStore(store);
  return true;
}

export function addContactMessage(input: {
  authorUid?: string;
  name: string;
  email: string;
  company?: string;
  phone?: string;
  topic: string;
  adSlot?: string;
  message: string;
  formId?: string;
  submissionType?: 'contact' | 'intro' | 'ad-booking' | 'job-apply' | 'other';
  targetEntityType?: 'partner' | 'logistics' | 'job' | 'event';
  targetEntityId?: string;
  targetEntityName?: string;
  preferredRouting?: FormRoutingMode;
  needSummary?: string;
  monthlyVolume?: string;
  currentPlatform?: string;
  timeline?: string;
  customAnswers?: Record<string, string>;
}): ContactMessage {
  const store = ensureStoreFile();
  const form = input.formId
    ? (store.contactForms || []).find((f) => f.id === input.formId)
    : undefined;
  if (isBlocked(store.memberGovernance, input.authorUid)) throw Object.assign(new Error('Kontot är blockerat.'), { status: 403 });
  const editorialDefault =
    store.pageContent?.kontakt?.contactEmail?.trim() || 'hej@sverigesehandel.se';

  const targetPartner =
    input.targetEntityType === 'partner'
      ? store.partners.find(
          (p) =>
            (input.targetEntityId && p.id === input.targetEntityId) ||
            (input.targetEntityName &&
              p.name.toLowerCase() === input.targetEntityName.trim().toLowerCase())
        )
      : undefined;
  const targetLogistics =
    input.targetEntityType === 'logistics'
      ? (store.logisticsProviders || []).find(
          (l) =>
            (input.targetEntityId && l.id === input.targetEntityId) ||
            (input.targetEntityName &&
              l.name.toLowerCase() === input.targetEntityName.trim().toLowerCase())
        )
      : undefined;

  const entity = targetPartner || targetLogistics;
  const entityRouting = entity?.introRoutingMode;
  const entityEmail = entity?.introEmail?.trim() || '';
  const isIntro = input.submissionType === 'intro' || (!input.submissionType && form?.purpose === 'intro');
  const hasCompanyInbox = Boolean(entity && companyInboxAvailable(store,input.targetEntityType,entity.id,isIntro));

  let routingMode: FormRoutingMode = form?.routingMode || 'self';
  if (entityRouting === 'self') {
    routingMode = 'self';
  } else if (entityRouting === 'direct') {
    routingMode = 'direct-partner';
  } else if (
    form?.allowRequesterChoice &&
    (input.preferredRouting === 'self' || input.preferredRouting === 'direct-partner')
  ) {
    routingMode = input.preferredRouting;
  }

  let routedToEmail = form?.recipientEmail?.trim() || editorialDefault;
  if (routingMode === 'direct-partner') {
    if (entityEmail) {
      routedToEmail = entityEmail;
    } else if (hasCompanyInbox) {
      // Direct delivery occurs in the scoped company inbox. Existing editorial email
      // remains the fallback notification destination; no user email is guessed.
      routedToEmail = editorialDefault;
    } else {
      routingMode = 'self';
      routedToEmail = form?.recipientEmail?.trim() || editorialDefault;
    }
  } else if (routingMode === 'custom-email') {
    routedToEmail = form?.recipientEmail?.trim() || editorialDefault;
  } else {
    routedToEmail =
      (form?.routingMode === 'self' && form?.recipientEmail?.trim()) || editorialDefault;
  }

  const item: ContactMessage = {
    ...(input.authorUid ? { authorUid: input.authorUid } : {}),
    id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name: input.name.trim(),
    email: input.email.trim(),
    company: input.company?.trim() || undefined,
    phone: input.phone?.trim() || undefined,
    topic: input.topic.trim() || 'Allmän fråga',
    adSlot: input.adSlot?.trim() || undefined,
    message: input.message.trim(),
    formId: form?.id || input.formId?.trim() || undefined,
    formName: form?.name || undefined,
    submissionType:
      input.submissionType ||
      (form?.purpose === 'intro' ? 'intro' : input.adSlot ? 'ad-booking' : 'contact'),
    targetEntityType: input.targetEntityType,
    targetEntityId: entity?.id || input.targetEntityId?.trim() || undefined,
    targetEntityName: entity?.name || input.targetEntityName?.trim() || undefined,
    routingMode,
    routedToEmail,
    needSummary: input.needSummary?.trim() || undefined,
    monthlyVolume: input.monthlyVolume?.trim() || undefined,
    currentPlatform: input.currentPlatform?.trim() || undefined,
    timeline: input.timeline?.trim() || undefined,
    customAnswers:
      input.customAnswers && Object.keys(input.customAnswers).length > 0
        ? input.customAnswers
        : undefined,
    status: routingMode === 'self' ? 'handled-self' : 'new',
    createdAt: new Date().toISOString(),
  };

  store.contactMessages.unshift(item);
  if (store.contactMessages.length > 300) {
    store.contactMessages = store.contactMessages.slice(0, 300);
  }
  saveStore(store);
  return item;
}

export function updateContactMessageStatus(
  id: string,
  status: ContactMessageStatus,
  emailDispatched?: boolean
): ContactMessage | null {
  const store = ensureStoreFile();
  const idx = store.contactMessages.findIndex((m) => m.id === id);
  if (idx < 0) return null;
  const updated: ContactMessage = {
    ...store.contactMessages[idx],
    status,
    ...(typeof emailDispatched === 'boolean' ? { emailDispatched } : {}),
  };
  store.contactMessages[idx] = updated;
  saveStore(store);
  return updated;
}

export function deleteContactMessage(id: string): boolean {
  const store = ensureStoreFile();
  const before = store.contactMessages.length;
  store.contactMessages = store.contactMessages.filter((m) => m.id !== id);
  if (store.contactMessages.length === before) return false;
  saveStore(store);
  return true;
}

export function upsertLogisticsProvider(
  input: Partial<LogisticsProvider> & { name: string }
): { provider: LogisticsProvider; created: boolean } {
  const store = ensureStoreFile();
  const now = new Date().toISOString();
  const cleanName = input.name.trim();
  const existingIdx = store.logisticsProviders.findIndex(
    (l) => (input.id && l.id === input.id) || l.name.toLowerCase() === cleanName.toLowerCase()
  );

  if (existingIdx >= 0) {
    const existing = store.logisticsProviders[existingIdx];
    const updated: LogisticsProvider = {
      ...existing,
      ...input,
      id: existing.id,
      name: cleanName || existing.name,
      introEmail:
        'introEmail' in input
          ? input.introEmail?.trim() || undefined
          : existing.introEmail,
      introRoutingMode: input.introRoutingMode ?? existing.introRoutingMode,
      updatedAt: now,
    };
    delete updated.hasDirectIntroEmail;
    store.logisticsProviders[existingIdx] = updated;
    saveStore(store);
    return { provider: updated, created: false };
  }

  const created: LogisticsProvider = {
    id: input.id || `lp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name: cleanName,
    domain: (input.domain || `${cleanName.toLowerCase().replace(/[^a-z0-9]/g, '')}.se`).replace(
      /^https?:\/\//,
      ''
    ),
    logisticsType: input.logisticsType || '3PL',
    hqCity: input.hqCity?.trim() || 'Stockholm',
    warehouseCities:
      Array.isArray(input.warehouseCities) && input.warehouseCities.length > 0
        ? input.warehouseCities
        : [input.hqCity?.trim() || 'Stockholm'],
    region: input.region || 'svealand',
    warehouseSqm: input.warehouseSqm?.trim() || '25 000 m²',
    automation: input.automation?.trim() || 'WMS-styrd plock & pack',
    wmsPlatform: input.wmsPlatform?.trim() || 'Ongoing WMS',
    minOrderVolume: input.minOrderVolume?.trim() || 'Från 300 ordrar/mån',
    cutoffTime: input.cutoffTime?.trim() || '17:00 samma dag',
    integrations: Array.isArray(input.integrations) ? input.integrations : ['Shopify Plus', 'Centra', 'nShift'],
    specialties: Array.isArray(input.specialties) ? input.specialties : ['E-handelsfulfilment'],
    notableClients: Array.isArray(input.notableClients) ? input.notableClients : [],
    pricingModel: input.pricingModel?.trim() || 'Rörligt pris per order + pallplats',
    desc: input.desc?.trim() || `Svensk logistikpartner (${input.logisticsType || '3PL'}) för e-handel.`,
    ...(input.introEmail?.trim() ? { introEmail: input.introEmail.trim() } : {}),
    ...(input.introRoutingMode ? { introRoutingMode: input.introRoutingMode } : {}),
    status: input.status || 'published',
    updatedAt: now,
  };

  store.logisticsProviders.unshift(created);
  saveStore(store);
  return { provider: created, created: true };
}

export function deleteLogisticsProvider(id: string): boolean {
  const store = ensureStoreFile();
  const before = store.logisticsProviders.length;
  store.logisticsProviders = store.logisticsProviders.filter((l) => l.id !== id);
  if (store.logisticsProviders.length === before) return false;
  saveStore(store);
  return true;
}

// All publication paths share this policy. No network request is performed here.
// Confirmation is an explicit editorial attestation, not automated fact checking.
function prepareNews(input: Partial<EcommerceNewsItem> & { confirmArticleLink?: boolean }, previous?: EcommerceNewsItem): EcommerceNewsItem {
  for (const key of ['title', 'summary', 'sourceName', 'sourceUrl', 'publishedDate'] as const) {
    if (input[key] !== undefined && typeof input[key] !== 'string') {
      throw Object.assign(new Error('Nyhetens textfält måste vara text.'), { status: 400 });
    }
  }
  const item = {
    ...previous,
    id: previous?.id || input.id || `news-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title: input.title?.trim() || previous?.title || '',
    summary: input.summary?.trim() ?? previous?.summary ?? '',
    category: input.category || previous?.category || 'SaaS & System',
    region: input.region || previous?.region || 'Sverige',
    sourceName: input.sourceName?.trim() ?? previous?.sourceName ?? '',
    sourceUrl: input.sourceUrl?.trim() ?? previous?.sourceUrl ?? '',
    publishedDate: input.publishedDate || previous?.publishedDate || todayIso(),
    impactNote: input.impactNote ?? previous?.impactNote,
    tags: input.tags ?? previous?.tags ?? [],
    fetchedByAI: input.fetchedByAI ?? previous?.fetchedByAI,
    status: input.status || previous?.status || 'draft',
    linkReviewedAt: previous?.linkReviewedAt,
  } as EcommerceNewsItem;
  const url = articleUrl(item.sourceUrl);
  if (url) item.sourceUrl = url;
  const changed = !previous || ['title', 'summary', 'sourceUrl', 'sourceName', 'publishedDate'].some(
    (key) => item[key as keyof EcommerceNewsItem] !== previous[key as keyof EcommerceNewsItem]);
  if (changed) item.linkReviewedAt = undefined;
  if (input.confirmArticleLink === true) {
    if (!url || !item.title || !item.summary || !item.sourceName) {
      throw Object.assign(new Error('Ange rubrik, sammanfattning, källa och direktlänk till artikeln före godkännande.'), { status: 400 });
    }
    item.linkReviewedAt = new Date().toISOString();
  }
  if (item.status === 'published' && (!url || !item.linkReviewedAt)) {
    throw Object.assign(new Error('Öppna och granska rätt originalartikel före publicering. Spara annars som utkast.'), { status: 400 });
  }
  return item;
}

export function upsertNews(
  input: Partial<EcommerceNewsItem> & { title: string; confirmArticleLink?: boolean }
): { item: EcommerceNewsItem; created: boolean } {
  const store = ensureStoreFile();
  const list = Array.isArray(store.news) ? store.news : [];
  const idx = input.id ? list.findIndex((n) => n.id === input.id) : -1;
  const item = prepareNews(input, idx >= 0 ? list[idx] : undefined);
  if (idx >= 0) list[idx] = item;
  else list.unshift(item);
  store.news = list;
  saveStore(store);
  return { item, created: idx < 0 };
}

export function batchAddNews(
  items: Array<Partial<EcommerceNewsItem> & { title: string }>
): { added: EcommerceNewsItem[]; skipped: string[] } {
  const store = ensureStoreFile();
  const list = Array.isArray(store.news) ? store.news : [];
  const titles = new Set(list.map((n) => n.title.toLowerCase().trim()));
  const added: EcommerceNewsItem[] = [];
  const skipped: string[] = [];
  for (const input of items) {
    const title = input.title?.trim();
    if (!title) continue;
    if (titles.has(title.toLowerCase())) { skipped.push(title); continue; }
    // Batch/AI import is never an editorial attestation, even if supplied in JSON.
    const item = prepareNews({ ...input, status: 'draft', confirmArticleLink: false });
    list.unshift(item);
    titles.add(title.toLowerCase());
    added.push(item);
  }
  store.news = list;
  saveStore(store);
  return { added, skipped };
}

export function deleteNews(id: string): boolean {
  const store = ensureStoreFile();
  const list = Array.isArray(store.news) ? store.news : [];
  const before = list.length;
  store.news = list.filter((n) => n.id !== id);
  if (store.news.length === before) return false;
  saveStore(store);
  return true;
}

export function updatePaketindex(patch: Partial<PaketindexData>): PaketindexData {
  const store = ensureStoreFile();
  const base = store.paketindex || INITIAL_CMS_DATA.paketindex;
  store.paketindex = { ...base, ...patch };
  saveStore(store);
  return store.paketindex;
}

export function updateIntelligenceSource(
  id: string,
  patch: Partial<MarketIntelligenceSource>
): MarketIntelligenceSource | null {
  const store = ensureStoreFile();
  const idx = store.intelligenceSources.findIndex((s) => s.id === id);
  if (idx < 0) return null;
  store.intelligenceSources[idx] = { ...store.intelligenceSources[idx], ...patch };
  saveStore(store);
  return store.intelligenceSources[idx];
}

export function updateTechStackShare(id: string, patch: Partial<TechStackShare>): TechStackShare | null {
  const store = ensureStoreFile();
  const idx = store.techStackShares.findIndex((t) => t.id === id);
  if (idx < 0) return null;
  store.techStackShares[idx] = { ...store.techStackShares[idx], ...patch, id };
  saveStore(store);
  return store.techStackShares[idx];
}

export function upsertTimelineMilestone(
  input: Partial<TimelineMilestone> & { title: string }
): TimelineMilestone {
  const store = ensureStoreFile();
  const idx = input.id ? store.timeline.findIndex((t) => t.id === input.id) : -1;
  if (idx >= 0) {
    const updated: TimelineMilestone = { ...store.timeline[idx], ...input };
    store.timeline[idx] = updated;
    saveStore(store);
    return updated;
  }
  const created: TimelineMilestone = {
    id: input.id || `t-${Date.now()}`,
    era: input.era || '20s',
    year: input.year?.trim() || '2026',
    badge: input.badge?.trim() || 'Milstolpe',
    title: input.title.trim(),
    desc: input.desc?.trim() || '',
    stack: input.stack?.trim() || '',
  };
  store.timeline.push(created);
  saveStore(store);
  return created;
}

export function deleteTimelineMilestone(id: string): boolean {
  const store = ensureStoreFile();
  const before = store.timeline.length;
  store.timeline = store.timeline.filter((t) => t.id !== id);
  if (store.timeline.length === before) return false;
  saveStore(store);
  return true;
}

export function updatePageContent(patch: Partial<PageContentMap>): PageContentMap {
  const store = ensureStoreFile();
  const base = store.pageContent || INITIAL_CMS_DATA.pageContent;
  const merged: PageContentMap = {
    marknad: { ...base.marknad, ...(patch.marknad ?? {}) },
    nyheter: { ...base.nyheter, ...(patch.nyheter ?? {}) },
    event: { ...base.event, ...(patch.event ?? {}) },
    historia: { ...base.historia, ...(patch.historia ?? {}) },
    ehandlare: { ...base.ehandlare, ...(patch.ehandlare ?? {}) },
    partners: { ...base.partners, ...(patch.partners ?? {}) },
    logistics: { ...base.logistics, ...(patch.logistics ?? {}) },
    jobb: { ...base.jobb, ...(patch.jobb ?? {}) },
    community: { ...base.community, ...(patch.community ?? {}) },
    kontakt: { ...base.kontakt, ...(patch.kontakt ?? {}) },
    ...(base.om || patch.om ? { om: { ...base.om, ...patch.om } as PageContentMap['om'] } : {}),
  };
  store.pageContent = merged;
  saveStore(store);
  return merged;
}

// Target lookup and assignment run in one snapshot transaction, preserving other edits.
export function assignCmsImage(type: 'partner' | 'ad' | 'insight' | 'sale', id: string, image: CmsImage | null, revision?:number, actorUid='admin'): boolean {
  const store = structuredClone(ensureStoreFile());
  const item = (type === 'partner' ? store.partners : type === 'ad' ? store.adBanners : type==='sale' ? (store.saleListings||[]) : (store.insightPosts || [])).find((entry) => entry.id === id);
  if (!item) return false;
  if(type==='sale'||type==='insight') {
    const row=item as SaleListing|InsightPost;editorialConflict(row,revision??0);
    if(image&&!validCmsImage(image))throw Object.assign(new Error('Ogiltig bild.'),{status:400});
    if(type==='sale'&&image&&(row as SaleListing).images?.length===5)throw Object.assign(new Error('Högst fem annonsbilder.'),{status:400});
    editorialChange(store,type,row,actorUid,'image');row.revision=(row.revision??0)+1;
    if(type==='sale'){
      const sale=row as SaleListing;sale.updatedAt=new Date().toISOString();if(image)sale.images=[...(sale.images??[]),image];else sale.images=[];
      saveCommerce(store);return true;
    }
  }
  if (image) (item as TechPartner).image = image;
  else {
    // Preserve valid alternative text if the bundled image becomes visible again.
    if ('imageAlt' in item && !item.imageAlt && (item as InsightPost).image) item.imageAlt = (item as InsightPost).image!.alt;
    delete (item as InsightPost).image;
  }
  saveStore(store);
  return true;
}

function currentArchive(store: CMSStore): PaketindexObservation[] {
  return store.paketindexArchive ?? legacyObservation(store.paketindex);
}

export function upsertPaketindexObservation(input: PaketindexObservation): PaketindexObservation {
  if (!validObservation(input)) throw Object.assign(new Error('Ogiltig Paketindexpost. Publicering kräver käll-URL och datum.'), { status: 400 });
  const store = ensureStoreFile();
  const rows = [...currentArchive(store)];
  // Explicit fields only; reject/omit unknown input instead of storing arbitrary payload.
  const row: PaketindexObservation = { edition: input.edition, period: input.period, metric: input.metric,
    basis: input.basis, value: input.value, unit: input.unit, sourceName: input.sourceName, sourceUrl: input.sourceUrl,
    publishedDate: input.publishedDate, precision: input.precision, note: input.note, status: input.status,
    ...(input.sampleSize === undefined ? {} : { sampleSize: input.sampleSize }) };
  const index = rows.findIndex((r) => observationKey(r) === observationKey(row));
  if (index < 0) rows.push(row); else rows[index] = row;
  if (!validArchive(rows)) throw Object.assign(new Error('Arkivet får innehålla högst 500 unika poster.'), { status: 400 });
  store.paketindexArchive = rows; saveStore(store); return row;
}

export function deletePaketindexObservation(key: string): boolean {
  const store = ensureStoreFile(); const rows = currentArchive(store);
  if (!rows.some((r) => observationKey(r) === key)) return false;
  store.paketindexArchive = rows.filter((r) => observationKey(r) !== key); saveStore(store); return true;
}

export function importPaketindexCsv(csv: string, policy: 'reject' | 'skip' | 'replace', commit: boolean) {
  if (!['reject', 'skip', 'replace'].includes(policy) || typeof commit !== 'boolean' || typeof csv !== 'string') {
    throw Object.assign(new Error('Välj dubblettpolicy och förhandsgranskning/import.'), { status: 400 });
  }
  let incoming: PaketindexObservation[];
  try { incoming = parseArchiveCsv(csv); } catch (error) { throw Object.assign(error as Error, { status: 400 }); }
  const store = ensureStoreFile(); const existing = currentArchive(store);
  const rows = [...existing]; let added = 0; let skipped = 0; let replaced = 0;
  for (const row of incoming) {
    const index = rows.findIndex((r) => observationKey(r) === observationKey(row));
    if (index >= 0) {
      if (policy === 'reject') throw Object.assign(new Error('Dubblett i arkivet. Välj hoppa över eller ersätt som utkast.'), { status: 400 });
      if (policy === 'skip') { skipped++; continue; }
      rows[index] = row; replaced++;
    } else { rows.push(row); added++; }
  }
  if (!validArchive(rows)) throw Object.assign(new Error('Arkivet överskrider 500 poster eller innehåller felaktiga poster.'), { status: 400 });
  if (Buffer.byteLength(JSON.stringify({ ...store, paketindexArchive: rows }), 'utf8') > 890_000) {
    throw Object.assign(new Error('Arkivet ryms inte säkert i CMS-lagringen. Dela upp lagringen före fortsatt import.'), { status: 413 });
  }
  // All validation occurs before a single snapshot write. Preview never writes.
  if (commit) { store.paketindexArchive = rows; saveStore(store); }
  return { incoming, added, skipped, replaced, totalAfter: rows.length, committed: commit };
}

export function upsertInsightPost(input: InsightPost, actorUid = 'admin'): InsightPost {
  if (!validInsightPost(input)) throw Object.assign(new Error('Kontrollera rubrik, texter, länk, bildtext, datum och sortering.'), { status: 400 });
  const store = structuredClone(ensureStoreFile());
  const posts = [...(store.insightPosts ?? structuredClone(INITIAL_INSIGHT_POSTS))];
  const index = posts.findIndex((p) => p.id === input.id);
  editorialConflict(posts[index], input.revision??0);
  editorialChange(store,'insight',posts[index],actorUid,'edit');
  const post: InsightPost = { ...lifecycleInput(input,posts[index]), id: input.id, title: input.title, category: input.category, excerpt: input.excerpt,
    body: input.body, imageKey: input.imageKey, imageAlt: input.imageAlt, ...(input.image ? { image: input.image } : {}),
    ctaLabel: input.ctaLabel, targetTab: input.targetTab, targetUrl: input.targetUrl, sourceUrl: input.sourceUrl,
    author: input.author, publishedDate: input.publishedDate, theme: input.theme, order: input.order, status: input.status };
  // Image mutations use the dedicated media endpoint. Preserve the current image
  // when an editor submits an older copy of the post after another admin uploads.
  if (index >= 0) {
    if (posts[index].image) post.image = posts[index].image;
    else delete post.image;
    posts[index] = post;
  } else {
    delete post.image;
    posts.push(post);
  }
  if (!validInsightPosts(posts)) throw Object.assign(new Error('Högst 50 inlägg tillåts i denna CMS-version.'), { status: 400 });
  if (Buffer.byteLength(JSON.stringify({ ...store, insightPosts: posts }), 'utf8') > 890_000) {
    throw Object.assign(new Error('CMS är fullt. Dela upp innehållslagringen innan fler inlägg sparas.'), { status: 413 });
  }
  store.insightPosts = posts; saveStore(store); return post;
}
export function deleteInsightPost(id:string,revision:unknown,actor:CmsIdentity):boolean {
  changeEditorialState(actor,'insight',id,{revision,action:'trash'});return true;
}

export function executeMemberGovernance(actor: CmsIdentity, operation: string, input: unknown) {
  const store = structuredClone(ensureStoreFile()); const result = runGovernance(store, actor, operation, input);
  saveStore(store); return result;
}
export function getCompanyWorkspace(actor: CmsIdentity) {
  return companyWorkspace(ensureStoreFile(), actor);
}

export function getMyStaffProfile(actor: CmsIdentity) {
  if (!actor.verified || !actor.email || isBlocked(ensureStoreFile().memberGovernance,actor.uid)) {
    throw Object.assign(new Error('Verifierad inloggning krävs.'),{status:403});
  }
  const profile = ensureStoreFile().staffProfiles?.find((p)=>p.uid===actor.uid) || null;
  return {profile,identity:{uid:actor.uid,email:actor.email,admin:actor.admin}};
}
export function saveStaffProfile(actor: CmsIdentity, input: unknown, targetUid?: string): StaffProfile {
  if (!actor.verified || !actor.email) throw Object.assign(new Error('Verifierad inloggning krävs.'),{status:403});
  const store=structuredClone(ensureStoreFile());
  if (isBlocked(store.memberGovernance,actor.uid)) throw Object.assign(new Error('Åtkomst nekad.'),{status:403});
  if (targetUid && targetUid!==actor.uid && !actor.admin) throw Object.assign(new Error('Du kan bara redigera din egen profil.'),{status:403});
  const uid=targetUid || actor.uid;
  const previous=store.staffProfiles?.find((p)=>p.uid===uid);
  const member=store.communityMembers.find((m)=>m.authorUid===uid);
  const email=uid===actor.uid ? actor.email : member?.email || previous?.email;
  if (!email) throw Object.assign(new Error('Målprofilen kräver en redan UID-kopplad medlem.'),{status:400});
  if (!input || typeof input!=='object' || Array.isArray(input)) throw Object.assign(new Error('Ogiltig profil.'),{status:400});
  const values=input as Record<string,unknown>;
  if (['name','phone','position','company','employmentSince','expertise','photoUrl'].some((key)=>values[key]!==undefined&&typeof values[key]!=='string')) throw Object.assign(new Error('Profilfält måste vara text.'),{status:400});
  const profile: StaffProfile={uid,email,name:String(values.name ?? ''),phone:String(values.phone ?? ''),position:String(values.position ?? ''),
    company:String(values.company ?? ''),employmentSince:String(values.employmentSince ?? ''),expertise:String(values.expertise ?? ''),photoUrl:String(values.photoUrl ?? ''),updatedAt:new Date().toISOString()};
  if (!validStaffProfile(profile)) throw Object.assign(new Error('Kontrollera namn, telefon, position, anställningsdatum och godkänd bildadress.'),{status:400});
  const profiles=[...(store.staffProfiles || []).filter((p)=>p.uid!==uid),profile];
  if (!validStaffProfiles(profiles) || Buffer.byteLength(JSON.stringify({...store,staffProfiles:profiles}),'utf8')>890000) {
    throw Object.assign(new Error('Profilregistret är fullt. Arkivering/separata samlingar krävs.'),{status:413});
  }
  store.staffProfiles=profiles;
  // Record an actual authenticated admin's profile without creating an Auth user or
  // granting roles based on submitted email. This also makes the owner visible in CMS.
  if (uid===actor.uid && actor.admin && !member) {
    if (store.communityMembers.length>=500) throw Object.assign(new Error('Medlemsregistret är fullt.'),{status:413});
    store.communityMembers.push({id:`staff-${actor.uid}`,directoryHidden:true,authorUid:actor.uid,email:actor.email,name:profile.name,role:profile.position || 'Administratör',
      company:profile.company || 'Sveriges E-handel',city:'',verificationStatus:'verified',verifiedAt:profile.updatedAt,createdAt:profile.updatedAt});
  }
  const governance=store.memberGovernance ?? emptyGovernance();
  governance.audit.unshift({id:`profile-${Date.now()}-${Math.random().toString(36).slice(2,9)}`,actorUid:actor.uid,action:'staff-profile-saved',target:uid,createdAt:profile.updatedAt});
  governance.audit=governance.audit.slice(0,500);store.memberGovernance=governance;
  if (Buffer.byteLength(JSON.stringify(store),'utf8')>890000) throw Object.assign(new Error('CMS-lagringen är full.'),{status:413});
  saveStore(store);return profile;
}

export function registerCmsUser(actor:CmsIdentity, raw:unknown, account:ResolvedCmsUser) {
  const store=structuredClone(ensureStoreFile());
  if (!actor.admin || !actor.verified || isBlocked(store.memberGovernance,actor.uid)) throw Object.assign(new Error('Endast Sveriges E-handels administratör får lägga till användare.'),{status:403});
  const input=parseCmsUserInput(raw);
  if (!account.uid || account.uid.length>128 || account.email.toLowerCase()!==input.email || isBlocked(store.memberGovernance,account.uid)) throw Object.assign(new Error('Kontot kan inte registreras. Kontrollera identitet och eventuell blockering.'),{status:409});
  const byUid=store.communityMembers.find((m)=>m.authorUid===account.uid);
  const byEmail=store.communityMembers.find((m)=>m.email.toLowerCase()===input.email);
  if (byEmail && byEmail.authorUid!==account.uid) throw Object.assign(new Error('Adressen finns redan i CMS utan matchande inloggningskoppling. Granska registerposten manuellt; ingen automatisk överföring sker.'),{status:409});
  // A retry or adding an already registered user must never reset approval,
  // directory privacy, staff data, company links or blocked/rejected status.
  if (byUid) return {memberId:byUid.id,uid:account.uid,alreadyRegistered:true,authCreated:account.created};
  if (store.communityMembers.length>=500) throw Object.assign(new Error('Medlemsregistret är fullt.'),{status:413});
  const now=new Date().toISOString();
  const member={id:`cms-${account.uid}`,authorUid:account.uid,email:account.email,name:input.name,role:input.position||'Medlem',city:'',company:input.company,
    verificationStatus:'pending' as const,directoryHidden:true,createdAt:now};
  const profile:StaffProfile={...input,uid:account.uid,email:account.email,photoUrl:'',updatedAt:now};
  const profiles=store.staffProfiles || [];
  if (!profiles.some((p)=>p.uid===account.uid)) profiles.push(profile);
  if (!validStaffProfiles(profiles)) throw Object.assign(new Error('Personalregistret är fullt.'),{status:413});
  store.staffProfiles=profiles;store.communityMembers.push(member);
  const g=store.memberGovernance ?? emptyGovernance();
  g.audit.unshift({id:`user-${Date.now()}-${Math.random().toString(36).slice(2,9)}`,actorUid:actor.uid,action:'cms-user-registered',target:account.uid,createdAt:now});
  g.audit=g.audit.slice(0,500);store.memberGovernance=g;
  if (Buffer.byteLength(JSON.stringify(store),'utf8')>890000) throw Object.assign(new Error('CMS-lagringen är full.'),{status:413});
  saveStore(store);return {memberId:member.id,uid:account.uid,alreadyRegistered:false,authCreated:account.created};
}

export function prepareUserInvitation(actor:CmsIdentity,uid:string,from:string):{status:'ready'|'already-accepted'|'needs-review';invitation:UserInvitation} {
  const store=structuredClone(ensureStoreFile());
  if (!actor.admin||!actor.verified||isBlocked(store.memberGovernance,actor.uid)||isBlocked(store.memberGovernance,uid)) throw Object.assign(new Error('Åtkomst nekad.'),{status:403});
  const member=store.communityMembers.find((m)=>m.authorUid===uid);
  if(!member)throw Object.assign(new Error('Användaren saknas.'),{status:404});
  if(member.invitation){
    if(member.invitation.email!==member.email) return {status:'needs-review',invitation:member.invitation};
    if(member.invitation.acceptedAt)return {status:'already-accepted',invitation:member.invitation};
    if(Date.now()-Date.parse(member.invitation.startedAt)>23*3600000)return {status:'needs-review',invitation:member.invitation};
    return {status:'ready',invitation:member.invitation};
  }
  if(!from || from.length>320 || /[\r\n]/.test(from))throw Object.assign(new Error('Ogiltig avsändarkonfiguration.'),{status:400});
  member.invitation={email:member.email,name:member.name,from,startedAt:new Date().toISOString(),templateVersion:2};
  saveStore(store);return {status:'ready',invitation:member.invitation};
}
export function markUserInvitationAccepted(actor:CmsIdentity,uid:string,startedAt:string) {
  const store=ensureStoreFile();
  if(!actor.admin||!actor.verified||isBlocked(store.memberGovernance,actor.uid))throw Object.assign(new Error('Åtkomst nekad.'),{status:403});
  const member=store.communityMembers.find((m)=>m.authorUid===uid);
  if(!member?.invitation||member.invitation.startedAt!==startedAt)throw Object.assign(new Error('Inbjudningsstatus ändrad.'),{status:409});
  member.invitation.acceptedAt=new Date().toISOString();saveStore(store);return {ok:true};
}

function commerceActor(actor:CmsIdentity,admin=false):asserts actor is CmsIdentity & {email:string} {
  if(!actor?.verified||!actor.email||!actor.uid||(admin&&!actor.admin)||isBlocked(ensureStoreFile().memberGovernance,actor.uid))
    throw Object.assign(new Error('Verifierad behörighet krävs.'),{status:403});
}
function saveCommerce(store:CMSStore) {
  if(Buffer.byteLength(JSON.stringify(store),'utf8')>890000)throw Object.assign(new Error('CMS är fullt. Ingen post har raderats. Kontakta administratören.'),{status:413});
  saveStore(store);
}
export function saveGuideChapter(actor:CmsIdentity,input:unknown) {
  commerceActor(actor,true);
  if(!validChapter(input))throw Object.assign(new Error('Kontrollera guidens texter, datum, länk och checklista.'),{status:400});
  const store=structuredClone(ensureStoreFile());const rows=store.startGuide??structuredClone(INITIAL_START_GUIDE);
  const before=rows.find(r=>r.id===input.id);editorialConflict(before,input.revision??0);editorialChange(store,'guide',before,actor.uid,'edit');
  const c:GuideChapter={...lifecycleInput(input,before),id:input.id,title:input.title,summary:input.summary,body:input.body,checklist:[...input.checklist],targetTab:input.targetTab,sourceUrl:input.sourceUrl,reviewedDate:input.reviewedDate,order:input.order,status:input.status};
  const i=rows.findIndex(r=>r.id===c.id);if(i<0)rows.push(c);else rows[i]=c;
  if(!validGuide(rows))throw Object.assign(new Error('Högst 25 unika guidekapitel tillåts.'),{status:400});
  store.startGuide=rows;saveCommerce(store);return c;
}
export function submitSaleListing(actor:CmsIdentity,input:unknown) {
  commerceActor(actor);const details=saleDetails(input);const v=input as Record<string,unknown>|null;
  if(!details||typeof v?.requestId!=='string'||!/^sale-[a-zA-Z0-9-]{1,80}$/.test(v.requestId)||v?.authorityConfirmed!==true||v?.publicContentConfirmed!==true||typeof v?.sellerName!=='string'||!v.sellerName.trim()||v.sellerName.length>100)
    throw Object.assign(new Error('Fyll i alla annonsuppgifter och bekräfta behörighet samt att texten kan publiceras.'),{status:400});
  const store=structuredClone(ensureStoreFile());const now=new Date().toISOString();const rows=store.saleListings??[];
  const existing=rows.find(r=>r.id===v.requestId);
  if(existing){if(existing.origin==='cms'||existing.sellerUid!==actor.uid)throw Object.assign(new Error('Annonsreferensen används redan.'),{status:409});return {id:existing.id,status:existing.status};}
  if(rows.filter(r=>r.sellerUid===actor.uid&&r.status==='pending').length>=3)throw Object.assign(new Error('Du har redan tre annonsförslag som väntar på granskning.'),{status:429});
  const row:SaleListing={...details,id:v.requestId as string,sellerUid:actor.uid,sellerEmail:actor.email,sellerName:v.sellerName.trim(),
    authorityConfirmed:true,publicContentConfirmed:true,status:'pending',availability:'available',internalNotes:'',reviewedBy:'',reviewedAt:'',createdAt:now,updatedAt:now};
  rows.push(row);if(!validSaleListings(rows))throw Object.assign(new Error('Annonsregistret är fullt. Kontakta redaktionen; inga äldre annonser har raderats.'),{status:413});
  store.saleListings=rows;saveCommerce(store);return {id:row.id,status:row.status};
}
export function createCmsSaleListing(actor:CmsIdentity,input:unknown) {
  commerceActor(actor,true);
  const details=saleDetails(input);const v=input as Record<string,unknown>|null;
  let email='';try{email=normalizeLoginEmail(typeof v?.sellerEmail==='string'?v.sellerEmail:'');}catch{}
  if(!details||!email||typeof v?.requestId!=='string'||!/^sale-[a-zA-Z0-9-]{1,80}$/.test(v.requestId)||
    typeof v.sellerName!=='string'||!v.sellerName.trim()||v.sellerName.length>100||v.authorityConfirmed!==true||v.publicContentConfirmed!==true||
    !['draft','published'].includes(String(v.status))||typeof v.internalNotes!=='string'||v.internalNotes.length>2000||
    (v.status==='published'&&v.reviewConfirmed!==true))
    throw Object.assign(new Error('Kontrollera annons, kontaktuppgifter, uppdrag och granskningsbekräftelse.'),{status:400});
  const store=structuredClone(ensureStoreFile());const rows=store.saleListings??[];
  const existing=rows.find(r=>r.id===v.requestId);
  if(existing){if(existing.origin!=='cms'||existing.createdByUid!==actor.uid)throw Object.assign(new Error('Referensen används redan.'),{status:409});return {id:existing.id,status:existing.status};}
  const now=new Date().toISOString();
  const row:SaleListing={...details,...lifecycleInput(v as EditorialLifecycle),id:v.requestId,sellerName:v.sellerName.trim(),sellerEmail:email,sellerUid:'',origin:'cms',createdByUid:actor.uid,
    authorityConfirmed:true,publicContentConfirmed:true,status:v.status as 'draft'|'published',availability:'available',internalNotes:v.internalNotes,
    reviewedBy:v.status==='published'?actor.uid:'',reviewedAt:v.status==='published'?now:'',createdAt:now,updatedAt:now};
  rows.push(row);
  if(!validSaleListings(rows))throw Object.assign(new Error('Annonsregistret är fullt eller ogiltigt. Ingen historik har raderats.'),{status:413});
  store.saleListings=rows;saveCommerce(store);return {id:row.id,status:row.status};
}
export function reviewSaleListing(actor:CmsIdentity,id:string,input:unknown) {
  commerceActor(actor,true);const store=structuredClone(ensureStoreFile());const row=store.saleListings?.find(r=>r.id===id);
  if(!row)throw Object.assign(new Error('Annonsen hittades inte.'),{status:404});
  const details=saleDetails(input);const v=input as Record<string,unknown>|null;
  if(!details||!['draft','published','rejected'].includes(String(v?.status))||!['available','discussions','sold'].includes(String(v?.availability))||
    typeof v?.internalNotes!=='string'||v.internalNotes.length>2000||(v.status==='published'&&v.reviewConfirmed!==true))
    throw Object.assign(new Error('Kontrollera annonsen och bekräfta redaktionell granskning före publicering.'),{status:400});
  editorialConflict(row,v.revision??0);editorialChange(store,'sale',row,actor.uid,'edit');
  Object.assign(row,details,lifecycleInput(v as EditorialLifecycle,row),{status:v.status,availability:v.availability,internalNotes:v.internalNotes,reviewedBy:actor.uid,reviewedAt:new Date().toISOString(),updatedAt:new Date().toISOString()});
  if(!validSaleListings(store.saleListings))throw Object.assign(new Error('Ogiltig annons.'),{status:400});
  saveCommerce(store);return {id:row.id,status:row.status};
}
export function inquireSaleListing(actor:CmsIdentity,id:string,input:unknown) {
  commerceActor(actor);const store=structuredClone(ensureStoreFile());const row=store.saleListings?.find(r=>r.id===id&&publiclyVisible(r)&&r.availability!=='sold');
  if(!row)throw Object.assign(new Error('Annonsen är inte tillgänglig för intresseförfrågningar.'),{status:404});
  const v=input as Record<string,unknown>|null;
  if(typeof v?.name!=='string'||!v.name.trim()||v.name.length>100||typeof v?.message!=='string'||!v.message.trim()||v.message.length>3000||typeof v?.requestId!=='string'||!/^inq-[a-zA-Z0-9-]{1,80}$/.test(v.requestId))
    throw Object.assign(new Error('Ange namn och meddelande.'),{status:400});
  // Idempotent submit within this inbox. No client email, routing or listing title trusted.
  const existing=store.contactMessages.find(m=>m.id===v.requestId);
  if(existing){if(existing.authorUid!==actor.uid||existing.adSlot!==id)throw Object.assign(new Error('Förfrågnings-ID används redan.'),{status:409});return {ok:true};}
  if(store.contactMessages.filter(m=>m.authorUid===actor.uid&&m.topic.startsWith('Köp & sälj:')&&m.createdAt.slice(0,10)===new Date().toISOString().slice(0,10)).length>=10)throw Object.assign(new Error('Du har nått dagens gräns för intresseförfrågningar.'),{status:429});
  if(store.contactMessages.length>=300)throw Object.assign(new Error('Inkorgen är full. Kontakta redaktionen via kontaktsidan.'),{status:413});
  store.contactMessages.unshift({id:v.requestId,name:v.name.trim(),email:actor.email,authorUid:actor.uid,topic:`Köp & sälj: ${row.title}`,adSlot:id,
    message:v.message.trim(),submissionType:'other',routingMode:'self',status:'new',createdAt:new Date().toISOString()});
  saveCommerce(store);return {ok:true};
}

export function changeEditorialState(actor:CmsIdentity,kind:EditorialKind,id:string,input:unknown) {
  commerceActor(actor,true);const store=structuredClone(ensureStoreFile());
  const rows=kind==='sale'?store.saleListings:kind==='guide'?store.startGuide:kind==='insight'?store.insightPosts:undefined;
  const row=rows?.find(r=>r.id===id);if(!row)throw Object.assign(new Error('Posten saknas.'),{status:404});
  const v=input as {revision?:number;action?:string;versionId?:string};
  editorialConflict(row,v?.revision??0);
  if(!['trash','untrash','restore'].includes(v?.action||''))throw Object.assign(new Error('Ogiltig åtgärd.'),{status:400});
  const before=structuredClone(row);
  if(v.action==='restore'){
    const version=store.editorialHistory?.find(h=>h.id===v.versionId&&h.kind===kind&&h.targetId===id);
    if(!version)throw Object.assign(new Error('Versionen finns inte.'),{status:404});
    const restored=structuredClone(version.before);
    // Restore editable content only, never replace current creator/contact identity with old data.
    if(kind==='sale')Object.assign(restored,{sellerUid:(row as SaleListing).sellerUid,sellerEmail:(row as SaleListing).sellerEmail,sellerName:(row as SaleListing).sellerName,origin:(row as SaleListing).origin,createdByUid:(row as SaleListing).createdByUid});
    Object.keys(row).forEach(k=>delete (row as unknown as Record<string,unknown>)[k]);Object.assign(row,restored);
  }
  editorialChange(store,kind,before,actor.uid,v.action!);
  row.revision=(before.revision??0)+1;row.status='draft';row.publishAt='';row.expiresAt='';
  row.trashedAt=v.action==='trash'?new Date().toISOString():'';
  if(kind==='sale')Object.assign(row,{reviewedBy:actor.uid,reviewedAt:new Date().toISOString(),updatedAt:new Date().toISOString()});
  saveCommerce(store);return {ok:true,revision:row.revision};
}
export function assignSaleCase(actor:CmsIdentity,id:string,input:unknown) {
  commerceActor(actor,true);const store=structuredClone(ensureStoreFile());
  const message=store.contactMessages.find(m=>m.id===id&&m.topic.startsWith('Köp & sälj:')&&m.adSlot);
  if(!message)throw Object.assign(new Error('Affärsförfrågan saknas.'),{status:404});
  const v=input as Record<string,unknown>|null;const previous=store.saleCases?.find(c=>c.messageId===id);
  editorialConflict(previous,v?.revision??0);
  if(typeof v?.assignedUid!=='string'||(v.assignedUid!==''&&(!store.staffProfiles?.some(p=>p.uid===v.assignedUid)||isBlocked(store.memberGovernance,v.assignedUid))))throw Object.assign(new Error('Välj en registrerad, ej blockerad personalprofil.'),{status:400});
  const record={messageId:id,assignedUid:v.assignedUid,state:v.state,dueDate:v.dueDate,note:v.note,revision:(previous?.revision??0)+1,updatedAt:new Date().toISOString(),updatedBy:actor.uid};
  const cases=[...(store.saleCases??[]).filter(c=>c.messageId!==id),record];
  if(!validSaleCases(cases))throw Object.assign(new Error('Kontrollera ärendestatus, datum och anteckning.'),{status:400});
  store.saleCases=cases;saveCommerce(store);return {ok:true};
}
export function saleImageGallery(actor:CmsIdentity,id:string,input:unknown) {
  commerceActor(actor,true);const store=structuredClone(ensureStoreFile());const row=store.saleListings?.find(r=>r.id===id);
  if(!row)throw Object.assign(new Error('Annonsen saknas.'),{status:404});
  const v=input as {revision?:number;paths?:string[]};editorialConflict(row,v?.revision??0);
  if(!Array.isArray(v?.paths)||v.paths.length>5||new Set(v.paths).size!==v.paths.length||v.paths.some(p=>!row.images?.some(i=>i.path===p)))throw Object.assign(new Error('Välj endast befintliga bildreferenser i ny ordning.'),{status:400});
  editorialChange(store,'sale',row,actor.uid,'gallery');row.images=v.paths.map(p=>row.images!.find(i=>i.path===p)!);row.revision=(row.revision??0)+1;row.updatedAt=new Date().toISOString();
  saveCommerce(store);return {ok:true};
}

export function saveHomeWidgets(actor:CmsIdentity,input:unknown) {
  commerceActor(actor,true);
  if(!validHomeWidgets(input))throw Object.assign(new Error('Ogiltig widgetlayout.'),{status:400});
  const store=structuredClone(ensureStoreFile());editorialConflict(store.homeWidgets,input.revision);
  const layout:HomeWidgetLayout={version:1,revision:input.revision+1,items:input.items.map(i=>({id:i.id,enabled:i.enabled,order:i.order}))};
  store.homeWidgets=layout;saveCommerce(store);return layout;
}
