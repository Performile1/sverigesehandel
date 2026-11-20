import type { CMSStore } from '../src/types.ts';

export function publicStore(store: CMSStore, admin = false): CMSStore {
  const members = store.communityMembers || [];
  const communityMemberCount = members.length;
  const communityVerifiedCount = members.filter(
    (member) => member.verificationStatus === 'verified'
  ).length;
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
      communityVerifiedCount,
      communityMemberCities,
      directMessages: [],
    };
  }
  const result = structuredClone(store);
  result.paketindexArchive = (result.paketindexArchive || []).filter((row) => row.status === 'published');
  result.mapPoints = (result.mapPoints || []).filter((point) => point.status === 'published');
  result.contactMessages = [];
  result.communityMembers = [];
  result.directMessages = [];
  result.communityThreads = (result.communityThreads || []).map((thread) => {
    const cleanThread = { ...thread };
    delete cleanThread.authorUid;
    if (Array.isArray(cleanThread.comments)) {
      cleanThread.comments = cleanThread.comments.map((c) => {
        const cleanComment = { ...c };
        delete cleanComment.authorUid;
        return cleanComment;
      });
    }
    return cleanThread;
  });
  result.communityMemberCount = communityMemberCount;
  result.communityVerifiedCount = communityVerifiedCount;
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
