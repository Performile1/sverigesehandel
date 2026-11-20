import type { PaketindexObservation, PaketindexData } from '../src/types.ts';

export const PACKAGE_METRICS = {
  total: 'E-handelspaket upp till 20 kg', domestic: 'Inrikes paket', foreign: 'Utlandspaket',
  returns: 'Returer', secondhand: 'Second hand-paket (delmängd av totalen)', export: 'Exportpaket',
  bulky: 'Större varuförsändelser 20–100 kg', returnRate: 'Returgrad',
  pickupShare: 'Utlämningsställe inkl. Click & Collect', homeShare: 'Hemleverans', lockerShare: 'Paketskåp',
} as const;
export const MAX_ARCHIVE_ROWS = 500;
export function sourceUrlValid(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password && url.hostname.includes('.'); }
  catch { return false; }
}
export function observationKey(row: PaketindexObservation): string {
  return [row.edition, row.period, row.metric, row.basis].join('|');
}
export function validObservation(value: unknown): value is PaketindexObservation {
  if (!value || typeof value !== 'object') return false;
  const r = value as PaketindexObservation;
  const percentage = ['returnRate', 'pickupShare', 'homeShare', 'lockerShare'].includes(r.metric);
  return typeof r.edition === 'string' && /^[a-zA-Z0-9_-]{1,60}$/.test(r.edition) &&
    typeof r.period === 'string' && /^(19|20|21)\d{2}(?:-Q[1-4]|-YTD-Q[1-4])?$/.test(r.period) &&
    Object.hasOwn(PACKAGE_METRICS, r.metric) && ['carrier', 'survey', 'legacy'].includes(r.basis) &&
    typeof r.value === 'number' && Number.isFinite(r.value) && r.value >= 0 &&
    (percentage ? r.unit === 'percent' && r.value <= 100 : r.unit === 'packages' && Number.isSafeInteger(r.value)) &&
    typeof r.sourceName === 'string' && r.sourceName.trim().length > 0 && r.sourceName.length <= 160 &&
    typeof r.sourceUrl === 'string' && (r.sourceUrl === '' || sourceUrlValid(r.sourceUrl)) &&
    typeof r.publishedDate === 'string' && (r.publishedDate === '' || (/^\d{4}-\d{2}-\d{2}$/.test(r.publishedDate) &&
      !Number.isNaN(Date.parse(r.publishedDate)) && new Date(r.publishedDate).toISOString().slice(0, 10) === r.publishedDate)) &&
    typeof r.note === 'string' && r.note.length <= 1500 &&
    ['draft', 'published'].includes(r.status) &&
    (r.status !== 'published' || (sourceUrlValid(r.sourceUrl) && Boolean(r.publishedDate) &&
      r.publishedDate <= new Date().toISOString().slice(0, 10) &&
      Number(r.period.slice(0, 4)) <= new Date().getFullYear())) &&
    (r.precision === 'exact' || (!percentage && r.precision === 'rounded-thousands')) &&
    (r.basis !== 'survey' || (typeof r.sampleSize === 'number' && Number.isInteger(r.sampleSize) && r.sampleSize > 0)) &&
    (r.sampleSize === undefined || (Number.isSafeInteger(r.sampleSize) && r.sampleSize > 0));
}
export function validArchive(value: unknown): value is PaketindexObservation[] {
  return Array.isArray(value) && value.length <= MAX_ARCHIVE_ROWS && value.every(validObservation) &&
    new Set(value.map(observationKey)).size === value.length;
}
export function legacyObservation(data: PaketindexData): PaketindexObservation[] {
  if (!data || typeof data !== 'object') return [];
  const match = /(?:Kvartal\s*|K|Q)([1-4])\s+(20\d{2})/i.exec(data.quarterLabel || '');
  if (!match || !Number.isFinite(data.totalParcelsMillions) || data.totalParcelsMillions < 0) return [];
  return [{ edition: 'legacy', period: `${match[2]}-Q${match[1]}`, metric: 'total', basis: 'legacy',
    value: Math.round(data.totalParcelsMillions * 1_000_000), unit: 'packages', sourceName: data.publisher || 'Befintligt CMS',
    sourceUrl: '', publishedDate: '', note: `Migrerat från tidigare CMS-objekt. ${data.summaryText || ''}`.slice(0, 1500),
    precision: 'rounded-thousands', status: 'draft' }];
}
export function priorPeriod(period: string): string {
  return `${Number(period.slice(0, 4)) - 1}${period.slice(4)}`;
}
export function comparison(row: PaketindexObservation, rows: PaketindexObservation[]) {
  const previous = rows.find((r) => r.edition === row.edition && r.period === priorPeriod(row.period) &&
    r.metric === row.metric && r.basis === row.basis && r.unit === row.unit);
  if (!previous) return null;
  const difference = row.value - previous.value;
  return { previous, difference, growthPct: previous.value === 0 ? null : difference / previous.value * 100 };
}
export function formatObservation(row: PaketindexObservation): string {
  return row.unit === 'percent' ? `${row.value.toLocaleString('sv-SE')} %` : `${row.value.toLocaleString('sv-SE')} paket`;
}

// Small RFC4180-style reader: quotes, escaped quotes, CRLF, UTF-8 BOM, comma or semicolon.
export function csvCells(text: string): string[][] {
  if (text.length > 500_000) throw new Error('CSV får vara högst 500 000 tecken.');
  text = text.replace(/^\uFEFF/, '');
  const delimiter = text.split(/\r?\n/, 1)[0].includes(';') ? ';' : ',';
  const rows: string[][] = []; let row: string[] = []; let cell = ''; let quoted = false; let closed = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') { quoted = false; closed = true; }
      else cell += c;
    } else if (c === '"') {
      if (cell || closed) throw new Error('Felaktig citering i CSV.');
      quoted = true;
    } else if (c === delimiter) { row.push(cell); cell = ''; closed = false; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cell); if (row.some((v) => v.trim())) rows.push(row);
      row = []; cell = ''; closed = false;
    } else { if (closed) throw new Error('Oväntad text efter CSV-citat.'); cell += c; }
  }
  if (quoted) throw new Error('Avslutande citattecken saknas.');
  row.push(cell); if (row.some((v) => v.trim())) rows.push(row);
  return rows;
}
export function parseArchiveCsv(text: string): PaketindexObservation[] {
  const [headers, ...rows] = csvCells(text);
  if (!headers || !rows.length || rows.length > MAX_ARCHIVE_ROWS) throw new Error('CSV måste innehålla rubrik och 1–500 rader.');
  if (new Set(headers).size !== headers.length) throw new Error('Dubblerad kolumnrubrik.');
  const extracted = headers.includes('rapportversion');
  const required = extracted ? ['rapportversion', headers.includes('period') ? 'period' : 'ar', 'ehandelspaket', 'enhet', 'bilaga_sha256', 'status']
    : ['edition', 'period', 'metric', 'basis', 'value', 'unit', 'sourceName', 'sourceUrl', 'publishedDate', 'precision', 'note'];
  if (!required.every((h) => headers.includes(h))) throw new Error('Kolumnrubriker matchar inte importmallen.');
  const result = rows.map((cells, index) => {
    if (cells.length !== headers.length) throw new Error(`Rad ${index + 2}: fel antal kolumner.`);
    const r = Object.fromEntries(headers.map((h, i) => [h, cells[i].trim()]));
    let value: PaketindexObservation;
    if (extracted) {
      if (!/^\d+(?:[.,]\d+)?$/.test(r.ehandelspaket) || !['paket', 'tusen paket'].includes(r.enhet) ||
          !/^[a-f0-9]{64}$/.test(r.bilaga_sha256) || (r.periodtyp && !['helår', 'YTD'].includes(r.periodtyp))) throw new Error(`Rad ${index + 2}: ogiltigt rapportutdrag.`);
      // Known report YTD ends at its quarter, never treated as an entire year.
      const q = /-Q([1-4])$/.exec(r.rapportversion)?.[1];
      value = { edition: r.rapportversion, period: r.period || (r.periodtyp === 'YTD' ? `${r.ar}-YTD-Q${q}` : r.ar),
        metric: 'total', basis: 'carrier', value: Number(r.ehandelspaket.replace(',', '.')) * (r.enhet === 'tusen paket' ? 1000 : 1),
        unit: 'packages', sourceName: 'Transportföretagen / HUI', sourceUrl: '', publishedDate: '',
        precision: r.enhet === 'tusen paket' ? 'rounded-thousands' : 'exact', note: `Bilageutdrag SHA-256 ${r.bilaga_sha256}. Kontrollera mot originalrapport före publicering.`, status: 'draft' };
    } else {
      if (!/^\d+(?:[.,]\d+)?$/.test(r.value)) throw new Error(`Rad ${index + 2}: ogiltigt tal.`);
      value = { edition: r.edition, period: r.period, metric: r.metric as PaketindexObservation['metric'],
        basis: r.basis as PaketindexObservation['basis'], value: Number(r.value.replace(',', '.')), unit: r.unit as PaketindexObservation['unit'],
        sourceName: r.sourceName, sourceUrl: r.sourceUrl, publishedDate: r.publishedDate, precision: r.precision as PaketindexObservation['precision'],
        note: r.note, ...(r.sampleSize ? { sampleSize: Number(r.sampleSize) } : {}), status: 'draft' };
    }
    if (!validObservation(value)) throw new Error(`Rad ${index + 2}: ogiltig period, enhet, källa, procent eller undersökningsbas.`);
    return value;
  });
  if (!validArchive(result)) throw new Error('Importen innehåller dubbla nycklar (rapportversion + period + mått + metod).');
  return result;
}
