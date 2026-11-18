import { type ReactNode } from 'react';
import { useFirebase } from '../contexts/FirebaseContext';

export function CMSAccess({ isAdmin, children }: { isAdmin: boolean; children: ReactNode }) {
  const { user, authReady, signingIn, signInWithGoogle } = useFirebase();
  if (!authReady) return <p className="p-6 text-center">Kontrollerar inloggning…</p>;
  if (isAdmin) return <>{children}</>;

  return <section className="max-w-md mx-auto my-12 bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
    <h1 className="text-xl font-bold">Logga in i CMS</h1>
    <p className="text-sm text-slate-600">Endast verifierade administratörer får ändra innehåll.</p>
    {user && <p role="alert" className="text-sm text-amber-800">
      Kontot saknar CMS-behörighet. Be projektägaren kontrollera administratörsregistret.
    </p>}
    <button type="button" className="w-full rounded-lg bg-[#040B16] p-3 text-white font-semibold cursor-pointer disabled:opacity-60"
      disabled={signingIn} onClick={() => { void signInWithGoogle(); }}>
      {signingIn ? 'Loggar in…' : 'Logga in med Google'}
    </button>
  </section>;
}
