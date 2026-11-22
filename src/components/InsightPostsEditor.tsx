import { PublicationFields } from './PublicationFields';
import { useState } from 'react';
import type { InsightPost } from '../types';
import { api } from '../api';
import { INSIGHT_TABS, validInsightPost } from '../../shared/insightPosts';
import { InsightPosts } from './InsightPosts';

const field = 'block mt-1 w-full p-2 border border-slate-300 rounded-lg';
const button = 'px-4 py-2 rounded-lg bg-slate-900 text-white disabled:opacity-50 cursor-pointer';
const blank: InsightPost = { id: '', title: '', category: '', excerpt: '', body: '', imageKey: '', imageAlt: '',
  ctaLabel: '', targetTab: '', targetUrl: '', sourceUrl: '', author: '', publishedDate: '', theme: 'light', order: 3, status: 'draft' };

export function InsightPostsEditor({ posts, onRefresh }: { posts: InsightPost[]; onRefresh: () => Promise<void> }) {
  const [selectedId, setId] = useState('new');
  const selected = posts.find((post) => post.id === selectedId && !post.trashedAt);
  return <section className="bg-white rounded-2xl border p-5 space-y-4">
    <h2 className="text-xl font-bold">Blogg & Insikter</h2>
    <p className="text-sm text-slate-600">Redigera startsidans kort och skapa nya redaktionella inlägg. Ingress visas i kortet; fulltext öppnas med ”Läs hela artikeln”. Publicering och redigering sker bara här i CMS. Uppgifterna i de tre ursprungliga korten är bevarade, inte nya verifierade faktapåståenden – granska särskilt statistik och eventdatum före återpublicering.</p>
    <label className="block text-sm">Välj inlägg<select className={field} value={selected?.id || 'new'} onChange={(event) => setId(event.target.value)}>
      <option value="new">Nytt inlägg</option>{[...posts].filter(p=>!p.trashedAt).sort((a, b) => a.order - b.order).map((post) => <option key={post.id} value={post.id}>{post.order} · {post.title} · {post.status === 'published' ? 'Publicerad' : 'Utkast'}</option>)}
    </select></label>
    <PostForm key={selected ? JSON.stringify(selected) : 'new'} initial={selected || blank} onSave={async (post) => {
      await api.saveInsightPost(post); await onRefresh(); setId(post.id);
    }} onDelete={selected ? async () => { await api.deleteInsightPost(selected.id,selected.revision??0); await onRefresh(); setId('new'); } : undefined} />
  </section>;
}
function PostForm({ initial, onSave, onDelete }: { initial: InsightPost; onSave: (post: InsightPost) => Promise<void>; onDelete?: () => Promise<void> }) {
  const [draft, setDraft] = useState(initial);
  const [busy, setBusy] = useState(false); const [message, setMessage] = useState('');
  const update = <K extends keyof InsightPost>(key: K, value: InsightPost[K]) => setDraft((prev) => ({ ...prev, [key]: value }));
  return <form className="space-y-3 text-sm" onSubmit={async (event) => {
    event.preventDefault(); const post = { ...draft, id: draft.id || `insight-${crypto.randomUUID()}` };
    if (!validInsightPost(post)) { setMessage('Kontrollera rubrik, längder, bildtext, HTTPS-länk, datum och knappmål.'); return; }
    setBusy(true); setMessage('');
    try { await onSave(post); setMessage('Inlägget sparat.'); }
    catch (cause) { setMessage((cause as Error).message + ' Ladda om före nytt försök om resultatet är osäkert.'); }
    finally { setBusy(false); }
  }}>
    <label className="block">Rubrik<input className={field} maxLength={180} required value={draft.title} onChange={(e) => update('title', e.target.value)} /></label>
    <label className="block">Kategori / etikett<input className={field} maxLength={100} value={draft.category} onChange={(e) => update('category', e.target.value)} /></label>
    <label className="block">Ingress<textarea className={field} rows={3} maxLength={800} value={draft.excerpt} onChange={(e) => update('excerpt', e.target.value)} /></label>
    <label className="block">Fulltext<textarea className={field} rows={10} maxLength={15000} value={draft.body} onChange={(e) => update('body', e.target.value)} /></label>
    <p className="text-xs text-slate-600">Tom rad ger stycke. Börja punktlistor med - eller •. Ren text, ingen HTML eller script.</p>
    <div className="grid sm:grid-cols-2 gap-3">
      <label>Författare<input className={field} maxLength={100} value={draft.author} onChange={(e) => update('author', e.target.value)} /></label>
      <label>Visningsdatum<input className={field} type="date" value={draft.publishedDate} onChange={(e) => update('publishedDate', e.target.value)} /></label>
      <label>Medföljande bild<select className={field} value={draft.imageKey} onChange={(e) => update('imageKey', e.target.value as InsightPost['imageKey'])}>
        <option value="">Ingen medföljande bild</option><option value="checkout">Mobilbetalning</option><option value="logistics">Grön logistik</option><option value="events">Konferens</option>
      </select></label>
      <label>Alt-text för medföljande bild<input className={field} maxLength={200} value={draft.imageAlt} onChange={(e) => update('imageAlt', e.target.value)} /></label>
      <label>Knapptext<input className={field} maxLength={100} value={draft.ctaLabel} onChange={(e) => update('ctaLabel', e.target.value)} /></label>
      <label>Intern länk<select className={field} value={draft.targetTab} onChange={(e) => setDraft((p) => ({ ...p, targetTab: e.target.value as InsightPost['targetTab'], targetUrl: '' }))}><option value="">Ingen intern länk / använd extern URL</option>{INSIGHT_TABS.map((tab) => <option key={tab}>{tab}</option>)}</select></label>
      <label>Extern HTTPS-länk<input className={field} type="url" value={draft.targetUrl} onChange={(e) => setDraft((p) => ({ ...p, targetUrl: e.target.value, targetTab: '' }))} /></label>
      <label>Källa / vidare läsning (HTTPS)<input className={field} type="url" value={draft.sourceUrl} onChange={(e) => update('sourceUrl', e.target.value)} /></label>
      <label>Tema<select className={field} value={draft.theme} onChange={(e) => update('theme', e.target.value as InsightPost['theme'])}><option value="light">Ljust</option><option value="dark">Mörkt</option></select></label>
      <label>Sorteringsordning<input className={field} type="number" min={0} max={1000} step={1} value={draft.order} onChange={(e) => update('order', Number(e.target.value))} /></label>
      <label>Status<select className={field} value={draft.status} onChange={(e) => update('status', e.target.value as InsightPost['status'])}><option value="draft">Utkast</option><option value="published">Publicerad</option></select></label>
    </div>
    <p className="text-xs text-slate-600">Egen bild: spara inlägget först, välj sedan ”Inläggsbild” i CMS → Firebase: Bilder & Statistik. Uppladdning kräver separat aktiverad Firebase Storage. En uppladdad bild prioriteras framför medföljande bild. Bortkoppling görs i samma bildpanel och raderar inte filen fysiskt.</p>
    {draft.image && <p className="text-xs">Inlägget har en uppladdad bild. Alt-text: {draft.image.alt}</p>}
    <PublicationFields value={draft} onChange={v=>setDraft(p=>({...p,...v}))}/>
    <div className="flex gap-3"><button className={button} disabled={busy} type="submit">Spara inlägg</button>
      {onDelete && <button className={button} disabled={busy} type="button" onClick={async () => {
        if (!window.confirm('Flytta inlägget till papperskorgen? Innehåll och bilder bevaras.')) return;
        setBusy(true); setMessage(''); try { await onDelete(); } catch (cause) { setMessage((cause as Error).message); } finally { setBusy(false); }
      }}>Flytta till papperskorg</button>}
    </div>
    {message && <p role="status">{message}</p>}
    <h3 className="font-bold pt-4">Lokal förhandsvisning (osparade ändringar)</h3>
    <InsightPosts posts={[{ ...draft, id: draft.id || 'insight-preview' }]} onNavigate={() => {}} preview />
  </form>;
}
