import { useState } from 'react';
import type { CMSStore, PageLayout, PortalTab } from '../types';
import { PAGE_WIDGETS, PUBLIC_PAGE_NAMES, PAGE_ZONE_LABELS, defaultPageLayout, pageLayout } from '../../shared/pageLayouts';
import { api } from '../api';
export function PageLayoutsEditor({store,onRefresh,onPreview,initialDraft}:{initialDraft?:{page:PortalTab;layout:PageLayout};store:CMSStore;onRefresh:()=>Promise<void>;onPreview?:(page:PortalTab,layout:PageLayout)=>void}) {
  const [page,setPage]=useState<PortalTab>(initialDraft?.page??'marknad');
  return <section className="space-y-4"><h2 className="text-2xl font-bold">Sidor & layout – publika widgets</h2>
    <p>Alla 14 publika sidtyper har egna, tillåtna sektionsmoduler. Flytta inom befintlig yta eller visa/dölj utan att radera innehåll. Huvudrubriker och ansvarsbesked är låsta. Privata inkorgar, medlemsansökan, autentisering, modaler, CMS, navigation och sidfot styrs inte här.</p>
    <label className="block">Välj sida<select className="block w-full border rounded-xl p-3 mt-1" value={page} onChange={e=>setPage(e.target.value as PortalTab)}>{Object.entries(PUBLIC_PAGE_NAMES).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label>
    <LayoutForm key={`${page}-${store.pageLayouts?.[page]?.revision??0}-${page==='marknad'?store.homeWidgets?.revision??0:0}`} page={page} initialDraft={initialDraft?.page===page?initialDraft.layout:undefined} store={store} onRefresh={onRefresh} onPreview={onPreview}/>
  </section>;
}
function LayoutForm({page,store,onRefresh,onPreview,initialDraft}:{initialDraft?:PageLayout;page:PortalTab;store:CMSStore;onRefresh:()=>Promise<void>;onPreview?:(page:PortalTab,layout:PageLayout)=>void}) {
  const [draft,setDraft]=useState(()=>pageLayout(page,initialDraft?.revision===(store.pageLayouts?.[page]?.revision??0)?initialDraft:store.pageLayouts?.[page],store.homeWidgets));
  const [busy,setBusy]=useState(false);const [message,setMessage]=useState('');const defs=PAGE_WIDGETS[page];
  const move=(id:string,delta:number)=>{
    const ordered=[...draft.items].sort((a,b)=>a.order-b.order);const from=ordered.findIndex(i=>i.id===id);const def=defs.find(d=>d.id===id)!;
    const zoneItems=ordered.filter(i=>defs.find(d=>d.id===i.id)!.zone===def.zone);const pos=zoneItems.findIndex(i=>i.id===id);const target=zoneItems[pos+delta];
    if(!target||def.locked||defs.find(d=>d.id===target.id)!.locked)return;
    const a=draft.items.find(i=>i.id===id)!.order;const b=target.order;
    setDraft({...draft,items:draft.items.map(i=>i.id===id?{...i,order:b}:i.id===target.id?{...i,order:a}:i)});
  };
  return <form className="bg-white border rounded-2xl p-5 space-y-5" onSubmit={async e=>{e.preventDefault();if(busy)return;
    if(!window.confirm(`Publicera layout för ${PUBLIC_PAGE_NAMES[page]}? Innehåll bevaras. Förhandsgranska och kontrollera mobil/desktop först.`))return;
    setBusy(true);setMessage('');try{await api.savePublicPageLayout(page,{...draft,...(page==='marknad'&&!store.pageLayouts?.marknad?{legacyHomeRevision:store.homeWidgets?.revision??0}:{})});await onRefresh();setMessage('Sidlayout sparad.');}catch(err){setMessage((err as Error).message+' Vid konflikt: anteckna dina val, ladda om och jämför innan nytt försök.');}finally{setBusy(false);}
  }}>
    <h3 className="font-bold text-xl">{PUBLIC_PAGE_NAMES[page]} · {defs.length} registrerade moduler</h3>
    <p className="text-sm">Inställningen ändrar bara layout, inte innehållets publicering, filter, samtycke eller behörighet. En aktiv modul kan sakna synligt innehåll om dess flik inte valts eller inga poster är publicerade. Döljning stoppar inte eventuella datahämtningar och är inte ett åtkomstskydd.</p>
    <fieldset disabled={busy} className="space-y-4">{[...new Set(defs.map(d=>d.zone))].map(zone=>{
      const items=draft.items.filter(i=>defs.find(d=>d.id===i.id)!.zone===zone).sort((a,b)=>a.order-b.order);
      return <section key={zone} className="space-y-2"><h4 className="font-bold">{PAGE_ZONE_LABELS[zone]??zone}</h4>{items.map((i,n)=>{const d=defs.find(d=>d.id===i.id)!;
        return <div key={i.id} className="border p-3 rounded-xl flex flex-wrap justify-between items-center gap-3"><label className="flex items-center gap-3"><input type="checkbox" disabled={Boolean(d.locked)} checked={i.enabled} onChange={e=>setDraft({...draft,items:draft.items.map(v=>v.id===i.id?{...v,enabled:e.target.checked}:v)})}/>{d.label}{d.locked&&<span className="text-xs">(låst)</span>}</label>
          <div className="flex gap-3"><button className="underline disabled:opacity-40" type="button" disabled={Boolean(d.locked)||n===0||Boolean(defs.find(d=>d.id===items[n-1]?.id)?.locked)} onClick={()=>move(i.id,-1)}>Upp</button><button className="underline disabled:opacity-40" type="button" disabled={Boolean(d.locked)||n===items.length-1||Boolean(defs.find(d=>d.id===items[n+1]?.id)?.locked)} onClick={()=>move(i.id,1)}>Ned</button></div>
        </div>;
      })}</section>;
    })}
      <div className="flex flex-wrap gap-3"><button className="bg-blue-800 text-white rounded-lg px-4 py-2">Publicera sidlayout</button>
        {onPreview&&<button type="button" className="border rounded-lg px-4 py-2" onClick={()=>onPreview(page,draft)}>Förhandsvisa utan att spara</button>}
        <button type="button" className="underline" onClick={()=>setDraft({...defaultPageLayout(page),revision:draft.revision})}>Standardlayout i formuläret</button>
        {page==='marknad'&&<button type="button" className="underline" onClick={()=>setDraft({...defaultPageLayout(page,store.homeWidgets),revision:draft.revision})}>Tidigare startsidesval i formuläret</button>}
      </div>
    </fieldset><p className="text-xs">Revision {draft.revision}. Standard-/tidigare val gäller först efter publicering. Spara JSON-backup före större ändringar; layouten ingår i backupen men har ingen separat versionshistorik.</p>
    {message&&<p role="status">{message}</p>}
  </form>;
}
