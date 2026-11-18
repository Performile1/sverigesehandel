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

export async function ensureUserProfile(user: User): Promise<void> {
  if (!user.emailVerified) return;
  const uid = sanitizeFirestoreId(user.uid);
  const userPath = `users/${uid}`;
  const privatePath = `users/${uid}/private/info`;

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
      await updateDoc(userRef, {
        displayName,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, userPath);
  }

  try {
    const privateRef = doc(db, 'users', uid, 'private', 'info');
    await setDoc(privateRef, {
      uid,
      email: sanitizeBoundedString(user.email, BLUEPRINT_LIMITS.emailMax, 'user@example.se'),
      updatedAt: serverTimestamp(),
    });
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
