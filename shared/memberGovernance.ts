import type { MemberGovernance, CompanyEntityType, CommunityThread } from '../src/types.ts';
export const DEFAULT_COMMUNITY_SETTINGS = {
  enabled: true, postingEnabled: true, commentsEnabled: true, messagesEnabled: true,
  registrationEnabled: true, directoryEnabled: true, reportsEnabled: true,
};
export function emptyGovernance(): MemberGovernance {
  return { settings: { ...DEFAULT_COMMUNITY_SETTINGS }, links: [], proposals: [], reports: [], blocks: [], hidden: [], audit: [], inboxReads: [] };
}
export const COMPANY_FIELDS: Record<CompanyEntityType, string[]> = {
  partner: ['name', 'domain', 'origin', 'stack', 'desc', 'pricingModel', 'setupTime', 'bestFor'],
  logistics: ['name', 'domain', 'hqCity', 'warehouseSqm', 'automation', 'wmsPlatform', 'minOrderVolume', 'cutoffTime', 'pricingModel', 'desc'],
  merchant: ['name', 'domain', 'city', 'platform', 'paymentProvider', 'carrier', 'desc'],
};
export function isCompanyType(value: unknown): value is CompanyEntityType {
  return typeof value === 'string' && Object.hasOwn(COMPANY_FIELDS, value);
}
export function isBlocked(state: MemberGovernance | undefined, uid: string | undefined): boolean {
  return Boolean(uid && state?.blocks.some((block) => block.uid === uid));
}
export function validGovernance(value: unknown): value is MemberGovernance {
  if (!value || typeof value !== 'object') return false;
  const g = value as MemberGovernance;
  const text = (v: unknown, max = 200) => typeof v === 'string' && v.length <= max;
  return Boolean(g.settings && Object.keys(DEFAULT_COMMUNITY_SETTINGS).every((key) => typeof g.settings[key as keyof typeof g.settings] === 'boolean')) &&
    Array.isArray(g.links) && g.links.length <= 300 && g.links.every((l) => l && (l.verificationClaimId===undefined||text(l.verificationClaimId,80))&&(l.verifiedEmail===undefined||text(l.verifiedEmail,160))&&text(l.id) && text(l.uid, 128) && Boolean(l.uid) && isCompanyType(l.entityType) && text(l.entityId) && ['active','revoked'].includes(l.status) && typeof l.canPropose === 'boolean' && typeof l.receiveIntros === 'boolean' && typeof l.receiveMessages === 'boolean' && typeof l.includeHistory === 'boolean' && text(l.createdAt) && text(l.updatedAt)) &&
    new Set(g.links.map((l) => l.id)).size === g.links.length && new Set(g.links.map((l) => [l.uid,l.entityType,l.entityId].join('|'))).size === g.links.length &&
    Array.isArray(g.proposals) && g.proposals.length <= 300 && g.proposals.every((p) => p && text(p.id) && text(p.uid,128) && isCompanyType(p.entityType) && text(p.entityId) && ['edit','delete'].includes(p.kind) && ['pending','approved','rejected'].includes(p.status) && text(p.reason,2000) && p.patch && p.base && Object.keys(p.patch).every((key) => COMPANY_FIELDS[p.entityType].includes(key) && text(p.patch[key],2000) && text(p.base[key],2000)) && text(p.createdAt) && text(p.comment,2000)) &&
    Array.isArray(g.reports) && g.reports.length <= 300 && g.reports.every((r) => r && text(r.id) && text(r.uid,128) && text(r.threadId) && text(r.commentId) && ['offensive','incorrect','spam','other'].includes(r.reason) && text(r.detail,1500) && ['open','resolved'].includes(r.status) && text(r.createdAt) && text(r.resolution,1500)) &&
    Array.isArray(g.blocks) && g.blocks.length <= 300 && g.blocks.every((b) => b && text(b.uid,128) && Boolean(b.uid) && text(b.reason,1000) && text(b.createdAt)) &&
    Array.isArray(g.hidden) && g.hidden.length <= 500 && g.hidden.every((h) => h && text(h.threadId) && text(h.commentId)) &&
    Array.isArray(g.audit) && g.audit.length <= 500 && g.audit.every((a) => a && text(a.id) && text(a.actorUid,128) && text(a.action) && text(a.target) && text(a.createdAt) && text(a.detail ?? '',2000)) &&
    Array.isArray(g.inboxReads) && g.inboxReads.length <= 500 && g.inboxReads.every((r) => r && text(r.uid,128) && text(r.messageId));
}

export function visibleCommunityThreads(threads: CommunityThread[], state?: MemberGovernance): CommunityThread[] {
  if (state && !state.settings.enabled) return [];
  const hidden = state?.hidden || [];
  return threads.filter((t) => !hidden.some((h) => h.threadId === t.id && !h.commentId)).map((t) => ({
    ...t, comments: (t.comments || []).filter((c) => !hidden.some((h) => h.threadId === t.id && h.commentId === c.id)),
    replies: (t.comments || []).filter((c) => !hidden.some((h) => h.threadId === t.id && h.commentId === c.id)).length,
  }));
}
