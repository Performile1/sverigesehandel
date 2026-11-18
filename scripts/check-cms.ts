import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import { createCmsApp } from '../server/app.ts';
import { createFirestoreStore, encodeStore } from '../server/firestoreStore.ts';
import { INITIAL_CMS_DATA } from '../server/seedData.ts';
import * as operations from '../server/store.ts';
import { resolveCmsIdentity } from '../server/authPolicy.ts';
import { ADMIN_EMAIL } from '../shared/firebaseSettings.ts';
import { validateSnapshot } from '../server/snapshot.ts';
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
  assert.deepEqual(publicData.contactMessages, []);
  assert.deepEqual(publicData.communityMembers, []);
  assert.ok(!publicData.merchants.some((item: { id: string }) => item.id === draftId));
  assert.equal(snapshot.contactMessages.length, 1, 'Public filtering must not mutate stored data');
  const beforeDenied = calls;
  for (const [path, method] of [
    ['/api/merchants', 'POST'], ['/api/merchants/item', 'PUT'], ['/api/partners/item', 'DELETE'],
    ['/api/cms/import', 'POST'], ['/api/cms/reset', 'POST'], ['/api/ai/discover', 'POST'],
    ['/api/ai/enrich', 'POST'], ['/api/jobs/validate', 'POST'], ['/api/contact/item', 'DELETE'],
  ]) {
    assert.equal((await request(path, method, {})).status, 401, `${method} ${path}`);
    assert.equal((await request(path, method, {}, 'member-fixture')).status, 403);
  }
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
  assert.equal((await request('/api/contact', 'POST', {})).status, 401);
  assert.equal((await request('/api/contact', 'POST', {}, 'unverified-fixture')).status, 403);
  assert.equal((await request('/api/contact', 'POST', { name: {}, email: 'x', topic: 'x', message: 'x' }, 'member-fixture')).status, 400);
  assert.equal((await request('/api/contact', 'POST', {
    name: 'Visitor', email: 'visitor@example.invalid', topic: 'Test', message: 'Hello',
  }, 'member-fixture')).status, 201);
  assert.equal((snapshot.contactMessages[0] as unknown as { authorUid: string }).authorUid, 'fixture-user');
  assert.deepEqual((await (await request('/api/cms/store')).json()).contactMessages, []);
  assert.equal((await request('/api/contact', 'POST', { name: 'Visitor', email: 'visitor@example.invalid', topic: 'Test', message: 'x'.repeat(2001) }, 'member-fixture')).status, 400);
  assert.equal((await request('/api/community/threads', 'POST', {
    channel: '#test', author: 'Visitor', title: 'Fixture thread',
  }, 'member-fixture')).status, 201);
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
  await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
}
