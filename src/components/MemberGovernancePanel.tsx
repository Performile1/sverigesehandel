import { StaffAdminPanel } from './StaffProfiles';
import { useState } from 'react';
import type { CMSStore, CompanyEntityType, CompanyMemberLink } from '../types';
import { api } from '../api';
import { emptyGovernance } from '../../shared/memberGovernance';
const button = 'px-3 py-2 bg-slate-900 text-white rounded-lg disabled:opacity-50 cursor-pointer';
const field = 'block w-full p-2 mt-1 border rounded-lg';
const settingLabels = { enabled:'Community aktivt', postingEnabled:'Nya trådar och röster', commentsEnabled:'Kommentarer', messagesEnabled:'Privata meddelanden och företagsinkorg', registrationEnabled:'Medlemsansökningar', directoryEnabled:'Medlemskatalog', reportsEnabled:'Anmälningar av innehåll' };
export function MemberGovernancePanel({ store, onRefresh }: { store: CMSStore; onRefresh: () => Promise<void> }) {
  const g = store.memberGovernance ?? emptyGovernance();
  const [busy,setBusy] = useState(false); const [error,setError] = useState('');
  const [type,setType] = useState<CompanyEntityType>('partner'); const [linkId,setLinkId] = useState('');
  const companies = type === 'partner' ? store.partners : type === 'logistics' ? store.logisticsProviders : store.merchants;
  const eligible = store.communityMembers.filter((m) => m.authorUid && m.verificationStatus === 'verified');
  async function act(operation: string, input: unknown) {
    setBusy(true); setError(''); try { await api.governance(operation,input); await onRefresh(); }
    catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  const link = g.links.find((l) => l.id === linkId);
  return <div className="space-y-5">
    <h1 className="text-2xl font-bold">Medlemmar, företag & Community</h1>
    <p className="text-sm">Bara Sveriges E-handel godkänner företagskopplingar, publiceringsförslag, borttagningsbegäranden och moderationsbeslut. Blockering gäller konto-UID i applikationen, inte IP eller Firebase-kontoradering. Gamla inlägg döljs separat.</p>
    {error && <p role="alert" className="text-red-700">{error}</p>}
    <StaffAdminPanel store={store} onRefresh={onRefresh}/>
    <form key={JSON.stringify(g.settings)} className="bg-white border rounded-xl p-5 space-y-3" onSubmit={(e) => {
      e.preventDefault(); const data = new FormData(e.currentTarget);
      void act('settings', Object.fromEntries(Object.keys(g.settings).map((k) => [k,data.has(k)])));
    }}><h2 className="font-bold text-lg">Communityinställningar</h2>
      {Object.entries(settingLabels).map(([key,label]) => <label key={key} className="flex gap-2"><input type="checkbox" name={key} defaultChecked={g.settings[key as keyof typeof g.settings]} />{label}</label>)}
      <button className={button} disabled={busy}>Spara communityinställningar</button>
    </form>
    <section className="bg-white border rounded-xl p-5 space-y-3"><h2 className="font-bold text-lg">Medlemsregister och blockering</h2>
      <p className="text-sm">Godkänn medlemskap nedan. Företagskoppling kräver en godkänd medlem som loggat in och fått sitt Firebase-UID kopplat. Ingen automatisk behörighet via e-postdomän.</p>
      {store.communityMembers.map((m) => <div key={m.id} className="border p-3 rounded-lg text-sm space-y-2"><strong>{m.name} · {m.company} · {m.email}</strong><p>UID: {m.authorUid || 'Saknar inloggningskoppling'} · {m.verificationStatus || 'pending'}</p>
        <div className="flex flex-wrap gap-2">{(['verified','rejected','pending'] as const).map((s) => <button type="button" className={button} disabled={busy} key={s} onClick={async () => { setBusy(true); setError(''); try { await api.updateMemberStatus(m.id,s); await onRefresh(); } catch(e) { setError((e as Error).message); } finally { setBusy(false); } }}>{({verified:'Godkänn medlem',rejected:'Avslå medlem',pending:'Åter till väntande'})[s]}</button>)}
        {m.authorUid && <button type="button" className={button} disabled={busy} onClick={() => {
          const reason = window.prompt('Motivering för blockering/avblockering (loggas)?'); if (!reason?.trim()) return;
          void act('block',{ uid:m.authorUid, reason, blocked:!g.blocks.some((b) => b.uid === m.authorUid) });
        }}>{g.blocks.some((b) => b.uid === m.authorUid) ? 'Avblockera konto' : 'Blockera konto'}</button>}</div>
      </div>)}
    </section>
    <section className="bg-white border rounded-xl p-5 space-y-3"><h2 className="font-bold text-lg">Koppla medlem till företag</h2>
      <p className="text-sm">Separata kryss för ändringsförslag och mottagning. Historisk åtkomst är ett uttryckligt beslut och ger tillgång till tidigare direktstyrda förfrågningar till företaget.</p>
      <select aria-label="Välj företagskoppling" className={field} value={linkId} onChange={(e) => { setLinkId(e.target.value); const found=g.links.find((l)=>l.id===e.target.value); if(found) setType(found.entityType); }}><option value="">Ny företagskoppling</option>{g.links.map((l) => <option value={l.id} key={l.id}>{l.uid} · {l.entityType}/{l.entityId} · {l.status}</option>)}</select>
      {link && link.status === 'active' && <button className={button} disabled={busy} type="button" onClick={() => { if(window.confirm('Återkalla denna företagskoppling direkt?')) void act('revoke-link',{id:link.id}); }}>Återkalla vald företagskoppling</button>}
      <LinkForm key={link ? JSON.stringify(link) : type} link={link} type={type} setType={setType} companies={companies} members={eligible} busy={busy} save={(input) => act('link',input)} />
    </section>
    <section className="bg-white border rounded-xl p-5 space-y-3"><h2 className="font-bold text-lg">Ändringsförslag och borttagningsbegäranden</h2>
      {!g.proposals.length && <p>Inga förslag.</p>}
      {g.proposals.map((p) => <article key={p.id} className="border rounded-lg p-3 space-y-2 text-sm"><h3 className="font-bold">{p.kind === 'delete' ? 'Begär borttagning' : 'Ändringsförslag'} · {p.entityType}/{p.entityId}</h3><p>{p.uid} · {p.status} · {p.createdAt}</p><p>{p.reason}</p>
        {Object.keys(p.patch).map((k) => <div key={k} className="bg-slate-50 p-2"><strong>{k}</strong><p className="whitespace-pre-wrap">Nu vid förslag: {p.base[k]}</p><p className="whitespace-pre-wrap">Föreslaget: {p.patch[k]}</p></div>)}
        {p.kind === 'delete' && <p>Godkännande avpublicerar posten men raderar inte företag, historik eller meddelanden fysiskt.</p>}
        {p.status === 'pending' && <div className="flex gap-2">{(['approved','rejected'] as const).map((decision) => <button className={button} disabled={busy} type="button" key={decision} onClick={() => {
          const comment=window.prompt('Beslutskommentar till företagsredaktören?'); if(!comment?.trim()) return; void act('decide',{id:p.id,decision,comment});
        }}>{decision==='approved' ? 'Godkänn' : 'Avslå'}</button>)}</div>}{p.comment && <p>Beslut: {p.comment}</p>}
      </article>)}
    </section>
    <section className="bg-white border rounded-xl p-5 space-y-3"><h2 className="font-bold text-lg">Anmälningar av innehåll</h2>
      {!g.reports.length && <p>Inga anmälningar.</p>}
      {g.reports.map((r) => {
        const thread=store.communityThreads.find((t)=>t.id===r.threadId); const comment=thread?.comments?.find((c)=>c.id===r.commentId); const authorUid=comment?.authorUid || (!r.commentId ? thread?.authorUid : undefined);
        return <article key={r.id} className="border rounded-lg p-3 space-y-2 text-sm"><strong>{r.reason} · {r.status}</strong><p>Anmält av {r.uid} · {r.detail}</p><p>Tråd: {thread?.title || r.threadId}</p><p className="whitespace-pre-wrap">{r.commentId ? comment?.body || 'Kommentaren borttagen' : thread?.body}</p>
          <div className="flex flex-wrap gap-2">{[true,false].map((hidden) => <button key={String(hidden)} className={button} disabled={busy} type="button" onClick={() => { const reason=window.prompt('Moderationsmotivering?'); if(reason?.trim()) void act('moderate',{ threadId:r.threadId,commentId:r.commentId,reportId:r.id,hidden,reason }); }}>{hidden?'Dölj innehållet':'Återställ innehållet'}</button>)}
          <button className={button} disabled={busy} type="button" onClick={() => { const reason=window.prompt('Motivering till avslutad anmälan?'); if(reason?.trim()) void act('resolve-report',{id:r.id,reason}); }}>Avsluta utan innehållsändring</button>
          {authorUid && <button className={button} disabled={busy} type="button" onClick={() => { const reason=window.prompt('Motivering för kontoblockering?'); if(reason?.trim()) void act('block',{uid:authorUid,reason,blocked:true}); }}>Blockera författaren</button>}</div>
          {r.resolution && <p>Beslut: {r.resolution}</p>}
        </article>;
      })}
      {g.blocks.map((b) => <div className="border p-3 rounded-lg text-sm" key={b.uid}>Blockerat konto: {b.uid} · {b.reason} <button className={button} disabled={busy} onClick={() => { const reason=window.prompt('Motivering till avblockering?'); if(reason?.trim()) void act('block',{uid:b.uid,reason,blocked:false}); }}>Avblockera</button></div>)}
    </section>
    <section className="bg-white border rounded-xl p-5"><h2 className="font-bold text-lg">Beslutslogg (senaste 500)</h2><ul className="text-xs space-y-2 max-h-72 overflow-auto">{g.audit.map((a)=><li key={a.id}>{a.createdAt} · {a.actorUid} · {a.action} · {a.target} · {a.detail}</li>)}</ul></section>
  </div>;
}
function LinkForm({link,type,setType,companies,members,busy,save}:{link?:CompanyMemberLink;type:CompanyEntityType;setType:(v:CompanyEntityType)=>void;companies:Array<{id:string;name:string}>;members:CMSStore['communityMembers'];busy:boolean;save:(input:unknown)=>Promise<void>}) {
  return <form className="space-y-3 text-sm" onSubmit={(e)=>{ e.preventDefault();const f=new FormData(e.currentTarget);void save({memberId:String(f.get('memberId')),entityType:type,entityId:String(f.get('entityId')),status:String(f.get('status')),canPropose:f.has('canPropose'),receiveIntros:f.has('receiveIntros'),receiveMessages:f.has('receiveMessages'),includeHistory:f.has('includeHistory')}); }}>
    <label>Medlem<select name="memberId" className={field} required defaultValue={members.find((m)=>m.authorUid===link?.uid)?.id || ''}><option value="">Välj godkänd medlem</option>{members.filter((m)=>!link || m.authorUid===link.uid).map((m)=><option key={m.id} value={m.id}>{m.name} · {m.email}</option>)}</select></label>
    <label>Företagstyp<select className={field} value={type} disabled={Boolean(link)} onChange={(e)=>setType(e.target.value as CompanyEntityType)}><option value="partner">Partner / transportör / systemleverantör</option><option value="logistics">3PL / logistik</option><option value="merchant">E-handlare</option></select></label>
    <label>Företag<select className={field} name="entityId" defaultValue={link?.entityId || ''} required><option value="">Välj företag</option>{companies.filter((c)=>!link || c.id===link.entityId).map((c)=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
    <label>Status<select className={field} name="status" defaultValue={link?.status || 'active'}><option value="active">Aktiv</option><option value="revoked">Återkallad</option></select></label>
    {(['canPropose','receiveIntros','receiveMessages','includeHistory'] as const).map((key)=><label key={key} className="flex gap-2"><input type="checkbox" name={key} defaultChecked={link?.[key] || false} />{({canPropose:'Får skicka ändringsförslag / begära borttagning',receiveIntros:'Får ta emot direktstyrda intro',receiveMessages:'Får ta emot direktstyrda kontaktmeddelanden',includeHistory:'Tillåt även historiska direktstyrda meddelanden'})[key]}</label>)}
    <button className={button} disabled={busy}>Spara företagskoppling</button>
  </form>;
}
