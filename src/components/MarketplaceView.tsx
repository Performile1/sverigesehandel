import { PageZone } from './PageLayout';
import { ContentEditor } from './ContentEditor';
import { ContentMetadataFields } from './ContentMetadataFields';
import { ContentText } from './ContentText';
import { cleanContentMetadata } from '../../shared/contentFormat';
import { CmsPublicImage } from './CmsPublicImage';
import { useState } from 'react';
import type { PublicSaleListing, SaleDetails } from '../types';
import { SALE_CATEGORIES, SALE_AVAILABILITY, SALE_INTENTS } from '../../shared/commerce';
import { useFirebase } from '../contexts/FirebaseContext';
import { api } from '../api';
export const commerceField='block w-full mt-1 p-2 border border-slate-300 rounded-lg';
export const commerceButton='px-4 py-2 rounded-lg bg-[#006AA7] text-white disabled:opacity-50';
export const blankSale:SaleDetails={intent:'sell',title:'',category:'webshop',description:'',included:'',location:'',priceLabel:'Pris på förfrågan',quantity:'',condition:''};
export function SaleFields({draft,onChange}:{draft:SaleDetails;onChange:(value:SaleDetails)=>void}) {
  const text=(key:keyof SaleDetails,label:string,max:number,required=true,multi=false)=><label className="block">{label}{multi?<textarea className={commerceField} rows={4} required={required} maxLength={max} value={draft[key]} onChange={e=>onChange({...draft,[key]:e.target.value})}/>:<input className={commerceField} required={required} maxLength={max} value={draft[key]} onChange={e=>onChange({...draft,[key]:e.target.value})}/>}</label>;
  return <div className="space-y-3 text-sm"><label className="block">Annons: köpes eller säljes<select className={commerceField} value={draft.intent??'sell'} onChange={e=>onChange({...draft,intent:e.target.value as SaleDetails['intent']})}>{Object.entries(SALE_INTENTS).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label><label className="block">Typ<select className={commerceField} value={draft.category} onChange={e=>onChange({...draft,category:e.target.value as SaleDetails['category']})}>{Object.entries(SALE_CATEGORIES).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label>
    {text('title','Rubrik (offentlig)',160)}<ContentEditor label="Beskrivning (offentlig)" value={draft.description} format={draft.contentFormat} maxLength={6000} required onChange={(description,formatted)=>onChange({...draft,description,...(formatted?{contentFormat:'markdown' as const}:{})})}/>
    <ContentEditor label="Vad erbjuds eller efterfrågas, vad ingår inte?" value={draft.included} format={draft.contentFormat} maxLength={2000} required onChange={(included,formatted)=>onChange({...draft,included,...(formatted?{contentFormat:'markdown' as const}:{})})}/>
    <ContentMetadataFields value={draft} onChange={v=>onChange({...draft,...v})}/>
    {text('location','Ort / geografiskt område (offentligt)',100)}{text('priceLabel','Pris / budget, valuta och eventuell moms (offentligt)',100)}
    {text('quantity','Antal / omfattning (obligatoriskt för varulager)',100,draft.category==='stock')}{text('condition','Skick (obligatoriskt för varulager)',300,draft.category==='stock')}
  </div>;
}
export function MarketplaceView({listings,onSubmitted}:{listings:PublicSaleListing[];onSubmitted?:()=>void}) {
  const {user,requestSignIn}=useFirebase();const [category,setCategory]=useState('all');const [intent,setIntent]=useState('all');const [query,setQuery]=useState('');
  const visible=listings.filter(r=>(intent==='all'||(r.intent??'sell')===intent)&&(category==='all'||r.category===category)&&[r.title,r.description,r.location,...(r.tags??[])].join(' ').toLocaleLowerCase('sv-SE').includes(query.trim().toLocaleLowerCase('sv-SE')));
  return <section className="max-w-5xl mx-auto px-5 py-10 space-y-6">
    <PageZone page="kop-salj" zone="content" widgets={{
"header": (<><h1 className="text-3xl font-bold">Köpa & sälja e-handel</h1><p className="text-lg">Köp, sälj eller efterlys varumärken, webshoppar och varulager. Alla annonser granskas före publicering.</p></>),
"notice": (<p className="bg-amber-50 border rounded-xl p-4 text-sm">Annonsuppgifter kommer från annonsören. Redaktionellt godkänd publicering innebär inte verifierad äganderätt, värdering eller garanti. Gör egen granskning av avtal, rättigheter och vad som ingår. Portalen hanterar inte betalning eller överlåtelse. Dela aldrig kundregister, inloggningar eller konfidentiella dokument här.</p>),
"catalog": (<><div className="grid sm:grid-cols-3 gap-3"><label>Annons<select className={commerceField} value={intent} onChange={e=>setIntent(e.target.value)}><option value="all">Köpes & säljes</option>{Object.entries(SALE_INTENTS).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label><label>Sök annonser<input className={commerceField} value={query} onChange={e=>setQuery(e.target.value)}/></label><label>Typ<select className={commerceField} value={category} onChange={e=>setCategory(e.target.value)}><option value="all">Alla typer</option>{Object.entries(SALE_CATEGORIES).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label></div>
    <p role="status">{visible.length} annonser</p>
    {!visible.length&&<p>Inga publicerade annonser matchar just nu. Du kan lämna ett annonsförslag nedan.</p>}
    {visible.map(row=><article key={row.id} className="border bg-white rounded-2xl p-5 space-y-3"><p className="text-sm text-slate-600">{SALE_INTENTS[row.intent??'sell']} · {SALE_CATEGORIES[row.category]} · {row.location} · {SALE_AVAILABILITY[row.availability]}</p><h2 className="text-xl font-bold">{row.title}</h2><div className="grid sm:grid-cols-2 gap-3">{row.images?.map(image=><CmsPublicImage key={image.path} image={image} kind="banner"/>)}</div><p className="font-bold">{row.priceLabel}</p>{row.tags?.length? <p className="text-xs">{row.tags.join(' · ')}</p>:null}<ContentText text={row.description} format={row.contentFormat}/><h3 className="font-semibold">Erbjuds / efterfrågas</h3><ContentText text={row.included} format={row.contentFormat}/>{row.quantity&&<p>Omfattning: {row.quantity}</p>}{row.condition&&<p>Skick: {row.condition}</p>}
      <p className="text-xs text-slate-500">Uppdaterad {row.updatedAt.slice(0,10)} · Annonsörens uppgifter, inte en verifierad värdering.</p>
      {row.availability==='sold'?<p>Annonsen är avslutad.</p>:user?.emailVerified?<SaleInquiry key={`${row.id}-${user.uid}`} id={row.id}/>:<button className={commerceButton} onClick={requestSignIn}>Logga in för att anmäla intresse</button>}
    </article>)}</>),
"submission": (<div className="bg-slate-50 border rounded-2xl p-5 space-y-3"><h2 className="text-2xl font-bold">Skapa köp- eller säljannons</h2>
      <p>Alla förslag granskas av Sveriges E-handel före publicering. Endast annonsens uttryckligen offentliga fält visas; kontaktuppgifter hålls i CMS.</p>
      {user?.emailVerified?<SaleSubmission key={user.uid} onSubmitted={onSubmitted}/>:<button className={commerceButton} onClick={requestSignIn}>Registrera / logga in för att lämna annons</button>}
    </div>)
}}/>
  </section>;
}
function SaleSubmission({onSubmitted}:{onSubmitted?:()=>void}){
  const [draft,setDraft]=useState(blankSale);const [busy,setBusy]=useState(false);const [message,setMessage]=useState('');const [sent,setSent]=useState(false);
  const [requestId]=useState(()=>`sale-${crypto.randomUUID()}`);
  if(sent)return <p role="status">Annonsförslaget är mottaget ({requestId}). Det syns inte offentligt innan Sveriges E-handel godkänt det. Kontakta redaktionen med referensen vid rättelse eller borttagningsbegäran.</p>;
  return <form className="space-y-3" onSubmit={async e=>{e.preventDefault();if(busy)return;const f=new FormData(e.currentTarget);setBusy(true);setMessage('');try{await api.submitSaleListing({...cleanContentMetadata(draft),requestId,sellerName:String(f.get('sellerName')),authorityConfirmed:f.get('authority')==='on',publicContentConfirmed:f.get('publicContent')==='on'});setSent(true);onSubmitted?.();}catch(err){setMessage((err as Error).message);}finally{setBusy(false);}}}>
    <fieldset disabled={busy} className="space-y-3"><SaleFields draft={draft} onChange={setDraft}/><label className="block">Annonsörens namn (privat, för redaktionen)<input name="sellerName" className={commerceField} required maxLength={100}/></label>
      <label className="flex gap-2"><input name="authority" type="checkbox" required/>Jag har rätt att företräda annonsören och lämna erbjudandet eller köpförfrågan.</label>
      <label className="flex gap-2"><input name="publicContent" type="checkbox" required/>Annonsens offentliga fält får publiceras och innehåller inga kundregister, personuppgifter eller konfidentiella underlag.</label>
      <p className="text-xs">Din verifierade e-post kopplas till förslaget för redaktionens handläggning. Inget medlemskap eller någon företagsrättighet skapas genom annonsen.</p><button className={commerceButton}>Skicka till Sveriges E-handel för granskning</button>
    </fieldset>{message&&<p role="alert">{message} Vid osäkert svar: försök i samma formulär eller kontakta redaktionen med referens {requestId} innan du lämnar ett nytt förslag.</p>}
  </form>;
}
function SaleInquiry({id}:{id:string}) {
  const [busy,setBusy]=useState(false);const [message,setMessage]=useState('');const [sent,setSent]=useState(false);const [requestId]=useState(()=>`inq-${crypto.randomUUID()}`);
  return sent?<p role="status">Din intresseförfrågan är sparad privat i Sveriges E-handels CMS. Redaktionell hantering sker där; inget automatiskt mejl till annonsören har skickats.</p>:<details className="border rounded-lg p-3"><summary className="cursor-pointer font-semibold">Anmäl intresse via Sveriges E-handel</summary>
    <form className="space-y-3 pt-3" onSubmit={async e=>{e.preventDefault();if(busy)return;const f=new FormData(e.currentTarget);setBusy(true);setMessage('');try{await api.inquireSaleListing(id,{name:String(f.get('name')),message:String(f.get('message')),requestId});setSent(true);}catch(err){setMessage((err as Error).message);}finally{setBusy(false);}}}>
      <fieldset disabled={busy} className="space-y-3"><label className="block">Ditt namn<input name="name" required maxLength={100} className={commerceField}/></label><label className="block">Meddelande till redaktionen<textarea name="message" required maxLength={3000} className={commerceField}/></label><p className="text-xs">Namn, verifierad e-post och meddelande sparas privat för handläggning. Skicka inte känsliga uppgifter. Redaktionen kan kontakta dig om nästa steg.</p><button className={commerceButton}>Skicka privat intresseförfrågan</button></fieldset>{message&&<p role="alert">{message}</p>}
    </form>
  </details>;
}
