import type { PortalTab, PageLayout, PageLayouts, HomeWidgetLayout } from '../src/types.ts';
import { HOME_WIDGETS, homeWidgetLayout } from './homeWidgets.ts';
export interface PageWidgetDefinition {id:string;label:string;zone:string;locked?:boolean}
export const PUBLIC_PAGE_NAMES:Record<PortalTab,string>={marknad:'Startsida / Marknad',nyheter:'Nyheter',event:'Event & mässor',historia:'Historia',ehandlare:'E-handlare',partners:'Partners', '3pl':'3PL & 4PL',jobb:'Jobb',community:'Community – publika delar',kontakt:'Kontakt',starta:'Starta e-handel','kop-salj':'Köpa & sälja',om:'Om oss',blogg:'Blogg & Insikter'};
export const PAGE_WIDGETS:Record<PortalTab,PageWidgetDefinition[]>={
"marknad":[
  {"id":"hero","label":"Huvudsektion, sökning & nyckeltal","zone":"hero","locked":true},
  {"id":"economics","label":"Order-/fraktekonomi & marginalkalkylator","zone":"analysis","locked":false},
  {"id":"coverage","label":"Leveranser, täckning & densitet","zone":"analysis","locked":false},
  {"id":"laws","label":"Lagar & regler","zone":"analysis","locked":false},
  {"id":"mid-form","label":"Kontaktformulär mitten","zone":"analysis","locked":false},
  {"id":"intelligence","label":"Marknads- & teknikkällor","zone":"analysis","locked":false},
  {"id":"legacy-index","label":"Historisk Paketindexsammanfattning","zone":"analysis","locked":false},
  {"id":"quick-links","label":"Jobb- & historieingångar","zone":"links","locked":false},
  ...Object.entries(HOME_WIDGETS).map(([id,v])=>({id,label:v.label,zone:v.zone})),
],
"nyheter":[
  {"id":"header","label":"Sidhuvud & sökfilter","zone":"intro","locked":true},
  {"id":"ad","label":"Annonsplats","zone":"content","locked":false},
  {"id":"top-form","label":"Övre formulär","zone":"content","locked":false},
  {"id":"news","label":"Nyhetslista","zone":"content","locked":false},
  {"id":"mid-form","label":"Mellanformulär","zone":"content","locked":false},
  {"id":"checkout","label":"Checkout-ingång","zone":"content","locked":false},
  {"id":"bottom-form","label":"Nedre formulär","zone":"content","locked":false},
],
"event":[
  {"id":"header","label":"Sidhuvud & eventöversikt","zone":"hero","locked":true},
  {"id":"ad","label":"Annonsplats","zone":"content","locked":false},
  {"id":"top-form","label":"Övre formulär","zone":"content","locked":false},
  {"id":"directory","label":"Eventkatalog & filter","zone":"content","locked":false},
  {"id":"mid-form","label":"Mellanformulär","zone":"content","locked":false},
  {"id":"program","label":"Program & agenda","zone":"content","locked":false},
  {"id":"bottom-form","label":"Nedre formulär","zone":"content","locked":false},
],
"historia":[
  {"id":"header","label":"Sidhuvud & historisk illustration","zone":"hero","locked":true},
  {"id":"top-form","label":"Övre formulär","zone":"content","locked":false},
  {"id":"filters","label":"Epokfilter","zone":"content","locked":false},
  {"id":"mid-form","label":"Mellanformulär","zone":"content","locked":false},
  {"id":"timeline","label":"Tidslinje","zone":"content","locked":false},
  {"id":"bottom-form","label":"Nedre formulär","zone":"content","locked":false},
],
"ehandlare":[
  {"id":"header","label":"Sidhuvud, sökning & filter","zone":"content","locked":true},
  {"id":"ad","label":"Annonsplats","zone":"content","locked":false},
  {"id":"top-form","label":"Övre formulär","zone":"content","locked":false},
  {"id":"mid-form","label":"Mellanformulär","zone":"content","locked":false},
  {"id":"catalog","label":"E-handlarkatalog","zone":"content","locked":false},
  {"id":"bottom-form","label":"Nedre formulär","zone":"content","locked":false},
],
"partners":[
  {"id":"header","label":"Sidhuvud, lägesval & filter","zone":"content","locked":true},
  {"id":"ad","label":"Annonsplats","zone":"content","locked":false},
  {"id":"top-form","label":"Övre formulär","zone":"content","locked":false},
  {"id":"comparison","label":"Partnerjämförelse","zone":"content","locked":false},
  {"id":"catalog","label":"Partnerkatalog","zone":"content","locked":false},
  {"id":"mid-form","label":"Mellanformulär","zone":"content","locked":false},
  {"id":"bottom-form","label":"Nedre formulär","zone":"content","locked":false},
],
"3pl":[
  {"id":"header","label":"Sidhuvud, nyckeltal & filter","zone":"content","locked":true},
  {"id":"decision","label":"3PL/4PL-beslutsstöd","zone":"content","locked":false},
  {"id":"ad","label":"Annonsplats","zone":"content","locked":false},
  {"id":"top-form","label":"Övre formulär","zone":"content","locked":false},
  {"id":"catalog","label":"Logistikkatalog (lista/kort)","zone":"content","locked":false},
  {"id":"mid-form","label":"Mellanformulär","zone":"content","locked":false},
  {"id":"cross-links","label":"Relaterade ingångar","zone":"content","locked":false},
  {"id":"bottom-form","label":"Nedre formulär","zone":"content","locked":false},
],
"jobb":[
  {"id":"header","label":"Sidhuvud, jobbsökning & filter","zone":"content","locked":true},
  {"id":"ad","label":"Annonsplats","zone":"content","locked":false},
  {"id":"top-form","label":"Övre formulär","zone":"content","locked":false},
  {"id":"mid-form","label":"Mellanformulär","zone":"content","locked":false},
  {"id":"jobs","label":"Jobblista","zone":"content","locked":false},
  {"id":"recruiters","label":"Rekryteringskatalog","zone":"content","locked":false},
  {"id":"bottom-form","label":"Nedre formulär","zone":"content","locked":false},
],
"community":[
  {"id":"info","label":"Publik communitypresentation","zone":"public-intro","locked":true},
  {"id":"top-form","label":"Övre formulär","zone":"top","locked":false},
  {"id":"bottom-form","label":"Nedre formulär","zone":"bottom","locked":false},
  {"id":"mid-form","label":"Forumets formulär","zone":"forum","locked":false},
  {"id":"forum","label":"Offentligt forum & diskussioner","zone":"forum","locked":false},
],
"kontakt":[
  {"id":"header","label":"Sidhuvud & kontaktvägar","zone":"content","locked":true},
  {"id":"extra-forms","label":"Extra övre formulär","zone":"content","locked":false},
  {"id":"contact","label":"Kontaktformulär & annonsöversikt","zone":"content","locked":false},
  {"id":"mid-form","label":"Mellanformulär","zone":"content","locked":false},
  {"id":"bottom-form","label":"Nedre formulär","zone":"content","locked":false},
],
"starta":[
  {"id":"header","label":"Sidhuvud & ingress","zone":"content","locked":true},
  {"id":"notice","label":"Rådgivningsinformation","zone":"content","locked":true},
  {"id":"contents","label":"Kapitelinnehållsförteckning","zone":"content","locked":false},
  {"id":"chapters","label":"Guidekapitel & checklistor","zone":"content","locked":false},
  {"id":"cross-links","label":"Köp-/säljingång","zone":"content","locked":false},
],
"kop-salj":[
  {"id":"header","label":"Sidhuvud & ingress","zone":"content","locked":true},
  {"id":"notice","label":"Säkerhets- & ansvarsbesked","zone":"content","locked":true},
  {"id":"catalog","label":"Sökning, filter & annonser","zone":"content","locked":false},
  {"id":"submission","label":"Lämna annons (verifieringskrav kvar)","zone":"content","locked":false},
],
"om":[
  {"id":"header","label":"Kicker, rubrik & ingress","zone":"content","locked":true},
  {"id":"body","label":"Om oss-text","zone":"content","locked":false},
  {"id":"contact","label":"Rättelser & kontakt","zone":"content","locked":false},
],
"blogg":[
  {"id":"back","label":"Tillbaka till blogglistan","zone":"article","locked":true},
  {"id":"article","label":"Publicerad artikel / inte tillgänglig","zone":"article","locked":true},
  {"id":"header","label":"Sidhuvud & ingress","zone":"content","locked":true},
  {"id":"filters","label":"Sökning & kategorier","zone":"content","locked":false},
  {"id":"posts","label":"Inläggslista & träffantal","zone":"content","locked":false},
],
};
export const PAGE_ZONE_LABELS:Record<string,string>={hero:'Sidhuvud',intro:'Introduktion',content:'Sidinnehåll',top:'Övre yta',support:'Övre annonser & formulär',market:'Marknadsöversikt',analysis:'Fördjupning & verktyg',editorial:'Redaktionell yta',links:'Relaterade ingångar',footer:'Nedre formulär',article:'Artikelsida','public-intro':'Publik presentation',bottom:'Nedre yta',forum:'Offentligt forum'};
export function isPublicPage(v:unknown):v is PortalTab{return typeof v==='string'&&Object.hasOwn(PAGE_WIDGETS,v);}
export function defaultPageLayout(page:PortalTab,legacy?:HomeWidgetLayout):PageLayout {
  const defs=PAGE_WIDGETS[page];const items=defs.map((d,order)=>({id:d.id,order,enabled:true}));
  if(page==='marknad'&&legacy){
    const old=homeWidgetLayout(legacy);
    // Keep previous visible choices and relative order in each original zone.
    for(const zone of [...new Set(defs.map(d=>d.zone))]){
      const positions=items.map((i,n)=>({i,n})).filter(({i})=>defs.find(d=>d.id===i.id)!.zone===zone);
      const ordered=old.items.filter(i=>positions.some(p=>p.i.id===i.id)).sort((a,b)=>a.order-b.order);
      ordered.forEach((oldItem,n)=>{const pos=positions[n];if(pos)items[pos.n]={id:oldItem.id,enabled:oldItem.enabled,order:pos.n};});
    }
  }
  return {version:1,revision:0,items};
}
export function validPageLayout(page:PortalTab,value:unknown):value is PageLayout {
  if(!value||typeof value!=='object')return false;const v=value as PageLayout;const defs=PAGE_WIDGETS[page];
  return (v.legacyHomeRevision===undefined||Number.isSafeInteger(v.legacyHomeRevision)&&v.legacyHomeRevision>=0)&&v.version===1&&Number.isSafeInteger(v.revision)&&v.revision>=0&&Array.isArray(v.items)&&v.items.length===defs.length&&new Set(v.items.map(i=>i?.id)).size===defs.length&&new Set(v.items.map(i=>i?.order)).size===defs.length&&v.items.every(i=>{
    const d=defs.find(d=>d.id===i?.id);if(!d||typeof i.enabled!=='boolean'||!Number.isInteger(i.order)||i.order<0||i.order>=defs.length)return false;
    // Orders are positions in the registered zones. Neither cross-zone nor crossing mandatory slots is allowed.
    const target=defs[i.order];return target.zone===d.zone&&(!d.locked||(i.enabled&&i.order===defs.indexOf(d)))&&(!target.locked||target.id===d.id);
  });
}
export function validPageLayouts(value:unknown):value is PageLayouts {
  return !!value&&typeof value==='object'&&!Array.isArray(value)&&Object.entries(value).every(([page,layout])=>isPublicPage(page)&&validPageLayout(page,layout));
}
export function pageLayout(page:PortalTab,value:unknown,legacy?:HomeWidgetLayout):PageLayout {
  return structuredClone(validPageLayout(page,value)?value:defaultPageLayout(page,legacy));
}
export function pageZoneItems(page:PortalTab,zone:string,value:unknown,legacy?:HomeWidgetLayout) {
  const defs=PAGE_WIDGETS[page];const resolved=pageLayout(page,value,legacy);
  const dependency=(id:string)=>page==='starta'&&id==='contents'?'chapters':page==='historia'&&id==='filters'?'timeline':page==='blogg'&&id==='filters'?'posts':'';
  return resolved.items.filter(i=>i.enabled&&(!dependency(i.id)||resolved.items.some(v=>v.id===dependency(i.id)&&v.enabled))&&defs.some(d=>d.id===i.id&&d.zone===zone)).sort((a,b)=>a.order-b.order);
}
