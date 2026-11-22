import { applicationDefault, cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { firebaseConfig } from '../shared/firebaseSettings.ts';
import { resolveCmsIdentity } from './authPolicy.ts';

export function normalizePrivateKey(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  let cleaned = raw.trim();
  if (
    (cleaned.startsWith('"') && cleaned.endsWith('"')) ||
    (cleaned.startsWith("'") && cleaned.endsWith("'"))
  ) {
    cleaned = cleaned.slice(1, -1);
  }
  return cleaned.replace(/\\r\\n/g, '\n').replace(/\\n/g, '\n');
}

export function cmsAdminApp() {
  const existing = getApps().find((app) => app.name === 'cms');
  if (existing) return existing;
  // Use exactly the project and named database used by the browser.
  const projectId = firebaseConfig.projectId;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim();
  const privateKey = normalizePrivateKey(process.env.FIREBASE_PRIVATE_KEY);
  if (!!clientEmail !== !!privateKey) throw new Error('Incomplete Firebase Admin credentials');
  return initializeApp({ projectId, credential: clientEmail && privateKey
    ? cert({ projectId, clientEmail, privateKey }) : applicationDefault() }, 'cms');
}

export function hasExplicitAdminCredentials() {
  return Boolean(process.env.FIREBASE_CLIENT_EMAIL?.trim() && normalizePrivateKey(process.env.FIREBASE_PRIVATE_KEY));
}

export function cmsFirestore() { return getFirestore(cmsAdminApp(), firebaseConfig.firestoreDatabaseId); }
export function cmsFirebaseAuth() { return getAuth(cmsAdminApp()); }
export async function verifyCmsToken(token: string) {
  // verifyIdToken(token) works without IAM permissions on Google-hosted Starter Tier projects.
  let claims = await cmsFirebaseAuth().verifyIdToken(token);
  // Security-sensitive MFA sessions must honor disabled accounts and token revocation.
  if(claims.firebase?.sign_in_second_factor||process.env.FIREBASE_TOTP_ENABLED==='true'||process.env.REQUIRE_PRIVILEGED_MFA==='true')claims=await cmsFirebaseAuth().verifyIdToken(token,true);
  return resolveCmsIdentity(claims, async (uid) => {
    if (!hasExplicitAdminCredentials()) return false;
    try {
      return (await cmsFirestore().doc(`admins/${uid}`).get()).exists;
    } catch {
      return false;
    }
  });
}
