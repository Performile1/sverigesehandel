import { SalaryEstimateEditor } from './SalaryEstimateEditor';
import { useState } from 'react';
import type { EcommerceJob, EcommerceNewsItem } from '../types';
import { api } from '../api';
import { articleUrl, jobSummary } from '../../shared/editorial';

interface PanelProps { onRefresh: () => Promise<void>; onNotify: (message: string) => void }
const field = 'w-full px-3 py-2 rounded-xl border border-slate-300 text-sm';
const button = 'px-4 py-2 rounded-xl bg-[#040B16] text-white text-sm disabled:opacity-50 cursor-pointer';

export function NewsReviewPanel({ news, onRefresh, onNotify }: PanelProps & { news: EcommerceNewsItem[] }) {
  const [selectedId, setSelectedId] = useState('');
  const selected = news.find((item) => item.id === selectedId) || news[0];
  if (!selected) return null;
  return <section className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
    <h2 className="font-bold text-lg">Granska nyhetens direktlänk</h2>
    <p className="text-sm text-slate-600">Öppna originalartikeln och jämför rubrik, innehåll, källa och datum. En giltig adress bevisar inte att det är rätt nyhet. Blockerad sida eller betalvägg kräver manuell granskning, inte en reservlänk.</p>
    <label className="block text-sm">Välj nyhet ({news.filter((item) => !item.linkReviewedAt).length} utan länkgranskning)
      <select className={field} value={selected.id} onChange={(event) => setSelectedId(event.target.value)}>
        {news.map((item) => <option key={item.id} value={item.id}>{item.status === 'draft' ? 'Utkast' : 'Publicerad'} · {item.linkReviewedAt ? 'Granskad' : 'Behöver granskas'} · {item.title}</option>)}
      </select>
    </label>
    <NewsReviewForm key={`${selected.id}-${selected.linkReviewedAt}-${selected.sourceUrl}-${selected.status}`} item={selected} onRefresh={onRefresh} onNotify={onNotify} />
  </section>;
}

function NewsReviewForm({ item, onRefresh, onNotify }: PanelProps & { item: EcommerceNewsItem }) {
  const [title, setTitle] = useState(item.title);
  const [summary, setSummary] = useState(item.summary);
  const [sourceName, setSourceName] = useState(item.sourceName);
  const [sourceUrl, setSourceUrl] = useState(item.sourceUrl);
  const [date, setDate] = useState(item.publishedDate);
  const [opened, setOpened] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const url = articleUrl(sourceUrl);
  const resetReview = () => { setConfirmed(false); setOpened(false); };
  async function save(publish: boolean) {
    setBusy(true); setError('');
    try {
      await api.upsertNews({ ...item, title, summary, sourceName, sourceUrl, publishedDate: date,
        status: publish ? 'published' : 'draft', confirmArticleLink: publish && confirmed });
      await onRefresh();
      onNotify(publish ? 'Nyheten publicerad med redaktionellt granskad direktlänk.' : 'Nyheten sparad som utkast.');
    } catch (cause) { setError((cause as Error).message); }
    finally { setBusy(false); }
  }
  return <form className="space-y-3" onSubmit={(event) => { event.preventDefault(); void save(true); }}>
    <label className="block text-sm">Rubrik<input className={field} required value={title} onChange={(event) => { setTitle(event.target.value); resetReview(); }} /></label>
    <label className="block text-sm">Sammanfattning<textarea className={field} required rows={3} value={summary} onChange={(event) => { setSummary(event.target.value); resetReview(); }} /></label>
    <label className="block text-sm">Källa<input className={field} required value={sourceName} onChange={(event) => { setSourceName(event.target.value); resetReview(); }} /></label>
    <label className="block text-sm">Originalartikelns direktlänk<input className={field} type="url" value={sourceUrl} onChange={(event) => { setSourceUrl(event.target.value); resetReview(); }} /></label>
    <label className="block text-sm">Publiceringsdatum<input className={field} type="date" required value={date} onChange={(event) => { setDate(event.target.value); resetReview(); }} /></label>
    {url ? <a href={url} target="_blank" rel="noopener noreferrer" onClick={() => setOpened(true)} className="text-blue-700 underline break-all">Öppna originalartikeln: {url}</a> : <p className="text-amber-800 text-sm">En artikelspecifik HTTP(S)-adress krävs. Startsidor och kända kategori-/söksidor godtas inte.</p>}
    <label className="flex gap-2 text-sm"><input type="checkbox" disabled={!opened || !url} checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} />Jag har öppnat länken och kontrollerat att den leder direkt till rätt artikel och att källa, innehåll och datum stämmer.</label>
    <p className="text-xs text-slate-500">Senast redaktionellt godkänd: {item.linkReviewedAt || 'Inte granskad'}. Ingen automatisk kontroll av externa sidor görs.</p>
    {error && <p role="alert" className="text-red-700">{error}</p>}
    <div className="flex flex-wrap gap-3">
      <button type="button" className={button} disabled={busy} onClick={() => void save(false)}>Spara som utkast</button>
      <button type="submit" className={button} disabled={busy || !url || !confirmed}>Godkänn direktlänk och publicera</button>
    </div>
  </form>;
}

export function JobTextPanel({ jobs, onRefresh, onNotify }: PanelProps & { jobs: EcommerceJob[] }) {
  const [selectedId, setSelectedId] = useState('');
  const selected = jobs.find((item) => item.id === selectedId) || jobs[0];
  if (!selected) return null;
  return <section className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
    <h2 className="font-bold text-lg">Redigera jobbets ingress och fulltext</h2>
    <label className="block text-sm">Välj jobb<select className={field} value={selected.id} onChange={(event) => setSelectedId(event.target.value)}>
      {jobs.map((job) => <option key={job.id} value={job.id}>{job.title} · {job.company}</option>)}
    </select></label>
    <JobTextForm key={`${selected.id}-${selected.summary}-${selected.desc}`} job={selected} onRefresh={onRefresh} onNotify={onNotify} />
    <SalaryEstimateEditor key={`${selected.id}-${JSON.stringify(selected.salaryEstimate)}`} job={selected} onRefresh={onRefresh} />
  </section>;
}

function JobTextForm({ job, onRefresh, onNotify }: PanelProps & { job: EcommerceJob }) {
  const [summary, setSummary] = useState(jobSummary(job));
  const [desc, setDesc] = useState(job.desc);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  return <form className="space-y-3" onSubmit={async (event) => {
    event.preventDefault(); setBusy(true); setError('');
    try {
      // Only text fields: do not reset expiry/verification or reopen a closed job.
      await api.upsertJob({ id: job.id, title: job.title, company: job.company, summary, desc });
      await onRefresh(); onNotify('Jobbtexterna sparade.');
    } catch (cause) { setError((cause as Error).message); }
    finally { setBusy(false); }
  }}>
    <label className="block text-sm">Kort ingress ({summary.length}/240)<textarea className={field} rows={2} maxLength={240} value={summary} onChange={(event) => setSummary(event.target.value)} /></label>
    <label className="block text-sm">Fullständig beskrivning<textarea className={field} rows={9} value={desc} onChange={(event) => setDesc(event.target.value)} /></label>
    <p className="text-xs text-slate-600">Tom rad skapar nytt stycke. Börja listrader med - eller •. Texten visas som text, inte HTML.</p>
    {error && <p role="alert" className="text-red-700">{error}</p>}
    <button type="submit" className={button} disabled={busy}>Spara jobbtexter</button>
  </form>;
}
