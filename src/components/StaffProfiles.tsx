import { useEffect, useState } from 'react';
import type { CMSStore, MyStaffProfile, StaffProfile } from '../types';
import { api } from '../api';
import { ADMIN_EMAIL } from '../../shared/firebaseSettings';
import { employmentDuration, validProfilePhoto } from '../../shared/staffProfiles';
import { useFirebase } from '../contexts/FirebaseContext';
const field='block w-full border border-slate-300 rounded-lg p-2 mt-1';
const button='px-3 py-2 rounded-lg bg-slate-900 text-white disabled:opacity-50 cursor-pointer';
const blank={name:'',phone:'',position:'',company:'',employmentSince:'',expertise:'',photoUrl:''};

export function MyProfileEditor({onSaved}:{onSaved?:()=>Promise<void>}) {
  const [data,setData]=useState<MyStaffProfile|null>(null);const [error,setError]=useState('');
  const {user}=useFirebase();
  useEffect(()=>{let live=true;api.myStaffProfile().then((v)=>{if(live)setData(v);}).catch((e)=>{if(live)setError(e.message);});return()=>{live=false;};},[]);
  return <section className="border rounded-xl p-5 bg-white space-y-3"><h2 className="font-bold text-lg">Min användarprofil</h2>
    <p className="text-sm">Privat personalprofil för dig och Sveriges E-handels administratörer. Den publiceras inte i Community-katalogen. Uppgifterna tilldelar inte behörigheter eller företagstillhörighet.</p>
    {error&&<p role="alert" className="text-red-700">{error}</p>}
    {!data&&!error&&<p>Läser profilen…</p>}
    {data&&<><p className="text-sm">Verifierad e-post: {data.identity.email} · {data.identity.admin?'Administratör i Sveriges E-handel':'Medlemskonto'}</p>
      {!data.profile&&<p className="text-sm">Ingen personalprofil sparad ännu. Spara nedan för att registrera din profil med ditt verkliga inloggnings-UID. En administratör får vid behov även en intern registerpost, dold i medlemskatalogen.</p>}
      <ProfileForm key={JSON.stringify(data.profile)} initial={data.profile || {...blank,name:user?.displayName||'',position:data.identity.admin?'Administratör':'',company:data.identity.admin?'Sveriges E-handel':''}}
        googlePhoto={user?.photoURL||''} save={async(p)=>{const profile=await api.saveStaffProfile(p);setData({...data,profile});await onSaved?.();}} />
    </>}
  </section>;
}

export function StaffAdminPanel({store,onRefresh}:{store:CMSStore;onRefresh:()=>Promise<void>}) {
  const [selected,setSelected]=useState('');const [busy,setBusy]=useState(false);const [error,setError]=useState('');
  const profiles=store.staffProfiles||[];
  const members=store.communityMembers.filter((m)=>m.authorUid);
  const uids=[...new Set([...members.map((m)=>m.authorUid!),...profiles.map((p)=>p.uid)])];
  const uid=uids.includes(selected)?selected:uids[0];
  const member=members.find((m)=>m.authorUid===uid);const profile=profiles.find((p)=>p.uid===uid);
  return <div className="space-y-5">
    <section className="bg-white border rounded-xl p-5 space-y-2"><h2 className="font-bold text-lg">Administratör för Sveriges E-handel</h2>
      <p>{ADMIN_EMAIL} · Konfigurerad ägaradministratör (verifierad inloggning krävs).</p>
      <p className="text-sm">Detta är befintlig behörighetskonfiguration, inte ett nyupprättat Firebase-konto. För att finnas som sparad person-/medlemsprofil: logga in med kontot och spara ”Min användarprofil” nedan. Inga roller ges utifrån fritt angiven e-post.</p>
    </section>
    <MyProfileEditor onSaved={onRefresh}/>
    <section className="bg-white border rounded-xl p-5 space-y-3"><h2 className="font-bold text-lg">Personalprofiler</h2>
      <p className="text-sm">Position och anställd sedan beskriver personen; mottagarrätt och aktivt företag styrs separat av företagskopplingarna nedan. Anställningstid är själv-/adminangiven, inte verifierad anställningshistorik.</p>
      <label className="block text-sm">Välj känd användare<select className={field} value={uid||''} onChange={(e)=>setSelected(e.target.value)}><option value="">Välj person</option>{uids.map((id)=>{const p=profiles.find((p)=>p.uid===id);const m=members.find((m)=>m.authorUid===id);return <option key={id} value={id}>{p?.name||m?.name||id} · {p?.email||m?.email}</option>;})}</select></label>
      {uid&&<ProfileForm key={uid+JSON.stringify(profile)} initial={profile||{...blank,name:member?.name||'',position:member?.role||'',company:member?.company||''}} save={async(p)=>{await api.saveStaffProfile(p,uid);await onRefresh();}}/>}
    </section>
    <section className="bg-white border rounded-xl p-5 space-y-3"><h2 className="font-bold text-lg">Tilldela företagsärende till specifik personal</h2>
      <p className="text-sm">Tilldelat ärende visas bara för vald person i företagsinkorgen (och global admin i CMS). Personen måste fortfarande ha aktiv företagskoppling, rätt intro-/meddelandebehörighet och historikåtkomst. Tom mottagare återgår till gemensam företagsinkorg. Ämne/kompetens är hjälp för manuellt val, inte automatisk AI-routing.</p>
      {error&&<p role="alert" className="text-red-700">{error}</p>}
      {store.contactMessages.filter((m)=>m.routingMode==='direct-partner'&&['partner','logistics'].includes(m.targetEntityType||'')).map((message)=>{
        const links=(store.memberGovernance?.links||[]).filter((l)=>l.status==='active'&&l.entityType===message.targetEntityType&&l.entityId===message.targetEntityId&&
          (message.submissionType==='intro'?l.receiveIntros:l.receiveMessages)&&
          (l.includeHistory||message.createdAt>=l.createdAt)&&members.some((m)=>m.authorUid===l.uid&&m.verificationStatus==='verified')&&
          !store.memberGovernance?.blocks.some((b)=>b.uid===l.uid));
        return <form key={message.id+'-'+message.assignedStaffUid} className="border rounded-lg p-3 space-y-2 text-sm" onSubmit={async(e)=>{
          e.preventDefault();const f=new FormData(e.currentTarget);setBusy(true);setError('');try{await api.governance('assign-message',{id:message.id,uid:String(f.get('uid')||'')});await onRefresh();}catch(e){setError((e as Error).message);}finally{setBusy(false);}
        }}><strong>{message.targetEntityName} · {message.topic}</strong><p>{message.createdAt.slice(0,10)} · {message.submissionType}</p>
          {message.assignedStaffUid&&!links.some((l)=>l.uid===message.assignedStaffUid)&&<p className="text-amber-800">Nuvarande tilldelning saknar aktiv behörighet. Ärendet återgår inte automatiskt till andra personer – välj ny mottagare eller gemensam inkorg.</p>}
          <label className="block">Mottagare<select className={field} name="uid" defaultValue={message.assignedStaffUid||''}><option value="">Gemensam företagsinkorg (behöriga mottagare)</option>
            {message.assignedStaffUid&&!links.some((l)=>l.uid===message.assignedStaffUid)&&<option value={message.assignedStaffUid}>Tidigare mottagare (behörighet saknas)</option>}
            {links.map((l)=>{const p=profiles.find((p)=>p.uid===l.uid);const m=members.find((m)=>m.authorUid===l.uid);return <option key={l.id} value={l.uid}>{p?.name||m?.name||l.uid} · {p?.position||m?.role} · {p?.expertise||'Kompetens ej angiven'}</option>;})}
          </select></label><button className={button} disabled={busy}>Spara mottagartilldelning</button>
        </form>;
      })}
    </section>
  </div>;
}

function ProfileForm({initial,googlePhoto='',save}:{initial:Partial<StaffProfile>;googlePhoto?:string;save:(profile:Partial<StaffProfile>)=>Promise<void>}) {
  const [photo,setPhoto]=useState(initial.photoUrl||'');const [busy,setBusy]=useState(false);const [message,setMessage]=useState('');
  return <form className="space-y-3 text-sm" onSubmit={async(e)=>{e.preventDefault();const f=new FormData(e.currentTarget);setBusy(true);setMessage('');try{await save({name:String(f.get('name')),phone:String(f.get('phone')),position:String(f.get('position')),company:String(f.get('company')),employmentSince:String(f.get('since')),expertise:String(f.get('expertise')),photoUrl:photo});setMessage('Profilen sparad. Behörigheter har inte ändrats.');}catch(e){setMessage((e as Error).message);}finally{setBusy(false);}}}>
    <div className="grid sm:grid-cols-2 gap-3">
      <label>Namn<input name="name" className={field} maxLength={100} required defaultValue={initial.name}/></label>
      <label>Telefon<input name="phone" className={field} type="tel" maxLength={40} defaultValue={initial.phone}/></label>
      <label>Position / befattning<input name="position" className={field} maxLength={120} defaultValue={initial.position}/></label>
      <label>Företag (profiluppgift)<input name="company" className={field} maxLength={160} defaultValue={initial.company}/></label>
      <label>Anställd sedan<input name="since" className={field} type="date" max={new Date().toISOString().slice(0,10)} defaultValue={initial.employmentSince}/></label>
      <p className="self-end">Sparad anställningstid: {employmentDuration(initial.employmentSince||'')}</p>
    </div>
    <label className="block">Ansvarsområden / frågor personen kan hantera<textarea name="expertise" className={field} maxLength={500} rows={3} defaultValue={initial.expertise}/></label>
    <label className="block">Profilbildens HTTPS-adress<input className={field} type="url" maxLength={2000} value={photo} onChange={(e)=>setPhoto(e.target.value)}/></label>
    <p className="text-xs text-slate-600">Valfritt. Stöder Google-kontobild eller redan uppladdad Firebase-bild. Ingen ny bilduppladdning aktiveras här. Bildlänken kan vara publikt läsbar hos leverantören även om profilregistret är privat. Använd bara bild du får dela. Profilbilden visas bara i din egen profil och adminvyn.</p>
    <div className="flex gap-2">{googlePhoto&&validProfilePhoto(googlePhoto)&&<button className={button} type="button" disabled={busy} onClick={()=>setPhoto(googlePhoto)}>Använd min Google-profilbild</button>}<button className={button} type="button" disabled={busy} onClick={()=>setPhoto('')}>Ta bort bildreferens</button></div>
    {photo&&validProfilePhoto(photo)&&<img src={photo} alt="Profilbild – förhandsvisning" className="w-20 h-20 object-cover rounded-full" referrerPolicy="no-referrer"/>}
    <button className={button} disabled={busy}>Spara personalprofil</button>{message&&<p role="status">{message}</p>}
  </form>;
}
