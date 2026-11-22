import { useEffect, useState } from 'react';
import type { CMSSection } from '../types';
export const CMS_GROUPS:Array<{label:string;sections:CMSSection[]}>= [
  {label:'Företag & upptäckt',sections:['company-pages','discover','merchants','partners','logistics']},
  {label:'Innehåll & marknad',sections:['pages','widgets','news','insights','paketindex','timeline']},
  {label:'Affärer & möjligheter',sections:['commerce','events','jobs']},
  {label:'Medlemmar & ärenden',sections:['members','collaboration','forms','content']},
  {label:'Drift & säkerhet',sections:['workflow','firebase','overview']},
];
export function CmsNavigation({items,active,onSelect}:{items:Array<{id:CMSSection;label:string;count?:number}>;active:CMSSection;onSelect:(id:CMSSection)=>void}) {
  const activeGroup=CMS_GROUPS.find(g=>g.sections.includes(active))?.label||'';
  const [open,setOpen]=useState(activeGroup);const [search,setSearch]=useState('');
  useEffect(()=>setOpen(activeGroup),[activeGroup]);
  return <nav aria-label="CMS-menyn" className="space-y-2">
    <label className="block text-xs text-slate-300">Sök i CMS-menyn<input className="block w-full rounded-lg bg-white text-slate-900 p-2 mt-1" value={search} onChange={e=>setSearch(e.target.value)}/></label>
    {!search&&<div className="space-y-1 border-b border-white/15 pb-3" aria-label="Snabbval i CMS">{(['company-pages','members','widgets'] as CMSSection[]).map(id=>{const item=items.find(i=>i.id===id);return item&&<button type="button" key={id} aria-current={active===id?'page':undefined} onClick={()=>onSelect(id)} className={`block w-full p-3 rounded-lg text-left text-sm ${active===id?'bg-yellow-400 text-slate-950 font-bold':'bg-white/10 text-white'}`}>{item.label}</button>;})}</div>}
    {CMS_GROUPS.map(group=>{const visible=items.filter(i=>group.sections.includes(i.id)&&i.label.toLocaleLowerCase('sv-SE').includes(search.trim().toLocaleLowerCase('sv-SE')));return visible.length>0&&<div key={group.label}>
      <button type="button" className="w-full flex justify-between text-left p-3 text-sm font-bold rounded-lg bg-white/5" aria-expanded={Boolean(search)||open===group.label} onClick={()=>setOpen(open===group.label?'':group.label)}>{group.label}<span aria-hidden="true">{open===group.label?'−':'+'}</span></button>
      {(Boolean(search)||open===group.label)&&<div className="pl-2 py-1 space-y-1">{visible.map(i=><button key={i.id} type="button" aria-current={i.id===active?'page':undefined} onClick={()=>onSelect(i.id)} className={`w-full rounded-lg p-3 text-left text-xs flex justify-between gap-2 ${i.id===active?'bg-yellow-400 text-slate-950 font-bold':'text-slate-200 hover:bg-white/10'}`}><span>{i.label}</span>{i.count!==undefined&&<span>{i.count}</span>}</button>)}</div>}
    </div>;})}
    {search&&!items.some(i=>i.label.toLocaleLowerCase('sv-SE').includes(search.trim().toLocaleLowerCase('sv-SE')))&&<p role="status" className="p-2 text-sm">Inga menyval matchar.</p>}
  </nav>;
}
