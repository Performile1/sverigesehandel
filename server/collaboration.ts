import { ADMIN_EMAIL } from '../shared/firebaseSettings.ts';
import { randomUUID, createHash } from 'node:crypto';
import type { CMSStore, CollaborationStore, CompanyPageContent, CompanyPage, EditorialDraft, PlatformRole, CompanyPageMessage } from '../src/types.ts';
import type { CmsIdentity } from './authPolicy.ts';
import { companyEntity, emptyCollaboration, validCompanyContent, validSlug, text, ROLE_LABELS } from '../shared/collaboration.ts';
import { isBlocked } from '../shared/memberGovernance.ts';
export function fail(message:string,status=400):never{throw Object.assign(new Error(message),{status});}
export function rolesFor(s:CMSStore,a:CmsIdentity):PlatformRole[]{if(!a.verified||isBlocked(s.memberGovernance,a.uid))return [];return [...new Set([...((a.baseAdmin??a.admin)?['admin' as const]:[]),...(s.communityMembers.some(m=>m.authorUid===a.uid&&m.verificationStatus==='verified')?(s.collaboration?.roles.find(r=>r.uid===a.uid)?.roles??[]):[])])];}
export function can(s:CMSStore,a:CmsIdentity,role:PlatformRole){const roles=rolesFor(s,a);return roles.includes('admin')||roles.includes(role);}
export function companyLink(s:CMSStore,uid:string,p:Pick<CompanyPage,'entityType'|'entityId'>){
  if(isBlocked(s.memberGovernance,uid)||!s.communityMembers.some(m=>m.authorUid===uid&&m.verificationStatus==='verified'))return;
  return s.memberGovernance?.links.find(l=>l.uid===uid&&l.entityType===p.entityType&&l.entityId===p.entityId&&l.status==='active');
}
export function publicCompanyPages(s:CMSStore){return (s.collaboration?.pages??[]).flatMap(p=>{
  const entity=companyEntity(s,p);if(!p.published||entity?.status!=='published')return [];
  const widgets=p.published.widgets.filter(w=>w.enabled).map(w=>({id:w.id,type:w.type,title:w.title,body:w.body,url:w.url,alt:w.alt,formId:w.formId,enabled:true}));
  const forms=p.published.forms.filter(f=>widgets.some(w=>w.type==='form'&&w.formId===f.id)).map(f=>({id:f.id,title:f.title,purpose:f.purpose,fields:f.fields.map(q=>({id:q.id,label:q.label,type:q.type,required:q.required,options:[...q.options]}))}));
  return [{id:p.id,entityType:p.entityType,slug:p.slug,entityName:entity.name,content:{title:p.published.title,summary:p.published.summary,widgets,forms}}];
});}
export function contentHash(s:CMSStore,kind:string,id:string){const value=kind==='insight'?s.insightPosts?.find(p=>p.id===id):kind==='guide'?s.startGuide?.find(p=>p.id===id):s.news.find(p=>p.id===id);return createHash('sha256').update(JSON.stringify(value??null)).digest('hex');}
export function checkActor(s:CMSStore,a:CmsIdentity){if(!a?.verified||!a.uid||!a.email||isBlocked(s.memberGovernance,a.uid))fail('Verifierad åtkomst krävs.',403);}
export function canReceive(s:CMSStore,uid:string,p:CompanyPage,purpose:string,createdAt:string){
  if(!s.memberGovernance?.settings.enabled||!s.memberGovernance.settings.messagesEnabled)return false;
  const l=companyLink(s,uid,p);return !!l&&(purpose==='lead'||purpose==='quote'?l.receiveIntros:l.receiveMessages)&&(l.includeHistory||createdAt>=l.createdAt);
}
export function eligibleRecipients(s:CMSStore,p:CompanyPage,purpose:string,at=new Date().toISOString()){return (s.memberGovernance?.links??[]).filter(l=>l.entityType===p.entityType&&l.entityId===p.entityId&&canReceive(s,l.uid,p,purpose,at)).map(l=>({uid:l.uid,name:s.communityMembers.find(m=>m.authorUid===l.uid)?.name??l.uid}));}
export function teamWorkspace(s:CMSStore,a:CmsIdentity){
  checkActor(s,a);const roles=rolesFor(s,a),admin=roles.includes('admin'),editor=admin||roles.includes('editor'),moderator=admin||roles.includes('community-admin');const c=s.collaboration??emptyCollaboration();
  const pages=c.pages.filter(p=>admin||companyLink(s,a.uid,p));
  const messages=c.messages.filter(m=>{if(admin)return true;const p=pages.find(p=>p.id===m.pageId);const form=p?.published?.forms.find(f=>f.id===m.formId);return !!p&&!!form&&form.recipientUids.includes(a.uid)&&(!m.assignedUid||m.assignedUid===a.uid)&&canReceive(s,a.uid,p,m.purpose,m.createdAt);});
  return {roles,revision:c.revision,
    grants:admin?c.roles:[],members:admin?s.communityMembers.filter(m=>m.authorUid).map(m=>({uid:m.authorUid!,name:m.name,email:m.email,status:m.verificationStatus})):[],
    drafts:(editor?c.drafts:roles.includes('writer')?c.drafts.filter(d=>d.uid===a.uid):[]),
    editorial:editor?{insights:(s.insightPosts??[]).map(p=>({...p,editHash:contentHash(s,'insight',p.id)})),guides:(s.startGuide??[]).map(p=>({...p,editHash:contentHash(s,'guide',p.id)})),news:s.news.map(p=>({...p,editHash:contentHash(s,'news',p.id)}))}:null,
    pages:pages.map(p=>({...p,canEdit:admin||!!companyLink(s,a.uid,p)?.canPropose,recipients:{lead:eligibleRecipients(s,p,'lead'),support:eligibleRecipients(s,p,'support')}})),messages,
    companies:admin?[...s.partners.map(e=>({entityType:'partner',entityId:e.id,name:e.name})),...s.logisticsProviders.map(e=>({entityType:'logistics',entityId:e.id,name:e.name})),...s.merchants.map(e=>({entityType:'merchant',entityId:e.id,name:e.name}))]:[],
    moderation:moderator?{settings:s.memberGovernance?.settings,reports:s.memberGovernance?.reports??[],hidden:s.memberGovernance?.hidden??[],blocks:c.communityBlocks,threads:s.communityThreads.map(t=>({id:t.id,title:t.title,authorUid:t.authorUid,comments:t.comments?.map(m=>({id:m.id,body:m.body,authorUid:m.authorUid}))}))}:null,
  };
}
function audit(c:CollaborationStore,a:CmsIdentity,action:string,target:string){if(c.audit.length>=300)fail('Ändringsloggen är full. Arkivering krävs; ingen historik raderas.',413);c.audit.push({id:randomUUID(),uid:a.uid,action,target,at:new Date().toISOString()});}
function conflict(actual:number,provided:unknown){if(actual!==provided)fail('Ändringskonflikt. Ladda om.',409);}
export function collaborationAction(s:CMSStore,a:CmsIdentity,op:string,v:any){
  checkActor(s,a);if(!v||typeof v!=='object'||Array.isArray(v))fail('Objekt krävs.');const c=s.collaboration??emptyCollaboration();s.collaboration=c;const admin=can(s,a,'admin');const now=new Date().toISOString();
  if(op==='roles'){
    if(!admin)fail('Admin krävs.',403);conflict(c.revision,v.revision);
    const member=s.communityMembers.find(m=>m.authorUid===v.uid&&m.verificationStatus==='verified');if(!member||isBlocked(s.memberGovernance,v.uid))fail('Välj en godkänd UID-kopplad medlem.');
    if(v.uid===a.uid)fail('Ändra inte dina egna roller. Be annan admin.',403);
    if(!Array.isArray(v.roles)||v.roles.length>4||new Set(v.roles).size!==v.roles.length||!v.roles.every((r:unknown)=>typeof r==='string'&&Object.hasOwn(ROLE_LABELS,r)))fail('Ogiltiga roller.');
    c.roles=[...c.roles.filter(r=>r.uid!==v.uid),{uid:v.uid,roles:v.roles,updatedBy:a.uid,updatedAt:now}];c.revision++;audit(c,a,'roles',v.uid);return {ok:true};
  }
  if(op==='reserve-page'){
    if(!admin)fail('Admin krävs.',403);conflict(c.revision,v.revision);const p={entityType:v.entityType,entityId:v.entityId} as CompanyPage;
    if(!['partner','logistics','merchant'].includes(v.entityType)||!text(v.entityId,200,true)||!companyEntity(s,p)||!validSlug(v.slug))fail('Välj företag och ledig, icke reserverad adress.');
    if(c.pages.some(p=>p.slug===v.slug||p.entityType===v.entityType&&p.entityId===v.entityId))fail('Företag eller adress har redan en sida.',409);
    if(c.pages.length>=60)fail('Sidregistret är fullt.',413);
    const entity=companyEntity(s,p)!;const page:CompanyPage={...p,id:'page-'+randomUUID(),slug:v.slug,revision:0,draft:{title:entity.name,summary:'',widgets:[],forms:[]},state:'draft',submittedBy:'',reviewedBy:'',updatedAt:now};
    c.pages.push(page);c.revision++;audit(c,a,'reserve-page',page.id);return {ok:true,id:page.id};
  }
  if(op==='page-draft'){
    const p=c.pages.find(p=>p.id===v.id);if(!p)fail('Sidan saknas.',404);if(!admin&&!companyLink(s,a.uid,p)?.canPropose)fail('Ingen företagsredaktörsrättighet.',403);conflict(p.revision,v.revision);
    if(!validCompanyContent(v.content))fail('Ogiltiga widgets eller formulär.');
    // Only own currently eligible staff can be recipients; no arbitrary mailbox or external URL delivery.
    for(const f of v.content.forms)for(const uid of f.recipientUids)if(!eligibleRecipients(s,p,f.purpose,now).some(r=>r.uid===uid))fail('Mottagaren saknar aktiv företags-/mottagarbehörighet.',403);
    if(!['draft','review'].includes(v.state))fail('Företag kan bara spara utkast eller lämna för granskning.');
    const content=v.content as CompanyPageContent;
    p.draft={title:content.title,summary:content.summary,widgets:content.widgets.map(w=>({id:w.id,type:w.type,title:w.title,body:w.body,url:w.url,alt:w.alt,formId:w.formId,enabled:w.enabled})),forms:content.forms.map(f=>({id:f.id,title:f.title,purpose:f.purpose,recipientUids:[...f.recipientUids],fields:f.fields.map(q=>({id:q.id,label:q.label,type:q.type,required:q.required,options:[...q.options]}))}))};p.state=v.state;p.submittedBy=a.uid;p.submittedAsAdmin=Boolean(a.baseAdmin??a.admin);p.revision++;p.updatedAt=now;audit(c,a,'page-'+v.state,p.id);return {ok:true};
  }
  if(op==='page-decision'){
    if(!admin)fail('Admin krävs för företagspublicering.',403);const p=c.pages.find(p=>p.id===v.id);if(!p)fail('Sidan saknas.',404);conflict(p.revision,v.revision);
    if(!['publish','reject','unpublish'].includes(v.decision))fail('Ogiltigt beslut.');
    if(v.decision==='publish'){
      if(v.confirm!==true||p.state!=='review')fail('Granska ett inskickat förslag före publicering.');
      if(!p.submittedAsAdmin&&p.submittedBy!==a.uid&&!rolesFor(s,{uid:p.submittedBy,verified:true,admin:false}).includes('admin')&&!companyLink(s,p.submittedBy,p)?.canPropose)fail('Förslagsställarens koppling har återkallats.',403);
      for(const form of p.draft.forms)for(const uid of form.recipientUids)if(!eligibleRecipients(s,p,form.purpose).some(r=>r.uid===uid))fail('En formulärmottagare har förlorat behörighet. Uppdatera förslaget.',409);
      p.published=structuredClone(p.draft);p.state='published';
    }else if(v.decision==='unpublish'){delete p.published;p.state='draft';}else p.state='rejected';
    p.reviewedBy=a.uid;p.updatedAt=now;p.revision++;audit(c,a,'page-'+v.decision,p.id);return {ok:true};
  }
  if(op==='editorial-save'){
    if(!can(s,a,'editor')&&!can(s,a,'writer'))fail('Skribent eller redaktör krävs.',403);
    const old=c.drafts.find(d=>d.id===v.id);if(old&&!admin&&!can(s,a,'editor')&&old.uid!==a.uid)fail('Endast egna utkast.',403);if(old?.state==='published')fail('Skapa nytt ändringsutkast från publicerat innehåll.',409);conflict(old?.revision??0,v.revision);
    if(!['insight','guide','news'].includes(v.kind)||!text(v.title,180,true)||!text(v.summary,600)||!text(v.body,12000)||!text(v.category,100)||!text(v.sourceUrl,2000)||!text(v.sourceName,160)||!text(v.date,10)||!['draft','review'].includes(v.state))fail('Kontrollera redaktionella fält.');
    if(old&&(old.kind!==v.kind))fail('Typen kan inte ändras.');
    if(!old&&v.targetId&&!can(s,a,'editor'))fail('Skribenter skapar egna nya utkast, inte ändringar av publicerade poster.',403);
    if(!old&&v.targetId&&(contentHash(s,v.kind,v.targetId)!==v.targetHash||!new RegExp(`^${v.kind==='insight'?'insight':v.kind==='guide'?'guide':'news'}-[a-zA-Z0-9-]+$`).test(v.targetId)))fail('Källposten har ändrats. Öppna ett nytt ändringsutkast.',409);
    const id=old?.id??('draft-'+randomUUID());const targetId=old?.targetId??v.targetId??(`${v.kind==='insight'?'insight':v.kind==='guide'?'guide':'news'}-${randomUUID()}`);
    const row:EditorialDraft={id,uid:old?.uid??a.uid,revision:(old?.revision??0)+1,kind:v.kind,targetId,baseHash:old?.baseHash??contentHash(s,v.kind,targetId),state:v.state,title:v.title,summary:v.summary,body:v.body,category:v.category,sourceUrl:v.sourceUrl,sourceName:v.sourceName,date:v.date,updatedAt:now};
    c.drafts=[...c.drafts.filter(d=>d.id!==id),row];audit(c,a,'editorial-save',id);return {ok:true,id};
  }
  if(op==='editorial-publish'){
    if(!can(s,a,'editor'))fail('Redaktör krävs för publicering.',403);const d=c.drafts.find(d=>d.id===v.id);if(!d)fail('Utkast saknas.',404);conflict(d.revision,v.revision);
    if(d.state==='published'||v.confirm!==true)fail('Granska utkastet före publicering.');
    if(!/^\d{4}-\d{2}-\d{2}$/.test(d.date)||Number.isNaN(Date.parse(d.date))||new Date(d.date).toISOString().slice(0,10)!==d.date||d.date>now.slice(0,10))fail('Välj giltigt publicerings-/granskningsdatum som inte ligger i framtiden.');
    if(contentHash(s,d.kind,d.targetId)!==d.baseHash)fail('Publicerad post har ändrats sedan utkastet. Skapa ett nytt ändringsutkast.',409);
    d.state='published';d.revision++;audit(c,a,'editorial-publish',d.id);return {ok:true,publication:structuredClone(d)};
  }
  if(op==='message'){
    if(s.memberGovernance&&(!s.memberGovernance.settings.enabled||!s.memberGovernance.settings.messagesEnabled))fail('Meddelandefunktionerna är pausade i CMS.',403);
    const p=c.pages.find(p=>p.id===v.pageId&&p.published&&companyEntity(s,p)?.status==='published');if(!p)fail('Sidan är inte publicerad.',404);const f=p.published!.forms.find(f=>f.id===v.formId&&p.published!.widgets.some(w=>w.enabled&&w.type==='form'&&w.formId===f.id));if(!f)fail('Formuläret är inte aktivt.',404);
    if(!text(v.id,80,true)||!/^request-[a-zA-Z0-9-]+$/.test(v.id)||v.confirm!==true||!v.answers||typeof v.answers!=='object'||Array.isArray(v.answers))fail('Kontrollera formuläret.');
    const previous=c.messages.find(m=>m.id===v.id);if(previous){if(previous.uid!==a.uid||previous.pageId!==p.id||previous.formId!==f.id)fail('Referenskonflikt.',409);return {ok:true};}
    if(c.messages.filter(m=>m.uid===a.uid&&m.createdAt.slice(0,10)===now.slice(0,10)).length>=10)fail('Dagens gräns är nådd.',429);
    const answers:Record<string,string>=Object.create(null);if(Object.keys(v.answers).some(k=>!f.fields.some(field=>field.id===k)))fail('Okänt formulärfält.');
    for(const field of f.fields){const answer=v.answers[field.id]??'';if(!text(answer,field.type==='textarea'?2000:300,field.required)||field.type==='select'&&answer&&!field.options.includes(answer)||field.type==='email'&&answer&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(answer))fail('Kontrollera obligatoriska fält.');answers[field.id]=answer;}
    const row:CompanyPageMessage={id:v.id,pageId:p.id,formId:f.id,purpose:f.purpose,uid:a.uid,email:a.email!,answers,createdAt:now,assignedUid:'',state:'new',revision:0};c.messages.push(row);audit(c,a,'company-form',p.id);return {ok:true};
  }
  if(op==='message-status'){
    const m=c.messages.find(m=>m.id===v.id);if(!m)fail('Ärendet saknas.',404);const visible=teamWorkspace(s,a).messages.some(row=>row.id===m.id);if(!visible)fail('Ingen åtkomst till ärendet.',403);conflict(m.revision,v.revision);const p=c.pages.find(p=>p.id===m.pageId)!;const f=p.published?.forms.find(f=>f.id===m.formId);
    if(!['new','working','resolved'].includes(v.state)||!text(v.assignedUid,128))fail('Ogiltig status.');
    if(v.assignedUid&&(!f?.recipientUids.includes(v.assignedUid)||!canReceive(s,v.assignedUid,p,m.purpose,m.createdAt)))fail('Ogiltig tilldelning.',403);
    m.state=v.state;m.assignedUid=v.assignedUid;m.revision++;audit(c,a,'message-status',m.id);return {ok:true};
  }
  if(op==='community-block'){
    if(!can(s,a,'community-admin'))fail('Communityadministratör krävs.',403);if(!text(v.uid,128,true)||!text(v.reason,1000,true)||typeof v.blocked!=='boolean')fail('Kontrollera blockering.');
    if(v.uid===a.uid||s.communityMembers.some(m=>m.authorUid===v.uid&&m.email===ADMIN_EMAIL)||c.roles.some(r=>r.uid===v.uid&&r.roles.length)||s.staffProfiles?.some(p=>p.uid===v.uid))fail('Skyddat personalkonto – global admin hanterar det befintliga blockeringsflödet.',403);
    if(!s.communityMembers.some(m=>m.authorUid===v.uid))fail('Välj en känd medlem.');
    c.communityBlocks=c.communityBlocks.filter(b=>b.uid!==v.uid);if(v.blocked)c.communityBlocks.push({uid:v.uid,reason:v.reason,at:now});audit(c,a,'community-block',v.uid);return {ok:true};
  }
  fail('Okänd operation.');
}

export type TeamWorkspace=ReturnType<typeof teamWorkspace>;
