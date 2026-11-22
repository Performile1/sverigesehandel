import { useState } from 'react';
import type { CMSStore, GuideChapter, SaleListing, SaleDetails } from '../types';
import { INITIAL_START_GUIDE } from '../../shared/startGuide';
import { SALE_AVAILABILITY } from '../../shared/commerce';
import { api } from '../api';
import { SaleFields, commerceButton as button, commerceField as field } from './MarketplaceView';
const blank:GuideChapter={id:'',title:'',summary:'',body:'',checklist:[],targetTab:'partners',sourceUrl:'',reviewedDate:'',order:10,status:'draft'};
export function CommerceEditor({store,onRefresh}:{store:CMSStore;onRefresh:()=>Promise<void>}) {
  const [guideId,setGuideId]=useState('new');const [saleId,setSaleId]=useState('');
  const guide=store.startGuide??INITIAL_START_GUIDE;const chapter=guide.find(c=>c.id===guideId);const sales=store.saleListings??[];const sale=sales.find(c=>c.id===saleId);
  return <section className="space-y-6">
    <div className="border bg-white rounded-2xl p-5 space-y-4"><h2 className="text-2xl font-bold">Starta e-handel – guide</h2><p>Redigera kapitel, checklista, källa och granskningsdatum. Spara som utkast för att avpublicera utan att radera innehåll. Partnerknappen är en kataloglänk, inte en sponsrad rekommendation.</p>
      <label>Välj kapitel<select className={field} value={chapter?.id||'new'} onChange={e=>setGuideId(e.target.value)}><option value="new">Nytt kapitel</option>{[...guide].sort((a,b)=>a.order-b.order).map(c=><option key={c.id} value={c.id}>{c.order+1}. {c.title} · {c.status}</option>)}</select></label>
      <GuideForm key={chapter?JSON.stringify(chapter):'new'} initial={chapter||blank} onSave={async c=>{await api.saveGuideChapter(c);await onRefresh();setGuideId(c.id);}}/>
    </div>
    <div className="border bg-white rounded-2xl p-5 space-y-4"><h2 className="text-2xl font-bold">Köp & sälj – annonsgranskning</h2><p>Förslag och säljaruppgifter är privata tills publicering. Kontrollera säljarens rätt att företräda affären och vad som får visas. Publicering är inte en garanti om äganderätt, pris eller kvalitet. Ingen betalning, dokumentöverföring eller automatisk mejlförmedling ingår.</p>
      <label>Välj annons ({sales.filter(c=>c.status==='pending').length} väntande)<select className={field} value={sale?.id||''} onChange={e=>setSaleId(e.target.value)}><option value="">Välj förslag</option>{sales.map(c=><option key={c.id} value={c.id}>{c.status} · {c.title}</option>)}</select></label>
      {sale&&<SaleReview key={JSON.stringify(sale)} initial={sale} onSave={async input=>{await api.reviewSaleListing(sale.id,input);await onRefresh();}}/>}
      <p className="text-sm">Intresseförfrågningar finns i CMS → Formulär & Intro med ämne ”Köp & sälj”. De visas inte för andra medlemmar eller i företagsinkorgar. Sålda/avpublicerade annonser tar inte emot nya intresseförfrågningar.</p>
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
      <button className={button}>Spara kapitel</button>
    </fieldset>{message&&<p role="status">{message}</p>}
  </form>;
}
function SaleReview({initial,onSave}:{initial:SaleListing;onSave:(input:unknown)=>Promise<void>}) {
  const [draft,setDraft]=useState<SaleDetails>(initial);const [busy,setBusy]=useState(false);const [message,setMessage]=useState('');
  return <form className="space-y-3" onSubmit={async e=>{e.preventDefault();if(busy)return;const f=new FormData(e.currentTarget);setBusy(true);setMessage('');try{await onSave({...draft,status:String(f.get('status')),availability:String(f.get('availability')),internalNotes:String(f.get('notes')),reviewConfirmed:f.get('review')==='on'});setMessage('Granskningsbeslut sparat.');}catch(err){setMessage((err as Error).message);}finally{setBusy(false);}}}>
    <p className="bg-slate-100 p-3 rounded-xl text-sm">Privat säljarkontakt: {initial.sellerName} · {initial.sellerEmail}<br/>Referens: {initial.id}<br/>Behörighetsförsäkran från säljaren: {initial.authorityConfirmed?'Ja':'Nej'} · Uppgifter godkända som offentliga av säljaren: {initial.publicContentConfirmed?'Ja':'Nej'}<br/>Senaste beslut: {initial.reviewedAt||'Inte granskat'} · {initial.reviewedBy||'–'}</p>
    <fieldset disabled={busy} className="space-y-3"><SaleFields draft={draft} onChange={setDraft}/>
      <label className="block">Privata handläggningsanteckningar<textarea name="notes" className={field} maxLength={2000} defaultValue={initial.internalNotes}/></label>
      <label className="block">Annonsstatus<select name="status" className={field} defaultValue={initial.status==='pending'?'draft':initial.status}><option value="draft">Utkast / avpublicerad</option><option value="published">Publicerad</option><option value="rejected">Avslagen</option></select></label>
      <label className="block">Affärsstatus<select name="availability" className={field} defaultValue={initial.availability}>{Object.entries(SALE_AVAILABILITY).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label>
      <label className="flex gap-2"><input name="review" type="checkbox"/>Jag har granskat annonsen, säljarens uppgivna behörighet och att fälten får publiceras. Krävs vid varje publicering.</label>
      <button className={button}>Spara granskningsbeslut</button>
    </fieldset>{message&&<p role="status">{message}</p>}
  </form>;
}
