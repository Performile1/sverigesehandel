import type { StaffProfile, MyStaffProfile } from './types';
import type { CompanyWorkspace } from './types';
import type { InsightPost } from './types';
import type { PaketindexObservation } from './types';
import type { CmsImage, CmsAnalyticsReport, FirebaseFeatureStatus } from './types';
import type { MapPoint } from './types';
import { auth } from './firebase';
import type {
  AdBanner,
  CategoryOrderBenchmark,
  CMSStore,
  CommunityDirectMessage,
  CommunityMember,
  CommunityMemberType,
  CommunityThread,
  ContactFormConfig,
  ContactMessage,
  ContactMessageStatus,
  DCSession,
  DeliveryStatsData,
  DiscoveredJobCandidate,
  DiscoveredMerchantCandidate,
  DiscoveredPartnerCandidate,
  DiscoveredRecruiterCandidate,
  EcommerceEvent,
  EcommerceJob,
  EcommerceLaw,
  EcommerceNewsItem,
  FormRoutingMode,
  GroundingSource,
  LogisticsProvider,
  MarketIntelligenceSource,
  Merchant,
  PageContentMap,
  PaketindexData,
  PublicMemberProfile,
  RecruitmentSite,
  RegionMetric,
  ShippingCostTier,
  TechPartner,
  TechStackShare,
  TimelineMilestone,
} from './types';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  await auth.authStateReady();
  const buildHeaders = async (forceRefresh = false) => {
    const token = await auth.currentUser?.getIdToken(forceRefresh);
    const headers = new Headers(options?.headers);
    headers.set('Content-Type', 'application/json');
    if (token) headers.set('Authorization', `Bearer ${token}`);
    return { headers, hasToken: Boolean(token) };
  };

  let { headers, hasToken } = await buildHeaders(false);
  let res = await fetch(url, { ...options, headers });
  if (res.status === 401 && hasToken && auth.currentUser) {
    ({ headers } = await buildHeaders(true));
    res = await fetch(url, { ...options, headers });
  }

  if (!res.headers.get('content-type')?.includes('application/json')) {
    throw new Error('CMS-API:t svarade inte med JSON. Kontrollera att Vercel API-funktionen är driftsatt.');
  }
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data as T;
}

type DiscoveryTarget = 'merchants' | 'partners' | 'jobs' | 'recruiters';

type DiscoveryResult<T extends DiscoveryTarget> = T extends 'merchants'
  ? DiscoveredMerchantCandidate[]
  : T extends 'partners'
  ? DiscoveredPartnerCandidate[]
  : T extends 'jobs'
  ? DiscoveredJobCandidate[]
  : DiscoveredRecruiterCandidate[];

export const api = {
  myStaffProfile:()=>request<MyStaffProfile>('/api/staff/me'),
  saveStaffProfile:(profile:Partial<StaffProfile>,uid?:string)=>request<StaffProfile>(uid?`/api/staff/${uid}`:'/api/staff/me',{method:'PUT',body:JSON.stringify(profile)}),
  companyWorkspace: () => request<CompanyWorkspace>('/api/company/workspace'),
  companyProposal: (payload: unknown) => request<{ok:boolean}>('/api/company/proposals',{method:'POST',body:JSON.stringify(payload)}),
  companyInboxRead: (id:string) => request<{ok:boolean}>('/api/company/inbox/read',{method:'POST',body:JSON.stringify({id})}),
  governance: (operation:string,payload:unknown) => request<{ok:boolean}>(`/api/governance/${operation}`,{method:'POST',body:JSON.stringify(payload)}),
  reportCommunity: (payload:{threadId:string;commentId:string;reason:string;detail:string}) => request<{ok:boolean}>('/api/community/reports',{method:'POST',body:JSON.stringify(payload)}),
  saveInsightPost: (post: InsightPost) => request<InsightPost>(`/api/insights/${post.id}`, { method: 'PUT', body: JSON.stringify(post) }),
  deleteInsightPost: (id: string) => request<{ deleted: boolean }>(`/api/insights/${id}`, { method: 'DELETE' }),
  savePaketindexObservation: (row: PaketindexObservation) => request<PaketindexObservation>('/api/paketindex/archive', { method: 'POST', body: JSON.stringify(row) }),
  deletePaketindexObservation: (key: string) => request<{ deleted: boolean }>('/api/paketindex/archive', { method: 'DELETE', body: JSON.stringify({ key }) }),
  importPaketindexCsv: (csv: string, policy: 'reject' | 'skip' | 'replace', commit: boolean) => request<{
    incoming: PaketindexObservation[]; added: number; skipped: number; replaced: number; totalAfter: number; committed: boolean;
  }>('/api/paketindex/archive/import', { method: 'POST', body: JSON.stringify({ csv, policy, commit }) }),
  firebaseFeatures: () => request<FirebaseFeatureStatus>('/api/firebase-features'),
  analyticsReport: (days: number) => request<{ enabled: boolean; report?: CmsAnalyticsReport }>(`/api/analytics/report?days=${days}`),
  uploadImage: (payload: { targetType: 'partner' | 'ad' | 'insight'; targetId: string; data: string; alt: string }) =>
    request<{ image: CmsImage }>('/api/media/image', { method: 'POST', body: JSON.stringify(payload) }),
  detachImage: (targetType: 'partner' | 'ad' | 'insight', targetId: string) =>
    request<{ detached: boolean }>('/api/media/image', { method: 'DELETE', body: JSON.stringify({ targetType, targetId }) }),
  upsertMapPoint: (point: MapPoint) => request<MapPoint>(`/api/map-points/${point.id}`, { method: 'PUT', body: JSON.stringify(point) }),
  deleteMapPoint: (id: string) => request<{ deleted: boolean }>(`/api/map-points/${id}`, { method: 'DELETE' }),
  getStore: () => request<CMSStore>('/api/cms/store'),
  getCmsStatus: () =>
    request<{
      persistence: 'firestore' | 'local';
      hasExplicitAdminCredentials: boolean;
      hasGeminiKey: boolean;
    }>('/api/cms/status'),
  importStore: (store: CMSStore) =>
    request<CMSStore>('/api/cms/import', {
      method: 'POST',
      body: JSON.stringify(store),
    }),
  resetStore: () =>
    request<CMSStore>('/api/cms/reset', {
      method: 'POST',
    }),

  upsertMerchant: (merchant: Partial<Merchant> & { name: string }) =>
    request<{ merchant: Merchant; created: boolean }>(
      merchant.id ? `/api/merchants/${merchant.id}` : '/api/merchants',
      {
        method: merchant.id ? 'PUT' : 'POST',
        body: JSON.stringify(merchant),
      }
    ),
  batchAddMerchants: (items: Array<Partial<Merchant> & { name: string }>) =>
    request<{ added: Merchant[]; skipped: string[] }>('/api/merchants/batch', {
      method: 'POST',
      body: JSON.stringify({ items }),
    }),
  deleteMerchant: (id: string) =>
    request<{ deleted: boolean }>(`/api/merchants/${id}`, { method: 'DELETE' }),

  upsertPartner: (partner: Partial<TechPartner> & { name: string }) =>
    request<{ partner: TechPartner; created: boolean }>(
      partner.id ? `/api/partners/${partner.id}` : '/api/partners',
      {
        method: partner.id ? 'PUT' : 'POST',
        body: JSON.stringify(partner),
      }
    ),
  batchAddPartners: (items: Array<Partial<TechPartner> & { name: string }>) =>
    request<{ added: TechPartner[]; skipped: string[] }>('/api/partners/batch', {
      method: 'POST',
      body: JSON.stringify({ items }),
    }),
  deletePartner: (id: string) =>
    request<{ deleted: boolean }>(`/api/partners/${id}`, { method: 'DELETE' }),

  upsertLogisticsProvider: (provider: Partial<LogisticsProvider> & { name: string }) =>
    request<{ provider: LogisticsProvider; created: boolean }>(
      provider.id ? `/api/logistics/${provider.id}` : '/api/logistics',
      {
        method: provider.id ? 'PUT' : 'POST',
        body: JSON.stringify(provider),
      }
    ),
  deleteLogisticsProvider: (id: string) =>
    request<{ deleted: boolean }>(`/api/logistics/${id}`, { method: 'DELETE' }),

  upsertEvent: (event: Partial<EcommerceEvent> & { name: string }) =>
    request<EcommerceEvent>(event.id ? `/api/events/${event.id}` : '/api/events', {
      method: event.id ? 'PUT' : 'POST',
      body: JSON.stringify(event),
    }),
  deleteEvent: (id: string) =>
    request<{ deleted: boolean }>(`/api/events/${id}`, { method: 'DELETE' }),

  upsertSession: (session: Partial<DCSession> & { title: string }) =>
    request<DCSession>(session.id ? `/api/sessions/${session.id}` : '/api/sessions', {
      method: session.id ? 'PUT' : 'POST',
      body: JSON.stringify(session),
    }),
  deleteSession: (id: string) =>
    request<{ deleted: boolean }>(`/api/sessions/${id}`, { method: 'DELETE' }),

  upsertJob: (job: Partial<EcommerceJob> & { title: string; company: string }) =>
    request<EcommerceJob>(job.id ? `/api/jobs/${job.id}` : '/api/jobs', {
      method: job.id ? 'PUT' : 'POST',
      body: JSON.stringify(job),
    }),
  batchAddJobs: (items: Array<Partial<EcommerceJob> & { title: string; company: string }>) =>
    request<{ added: EcommerceJob[]; skipped: string[] }>('/api/jobs/batch', {
      method: 'POST',
      body: JSON.stringify({ items }),
    }),
  validateJobs: () =>
    request<{
      totalChecked: number;
      activeCount: number;
      closedCount: number;
      newlyClosedTitles: string[];
    }>('/api/jobs/validate', { method: 'POST' }),
  deleteJob: (id: string) =>
    request<{ deleted: boolean }>(`/api/jobs/${id}`, { method: 'DELETE' }),

  upsertRecruiter: (recruiter: Partial<RecruitmentSite> & { name: string }) =>
    request<RecruitmentSite>(recruiter.id ? `/api/recruiters/${recruiter.id}` : '/api/recruiters', {
      method: recruiter.id ? 'PUT' : 'POST',
      body: JSON.stringify(recruiter),
    }),
  batchAddRecruiters: (items: Array<Partial<RecruitmentSite> & { name: string }>) =>
    request<{ added: RecruitmentSite[]; skipped: string[] }>('/api/recruiters/batch', {
      method: 'POST',
      body: JSON.stringify({ items }),
    }),
  deleteRecruiter: (id: string) =>
    request<{ deleted: boolean }>(`/api/recruiters/${id}`, { method: 'DELETE' }),

  updateRegion: (key: string, patch: Partial<RegionMetric>) =>
    request<RegionMetric>(`/api/regions/${key}`, {
      method: 'PUT',
      body: JSON.stringify(patch),
    }),

  updateOrderBenchmark: (id: string, patch: Partial<CategoryOrderBenchmark>) =>
    request<CategoryOrderBenchmark>(`/api/benchmarks/orders/${id}`, {
      method: 'PUT',
      body: JSON.stringify(patch),
    }),

  updateShippingTier: (id: string, patch: Partial<ShippingCostTier>) =>
    request<ShippingCostTier>(`/api/benchmarks/shipping/${id}`, {
      method: 'PUT',
      body: JSON.stringify(patch),
    }),

  updateDeliveryStats: (patch: Partial<DeliveryStatsData>) =>
    request<DeliveryStatsData>('/api/benchmarks/delivery', {
      method: 'PUT',
      body: JSON.stringify(patch),
    }),

  updatePaketindex: (patch: Partial<PaketindexData>) =>
    request<PaketindexData>('/api/paketindex', {
      method: 'PUT',
      body: JSON.stringify(patch),
    }),

  updateIntelligenceSource: (id: string, patch: Partial<MarketIntelligenceSource>) =>
    request<MarketIntelligenceSource>(`/api/intelligence/${id}`, {
      method: 'PUT',
      body: JSON.stringify(patch),
    }),

  updateTechStackShare: (id: string, patch: Partial<TechStackShare>) =>
    request<TechStackShare>(`/api/techstack/${id}`, {
      method: 'PUT',
      body: JSON.stringify(patch),
    }),

  upsertTimelineMilestone: (milestone: Partial<TimelineMilestone> & { title: string }) =>
    request<TimelineMilestone>(milestone.id ? `/api/timeline/${milestone.id}` : '/api/timeline', {
      method: milestone.id ? 'PUT' : 'POST',
      body: JSON.stringify(milestone),
    }),
  deleteTimelineMilestone: (id: string) =>
    request<{ deleted: boolean }>(`/api/timeline/${id}`, { method: 'DELETE' }),

  updatePageContent: (patch: Partial<PageContentMap>) =>
    request<PageContentMap>('/api/pages', {
      method: 'PUT',
      body: JSON.stringify(patch),
    }),

  upsertLaw: (law: Partial<EcommerceLaw> & { title: string }) =>
    request<EcommerceLaw>(law.id ? `/api/laws/${law.id}` : '/api/laws', {
      method: law.id ? 'PUT' : 'POST',
      body: JSON.stringify(law),
    }),
  deleteLaw: (id: string) =>
    request<{ deleted: boolean }>(`/api/laws/${id}`, { method: 'DELETE' }),

  upsertAdBanner: (banner: Partial<AdBanner> & { headline: string }) =>
    request<AdBanner>(banner.id ? `/api/ads/${banner.id}` : '/api/ads', {
      method: banner.id ? 'PUT' : 'POST',
      body: JSON.stringify(banner),
    }),
  deleteAdBanner: (id: string) =>
    request<{ deleted: boolean }>(`/api/ads/${id}`, { method: 'DELETE' }),

  upsertContactForm: (form: Partial<ContactFormConfig> & { name: string }) =>
    request<ContactFormConfig>(form.id ? `/api/forms/${form.id}` : '/api/forms', {
      method: form.id ? 'PUT' : 'POST',
      body: JSON.stringify(form),
    }),
  deleteContactForm: (id: string) =>
    request<{ deleted: boolean }>(`/api/forms/${id}`, { method: 'DELETE' }),

  submitContactMessage: (payload: {
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
  }) =>
    request<ContactMessage>('/api/contact', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateContactMessageStatus: (
    id: string,
    status: ContactMessageStatus,
    emailDispatched?: boolean
  ) =>
    request<ContactMessage>(`/api/contact/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status, ...(typeof emailDispatched === 'boolean' ? { emailDispatched } : {}) }),
    }),
  deleteContactMessage: (id: string) =>
    request<{ deleted: boolean }>(`/api/contact/${id}`, { method: 'DELETE' }),

  addThread: (payload: { channel: string; author: string; title: string; body?: string }) =>
    request<CommunityThread>('/api/community/threads', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  addThreadComment: (threadId: string, payload: { author: string; body: string }) =>
    request<CommunityThread>(`/api/community/threads/${threadId}/comments`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  upvoteThread: (id: string) =>
    request<CommunityThread>(`/api/community/threads/${id}/upvote`, {
      method: 'POST',
    }),
  deleteThread: (id: string) =>
    request<{ deleted: boolean }>(`/api/community/threads/${id}`, {
      method: 'DELETE',
    }),
  getMemberDirectory: () =>
    request<{ members: PublicMemberProfile[] }>('/api/community/directory'),
  getDirectMessages: () =>
    request<{ messages: CommunityDirectMessage[]; myMemberIds: string[] }>('/api/community/messages'),
  sendDirectMessage: (payload: {
    recipientMemberId: string;
    subject: string;
    body: string;
    senderName?: string;
  }) =>
    request<CommunityDirectMessage>('/api/community/messages', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  markMessageRead: (id: string) =>
    request<CommunityDirectMessage>(`/api/community/messages/${id}/read`, {
      method: 'PUT',
    }),
  addMember: (payload: {
    name: string;
    email: string;
    memberType?: CommunityMemberType;
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
  }) =>
    request<CommunityMember>('/api/community/members', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateMemberStatus: (id: string, verificationStatus: 'pending' | 'verified' | 'rejected') =>
    request<CommunityMember>(`/api/community/members/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ verificationStatus }),
    }),
  deleteMember: (id: string) =>
    request<{ deleted: boolean }>(`/api/community/members/${id}`, { method: 'DELETE' }),

  discover: <T extends DiscoveryTarget>(payload: {
    target: T;
    query: string;
    category?: string;
    count?: number;
  }) =>
    request<{
      candidates: DiscoveryResult<T>;
      sources: GroundingSource[];
    }>('/api/ai/discover', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  enrich: (payload: { target: 'merchant' | 'partner'; name: string; domain?: string }) =>
    request<{
      data: Record<string, unknown>;
      sources: GroundingSource[];
    }>('/api/ai/enrich', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  upsertNews: (item: Partial<EcommerceNewsItem> & { title: string; confirmArticleLink?: boolean }) =>
    request<{ item: EcommerceNewsItem; created: boolean }>(
      item.id ? `/api/news/${item.id}` : '/api/news',
      {
        method: item.id ? 'PUT' : 'POST',
        body: JSON.stringify(item),
      }
    ),
  batchAddNews: (items: Array<Partial<EcommerceNewsItem> & { title: string }>) =>
    request<{ added: EcommerceNewsItem[]; skipped: string[] }>('/api/news/batch', {
      method: 'POST',
      body: JSON.stringify({ items }),
    }),
  deleteNews: (id: string) =>
    request<{ deleted: boolean }>(`/api/news/${id}`, { method: 'DELETE' }),
  fetchNewsWithAI: (payload: { topic?: string; count?: number; autoSave?: boolean }) =>
    request<{
      candidates: Array<Omit<EcommerceNewsItem, 'id' | 'status'> & { alreadyExists?: boolean }>;
      sources: GroundingSource[];
      saved?: { added: EcommerceNewsItem[]; skipped: string[] };
    }>('/api/ai/news', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
};
