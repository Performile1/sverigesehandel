import { ADMIN_EMAIL } from '../shared/firebaseSettings.ts';

export interface CmsIdentity {
  baseAdmin?: boolean;
  mfaFactor?:string;
  authTime?:number;
  uid: string;
  email?: string;
  verified: boolean;
  admin: boolean;
}

// Match the project's existing Rules: verified owner email or admin registry.
// A client-supplied email, role or custom claim is never sufficient.
export async function resolveCmsIdentity(
  claims: { uid: string; email?: string; email_verified?: boolean; auth_time?:number; firebase?:{sign_in_second_factor?:string} },
  isRegisteredAdmin: (uid: string) => Promise<boolean>,
): Promise<CmsIdentity> {
  const verified = claims.email_verified === true;
  const admin = verified && (claims.email === ADMIN_EMAIL || await isRegisteredAdmin(claims.uid));
  return { uid: claims.uid, email: claims.email, verified, admin, mfaFactor:claims.firebase?.sign_in_second_factor, authTime:claims.auth_time };
}
