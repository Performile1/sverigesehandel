import { randomUUID } from 'node:crypto';
import type { CMSStore, CompanyAdministrationClaim } from '../src/types.ts';
import type { CmsIdentity } from './authPolicy.ts';
import { can, fail } from './collaboration.ts';
import { companyEntity, text } from '../shared/collaboration.ts';
import { normalizedCompanyDomain, emailMatchesCompanyDomain } from '../shared/companyVerification.ts';
import { emptyGovernance, isBlocked } from '../shared/memberGovernance.ts';
import { requireTotp } from './mfaPolicy.ts';

export interface VerifiedClaimant {uid:string;email:string;verified:boolean;totpEnrolled:boolean;disabled:boolean}
export function companyVerificationAction(s:CMSStore,a:CmsIdentity,op:string,v:any,claimant?:VerifiedClaimant){
  if(process.env.FIREBASE_TOTP_ENABLED!=='true')fail('Företagsverifiering är avstängd tills Firebase TOTP är testat och aktiverat.',403);
  const c=s.collaboration!;const state=c.verification??{policies:[],claims:[]};c.verification=state;
  const admin=can(s,a,'admin'),now=new Date().toISOString();
  const audit=(action:string,id:string)=>{if(c.audit.length>=300)fail('Ändringsloggen är full.',413);c.audit.push({id:randomUUID(),uid:a.uid,action,target:id,at:now});c.revision++;};
  if(op==='verification-policy'){
    if(!admin)fail('Admin krävs.',403);requireTotp(a,true);
    if(c.revision!==v.revision)fail('Ladda om före sparning.',409);
    if(v.confirm!==true||!['partner','logistics','merchant'].includes(v.entityType)||!companyEntity(s,v)||!Array.isArray(v.domains)||!v.domains.length||v.domains.length>10||!v.domains.every((d:unknown)=>!!normalizedCompanyDomain(d))||!text(v.registrationNumber,60,true)||!text(v.address,500,true))fail('Granska företagets domäner, organisationsnummer och adress.');
    const policy={entityType:v.entityType,entityId:v.entityId,domains:[...new Set<string>(v.domains.map(normalizedCompanyDomain))],registrationNumber:v.registrationNumber.trim(),address:v.address.trim(),reviewedBy:a.uid,reviewedAt:now};
    state.policies=[...state.policies.filter(p=>!(p.entityType===v.entityType&&p.entityId===v.entityId)),policy];audit(op,v.entityId);return {ok:true};
  }
  if(op==='claim-submit'){
    requireTotp(a,true);
    const member=s.communityMembers.find(m=>m.authorUid===a.uid&&m.verificationStatus==='verified');if(!member)fail('Godkänt medlemskap krävs.',403);
    if(!['partner','logistics','merchant'].includes(v.entityType)||companyEntity(s,v)?.status!=='published'||!text(v.name,100,true)||!text(v.position,120,true)||!text(v.registrationNumber,60,true)||!text(v.address,500,true)||!text(v.reason,1500,true)||v.confirm!==true)fail('Fyll i företagsuppgifter och bekräfta ansökan.');
    if(state.claims.some(x=>x.uid===a.uid&&x.entityType===v.entityType&&x.entityId===v.entityId&&['pending','approved'].includes(x.state)))fail('Ansökan eller godkänd koppling finns redan.',409);
    if(state.claims.filter(x=>x.uid===a.uid&&x.createdAt.slice(0,10)===now.slice(0,10)).length>=3)fail('Dagens ansökningsgräns är nådd.',429);
    const policy=state.policies.find(p=>p.entityType===v.entityType&&p.entityId===v.entityId);
    const claim:CompanyAdministrationClaim={id:'claim-'+randomUUID(),uid:a.uid,email:a.email!,entityType:v.entityType,entityId:v.entityId,name:v.name.trim(),position:v.position.trim(),registrationNumber:v.registrationNumber.trim(),address:v.address.trim(),reason:v.reason.trim(),state:'pending',revision:0,createdAt:now,reviewedBy:'',reviewedAt:'',reviewNote:'',domainMatched:emailMatchesCompanyDomain(a.email!,policy?.domains??[]),mfaVerifiedAt:now};
    state.claims.push(claim);audit(op,claim.id);return {ok:true,id:claim.id};
  }
  if(op==='claim-decision'){
    if(!admin)fail('Admin krävs.',403);requireTotp(a,true);
    const claim=state.claims.find(x=>x.id===v.id);if(!claim)fail('Ansökan saknas.',404);if(claim.revision!==v.revision)fail('Ansökan har ändrats.',409);
    if(claim.uid===a.uid)fail('Du får inte godkänna din egen företagsansökan.',403);
    if(v.confirm!==true||!text(v.note,1500,true)||!['approve','reject','revoke'].includes(v.decision))fail('Ange granskningsbeslut och motivering.');
    const page=c.pages.find(p=>p.entityType===claim.entityType&&p.entityId===claim.entityId);
    if(v.decision==='approve'){
      if(claim.state!=='pending'||v.confirm!==true||v.confirmAuthority!==true)fail('Granska väntande ansökan och personens företrädarrätt.');
      const member=s.communityMembers.find(m=>m.authorUid===claim.uid&&m.verificationStatus==='verified');
      if(!member||isBlocked(s.memberGovernance,claim.uid)||!claimant||claimant.uid!==claim.uid||claimant.email.toLowerCase()!==claim.email.toLowerCase()||!claimant.verified||!claimant.totpEnrolled||claimant.disabled)fail('Sökandens verifierade konto, 2FA eller medlemskap behöver kontrolleras på nytt.',403);
      const policy=state.policies.find(p=>p.entityType===claim.entityType&&p.entityId===claim.entityId);if(!policy)fail('Granska företagets domäner och registeruppgifter först.');
      const match=emailMatchesCompanyDomain(claim.email,policy.domains)&&claim.registrationNumber===policy.registrationNumber&&claim.address.toLowerCase()===policy.address.toLowerCase();
      if(!match&&v.confirmException!==true)fail('Avvikande domän eller registeruppgift kräver uttrycklig extra manuell kontroll.');
      if(!page)fail('Admin måste reservera företagssidan först. Ingen adress kan tas över automatiskt.');
      if(page.responsibleUid&&page.responsibleUid!==a.uid&&!page.managedByPlatform)fail('Sidan har redan en annan ansvarig. Återkalla eller utred först.',409);
      if(page.managedByPlatform&&v.confirmHandover!==true)fail('Bekräfta överlämning från Sveriges E-handels förvaltning.');
      const g=s.memberGovernance??emptyGovernance();s.memberGovernance=g;
      if(g.links.some(l=>l.uid===claim.uid&&l.entityType===claim.entityType&&l.entityId===claim.entityId&&l.status==='active'))fail('Aktiv koppling finns redan. Granska den separat i CMS.',409);
      g.links=g.links.filter(l=>!(l.uid===claim.uid&&l.entityType===claim.entityType&&l.entityId===claim.entityId));
      if(g.links.length>=300)fail('Företagskopplingsregistret är fullt.',413);
      const linkId='verified-'+randomUUID();g.links.push({id:linkId,uid:claim.uid,entityType:claim.entityType,entityId:claim.entityId,status:'active',canPropose:true,receiveIntros:false,receiveMessages:false,includeHistory:false,createdAt:now,updatedAt:now,verificationClaimId:claim.id,verifiedEmail:claim.email});
      claim.linkId=linkId;claim.state='approved';page.managedByPlatform=false;page.responsibleUid=claim.uid;page.revision++;
    }else if(v.decision==='reject'){
      if(claim.state!=='pending')fail('Endast väntande ansökningar kan avslås.',409);claim.state='rejected';
    }else{
      if(claim.state!=='approved')fail('Ansökan är inte godkänd.',409);
      const link=s.memberGovernance?.links.find(l=>l.id===claim.linkId&&l.verificationClaimId===claim.id);if(link){link.status='revoked';link.updatedAt=now;}
      if(page?.responsibleUid===claim.uid){page.managedByPlatform=true;page.responsibleUid=a.uid;page.revision++;}claim.state='revoked';
    }
    claim.reviewedBy=a.uid;claim.reviewedAt=now;claim.reviewNote=v.note.trim();claim.revision++;audit(op,claim.id);return {ok:true};
  }
  fail('Okänd verifieringsåtgärd.');
}
