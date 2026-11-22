import type { PaketindexObservation } from '../types';
import { latestPaketindex, PAKETINDEX_SOURCE } from '../../shared/latestPaketindex';
import { formatObservation } from '../../shared/paketindexArchive';
export function LatestPaketindex({rows}:{rows:PaketindexObservation[]}) {
  const {row,result,reference}=latestPaketindex(rows);
  return <section aria-labelledby="latest-paketindex" className="bg-[#040B16] text-white rounded-2xl p-6 space-y-3">
    <p className="text-sm text-yellow-300">Senaste tillgängliga Paketindex · {row.period}</p>
    <h2 id="latest-paketindex" className="text-2xl font-bold">{formatObservation(row)}</h2>
    <p>{result?.growthPct!=null?`${result.growthPct.toLocaleString('sv-SE',{maximumFractionDigits:1,signDisplay:'exceptZero'})} % jämfört med ${result.previous.period}, inom samma rapportversion.`:'Jämförbart underlag inom samma rapportversion saknas.'}</p>
    <p className="text-sm text-slate-300">{row.sourceName} · Rapportversion {row.edition} · {reference?'Källsida daterad':'Publicerad'} {row.publishedDate}. {row.precision==='rounded-thousands'?'Diagramvärden avrundade till tusental paket.':''}</p>
    {reference&&<p className="text-sm text-slate-300">Källgranskad läsreferens till K3 2026. Detta är inte en import eller ändring av sparade CMS-uppgifter. En senare publicerad CMS-period ersätter automatiskt referensen i denna visning. Ingen automatisk bevakning av nya externa rapporter sker.</p>}
    <div className="flex flex-wrap gap-4"><a className="underline" href={row.sourceUrl} target="_blank" rel="noopener noreferrer">Öppna rapportkällan</a>
      {reference&&<a className="underline" href={PAKETINDEX_SOURCE} target="_blank" rel="noopener noreferrer">Transportföretagens publicering</a>}
      <a className="underline" href="#paketindex-archive" onClick={e=>{e.preventDefault();document.getElementById('paketindex-archive')?.scrollIntoView({behavior:'smooth'});}}>Visa periodarkiv</a>
    </div>
  </section>;
}
