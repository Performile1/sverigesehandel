import { validCompanyVerification } from './companyVerification.ts';
import type { CollaborationStore, CompanyPageContent, CompanyPage, CMSStore, PlatformRole } from '../src/types.ts';
import { contentUrl } from './contentFormat.ts';
import { PUBLIC_PAGE_NAMES } from './pageLayouts.ts';
export const ROLE_LABELS:Record<PlatformRole,string>={admin:'Admin',editor:'Redaktör',writer:'Skribent','community-admin':'Communityadministratör'};
export const emptyCollaboration=():CollaborationStore=>({revision:0,roles:[],drafts:[],pages:[],messages:[],audit:[],communityBlocks:[]});
export function text(v:unknown,max:number,required=false):v is string{return typeof v==='string'&&v.length<=max&&(!required||Boolean(v.trim()));}
export function validSlug(v:unknown):v is string{return typeof v==='string'&&/^[a-z][a-z0-9-]{1,49}$/.test(v)&&!Object.hasOwn(PUBLIC_PAGE_NAMES,v)&&!['cms','admin','api','login','logout','privacy','integritet','kontakt','foretag','trendgraf','events-directory','dc-program','paketindex-archive','hemleverans-densitet'].includes(v);}
const key=(v:unknown)=>typeof v==='string'&&/^[a-zA-Z0-9-]{1,80}$/.test(v)&&!['__proto__','prototype','constructor'].includes(v);
const unique=(v:Array<{id:string}>)=>v.every(i=>i&&typeof i.id==='string')&&new Set(v.map(i=>i.id)).size===v.length;
export function validCompanyContent(v:unknown):v is CompanyPageContent {
  if(!v||typeof v!=='object')return false;const c=v as CompanyPageContent;
  return text(c.title,180,true)&&text(c.summary,800)&&Array.isArray(c.forms)&&c.forms.length<=5&&unique(c.forms)&&c.forms.every(f=>f&&key(f.id)&&text(f.title,120,true)&&['lead','quote','support'].includes(f.purpose)&&Array.isArray(f.recipientUids)&&f.recipientUids.length<=20&&f.recipientUids.every(u=>text(u,128,true))&&new Set(f.recipientUids).size===f.recipientUids.length&&Array.isArray(f.fields)&&f.fields.length>0&&f.fields.length<=8&&unique(f.fields)&&f.fields.every(p=>p&&key(p.id)&&text(p.label,100,true)&&['text','email','tel','textarea','select'].includes(p.type)&&typeof p.required==='boolean'&&Array.isArray(p.options)&&p.options.length<=15&&p.options.every(o=>text(o,100,true))&&(p.type!=='select'||p.options.length>0)))&&
    Array.isArray(c.widgets)&&c.widgets.length<=15&&unique(c.widgets)&&c.widgets.every(w=>w&&key(w.id)&&['text','services','image','contact','form'].includes(w.type)&&text(w.title,180)&&text(w.body,6000)&&text(w.alt,200)&&text(w.formId,80)&&text(w.url,2000)&&typeof w.enabled==='boolean'&&(!w.url||contentUrl(w.url,w.type==='image'))&&(w.type!=='image'||w.url&&w.alt.trim())&&(w.type!=='form'||c.forms.some(f=>f.id===w.formId)));
}
export function validCollaboration(v:unknown):v is CollaborationStore {
  if(!v||typeof v!=='object')return false;const c=v as CollaborationStore;const rev=(n:unknown)=>Number.isSafeInteger(n)&&Number(n)>=0;
  return (c.verification===undefined||validCompanyVerification(c.verification))&&rev(c.revision)&&Array.isArray(c.roles)&&c.roles.length<=150&&new Set(c.roles.map(r=>r?.uid)).size===c.roles.length&&c.roles.every(r=>r&&text(r.uid,128,true)&&Array.isArray(r.roles)&&r.roles.length<=4&&new Set(r.roles).size===r.roles.length&&r.roles.every(x=>Object.hasOwn(ROLE_LABELS,x))&&text(r.updatedBy,128,true)&&text(r.updatedAt,40,true))&&
    Array.isArray(c.pages)&&c.pages.length<=60&&unique(c.pages)&&new Set(c.pages.map(p=>p.slug)).size===c.pages.length&&new Set(c.pages.map(p=>`${p.entityType}/${p.entityId}`)).size===c.pages.length&&c.pages.every(p=>p&&key(p.id)&&validSlug(p.slug)&&['partner','logistics','merchant'].includes(p.entityType)&&text(p.entityId,200,true)&&rev(p.revision)&&(p.submittedAsAdmin===undefined||typeof p.submittedAsAdmin==='boolean')&&(p.managedByPlatform===undefined||typeof p.managedByPlatform==='boolean')&&(p.responsibleUid===undefined||text(p.responsibleUid,128,true))&&validCompanyContent(p.draft)&&(p.published===undefined||validCompanyContent(p.published))&&['draft','review','published','rejected'].includes(p.state)&&text(p.submittedBy,128)&&text(p.reviewedBy,128)&&text(p.updatedAt,40))&&
    Array.isArray(c.drafts)&&c.drafts.length<=100&&unique(c.drafts)&&c.drafts.every(d=>d&&key(d.id)&&text(d.uid,128,true)&&rev(d.revision)&&['insight','guide','news'].includes(d.kind)&&key(d.targetId)&&text(d.baseHash,64)&&['draft','review','published'].includes(d.state)&&text(d.title,180,true)&&text(d.summary,600)&&text(d.body,12000)&&text(d.category,100)&&text(d.sourceUrl,2000)&&(!d.sourceUrl||contentUrl(d.sourceUrl))&&text(d.sourceName,160)&&text(d.date,10)&&text(d.updatedAt,40))&&
    Array.isArray(c.messages)&&c.messages.length<=200&&unique(c.messages)&&c.messages.every(m=>m&&key(m.id)&&key(m.pageId)&&key(m.formId)&&['lead','quote','support'].includes(m.purpose)&&text(m.uid,128,true)&&text(m.email,160,true)&&text(m.createdAt,40)&&text(m.assignedUid,128)&&['new','working','resolved'].includes(m.state)&&rev(m.revision)&&!!m.answers&&typeof m.answers==='object'&&!Array.isArray(m.answers)&&Object.keys(m.answers).length<=8&&Object.entries(m.answers).every(([k,v])=>key(k)&&text(v,2000)))&&
    Array.isArray(c.audit)&&c.audit.length<=300&&c.audit.every(a=>a&&key(a.id)&&text(a.uid,128,true)&&text(a.action,80,true)&&text(a.target,200,true)&&text(a.at,40))&&
    Array.isArray(c.communityBlocks)&&c.communityBlocks.length<=150&&new Set(c.communityBlocks.map(b=>b.uid)).size===c.communityBlocks.length&&c.communityBlocks.every(b=>b&&text(b.uid,128,true)&&text(b.reason,1000,true)&&text(b.at,40));
}
export function companyEntity(s:CMSStore,p:Pick<CompanyPage,'entityType'|'entityId'>){return (p.entityType==='partner'?s.partners:p.entityType==='logistics'?s.logisticsProviders:s.merchants).find(e=>e.id===p.entityId);}

export function companySlugFromHash(hash:string):string|null {
  const raw=hash.replace(/^#/, '').split('/')[0].toLowerCase();
  return validSlug(raw)?raw:null;
}
