import { initializeApp } from 'firebase/app';
import { GoogleAuthProvider, getAuth } from 'firebase/auth';
import { doc, getDocFromServer, getFirestore } from 'firebase/firestore';
import { firebaseConfig } from '../shared/firebaseSettings';
export { ADMIN_EMAIL } from '../shared/firebaseSettings';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export const FIREBASE_PROJECT_ID = firebaseConfig.projectId;
export const FIRESTORE_DATABASE_ID = firebaseConfig.firestoreDatabaseId;

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

async function testConnection(): Promise<void> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}

testConnection();

// Synchronized verbatim with firebase-blueprint.json schema boundaries
export const BLUEPRINT_LIMITS = {
  idPattern: /^[a-zA-Z0-9_-]+$/,
  idMaxLength: 128,
  userDisplayNameMax: 80,
  userRoleMax: 80,
  userCityMax: 60,
  emailMax: 160,
  sessionTitleMax: 160,
  sessionTimeMax: 40,
  sessionStageMax: 60,
  sessionTrackMax: 60,
  merchantNameMax: 120,
  merchantDomainMax: 120,
  merchantCityMax: 80,
  merchantRegionMax: 40,
  merchantCategoryMax: 80,
  merchantRevenueMax: 60,
  merchantYoyMax: 40,
  merchantStackFieldMax: 120,
  merchantDescMax: 600,
  partnerNameMax: 120,
  partnerDomainMax: 120,
  partnerCatMax: 80,
  partnerOriginMax: 80,
  partnerStackMax: 160,
  partnerCustomerCountMax: 120,
  partnerDescMax: 600,
  bannerLabelMax: 100,
  bannerDimensionsMax: 40,
  bannerSponsorMax: 100,
  bannerKickerMax: 80,
  bannerHeadlineMax: 180,
  bannerBodyMax: 400,
  bannerCtaMax: 60,
  bannerUrlMax: 300,
  threadChannelMax: 40,
  threadAuthorMax: 80,
  threadTitleMax: 220,
  threadTimeMax: 40,
  contactNameMax: 100,
  contactCompanyMax: 120,
  contactTopicMax: 100,
  contactAdSlotMax: 100,
  contactMessageMax: 2000,
} as const;

export function sanitizeBoundedString(
  value: string | undefined | null,
  maxLen: number,
  fallback = ''
): string {
  const trimmed = (value ?? '').trim();
  if (!trimmed) return fallback.slice(0, maxLen);
  return trimmed.slice(0, maxLen);
}

export function sanitizeFirestoreId(raw: string): string {
  const cleaned = raw.replace(/[^a-zA-Z0-9_-]/g, '-').replace(/-+/g, '-');
  const safe = cleaned.slice(0, BLUEPRINT_LIMITS.idMaxLength);
  if (!safe || !BLUEPRINT_LIMITS.idPattern.test(safe)) {
    return `id-${Date.now()}`;
  }
  return safe;
}
