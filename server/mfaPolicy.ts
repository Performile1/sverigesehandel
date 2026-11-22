import type { CmsIdentity } from './authPolicy.ts';
export function requireTotp(actor:CmsIdentity,recent=false,now=Date.now()) {
  if(!actor.verified||actor.mfaFactor!=='totp'||(recent&&(!actor.authTime||actor.authTime>now/1000+60||now/1000-actor.authTime>600)))
    throw Object.assign(new Error(recent?'Logga in på nytt med 2FA (autentiseringsapp) innan denna säkerhetsåtgärd.':'Logga in med 2FA (autentiseringsapp) för företagsadministration.'),{status:403});
}
