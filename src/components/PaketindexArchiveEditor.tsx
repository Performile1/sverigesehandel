import { useState } from 'react';
import type { PaketindexObservation } from '../types';
import { api } from '../api';
import { PACKAGE_METRICS, observationKey, formatObservation, parseArchiveCsv } from '../../shared/paketindexArchive';
import { PaketindexArchive } from './PaketindexArchive';
import quarterlyCsv from '../../docs/underlag/paketindex-kvartal.csv?raw';
import annualCsv from '../../docs/underlag/paketindex-ar.csv?raw';

const field = 'block w-full p-2 mt-1 border border-slate-300 rounded-lg';
const button = 'px-4 py-2 bg-slate-900 text-white rounded-lg disabled:opacity-50 cursor-pointer';
const emptyRow: PaketindexObservation = { edition: '', period: '', metric: 'total', basis: 'carrier', value: 0,
  unit: 'packages', sourceName: 'Transportföretagen / HUI', sourceUrl: '', publishedDate: '', precision: 'exact', note: '', status: 'draft' };

export function PaketindexArchiveEditor({ rows, onRefresh }: { rows: PaketindexObservation[]; onRefresh: () => Promise<void> }) {
  const [key, setKey] = useState('new');
  const selected = rows.find((r) => observationKey(r) === key);
  return <div className="space-y-5">
    <PaketindexArchive rows={rows} admin />
    <section className="bg-white border rounded-2xl p-5 space-y-4">
      <h2 className="text-xl font-bold">Redigera arkivpost</h2>
      <p className="text-sm">Nyckeln är rapportversion + period + mått + metod. Redigering ändrar inte andra perioder eller den äldre sammanfattningen nedan. Publicera först efter kontroll av originalkälla och rätt att återanvända uppgiften.</p>
      <label className="block text-sm">Välj post<select className={field} value={selected ? key : 'new'} onChange={(e) => setKey(e.target.value)}>
        <option value="new">Ny arkivpost</option>
        {rows.map((r) => <option key={observationKey(r)} value={observationKey(r)}>{r.edition} · {r.period} · {PACKAGE_METRICS[r.metric]} · {r.basis} · {r.status}</option>)}
      </select></label>
      <ObservationForm key={selected ? JSON.stringify(selected) : 'new'} row={selected || emptyRow} existing={Boolean(selected)} onSave={async (r) => {
        await api.savePaketindexObservation(r); await onRefresh(); setKey(observationKey(r));
      }} onDelete={selected ? async () => { await api.deletePaketindexObservation(key); await onRefresh(); setKey('new'); } : undefined} />
    </section>
    <ArchiveImport onRefresh={onRefresh} />
  </div>;
}

function ObservationForm({ row, existing, onSave, onDelete }: { row: PaketindexObservation; existing: boolean;
  onSave: (r: PaketindexObservation) => Promise<void>; onDelete?: () => Promise<void> }) {
  const [metric, setMetric] = useState(row.metric);
  const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  const percentage = ['returnRate', 'pickupShare', 'homeShare', 'lockerShare'].includes(metric);
  return <form className="space-y-3 text-sm" onSubmit={async (event) => {
    event.preventDefault(); const form = new FormData(event.currentTarget); setError(''); setBusy(true);
    try { await onSave({ ...row, edition: String(form.get('edition')), period: String(form.get('period')), metric,
      basis: String(form.get('basis')) as typeof row.basis, value: Number(String(form.get('value')).replace(',', '.')),
      unit: percentage ? 'percent' : 'packages', sourceName: String(form.get('sourceName')), sourceUrl: String(form.get('sourceUrl')),
      publishedDate: String(form.get('publishedDate')), precision: String(form.get('precision')) as typeof row.precision,
      sampleSize: form.get('sampleSize') ? Number(form.get('sampleSize')) : undefined,
      note: String(form.get('note')), status: form.get('status') === 'published' ? 'published' : 'draft' });
    } catch (cause) { setError((cause as Error).message); } finally { setBusy(false); }
  }}>
    <div className="grid sm:grid-cols-2 gap-3">
      <label>Rapportversion<input name="edition" className={field} required pattern="[a-zA-Z0-9_-]{1,60}" readOnly={existing} defaultValue={row.edition} placeholder="2026-Q3" /></label>
      <label>Period<input name="period" className={field} required readOnly={existing} defaultValue={row.period} placeholder="2026-Q3, 2025 eller 2026-YTD-Q3" /></label>
      <label>Mått<select name="metric" className={field} value={metric} disabled={existing} onChange={(e) => setMetric(e.target.value as typeof metric)}>{Object.entries(PACKAGE_METRICS).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
      <label>Metod<select name="basis" className={field} defaultValue={row.basis} aria-readonly={existing}>
        {(existing ? [row.basis] : ['carrier', 'survey', 'legacy']).map((value) => <option key={value}>{value}</option>)}
      </select></label>
      <label>Värde ({percentage ? '%' : 'antal paket, inte miljoner'})<input name="value" className={field} required inputMode="decimal" defaultValue={row.value} /></label>
      <label>Precision<select name="precision" className={field} defaultValue={row.precision}><option value="exact">Angivet värde</option><option value="rounded-thousands">Avrundat från diagram i tusental paket</option></select></label>
      <label>Källa<input name="sourceName" className={field} required maxLength={160} defaultValue={row.sourceName} /></label>
      <label>Käll-URL (krävs vid publicering)<input name="sourceUrl" type="url" className={field} defaultValue={row.sourceUrl} /></label>
      <label>Rapportens publiceringsdatum<input name="publishedDate" type="date" className={field} defaultValue={row.publishedDate} /></label>
      <label>Respondenter (krävs för undersökning)<input name="sampleSize" type="number" min={1} step={1} className={field} defaultValue={row.sampleSize} /></label>
    </div>
    <label className="block">Metodnot, mätmånad och avgränsning<textarea name="note" className={field} rows={3} maxLength={1500} defaultValue={row.note} /></label>
    <label className="block">Status<select name="status" className={field} defaultValue={row.status}><option value="draft">Utkast</option><option value="published">Publicerad – källan kontrollerad</option></select></label>
    {error && <p role="alert" className="text-red-700">{error}</p>}
    <div className="flex gap-3"><button type="submit" className={button} disabled={busy}>Spara arkivpost</button>
      {onDelete && <button className={button} disabled={busy} type="button" onClick={async () => {
        if (!window.confirm('Ta bort arkivposten? Övriga perioder påverkas inte.')) return;
        setBusy(true); setError(''); try { await onDelete(); } catch (cause) { setError((cause as Error).message); } finally { setBusy(false); }
      }}>Ta bort post</button>}
    </div>
  </form>;
}

function ArchiveImport({ onRefresh }: { onRefresh: () => Promise<void> }) {
  const [csv, setCsv] = useState(''); const [policy, setPolicy] = useState<'reject' | 'skip' | 'replace'>('reject');
  const [preview, setPreview] = useState<Awaited<ReturnType<typeof api.importPaketindexCsv>> | null>(null);
  const [error, setError] = useState(''); const [busy, setBusy] = useState(false); const [done, setDone] = useState('');
  function changeCsv(value: string) { setCsv(value); setPreview(null); setDone(''); setError(''); }
  return <section className="bg-white border rounded-2xl p-5 space-y-3 text-sm">
    <h2 className="text-xl font-bold">Importera Paketindex med förhandsgranskning</h2>
    <a href="/templates/paketindex.csv" download className="text-blue-700 underline">Ladda ner tom CSV-mall</a>
    <p>CSV med komma eller semikolon; decimalcomma stöds i citerat fält eller semikolonfil. Alla importer sparas som utkast. Ersättning av publicerad rad avpublicerar den tills den granskats igen. Ingen XLSX-import.</p>
    <div className="flex flex-wrap gap-2"><button type="button" className={button} disabled={busy} onClick={() => changeCsv(quarterlyCsv)}>Läs mottagna kvartalsutdrag</button><button type="button" className={button} disabled={busy} onClick={() => changeCsv(annualCsv)}>Läs mottagna års-/YTD-utdrag</button></div>
    <label className="block">Välj CSV-fil<input type="file" accept=".csv,text/csv" className={field} disabled={busy} onChange={async (e) => {
      const file = e.target.files?.[0]; if (!file) return;
      if (file.size > 500_000) { setError('Filen är för stor, max 500 kB.'); return; }
      try { changeCsv(await file.text()); } catch { setError('Filen kunde inte läsas.'); }
    }} /></label>
    <label className="block">CSV-innehåll<textarea className={field} rows={5} value={csv} disabled={busy} onChange={(e) => changeCsv(e.target.value)} /></label>
    <label className="block">Dubbletter mot befintligt arkiv<select className={field} value={policy} disabled={busy} onChange={(e) => { setPolicy(e.target.value as typeof policy); setPreview(null); }}><option value="reject">Avbryt vid dubblett</option><option value="skip">Hoppa över befintliga</option><option value="replace">Ersätt med utkast</option></select></label>
    <button type="button" className={button} disabled={busy || !csv.trim()} onClick={async () => {
      setBusy(true); setError(''); setPreview(null); setDone('');
      try { parseArchiveCsv(csv); setPreview(await api.importPaketindexCsv(csv, policy, false)); }
      catch (cause) { setError((cause as Error).message); } finally { setBusy(false); }
    }}>Förhandsgranska utan att spara</button>
    {error && <p role="alert" className="text-red-700">{error}</p>}{done && <p role="status">{done}</p>}
    {preview && <>
      <p>{preview.added} nya, {preview.replaced} ersätts som utkast, {preview.skipped} hoppas över. Totalt efter import: {preview.totalAfter}. Inget är sparat ännu.</p>
      <div className="max-h-72 overflow-auto"><table className="w-full text-left"><thead><tr><th>Rapport</th><th>Period</th><th>Mått</th><th>Värde</th></tr></thead><tbody>{preview.incoming.map((r) => <tr key={observationKey(r)}><td>{r.edition}</td><td>{r.period}</td><td>{PACKAGE_METRICS[r.metric]}</td><td>{formatObservation(r)}</td></tr>)}</tbody></table></div>
      <button type="button" className={button} disabled={busy} onClick={async () => {
        setBusy(true); setError('');
        try { const result = await api.importPaketindexCsv(csv, policy, true); setPreview(null); setDone(`Sparat: ${result.added} nya, ${result.replaced} ersatta utkast. Ladda inte upp igen utan att kontrollera arkivet.`); await onRefresh(); }
        catch (cause) { setError((cause as Error).message + ' Ladda om arkivet före nytt försök om resultatet är osäkert.'); setPreview(null); }
        finally { setBusy(false); }
      }}>Bekräfta import som utkast</button>
      <p className="text-xs">Servern validerar igen vid bekräftelse mot då aktuellt arkiv. Samtidiga ändringar kan därför ändra utfallet eller avbryta importen.</p>
    </>}
  </section>;
}
