import { PlainTextDescription } from './JobDescription';
import { PublicationFields } from './PublicationFields';
import { SaleGalleryEditor } from './SaleGalleryEditor';
import { useState } from 'react';
import type { CMSStore, GuideChapter, SaleListing, SaleDetails } from '../types';
import { INITIAL_START_GUIDE } from '../../shared/startGuide';
import { SALE_AVAILABILITY, SALE_INTENTS } from '../../shared/commerce';
import { api } from '../api';
import { SaleFields, blankSale, commerceButton as button, commerceField as field } from './MarketplaceView';
const blank:GuideChapter={id:'',title:'',summary:'',body:'',checklist:[],targetTab:'partners',sourceUrl:'',reviewedDate:'',order:10,status:'draft'};
export function CommerceEditor({store,onRefresh}:{store:CMSStore;onRefresh:()=>Promise<void>}) {
  const [guideId,setGuideId]=useState('new');const [saleId,setSaleId]=useState('');const [creating,setCreating]=useState(false);const [copy,setCopy]=useState<SaleDetails>();const [search,setSearch]=useState('');const [queueStatus,setQueueStatus]=useState('all');
  const guide=store.startGuide??INITIAL_START_GUIDE;const chapter=guide.find(c=>c.id===guideId&&!c.trashedAt);const sales=store.saleListings??[];const sale=sales.find(c=>c.id===saleId&&!c.trashedAt);
  return <section className="space-y-6">
    <div className="border bg-white rounded-2xl p-5 space-y-4"><h2 className="text-2xl font-bold">Starta e-handel – guide</h2><p>Redigera kapitel, checklista, källa och granskningsdatum. Spara som utkast för att avpublicera utan att radera innehåll. Partnerknappen är en kataloglänk, inte en sponsrad rekommendation.</p>
      <label>Välj kapitel<select className={field} value={chapter?.id||'new'} onChange={e=>setGuideId(e.target.value)}><option value="new">Nytt kapitel</option>{[...guide].filter(c=>!c.trashedAt).sort((a,b)=>a.order-b.order).map(c=><option key={c.id} value={c.id}>{c.order+1}. {c.title} · {c.status}</option>)}</select></label>
      <GuideForm key={chapter?JSON.stringify(chapter):'new'} initial={chapter||blank} onSave={async c=>{await api.saveGuideChapter(c);await onRefresh();setGuideId(c.id);}}/>
    </div>
    <div className="border bg-white rounded-2xl p-5 space-y-4"><h2 className="text-2xl font-bold">Köp & sälj – annonsgranskning</h2><p>Förslag är privata tills publicering. Kontaktuppgifter förblir privata även efter publicering. Kontrollera annonsörens rätt att företräda affären och vad som får visas. Publicering är inte en garanti om äganderätt, pris eller kvalitet. Ingen betalning, dokumentöverföring eller automatisk mejlförmedling ingår.</p>
      <button type="button" className={button} onClick={()=>{setCopy(undefined);setCreating(p=>!p);}}>{creating?'Stäng nytt annonsformulär':'Skapa köp- eller säljannons'}</button>
      {creating&&<CreateCmsSaleForm key={copy?.title??'new'} initial={copy} onCreated={async id=>{setSaleId(id);setCreating(false);await onRefresh();}}/>}
      <div className="grid sm:grid-cols-2 gap-3"><label>Sök i annonskön<input className={field} value={search} onChange={e=>setSearch(e.target.value)}/></label><label>Statusfilter<select className={field} value={queueStatus} onChange={e=>setQueueStatus(e.target.value)}><option value="all">Alla aktiva poster</option>{['pending','draft','published','rejected'].map(status=><option key={status}>{status}</option>)}</select></label></div>
      {sale&&<button className="underline" type="button" onClick={()=>{setCopy({...sale,title:`Kopia av ${sale.title}`.slice(0,160)});setCreating(true);}}>Duplicera annons till nytt utkast</button>}
      <label>Välj annons ({sales.filter(c=>c.status==='pending').length} väntande)<select className={field} value={sale?.id||''} onChange={e=>setSaleId(e.target.value)}><option value="">Välj förslag</option>{sales.filter(c=>!c.trashedAt&&(queueStatus==='all'||c.status===queueStatus)&&c.title.toLocaleLowerCase('sv-SE').includes(search.toLocaleLowerCase('sv-SE'))).map(c=><option key={c.id} value={c.id}>{SALE_INTENTS[c.intent??'sell']} · {c.status} · {c.title}</option>)}</select></label>
      {sale&&<><SaleReview key={JSON.stringify(sale)} initial={sale} onSave={async input=>{await api.reviewSaleListing(sale.id,input);await onRefresh();}}/><SaleGalleryEditor key={`gallery-${sale.id}-${sale.revision}`} sale={sale} onRefresh={onRefresh}/></>}
      <p className="text-sm">Intresseförfrågningar finns i CMS → Formulär & Intro med ämne ”Köp & sälj”. De visas inte för andra medlemmar eller i företagsinkorgar. Avslutade/avpublicerade annonser tar inte emot nya intresseförfrågningar.</p>
    </div>
  </section>;
}
function GuideForm({initial,onSave}:{initial:GuideChapter;onSave:(c:GuideChapter)=>Promise<void>}) {
  const [draft,setDraft]=useState(initial);const [busy,setBusy]=useState(false);const [message,setMessage]=useState('');const [newId]=useState(()=>`guide-${crypto.randomUUID()}`);
  return <form className="space-y-3 text-sm" onSubmit={async e=>{e.preventDefault();if(busy)return;setBusy(true);setMessage('');try{await onSave({...draft,checklist:draft.checklist.map(c=>c.trim()).filter(Boolean),id:draft.id||newId});setMessage('Guiden sparad.');}catch(err){setMessage((err as Error).message);}finally{setBusy(false);}}}>
    <fieldset disabled={busy} className="space-y-3">
      <label className="block">Rubrik<input required maxLength={180} className={field} value={draft.title} onChange={e=>setDraft({...draft,title:e.target.value})}/></label>
      <label className="block">Ingress<textarea required maxLength={600} className={field} value={draft.summary} onChange={e=>setDraft({...draft,summary:e.target.value})}/></label>
      <label className="block">Brödtext (ren text, stycken och punktlistor)<textarea required rows={8} maxLength={12000} className={field} value={draft.body} onChange={e=>setDraft({...draft,body:e.target.value})}/></label>
      <label className="block">Checklista (en punkt per rad, högst 20)<textarea rows={5} className={field} value={draft.checklist.join('\n')} onChange={e=>setDraft({...draft,checklist:e.target.value.split('\n')})}/></label>
      <label className="block">Katalog / kontaktmål<select className={field} value={draft.targetTab} onChange={e=>setDraft({...draft,targetTab:e.target.value as GuideChapter['targetTab']})}>{['partners','3pl','ehandlare','kontakt','jobb'].map(t=><option key={t}>{t}</option>)}</select></label>
      <label className="block">Källa / vidare läsning (HTTPS)<input className={field} type="url" value={draft.sourceUrl} onChange={e=>setDraft({...draft,sourceUrl:e.target.value})}/></label>
      <label className="block">Senast redaktionellt granskad (krävs för publicering)<input className={field} type="date" value={draft.reviewedDate} onChange={e=>setDraft({...draft,reviewedDate:e.target.value})}/></label>
      <label className="block">Ordning<input className={field} type="number" min={0} max={1000} value={draft.order} onChange={e=>setDraft({...draft,order:Number(e.target.value)})}/></label>
      <label className="block">Status<select className={field} value={draft.status} onChange={e=>setDraft({...draft,status:e.target.value as GuideChapter['status']})}><option value="draft">Utkast</option><option value="published">Publicerad</option></select></label>
      <details className="border rounded-lg p-3"><summary>Förhandsvisa kapiteltext</summary><h3 className="font-bold">{draft.title}</h3><p>{draft.summary}</p><PlainTextDescription text={draft.body}/></details>
      <PublicationFields value={draft} onChange={v=>setDraft(p=>({...p,...v}))}/>
      <button className={button}>Spara kapitel</button>
    </fieldset>{message&&<p role="status">{message}</p>}
  </form>;
}
function SaleReview({initial,onSave}:{initial:SaleListing;onSave:(input:unknown)=>Promise<void>}) {
  const [draft,setDraft]=useState<SaleDetails & import('../types').EditorialLifecycle>(initial);const [busy,setBusy]=useState(false);const [message,setMessage]=useState('');
  return <form className="space-y-3" onSubmit={async e=>{e.preventDefault();if(busy)return;const f=new FormData(e.currentTarget);setBusy(true);setMessage('');try{await onSave({...draft,status:String(f.get('status')),availability:String(f.get('availability')),internalNotes:String(f.get('notes')),reviewConfirmed:f.get('review')==='on'});setMessage('Granskningsbeslut sparat.');}catch(err){setMessage((err as Error).message);}finally{setBusy(false);}}}>
    <p className="bg-slate-100 p-3 rounded-xl text-sm">Privat annonskontakt: {initial.sellerName} · {initial.sellerEmail}<br/>{initial.origin==='cms'?`Skapad i CMS av ${initial.createdByUid}; kontaktadressen är inte verifierad genom registreringen.`:'Inlämnad från verifierat användarkonto.'}<br/>Referens: {initial.id}<br/>Uppdrag / behörighet bekräftad: {initial.authorityConfirmed?'Ja':'Nej'} · Offentliga fält godkända av annonsören: {initial.publicContentConfirmed?'Ja':'Nej'}<br/>Senaste beslut: {initial.reviewedAt||'Inte granskat'} · {initial.reviewedBy||'–'}</p>
    <fieldset disabled={busy} className="space-y-3"><SaleFields draft={draft} onChange={setDraft}/>
      <label className="block">Privata handläggningsanteckningar<textarea name="notes" className={field} maxLength={2000} defaultValue={initial.internalNotes}/></label>
      <label className="block">Annonsstatus<select name="status" className={field} defaultValue={initial.status==='pending'?'draft':initial.status}><option value="draft">Utkast / avpublicerad</option><option value="published">Publicerad</option><option value="rejected">Avslagen</option></select></label>
      <label className="block">Affärsstatus<select name="availability" className={field} defaultValue={initial.availability}>{Object.entries(SALE_AVAILABILITY).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label>
      <label className="flex gap-2"><input name="review" type="checkbox"/>Jag har granskat annonsen, annonsörens uppgivna behörighet och att fälten får publiceras. Krävs vid varje publicering.</label>
      <PublicationFields value={draft} onChange={v=>setDraft(p=>({...p,...v}))}/>
      <details className="border rounded-lg p-3"><summary>Förhandsvisa offentlig annonstext</summary><h3 className="font-bold">{draft.title}</h3><p>{draft.priceLabel} · {draft.location}</p><PlainTextDescription text={draft.description}/><PlainTextDescription text={draft.included}/></details>
      <button className={button}>Spara granskningsbeslut</button>
    </fieldset>{message&&<p role="status">{message}</p>}
  </form>;
}

export function CreateCmsSaleForm({initial,onCreated}:{initial?:SaleDetails;onCreated:(id:string)=>Promise<void>}) {
  const [draft,setDraft]=useState<SaleDetails>(initial?{title:initial.title,description:initial.description,included:initial.included,category:initial.category,location:initial.location,priceLabel:initial.priceLabel,quantity:initial.quantity,condition:initial.condition,intent:initial.intent??'sell'}:{...blankSale,intent:'sell'});
  const [status,setStatus]=useState<'draft'|'published'>('draft');const [busy,setBusy]=useState(false);const [message,setMessage]=useState('');
  const [requestId]=useState(()=>`sale-${crypto.randomUUID()}`);const [createdId,setCreatedId]=useState('');
  if(createdId)return <div role="status" className="p-3 border rounded-lg">Annonsen är sparad med referens {createdId}. {message}<button type="button" className={button} onClick={()=>{void onCreated(createdId).catch(()=>setMessage('Kunde inte uppdatera CMS. Ladda om och välj den sparade annonsen.'));}}>Öppna sparad annons</button></div>;
  return <form className="space-y-3 border rounded-xl p-4" onSubmit={async e=>{
    e.preventDefault();if(busy)return;const f=new FormData(e.currentTarget);setBusy(true);setMessage('');
    try{const result=await api.createCmsSaleListing({...draft,requestId,sellerName:String(f.get('contactName')),sellerEmail:String(f.get('contactEmail')),
      internalNotes:String(f.get('notes')),status,authorityConfirmed:f.get('authority')==='on',publicContentConfirmed:f.get('publicContent')==='on',reviewConfirmed:f.get('review')==='on'});
      setCreatedId(result.id);try{await onCreated(result.id);}catch{setMessage('Annonsen är sparad men CMS kunde inte uppdateras. Ladda om – skapa inte en ny kopia.');}
    }catch(err){setMessage((err as Error).message);}finally{setBusy(false);}
  }}>
    <h3 className="text-lg font-bold">Skapa köp- eller säljannons i CMS</h3>
    <p className="text-sm">Registrera annonsörens kontakt på uppdrag. Uppgifterna hålls privata. En angiven e-postadress verifieras inte och ger inget konto eller företagsbehörighet. Inget mejl skickas automatiskt.</p>
    <fieldset disabled={busy} className="space-y-3"><SaleFields draft={draft} onChange={setDraft}/>
      <label className="block">Annonsörens kontaktperson (privat)<input className={field} name="contactName" required maxLength={100}/></label>
      <label className="block">Annonsörens e-post (privat, ej kontoverifiering)<input className={field} name="contactEmail" type="email" required maxLength={160}/></label>
      <label className="block">Interna anteckningar<textarea className={field} name="notes" maxLength={2000}/></label>
      <label className="flex gap-2"><input name="authority" type="checkbox" required/>Jag har annonsörens uppdrag och har kontrollerat att personen får företräda erbjudandet eller köpförfrågan.</label>
      <label className="flex gap-2"><input name="publicContent" type="checkbox" required/>Annonsören har godkänt de offentliga fälten. De innehåller inga kundregister eller konfidentiella/personliga uppgifter.</label>
      <label className="block">Spara som<select className={field} value={status} onChange={e=>setStatus(e.target.value as typeof status)}><option value="draft">Utkast – inte offentligt</option><option value="published">Publicerad</option></select></label>
      {status==='published'&&<label className="flex gap-2"><input name="review" type="checkbox" required/>Jag har redaktionellt granskat annonsen och godkänner publicering.</label>}
      <button className={button}>{busy?'Sparar…':status==='published'?'Godkänn och publicera annons':'Spara annonsutkast'}</button>
    </fieldset>{message&&<p role="alert">{message} Referens: {requestId}. Kontrollera sparat läge före nytt förslag vid osäkert svar.</p>}
  </form>;
}
