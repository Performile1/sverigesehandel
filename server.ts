import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import { createServer as createViteServer } from 'vite';
import { createCmsApp } from './server/app.ts';
import { createFirestoreStore, createLocalCmsStore } from './server/firestoreStore.ts';
import { hasExplicitAdminCredentials, verifyCmsToken } from './server/firebaseAdmin.ts';

const store = hasExplicitAdminCredentials() || process.env.USE_FIRESTORE_ADMIN === 'true'
  ? createFirestoreStore()
  : createLocalCmsStore();

const app = createCmsApp(store, verifyCmsToken);
if (process.env.NODE_ENV !== 'production') {
  const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
  app.use(vite.middlewares);
} else {
  const distDir = path.resolve('dist');
  app.use(express.static(distDir));
  app.get('*', (_req, res) => { res.sendFile(path.join(distDir, 'index.html')); });
}
app.listen(Number(process.env.PORT || 3000), '0.0.0.0');
