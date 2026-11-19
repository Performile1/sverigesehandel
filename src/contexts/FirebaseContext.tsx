import {
  getRedirectResult,
  onIdTokenChanged,
  signInWithPopup,
  signInWithRedirect,
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
  signInWithGoogleRedirect: () => Promise<void>;
  signOutUser: () => Promise<void>;
  toggleSavedSession: (session: DCSession) => Promise<boolean>;
}

const FirebaseContext = createContext<FirebaseContextValue | null>(null);

function formatAuthError(err: unknown): string {
  const code = (err as { code?: string })?.code;
  const host = typeof window !== 'undefined' ? window.location.hostname : 'denna domän';
  if (code === 'auth/unauthorized-domain') {
    return `Domänen "${host}" är inte godkänd i Firebase Authentication ännu. Lägg till "${host}" under Firebase Console → Authentication → Settings → Authorized domains.`;
  }
  if (code === 'auth/popup-blocked') {
    return 'Webbläsaren blockerade popup-fönstret för Google-inloggning. Försök med omdirigering nedan eller tillåt popups.';
  }
  if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
    return 'Inloggningsfönstret stängdes innan inloggningen slutfördes.';
  }
  if (code === 'auth/network-request-failed') {
    return 'Nätverksfel vid kontakt med Google/Firebase. Kontrollera uppkopplingen och försök igen.';
  }
  return err instanceof Error ? err.message : 'Kunde inte logga in med Google.';
}

export function FirebaseProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setAdmin] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [savedSessionIds, setSavedSessionIds] = useState<string[]>([]);

  useEffect(() => {
    let active = true;
    void getRedirectResult(auth).catch((err) => {
      if (active) setAuthError(formatAuthError(err));
    });
    return () => { active = false; };
  }, []);

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
          console.warn('User profile sync skipped/warning:', err);
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
      (err) => console.warn('Firestore savedSessions listener warning:', err)
    );
    return () => unsubSessions();
  }, [authReady, user]);

  const signInWithGoogleRedirect = useCallback(async () => {
    setSigningIn(true);
    setAuthError(null);
    try {
      await signInWithRedirect(auth, googleProvider);
    } catch (err) {
      setAuthError(formatAuthError(err));
      setSigningIn(false);
    }
  }, []);

  const signInWithGoogle = useCallback(async () => {
    setSigningIn(true);
    setAuthError(null);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      if (result.user.emailVerified) {
        try {
          await ensureUserProfile(result.user);
        } catch (profileErr) {
          console.warn('Profile sync warning after login:', profileErr);
        }
      }
      return result.user;
    } catch (err) {
      const code = (err as { code?: string })?.code;
      if (code === 'auth/popup-blocked' || code === 'auth/operation-not-supported-in-this-environment') {
        try {
          await signInWithRedirect(auth, googleProvider);
          return null;
        } catch (redirectErr) {
          setAuthError(formatAuthError(redirectErr));
          return null;
        }
      }
      setAuthError(formatAuthError(err));
      return null;
    } finally {
      setSigningIn(false);
    }
  }, []);

  const signOutUser = useCallback(async () => {
    setAuthError(null);
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
        signInWithGoogleRedirect,
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
