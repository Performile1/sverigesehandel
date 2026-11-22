import { useState } from 'react';
import type { PublicCompanyPage } from '../types';
import { ContentText } from './ContentText';
import { contentUrl } from '../../shared/contentFormat';
import { useFirebase } from '../contexts/FirebaseContext';
import { api } from '../api';
export function CompanyPageView({page,preview=false}:{page?:PublicCompanyPage;preview?:boolean}) {
  if(!page)return <section className="max-w-4xl mx-auto p-6 space-y-4"><h1 className="text-3xl font-bold">Företagssidan är inte tillgänglig</h1><p>Adressen kan saknas eller sidan är inte publicerad. Kontakta Sveriges E-handel vid frågor.</p><a className="underline" href="#partners">Till partnerkatalogen</a></section>;
  return <section className="max-w-5xl mx-auto p-5 py-10 space-y-6"><p className="text-sm text-blue-800">Företagssida · {page.entityName} {preview?'· Osparad förhandsvisning':''}</p><h1 className="text-3xl font-bold">{page.content.title}</h1><p className="text-lg">{page.content.summary}</p>
    <p className="text-xs text-slate-600">Information från företaget, publicerad efter Sveriges E-handels granskning. Publicering är inte en garanti för tjänstens kvalitet.</p>
    {page.content.widgets.filter(w=>w.enabled).map(w=><article className="bg-white border rounded-2xl p-5 space-y-3" key={w.id}>{w.title&&<h2 className="text-xl font-bold">{w.title}</h2>}
      {w.type==='image'?contentUrl(w.url,true)&&<img src={w.url} alt={w.alt} className="w-full max-h-96 object-contain rounded-xl" loading="lazy"/>:w.type==='form'?<CompanyContactForm key={`${w.formId}-${preview}`} pageId={page.id} form={page.content.forms.find(f=>f.id===w.formId)} preview={preview}/>:<><ContentText text={w.body} format="markdown"/>{w.url&&contentUrl(w.url)&&<a className="underline text-blue-800" href={w.url} target="_blank" rel="noopener noreferrer">Till företagets webbplats →</a>}</>}
    </article>)}
  </section>;
}
function CompanyContactForm({pageId,form,preview}:{pageId:string;form?:PublicCompanyPage['content']['forms'][number];preview:boolean}){
  const {user,requestSignIn}=useFirebase();const [busy,setBusy]=useState(false);const [message,setMessage]=useState('');const [sent,setSent]=useState(false);const [id]=useState(()=>`request-${crypto.randomUUID()}`);
  if(!form)return <p>Formuläret saknas.</p>;
  if(sent)return <p role="status">Din förfrågan är sparad för Sveriges E-handel och företagets behöriga mottagare. Inget automatiskt mejl skickas.</p>;
  return <div className="space-y-3"><h3 className="font-bold">{form.title}</h3><p className="text-sm">Skicka inte lösenord, kortuppgifter, personnummer eller känsliga ärendedokument. Inga bilagor tas emot. Verifierad e-post krävs. Formuläret ersätter inte företagets akuta supportkanaler.</p>
    {!preview&&!user?.emailVerified?<button className="bg-blue-800 text-white rounded-lg p-3" onClick={requestSignIn}>Logga in och verifiera e-post för att skicka</button>:<form className="space-y-3" onSubmit={async e=>{e.preventDefault();if(preview||busy)return;const values=new FormData(e.currentTarget);setBusy(true);setMessage('');try{await api.teamAction('message',{id,pageId,formId:form.id,confirm:values.get('confirm')==='on',answers:Object.fromEntries(form.fields.map(f=>[f.id,String(values.get(f.id)||'')]))});setSent(true);}catch(err){setMessage((err as Error).message);}finally{setBusy(false);}}}>
      <fieldset disabled={busy||preview} className="space-y-3">{form.fields.map(f=><label key={f.id} className="block text-sm">{f.label}{f.type==='textarea'?<textarea name={f.id} required={f.required} maxLength={2000} className="block w-full border rounded-lg p-2"/>:f.type==='select'?<select name={f.id} required={f.required} className="block w-full border rounded-lg p-2"><option value="">Välj</option>{f.options.map((v,i)=><option key={i}>{v}</option>)}</select>:<input name={f.id} type={f.type} required={f.required} maxLength={300} className="block w-full border rounded-lg p-2"/>}</label>)}
        <label className="flex gap-3"><input name="confirm" type="checkbox" required/>Jag förstår att svaren och min verifierade e-post blir tillgängliga för Sveriges E-handel och företagets behöriga mottagare för att hantera förfrågan.</label><button className="bg-blue-800 text-white rounded-lg p-3">{preview?'Förhandsvisning – inget skickas':'Skicka förfrågan'}</button></fieldset>{message&&<p role="alert">{message}</p>}
    </form>}
  </div>;
}
