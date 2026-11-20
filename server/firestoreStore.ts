import * as operations from './store.ts';
import type { CMSStore } from '../src/types.ts';
import { INITIAL_CMS_DATA } from './seedData.ts';
import { upgradeSnapshot, validateSnapshot } from './snapshot.ts';
import { cmsFirestore } from './firebaseAdmin.ts';

type Operations = Omit<typeof operations, 'withStore'>;
export type CmsDataStore = {
  [K in keyof Operations]: (...args: Parameters<Operations[K]>) => Promise<ReturnType<Operations[K]>>;
};

function initialStore(): CMSStore {
  // Never import sample or historic private submissions into the hosted CMS.
  return upgradeSnapshot({ ...structuredClone(INITIAL_CMS_DATA), contactMessages: [], communityMembers: [], directMessages: [] }) as CMSStore;
}

// Persist as JSON to preserve the existing model (including arrays) without
// Firestore indexing every CMS field. Transactions prevent lost concurrent edits.
export function encodeStore(store: CMSStore) {
  const payload = JSON.stringify(store);
  if (Buffer.byteLength(payload, 'utf8') > 900_000) {
    throw Object.assign(new Error('CMS snapshot exceeds the 900 KB safety limit; split into entity collections before growing further.'), { status: 413 });
  }
  return { payload };
}

function decodeStore(payload: unknown): CMSStore {
  const parsed = upgradeSnapshot(JSON.parse(String(payload)));
  if (!validateSnapshot(parsed)) throw new Error('Invalid CMS snapshot');
  return parsed;
}

export function createLocalCmsStore(): CmsDataStore {
  const service: Record<string, (...args: unknown[]) => Promise<unknown>> = {};
  for (const [name, operation] of Object.entries(operations)) {
    if (name === 'withStore') continue;
    service[name] = async (...args: unknown[]) =>
      (operation as (...args: unknown[]) => unknown)(...args);
  }
  return service as CmsDataStore;
}

export function createFirestoreStore(getDatabase = cmsFirestore): CmsDataStore {
  const service: Record<string, (...args: unknown[]) => Promise<unknown>> = {};
  for (const [name, operation] of Object.entries(operations)) {
    if (name === 'withStore') continue;
    service[name] = async (...args: unknown[]) => {
      // Lazy initialization allows a preview to build without server credentials.
      const db = getDatabase();
      const ref = db.doc('cmsSnapshots/main');
      if (name === 'getStore') {
        const snapshot = await ref.get();
        return snapshot.exists ? decodeStore(snapshot.get('payload')) : initialStore();
      }
      return db.runTransaction(async (transaction) => {
        const snapshot = await transaction.get(ref);
        const current = snapshot.exists ? decodeStore(snapshot.get('payload')) : initialStore();
        const result = operations.withStore(current, () =>
          (operation as (...args: unknown[]) => unknown)(...args));
        if (result.changed) transaction.set(ref, encodeStore(result.store));
        return result.value;
      });
    };
  }
  return service as CmsDataStore;
}
