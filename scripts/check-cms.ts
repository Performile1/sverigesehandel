import fs from 'node:fs';
import { parseArchiveCsv, comparison, observationKey, validArchive, csvCells, validObservation } from '../shared/paketindexArchive.ts';
import { PaketindexArchive } from '../src/components/PaketindexArchive.tsx';
import { SalaryDisplay } from '../src/components/SalaryEstimateEditor.tsx';
import { validSalaryEstimate } from '../shared/salary.ts';
import { AdBannerSlot } from '../src/components/AdBannerSlot.tsx';
import sharp from 'sharp';
import { prepareImage, reportDays, parseAnalyticsReport } from '../server/firebaseFeatures.ts';
import { CmsPublicImage } from '../src/components/CmsPublicImage.tsx';
import { NewsReviewPanel } from '../src/components/EditorialPanels.tsx';
import { MARKET_TITLE, LEGACY_MARKET_TITLE, matchesJob, neutralPlaceholder } from '../shared/portalContent.ts';
import { JobsView } from '../src/components/JobsView.tsx';
import { articleUrl, jobSummary } from '../shared/editorial.ts';
import { JobDescription, PlainTextDescription } from '../src/components/JobDescription.tsx';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { MarknadView } from '../src/components/MarknadView.tsx';
import { NewsView } from '../src/components/NewsView.tsx';
import { PartnersView } from '../src/components/PartnersView.tsx';
import { ThreePlView } from '../src/components/ThreePlView.tsx';
import { CommunityView } from '../src/components/CommunityView.tsx';
import { publicStore } from '../server/publicStore.ts';
import type { AddressInfo } from 'node:net';
import { createCmsApp } from '../server/app.ts';
import { createFirestoreStore, encodeStore } from '../server/firestoreStore.ts';
import { INITIAL_CMS_DATA } from '../server/seedData.ts';
import * as operations from '../server/store.ts';
import { resolveCmsIdentity } from '../server/authPolicy.ts';
import { ADMIN_EMAIL } from '../shared/firebaseSettings.ts';
import { upgradeSnapshot, validateSnapshot } from '../server/snapshot.ts';
import type { cmsFirestore } from '../server/firebaseAdmin.ts';

// Synthetic identities only: no Firebase access or real credentials in this check.
let snapshot = structuredClone(INITIAL_CMS_DATA);
snapshot.contactMessages = [{ id: 'private-contact', name: 'Private', email: 'private@example.invalid',
  topic: 'Test', message: 'Not public', createdAt: '2026-01-01' }];
snapshot.communityMembers = [{ id: 'private-member', name: 'Private', email: 'private@example.invalid',
  role: 'Test', city: 'Test', createdAt: '2026-01-01' }];
snapshot.merchants[0].status = 'draft';
const draftId = snapshot.merchants[0].id;
let exists = true;
let calls = 0;
let transactions = 0;
const ref = { get: async () => {
  calls++;
  return { exists, get: () => JSON.stringify(snapshot) };
} };
const database = {
  doc: (path: string) => { assert.equal(path, 'cmsSnapshots/main'); return ref; },
  runTransaction: async (operation: (transaction: unknown) => Promise<unknown>) => {
    transactions++;
    let pending: string | undefined;
    const value = await operation({
      get: () => ref.get(),
      set: (_ref: unknown, data: { payload: string }) => { pending = data.payload; },
    });
    if (pending) { snapshot = JSON.parse(pending); exists = true; }
    return value;
  },
};
const service = createFirestoreStore(() => database as unknown as ReturnType<typeof cmsFirestore>);
let featureMedia = false;
let featureReports = false;
let uploads = 0;
let reportCalls = 0;
let providerFails = false;
const fixtureImage = { path: 'cms-public/fixture.webp', url: 'https://firebasestorage.googleapis.com/v0/b/fixture/o/cms-public%2Ffixture.webp?alt=media',
  alt: 'Fixture logo', width: 2, height: 2 };
const app = createCmsApp(service, async (identity) => {
  if (identity === 'invalid-fixture') throw new Error('Invalid fixture identity');
  if (identity === 'member-two') {
    return { uid: 'fixture-user-two', email: 'two@example.invalid', verified: true, admin: false };
  }
  return { uid: 'fixture-user', email: 'fixture@example.invalid', verified: identity !== 'unverified-fixture', admin: identity === 'admin-fixture' };
}, {
  status: () => ({ mediaEnabled: featureMedia, reportsEnabled: featureReports,
    collectionEnabled: false, rawIpEnabled: false, heatmapsEnabled: false }),
  upload: async (image) => { uploads++; if (providerFails) throw new Error('provider-detail-not-for-client'); assert.ok(image.bytes.length); return fixtureImage; },
  report: async (days) => { reportCalls++; if (providerFails) throw new Error('provider-detail-not-for-client'); return { days, timeZone: 'Europe/Stockholm', rows: [
    { page: '/jobb', views: 10, activeUsers: 5, engagementSeconds: 60 },
  ], truncated: false, dataLossFromOtherRow: false, subjectToThresholding: false }; },
});
// Ensures the API middleware doesn't intercept local Vite/static routes.
app.get('/portal-fixture', (_req, res) => { res.send('portal'); });
const server = app.listen(0, '127.0.0.1');
await new Promise<void>((resolve) => server.once('listening', resolve));
const origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
async function request(path: string, method = 'GET', body?: unknown, identity?: string) {
  return fetch(`${origin}${path}`, { method, headers: {
    'Content-Type': 'application/json', ...(identity ? { Authorization: `Bearer ${identity}` } : {}),
  }, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) });
}
try {
  // Editorial regression checks: real API routes + transactional readback, no external fetches.
  const editorialSnapshot = structuredClone(snapshot);
  const validArticle = 'https://publisher.invalid/news/one-story';
  for (const value of ['', 'https://publisher.invalid', 'https://publisher.invalid/news',
    'https://publisher.invalid/category/retail', 'javascript:alert(1)',
    'https://user:password@publisher.invalid/news/story', 'http://127.0.0.1/article',
    'https://publisher.invalid/%zz']) assert.equal(articleUrl(value), null, value);
  assert.equal(articleUrl(validArticle + '#section'), validArticle);
  const newsInput = { title: 'Editorial fixture', summary: 'One actual story', sourceName: 'Publisher',
    sourceUrl: validArticle, publishedDate: '2026-01-01' };
  assert.equal((await request('/api/news', 'POST', { ...newsInput, status: 'published',
    linkReviewedAt: 'forged' }, 'admin-fixture')).status, 400, 'Client cannot forge approval metadata');
  assert.equal((await request('/api/news', 'POST', { ...newsInput, sourceUrl: 'https://publisher.invalid',
    status: 'published', confirmArticleLink: true }, 'admin-fixture')).status, 400);
  const approvedResponse = await request('/api/news', 'POST', { ...newsInput,
    status: 'published', confirmArticleLink: true }, 'admin-fixture');
  assert.equal(approvedResponse.status, 201);
  const approved = (await approvedResponse.json()).item;
  assert.ok(approved.linkReviewedAt);
  assert.equal(approved.sourceUrl, validArticle);
  assert.equal('confirmArticleLink' in approved, false);
  const publicNews = await (await request('/api/news')).json();
  assert.ok(publicNews.some((item: { id: string }) => item.id === approved.id));
  for (const patch of [{ title: 'Different story' }, { summary: 'Different content' },
    { sourceUrl: 'https://publisher.invalid/news/other-story' }, { publishedDate: '2026-02-01' }]) {
    assert.equal((await request(`/api/news/${approved.id}`, 'PUT', { ...newsInput,
      ...patch, status: 'published' }, 'admin-fixture')).status, 400, 'Changed story needs a new review');
  }
  const draftResponse = await request(`/api/news/${approved.id}`, 'PUT', { ...newsInput,
    sourceUrl: '', status: 'draft' }, 'admin-fixture');
  assert.equal(draftResponse.status, 200);
  assert.equal((await draftResponse.json()).item.linkReviewedAt, undefined);
  const batchResponse = await request('/api/news/batch', 'POST', { items: [
    { ...newsInput, title: 'No URL', sourceUrl: '', status: 'published', confirmArticleLink: true, linkReviewedAt: 'forged' },
    { ...newsInput, title: 'Has URL', status: 'published', confirmArticleLink: true },
  ] }, 'admin-fixture');
  assert.equal(batchResponse.status, 201);
  const importedNews = (await batchResponse.json()).added;
  assert.equal(importedNews.length, 2);
  assert.ok(importedNews.every((item: { status: string; linkReviewedAt?: string }) => item.status === 'draft' && !item.linkReviewedAt));
  assert.equal(importedNews[0].sourceUrl, '', 'Missing URL is not replaced by another story or homepage');
  assert.ok(!(await (await request('/api/news')).json()).some((item: { title: string }) => item.title === 'No URL'));
  const renderNews = (item: typeof approved) => renderToString(createElement(NewsView, {
    news: [item], adBanners: [], onNavigate: () => {}, onBookAdSlot: () => {},
    onRefresh: async () => {}, onNotify: () => {},
  }));
  for (const isAdmin of [false, true]) {
    const portalHtml = renderToString(createElement(NewsView, {
      news: [approved], adBanners: [], isAdmin, onNavigate: () => {}, onBookAdSlot: () => {},
      onRefresh: async () => {}, onNotify: () => {},
    }));
    assert.ok(!portalHtml.includes('Granska nyhetens direktlänk'), 'Portal must never render CMS review panel, even for admin');
    assert.ok(!portalHtml.includes('Godkänn direktlänk och publicera'));
    assert.ok(!portalHtml.includes('Originalartikelns direktlänk'));
  }
  const cmsReviewHtml = renderToString(createElement(NewsReviewPanel, {
    news: [approved], onRefresh: async () => {}, onNotify: () => {},
  }));
  assert.ok(cmsReviewHtml.includes('Granska nyhetens direktlänk'));
  assert.ok(cmsReviewHtml.includes('Godkänn direktlänk och publicera'));
  const approvedHtml = renderNews(approved);
  assert.equal(approvedHtml.split(`href="${validArticle}"`).length - 1, 2, 'Title and read-link share one approved URL');
  assert.ok(!renderNews({ ...approved, linkReviewedAt: undefined }).includes(`href="${validArticle}"`));
  assert.ok(!renderNews({ ...approved, sourceUrl: 'javascript:alert(1)' }).includes('href="javascript:'));

  const fullText = 'Första stycket.\n\nAndra stycket.\n- Analys\n- Samarbete\n\n<script>alert(1)</script>';
  const jobResponse = await request('/api/jobs', 'POST', { title: 'Job text fixture', company: 'Fixture',
    desc: fullText, summary: 'Kort ingress', applyUrl: 'https://publisher.invalid/jobs/one',
    expiresAt: '2099-01-01' }, 'admin-fixture');
  assert.equal(jobResponse.status, 201);
  const savedJob = await jobResponse.json();
  assert.equal(savedJob.desc, fullText);
  assert.equal(savedJob.summary, 'Kort ingress');
  const updatedJob = await request(`/api/jobs/${savedJob.id}`, 'PUT', { title: savedJob.title,
    company: savedJob.company, summary: 'Ny ingress', desc: fullText + '\nSista raden.' }, 'admin-fixture');
  assert.equal(updatedJob.status, 200);
  assert.equal((await updatedJob.json()).summary, 'Ny ingress');
  assert.equal((await request('/api/jobs', 'POST', { title: 'Too long', company: 'Fixture',
    summary: 'x'.repeat(241) }, 'admin-fixture')).status, 400);
  const jobHtml = renderToString(createElement(JobDescription, { job: savedJob }));
  assert.ok(jobHtml.includes('<details') && jobHtml.includes('<summary'));
  assert.ok(jobHtml.includes('Kort ingress') && jobHtml.includes('Läs hela tjänsten'));
  const descriptionHtml = renderToString(createElement(PlainTextDescription, { text: fullText }));
  assert.ok(descriptionHtml.includes('<li>Analys</li>') && descriptionHtml.includes('<li>Samarbete</li>'));
  assert.ok(descriptionHtml.includes('<p') && descriptionHtml.includes('&lt;script&gt;'));
  assert.ok(!descriptionHtml.includes('<script>'));
  assert.ok(jobSummary({ desc: 'ord '.repeat(100) }).length <= 240);
  assert.equal(jobSummary({ desc: 'Legacy text without summary' }), 'Legacy text without summary');
  assert.equal((await service.getStore()).jobs.find((item) => item.id === savedJob.id)?.desc, fullText + '\nSista raden.');
  const filterJob = { ...savedJob, city: 'Göteborg', workModel: 'Hybrid', roleCategory: 'Tech & Utveckling' };
  const filters = { search: '', city: '', role: 'all', workModel: 'all' };
  assert.ok(matchesJob(filterJob, { ...filters, city: '  göte ', workModel: 'Hybrid', role: 'Tech & Utveckling' }));
  assert.ok(!matchesJob(filterJob, { ...filters, city: 'Malmö' }));
  assert.ok(!matchesJob(filterJob, { ...filters, workModel: 'Remote' }));
  assert.ok(!matchesJob(filterJob, { ...filters, role: 'Growth & MarTech' }));
  assert.ok(matchesJob(filterJob, { ...filters, search: 'kort ingress' }));
  assert.ok(matchesJob({ ...filterJob, workModel: 'Remote' }, { ...filters, workModel: 'Remote' }));
  const jobsHtml = renderToString(createElement(JobsView, {
    jobs: [filterJob], recruitmentSites: [], adBanners: [], onNavigate: () => {}, onBookAdSlot: () => {},
    onOpenDiscoverJobs: () => {}, onOpenDiscoverRecruiters: () => {}, onOpenJobModal: () => {}, onApplyJob: () => {},
  }));
  assert.ok(jobsHtml.includes('aria-label="Ort"') && jobsHtml.includes('aria-label="Arbetsmodell"'));
  assert.ok(jobsHtml.includes('Distans / Remote') && jobsHtml.includes('Rensa jobbfilter'));
  const point = { id: 'point-test', label: 'Testpunkt', latitude: 59.2, longitude: 18.1,
    regionKey: 'svealand', description: 'Nytt logistiknav', status: 'draft' };
  assert.equal((await request('/api/map-points/point-test', 'PUT', point)).status, 401);
  assert.equal((await request('/api/map-points/point-test', 'PUT', point, 'member-fixture')).status, 403);
  assert.equal((await request('/api/map-points/point-test', 'PUT', { ...point, latitude: 500 }, 'admin-fixture')).status, 400);
  assert.equal((await request('/api/map-points/point-test', 'PUT', point, 'admin-fixture')).status, 200);
  assert.equal((await service.getStore()).mapPoints?.length, 1);
  assert.equal(publicStore(await service.getStore()).mapPoints?.length, 0);
  assert.equal((await request('/api/map-points/point-test', 'PUT', { ...point, status: 'published' }, 'admin-fixture')).status, 200);
  const pointStore = await service.getStore();
  assert.equal(publicStore(pointStore).mapPoints?.[0].label, 'Testpunkt');
  const mapPointHtml = renderToString(createElement(MarknadView, {
    ...publicStore(pointStore), merchantCount: 1, partnerCount: 1, onNavigate: () => {}, onBookAdSlot: () => {},
  }));
  assert.ok(mapPointHtml.includes('Visa kartpunkt: Testpunkt'));
  assert.ok(mapPointHtml.includes('Tillagda kartpunkter'));
  assert.equal((await request('/api/map-points/point-test', 'DELETE', undefined, 'admin-fixture')).status, 200);
  assert.equal((await service.getStore()).mapPoints?.length, 0);
  assert.equal((await request('/api/map-points/point-test', 'DELETE', undefined, 'admin-fixture')).status, 404);
  assert.ok(validateSnapshot({ ...editorialSnapshot, mapPoints: [] }));
  assert.ok(!validateSnapshot({ ...editorialSnapshot, mapPoints: [{ ...point, latitude: null }] }));
  assert.ok(!validateSnapshot({ ...editorialSnapshot, mapPoints: [point, point] }));
  const oldCopy = { ...editorialSnapshot, pageContent: { ...editorialSnapshot.pageContent,
    marknad: { ...editorialSnapshot.pageContent.marknad, title: LEGACY_MARKET_TITLE } } };
  const migratedCopy = upgradeSnapshot(oldCopy) as typeof editorialSnapshot;
  assert.equal(migratedCopy.pageContent.marknad.title, MARKET_TITLE);
  assert.equal(oldCopy.pageContent.marknad.title, LEGACY_MARKET_TITLE, 'Read migration does not mutate input');
  const customCopy = { ...oldCopy, pageContent: { ...oldCopy.pageContent, marknad: { ...oldCopy.pageContent.marknad, title: 'Egen rubrik' } } };
  assert.equal((upgradeSnapshot(customCopy) as typeof editorialSnapshot).pageContent.marknad.title, 'Egen rubrik');
  assert.equal(neutralPlaceholder('Rickard Wigrund'), 'Ditt namn');
  assert.equal(neutralPlaceholder('wigrund81@gmail.com'), 'namn@foretag.se');
  assert.equal(neutralPlaceholder('Ditt företagsnamn'), 'Ditt företagsnamn');
  const personalForm = structuredClone(editorialSnapshot.contactForms[0]);
  personalForm.fields[0].placeholder = 'Rickard Wigrund';
  const neutralized = upgradeSnapshot({ ...editorialSnapshot, contactForms: [personalForm] }) as typeof editorialSnapshot;
  assert.equal(neutralized.contactForms[0].fields[0].placeholder, 'Ditt namn');
  assert.equal(personalForm.fields[0].placeholder, 'Rickard Wigrund');
  snapshot = editorialSnapshot;

  const featuresSnapshot = structuredClone(snapshot);
  for (const [path, method] of [['/api/firebase-features', 'GET'], ['/api/analytics/report', 'GET'], ['/api/media/image', 'POST'], ['/api/media/image', 'DELETE']]) {
    assert.equal((await request(path, method)).status, 401);
    assert.equal((await request(path, method, method === 'GET' ? undefined : {}, 'member-fixture')).status, 403);
  }
  const disabledStatus = await (await request('/api/firebase-features', 'GET', undefined, 'admin-fixture')).json();
  assert.equal(disabledStatus.mediaEnabled, false);
  assert.equal(disabledStatus.collectionEnabled, false);
  assert.equal(disabledStatus.rawIpEnabled, false);
  assert.equal(disabledStatus.heatmapsEnabled, false);
  assert.equal((await request('/api/media/image', 'POST', {}, 'admin-fixture')).status, 409);
  assert.deepEqual(await (await request('/api/analytics/report', 'GET', undefined, 'admin-fixture')).json(), { enabled: false });
  assert.equal(uploads, 0); assert.equal(reportCalls, 0);
  const png = await sharp({ create: { width: 2, height: 2, channels: 4, background: '#006aa7' } }).png().toBuffer();
  const prepared = await prepareImage(png.toString('base64'), ' Example logo ');
  assert.equal(prepared.alt, 'Example logo');
  const preparedMetadata = await sharp(prepared.bytes).metadata();
  assert.equal(preparedMetadata.format, 'webp'); assert.equal(preparedMetadata.exif, undefined);
  await assert.rejects(prepareImage(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="2" height="2"/>').toString('base64'), 'SVG'));
  await assert.rejects(prepareImage('invalid data', 'Bad'));
  await assert.rejects(prepareImage(Buffer.alloc(350001).toString('base64'), 'Large'));
  await assert.rejects(prepareImage(png.toString('base64'), ''));
  const tooWide = await sharp({ create: { width: 6001, height: 1, channels: 3, background: '#000000' } }).png().toBuffer();
  await assert.rejects(prepareImage(tooWide.toString('base64'), 'Too wide'));

  featureMedia = true;
  const target = snapshot.partners[0];
  const uploadBody = { targetType: 'partner', targetId: target.id, data: png.toString('base64'), alt: 'Fixture logo' };
  assert.equal((await request('/api/media/image', 'POST', { ...uploadBody, targetId: 'not-found' }, 'admin-fixture')).status, 404);
  assert.equal((await request('/api/media/image', 'POST', { ...uploadBody, data: 'not-an-image' }, 'admin-fixture')).status, 400);
  assert.equal(uploads, 0);
  assert.equal((await request('/api/media/image', 'POST', uploadBody, 'admin-fixture')).status, 200);
  assert.equal(uploads, 1);
  const withImage = await service.getStore();
  assert.deepEqual(withImage.partners.find((item) => item.id === target.id)?.image, fixtureImage);
  assert.equal(withImage.partners.find((item) => item.id === target.id)?.desc, target.desc);
  assert.equal((await request('/api/media/image', 'DELETE', { targetType: 'partner', targetId: target.id }, 'admin-fixture')).status, 200);
  assert.equal((await service.getStore()).partners.find((item) => item.id === target.id)?.image, undefined);
  const adTarget = snapshot.adBanners[0];
  assert.equal((await request('/api/media/image', 'POST', { ...uploadBody, targetType: 'ad', targetId: adTarget.id }, 'admin-fixture')).status, 200);
  assert.deepEqual((await service.getStore()).adBanners.find((item) => item.id === adTarget.id)?.image, fixtureImage);
  assert.equal((await service.getStore()).adBanners.find((item) => item.id === adTarget.id)?.targetUrl, adTarget.targetUrl);
  featureReports = true;
  assert.equal((await request('/api/analytics/report?days=999', 'GET', undefined, 'admin-fixture')).status, 400);
  assert.equal(reportCalls, 0);
  const report = await (await request('/api/analytics/report?days=30', 'GET', undefined, 'admin-fixture')).json();
  assert.equal(report.report.days, 30); assert.equal(report.report.rows[0].views, 10); assert.equal(reportCalls, 1);
  assert.throws(() => reportDays('7 OR 1=1')); assert.equal(reportDays(undefined), 7);
  const parsedReport = parseAnalyticsReport({ metadata: { timeZone: 'Europe/Stockholm', subjectToThresholding: true }, rowCount: 2, rows: [
    { dimensionValues: [{ value: '/jobb' }], metricValues: [{ value: '12' }, { value: '3' }, { value: '90' }] },
    { dimensionValues: [{ value: '/private/user@example.invalid' }], metricValues: [{ value: '1' }] },
  ] }, 7);
  assert.equal(parsedReport.rows.length, 1); assert.equal(parsedReport.rows[0].engagementSeconds, 90);
  assert.equal(parsedReport.subjectToThresholding, true);
  assert.throws(() => parseAnalyticsReport({ rows: [{ dimensionValues: [{ value: '/jobb' }], metricValues: [{ value: 'NaN' }] }] }, 7));
  const imageHtml = renderToString(createElement(CmsPublicImage, { image: fixtureImage, kind: 'logo' }));
  assert.ok(imageHtml.includes('object-contain') && imageHtml.includes('Fixture logo'));
  const partnerImageHtml = renderToString(createElement(PartnersView, {
    partners: [{ ...snapshot.partners[0], image: fixtureImage, status: 'published' }], adBanners: [],
    onNavigate: () => {}, onBookAdSlot: () => {}, onOpenDiscover: () => {}, onOpenEditor: () => {}, onRequestIntro: () => {},
  }));
  assert.ok(partnerImageHtml.includes('Fixture logo'));
  assert.ok(!partnerImageHtml.includes('aria-label="Besök $&lt;'));
  const bannerImageHtml = renderToString(createElement(AdBannerSlot, {
    banners: [{ ...snapshot.adBanners[0], image: fixtureImage, mode: 'active', active: true }],
    placement: snapshot.adBanners[0].placement, onNavigate: () => {},
  }));
  assert.ok(bannerImageHtml.includes('Fixture logo'));
  const placeholderHtml = renderToString(createElement(AdBannerSlot, {
    banners: [{ ...snapshot.adBanners[0], image: fixtureImage, mode: 'placeholder', active: true }],
    placement: snapshot.adBanners[0].placement, onNavigate: () => {},
  }));
  assert.ok(!placeholderHtml.includes('Fixture logo'));

  assert.equal(renderToString(createElement(CmsPublicImage, { image: { ...fixtureImage, url: 'javascript:alert(1)' }, kind: 'banner' })), '');
  assert.equal(renderToString(createElement(CmsPublicImage, { kind: 'logo' })), '');
  providerFails = true;
  const failingReport = await request('/api/analytics/report?days=7', 'GET', undefined, 'admin-fixture');
  assert.equal(failingReport.status, 503); assert.ok(!(await failingReport.text()).includes('provider-detail-not-for-client'));
  const failingUpload = await request('/api/media/image', 'POST', uploadBody, 'admin-fixture');
  assert.equal(failingUpload.status, 503); assert.ok(!(await failingUpload.text()).includes('provider-detail-not-for-client'));
  providerFails = false;
  featureMedia = false; featureReports = false; snapshot = featuresSnapshot;

  const beforeArchiveTests = structuredClone(snapshot);
  const qCsv = fs.readFileSync(new URL('../docs/underlag/paketindex-kvartal.csv', import.meta.url), 'utf8');
  const aCsv = fs.readFileSync(new URL('../docs/underlag/paketindex-ar.csv', import.meta.url), 'utf8');
  const qRows = parseArchiveCsv(qCsv); const aRows = parseArchiveCsv(aCsv);
  assert.equal(qRows.length, 73); assert.equal(aRows.length, 19);
  assert.equal(qRows.find((r) => r.edition === '2026-Q3' && r.period === '2026-Q3')?.value, 67554000);
  assert.equal(aRows.find((r) => r.edition === '2026-Q3' && r.period === '2026-YTD-Q3')?.value, 201757120);
  assert.ok(qRows.every((r) => r.status === 'draft'));
  assert.throws(() => parseArchiveCsv(qCsv + qCsv.split('\n')[1] + '\n'));
  assert.deepEqual(csvCells('a;b\n"one;two";"line1\nline2"\n'), [['a','b'], ['one;two','line1\nline2']]);
  assert.throws(() => csvCells('a,b\n"unterminated'));
  const genericCsv = 'edition;period;metric;basis;value;unit;sourceName;sourceUrl;publishedDate;precision;sampleSize;note\n2026-Q3;2026-Q3;lockerShare;survey;26,5;percent;Transportföretagen;;;exact;829;Undersökning september\n';
  const decimalRows = parseArchiveCsv(genericCsv);
  assert.equal(decimalRows[0].value, 26.5);
  assert.equal(decimalRows[0].sampleSize, 829);
  assert.throws(() => parseArchiveCsv(genericCsv.replace('26,5', '101')));
  assert.throws(() => parseArchiveCsv(genericCsv.replace('829', '')));

  const migratedArchive = upgradeSnapshot(beforeArchiveTests) as typeof snapshot;
  assert.equal(migratedArchive.paketindexArchive?.[0].status, 'draft');
  assert.deepEqual(migratedArchive.paketindex, beforeArchiveTests.paketindex);
  assert.deepEqual((upgradeSnapshot({ ...beforeArchiveTests, paketindexArchive: [] }) as typeof snapshot).paketindexArchive, []);
  for (const [path, method] of [['/api/paketindex/archive', 'POST'], ['/api/paketindex/archive', 'DELETE'], ['/api/paketindex/archive/import', 'POST']]) {
    assert.equal((await request(path, method, {})).status, 401);
    assert.equal((await request(path, method, {}, 'member-fixture')).status, 403);
  }
  const archivePreview = await request('/api/paketindex/archive/import', 'POST', { csv: qCsv, policy: 'reject', commit: false }, 'admin-fixture');
  assert.equal(archivePreview.status, 200); assert.equal((await archivePreview.json()).added, 73);
  assert.deepEqual(snapshot, beforeArchiveTests, 'Preview does not write');
  assert.equal((await request('/api/paketindex/archive/import', 'POST', { csv: qCsv, policy: 'reject', commit: true }, 'admin-fixture')).status, 200);
  const afterFirstImport = structuredClone(snapshot);
  assert.equal((await request('/api/paketindex/archive/import', 'POST', { csv: qCsv, policy: 'reject', commit: true }, 'admin-fixture')).status, 400);
  assert.deepEqual(snapshot, afterFirstImport, 'Rejected duplicate import is atomic');
  const skipResult = await (await request('/api/paketindex/archive/import', 'POST', { csv: qCsv, policy: 'skip', commit: true }, 'admin-fixture')).json();
  assert.equal(skipResult.skipped, 73);
  assert.equal((await request('/api/paketindex/archive/import', 'POST', { csv: aCsv, policy: 'reject', commit: true }, 'admin-fixture')).status, 200);
  const archived = await service.getStore();
  assert.ok((archived.paketindexArchive?.length || 0) >= 92);
  assert.equal(publicStore(archived).paketindexArchive?.length, 0);
  const publishRow = { ...qRows[0], status: 'published', sourceUrl: 'https://reports.invalid/paketindex', publishedDate: '2026-01-01' };
  assert.equal((await request('/api/paketindex/archive', 'POST', { ...publishRow, sourceUrl: '' }, 'admin-fixture')).status, 400);
  assert.equal((await request('/api/paketindex/archive', 'POST', { ...publishRow, publishedDate: '2026-02-30' }, 'admin-fixture')).status, 400);
  assert.equal((await request('/api/paketindex/archive', 'POST', publishRow, 'admin-fixture')).status, 200);
  assert.equal(publicStore(await service.getStore()).paketindexArchive?.length, 1);
  const beforeBadImport = structuredClone(snapshot);
  assert.equal((await request('/api/paketindex/archive/import', 'POST', { csv: qCsv + 'bad,row\n', policy: 'replace', commit: true }, 'admin-fixture')).status, 400);
  assert.deepEqual(snapshot, beforeBadImport);
  const replaceResult = await (await request('/api/paketindex/archive/import', 'POST', { csv: qCsv, policy: 'replace', commit: true }, 'admin-fixture')).json();
  assert.equal(replaceResult.replaced, 73);
  assert.equal(publicStore(await service.getStore()).paketindexArchive?.length, 0, 'Replace imports revert published rows to draft');
  assert.equal((await request('/api/paketindex/archive', 'DELETE', { key: observationKey(qRows[0]) }, 'admin-fixture')).status, 200);
  assert.ok(!(await service.getStore()).paketindexArchive?.some((r) => observationKey(r) === observationKey(qRows[0])));
  const current = { ...qRows[0], edition: 'test', period: '2026-Q1', value: 80 };
  const previous = { ...current, period: '2025-Q1', value: 100 };
  assert.equal(comparison(current, [previous])?.growthPct, -20);
  assert.equal(comparison(current, [{ ...previous, edition: 'other' }]), null);
  assert.equal(comparison(current, [{ ...previous, value: 0 }])?.growthPct, null);
  assert.ok(!validObservation({ ...current, metric: 'lockerShare', unit: 'percent', value: 101 }));
  assert.ok(!validObservation({ ...current, metric: 'homeShare', unit: 'percent', value: 30, basis: 'survey' }));
  assert.ok(!validArchive([current, current]));
  assert.ok(!validArchive(Array.from({ length: 501 }, (_, i) => ({ ...current, edition: `edition-${i}` }))));
  assert.ok(!validObservation({ ...current, period: '2026-Q5' }));
  assert.ok(!validObservation({ ...current, value: -1 }));

  assert.ok(!validateSnapshot({ ...archived, paketindexArchive: [current, current] }));
  const publishedArchiveHtml = renderToString(createElement(PaketindexArchive, { rows: [
    { ...current, status: 'published' }, { ...previous, status: 'published' },
  ] }));
  assert.ok(publishedArchiveHtml.includes('periodarkiv') && publishedArchiveHtml.includes('-20'));
  assert.ok(!renderToString(createElement(PaketindexArchive, { rows: qRows })).includes('67554000'));
  const salary = { min: 40000, max: 55000, currency: 'SEK' as const, period: 'month' as const, fullTime: true as const,
    occupation: 'Testyrke', geography: 'Sverige', geographicLevel: 'national' as const, sourceName: 'Testkälla',
    sourceUrl: 'https://salary.invalid/report', year: 2025, method: 'Granskat intervall ur källunderlaget; inte ett min/max härlett ur ett medelvärde.' };
  assert.ok(validSalaryEstimate(salary)); assert.ok(!validSalaryEstimate({ ...salary, max: 1 }));
  assert.ok(!validateSnapshot({ ...archived, jobs: [{ ...archived.jobs[0], salaryEstimate: { ...salary, max: 1 } }] }));

  const jobForSalary = snapshot.jobs[0];
  assert.equal((await request(`/api/jobs/${jobForSalary.id}`, 'PUT', { title: jobForSalary.title, company: jobForSalary.company, salaryEstimate: { ...salary, sourceUrl: '' } }, 'admin-fixture')).status, 400);
  assert.equal((await request(`/api/jobs/${jobForSalary.id}`, 'PUT', { title: jobForSalary.title, company: jobForSalary.company, salaryEstimate: salary }, 'admin-fixture')).status, 200);
  assert.deepEqual((await service.getStore()).jobs.find((r) => r.id === jobForSalary.id)?.salaryEstimate, salary);
  const salaryHtml = renderToString(createElement(SalaryDisplay, { job: { ...jobForSalary, salaryEstimate: salary } }));
  assert.ok(salaryHtml.includes('Uppskattat lönespann') && salaryHtml.includes('riksunderlag') && salaryHtml.includes('2025'));
  assert.ok(renderToString(createElement(SalaryDisplay, { job: { ...jobForSalary, salaryEstimate: null } })).includes('underlag saknas'));
  snapshot = beforeArchiveTests;

  const currentSnapshot = upgradeSnapshot(structuredClone(snapshot)) as typeof snapshot;
  const legacy = structuredClone(snapshot) as Partial<typeof snapshot>;
  delete legacy.logisticsProviders;
  delete legacy.news;
  delete legacy.schemaVersion;
  legacy.partners = (legacy.partners || []).filter((p) => p.id !== 'p-iboxen').map((p) => {
    const copy = { ...p };
    delete copy.carrierMetrics;
    return copy;
  });
  snapshot = legacy as typeof snapshot;
  const legacyJson = JSON.stringify(snapshot);
  const writesBeforeUpgrade = transactions;
  const upgraded = await service.getStore();
  assert.deepEqual(upgraded.logisticsProviders, INITIAL_CMS_DATA.logisticsProviders);
  assert.deepEqual(upgraded.news, INITIAL_CMS_DATA.news);
  assert.equal(upgraded.schemaVersion, 4);
  assert.ok(Array.isArray(upgraded.contactForms) && upgraded.contactForms.length >= 4);
  assert.ok(upgraded.paketindex && upgraded.paketindex.totalParcelsMillions === 64.2);
  assert.ok(upgraded.pageContent && upgraded.pageContent.marknad.title.length > 5);
  assert.ok(upgraded.partners.some((p) => p.id === 'p-iboxen'), 'Legacy pre-v2 snapshot receives iBoxen');
  assert.ok(
    upgraded.partners.find((p) => p.id === 'p-postnord')?.carrierMetrics?.serviceCount,
    'Legacy pre-v2 snapshot enriches carriers with carrierMetrics'
  );
  assert.equal(
    upgraded.partners.find((p) => p.id === 'p-iboxen')?.carrierMetrics?.homeDeliveryPct,
    0,
    'iBoxen homeDeliveryPct is corrected to 0'
  );
  assert.equal(
    upgraded.partners.find((p) => p.id === 'p-dhl')?.carrierMetrics?.parcelLockers,
    750,
    'DHL own lockers synced to 750'
  );
  assert.ok(
    upgraded.partners
      .filter((p) => p.subType === 'Transportör')
      .every((p) => p.customerCount === undefined),
    'Transportör partners must not have customerCount'
  );
  // The same migrated public payload must render the market/map, news & partners cleanly in SSR.
  const visible = publicStore(upgraded);
  const marketHtml = renderToString(createElement(MarknadView, {
    ...visible, merchantCount: visible.merchants.length, partnerCount: visible.partners.length,
    onNavigate: () => {}, onBookAdSlot: () => {},
  }));
  assert.ok(marketHtml.includes('Sveriges'));
  assert.ok(marketHtml.includes('Svensk e-handelstillväxt'));
  assert.ok(marketHtml.includes('64,2') || marketHtml.includes('64.2'));
  assert.ok(marketHtml.includes('32,8') || marketHtml.includes('32.8'));
  const newsHtml = renderToString(createElement(NewsView, {
    news: visible.news,
    adBanners: visible.adBanners,
    onNavigate: () => {},
    onBookAdSlot: () => {},
    onRefresh: async () => {},
    onNotify: () => {},
  }));
  assert.ok(newsHtml.includes('Temu'));
  const partnersHtml = renderToString(createElement(PartnersView, {
    partners: visible.partners,
    adBanners: visible.adBanners,
    onNavigate: () => {},
    onBookAdSlot: () => {},
    onOpenDiscover: () => {},
    onOpenEditor: () => {},
    onRequestIntro: () => {},
  }));
  assert.ok(partnersHtml.includes('iBoxen'));
  assert.ok(partnersHtml.includes('Leveranstjänster'));
  assert.ok(partnersHtml.includes('Paketskåp'));
  assert.ok(partnersHtml.includes('Postombud'));
  assert.ok(partnersHtml.includes('Integrationer:'));
  const threePlHtml = renderToString(createElement(ThreePlView, {
    logisticsProviders: visible.logisticsProviders,
    adBanners: visible.adBanners,
    onNavigate: () => {},
    onBookAdSlot: () => {},
    onRefresh: async () => {},
    onNotify: () => {},
    onRequestIntro: () => {},
  }));
  assert.ok(threePlHtml.includes('Bring Shelfless'));
  const communityHtml = renderToString(createElement(CommunityView, {
    threads: visible.communityThreads,
    memberCount: visible.communityMemberCount,
    memberCities: visible.communityMemberCities,
    onAddThread: async () => {},
    onUpvote: async () => {},
    onJoinMember: async () => {},
  }));
  assert.ok(!communityHtml.includes('1 640+'));
  const cleanCommunityHtml = communityHtml.replace(/<!-- -->/g, '');
  assert.ok(cleanCommunityHtml.includes(`${visible.communityMemberCount} registrerade i nätverket`));
  assert.ok(cleanCommunityHtml.includes('Transportör / Logistik / 3PL'));
  assert.ok(cleanCommunityHtml.includes('Medlemskatalog &amp; Direktmeddelanden') || cleanCommunityHtml.includes('Medlemskatalog'));
  assert.deepEqual(upgraded.merchants, legacy.merchants);
  assert.deepEqual(upgraded.contactMessages, legacy.contactMessages);
  assert.equal(JSON.stringify(snapshot), legacyJson, 'Read migration must not mutate or persist stored data');
  assert.equal(transactions, writesBeforeUpgrade);
  await service.upsertMerchant({ name: 'Migration fixture' });
  assert.deepEqual(snapshot.logisticsProviders, INITIAL_CMS_DATA.logisticsProviders);
  const empty = { ...currentSnapshot, logisticsProviders: [], paketindexArchive: [], schemaVersion: 4 };
  assert.deepEqual(upgradeSnapshot(empty), empty, 'An intentionally empty list stays empty');
  const v3WithoutIboxen = {
    ...currentSnapshot,
    schemaVersion: 3,
    partners: currentSnapshot.partners.filter((p) => p.id !== 'p-iboxen'),
  };
  const upgradedV3 = upgradeSnapshot(v3WithoutIboxen) as typeof currentSnapshot;
  assert.equal(upgradedV3.schemaVersion, 4);
  assert.ok(
    !upgradedV3.partners.some((p) => p.id === 'p-iboxen'),
    'Do not restore deleted iBoxen once snapshot is at schemaVersion >= 3'
  );
  const custom = { ...currentSnapshot, logisticsProviders: [{ ...currentSnapshot.logisticsProviders[0], name: 'Edited provider' }] };
  assert.deepEqual(upgradeSnapshot(custom), custom, 'Do not restore deleted providers or overwrite edits');
  assert.ok(!validateSnapshot({ ...currentSnapshot, logisticsProviders: null }));
  assert.ok(!validateSnapshot({ ...currentSnapshot, logisticsProviders: {} }));
  assert.ok(!validateSnapshot({ ...currentSnapshot, news: null }));
  assert.ok(!validateSnapshot({ ...currentSnapshot, contactForms: null }));
  snapshot = currentSnapshot;
  snapshot.logisticsProviders[0].status = 'draft';
  snapshot.news[0].status = 'draft';
  const draftNewsId = snapshot.news[0].id;
  const noRegistry = async () => false;
  assert.equal((await resolveCmsIdentity({ uid: 'owner', email: ADMIN_EMAIL, email_verified: false }, async () => true)).admin, false);
  assert.equal((await resolveCmsIdentity({ uid: 'owner', email: ADMIN_EMAIL, email_verified: true }, noRegistry)).admin, true);
  assert.equal((await resolveCmsIdentity({ uid: 'member', email_verified: true }, noRegistry)).admin, false);
  assert.equal((await resolveCmsIdentity({ uid: 'registered', email_verified: true }, async () => true)).admin, true);
  assert.equal(await (await request('/portal-fixture')).text(), 'portal');
  const response = await request('/api/cms/store');
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type')!, /application\/json/);
  assert.equal(response.headers.get('cache-control'), 'private, no-store');
  const publicData = await response.json();
  assert.ok(publicData.logisticsProviders.every((item: { status: string }) => item.status === 'published'));
  assert.equal(publicData.logisticsProviders.length, snapshot.logisticsProviders.length - 1);
  assert.deepEqual(publicData.contactMessages, []);
  assert.deepEqual(publicData.communityMembers, []);
  assert.equal(publicData.communityMemberCount, 1);
  assert.deepEqual(publicData.communityMemberCities, ['Test']);
  assert.ok(!publicData.merchants.some((item: { id: string }) => item.id === draftId));
  assert.ok(!publicData.news.some((item: { id: string }) => item.id === draftNewsId));
  assert.equal(snapshot.contactMessages.length, 1, 'Public filtering must not mutate stored data');
  const beforeDenied = calls;
  for (const [path, method] of [
    ['/api/merchants', 'POST'], ['/api/merchants/item', 'PUT'], ['/api/partners/item', 'DELETE'],
    ['/api/cms/import', 'POST'], ['/api/cms/reset', 'POST'], ['/api/ai/discover', 'POST'],
    ['/api/ai/enrich', 'POST'], ['/api/ai/news', 'POST'], ['/api/news', 'POST'],
    ['/api/news/item', 'DELETE'], ['/api/cms/status', 'GET'],
    ['/api/jobs/validate', 'POST'], ['/api/contact/item', 'DELETE'],
    ['/api/contact/item/status', 'PUT'], ['/api/forms', 'POST'], ['/api/forms/item', 'DELETE'],
    ['/api/community/members/item/status', 'PUT'], ['/api/community/members/item', 'DELETE'],
    ['/api/paketindex', 'PUT'], ['/api/pages', 'PUT'], ['/api/timeline', 'POST'],
  ]) {
    assert.equal((await request(path, method, method === 'GET' ? undefined : {})).status, 401, `${method} ${path}`);
    assert.equal((await request(path, method, method === 'GET' ? undefined : {}, 'member-fixture')).status, 403);
  }
  assert.equal((await request('/api/cms/status', 'GET', undefined, 'admin-fixture')).status, 200);
  assert.equal(calls, beforeDenied, 'Denied writes must never reach storage');
  assert.equal((await request('/api/cms/store', 'GET', undefined, 'invalid-fixture')).status, 401);
  const fullData = await (await request('/api/cms/store', 'GET', undefined, 'admin-fixture')).json();
  assert.equal(fullData.contactMessages.length, 1);
  assert.ok(fullData.merchants.some((item: { id: string }) => item.id === draftId));
  assert.equal((await request('/api/cms/import', 'POST', { merchants: [], partners: [] }, 'admin-fixture')).status, 400);
  const createdResponse = await request('/api/merchants', 'POST', { name: 'Fixture Merchant', domain: 'fixture.invalid' }, 'admin-fixture');
  assert.equal(createdResponse.status, 201);
  const created = await createdResponse.json();
  assert.equal(created.created, true);
  const reloaded = await (await request('/api/cms/store', 'GET', undefined, 'admin-fixture')).json();
  assert.ok(reloaded.merchants.some((item: { id: string }) => item.id === created.merchant.id));
  assert.equal((await request(`/api/merchants/${created.merchant.id}`, 'DELETE', undefined, 'admin-fixture')).status, 200);
  assert.ok(!snapshot.merchants.some((item) => item.id === created.merchant.id));
  // Verify carrier partners strip customerCount and new CMS routes work
  const carrierResp = await request(
    '/api/partners',
    'POST',
    { name: 'Test Carrier', subType: 'Transportör', customerCount: '10 000+' },
    'admin-fixture'
  );
  assert.equal(carrierResp.status, 201);
  const carrierJson = await carrierResp.json();
  assert.equal(carrierJson.partner.customerCount, undefined);
  assert.equal((await request(`/api/partners/${carrierJson.partner.id}`, 'DELETE', undefined, 'admin-fixture')).status, 200);

  const piResp = await request('/api/paketindex', 'PUT', { totalParcelsMillions: 64.5 }, 'admin-fixture');
  assert.equal(piResp.status, 200);
  assert.equal((await piResp.json()).totalParcelsMillions, 64.5);

  const pagesResp = await request('/api/pages', 'PUT', {
    kontakt: { ...snapshot.pageContent.kontakt, contactEmail: 'redaktion@sverigesehandel.se' },
  }, 'admin-fixture');
  assert.equal(pagesResp.status, 200);
  assert.equal((await pagesResp.json()).kontakt.contactEmail, 'redaktion@sverigesehandel.se');

  const tlResp = await request('/api/timeline', 'POST', { era: '20s', year: '2027', badge: 'Test', title: 'Test Milestone', desc: 'Test', stack: 'AI' }, 'admin-fixture');
  assert.equal(tlResp.status, 201);
  const tlItem = await tlResp.json();
  assert.equal((await request(`/api/timeline/${tlItem.id}`, 'DELETE', undefined, 'admin-fixture')).status, 200);

  const partnerDirectResp = await request(
    '/api/partners',
    'POST',
    {
      name: 'Direct Intro Partner',
      subType: 'Betalning (PSP)',
      introEmail: 'partner-secret@example.invalid',
      introRoutingMode: 'direct',
    },
    'admin-fixture'
  );
  assert.equal(partnerDirectResp.status, 201);
  const partnerDirectJson = await partnerDirectResp.json();
  const publicAfterPartner = await (await request('/api/cms/store')).json();
  const publicPartner = publicAfterPartner.partners.find(
    (p: { id: string }) => p.id === partnerDirectJson.partner.id
  );
  assert.equal(publicPartner.hasDirectIntroEmail, true);
  assert.equal(publicPartner.introEmail, undefined, 'introEmail must not leak in public store');

  const formCreateResp = await request(
    '/api/forms',
    'POST',
    {
      name: 'Marknad Mid Form',
      purpose: 'intro',
      page: 'marknad',
      position: 'mid',
      active: true,
      theme: 'navy',
      kicker: 'Test',
      title: 'Testformulär',
      subtitle: 'Beskrivning',
      submitLabel: 'Skicka',
      successMessage: 'Klar',
      routingMode: 'custom-email',
      recipientEmail: 'secret-form-recipient@example.invalid',
      fields: [],
    },
    'admin-fixture'
  );
  assert.equal(formCreateResp.status, 201);
  const createdForm = await formCreateResp.json();
  const publicFormsResp = await (await request('/api/cms/store')).json();
  const publicForm = publicFormsResp.contactForms.find(
    (f: { id: string }) => f.id === createdForm.id
  );
  assert.ok(publicForm);
  assert.equal(publicForm.recipientEmail, '', 'recipientEmail must be stripped in public store');
  assert.equal(
    (await request(`/api/forms/${createdForm.id}`, 'PUT', { ...createdForm, active: false }, 'admin-fixture')).status,
    200
  );
  const publicFormsAfterPause = await (await request('/api/cms/store')).json();
  assert.ok(
    !publicFormsAfterPause.contactForms.some((f: { id: string }) => f.id === createdForm.id),
    'Paused forms must not be returned publicly'
  );
  assert.equal((await request(`/api/forms/${createdForm.id}`, 'DELETE', undefined, 'admin-fixture')).status, 200);

  assert.equal((await request('/api/contact', 'POST', {})).status, 401);
  assert.equal((await request('/api/contact', 'POST', {}, 'unverified-fixture')).status, 403);
  assert.equal((await request('/api/contact', 'POST', { name: {}, email: 'x', topic: 'x', message: 'x' }, 'member-fixture')).status, 400);
  const directContactResp = await request('/api/contact', 'POST', {
    name: 'Visitor',
    email: 'visitor@example.invalid',
    topic: 'Test',
    message: 'Hello',
    formId: 'form-intro-default',
    submissionType: 'intro',
    targetEntityType: 'partner',
    targetEntityId: partnerDirectJson.partner.id,
    targetEntityName: 'Direct Intro Partner',
    needSummary: 'Byta kassa',
    monthlyVolume: '2 500 – 10 000 paket/mån',
  }, 'member-fixture');
  assert.equal(directContactResp.status, 201);
  const savedDirectContact = await directContactResp.json();
  assert.equal(savedDirectContact.routingMode, 'direct-partner');
  assert.equal(savedDirectContact.routedToEmail, 'partner-secret@example.invalid');
  assert.equal(savedDirectContact.status, 'new');
  assert.equal(
    (await request(`/api/contact/${savedDirectContact.id}/status`, 'PUT', { status: 'forwarded' }, 'admin-fixture')).status,
    200
  );
  assert.equal(snapshot.contactMessages[0].status, 'forwarded');
  assert.equal((snapshot.contactMessages[0] as unknown as { authorUid: string }).authorUid, 'fixture-user');
  assert.equal((await request(`/api/partners/${partnerDirectJson.partner.id}`, 'DELETE', undefined, 'admin-fixture')).status, 200);
  assert.deepEqual((await (await request('/api/cms/store')).json()).contactMessages, []);
  assert.equal((await request('/api/contact', 'POST', { name: 'Visitor', email: 'visitor@example.invalid', topic: 'Test', message: 'x'.repeat(2001) }, 'member-fixture')).status, 400);
  const threadCreateResp = await request('/api/community/threads', 'POST', {
    channel: '#test',
    author: 'Visitor',
    title: 'Fixture thread',
    body: 'Fördjupande kontext i tråden.',
  }, 'member-fixture');
  assert.equal(threadCreateResp.status, 201);
  const createdThread = await threadCreateResp.json();
  assert.equal(createdThread.body, 'Fördjupande kontext i tråden.');

  assert.equal((await request(`/api/community/threads/${createdThread.id}/comments`, 'POST', {
    author: 'Kommentator',
    body: 'Bra inspel kring fraktpriser.',
  })).status, 401);
  const commentResp = await request(`/api/community/threads/${createdThread.id}/comments`, 'POST', {
    author: 'Kommentator',
    body: 'Bra inspel kring fraktpriser.',
  }, 'member-two');
  assert.equal(commentResp.status, 201);
  const commentedThread = await commentResp.json();
  assert.equal(commentedThread.replies, 1);
  assert.equal(commentedThread.comments.length, 1);

  const memberResp = await request('/api/community/members', 'POST', {
    name: 'Maja',
    email: 'maja@example.invalid',
    memberType: 'E-handlare / Butik',
    role: 'E-handlare / Grundare',
    city: 'Göteborg / Borås',
    company: 'Majas E-handel AB',
    website: 'majashandel.se',
    annualOrders: '25 000 – 100 000 paket/år',
    platform: 'Shopify',
    interests: ['Benchmark-rapporter', 'Frakt & 3PL'],
  }, 'member-fixture');
  assert.equal(memberResp.status, 201);
  const createdMember = await memberResp.json();
  assert.equal(createdMember.company, 'Majas E-handel AB');
  assert.equal(createdMember.memberType, 'E-handlare / Butik');
  assert.equal(createdMember.verificationStatus, 'pending');

  const carrierMemberResp = await request('/api/community/members', 'POST', {
    name: 'Kalle',
    email: 'two@example.invalid',
    memberType: 'Transportör / Logistik / 3PL',
    role: 'Logistikchef / 3PL-ansvarig',
    city: 'Stockholm / Uppsala',
    company: 'Nordic Parcel AB',
    website: 'nordicparcel.se',
    serviceFocus: '3PL / Lagerhotell & AutoStore',
    platform: 'Flera plattformar (Plattformsoberoende)',
  }, 'member-two');
  assert.equal(carrierMemberResp.status, 201);
  const createdCarrierMember = await carrierMemberResp.json();
  assert.equal(createdCarrierMember.memberType, 'Transportör / Logistik / 3PL');
  assert.equal(createdCarrierMember.serviceFocus, '3PL / Lagerhotell & AutoStore');

  assert.equal(
    (await request(`/api/community/members/${createdMember.id}/status`, 'PUT', { verificationStatus: 'verified' }, 'admin-fixture')).status,
    200
  );

  // Member directory & DM endpoints require verified login and never leak private emails
  assert.equal((await request('/api/community/directory')).status, 401);
  assert.equal((await request('/api/community/directory', 'GET', undefined, 'unverified-fixture')).status, 403);
  const dirResp = await request('/api/community/directory', 'GET', undefined, 'member-fixture');
  assert.equal(dirResp.status, 200);
  const dirData = await dirResp.json();
  assert.ok(dirData.members.some((m: { id: string }) => m.id === createdCarrierMember.id));
  assert.ok(dirData.members.every((m: Record<string, unknown>) => m.email === undefined && m.linkedinUrl === undefined), 'Directory must never expose email or linkedinUrl');

  assert.equal((await request('/api/community/messages')).status, 401);
  const dmSendResp = await request('/api/community/messages', 'POST', {
    recipientMemberId: createdCarrierMember.id,
    subject: 'Fråga om 3PL-kapacitet',
    body: 'Hej Kalle, tar ni in nya Shopify-handlare i Q2?',
  }, 'member-fixture');
  assert.equal(dmSendResp.status, 201);
  const sentDm = await dmSendResp.json();
  assert.equal(sentDm.recipientMemberId, createdCarrierMember.id);

  // Sender cannot mark recipient's incoming message as read; recipient can
  assert.equal((await request(`/api/community/messages/${sentDm.id}/read`, 'PUT', {}, 'member-fixture')).status, 403);
  const twoInbox = await (await request('/api/community/messages', 'GET', undefined, 'member-two')).json();
  assert.equal(twoInbox.messages.length, 1);
  const readResp = await request(`/api/community/messages/${sentDm.id}/read`, 'PUT', {}, 'member-two');
  assert.equal(readResp.status, 200);
  assert.equal((await readResp.json()).read, true);

  const updatedPublic = await (await request('/api/cms/store')).json();
  assert.deepEqual(updatedPublic.communityMembers, []);
  assert.deepEqual(updatedPublic.directMessages, []);
  const publicCommentedThread = updatedPublic.communityThreads.find((t: { id: string }) => t.id === createdThread.id);
  assert.equal(publicCommentedThread.authorUid, undefined, 'Public threads must strip authorUid');
  assert.equal(publicCommentedThread.comments[0].authorUid, undefined, 'Public comments must strip authorUid');
  assert.equal(updatedPublic.communityMemberCount, 3);
  assert.equal(updatedPublic.communityVerifiedCount, 1);
  assert.deepEqual(updatedPublic.communityMemberCities, ['Stockholm / Uppsala', 'Göteborg / Borås', 'Test']);
  assert.ok(transactions >= 3, 'Writes must pass through Firestore transactions');
  const contactCount = snapshot.contactMessages.length;
  const isolated = operations.withStore(snapshot, () => operations.resetStore());
  assert.deepEqual(isolated.value.contactMessages, []);
  assert.equal(snapshot.contactMessages.length, contactCount, 'Transaction model must not mutate its input');
  const left = operations.withStore(snapshot, () => operations.upsertMerchant({ name: 'Left' }));
  const right = operations.withStore(snapshot, () => operations.upsertMerchant({ name: 'Right' }));
  assert.ok(!left.store.merchants.some((item) => item.name === 'Right'));
  assert.ok(!right.store.merchants.some((item) => item.name === 'Left'));
  assert.ok(validateSnapshot(snapshot));
  assert.ok(!validateSnapshot({ merchants: [], partners: [] }));
  assert.throws(() => encodeStore({ ...snapshot, updatedAt: 'x'.repeat(900_001) }), /safety limit/);
  // Legacy admin backups also use the same migration without discarding private data.
  const backup = structuredClone(snapshot) as Partial<typeof snapshot>;
  delete backup.logisticsProviders;
  const imported = await request('/api/cms/import', 'POST', backup, 'admin-fixture');
  assert.equal(imported.status, 200);
  const restored = await imported.json();
  assert.deepEqual(restored.logisticsProviders, INITIAL_CMS_DATA.logisticsProviders);
  assert.deepEqual(restored.contactMessages, backup.contactMessages);
  // A missing snapshot starts from editorial seed without persisting on read.
  exists = false;
  const writesBeforeSeedRead = transactions;
  const seed = await service.getStore();
  assert.deepEqual(seed.contactMessages, []);
  assert.deepEqual(seed.communityMembers, []);
  assert.equal(transactions, writesBeforeSeedRead);
  await service.upsertMerchant({ name: 'First persisted entry' });
  assert.ok(exists);
  assert.ok((await service.getStore()).merchants.some((item) => item.name === 'First persisted entry'));
  // Async Express failures must yield JSON rather than hang or crash the process.
  service.getStore = async () => { throw new Error('Fixture storage unavailable'); };
  const unavailable = await request('/api/cms/store');
  assert.equal(unavailable.status, 503);
  assert.match((await unavailable.json()).error, /Firebase/);
  console.log('CMS checks passed: JSON route, admin guards, private data, writes/reload/delete, isolated snapshots, size guard, async errors.');
} finally {
  server.closeAllConnections();
  await Promise.race([
    new Promise<void>((resolve) => server.close(() => resolve())),
    new Promise<void>((resolve) => setTimeout(resolve, 250)),
  ]);
}
process.exit(0);
