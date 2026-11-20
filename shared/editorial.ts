// Structural checks only. A plausible URL is NOT proof that it is the right article.
// An administrator must open the destination and compare it to the actual story.
export function articleUrl(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  try {
    const url = new URL(value.trim());
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) return null;
    const host = url.hostname.toLowerCase();
    if (!host.includes('.') || host.endsWith('.localhost') || host.endsWith('.local') ||
        /^[\d.]+$/.test(host) || host.startsWith('[')) return null;
    const path = decodeURIComponent(url.pathname).replace(/\/+$/, '');
    if (!path || /^\/(?:nyheter|news|category|kategori|tag|search|sok|sök|articles?|index\.html?)$/i.test(path) ||
        /^\/(?:category|kategori|tag|search|sok|sök)\//i.test(path)) return null;
    url.hash = '';
    return url.href;
  } catch {
    return null;
  }
}

export function jobSummary(job: { summary?: string; desc: string }): string {
  const text = (job.summary?.trim() || job.desc || '').replace(/\s+/g, ' ').trim();
  if (text.length <= 240) return text;
  const excerpt = text.slice(0, 239);
  const lastSpace = excerpt.lastIndexOf(' ');
  return `${excerpt.slice(0, lastSpace > 180 ? lastSpace : undefined).trimEnd()}…`;
}
