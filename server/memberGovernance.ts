import { randomUUID } from 'node:crypto';
import type { CMSStore, CompanyEntityType, CompanyWorkspace, MemberGovernance, CompanyProposal, CompanyMemberLink } from '../src/types.ts';
import type { CmsIdentity } from './authPolicy.ts';
import { COMPANY_FIELDS, emptyGovernance, isBlocked, isCompanyType, validGovernance } from '../shared/memberGovernance.ts';

function fail(message: string, status = 400): never { throw Object.assign(new Error(message), { status }); }
const text = (value: unknown, max: number, required = false) => {
  if (typeof value !== 'string' || value.length > max || (required && !value.trim())) return fail('Ogiltig eller för lång text.');
  return value.trim();
};
function entity(store: CMSStore, type: CompanyEntityType, id: string) {
  return (type === 'partner' ? store.partners : type === 'logistics' ? store.logisticsProviders : store.merchants).find((e) => e.id === id);
}
function fields(item: object, type: CompanyEntityType): Record<string, string> {
  return Object.fromEntries(COMPANY_FIELDS[type].map((key) => [key, String((item as Record<string, unknown>)[key] ?? '')]));
}
function linkFor(store: CMSStore, uid: string, type: CompanyEntityType, id: string) {
  if (!store.communityMembers.some((m) => m.authorUid === uid && m.verificationStatus === 'verified')) return undefined;
  return store.memberGovernance?.links.find((l) => l.uid === uid && l.entityType === type && l.entityId === id && l.status === 'active');
}
function audit(g: MemberGovernance, actor: CmsIdentity, action: string, target: string, detail = '') {
  g.audit.unshift({ id: randomUUID(), actorUid: actor.uid, action, target, detail, createdAt: new Date().toISOString() });
  g.audit = g.audit.slice(0, 500);
}
export function assertCommunityAction(store: CMSStore, uid: string | undefined, action?: keyof MemberGovernance['settings']) {
  if (isBlocked(store.memberGovernance, uid)) fail('Ditt konto är blockerat i Sveriges E-handel. Kontakta redaktionen.', 403);
  const settings = store.memberGovernance?.settings ?? emptyGovernance().settings;
  if (!settings.enabled || (action && !settings[action])) fail('Denna communityfunktion är pausad av Sveriges E-handel.', 403);
}
export function companyInboxAvailable(store: CMSStore, type: string | undefined, id: string, intro: boolean): boolean {
  const g = store.memberGovernance;
  return Boolean(g && g.settings.enabled && g.settings.messagesEnabled && g.links.some((link) => link.status === 'active' &&
    link.entityType === type && link.entityId === id && (intro ? link.receiveIntros : link.receiveMessages) &&
    !isBlocked(g,link.uid) && store.communityMembers.some((m) => m.authorUid === link.uid && m.verificationStatus === 'verified')));
}
export function companyWorkspace(store: CMSStore, actor: CmsIdentity): CompanyWorkspace {
  if (!actor.verified || isBlocked(store.memberGovernance, actor.uid)) fail('Åtkomst nekad.', 403);
  const g = store.memberGovernance ?? emptyGovernance();
  const links = g.links.filter((l) => l.uid === actor.uid && l.status === 'active' && linkFor(store,actor.uid,l.entityType,l.entityId));
  const companies = links.flatMap((link) => {
    const item = entity(store, link.entityType, link.entityId);
    return item ? [{ link, name: item.name, fields: fields(item, link.entityType) }] : [];
  });
  const proposals = g.proposals.filter((p) => p.uid === actor.uid && links.some((l) => l.entityType === p.entityType && l.entityId === p.entityId));
  const messages = store.contactMessages.flatMap((m) => {
    if (!g.settings.enabled || !g.settings.messagesEnabled || m.routingMode !== 'direct-partner' ||
      !['partner','logistics'].includes(m.targetEntityType || '')) return [];
    const link = links.find((l) => l.entityType === m.targetEntityType && l.entityId === m.targetEntityId &&
      (m.submissionType === 'intro' ? l.receiveIntros : l.receiveMessages) && (l.includeHistory || m.createdAt >= l.createdAt));
    if (!link) return [];
    return [{ id: m.id, name: m.name, email: m.email, company: m.company, topic: m.topic, message: m.message,
      createdAt: m.createdAt, entityName: m.targetEntityName || '', kind: m.submissionType || 'contact',
      read: g.inboxReads.some((r) => r.uid === actor.uid && r.messageId === m.id) }];
  });
  return { companies, proposals, messages };
}

export function runGovernance(store: CMSStore, actor: CmsIdentity, operation: string, input: any): unknown {
  if (!actor.verified || isBlocked(store.memberGovernance, actor.uid)) fail('Åtkomst nekad.', 403);
  if (!['proposal', 'report', 'inbox-read'].includes(operation) && !actor.admin) fail('Endast Sveriges E-handels administratör får göra detta.', 403);
  if (!input || typeof input !== 'object' || Array.isArray(input)) fail('Ett giltigt ärendeobjekt krävs.');
  const g = structuredClone(store.memberGovernance ?? emptyGovernance());
  store.memberGovernance = g;
  const now = new Date().toISOString();
  if (operation === 'link') {
    const memberId = text(input.memberId, 200, true);
    const member = store.communityMembers.find((m) => m.id === memberId && m.authorUid && m.verificationStatus === 'verified');
    if (!member?.authorUid || isBlocked(g, member.authorUid)) fail('Välj en godkänd medlem med verifierad inloggningskoppling.');
    if (!isCompanyType(input.entityType)) fail('Ogiltig företagstyp.');
    const type = input.entityType as CompanyEntityType; const id = text(input.entityId, 200, true);
    if (!entity(store, type, id)) fail('Företaget hittades inte.', 404);
    const uid = member.authorUid;
    const previous = g.links.find((l) => l.uid === uid && l.entityType === type && l.entityId === id);
    const status = input.status === 'revoked' ? 'revoked' : input.status === 'active' ? 'active' : fail('Ogiltig status.');
    const bools = ['canPropose','receiveIntros','receiveMessages','includeHistory'] as const;
    if (!bools.every((k) => typeof input[k] === 'boolean')) fail('Ange behörighetsinställningar.');
    const link: CompanyMemberLink = { id: previous?.id || randomUUID(), uid, entityType: type, entityId: id, status,
      canPropose: input.canPropose, receiveIntros: input.receiveIntros, receiveMessages: input.receiveMessages, includeHistory: input.includeHistory,
      createdAt: previous?.status === 'active' && bools.every((key) => previous[key] === input[key]) ? previous.createdAt : now, updatedAt: now };
    g.links = g.links.filter((l) => l.id !== link.id); g.links.push(link); audit(g, actor, 'company-link-' + status, link.id);
  } else if (operation === 'revoke-link') {
    const link = g.links.find((l) => l.id === input.id);
    if (!link) fail('Kopplingen hittades inte.',404);
    link.status = 'revoked'; link.updatedAt = now; audit(g,actor,'company-link-revoked',link.id);
  } else if (operation === 'proposal') {
    if (!isCompanyType(input.entityType)) fail('Ogiltig företagstyp.');
    const type = input.entityType as CompanyEntityType; const id = text(input.entityId, 200, true);
    if (!linkFor(store, actor.uid, type, id)?.canPropose) fail('Ingen aktiv redaktörskoppling till denna post.', 403);
    const current = entity(store, type, id); if (!current) fail('Posten hittades inte.', 404);
    if (!['edit','delete'].includes(input.kind)) fail('Ogiltig förslagstyp.');
    const kind = input.kind as 'edit' | 'delete'; const reason = text(input.reason, 2000, true);
    const patch: Record<string,string> = {}; const base: Record<string,string> = {};
    if (kind === 'edit') {
      if (!input.patch || typeof input.patch !== 'object' || Array.isArray(input.patch)) fail('Ändringsfält krävs.');
      for (const key of Object.keys(input.patch)) {
        if (!COMPANY_FIELDS[type].includes(key)) fail('Detta fält får inte föreslås av företagsredaktörer.', 403);
        const value = text(input.patch[key], key === 'desc' ? 2000 : 500, key === 'name');
        const old = fields(current, type)[key];
        if (value !== old) { patch[key] = value; base[key] = old; }
      }
      if (!Object.keys(patch).length) fail('Inga ändrade fält.');
    }
    if (g.proposals.some((p) => p.uid === actor.uid && p.status === 'pending' && p.entityType === type && p.entityId === id && p.kind === kind &&
      p.reason === reason && Object.keys(p.patch).length === Object.keys(patch).length && Object.keys(patch).every((key)=>p.patch[key]===patch[key]))) {
      fail('Ett likadant förslag väntar redan på granskning. Uppdatera företagsytan innan ett nytt skickas.',409);
    }
    if (g.proposals.filter((p) => p.uid === actor.uid && p.status === 'pending').length >= 10) fail('Högst tio väntande förslag per användare.');
    const proposal: CompanyProposal = { id: randomUUID(), uid: actor.uid, entityType: type, entityId: id, kind, patch, base, reason,
      status: 'pending', createdAt: now, comment: '' };
    g.proposals.unshift(proposal); audit(g, actor, 'proposal-submitted', proposal.id);
  } else if (operation === 'decide') {
    const p = g.proposals.find((p) => p.id === input.id && p.status === 'pending');
    if (!p) fail('Väntande förslag hittades inte.', 404);
    const comment = text(input.comment, 2000, true);
    if (!['approved','rejected'].includes(input.decision)) fail('Ogiltigt beslut.');
    if (input.decision === 'approved') {
      if (!linkFor(store, p.uid, p.entityType, p.entityId)?.canPropose || isBlocked(g, p.uid)) fail('Förslagsställarens behörighet har återkallats. Avslå förslaget.');
      const item = entity(store, p.entityType, p.entityId); if (!item) fail('Företaget finns inte längre.', 404);
      if (p.kind === 'edit') {
        const current = fields(item, p.entityType);
        if (Object.keys(p.patch).some((key) => current[key] !== p.base[key])) fail('Företaget har ändrats sedan förslaget. Avslå och be om ett nytt förslag.', 409);
        Object.assign(item, p.patch, { updatedAt: now });
      } else {
        // Approval records the decision; hard deletion remains the existing admin-only operation.
        // Hide the listing without deleting history, links or private messages.
        item.status = 'draft';
      }
    }
    p.status = input.decision; p.comment = comment; audit(g, actor, 'proposal-' + p.status, p.id, comment);
  } else if (operation === 'member-status') {
    const member = store.communityMembers.find((m) => m.id === input.id);
    if (!member) fail('Medlemmen hittades inte.',404);
    if (!['pending','verified','rejected'].includes(input.status)) fail('Ogiltig medlemsstatus.');
    member.verificationStatus = input.status;
    member.verifiedAt = input.status === 'verified' ? now : undefined;
    audit(g,actor,'member-status-' + input.status,member.id);
  } else if (operation === 'member-delete') {
    if (!store.communityMembers.some((m)=>m.id===input.id)) fail('Medlemmen hittades inte.',404);
    store.communityMembers = store.communityMembers.filter((m)=>m.id!==input.id);
    audit(g,actor,'member-deleted',input.id);
  } else if (operation === 'settings') {
    for (const key of Object.keys(g.settings) as Array<keyof typeof g.settings>) {
      if (typeof input[key] !== 'boolean') fail('Alla communityinställningar krävs.'); g.settings[key] = input[key];
    }
    audit(g, actor, 'community-settings', 'community');
  } else if (operation === 'report') {
    assertCommunityAction(store, actor.uid, 'reportsEnabled');
    const threadId = text(input.threadId, 200, true); const commentId = text(input.commentId ?? '', 200);
    const thread = store.communityThreads.find((t) => t.id === threadId);
    if (!thread || (commentId && !thread.comments?.some((c) => c.id === commentId))) fail('Inlägget hittades inte.', 404);
    if (!['offensive','incorrect','spam','other'].includes(input.reason)) fail('Välj anmälningsorsak.');
    const detail = text(input.detail ?? '', 1500);
    if (g.reports.some((r) => r.uid === actor.uid && r.threadId === threadId && r.commentId === commentId && r.status === 'open')) fail('Du har redan en öppen anmälan för innehållet.', 409);
    if (g.reports.filter((r) => r.uid === actor.uid && r.createdAt.slice(0,10) === now.slice(0,10)).length >= 20) fail('Högst 20 anmälningar per dygn.');
    g.reports.unshift({ id: randomUUID(), uid: actor.uid, threadId, commentId, reason: input.reason, detail, status: 'open', createdAt: now, resolution: '' });
    audit(g, actor, 'report-submitted', threadId);
  } else if (operation === 'moderate') {
    const threadId = text(input.threadId, 200, true); const commentId = text(input.commentId ?? '', 200);
    const thread = store.communityThreads.find((t) => t.id === threadId);
    if (!thread || (commentId && !thread.comments?.some((c) => c.id === commentId))) fail('Innehållet hittades inte.', 404);
    const reason = text(input.reason, 1500, true);
    if (typeof input.hidden !== 'boolean') fail('Ange dölj eller återställ.');
    g.hidden = g.hidden.filter((h) => h.threadId !== threadId || h.commentId !== commentId);
    if (input.hidden) g.hidden.push({ threadId, commentId });
    if (input.reportId) {
      const report = g.reports.find((r) => r.id === input.reportId && r.threadId === threadId && r.commentId === commentId);
      if (!report) fail('Anmälan matchar inte innehållet.'); report.status = 'resolved'; report.resolution = reason;
    }
    audit(g, actor, input.hidden ? 'content-hidden' : 'content-restored', `${threadId}/${commentId}`, reason);
  } else if (operation === 'resolve-report') {
    const r = g.reports.find((r) => r.id === input.id); if (!r) fail('Anmälan hittades inte.', 404);
    r.status = 'resolved'; r.resolution = text(input.reason,1500,true); audit(g, actor, 'report-resolved', r.id, r.resolution);
  } else if (operation === 'block') {
    const uid = text(input.uid,128,true); const reason = text(input.reason,1000,true);
    if (uid === actor.uid) fail('Du kan inte blockera ditt eget konto.');
    if (!g.blocks.some((b) => b.uid === uid) && !store.communityMembers.some((m) => m.authorUid === uid) && !store.communityThreads.some((t) => t.authorUid === uid || t.comments?.some((c) => c.authorUid === uid))) fail('Välj en känd användare från medlemsregister eller innehåll.');
    if (typeof input.blocked !== 'boolean') fail('Ange blockering.');
    g.blocks = g.blocks.filter((b) => b.uid !== uid);
    if (input.blocked) g.blocks.push({ uid, reason, createdAt: now });
    audit(g, actor, input.blocked ? 'user-blocked' : 'user-unblocked', uid, reason);
  } else if (operation === 'inbox-read') {
    const workspace = companyWorkspace(store, actor); const id = text(input.id,200,true);
    if (!workspace.messages.some((m) => m.id === id)) fail('Meddelandet är inte tilldelat dig.', 403);
    if (!g.inboxReads.some((r) => r.uid === actor.uid && r.messageId === id)) g.inboxReads.push({ uid: actor.uid, messageId: id });
    g.inboxReads = g.inboxReads.slice(-500);
  } else fail('Okänd operation.');
  if (!validGovernance(g)) fail('Registergränsen är nådd eller data är ogiltig. Arkivera ärenden innan fler skapas.');
  if (Buffer.byteLength(JSON.stringify(store), 'utf8') > 890_000) fail('CMS-lagringen är full. Separata samlingar krävs före fortsatt användning.', 413);
  return { ok: true };
}
