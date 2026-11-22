import { PageZone } from './PageLayout';
import { ContentText } from './ContentText';
import { useEffect, useState } from 'react';
import type { InsightPost, PortalTab } from '../types';
import { publiclyVisible } from '../../shared/editorialLifecycle';
import { insightUrl } from '../../shared/insightPosts';
import { InsightPosts, insightImage } from './InsightPosts';
const articleId=()=>typeof window==='undefined'?'':window.location.hash.split('/')[1]||'';
export function BlogView({posts,onNavigate}:{posts:InsightPost[];onNavigate:(tab:PortalTab)=>void}) {
  const [id,setId]=useState(articleId);const [search,setSearch]=useState('');const [category,setCategory]=useState('all');
  useEffect(()=>{const sync=()=>setId(articleId());window.addEventListener('hashchange',sync);return()=>window.removeEventListener('hashchange',sync);},[]);
  const available=posts.filter(p=>publiclyVisible(p));
  const selected=available.find(p=>p.id===id);
  useEffect(()=>{
    const oldTitle=document.title;let meta=document.querySelector<HTMLMetaElement>('meta[name="description"]');const existed=Boolean(meta);const oldDescription=meta?.content??'';
    if(!meta){meta=document.createElement('meta');meta.name='description';document.head.append(meta);}
    document.title=selected?`${selected.seoTitle||selected.title} | Sveriges E-handel`:'Blogg & Insikter | Sveriges E-handel';
    meta.content=selected?.seoDescription||selected?.excerpt||'Insikter om svensk e-handel.';
    return()=>{document.title=oldTitle;if(meta){if(existed)meta.content=oldDescription;else meta.remove();}};
  },[selected?.id,selected?.seoTitle,selected?.seoDescription]);
  const open=(next:string)=>{setId(next);window.history.pushState(null,'',next?`#blogg/${next}`:'#blogg');window.scrollTo({top:0,behavior:'smooth'});};
  if(id)return <section className="max-w-4xl mx-auto p-5 py-10 space-y-5">
    <PageZone page="blogg" zone="article" widgets={{
"back": (<button className="underline text-blue-800" type="button" onClick={()=>open('')}>← Alla inlägg</button>),
"article": (!selected?<><h1 className="text-3xl font-bold">Inlägget är inte tillgängligt</h1><p>Det kan vara avpublicerat eller ännu inte publicerat.</p></>:<article className="space-y-5">
      <p className="text-sm text-blue-800">{selected.category}</p><h1 className="text-3xl sm:text-4xl font-bold break-words">{selected.title}</h1>
      <p className="text-sm text-slate-600">{[selected.author,selected.publishedDate].filter(Boolean).join(' · ')||'Redaktionellt innehåll'}</p>
      {insightImage(selected)&&<img src={insightImage(selected)} alt={selected.image?.alt||selected.imageAlt} className="max-h-96 w-full object-contain rounded-xl"/>}
      <p className="text-lg whitespace-pre-wrap">{selected.excerpt}</p>{selected.tags?.length?<p className="text-sm">{selected.tags.join(' · ')}</p>:null}
      {selected.body?<ContentText text={selected.body} format={selected.contentFormat}/>:<p>Det här inlägget består av en kort sammanfattning. Ingen fulltext har lagts till ännu.</p>}
      {selected.sourceUrl&&insightUrl(selected.sourceUrl)&&<a className="block underline text-blue-800" href={selected.sourceUrl} target="_blank" rel="noopener noreferrer">Källa / vidare läsning</a>}
      {selected.ctaLabel&&(selected.targetTab?<button className="underline text-blue-800" type="button" onClick={()=>onNavigate(selected.targetTab as PortalTab)}>{selected.ctaLabel} →</button>:selected.targetUrl&&insightUrl(selected.targetUrl)?<a className="underline text-blue-800" href={selected.targetUrl} target="_blank" rel="noopener noreferrer">{selected.ctaLabel} →</a>:null)}
      <a className="block underline text-blue-800" href={`#blogg/${selected.id}`}>Direktlänk till inlägget</a>
    </article>)
}}/>
  </section>;
  const visible=available.filter(p=>(category==='all'||p.category===category)&&[p.title,p.excerpt,p.body,p.author,...(p.tags??[])].join(' ').toLocaleLowerCase('sv-SE').includes(search.trim().toLocaleLowerCase('sv-SE')));
  return <section className="max-w-6xl mx-auto px-5 py-10 space-y-6"><PageZone page="blogg" zone="content" widgets={{
"header": (<><h1 className="text-3xl font-bold">Blogg & Insikter</h1>
    <p className="text-lg text-slate-600">Perspektiv, guider och kunskap om svensk e-handel. Samma redaktionella inlägg som hanteras i CMS – inga separata kopior.</p></>),
"filters": (<div className="grid sm:grid-cols-2 gap-4"><label>Sök inlägg<input className="block w-full border p-3 rounded-xl" value={search} onChange={e=>setSearch(e.target.value)}/></label>
      <label>Kategori<select className="block w-full border p-3 rounded-xl" value={category} onChange={e=>setCategory(e.target.value)}><option value="all">Alla kategorier</option>{[...new Set(available.map(p=>p.category).filter(Boolean))].sort().map(c=><option key={c}>{c}</option>)}</select></label></div>),
"posts": (<><p role="status">{visible.length} inlägg</p>{!visible.length&&<p>Inga publicerade inlägg matchar sökningen.</p>}
    <InsightPosts posts={visible} onNavigate={onNavigate} onOpenArticle={open}/></>)
}}/>
  </section>;
}
