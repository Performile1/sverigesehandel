import { useState } from 'react';
import { multiFactor, TotpMultiFactorGenerator, type TotpSecret } from 'firebase/auth';
import { auth } from '../firebase';
export function TotpEnrollment(){
  const [secret,setSecret]=useState<TotpSecret|null>(null),[code,setCode]=useState(''),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
  const enrolled=auth.currentUser?multiFactor(auth.currentUser).enrolledFactors.some(f=>f.factorId==='totp'):false;
  return <section className="border-t pt-3 space-y-3"><h3 className="font-bold">Tvåfaktorsautentisering (2FA)</h3>
    <p className="text-sm">Använd en autentiseringsapp. Registrering kräver nylig verifierad inloggning och aktiverat TOTP i Firebase. Ingen nyckel eller kod sparas i CMS.</p>
    {enrolled?<p>Autentiseringsapp registrerad. Logga ut och in igen med appkoden före säkerhetsåtgärder.</p>:<>
      <button className="border rounded-lg p-2" type="button" disabled={busy||!!secret} onClick={async()=>{if(!auth.currentUser?.emailVerified)return;setBusy(true);setMessage('');try{const session=await multiFactor(auth.currentUser).getSession();setSecret(await TotpMultiFactorGenerator.generateSecret(session));}catch{setMessage('Kunde inte starta 2FA. Logga in på nytt. Om problemet kvarstår behöver administratören kontrollera Firebase TOTP-konfigurationen.');}finally{setBusy(false);}}}>Lägg till autentiseringsapp</button>
      {secret&&<form className="space-y-3" onSubmit={async e=>{e.preventDefault();if(!auth.currentUser||busy)return;setBusy(true);setMessage('');try{await multiFactor(auth.currentUser).enroll(TotpMultiFactorGenerator.assertionForEnrollment(secret,code),'Autentiseringsapp');setSecret(null);setCode('');await auth.currentUser.getIdToken(true);setMessage('2FA registrerad. Logga ut och in på nytt och ange appkoden.');}catch{setCode('');setMessage('Registreringen misslyckades. Kontrollera appkod och enhetens tid, eller logga in på nytt.');}finally{setBusy(false);}}}>
        <label className="block text-sm">Ange denna privata inställningsnyckel manuellt i autentiseringsappen. Dela den aldrig.<input className="border rounded p-2 w-full font-mono" readOnly value={secret.secretKey} autoComplete="off"/></label>
        <label className="block">Kod från autentiseringsappen<input className="block border rounded p-2 w-full" value={code} onChange={e=>setCode(e.target.value.replace(/\D/g,'').slice(0,6))} inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" required maxLength={6}/></label>
        <button className="border rounded-lg p-2" disabled={busy}>Bekräfta registrering</button><button type="button" className="border rounded-lg p-2" disabled={busy} onClick={()=>{setSecret(null);setCode('');}}>Avbryt registrering</button>
      </form>}
    </>}
    {message&&<p role="status">{message}</p>}
    <p className="text-xs">Förlorad app: kontakta Sveriges E-handel för separat identitetskontroll. E-post ensam får inte användas för att kringgå 2FA. Självbetjänad återställning ingår inte.</p>
  </section>;
}
