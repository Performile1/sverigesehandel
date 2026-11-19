import type { CMSStore } from '../src/types.ts';

export function publicStore(store: CMSStore, admin = false): CMSStore {
  if (admin) return store;
  const result = structuredClone(store);
  result.contactMessages = [];
  result.communityMembers = [];
  for (const key of ['merchants', 'partners', 'logisticsProviders', 'events', 'sessions', 'jobs', 'recruitmentSites'] as const) {
    // Filter drafts on the server, not only in the public React components.
    (result[key] as Array<{ status: string }>) = (result[key] || []).filter((item) => item.status === 'published');
  }
  result.adBanners = result.adBanners.filter((banner) => banner.active);
  return result;
}
