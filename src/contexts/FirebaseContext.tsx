import {
  onAuthStateChanged,
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
import { auth, googleProvider } from '../firebase';
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
  const [authReady, setAuthReady] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [savedSessionIds, setSavedSessionIds] = useState<string[]>([]);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (nextUser) => {
      setUser(nextUser);
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
    return () => unsubAuth();
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
        isAdmin: isVerifiedAdmin(user),
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
