import { createCmsApp } from '../server/app.ts';
import { createFirestoreStore } from '../server/firestoreStore.ts';
import { verifyCmsToken } from '../server/firebaseAdmin.ts';

export default createCmsApp(createFirestoreStore(), verifyCmsToken);
