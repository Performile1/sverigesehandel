import { useEffect, useRef, useState } from 'react';
import type { User } from 'firebase/auth';

export interface SignInDialogProps {
  busy:boolean; error:string|null; emailEnabled:boolean; facebookEnabled:boolean; linkedinEnabled:boolean;
  pendingEmailLink:boolean; user:User|null;
  onClose:()=>void; onGoogle:()=>void; onGoogleRedirect:()=>void;
  onSocial:(provider:'facebook'|'linkedin')=>void;
  onEmail:(email:string,complete:boolean)=>Promise<boolean>;
  onVerify:()=>Promise<boolean>; onReload:()=>Promise<void>; onDiscardLink:()=>void;
}
export function SignInDialog(p:SignInDialogProps) {
  const ref=useRef<HTMLDialogElement>(null);
  const [email,setEmail]=useState('');const [notice,setNotice]=useState('');const [cooldown,setCooldown]=useState(0);
  useEffect(()=>{
    const old=document.activeElement as HTMLElement|null;ref.current?.showModal();
    return()=>{ref.current?.close();old?.focus();};
  },[]);
  useEffect(()=>{if(!cooldown)return;const timer=setTimeout(()=>setCooldown(cooldown-1),1000);return()=>clearTimeout(timer);},[cooldown]);
  return <dialog ref={ref} aria-labelledby="signin-title" className="m-auto p-0 rounded-2xl border border-slate-200 w-[90vw] max-w-md max-h-[90vh] backdrop:bg-slate-950/70"
    onCancel={(e)=>{if(p.busy)e.preventDefault();else p.onClose();}}>
    <div className="p-6 space-y-4 bg-white text-slate-900">
      <div className="flex justify-between gap-4"><h2 id="signin-title" className="text-xl font-bold">{p.pendingEmailLink?'Slutför e-postinloggning':'Registrera dig eller logga in'}</h2><button type="button" disabled={p.busy} onClick={p.onClose} aria-label="Stäng inloggning" className="px-2">✕</button></div>
      <p className="text-sm text-slate-600">E-post eller anslutet socialt konto verifierar din inloggning. Medlemsansökan och företagsåtkomst godkänns fortfarande separat av Sveriges E-handel.</p>
      {p.error&&<p role="alert" className="p-3 rounded-lg bg-red-50 text-red-800 text-sm">{p.error}</p>}
      {notice&&<p role="status" className="p-3 rounded-lg bg-blue-50 text-blue-900 text-sm">{notice}</p>}
      {p.user&&<p className="text-sm">Nuvarande konto: {p.user.email}. {p.user.emailVerified?'Verifierad adress.':'Adressen är ännu inte verifierad.'}</p>}
      {p.user&&!p.user.email&&<p role="status" className="text-sm text-amber-800">Leverantören lämnade ingen e-postadress. Använd e-postinloggning eller kontakta administratören; inget konto får medlemsåtkomst utan verifierad adress.</p>}
      {p.pendingEmailLink?<p className="text-sm">Skriv adressen som länken skickades till, även om du öppnat den på en annan enhet. Slutför bara en länk som du själv begärt. Detta kan byta nuvarande inloggade konto.</p>:<div className="space-y-2">
        <button className="w-full p-3 rounded-xl bg-slate-900 text-white disabled:opacity-50" disabled={p.busy} onClick={p.onGoogle}>Fortsätt med Google</button>
        <button className="w-full p-2 border rounded-xl text-sm" disabled={p.busy} onClick={p.onGoogleRedirect}>Google via omdirigering</button>
        {p.facebookEnabled&&<button className="w-full p-3 border rounded-xl" disabled={p.busy} onClick={()=>p.onSocial('facebook')}>Fortsätt med Facebook</button>}
        {p.linkedinEnabled&&<button className="w-full p-3 border rounded-xl" disabled={p.busy} onClick={()=>p.onSocial('linkedin')}>Fortsätt med LinkedIn</button>}
      </div>}
      {(p.emailEnabled||p.pendingEmailLink)&&<form className="space-y-3 border-t pt-4" onSubmit={async(e)=>{
        e.preventDefault();if(p.busy||(!p.pendingEmailLink&&cooldown))return;setNotice('');
        if(await p.onEmail(email,p.pendingEmailLink)){
          if(!p.pendingEmailLink){setNotice('Firebase har accepterat begäran. Kontrollera din e-post och skräppost och öppna länken för att slutföra. Det behövs inget Google-konto eller lösenord.');setCooldown(60);}
        }
      }}><label className="block text-sm font-semibold">E-postadress<input autoFocus={p.pendingEmailLink} className="block mt-1 border border-slate-300 rounded-xl p-3 w-full" type="email" required autoComplete="email" maxLength={160} value={email} onChange={(e)=>setEmail(e.target.value)} disabled={p.busy}/></label>
        <button type="submit" className="w-full p-3 rounded-xl bg-[#006AA7] text-white disabled:opacity-50" disabled={p.busy||(!p.pendingEmailLink&&cooldown>0)}>{p.busy?'Vänta…':p.pendingEmailLink?'Verifiera adress och logga in':cooldown?`Begär ny länk om ${cooldown} s`:'Registrera / logga in med e-postlänk'}</button>
        <p className="text-xs text-slate-600">Firebase skickar en tidsbegränsad inloggningslänk. Dela den inte vidare. Ingen e-postadress läggs i retur-URL:en.</p>
      </form>}
      {p.pendingEmailLink&&<button type="button" className="text-sm underline" disabled={p.busy} onClick={()=>{setNotice('Den öppnade länken är borttagen. Begär en ny nedan.');p.onDiscardLink();}}>Kasta länken / begär en ny</button>}
      {p.user&&!p.user.emailVerified&&!p.pendingEmailLink&&<div className="space-y-2 border-t pt-3">
        <button className="w-full p-2 border rounded-lg" disabled={p.busy||cooldown>0||!p.user.email} onClick={async()=>{if(await p.onVerify()){setNotice('Firebase har accepterat begäran om verifieringsmejl. Öppna mejlet och uppdatera verifieringen nedan.');setCooldown(60);}}}>Skicka verifieringsmejl till mitt konto</button>
        <button className="w-full p-2 border rounded-lg" disabled={p.busy} onClick={()=>void p.onReload()}>Jag har verifierat – uppdatera status</button>
      </div>}
    </div>
  </dialog>;
}
