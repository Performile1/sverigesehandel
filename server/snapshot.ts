import type { CMSStore } from '../src/types.ts';

export function validateSnapshot(value: unknown): value is CMSStore {
  if (!value || typeof value !== 'object') return false;
  const store = value as Record<string, unknown>;
  const arrays = ['merchants', 'partners', 'events', 'sessions', 'jobs', 'recruitmentSites',
    'orderBenchmarks', 'shippingTiers', 'laws', 'intelligenceSources', 'techStackShares',
    'adBanners', 'contactMessages', 'timeline', 'communityThreads', 'communityMembers'];
  return arrays.every((key) => Array.isArray(store[key])) &&
    ['regions', 'deliveryStats'].every((key) => store[key] !== null &&
      typeof store[key] === 'object' && !Array.isArray(store[key])) &&
    typeof store.updatedAt === 'string';
}
