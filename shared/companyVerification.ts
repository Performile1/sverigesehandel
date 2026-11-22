import type { CompanyVerificationState } from '../src/types.ts';
const text=(v:unknown,max:number,required=false):v is string=>typeof v==='string'&&v.length<=max&&(!required||!!v.trim());
export function normalizedCompanyDomain(value:unknown):string|null {
  if(typeof value!=='string')return null;
  const d=value.trim().toLowerCase();
  // Explicit exact domains only; no guessed registrable domain or suffix matching.
  return d.length<=253&&d.split('.').every(label=>label.length<=63)&&/^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,63}$/.test(d)?d:null;
}
export function emailMatchesCompanyDomain(email:string,domains:string[]) {
  const parts=email.trim().toLowerCase().split('@');
  return parts.length===2&&domains.includes(parts[1]);
}
export function validCompanyVerification(v:unknown):v is CompanyVerificationState {
  if(!v||typeof v!=='object')return false;const s=v as CompanyVerificationState;
  const entity=(p:{entityType:string;entityId:string})=>['partner','logistics','merchant'].includes(p.entityType)&&text(p.entityId,200,true);
  return Array.isArray(s.policies)&&s.policies.length<=100&&new Set(s.policies.map(p=>p&&`${p.entityType}/${p.entityId}`)).size===s.policies.length&&s.policies.every(p=>p&&entity(p)&&Array.isArray(p.domains)&&p.domains.length<=10&&p.domains.every(d=>normalizedCompanyDomain(d)===d)&&new Set(p.domains).size===p.domains.length&&text(p.registrationNumber,60,true)&&text(p.address,500,true)&&text(p.reviewedBy,128,true)&&text(p.reviewedAt,40,true))&&
    Array.isArray(s.claims)&&s.claims.length<=200&&new Set(s.claims.map(c=>c?.id)).size===s.claims.length&&s.claims.every(c=>c&&entity(c)&&text(c.id,80,true)&&text(c.uid,128,true)&&text(c.email,160,true)&&text(c.name,100,true)&&text(c.position,120,true)&&text(c.registrationNumber,60,true)&&text(c.address,500,true)&&text(c.reason,1500,true)&&['pending','approved','rejected','revoked'].includes(c.state)&&Number.isSafeInteger(c.revision)&&c.revision>=0&&text(c.createdAt,40,true)&&text(c.reviewedBy,128)&&text(c.reviewedAt,40)&&text(c.reviewNote,1500)&&typeof c.domainMatched==='boolean'&&text(c.mfaVerifiedAt,40,true)&&(c.linkId===undefined||text(c.linkId,80,true)));
}
