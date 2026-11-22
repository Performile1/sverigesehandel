import { useEffect, useRef, useState } from 'react';
import type { TeamWorkspace } from '../../server/collaboration';
import type { PublicCompanyPage } from '../types';
import { CompanyPageEditor } from './CompanyPageEditor';
import { CompanyPageView } from './CompanyPageView';

const button='border rounded-lg px-3 py-2 disabled:opacity-40';
const states:Record<string,string>={draft:'Utkast',review:'Väntar på granskning',published:'Godkänt förslag',rejected:'Avslaget förslag'};
export function companyPagePreview(page:TeamWorkspace['pages'][number],version:'draft'|'published'):PublicCompanyPage|undefined {
  const content=version==='draft'?page.draft:page.published;
  if(!content)return;
  return {id:page.id,slug:page.slug,entityName:page.entityName,entityType:page.entityType,entityId:page.entityId,
    content:{...content,forms:content.forms.map(({recipientUids,...form})=>form)}};
}
export function CompanyPagesPanel({data,admin,reload}:{data:TeamWorkspace;admin:boolean;reload:()=>Promise<void>}) {
  const [search,setSearch]=useState('');
  const [filter,setFilter]=useState('all');
  const [selectedId,setSelectedId]=useState('');
  const [mode,setMode]=useState<'edit'|'preview'>('preview');
  const [version,setVersion]=useState<'draft'|'published'>('draft');
  const [mobile,setMobile]=useState(false);
  const selectedHeading=useRef<HTMLHeadingElement>(null);
  useEffect(()=>{if(selectedId){selectedHeading.current?.focus();selectedHeading.current?.scrollIntoView({block:'start',behavior:'smooth'});}},[selectedId,mode]);
  const selected=data.pages.find(p=>p.id===selectedId);
  const preview=selected?companyPagePreview(selected,version):undefined;
  const pages=data.pages.filter(p=>(filter==='all'||(filter==='live'?p.publicAvailable:p.state===filter))&&`${p.entityName} ${p.slug} ${p.draft.title}`.toLocaleLowerCase('sv').includes(search.toLocaleLowerCase('sv')));
  const choose=(id:string,action:'edit'|'preview')=>{setSelectedId(id);setMode(action);setVersion('draft');};
  return <section className="bg-white border rounded-xl p-4 sm:p-5 space-y-4" aria-label="Företagssidornas lista">
    <h2 className="text-2xl font-bold">Företagssidor ({data.pages.length})</h2>
    <p>Alla sidor du har behörighet till, även utkast. Förhandsvisning publicerar ingenting och skickar inga formulär. Nya utkast ersätter inte en redan publicerad version.</p>
    <div className="flex flex-wrap gap-3">
      <label className="flex-1 min-w-48">Sök sida<input className="block w-full border rounded-lg p-2" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Företag eller adress"/></label>
      <label>Status<select className="block border rounded-lg p-2" value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">Alla</option><option value="draft">Utkast</option><option value="review">Väntar på granskning</option><option value="published">Godkänt förslag</option><option value="rejected">Avslaget förslag</option><option value="live">Publikt tillgängliga</option></select></label>
    </div>
    {!data.pages.length&&<p role="status">Inga företagssidor sparade ännu. Admin kan skapa sidutkasten ovan eller reservera en egen adress nedan.</p>}
    {!!data.pages.length&&!pages.length&&<p role="status">Inga sidor matchar sökningen.</p>}
    <ul className="space-y-3">{pages.map(page=><li key={page.id} className="border rounded-xl p-3 space-y-2">
      <h3 className="font-bold">{page.entityName} · #{page.slug}</h3>
      <p className="text-sm">{states[page.state]} · {page.publicAvailable?'Publikt tillgänglig':page.published?'Godkänd version finns, men företagsposten är inte publicerad':'Inte publicerad'} · {page.draft.widgets.length} widgets</p>
      <p className="text-sm break-words">Ansvarig: {data.members.find(m=>m.uid===page.responsibleUid)?.name||(page.responsibleUid?'Sveriges E-handels administratör':'Inte angiven')}{page.managedByPlatform?' · Endast plattformsadministration':''}</p>
      <div className="flex flex-wrap gap-2"><button type="button" className={button} onClick={()=>choose(page.id,'preview')}>Förhandsvisa {page.entityName}</button>{page.canEdit&&<button type="button" className={button} onClick={()=>choose(page.id,'edit')}>Redigera {page.entityName}</button>}{page.publicAvailable&&<a className={button} href={`#${page.slug}`}>Öppna publik sida</a>}</div>
    </li>)}</ul>
    {selected&&<section className="border-t pt-4 space-y-3" aria-label="Vald företagssida">
      <div className="flex flex-wrap gap-2 items-center"><h3 ref={selectedHeading} tabIndex={-1} className="text-xl font-bold flex-1">{selected.entityName}</h3><button type="button" className={button} onClick={()=>setMode(mode==='edit'?'preview':'edit')} disabled={mode==='preview'&&!selected.canEdit}>{mode==='edit'?'Visa utseendet':'Redigera sidan'}</button><button type="button" className={button} onClick={()=>setSelectedId('')}>Stäng vald sida</button></div>
      {mode==='edit'?<CompanyPageEditor key={`${selected.id}-${selected.revision}`} page={selected} admin={admin} reload={reload}/>:<>
        <div className="flex flex-wrap gap-3"><label>Version<select className="block border rounded-lg p-2" value={version} onChange={e=>setVersion(e.target.value as typeof version)}><option value="draft">Senast sparade utkast</option>{selected.published&&<option value="published">Godkänd version</option>}</select></label><button type="button" className={button} onClick={()=>setMobile(p=>!p)}>{mobile?'Visa bred förhandsvisning':'Visa mobilbredd'}</button></div>
        <p className="text-sm">Privat förhandsvisning av sparat innehåll – inte den publika adressen. Formulär är avstängda. Osparade redigeringsfält förhandsvisas inne i redigeraren.</p>
        <div className="overflow-x-auto bg-slate-50 border rounded-xl"><div className="mx-auto w-full" style={{maxWidth:mobile?390:undefined}}>{preview&&<CompanyPageView key={`${selected.id}-${version}`} page={preview} preview previewLabel="Sparad adminförhandsvisning"/>}</div></div>
      </>}
    </section>}
  </section>;
}
