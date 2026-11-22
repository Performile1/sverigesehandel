import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { PAGE_WIDGETS, PUBLIC_PAGE_NAMES, defaultPageLayout, pageLayout, pageZoneItems, validPageLayout, validPageLayouts } from '../shared/pageLayouts.ts';
import { PageLayoutsContext, PageZone } from '../src/components/PageLayout.tsx';
import type { PortalTab } from '../src/types.ts';
// Freeze only this test process, so expiry/relative-date UI cannot invalidate baseline tomorrow.
const FixedDate=Date;const fixedNow=Date.parse('2026-11-22T21:06:00.000Z');
globalThis.Date=new Proxy(FixedDate,{construct(target,args){return Reflect.construct(target,args.length?args:[fixedNow]);},apply(){return new FixedDate(fixedNow).toString();},get(target,key){return key==='now'?()=>fixedNow:Reflect.get(target,key);}}) as DateConstructor;
const base=process.env.LAYOUT_SOURCE_ROOT||process.cwd();
const {INITIAL_CMS_DATA}=await import(path.join(base,'server/seedData.ts'));
const {upgradeSnapshot}=await import(path.join(base,'server/snapshot.ts'));
const {publicStore}=await import(path.join(base,'server/publicStore.ts'));
const {FirebaseProvider}=await import(path.join(base,'src/contexts/FirebaseContext.tsx'));
const store=publicStore(upgradeSnapshot(structuredClone(INITIAL_CMS_DATA)));
const callbacks=Object.fromEntries(['onNavigate','onBookAdSlot','onNotify','onOpenModal','onOpenDiscover','onOpenEditor','onRequestIntro','onRequireAdmin','onSignIn','onOpenDiscoverJobs','onOpenDiscoverRecruiters','onOpenJobModal','onApplyJob'].map(k=>[k,()=>{}]));
const props:any={...store,...callbacks,threads:store.communityThreads,chapters:store.startGuide,posts:store.insightPosts,listings:store.publicSaleListings??[],merchantCount:store.merchants.length,partnerCount:store.partners.length,onRefresh:async()=>{},onFormSubmitted:async()=>{},onAddThread:async()=>{},onUpvote:async()=>{},onJoinMember:async()=>{},isSignedIn:false,isAdmin:false};
const components:Record<PortalTab,string>={marknad:'MarknadView',nyheter:'NewsView',event:'EventsView',historia:'HistoriaView',ehandlare:'MerchantsView',partners:'PartnersView','3pl':'ThreePlView',jobb:'JobsView',community:'CommunityView',kontakt:'KontaktView',starta:'StartGuideView','kop-salj':'MarketplaceView',om:'AboutView',blogg:'BlogView'};
// Ignore only renderer-generated ids, local asset-root prefixes and inter-element whitespace, not business text, values, attrs or element order.
export function normalizedMarkup(markup:string){return markup.replaceAll(base+'/src/assets/','/src/assets/').replace(/_R_[a-zA-Z0-9_-]+_/g,'REACT_ID').replace(/recharts[\w-]*-\d+/g,'CHART_ID').replace(/>\s+</g,'><').replace(/\s+/g,' ').trim();}
const results:Record<string,{sha256:string;length:number}>={};const outputDir=process.env.LAYOUT_HTML_DIR;
if(outputDir)fs.mkdirSync(outputDir,{recursive:true});
for(const [page,name]of Object.entries(components)){
  const component=(await import(path.join(base,`src/components/${name}.tsx`)))[name];
  const html=renderToStaticMarkup(createElement(FirebaseProvider,null,createElement(component,props)));
  const normalized=normalizedMarkup(html);results[page]={sha256:createHash('sha256').update(normalized).digest('hex'),length:normalized.length};
  if(outputDir)fs.writeFileSync(path.join(outputDir,`${page}.html`),normalized);
}
if(process.env.LAYOUT_BASELINE_OUTPUT){fs.writeFileSync(process.env.LAYOUT_BASELINE_OUTPUT,JSON.stringify(results,null,2));console.log('Baseline written for 14 public page types.');process.exit(0);}
const baseline=JSON.parse(fs.readFileSync('scripts/fixtures/page-layout-baseline.json','utf8'));
for(const page of Object.keys(components))assert.deepEqual(results[page],baseline.pages[page],`Default markup changed for ${page}; compare the baseline before accepting a change.`);
for(const page of Object.keys(PAGE_WIDGETS) as PortalTab[]){
  const defs=PAGE_WIDGETS[page];const defaults=defaultPageLayout(page);assert.ok(validPageLayout(page,defaults));
  assert.equal(new Set(defs.map(d=>d.id)).size,defs.length,`Duplicate widget on ${page}`);
  const slots=Object.fromEntries(defs.map(d=>[d.id,createElement('section',null,`fixture-${d.id}`)]));
  for(const zone of [...new Set(defs.map(d=>d.zone))]){
    const defaultHtml=renderToStaticMarkup(createElement(PageZone,{page,zone,widgets:slots}));
    const explicitHtml=renderToStaticMarkup(createElement(PageLayoutsContext.Provider,{value:{layouts:{[page]:defaults}}},createElement(PageZone,{page,zone,widgets:slots})));
    assert.equal(defaultHtml,explicitHtml,`Default equals saved standard for ${page}/${zone}`);
  }
  const invalid={...defaults,items:defaults.items.map((i,n)=>n===0?{...i,id:'private-inbox'}:i)};assert.ok(!validPageLayout(page,invalid));
  assert.deepEqual(pageLayout(page,invalid),defaults);
  const hide={...defaults,items:defaults.items.map(i=>({...i,enabled:defs.find(d=>d.id===i.id)!.locked?true:false}))};assert.ok(validPageLayout(page,hide));
  for(const locked of defs.filter(d=>d.locked))assert.ok(!validPageLayout(page,{...defaults,items:defaults.items.map(i=>i.id===locked.id?{...i,enabled:false}:i)}));
  assert.ok(!validPageLayout(page,{...defaults,items:[...defaults.items.slice(1),defaults.items[1]]}));
  const firstFree=defs.find(d=>!d.locked);const otherZone=firstFree&&defs.find(d=>!d.locked&&d.zone!==firstFree.zone);
  if(firstFree&&otherZone){const a=defaults.items.find(i=>i.id===firstFree.id)!,b=defaults.items.find(i=>i.id===otherZone.id)!;assert.ok(!validPageLayout(page,{...defaults,items:defaults.items.map(i=>i.id===a.id?{...i,order:b.order}:i.id===b.id?{...i,order:a.order}:i)}),'Cannot move to another responsive zone');}

  for(const zone of [...new Set(defs.map(d=>d.zone))]){
    const rows=defaults.items.filter(i=>defs.find(d=>d.id===i.id)!.zone===zone&&!defs.find(d=>d.id===i.id)!.locked);
    if(rows.length>1){const a=rows[0],b=rows[1];const swapped={...defaults,items:defaults.items.map(i=>i.id===a.id?{...i,order:b.order}:i.id===b.id?{...i,order:a.order}:i)};assert.ok(validPageLayout(page,swapped));assert.ok(pageZoneItems(page,zone,swapped).findIndex(i=>i.id===b.id)<pageZoneItems(page,zone,swapped).findIndex(i=>i.id===a.id));}
  }
}

const legacyHome={version:1 as const,revision:9,items:[{id:'audience' as const,enabled:false,order:2},{id:'latest-index' as const,enabled:true,order:1},{id:'index-archive' as const,enabled:true,order:0},{id:'insights' as const,enabled:false,order:3}]};
const inherited=defaultPageLayout('marknad',legacyHome);assert.ok(validPageLayout('marknad',inherited));
assert.deepEqual(pageZoneItems('marknad','top',inherited).map(i=>i.id),['index-archive','latest-index']);
assert.ok(!pageZoneItems('marknad','editorial',inherited).some(i=>i.id==='insights'));
assert.ok(pageZoneItems('marknad','analysis',inherited).some(i=>i.id==='economics'));
const noChapters=defaultPageLayout('starta');noChapters.items.find(i=>i.id==='chapters')!.enabled=false;
assert.ok(!pageZoneItems('starta','content',noChapters).some(i=>i.id==='contents'));
assert.equal(Object.keys(PUBLIC_PAGE_NAMES).length,14);
assert.ok(!validPageLayouts({cms:defaultPageLayout('marknad')}));
assert.ok(!PAGE_WIDGETS.community.some(d=>/directory|messages|registration|profile|inbox/.test(d.id)));
console.log(`Page layouts passed: 14 default renders match baseline ${baseline.commit}; ${Object.values(PAGE_WIDGETS).flat().length} registered page-scoped modules, strict defaults, locks, visibility and ordering.`);
process.exit(0);
