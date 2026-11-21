import { normalizeLoginEmail, emailLinkReturnUrl } from './authOptions.ts';
export async function requestEmailLogin(email:string, origin:string, send:(email:string,settings:{url:string;handleCodeInApp:true})=>Promise<void>) {
  await send(normalizeLoginEmail(email),{url:emailLinkReturnUrl(origin),handleCodeInApp:true});
}
export async function completeEmailLogin<T>(email:string, link:string|null, finish:(email:string,link:string)=>Promise<T>):Promise<T> {
  if(!link)throw new Error('No pending email link');
  // SDK, not the submitted email, proves ownership of the email and the one-time code.
  return finish(normalizeLoginEmail(email),link);
}
export function emailCallbackLocation(href:string, isEmailLink:(value:string)=>boolean):{link:string;cleanPath:string}|null {
  if(!isEmailLink(href))return null;
  const url=new URL(href);
  return {link:href,cleanPath:url.pathname+url.hash};
}
