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
const app = createCmsApp(service, async (identity) => {
  if (identity === 'invalid-fixture') throw new Error('Invalid fixture identity');
  if (identity === 'member-two') {
    return { uid: 'fixture-user-two', email: 'two@example.invalid', verified: true, admin: false };
  }
  return { uid: 'fixture-user', email: 'fixture@example.invalid', verified: identity !== 'unverified-fixture', admin: identity === 'admin-fixture' };
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
  const currentSnapshot = structuredClone(snapshot);
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
  const empty = { ...currentSnapshot, logisticsProviders: [], schemaVersion: 4 };
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
