import { useState } from 'react';
import type { TeamWorkspace } from '../../server/collaboration';
import { useFirebase } from '../contexts/FirebaseContext';
import { api } from '../api';
const input='block w-full border rounded-lg p-2';
export function CompanyVerificationPanel({data,reload}:{data:TeamWorkspace;reload:()=>Promise<void>}){
  const {requestSignIn}=useFirebase();const [busy,setBusy]=useState(false),[notice,setNotice]=useState('');
  const admin=data.roles.includes('admin');
  const run=async(op:string,payload:unknown)=>{if(busy)return;setBusy(true);setNotice('');try{await api.teamAction(op,payload);await reload();setNotice('Åtgärden är sparad. Granskning publicerar inte sidinnehåll.');}catch(e){setNotice((e as Error).message);}finally{setBusy(false);}};
  return <details className="bg-white border rounded-xl p-5 space-y-4"><summary className="text-xl font-bold cursor-pointer">Verifierad företagsadministration & 2FA</summary>
    <p>En verifierad mejladress visar kontroll över adressen, inte företrädarrätt. Sveriges E-handel granskar person, befattning, organisationsnummer, adress och domän manuellt. Inga rättigheter ges automatiskt.</p>
    <p>2FA i denna session: {data.mfa.verified?'Autentiseringsapp verifierad':'Inte verifierad'}. Nya företagsansökningar och säkerhetsbeslut kräver nylig inloggning med appkod.</p>
    <button type="button" className="border rounded p-2" onClick={requestSignIn}>Öppna inloggning / registrera autentiseringsapp</button>
    <p className="text-sm">Om inställningen saknas måste TOTP först konfigureras i Firebase. Globala 2FA-kravet är {data.mfa.required?'aktiverat':'inte aktiverat'}. Företagsverifieringsflödet kräver alltid 2FA.</p>
    {!data.mfa.enabled&&<p role="status">Förberett men avstängt: inga ansökningar eller överlämningar kan göras förrän Firebase TOTP är aktiverat och testat.</p>}
    {notice&&<p role="status">{notice}</p>}
    {admin?<form className="space-y-3" onSubmit={async e=>{e.preventDefault();const f=new FormData(e.currentTarget);const [entityType,entityId]=String(f.get('target')).split('|');await run('verification-policy',{revision:data.revision,entityType,entityId,domains:String(f.get('domains')).split(/[\n,]/).map(s=>s.trim().toLowerCase()).filter(Boolean),registrationNumber:String(f.get('registrationNumber')),address:String(f.get('address')),confirm:f.get('confirm')==='on'});}}>
      <h3 className="font-bold">Granska företagets verifieringsunderlag</h3><p className="text-sm">Kontrollera via oberoende register/officiell kontakt. Domäner läggs inte automatiskt till från en sökandes uppgifter. En adress är bara kompletterande underlag.</p>
      <fieldset disabled={busy||!data.mfa.enabled||!data.mfa.verified} className="space-y-3"><label>Företag<select className={input} name="target" required><option value="">Välj företag</option>{data.companies.map(c=><option key={`${c.entityType}|${c.entityId}`} value={`${c.entityType}|${c.entityId}`}>{c.name}</option>)}</select></label>
        <label>Granskade exakta mejldomäner (komma mellan)<input className={input} name="domains" required maxLength={2000}/></label><label>Organisationsnummer<input className={input} name="registrationNumber" required maxLength={60}/></label><label>Registrerad adress<input className={input} name="address" required maxLength={500}/></label>
        <label className="flex gap-2"><input name="confirm" type="checkbox" required/>Jag har kontrollerat uppgifterna mot oberoende underlag.</label><button className="border rounded p-2">Spara granskat företagsunderlag</button>
      </fieldset>
      <ul>{data.verification.policies.map(p=><li key={`${p.entityType}/${p.entityId}`}>{data.companies.find(c=>c.entityType===p.entityType&&c.entityId===p.entityId)?.name} · {p.domains.join(', ')} · {p.registrationNumber} · {p.address}</li>)}</ul>
    </form>:<form className="space-y-3" onSubmit={async e=>{e.preventDefault();const f=new FormData(e.currentTarget);const [entityType,entityId]=String(f.get('target')).split('|');await run('claim-submit',{entityType,entityId,name:String(f.get('name')),position:String(f.get('position')),registrationNumber:String(f.get('registrationNumber')),address:String(f.get('address')),reason:String(f.get('reason')),confirm:f.get('confirm')==='on'});}}>
      <h3 className="font-bold">Ansök om att administrera ett företag</h3><p className="text-sm">Gäller befintliga företag. Saknas företaget kontaktar du Sveriges E-handel för registrering och adressreservation. Ansökan skapar ingen publik företagssida. Godkänt medlemskap krävs.</p>
      <fieldset disabled={busy||!data.mfa.enabled||!data.mfa.verified} className="space-y-3"><label>Företag<select className={input} name="target" required><option value="">Välj företag</option>{data.verification.targets.map(c=><option key={`${c.entityType}|${c.entityId}`} value={`${c.entityType}|${c.entityId}`}>{c.name}</option>)}</select></label>
        <label>Ditt namn<input name="name" className={input} required maxLength={100}/></label><label>Befattning<input name="position" className={input} required maxLength={120}/></label><label>Organisationsnummer<input name="registrationNumber" className={input} required maxLength={60}/></label><label>Företagsadress<input name="address" className={input} required maxLength={500}/></label><label>Varför får du företräda företaget? Ange inga känsliga dokument.<textarea name="reason" className={input} required maxLength={1500}/></label>
        <p className="text-sm">Din verifierade inloggningsadress används som företagsmejl. Är den fel: byt till rätt konto. Sökanden får aldrig själv ange en annan verifierad adress.</p>
        <label className="flex gap-2"><input type="checkbox" name="confirm" required/>Jag har rätt att ansöka, och uppgifterna får granskas av Sveriges E-handel för detta ändamål.</label><button className="border rounded p-2">Skicka för manuell granskning</button>
      </fieldset>
    </form>}
    <h3 className="font-bold">{admin?'Ansökningar & granskning':'Mina företagsansökningar'}</h3>
    {!data.verification.claims.length&&<p>Inga ansökningar.</p>}
    {data.verification.claims.map(c=><article className="border rounded p-3 space-y-2" key={`${c.id}-${c.revision}`}><h4 className="font-bold">{(admin?data.companies:data.verification.targets).find(t=>t.entityType===c.entityType&&t.entityId===c.entityId)?.name||c.entityId} · {c.state}</h4>
      <p>{c.name} · {c.position} · {c.email}</p><p>{c.registrationNumber} · {c.address}</p><p>{c.reason}</p><p>Exakt mejldomän matchade vid ansökan: {c.domainMatched?'Ja':'Nej / underlag saknades'}. Detta är inte automatiskt godkännande.</p>{c.reviewNote&&<p>Beslut: {c.reviewNote}</p>}
      {admin&&['pending','approved'].includes(c.state)&&<form className="space-y-2" onSubmit={async e=>{e.preventDefault();const f=new FormData(e.currentTarget);await run('claim-decision',{id:c.id,revision:c.revision,decision:String(f.get('decision')),note:String(f.get('note')),confirm:f.get('confirm')==='on',confirmAuthority:f.get('authority')==='on',confirmException:f.get('exception')==='on',confirmHandover:f.get('handover')==='on'});}}>
        <fieldset disabled={busy||!data.mfa.enabled||!data.mfa.verified} className="space-y-2"><label>Beslut<select name="decision" className={input}>{c.state==='pending'?<><option value="reject">Avslå</option><option value="approve">Godkänn företagsadministration</option></>:<option value="revoke">Återkalla och återta förvaltning</option>}</select></label>
          <label>Granskningsmotivering<textarea className={input} name="note" required maxLength={1500}/></label>
          <label className="flex gap-2"><input name="confirm" type="checkbox"/>Ansökan och aktuellt underlag har granskats.</label><label className="flex gap-2"><input name="authority" type="checkbox"/>Jag har självständigt verifierat personens företrädarrätt, inte bara mejldomänen.</label>
          <label className="flex gap-2"><input name="exception" type="checkbox"/>Avvikande mejldomän/registeruppgift har kontrollerats extra manuellt (motivera ovan).</label><label className="flex gap-2"><input name="handover" type="checkbox"/>Jag godkänner överlämning av sidans redigeringsansvar från plattformen. Ingen publicerings- eller inkorgsrätt ges.</label>
          <button className="border rounded p-2">Spara säkerhetsbeslut</button>
        </fieldset>
      </form>}
    </article>)}
    <p className="text-xs">Sidinnehåll kräver fortsatt Sveriges E-handels publiceringsbeslut. Inga globala roller, raderingsrättigheter, inkorgar eller äldre ärenden tilldelas genom godkännandet.</p>
  </details>;
}
