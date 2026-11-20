import { useMemo, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { PaketindexObservation } from '../types';
import { PACKAGE_METRICS, observationKey, comparison, formatObservation } from '../../shared/paketindexArchive';

export function PaketindexArchive({ rows, admin = false }: { rows: PaketindexObservation[]; admin?: boolean }) {
  const available = useMemo(() => rows.filter((row) => admin || row.status === 'published'), [rows, admin]);
  const editions = [...new Set(available.map((row) => row.edition))].sort().reverse();
  const [chosenEdition, setEdition] = useState('');
  const edition = editions.includes(chosenEdition) ? chosenEdition : editions[0] || '';
  const [metric, setMetric] = useState<PaketindexObservation['metric']>('total');
  const [basis, setBasis] = useState<PaketindexObservation['basis']>('carrier');
  const series = available.filter((row) => row.edition === edition && row.metric === metric && row.basis === basis)
    .sort((a, b) => a.period.localeCompare(b.period));
  const [chosenPeriod, setPeriod] = useState('');
  const selected = series.find((row) => row.period === chosenPeriod) || series[series.length - 1];
  const result = selected ? comparison(selected, series) : null;
  const quarterly = series.filter((row) => /^\d{4}-Q[1-4]$/.test(row.period));
  return <section className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-8 space-y-5">
    <h2 className="text-2xl font-bold">Paketindex – periodarkiv</h2>
    <p className="text-sm text-slate-600">Rapportversionerna hålls åtskilda eftersom historiska värden kan skilja sig. Jämförelser görs endast inom samma rapportversion, mått och metod. Returer/export är separata segment; second hand är en delmängd, inte ett tillägg till totalen.</p>
    {!editions.length ? <p>Inga granskade arkivposter är publicerade ännu.</p> : <>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
        <label>Rapportversion<select className="block w-full p-2 border rounded-lg" value={edition} onChange={(e) => { setEdition(e.target.value); setPeriod(''); }}>
          {editions.map((value) => <option key={value}>{value}</option>)}
        </select></label>
        <label>Mått<select className="block w-full p-2 border rounded-lg" value={metric} onChange={(e) => { setMetric(e.target.value as typeof metric); setPeriod(''); }}>
          {Object.entries(PACKAGE_METRICS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
        </select></label>
        <label>Underlag<select className="block w-full p-2 border rounded-lg" value={basis} onChange={(e) => { setBasis(e.target.value as typeof basis); setPeriod(''); }}>
          <option value="carrier">Transportörsstatistik</option><option value="survey">Konsumentundersökning</option><option value="legacy">Tidigare CMS-uppgift</option>
        </select></label>
        <label>Period<select className="block w-full p-2 border rounded-lg" value={selected?.period || ''} onChange={(e) => setPeriod(e.target.value)}>
          {!series.length && <option value="">Saknar data</option>}
          {series.map((row) => <option key={row.period}>{row.period}</option>)}
        </select></label>
      </div>
      {!selected ? <p>Underlag saknas för valt mått och metod i denna rapportversion.</p> : <>
        <div className="p-4 bg-slate-50 rounded-xl space-y-2">
          <h3 className="font-bold">{PACKAGE_METRICS[selected.metric]} · {selected.period}</h3>
          <p className="text-2xl font-bold">{formatObservation(selected)}</p>
          <p className="text-sm">{result ? selected.unit === 'percent'
            ? `Förändring mot ${result.previous.period}: ${result.difference.toLocaleString('sv-SE', { maximumFractionDigits: 2, signDisplay: 'exceptZero' })} procentenheter.`
            : `Mot ${result.previous.period}: ${result.growthPct === null ? 'Procentuell förändring kan inte beräknas från noll' : result.growthPct.toLocaleString('sv-SE', { maximumFractionDigits: 1, signDisplay: 'exceptZero' }) + ' %'} (${result.difference.toLocaleString('sv-SE', { signDisplay: 'exceptZero' })} paket).`
            : 'Jämförbart värde från samma period föregående år saknas i denna rapportversion.'}</p>
          <p className="text-xs">{selected.precision === 'rounded-thousands' ? 'Avrundat diagramvärde till tusental paket.' : 'Angivet värde enligt källa.'} {selected.basis === 'survey' && `Konsumentundersökning, n=${selected.sampleSize}. Inte transportörsrapporterad volymandel.`}</p>
          <p className="text-sm whitespace-pre-wrap">{selected.note}</p>
          <p className="text-xs">Källa: {selected.sourceName} · Publiceringsdatum: {selected.publishedDate || 'saknas'} · {selected.status === 'draft' ? 'Utkast – endast CMS' : 'Publicerad'}</p>
          {selected.sourceUrl && <a className="text-blue-700 underline text-sm break-all" href={selected.sourceUrl} target="_blank" rel="noopener noreferrer">Öppna rapportkällan</a>}
        </div>
        {quarterly.length > 1 && <div className="h-64" aria-label="Kvartalsutveckling inom vald rapportversion">
          <ResponsiveContainer width="100%" height="100%"><LineChart data={quarterly} margin={{ left: 20, right: 12, bottom: 12 }}>
            <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="period" tick={{ fontSize: 10 }} /><YAxis width={70} tick={{ fontSize: 10 }} />
            <Tooltip formatter={(value) => [Number(value).toLocaleString('sv-SE'), selected.unit === 'percent' ? '%' : 'paket']} />
            <Line dataKey="value" stroke="#006AA7" connectNulls={false} />
          </LineChart></ResponsiveContainer>
        </div>}
        <div className="overflow-x-auto"><table className="w-full text-sm text-left"><caption className="text-left text-xs mb-2">Alla perioder för valt mått/metod i {edition}. År/YTD visas separat från kvartalsdiagrammet.</caption><thead><tr><th className="p-2">Period</th><th className="p-2">Värde</th><th className="p-2">Precision</th></tr></thead>
          <tbody>{series.map((row) => <tr key={observationKey(row)}><td className="p-2">{row.period}</td><td className="p-2">{formatObservation(row)}</td><td className="p-2">{row.precision === 'exact' ? 'Angivet värde' : 'Avrundat tusental'}</td></tr>)}</tbody>
        </table></div>
      </>}
    </>}
  </section>;
}
