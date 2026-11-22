import { publiclyVisible } from '../../shared/editorialLifecycle';
import { useEffect, useState } from 'react';
import type { GuideChapter, PortalTab } from '../types';
import { PlainTextDescription } from './JobDescription';
export function StartGuideView({chapters,onNavigate}:{chapters:GuideChapter[];onNavigate:(tab:PortalTab)=>void}) {
  const published=chapters.filter(row=>publiclyVisible(row)).sort((a,b)=>a.order-b.order||a.id.localeCompare(b.id));
  const [checked,setChecked]=useState<Record<string,boolean>>({});
  useEffect(()=>{const id=window.location.hash.split('/')[1];if(id)document.getElementById(id)?.scrollIntoView();},[]);
  return <section className="max-w-5xl mx-auto px-5 py-10 space-y-6">
    <h1 className="font-bold text-3xl">Starta e-handel – steg för steg</h1>
    <p className="text-lg text-slate-600">Från affärsidé och marginal till checkout, leveranser och första kunden. Börja med en hållbar affär, inte bara en snygg butik.</p>
    <p className="bg-amber-50 border rounded-xl p-4 text-sm">Allmänt planeringsstöd, inte individuell juridisk, ekonomisk eller skatterättslig rådgivning. Kontrollera aktuella krav för din verksamhet. Partnerlänkar leder till katalogen och är inte kvalitetsgarantier. Checklistan sparas bara så länge denna vy är öppen.</p>
    <nav aria-label="Guidens kapitel" className="grid sm:grid-cols-2 gap-2">{published.map((c,i)=><a className="underline text-blue-800" key={c.id} href={`#starta/${c.id}`} onClick={e=>{e.preventDefault();window.history.replaceState(null,'',`#starta/${c.id}`);document.getElementById(c.id)?.scrollIntoView({behavior:'smooth'});}}>{i+1}. {c.title}</a>)}</nav>
    {!published.length&&<p>Inga guidekapitel är publicerade ännu.</p>}
    {published.map((c,i)=><article id={c.id} key={c.id} className="scroll-mt-24 bg-white border rounded-2xl p-5 space-y-4">
      <h2 className="text-xl font-bold">{i+1}. {c.title}</h2><p className="font-medium">{c.summary}</p><PlainTextDescription text={c.body}/>
      <fieldset className="space-y-2"><legend className="font-semibold mb-2">Din checklista</legend>{c.checklist.map((item,n)=>{const key=`${c.id}-${n}`;return <label key={key} className="flex gap-3 items-start"><input type="checkbox" className="mt-1" checked={Boolean(checked[key])} onChange={e=>setChecked(p=>({...p,[key]:e.target.checked}))}/><span>{item}</span></label>;})}</fieldset>
      <p className="text-xs text-slate-600">Senast redaktionellt granskad: {c.reviewedDate}. {c.sourceUrl&&<a href={c.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline">Källa / vidare läsning</a>}</p>
      <div className="flex gap-4 flex-wrap"><button className="bg-[#006AA7] text-white px-4 py-2 rounded-lg" onClick={()=>onNavigate(c.targetTab)}>Hitta stöd och relevanta kontakter</button><a className="underline py-2" href={`#starta/${c.id}`} onClick={e=>{e.preventDefault();window.history.replaceState(null,'',`#starta/${c.id}`);document.getElementById(c.id)?.scrollIntoView({behavior:'smooth'});}}>Länk till kapitlet</a></div>
    </article>)}
    <aside className="bg-slate-100 rounded-xl p-5 space-y-3"><h2 className="font-bold">Vill du köpa en befintlig verksamhet i stället?</h2><p>Utforska varumärken, webshoppar och varulager. Gör egen granskning av vad som ingår och ta professionell hjälp före ett avtal.</p><button className="underline text-blue-800" onClick={()=>onNavigate('kop-salj')}>Till Köp & sälj →</button></aside>
  </section>;
}
