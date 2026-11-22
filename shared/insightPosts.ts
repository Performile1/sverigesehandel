import type { InsightPost } from '../src/types.ts';

export const INSIGHT_TABS = ['marknad', 'nyheter', 'event', 'historia', 'ehandlare', 'partners', '3pl', 'jobb', 'community', 'kontakt', 'om'] as const;
export const INSIGHT_IMAGE_KEYS = ['checkout', 'logistics', 'events'] as const;
export const INITIAL_INSIGHT_POSTS: InsightPost[] = [
  { id: 'insight-checkout', title: 'One-Click BankID & Swish sänker avhopp med 34%', category: 'Checkout-data',
    excerpt: 'Svenska konsumenter överger kassan direkt om manuella kortuppgifter krävs. Friktionsfri identifiering är standard 2027.',
    body: '', imageKey: 'checkout', imageAlt: 'Svensk konsument betalar med mobilen', ctaLabel: 'Jämför topprankade e-handlare',
    targetTab: 'ehandlare', targetUrl: '', status: 'published', theme: 'light', order: 0, author: '', publishedDate: '', sourceUrl: '' },
  { id: 'insight-logistics', title: 'Klimatdata i kassan styr mot fossilfri last-mile', category: 'Grön logistik',
    excerpt: 'När e-handlaren visar tydlig miljödata för eldrivna hemleveranser och paketskåp väljer majoriteten av konsumenterna ett fossilfritt alternativ.',
    body: '', imageKey: 'logistics', imageAlt: 'Eldrivet paketfordon och nordiskt paketskåp', ctaLabel: 'Se tech- & logistikpartners',
    targetTab: 'partners', targetUrl: '', status: 'published', theme: 'light', order: 1, author: '', publishedDate: '', sourceUrl: '' },
  { id: 'insight-events', title: 'D-Congress, E-commerce Expo & Retail Technology', category: 'Göteborg · Stockholm · Oslo 2027',
    excerpt: 'Komplett mäss- och konferensguide: Kistamässan (25–26 maj), Älvsjö + Formex (24–25 aug), Stora Ehandelsdagen, NXT Nordic & D-Congress.',
    body: '', imageKey: 'events', imageAlt: 'Svenska e-handelsmässor och konferenser 2027', ctaLabel: 'Öppna Event & Mässor',
    targetTab: 'event', targetUrl: '', status: 'published', theme: 'dark', order: 2, author: '', publishedDate: '', sourceUrl: '' },
];
export function insightUrl(value: unknown): boolean {
  if (value === '') return true;
  if (typeof value !== 'string' || value.length > 2000) return false;
  try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password && url.hostname.includes('.'); }
  catch { return false; }
}
export function validInsightPost(value: unknown): value is InsightPost {
  if (!value || typeof value !== 'object') return false;
  const p = value as InsightPost;
  return typeof p.id === 'string' && /^insight-[a-zA-Z0-9-]{1,80}$/.test(p.id) &&
    (['title', 'category', 'excerpt', 'body', 'imageAlt', 'ctaLabel', 'author', 'publishedDate'] as const).every((key) => typeof p[key] === 'string') &&
    Boolean(p.title.trim()) && p.title.length <= 180 && p.category.length <= 100 && p.excerpt.length <= 800 && p.body.length <= 15000 &&
    p.imageAlt.length <= 200 && p.ctaLabel.length <= 100 && p.author.length <= 100 &&
    (p.publishedDate === '' || (/^\d{4}-\d{2}-\d{2}$/.test(p.publishedDate) && !Number.isNaN(Date.parse(p.publishedDate)) && new Date(p.publishedDate).toISOString().slice(0, 10) === p.publishedDate)) &&
    (p.imageKey === '' || INSIGHT_IMAGE_KEYS.includes(p.imageKey)) &&
    (p.targetTab === '' || INSIGHT_TABS.includes(p.targetTab)) && insightUrl(p.targetUrl) && insightUrl(p.sourceUrl) &&
    !(p.targetTab && p.targetUrl) &&
    (!p.ctaLabel.trim() || Boolean(p.targetTab || p.targetUrl)) &&
    ['draft', 'published'].includes(p.status) && ['light', 'dark'].includes(p.theme) &&
    Number.isInteger(p.order) && p.order >= 0 && p.order <= 1000 &&
    (p.status !== 'published' || ((!p.imageKey && !p.image) || Boolean((p.image?.alt || p.imageAlt).trim()))) &&
    (p.image === undefined || (p.image !== null && typeof p.image === 'object' && typeof p.image.url === 'string' && p.image.url.startsWith('https://firebasestorage.googleapis.com/') &&
      typeof p.image.path === 'string' && /^cms-public\/[a-zA-Z0-9-]+\.webp$/.test(p.image.path) &&
      typeof p.image.alt === 'string' && p.image.alt.trim().length > 0 && p.image.alt.length <= 200 &&
      Number.isInteger(p.image.width) && p.image.width > 0 && p.image.width <= 6000 &&
      Number.isInteger(p.image.height) && p.image.height > 0 && p.image.height <= 6000));
}
export function validInsightPosts(value: unknown): value is InsightPost[] {
  return Array.isArray(value) && value.length <= 50 && value.every(validInsightPost) && new Set(value.map((p) => p.id)).size === value.length;
}
