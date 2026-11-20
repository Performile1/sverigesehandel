import { useState } from 'react';
import type { EcommerceJob, SalaryEstimate } from '../types';
import { api } from '../api';
import { validSalaryEstimate } from '../../shared/salary';

export function SalaryDisplay({ job }: { job: EcommerceJob }) {
  const estimate = job.salaryEstimate;
  return <div className="text-xs space-y-1 max-w-sm">
    {job.salaryRange && <p className="text-slate-700">Angivet lönefält: {job.salaryRange} <span className="text-slate-500">(källa behöver kontrolleras om den inte anges)</span></p>}
    {estimate && validSalaryEstimate(estimate) ? <>
      <p className="font-bold text-[#059669]">Uppskattat lönespann: {estimate.min.toLocaleString('sv-SE')}–{estimate.max.toLocaleString('sv-SE')} kr/mån före skatt, heltid</p>
      <p>{estimate.occupation} · {estimate.geography} ({({ local: 'lokalt', regional: 'regionalt', national: 'riksunderlag' })[estimate.geographicLevel]}) · statistikår {estimate.year}</p>
      <a className="underline text-blue-700" href={estimate.sourceUrl} target="_blank" rel="noopener noreferrer">Källa: {estimate.sourceName}</a>
      <details><summary className="cursor-pointer">Metod och begränsningar</summary><p className="pt-1 whitespace-pre-wrap">{estimate.method}</p></details>
    </> : <p className="text-slate-500">Löneuppskattning: underlag saknas.</p>}
  </div>;
}

export function SalaryEstimateEditor({ job, onRefresh }: { job: EcommerceJob; onRefresh: () => Promise<void> }) {
  const r = job.salaryEstimate;
  const [busy, setBusy] = useState(false); const [message, setMessage] = useState('');
  const field = 'block w-full p-2 border border-slate-300 rounded-lg mt-1';
  async function save(estimate: SalaryEstimate | null) {
    setBusy(true); setMessage('');
    try { await api.upsertJob({ id: job.id, title: job.title, company: job.company, salaryEstimate: estimate }); await onRefresh(); setMessage('Löneunderlaget sparat.'); }
    catch (cause) { setMessage((cause as Error).message); } finally { setBusy(false); }
  }
  return <details className="border rounded-xl p-4"><summary className="font-bold cursor-pointer">Källbelagt lönespann – {job.title}</summary>
    <p className="text-sm mt-3">Fyll endast i granskade uppgifter med rätt att återanvända dem. Ange faktisk geografisk nivå; hitta inte på ortsfaktorer. Medelvärde ensamt ger inte ett min/max-spann. Uppskattningen är separat från befintligt lönefält.</p>
    <form className="text-sm space-y-3 mt-3" onSubmit={(e) => {
      e.preventDefault(); const form = new FormData(e.currentTarget);
      const estimate: SalaryEstimate = { min: Number(form.get('min')), max: Number(form.get('max')), currency: 'SEK', period: 'month', fullTime: true,
        occupation: String(form.get('occupation')), geography: String(form.get('geography')), geographicLevel: String(form.get('level')) as SalaryEstimate['geographicLevel'],
        sourceName: String(form.get('sourceName')), sourceUrl: String(form.get('sourceUrl')), year: Number(form.get('year')), method: String(form.get('method')) };
      if (!validSalaryEstimate(estimate)) { setMessage('Kontrollera belopp, yrke, geografi, källa, statistikår och metod.'); return; }
      void save(estimate);
    }}>
      <div className="grid sm:grid-cols-2 gap-3">
        <label>Min kr/mån<input name="min" className={field} type="number" min={1} max={1000000} step={1} required defaultValue={r?.min} /></label>
        <label>Max kr/mån<input name="max" className={field} type="number" min={1} max={1000000} step={1} required defaultValue={r?.max} /></label>
        <label>Yrkesgrupp / SSYK<input name="occupation" className={field} maxLength={500} required defaultValue={r?.occupation} /></label>
        <label>Geografiskt underlag<input name="geography" className={field} maxLength={500} required defaultValue={r?.geography} /></label>
        <label>Geografisk nivå<select name="level" className={field} defaultValue={r?.geographicLevel || 'national'}><option value="local">Lokalt underlag</option><option value="regional">Regionalt underlag</option><option value="national">Riksunderlag</option></select></label>
        <label>Statistikår<input name="year" className={field} type="number" min={2000} max={new Date().getFullYear()} step={1} required defaultValue={r?.year} /></label>
        <label>Källa<input name="sourceName" className={field} maxLength={500} required defaultValue={r?.sourceName} /></label>
        <label>Käll-URL<input name="sourceUrl" className={field} type="url" required defaultValue={r?.sourceUrl} /></label>
      </div>
      <label className="block">Metod, senioritet, distans/flera orter och begränsningar<textarea name="method" className={field} maxLength={500} rows={3} required defaultValue={r?.method} /></label>
      <p>Enhet: SEK per månad före skatt, heltid. För andra valutor/perioder ska inga omräknade gissningar sparas.</p>
      <div className="flex gap-3"><button className="p-2 bg-slate-900 text-white rounded-lg disabled:opacity-50" disabled={busy} type="submit">Spara granskat lönespann</button>
        {r && <button className="p-2 border rounded-lg" disabled={busy} type="button" onClick={() => { if (window.confirm('Ta bort löneuppskattningen?')) void save(null); }}>Ta bort uppskattning</button>}
      </div>
      {message && <p role="status">{message}</p>}
    </form>
  </details>;
}
