import type { CMSStore, TechPartner } from '../src/types.ts';
import { INITIAL_CMS_DATA } from './seedData.ts';

function hasOwn(obj: object, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

// Only migrate newly introduced fields/versions. Never mutate the input object and
// never restore deleted entities once a snapshot is at schemaVersion >= 2.
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

  const version = typeof obj.schemaVersion === 'number' ? obj.schemaVersion : 1;
  if (version < 2) {
    const draft = ensureClone();
    if (Array.isArray(obj.partners)) {
      const seedPartnersById = new Map(INITIAL_CMS_DATA.partners.map((p) => [p.id, p]));
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
    draft.schemaVersion = 2;
  }

  return next;
}

export function validateSnapshot(value: unknown): value is CMSStore {
  if (!value || typeof value !== 'object') return false;
  const store = value as Record<string, unknown>;
  const arrays = ['merchants', 'partners', 'logisticsProviders', 'news', 'events', 'sessions', 'jobs', 'recruitmentSites',
    'orderBenchmarks', 'shippingTiers', 'laws', 'intelligenceSources', 'techStackShares',
    'adBanners', 'contactMessages', 'timeline', 'communityThreads', 'communityMembers'];
  return arrays.every((key) => Array.isArray(store[key])) &&
    ['regions', 'deliveryStats'].every((key) => store[key] !== null &&
      typeof store[key] === 'object' && !Array.isArray(store[key])) &&
    typeof store.updatedAt === 'string';
}
