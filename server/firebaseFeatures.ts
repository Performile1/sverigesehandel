import sharp from 'sharp';
import { randomUUID } from 'node:crypto';
import { GoogleAuth } from 'google-auth-library';
import { getStorage } from 'firebase-admin/storage';
import { cmsAdminApp, normalizePrivateKey } from './firebaseAdmin.ts';
import type { CmsImage, CmsAnalyticsReport } from '../src/types.ts';

export function firebaseFeatureStatus() {
  return {
    mediaEnabled: process.env.CMS_FIREBASE_MEDIA_ENABLED === 'true' && Boolean(process.env.CMS_FIREBASE_STORAGE_BUCKET),
    reportsEnabled: process.env.CMS_GA4_REPORTS_ENABLED === 'true' && /^\d+$/.test(process.env.CMS_GA4_PROPERTY_ID || ''),
    collectionEnabled: false, rawIpEnabled: false, heatmapsEnabled: false,
  };
}

export async function prepareImage(data: unknown, alt: unknown) {
  if (typeof alt !== 'string' || !alt.trim() || alt.length > 200 || typeof data !== 'string' ||
    data.length > 480_000 || !/^[A-Za-z0-9+/]+={0,2}$/.test(data)) throw new Error('Ange bild och alternativtext (högst 200 tecken).');
  const bytes = Buffer.from(data, 'base64');
  if (!bytes.length || bytes.length > 350_000) throw new Error('Bilden får vara högst 350 kB.');
  const image = sharp(bytes, { limitInputPixels: 16_000_000, animated: false });
  const metadata = await image.metadata();
  if (!['png', 'jpeg', 'webp'].includes(metadata.format || '') || !metadata.width || !metadata.height ||
    metadata.width > 6000 || metadata.height > 6000 || (metadata.pages || 1) > 1) {
    throw new Error('Endast stillbilder i PNG, JPEG eller WebP, högst 6000 × 6000 och 16 megapixel.');
  }
  // Decode/re-encode instead of trusting extension or MIME. Removes EXIF/GPS metadata.
  const result = await image.rotate().resize({ width: 2000, height: 2000, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 85 }).toBuffer({ resolveWithObject: true });
  return { bytes: result.data, alt: alt.trim(), width: result.info.width, height: result.info.height };
}

export async function uploadCmsImage(image: Awaited<ReturnType<typeof prepareImage>>): Promise<CmsImage> {
  if (!firebaseFeatureStatus().mediaEnabled) throw new Error('Bildlagring är avstängd.');
  const bucketName = process.env.CMS_FIREBASE_STORAGE_BUCKET!;
  const path = `cms-public/${randomUUID()}.webp`;
  const token = randomUUID();
  await getStorage(cmsAdminApp()).bucket(bucketName).file(path).save(image.bytes, {
    resumable: false,
    metadata: { contentType: 'image/webp', cacheControl: 'public,max-age=31536000,immutable',
      metadata: { firebaseStorageDownloadTokens: token } },
    preconditionOpts: { ifGenerationMatch: 0 },
  });
  return { path, url: `https://firebasestorage.googleapis.com/v0/b/${encodeURIComponent(bucketName)}/o/${encodeURIComponent(path)}?alt=media&token=${token}`,
    alt: image.alt, width: image.width, height: image.height };
}

export function reportDays(value: unknown): number {
  const days = Number(value ?? 7);
  if (![7, 30, 90].includes(days)) throw new Error('Välj 7, 30 eller 90 dagar.');
  return days;
}

export const PUBLIC_ANALYTICS_PATHS = ['/', '/marknad', '/nyheter', '/event', '/ehandlare', '/partners', '/3pl', '/jobb', '/historia', '/kontakt'];

export function parseAnalyticsReport(data: any, days: number): CmsAnalyticsReport {
  const rows = (data.rows || []).filter((row: any) => PUBLIC_ANALYTICS_PATHS.includes(row.dimensionValues?.[0]?.value)).map((row: any) => ({
    page: String(row.dimensionValues?.[0]?.value || '/'),
    views: Number(row.metricValues?.[0]?.value || 0),
    activeUsers: Number(row.metricValues?.[1]?.value || 0),
    engagementSeconds: Number(row.metricValues?.[2]?.value || 0),
  }));
  if (rows.some((row: any) => [row.views, row.activeUsers, row.engagementSeconds].some((v: number) => !Number.isFinite(v) || v < 0))) {
    throw new Error('Ogiltigt rapportsvar.');
  }
  return { days, timeZone: data.metadata?.timeZone || 'Okänd tidszon', rows,
    truncated: Number(data.rowCount || 0) > rows.length,
    dataLossFromOtherRow: Boolean(data.metadata?.dataLossFromOtherRow),
    subjectToThresholding: Boolean(data.metadata?.subjectToThresholding) };
}

export async function getCmsAnalytics(days: number): Promise<CmsAnalyticsReport> {
  if (!firebaseFeatureStatus().reportsEnabled) throw new Error('Rapporter är avstängda.');
  const credentials = process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY ? {
    client_email: process.env.FIREBASE_CLIENT_EMAIL.trim(),
    private_key: normalizePrivateKey(process.env.FIREBASE_PRIVATE_KEY),
  } : undefined;
  const auth = new GoogleAuth({ credentials, scopes: ['https://www.googleapis.com/auth/analytics.readonly'] });
  const client = await auth.getClient();
  const response = await client.request({
    url: `https://analyticsdata.googleapis.com/v1beta/properties/${process.env.CMS_GA4_PROPERTY_ID}:runReport`,
    method: 'POST', timeout: 15_000,
    data: {
      dateRanges: [{ startDate: `${days}daysAgo`, endDate: 'yesterday' }],
      dimensions: [{ name: 'pagePath' }],
      dimensionFilter: { filter: { fieldName: 'pagePath', inListFilter: { values: PUBLIC_ANALYTICS_PATHS, caseSensitive: true } } },
      metrics: [{ name: 'screenPageViews' }, { name: 'activeUsers' }, { name: 'userEngagementDuration' }],
      orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }], limit: 100,
    },
  });
  return parseAnalyticsReport(response.data, days);
}
