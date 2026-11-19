import { type ReactNode } from 'react';
import { useFirebase } from '../contexts/FirebaseContext';

export function CMSAccess({ isAdmin, children }: { isAdmin: boolean; children: ReactNode }) {
  const {
    user,
    authReady,
    signingIn,
    authError,
    signInWithGoogle,
    signInWithGoogleRedirect,
    signOutUser,
  } = useFirebase();

  if (!authReady) return <p className="p-6 text-center text-sm text-slate-600">Kontrollerar inloggning…</p>;
  if (isAdmin) return <>{children}</>;

  const hostname = typeof window !== 'undefined' ? window.location.hostname : '';

  return (
    <section className="max-w-md mx-auto my-12 bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
      <div>
        <h1 className="font-display text-xl font-bold text-[#040B16]">Logga in i CMS</h1>
        <p className="text-sm text-slate-600 mt-1">
          Endast verifierade administratörer får ändra innehåll på sverigesehandel.se.
        </p>
      </div>

      {authError && (
        <div
          role="alert"
          className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800 leading-relaxed"
        >
          {authError}
        </div>
      )}

      {user && (
        <div
          role="alert"
          className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-2"
        >
          <p>
            Inloggad som <strong>{user.email}</strong>, men kontot saknar CMS-behörighet i administratörsregistret.
          </p>
          <button
            type="button"
            onClick={() => { void signOutUser(); }}
            className="font-bold underline text-[#040B16] cursor-pointer"
          >
            Logga ut och byt Google-konto
          </button>
        </div>
      )}

      <div className="space-y-2">
        <button
          type="button"
          className="w-full rounded-xl bg-[#040B16] hover:bg-[#006AA7] p-3 text-white text-sm font-bold cursor-pointer disabled:opacity-60 transition-colors"
          disabled={signingIn}
          onClick={() => { void signInWithGoogle(); }}
        >
          {signingIn ? 'Loggar in…' : 'Logga in med Google'}
        </button>

        <button
          type="button"
          className="w-full rounded-xl border border-slate-200 hover:bg-slate-50 py-2.5 px-3 text-slate-700 text-xs font-semibold cursor-pointer disabled:opacity-60 transition-colors"
          disabled={signingIn}
          onClick={() => { void signInWithGoogleRedirect(); }}
        >
          Föredrar omdirigering (om popup blockeras)
        </button>
      </div>

      {hostname && hostname !== 'localhost' && hostname !== '127.0.0.1' && (
        <p className="text-[11px] text-slate-500 pt-2 border-t border-slate-100 leading-relaxed">
          Tips vid driftsättning på <span className="font-mono">{hostname}</span>: domänen måste finnas i Firebase Console under <strong>Authorized domains</strong> och{' '}
          <span className="font-mono">FIREBASE_CLIENT_EMAIL</span> / <span className="font-mono">FIREBASE_PRIVATE_KEY</span> behöver vara satta i Vercel för databaslagring.
        </p>
      )}
    </section>
  );
}
