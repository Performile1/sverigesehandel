import { useState } from 'react';
import type { TeamWorkspace } from '../../server/collaboration';
import { COMPANY_PAGE_STARTERS } from '../../shared/companyPageStarters';
import { api } from '../api';
import { createAndVerifyCompanyPages } from './companyPageCreation';
export function CreateCompanyPages({revision,onLoaded}:{revision:number;onLoaded:(data:TeamWorkspace)=>void}) {
  const [confirm,setConfirm]=useState(false);
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState('');
  const [error,setError]=useState('');
  return <section className="bg-white border rounded-xl p-5 space-y-3">
    <h2 className="text-xl font-bold">Förbered åtta företagssidor</h2>
    <p>{COMPANY_PAGE_STARTERS.map(p=>p.name).join(', ')}. Bara utkast, inga formulär eller företagsbehörigheter. Ditt adminkonto blir ansvarig för nya sidor. Befintliga sidor och alternativa adresser behålls; saknade företag får en tom katalogpost som utkast.</p>
    <label className="flex gap-2"><input type="checkbox" checked={confirm} disabled={busy} onChange={e=>setConfirm(e.target.checked)}/>Jag vill skapa saknade sidutkast utan att publicera eller skriva över befintliga sidor.</label>
    <button type="button" disabled={!confirm||busy} className="border rounded-lg px-3 py-2 disabled:opacity-40" onClick={async()=>{
      if(busy||!confirm)return;setBusy(true);setMessage('');setError('');
      try {
        const result=await createAndVerifyCompanyPages(revision,r=>api.teamAction('starter-pages',{revision:r,confirm:true}),()=>api.teamspace());
        onLoaded(result.workspace);setMessage(`${result.summary.created} sidor skapade, ${result.summary.existing} fanns redan. Alla ${result.summary.pages.length} har lästs tillbaka från CMS. Se Företagssidor nedan. Inget publicerades.`);setConfirm(false);
      }catch(err){setError(`${(err as Error).message} Vid osäkert resultat: läs om sidlistan före nytt försök. Inga dubbletter skapas när samma paket körs igen.`);}finally{setBusy(false);}
    }}>{busy?'Skapar och kontrollerar sparade sidor…':'Skapa saknade sidutkast'}</button>
    {message&&<p role="status">{message}</p>}{error&&<p role="alert" className="text-red-700">{error}</p>}
  </section>;
}
