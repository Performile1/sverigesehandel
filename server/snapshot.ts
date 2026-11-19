import type { CMSStore } from '../src/types.ts';
import { INITIAL_CMS_DATA } from './seedData.ts';

// Only migrate the newly introduced field. Never merge seed entities into an
// existing list: an empty list or a deleted provider is intentional editorial data.
export function upgradeSnapshot(value: unknown): unknown {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return value;
  if (Object.prototype.hasOwnProperty.call(value, 'logisticsProviders')) return value;
  return { ...value, logisticsProviders: structuredClone(INITIAL_CMS_DATA.logisticsProviders) };
}

export function validateSnapshot(value: unknown): value is CMSStore {
  if (!value || typeof value !== 'object') return false;
  const store = value as Record<string, unknown>;
  const arrays = ['merchants', 'partners', 'logisticsProviders', 'events', 'sessions', 'jobs', 'recruitmentSites',
    'orderBenchmarks', 'shippingTiers', 'laws', 'intelligenceSources', 'techStackShares',
    'adBanners', 'contactMessages', 'timeline', 'communityThreads', 'communityMembers'];
  return arrays.every((key) => Array.isArray(store[key])) &&
    ['regions', 'deliveryStats'].every((key) => store[key] !== null &&
      typeof store[key] === 'object' && !Array.isArray(store[key])) &&
    typeof store.updatedAt === 'string';
}
