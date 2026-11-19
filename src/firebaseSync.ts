import type { User } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  type Unsubscribe,
} from 'firebase/firestore';
import {
  ADMIN_EMAIL,
  BLUEPRINT_LIMITS,
  OperationType,
  db,
  handleFirestoreError,
  sanitizeBoundedString,
  sanitizeFirestoreId,
} from './firebase';
import type { DCSession } from './types';

export function isVerifiedAdmin(user: User | null): boolean {
  return Boolean(user && user.emailVerified && user.email === ADMIN_EMAIL);
}

const EXPECTED_USER_KEYS = ['uid', 'displayName', 'role', 'city', 'createdAt', 'updatedAt'] as const;
const EXPECTED_PRIVATE_KEYS = ['uid', 'email', 'updatedAt'] as const;

function hasExactKeys(data: Record<string, unknown>, keys: readonly string[]): boolean {
  const actualKeys = Object.keys(data);
  return actualKeys.length === keys.length && keys.every((k) => Object.prototype.hasOwnProperty.call(data, k));
}

function isFirestoreTimestamp(val: unknown): boolean {
  return Boolean(val && typeof val === 'object' && typeof (val as { toMillis?: unknown }).toMillis === 'function');
}

export async function ensureUserProfile(user: User): Promise<void> {
  if (!user.emailVerified) return;
  const uid = sanitizeFirestoreId(user.uid);
  const userPath = `users/${uid}`;
  const privatePath = `users/${uid}/private/info`;

  let profileReady = false;
  try {
    const userRef = doc(db, 'users', uid);
    const snap = await getDoc(userRef);
    const displayName = sanitizeBoundedString(
      user.displayName || user.email?.split('@')[0],
      BLUEPRINT_LIMITS.userDisplayNameMax,
      'Medlem'
    );

    if (!snap.exists()) {
      await setDoc(userRef, {
        uid,
        displayName,
        role: 'E-handlare / Besökare',
        city: 'Sverige',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      const existing = snap.data() as Record<string, unknown>;
      const validShape =
        hasExactKeys(existing, EXPECTED_USER_KEYS) &&
        existing.uid === uid &&
        typeof existing.displayName === 'string' &&
        typeof existing.role === 'string' &&
        existing.role.length >= 1 &&
        existing.role.length <= 80 &&
        typeof existing.city === 'string' &&
        existing.city.length >= 1 &&
        existing.city.length <= 60 &&
        isFirestoreTimestamp(existing.createdAt) &&
        isFirestoreTimestamp(existing.updatedAt);

      if (!validShape) {
        await deleteDoc(userRef);
        await setDoc(userRef, {
          uid,
          displayName,
          role: 'E-handlare / Besökare',
          city: 'Sverige',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } else if (existing.displayName !== displayName) {
        await updateDoc(userRef, {
          displayName,
          updatedAt: serverTimestamp(),
        });
      }
    }
    profileReady = true;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, userPath);
  }

  if (!profileReady) return;

  try {
    const privateRef = doc(db, 'users', uid, 'private', 'info');
    const privSnap = await getDoc(privateRef);
    const safeEmail = sanitizeBoundedString(user.email, BLUEPRINT_LIMITS.emailMax, 'user@example.se');

    if (!privSnap.exists()) {
      await setDoc(privateRef, {
        uid,
        email: safeEmail,
        updatedAt: serverTimestamp(),
      });
    } else {
      const existingPriv = privSnap.data() as Record<string, unknown>;
      const validPriv =
        hasExactKeys(existingPriv, EXPECTED_PRIVATE_KEYS) &&
        existingPriv.uid === uid &&
        typeof existingPriv.email === 'string' &&
        isFirestoreTimestamp(existingPriv.updatedAt);

      if (!validPriv) {
        await deleteDoc(privateRef);
        await setDoc(privateRef, {
          uid,
          email: safeEmail,
          updatedAt: serverTimestamp(),
        });
      } else if (existingPriv.email !== safeEmail) {
        await updateDoc(privateRef, {
          email: safeEmail,
          updatedAt: serverTimestamp(),
        });
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, privatePath);
  }
}

export function subscribeSavedSessions(
  uid: string,
  onSessions: (sessionIds: string[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const safeUid = sanitizeFirestoreId(uid);
  const path = `users/${safeUid}/savedSessions`;
  const q = query(collection(db, 'users', safeUid, 'savedSessions'));

  return onSnapshot(
    q,
    (snapshot) => {
      onSessions(snapshot.docs.map((d) => d.id));
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        if (onError) onError(wrapped as Error);
      }
    }
  );
}

export async function toggleSavedSessionInFirestore(
  uid: string,
  session: DCSession,
  isAdding: boolean
): Promise<void> {
  const safeUid = sanitizeFirestoreId(uid);
  const safeSessionId = sanitizeFirestoreId(session.id);
  const path = `users/${safeUid}/savedSessions/${safeSessionId}`;

  try {
    const ref = doc(db, 'users', safeUid, 'savedSessions', safeSessionId);
    if (isAdding) {
      await setDoc(ref, {
        uid: safeUid,
        sessionId: safeSessionId,
        title: sanitizeBoundedString(session.title, BLUEPRINT_LIMITS.sessionTitleMax, 'Session'),
        time: sanitizeBoundedString(session.time, BLUEPRINT_LIMITS.sessionTimeMax, 'Dag 1'),
        stage: sanitizeBoundedString(session.stage, BLUEPRINT_LIMITS.sessionStageMax, 'Main Stage'),
        track: sanitizeBoundedString(session.track, BLUEPRINT_LIMITS.sessionTrackMax, 'AI & Data'),
        createdAt: serverTimestamp(),
      });
    } else {
      await deleteDoc(ref);
    }
  } catch (error) {
    handleFirestoreError(error, isAdding ? OperationType.CREATE : OperationType.DELETE, path);
  }
}
