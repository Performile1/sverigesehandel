import type { EcommerceJob, MapPoint } from '../src/types';

export const MARKET_TITLE = 'Sveriges e-handel – insikter, partners och möjligheter.';
export const LEGACY_MARKET_TITLE = 'Sveriges e-handelsekosystem i ett enda kontrollrum.';

export function neutralPlaceholder(value: string | undefined): string {
  return (value || '').replace(/wigrund81@gmail\.com/gi, 'namn@foretag.se')
    .replace(/rickard\s+wigrund/gi, 'Ditt namn');
}

export function matchesJob(job: EcommerceJob, filters: { search: string; city: string; role: string; workModel: string }): boolean {
  const normalize = (value: string) => value.normalize('NFC').trim().toLocaleLowerCase('sv-SE');
  const query = normalize(filters.search);
  return (!query || [job.title, job.company, job.city, job.desc, job.summary || '', ...job.skills]
    .some((value) => normalize(value).includes(query))) &&
    (!filters.city.trim() || normalize(job.city).includes(normalize(filters.city))) &&
    (filters.role === 'all' || job.roleCategory === filters.role) &&
    (filters.workModel === 'all' || job.workModel === filters.workModel);
}

// Bounds of the existing Sweden map viewport, not a claim of precise national boundaries.
export function validMapPoint(value: unknown): value is MapPoint {
  if (!value || typeof value !== 'object') return false;
  const point = value as MapPoint;
  return typeof point.id === 'string' && /^point-[a-z0-9-]{1,70}$/.test(point.id) &&
    typeof point.label === 'string' && point.label.trim().length > 0 && point.label.length <= 80 &&
    typeof point.description === 'string' && point.description.length <= 1000 &&
    ['vast', 'svealand', 'smaland', 'syd', 'norrland'].includes(point.regionKey) &&
    typeof point.longitude === 'number' && Number.isFinite(point.longitude) && point.longitude >= 10 && point.longitude <= 25 &&
    typeof point.latitude === 'number' && Number.isFinite(point.latitude) && point.latitude >= 55 && point.latitude <= 69.5 &&
    ['draft', 'published'].includes(point.status);
}

export const ABOUT_CONTENT = {
  kicker: 'Om sverigesehandel.se',
  title: 'Vi samlar Sveriges e-handel',
  subtitle: 'En mötesplats för e-handlare, leverantörer, transportörer och människor som utvecklar svensk e-handel.',
  body: 'Här kan du utforska marknadsdata, hitta samarbetspartner, upptäcka jobb och event samt utbyta erfarenheter i communityn.\n\nMarknadsdata ska läsas tillsammans med källa, mätperiod och rapportversion. Äldre Paketindexutgåvor bevaras så att förändrade historiska värden inte blandas ihop.\n\nFöretagsuppgifter och redaktionellt innehåll kan behöva rättas. Kontakta redaktionen om du hittar fel eller vill veta mer om en uppgift. Företagsredaktörers ändringsförslag granskas av Sveriges E-handel före publicering.',
};
