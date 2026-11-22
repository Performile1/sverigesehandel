import type { PaketindexObservation } from '../src/types';
import { comparison } from './paketindexArchive';

// Read-only source reference, NOT a migration or rewrite of CMS snapshots.
// Source page dated 2026-11-10; volumes from the report's chart in thousands.
export const PAKETINDEX_SOURCE = 'https://www.transportforetagen.se/rapporter-remisser-och-statistik/statistik/paketindex-q3-2026/';
export const PAKETINDEX_REPORT = 'https://via.tt.se/files/3235972/4631131/460562/sv';
export const REVIEWED_PAKETINDEX: PaketindexObservation[] = [
  {period:'2025-Q3',value:62_672_000}, {period:'2026-Q3',value:67_554_000},
].map(row=>({...row,edition:'2026-Q3',metric:'total',basis:'carrier',unit:'packages',
  sourceName:'Transportföretagen / HUI',sourceUrl:PAKETINDEX_REPORT,publishedDate:'2026-11-10',
  precision:'rounded-thousands',status:'published',
  note:'Källgranskad läsreferens: diagramvärde i tusental paket. Källsidans datum är 10 november 2026. Ändrar inte CMS-arkivet.'}));

export function latestQuarter(rows:PaketindexObservation[]) {
  // Never choose by edition name or value: annual/YTD, drafts and surveys are excluded.
  return rows.filter(r=>r.status==='published'&&r.metric==='total'&&r.basis==='carrier'&&/^\d{4}-Q[1-4]$/.test(r.period))
    .sort((a,b)=>b.period.localeCompare(a.period)||b.publishedDate.localeCompare(a.publishedDate)||a.edition.localeCompare(b.edition))[0];
}
export function latestPaketindex(rows:PaketindexObservation[]) {
  const cms=latestQuarter(rows); const reference=latestQuarter(REVIEWED_PAKETINDEX)!;
  const useCms=cms&&(cms.period>reference.period||(cms.period===reference.period&&cms.publishedDate>=reference.publishedDate));
  const row=useCms?cms:reference;
  return {row,result:comparison(row,useCms?rows.filter(r=>r.status==='published'):REVIEWED_PAKETINDEX),reference:!useCms};
}
