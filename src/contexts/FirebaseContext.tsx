import { completeTotpChallenge } from '../../shared/totpChallenge';
import { requestEmailLogin, completeEmailLogin, emailCallbackLocation } from '../../shared/emailAuthFlow';
import { SignInDialog } from '../components/SignInDialog';
import { authProviderOptions, normalizeLoginEmail, loginErrorMessage } from '../../shared/authOptions';
import {
  getMultiFactorResolver, TotpMultiFactorGenerator, type MultiFactorError, type MultiFactorResolver,
  FacebookAuthProvider, OAuthProvider, sendSignInLinkToEmail, isSignInWithEmailLink, signInWithEmailLink, sendEmailVerification, reload,
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
  useRef,
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
  requestSignIn: () => void;
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

const formatAuthError=loginErrorMessage;
const providerOptions=authProviderOptions(import.meta.env);

export function FirebaseProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setAdmin] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [savedSessionIds, setSavedSessionIds] = useState<string[]>([]);
  const [showSignIn,setShowSignIn]=useState(false);
  const [pendingEmailLink,setPendingEmailLink]=useState<string|null>(null);
  const [mfaResolver,setMfaResolver]=useState<MultiFactorResolver|null>(null);
  const captureMfa=useCallback((err:unknown)=>{if((err as {code?:string})?.code!=='auth/multi-factor-auth-required')return false;setMfaResolver(getMultiFactorResolver(auth,err as MultiFactorError));setShowSignIn(true);setAuthError(null);return true;},[]);
  const authAttempt=useRef(false);
  const requestSignIn=useCallback(()=>{setAuthError(null);setShowSignIn(true);},[]);
  useEffect(()=>{
    const callback=emailCallbackLocation(window.location.href,(href)=>isSignInWithEmailLink(auth,href));
    if(callback){
      setPendingEmailLink(callback.link);setShowSignIn(true);
      // Keep the one-time code only in component memory, not URL/history/logs/storage.
      window.history.replaceState(null,'',callback.cleanPath);
    }
  },[]);


  useEffect(() => {
    let active = true;
    void getRedirectResult(auth).catch((err) => {
      if (active&&!captureMfa(err)) setAuthError(formatAuthError(err));
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
      if(nextUser?.emailVerified&&!admin){
        try{const token=await nextUser.getIdToken();const response=await fetch('/api/access/me',{headers:{Authorization:`Bearer ${token}`}});if(response.ok){const access=await response.json();admin=Array.isArray(access.roles)&&access.roles.includes('admin');}}catch{admin=false;}
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
    if(authAttempt.current)return;authAttempt.current=true;
    setSigningIn(true);
    setAuthError(null);
    try {
      await signInWithRedirect(auth, googleProvider);
    } catch (err) {
      if(!captureMfa(err))setAuthError(formatAuthError(err));
      setSigningIn(false);authAttempt.current=false;
    }
  }, []);

  const signInWithGoogle = useCallback(async () => {
    if(authAttempt.current)return null;authAttempt.current=true;
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
      setShowSignIn(false);
      return result.user;
    } catch (err) {
      if(captureMfa(err))return null;
      const code = (err as { code?: string })?.code;
      if (code === 'auth/popup-blocked' || code === 'auth/operation-not-supported-in-this-environment') {
        try {
          await signInWithRedirect(auth, googleProvider);
          return null;
        } catch (redirectErr) {
          if(!captureMfa(redirectErr))setAuthError(formatAuthError(redirectErr));
          return null;
        }
      }
      setAuthError(formatAuthError(err));
      return null;
    } finally {
      setSigningIn(false);authAttempt.current=false;
    }
  }, []);

  const emailSignIn=async(rawEmail:string,complete:boolean):Promise<boolean>=>{
    if(authAttempt.current)return false;
    let email:string;try{email=normalizeLoginEmail(rawEmail);}catch{setAuthError('Ange en giltig e-postadress.');return false;}
    authAttempt.current=true;setSigningIn(true);setAuthError(null);
    try{
      if(complete){
        if(!pendingEmailLink)throw new Error('No pending link');
        await completeEmailLogin(email,pendingEmailLink,(address,link)=>signInWithEmailLink(auth,address,link));
        setPendingEmailLink(null);setShowSignIn(false);
      }else{
        if(!providerOptions.email)throw new Error('Disabled');
        await requestEmailLogin(email,window.location.origin,(address,settings)=>sendSignInLinkToEmail(auth,address,settings));
      }
      return true;
    }catch(error){if(!captureMfa(error))setAuthError(formatAuthError(error));return false;}
    finally{authAttempt.current=false;setSigningIn(false);}
  };
  const socialSignIn=async(kind:'facebook'|'linkedin')=>{
    if(authAttempt.current)return;authAttempt.current=true;setSigningIn(true);setAuthError(null);
    try{
      if((kind==='facebook'&&!providerOptions.facebook)||(kind==='linkedin'&&!providerOptions.linkedin))throw new Error('Disabled provider');
      const provider=kind==='facebook'?new FacebookAuthProvider():new OAuthProvider(providerOptions.linkedin);
      provider.addScope('email');if(kind==='linkedin')provider.addScope('profile');
      const result=await signInWithPopup(auth,provider);setShowSignIn(!result.user.emailVerified);
    }catch(error){if(!captureMfa(error))setAuthError(formatAuthError(error));}
    finally{authAttempt.current=false;setSigningIn(false);}
  };
  const verifyCurrentEmail=async()=>{
    if(authAttempt.current||!auth.currentUser||auth.currentUser.emailVerified)return false;
    authAttempt.current=true;setSigningIn(true);setAuthError(null);
    try{await sendEmailVerification(auth.currentUser);return true;}
    catch(error){setAuthError(formatAuthError(error));return false;}
    finally{authAttempt.current=false;setSigningIn(false);}
  };
  const reloadVerification=async()=>{
    if(!auth.currentUser||authAttempt.current)return;authAttempt.current=true;setSigningIn(true);setAuthError(null);
    try{await reload(auth.currentUser);await auth.currentUser.getIdToken(true);if(auth.currentUser.emailVerified)setShowSignIn(false);else setAuthError('Adressen är fortfarande inte verifierad. Öppna länken i verifieringsmejlet först.');}
    catch(error){setAuthError(formatAuthError(error));}
    finally{authAttempt.current=false;setSigningIn(false);}
  };

  const signOutUser = useCallback(async () => {
    setMfaResolver(null);setAuthError(null);
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
        requestSignIn,
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
      {showSignIn&&<SignInDialog busy={signingIn} error={authError} user={user}
        mfa={mfaResolver?{factors:mfaResolver.hints.filter(f=>f.factorId===TotpMultiFactorGenerator.FACTOR_ID).map(f=>({uid:f.uid,name:f.displayName||'Autentiseringsapp'})),onCancel:()=>{setMfaResolver(null);setAuthError(null);},onComplete:async(uid,code)=>{
          if(authAttempt.current||!mfaResolver.hints.some(f=>f.uid===uid&&f.factorId===TotpMultiFactorGenerator.FACTOR_ID))return;
          authAttempt.current=true;setSigningIn(true);setAuthError(null);
          try{await completeTotpChallenge(mfaResolver.hints,uid,code,(factor,value)=>mfaResolver.resolveSignIn(TotpMultiFactorGenerator.assertionForSignIn(factor,value)));setMfaResolver(null);setPendingEmailLink(null);setShowSignIn(false);}catch{setAuthError('2FA kunde inte verifieras. Kontrollera koden och enhetens tid, eller starta om inloggningen.');}finally{authAttempt.current=false;setSigningIn(false);}
        }}:undefined}
        emailEnabled={providerOptions.email} facebookEnabled={providerOptions.facebook} linkedinEnabled={Boolean(providerOptions.linkedin)}
        pendingEmailLink={Boolean(pendingEmailLink)} onClose={()=>{if(!signingIn){setMfaResolver(null);setShowSignIn(false);}}}
        onGoogle={()=>void signInWithGoogle()} onGoogleRedirect={()=>void signInWithGoogleRedirect()}
        onSocial={(kind)=>void socialSignIn(kind)} onEmail={emailSignIn} onVerify={verifyCurrentEmail}
        onReload={reloadVerification} onDiscardLink={()=>{setPendingEmailLink(null);setAuthError(null);}}/>}
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
