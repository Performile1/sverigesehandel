import { applicationDefault, cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { firebaseConfig } from '../shared/firebaseSettings.ts';
import { resolveCmsIdentity } from './authPolicy.ts';

function adminApp() {
  const existing = getApps().find((app) => app.name === 'cms');
  if (existing) return existing;
  // Use exactly the project and named database used by the browser.
  const projectId = firebaseConfig.projectId;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  if (!!clientEmail !== !!privateKey) throw new Error('Incomplete Firebase Admin credentials');
  return initializeApp({ projectId, credential: clientEmail && privateKey
    ? cert({ projectId, clientEmail, privateKey }) : applicationDefault() }, 'cms');
}

export function cmsFirestore() { return getFirestore(adminApp(), firebaseConfig.firestoreDatabaseId); }
export function cmsFirebaseAuth() { return getAuth(adminApp()); }
export async function verifyCmsToken(token: string) {
  const claims = await cmsFirebaseAuth().verifyIdToken(token, true);
  return resolveCmsIdentity(claims, async (uid) => (await cmsFirestore().doc(`admins/${uid}`).get()).exists);
}
