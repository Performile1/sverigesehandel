import { useEffect, useState } from 'react';
import { api } from '../api';
import type { CMSStore, CmsAnalyticsReport, FirebaseFeatureStatus } from '../types';

const inputClass = 'block w-full mt-1 px-3 py-2 border border-slate-300 rounded-xl';
const buttonClass = 'px-4 py-2 rounded-xl bg-slate-900 text-white disabled:opacity-50 cursor-pointer';

export function CmsFirebasePanel({ store, onRefresh }: { store: CMSStore; onRefresh: () => Promise<void> }) {
  const [status, setStatus] = useState<FirebaseFeatureStatus | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let live = true;
    api.firebaseFeatures().then((value) => { if (live) setStatus(value); })
      .catch(() => { if (live) setError('Kunde inte läsa Firebase-status. Ladda om och försök igen.'); });
    return () => { live = false; };
  }, []);
  return <div className="space-y-6">
    <section className="p-5 rounded-2xl border border-slate-200 bg-white space-y-3">
      <h2 className="text-xl font-bold">Firebase: bilder och statistik</h2>
      <p className="text-sm text-slate-600">Publika loggor, annonsbilder och inläggsbilder i Firebase Storage, aggregerade GA4-rapporter i CMS. Kostnad, konfiguration och integritetsupplägg måste godkännas före aktivering.</p>
      <p className="text-sm">Statistikinsamling från denna app: <strong>avstängd</strong>. Råa IP-adresser och heatmaps: <strong>avstängda</strong>.</p>
      {error && <p role="alert" className="text-red-700">{error}</p>}
      {!status && !error && <p role="status">Läser konfigurationsstatus…</p>}
    </section>
    {status && <>
      <MediaPanel store={store} enabled={status.mediaEnabled} onRefresh={onRefresh} />
      <AnalyticsPanel enabled={status.reportsEnabled} />
    </>}
  </div>;
}

function MediaPanel({ store, enabled, onRefresh }: { store: CMSStore; enabled: boolean; onRefresh: () => Promise<void> }) {
  const [targetType, setTargetType] = useState<'partner' | 'ad' | 'insight'>('partner');
  const [targetId, setTargetId] = useState('');
  const items = targetType === 'partner'
    ? store.partners.map((item) => ({ ...item, label: item.name }))
    : targetType === 'ad' ? store.adBanners.map((item) => ({ ...item, label: item.placementLabel + ' · ' + item.headline }))
    : (store.insightPosts || []).map((item) => ({ ...item, label: item.title + (item.status === 'draft' ? ' · Utkast' : '') }));
  const selected = items.find((item) => item.id === targetId) || items[0];
  return <section className="p-5 rounded-2xl border border-slate-200 bg-white space-y-4">
    <h2 className="text-lg font-bold">Partnerloggor, annonsbilder och inläggsbilder</h2>
    <p className="text-sm">Bildlagring: <strong>{enabled ? 'Aktiverad på servern' : 'Avstängd – ingen uppladdning sker'}</strong></p>
    <p className="text-sm text-slate-600">Endast bilder avsedda för offentlig publicering. PNG/JPEG/WebP upp till 350 kB. Bilder kontrolleras och konverteras till WebP; EXIF/GPS tas bort. Uppladdning innebär att en publik bildlänk skapas, även för ett utkast.</p>
    <label className="block text-sm">Bildtyp<select className={inputClass} value={targetType} onChange={(event) => { setTargetType(event.target.value as 'partner' | 'ad' | 'insight'); setTargetId(''); }}>
      <option value="partner">Partnerlogga</option><option value="ad">Annonsbild</option><option value="insight">Inläggsbild (Blogg & Insikter)</option>
    </select></label>
    <label className="block text-sm">Välj post<select className={inputClass} value={selected?.id || ''} onChange={(event) => setTargetId(event.target.value)}>
      {!items.length && <option value="">Inga poster ännu</option>}
      {items.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
    </select></label>
    {selected && <ImageForm key={`${targetType}-${selected.id}-${selected.image?.path || ''}`} enabled={enabled}
      targetType={targetType} item={selected} onRefresh={onRefresh} />}
  </section>;
}

function ImageForm({ enabled, targetType, item, onRefresh }: {
  enabled: boolean; targetType: 'partner' | 'ad' | 'insight'; item: { id: string; image?: CMSStore['partners'][number]['image'] }; onRefresh: () => Promise<void>;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [alt, setAlt] = useState(item.image?.alt || '');
  const [preview, setPreview] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  useEffect(() => {
    if (!file) { setPreview(''); return; }
    const url = URL.createObjectURL(file); setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  const src = preview || item.image?.url;
  return <form className="space-y-3" onSubmit={async (event) => {
    event.preventDefault(); if (!file || !enabled || busy) return;
    setBusy(true); setMessage('');
    try {
      const data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader(); reader.onload = () => resolve(String(reader.result).split(',')[1]);
        reader.onerror = () => reject(new Error('Filen kunde inte läsas.')); reader.readAsDataURL(file);
      });
      await api.uploadImage({ targetType, targetId: item.id, data, alt });
      await onRefresh(); setFile(null); setMessage('Bilden sparad.');
    } catch (cause) { setMessage((cause as Error).message); }
    finally { setBusy(false); }
  }}>
    {src && <img src={src} alt={alt || 'Bildförhandsvisning'} className="w-full max-w-md h-40 object-contain bg-slate-50 rounded-lg" />}
    <label className="block text-sm">Välj bild<input className={inputClass} type="file" accept="image/png,image/jpeg,image/webp" disabled={!enabled || busy} onChange={(event) => {
      const value = event.target.files?.[0]; setMessage('');
      if (value && (value.size > 350_000 || !['image/png', 'image/jpeg', 'image/webp'].includes(value.type))) {
        setFile(null); event.target.value = ''; setMessage('Välj PNG, JPEG eller WebP, högst 350 kB.'); return;
      }
      setFile(value || null);
    }} /></label>
    <label className="block text-sm">Alternativtext<input className={inputClass} required maxLength={200} value={alt} onChange={(event) => setAlt(event.target.value)} disabled={busy} /></label>
    <div className="flex flex-wrap gap-3">
      <button className={buttonClass} disabled={!enabled || busy || !file || !alt.trim()} type="submit">Ladda upp och koppla bild</button>
      {item.image && <button className={buttonClass} disabled={busy} type="button" onClick={async () => {
        if (!window.confirm('Koppla bort bilden? Filen behålls i Storage för säker återställning.')) return;
        setBusy(true); setMessage('');
        try { await api.detachImage(targetType, item.id); await onRefresh(); setMessage('Bildreferensen borttagen.'); }
        catch (cause) { setMessage((cause as Error).message); }
        finally { setBusy(false); }
      }}>Koppla bort bild</button>}
    </div>
    <p className="text-xs text-slate-600">Byte/bortkoppling tar inte bort gamla filer. Filstädning och återställning kräver separat kontrollerad hantering; CMS-backup innehåller bara bildreferenser.</p>
    {message && <p role="status" className="text-sm">{message}</p>}
  </form>;
}

function AnalyticsPanel({ enabled }: { enabled: boolean }) {
  const [days, setDays] = useState(7);
  const [report, setReport] = useState<CmsAnalyticsReport | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  return <section className="p-5 rounded-2xl border border-slate-200 bg-white space-y-4">
    <h2 className="text-lg font-bold">Besöksstatistik från GA4</h2>
    <p className="text-sm">Rapportåtkomst: <strong>{enabled ? 'Aktiverad' : 'Avstängd – ingen rapport hämtas'}</strong>. Denna vy startar ingen insamling.</p>
    <p className="text-sm text-slate-600">Visar redan insamlade data för godkända publika sidvägar. Aktiv användare är inte ett exakt personantal. Summera inte aktiva användare mellan sidor. Engagemang är sammanlagda registrerade sekunder, inte genomsnittlig lästid.</p>
    <label className="block text-sm">Period<select className={inputClass} value={days} disabled={busy} onChange={(event) => { setDays(Number(event.target.value)); setReport(null); }}>
      {[7, 30, 90].map((value) => <option key={value} value={value}>Senaste {value} avslutade dagarna</option>)}
    </select></label>
    <button type="button" className={buttonClass} disabled={!enabled || busy} onClick={async () => {
      setBusy(true); setError(''); setReport(null);
      try { const result = await api.analyticsReport(days); if (!result.enabled) throw new Error('Rapporter är avstängda.'); setReport(result.report || null); }
      catch (cause) { setError((cause as Error).message); }
      finally { setBusy(false); }
    }}>{busy ? 'Hämtar…' : 'Hämta statistik'}</button>
    {error && <p role="alert" className="text-red-700">{error}</p>}
    {report && <>
      <p className="text-xs">Tidszon: {report.timeZone}. De {report.days} avslutade dagarna till och med igår. Högst 100 sidrader.</p>
      {(report.truncated || report.subjectToThresholding || report.dataLossFromOtherRow) && <p className="text-amber-800 text-sm">Rapporten är begränsad av radantal, tröskelvärden eller aggregering hos Google.</p>}
      {!report.rows.length ? <p>Inga data för valda publika sidor under perioden. Ingen historik skapas automatiskt.</p> : <div className="overflow-x-auto"><table className="w-full text-left text-sm">
        <thead><tr><th className="p-2">Sida</th><th className="p-2">Sidvisningar</th><th className="p-2">Aktiva användare</th><th className="p-2">Engagemang (s)</th></tr></thead>
        <tbody>{report.rows.map((row) => <tr key={row.page}><td className="p-2">{row.page}</td><td className="p-2">{row.views}</td><td className="p-2">{row.activeUsers}</td><td className="p-2">{Math.round(row.engagementSeconds)}</td></tr>)}</tbody>
      </table></div>}
    </>}
  </section>;
}
