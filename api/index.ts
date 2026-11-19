import { createCmsApp } from '../server/app.ts';
import { createFirestoreStore, createLocalCmsStore } from '../server/firestoreStore.ts';
import { hasExplicitAdminCredentials, verifyCmsToken } from '../server/firebaseAdmin.ts';

const store = hasExplicitAdminCredentials() || process.env.USE_FIRESTORE_ADMIN === 'true'
  ? createFirestoreStore()
  : createLocalCmsStore();

export default createCmsApp(store, verifyCmsToken);
