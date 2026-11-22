import { useState } from 'react';
import type { CMSStore, EditorialKind, SaleCase } from '../types';
import { api } from '../api';
const field='block w-full border rounded-lg p-2 mt-1';
export function WorkflowPanel({store,onRefresh}:{store:CMSStore;onRefresh:()=>Promise<void>}) {
  const [message,setMessage]=useState('');const [busy,setBusy]=useState(false);const [filter,setFilter]=useState('');
  const [preview,setPreview]=useState('');
  const targets=[...(store.saleListings??[]).map(row=>({kind:'sale' as const,row})),...(store.startGuide??[]).map(row=>({kind:'guide' as const,row})),...(store.insightPosts??[]).map(row=>({kind:'insight' as const,row}))];
  const act=async(kind:EditorialKind,id:string,revision:number,action:'trash'|'untrash'|'restore',versionId?:string)=>{
    if(!window.confirm(action==='trash'?'Flytta till papperskorgen utan att radera?':'Återställ som utkast? Tidigare publiceringsschema tas bort; granska före publicering.'))return;
    setBusy(true);setMessage('');try{await api.editorialState(kind,id,{revision,action,versionId});await onRefresh();setMessage('Åtgärden sparad.');}catch(err){setMessage((err as Error).message);}finally{setBusy(false);}
  };
  return <section className="space-y-6">
    <div className="bg-white border rounded-xl p-5 space-y-3"><h2 className="text-2xl font-bold">Versionshistorik & papperskorg</h2>
      <p>Gäller köp-/säljannonser, startguide och Blogg & Insikter. Alla versioner är privata i CMS. Återställning skapar en ny revision som utkast, inte en ny publicering. Högst 120 versioner ryms i denna snapshot; när arkivet är fullt stoppas nya ändringar utan att äldre versioner raderas. Exportera via Översikt & Backup och besluta om arkivering.</p>
      <label>Sök post<input className={field} value={filter} onChange={e=>setFilter(e.target.value)}/></label>
      {targets.filter(t=>t.row.title.toLocaleLowerCase('sv-SE').includes(filter.toLocaleLowerCase('sv-SE'))).map(({kind,row})=><details key={`${kind}-${row.id}`} className="border rounded-xl p-3">
        <summary className="cursor-pointer">{row.title} · {kind} · rev {row.revision??0} {row.trashedAt?'· I papperskorg':''}</summary>
        <div className="space-y-3 pt-3"><button className="underline" type="button" disabled={busy} onClick={()=>void act(kind,row.id,row.revision??0,row.trashedAt?'untrash':'trash')}>{row.trashedAt?'Återställ ur papperskorg som utkast':'Flytta till papperskorg'}</button>
          <h3 className="font-semibold">Tidigare sparade versioner</h3>
          {!(store.editorialHistory??[]).some(v=>v.kind===kind&&v.targetId===row.id)&&<p>Ingen tidigare version sparad ännu.</p>}
          {[...(store.editorialHistory??[])].reverse().filter(v=>v.kind===kind&&v.targetId===row.id).map(v=><div key={v.id} className="border-t pt-2 space-y-1 text-sm"><p>{v.at} · {v.action} · {v.actorUid} · revision {v.before.revision??0}</p><div className="flex gap-3"><button className="underline" onClick={()=>setPreview(preview===v.id?'':v.id)} type="button">Visa sparad version</button><button className="underline" type="button" disabled={busy} onClick={()=>void act(kind,row.id,row.revision??0,'restore',v.id)}>Återställ denna version som utkast</button></div>{preview===v.id&&<pre className="whitespace-pre-wrap break-all max-h-80 overflow-y-auto bg-slate-50 p-3">{JSON.stringify(v.before,null,2)}</pre>}</div>)}
        </div>
      </details>)}
    </div>
    <div className="bg-white border rounded-xl p-5 space-y-3"><h2 className="text-2xl font-bold">Köp & sälj – ärendeuppföljning</h2>
      <p>Tilldelning är intern arbetsfördelning, inte en ny läsrättighet. Bara CMS-admin kan läsa eller ändra dessa ärenden. Inga mejl eller notifieringar skickas. Personer utan CMS-behörighet får inte åtkomst genom tilldelning.</p>
      {store.contactMessages.filter(m=>m.topic.startsWith('Köp & sälj:')&&m.adSlot).map(m=><details key={m.id} className="border p-3 rounded-lg"><summary className="cursor-pointer">{m.topic} · {(store.saleCases??[]).find(c=>c.messageId===m.id)?.state??'new'} {(store.saleCases??[]).some(c=>c.messageId===m.id&&c.dueDate&&c.dueDate<new Date().toISOString().slice(0,10)&&c.state!=='resolved')?'· Försenad uppföljning':''}</summary>
        <p className="whitespace-pre-wrap py-3">{m.name} · {m.email}{'\n'}{m.message}</p>
        <CaseForm key={JSON.stringify(store.saleCases?.find(c=>c.messageId===m.id))??m.id} record={store.saleCases?.find(c=>c.messageId===m.id)} id={m.id} store={store} onRefresh={onRefresh}/>
      </details>)}
      {!store.contactMessages.some(m=>m.topic.startsWith('Köp & sälj:'))&&<p>Inga affärsförfrågningar ännu.</p>}
    </div>{message&&<p role="status">{message}</p>}
  </section>;
}
function CaseForm({record,id,store,onRefresh}:{record?:SaleCase;id:string;store:CMSStore;onRefresh:()=>Promise<void>}) {
  const [busy,setBusy]=useState(false);const [message,setMessage]=useState('');
  return <form className="space-y-3" onSubmit={async e=>{e.preventDefault();if(busy)return;const f=new FormData(e.currentTarget);setBusy(true);setMessage('');try{await api.saveSaleCase(id,{revision:record?.revision??0,assignedUid:String(f.get('uid')),state:String(f.get('state')) as SaleCase['state'],dueDate:String(f.get('date')),note:String(f.get('note'))});await onRefresh();setMessage('Ärendet sparat.');}catch(err){setMessage((err as Error).message);}finally{setBusy(false);}}}>
    <fieldset disabled={busy} className="space-y-3"><label className="block">Ansvarig (intern tilldelning)<select name="uid" className={field} defaultValue={record?.assignedUid??''}><option value="">Ej tilldelat</option>{store.staffProfiles?.map(p=><option key={p.uid} value={p.uid}>{p.name} · {p.position}</option>)}</select></label>
      <label className="block">Status<select name="state" className={field} defaultValue={record?.state??'new'}><option value="new">Ny</option><option value="working">Pågår</option><option value="waiting">Inväntar svar</option><option value="resolved">Avslutad</option></select></label>
      <label className="block">Följ upp senast<input className={field} name="date" type="date" defaultValue={record?.dueDate??''}/></label><label className="block">Privat anteckning<textarea className={field} name="note" maxLength={2000} defaultValue={record?.note??''}/></label><button className="bg-blue-800 text-white p-2 rounded-lg">Spara uppföljning</button>
    </fieldset>{message&&<p role="status">{message}</p>}
  </form>;
}
