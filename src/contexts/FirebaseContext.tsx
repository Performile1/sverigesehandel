import {
  onIdTokenChanged,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { auth, googleProvider, db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import {
  ensureUserProfile,
  isVerifiedAdmin,
  subscribeSavedSessions,
  toggleSavedSessionInFirestore,
} from '../firebaseSync';
import type { DCSession } from '../types';

interface FirebaseContextValue {
  user: User | null;
  authReady: boolean;
  isAdmin: boolean;
  signingIn: boolean;
  authError: string | null;
  savedSessionIds: string[];
  signInWithGoogle: () => Promise<User | null>;
  signOutUser: () => Promise<void>;
  toggleSavedSession: (session: DCSession) => Promise<boolean>;
}

const FirebaseContext = createContext<FirebaseContextValue | null>(null);

export function FirebaseProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setAdmin] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [savedSessionIds, setSavedSessionIds] = useState<string[]>([]);

  useEffect(() => {
    let generation = 0;
    const unsubAuth = onIdTokenChanged(auth, async (nextUser) => {
      const current = ++generation;
      setAuthReady(false);
      setAdmin(false);
      setUser(nextUser);
      let admin = isVerifiedAdmin(nextUser);
      if (nextUser?.emailVerified && !admin) {
        try { admin = (await getDoc(doc(db, 'admins', nextUser.uid))).exists(); }
        catch { admin = false; }
      }
      if (current !== generation) return;
      setAdmin(admin);
      setAuthReady(true);
      if (nextUser && nextUser.emailVerified) {
        try {
          await ensureUserProfile(nextUser);
        } catch (err) {
          console.error('Failed to sync user profile to Firestore:', err);
        }
      } else {
        setSavedSessionIds([]);
      }
    });
    return () => { generation++; unsubAuth(); };
  }, []);

  useEffect(() => {
    if (!authReady || !user || !user.emailVerified) {
      setSavedSessionIds([]);
      return;
    }
    const unsubSessions = subscribeSavedSessions(
      user.uid,
      (ids) => setSavedSessionIds(ids),
      (err) => console.error('Firestore savedSessions listener error:', err)
    );
    return () => unsubSessions();
  }, [authReady, user]);

  const signInWithGoogle = useCallback(async () => {
    setSigningIn(true);
    setAuthError(null);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      if (result.user.emailVerified) {
        await ensureUserProfile(result.user);
      }
      return result.user;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Kunde inte logga in med Google.';
      setAuthError(message);
      return null;
    } finally {
      setSigningIn(false);
    }
  }, []);

  const signOutUser = useCallback(async () => {
    await signOut(auth);
    setSavedSessionIds([]);
  }, []);

  const toggleSavedSession = useCallback(
    async (session: DCSession): Promise<boolean> => {
      const exists = savedSessionIds.includes(session.id);
      const adding = !exists;

      if (user && user.emailVerified) {
        await toggleSavedSessionInFirestore(user.uid, session, adding);
      } else {
        setSavedSessionIds((prev) =>
          adding ? [...prev, session.id] : prev.filter((id) => id !== session.id)
        );
      }
      return adding;
    },
    [savedSessionIds, user]
  );

  return (
    <FirebaseContext.Provider
      value={{
        user,
        authReady,
        isAdmin,
        signingIn,
        authError,
        savedSessionIds,
        signInWithGoogle,
        signOutUser,
        toggleSavedSession,
      }}
    >
      {children}
    </FirebaseContext.Provider>
  );
}

export function useFirebase(): FirebaseContextValue {
  const ctx = useContext(FirebaseContext);
  if (!ctx) {
    throw new Error('useFirebase måste användas inom FirebaseProvider.');
  }
  return ctx;
}
