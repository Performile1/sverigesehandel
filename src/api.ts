import type {
  AdBanner,
  CategoryOrderBenchmark,
  CMSStore,
  CommunityMember,
  CommunityThread,
  ContactMessage,
  DCSession,
  DeliveryStatsData,
  DiscoveredJobCandidate,
  DiscoveredMerchantCandidate,
  DiscoveredPartnerCandidate,
  DiscoveredRecruiterCandidate,
  EcommerceEvent,
  EcommerceJob,
  EcommerceLaw,
  GroundingSource,
  Merchant,
  RecruitmentSite,
  RegionMetric,
  ShippingCostTier,
  TechPartner,
} from './types';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
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
  getStore: () => request<CMSStore>('/api/cms/store'),
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

  submitContactMessage: (payload: {
    name: string;
    email: string;
    company?: string;
    topic: string;
    adSlot?: string;
    message: string;
  }) =>
    request<ContactMessage>('/api/contact', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  deleteContactMessage: (id: string) =>
    request<{ deleted: boolean }>(`/api/contact/${id}`, { method: 'DELETE' }),

  addThread: (payload: { channel: string; author: string; title: string }) =>
    request<CommunityThread>('/api/community/threads', {
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
  addMember: (payload: { name: string; email: string; role: string; city: string }) =>
    request<CommunityMember>('/api/community/members', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

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
};
