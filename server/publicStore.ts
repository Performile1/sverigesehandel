import type { CMSStore } from '../src/types.ts';

export function publicStore(store: CMSStore, admin = false): CMSStore {
  const members = store.communityMembers || [];
  const communityMemberCount = members.length;
  const communityMemberCities = Array.from(
    new Set(members.map((member) => member.city.trim()).filter(Boolean))
  );
  if (admin) {
    return {
      ...store,
      partners: (store.partners || []).map((p) => ({
        ...p,
        hasDirectIntroEmail: Boolean(p.introEmail?.trim()),
      })),
      logisticsProviders: (store.logisticsProviders || []).map((lp) => ({
        ...lp,
        hasDirectIntroEmail: Boolean(lp.introEmail?.trim()),
      })),
      communityMemberCount,
      communityMemberCities,
    };
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
  result.partners = result.partners.map((partner) => {
    const hasDirectIntroEmail = Boolean(partner.introEmail?.trim());
    const copy = { ...partner, hasDirectIntroEmail };
    delete copy.introEmail;
    return copy;
  });
  result.logisticsProviders = result.logisticsProviders.map((provider) => {
    const hasDirectIntroEmail = Boolean(provider.introEmail?.trim());
    const copy = { ...provider, hasDirectIntroEmail };
    delete copy.introEmail;
    return copy;
  });
  result.contactForms = (result.contactForms || [])
    .filter((form) => form.active)
    .map((form) => ({ ...form, recipientEmail: '' }));
  result.adBanners = result.adBanners.filter((banner) => banner.active);
  return result;
}
