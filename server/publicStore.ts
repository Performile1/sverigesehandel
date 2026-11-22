import { publiclyVisible } from '../shared/editorialLifecycle.ts';
import { publicSaleListing } from '../shared/commerce.ts';
import { INITIAL_START_GUIDE } from '../shared/startGuide.ts';
import { companyInboxAvailable } from './memberGovernance.ts';
import { DEFAULT_COMMUNITY_SETTINGS } from '../shared/memberGovernance.ts';
import { INITIAL_INSIGHT_POSTS } from '../shared/insightPosts.ts';
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
      communitySettings: { ...(store.memberGovernance?.settings ?? DEFAULT_COMMUNITY_SETTINGS) },
      partners: (store.partners || []).map((p) => ({
        ...p,
        hasDirectIntroEmail: Boolean(p.introEmail?.trim()),
        hasCompanyIntroInbox: companyInboxAvailable(store,'partner',p.id,true),
      })),
      logisticsProviders: (store.logisticsProviders || []).map((lp) => ({
        ...lp,
        hasDirectIntroEmail: Boolean(lp.introEmail?.trim()),
        hasCompanyIntroInbox: companyInboxAvailable(store,'logistics',lp.id,true),
      })),
      communityMemberCount,
      communityVerifiedCount,
      communityMemberCities,
      directMessages: [],
    };
  }
  const result = structuredClone(store);
  result.startGuide=(result.startGuide??INITIAL_START_GUIDE).filter(row=>publiclyVisible(row));
  result.publicSaleListings=(store.saleListings??[]).filter(row=>publiclyVisible(row)).map(publicSaleListing);
  delete result.saleListings;
  delete result.editorialHistory;
  delete result.saleCases;
  delete result.staffProfiles;
  delete result.memberGovernance;
  result.communitySettings = { ...(store.memberGovernance?.settings ?? DEFAULT_COMMUNITY_SETTINGS) };
  result.insightPosts = (result.insightPosts ?? INITIAL_INSIGHT_POSTS).filter(row=>publiclyVisible(row));
  result.paketindexArchive = (result.paketindexArchive || []).filter((row) => row.status === 'published');
  result.mapPoints = (result.mapPoints || []).filter((point) => point.status === 'published');
  result.contactMessages = [];
  result.communityMembers = [];
  result.directMessages = [];
  const hidden = store.memberGovernance?.hidden || [];
  result.communityThreads = (result.communitySettings.enabled ? result.communityThreads || [] : [])
    .filter((thread) => !hidden.some((h) => h.threadId === thread.id && !h.commentId)).map((thread) => {
    const cleanThread = { ...thread };
    delete cleanThread.authorUid;
    if (Array.isArray(cleanThread.comments)) {
      cleanThread.comments = cleanThread.comments.filter((c) => !hidden.some((h) => h.threadId === thread.id && h.commentId === c.id)).map((c) => {
        const cleanComment = { ...c };
        delete cleanComment.authorUid;
        return cleanComment;
      });
    }
    cleanThread.replies = cleanThread.comments?.length || 0;
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
    const copy = { ...partner, hasDirectIntroEmail, hasCompanyIntroInbox: companyInboxAvailable(store,'partner',partner.id,true) };
    delete copy.introEmail;
    return copy;
  });
  result.logisticsProviders = result.logisticsProviders.map((provider) => {
    const hasDirectIntroEmail = Boolean(provider.introEmail?.trim());
    const copy = { ...provider, hasDirectIntroEmail, hasCompanyIntroInbox: companyInboxAvailable(store,'logistics',provider.id,true) };
    delete copy.introEmail;
    return copy;
  });
  result.contactForms = (result.contactForms || [])
    .filter((form) => form.active)
    .map((form) => ({ ...form, recipientEmail: '' }));
  result.adBanners = result.adBanners.filter((banner) => banner.active);
  return result;
}
