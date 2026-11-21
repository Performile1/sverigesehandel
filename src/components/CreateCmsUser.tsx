import { useState } from 'react';
import { api } from '../api';
const field='block w-full mt-1 p-2 border border-slate-300 rounded-lg';
export function CreateCmsUser({onRefresh}:{onRefresh:()=>Promise<void>}) {
  const [busy,setBusy]=useState(false);const [message,setMessage]=useState('');
  return <section className="bg-white border rounded-xl p-5 space-y-3">
    <h2 className="font-bold text-xl">Lägg till användare</h2>
    <p className="text-sm">Skapa en användare i Firebase och CMS, eller registrera en redan befintlig Firebase-användare utan att ändra dess inloggning. Ingen global adminroll, företagsbehörighet eller lösenord ges här.</p>
    <p className="text-sm">Ange den Google-adress personen ska logga in med. Nya konton skapas med overifierad e-post och väntande medlemskap, dolt i medlemskatalogen. Personen måste själv logga in och verifieras. Godkänn sedan medlemskapet och koppla företaget separat nedan.</p>
    <form className="space-y-3 text-sm" onSubmit={async(e)=>{
      e.preventDefault();if(busy)return;const form=e.currentTarget;const data=new FormData(form);
      if(!window.confirm('Lägg till denna person i Firebase/CMS? Inget inbjudningsmejl skickas och inga företags-/adminrättigheter tilldelas.'))return;
      setBusy(true);setMessage('');
      try {
        const input={email:String(data.get('email')),name:String(data.get('name')),phone:String(data.get('phone')),position:String(data.get('position')),company:String(data.get('company')),employmentSince:String(data.get('since')),expertise:String(data.get('expertise'))};
        const result=await api.createCmsUser(input);
        setMessage(result.alreadyRegistered?'Användaren finns redan i CMS. Befintlig profil, status och behörigheter har inte skrivits över.':`${result.authCreated?'Nytt Firebase-konto och':'Befintligt Firebase-konto kopplat till'} ny CMS-registerpost. Medlemskap väntar på godkännande. Be personen logga in med rätt Google-konto; inget inbjudningsmejl har skickats.`);
        form.reset();await onRefresh();
      }catch(cause){setMessage((cause as Error).message);}finally{setBusy(false);}
    }}>
      <fieldset disabled={busy} className="grid sm:grid-cols-2 gap-3">
        <label>E-post / Google-inloggning<input name="email" className={field} type="email" maxLength={160} required placeholder="namn@foretag.se"/></label>
        <label>Namn<input name="name" className={field} maxLength={100} required placeholder="För- och efternamn"/></label>
        <label>Telefon<input name="phone" className={field} type="tel" maxLength={40}/></label>
        <label>Position<input name="position" className={field} maxLength={120}/></label>
        <label>Företag (inte behörighetskoppling)<input name="company" className={field} maxLength={160}/></label>
        <label>Anställd sedan<input name="since" className={field} type="date" max={new Date().toISOString().slice(0,10)}/></label>
        <label className="sm:col-span-2">Ansvarsområden / kompetens<textarea name="expertise" className={field} rows={3} maxLength={500}/></label>
      </fieldset>
      <button className="px-4 py-2 bg-slate-900 text-white rounded-lg disabled:opacity-50" disabled={busy}>{busy?'Kontrollerar och registrerar…':'Lägg till användare'}</button>
    </form>
    {message&&<p role="status" className="text-sm whitespace-pre-wrap">{message}</p>}
    <p className="text-xs text-slate-600">Inga lösenord eller inloggningslänkar visas i CMS. Inget mejl skickas automatiskt. Om kontot redan finns lämnas Firebase-profil, verifiering, blockering och roller oförändrade. Kontoskapande kräver Firebase Auth-behörighet för serverns servicekonto och separat isolerat test före drift.</p>
  </section>;
}
