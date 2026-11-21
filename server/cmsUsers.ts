import { cmsFirebaseAuth } from './firebaseAdmin.ts';
import { validStaffProfile } from '../shared/staffProfiles.ts';
import type { StaffProfile } from '../src/types.ts';

export interface CmsUserInput {
  email: string; name: string; phone: string; position: string; company: string;
  employmentSince: string; expertise: string;
}
export function parseCmsUserInput(input: unknown): CmsUserInput {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw Object.assign(new Error('Ange användaruppgifter.'),{status:400});
  const raw=input as Record<string,unknown>;
  const result={} as CmsUserInput;
  for (const key of ['email','name','phone','position','company','employmentSince','expertise'] as const) {
    const value=raw[key] ?? '';
    if (typeof value!=='string') throw Object.assign(new Error('Användarfält måste vara text.'),{status:400});
    result[key]=value.trim();
  }
  result.email=result.email.toLowerCase();
  const profile:StaffProfile={...result,uid:'validation',photoUrl:'',updatedAt:new Date().toISOString()};
  if (!validStaffProfile(profile)) throw Object.assign(new Error('Kontrollera namn, e-post, telefon och anställningsdatum.'),{status:400});
  return result;
}
export interface ResolvedCmsUser { uid:string; email:string; emailVerified:boolean; created:boolean }
// Firebase calls stay outside Firestore transactions. Repeated requests resolve the
// existing email account; no account, credentials or claims are overwritten.
export async function resolveCmsUser(input:CmsUserInput, auth=cmsFirebaseAuth()):Promise<ResolvedCmsUser> {
  let created=false;
  let user;
  try { user=await auth.getUserByEmail(input.email); }
  catch(e) {
    if ((e as {code?:string}).code!=='auth/user-not-found') throw e;
    try { user=await auth.createUser({email:input.email,displayName:input.name,emailVerified:false,disabled:false});created=true; }
    catch(createError) {
      if ((createError as {code?:string}).code!=='auth/email-already-exists') throw createError;
      user=await auth.getUserByEmail(input.email);
    }
  }
  if (user.disabled || !user.email || user.email.toLowerCase()!==input.email) {
    throw Object.assign(new Error('Kontot är inaktiverat eller matchar inte adressen. Ingen återaktivering sker via detta formulär.'),{status:409});
  }
  return {uid:user.uid,email:user.email.toLowerCase(),emailVerified:user.emailVerified,created};
}
