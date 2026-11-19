import type { CMSStore } from '../src/types.ts';

export function publicStore(store: CMSStore, admin = false): CMSStore {
  const members = store.communityMembers || [];
  const communityMemberCount = members.length;
  const communityMemberCities = Array.from(
    new Set(members.map((member) => member.city.trim()).filter(Boolean))
  );
  if (admin) {
    return { ...store, communityMemberCount, communityMemberCities };
  }
  const result = structuredClone(store);
  result.contactMessages = [];
  result.communityMembers = [];
  result.communityMemberCount = communityMemberCount;
  result.communityMemberCities = communityMemberCities;
  for (const key of ['merchants', 'partners', 'logisticsProviders', 'news', 'events', 'sessions', 'jobs', 'recruitmentSites'] as const) {
    // Filter drafts on the server, not only in the public React components.
    (result[key] as Array<{ status: string }>) = (result[key] || []).filter((item) => item.status === 'published');
  }
  result.adBanners = result.adBanners.filter((banner) => banner.active);
  return result;
}
