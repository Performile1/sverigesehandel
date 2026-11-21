export function normalizeLoginEmail(value: string): string {
  const email=value.trim().toLowerCase();
  if(email.length>160||!/^\S+@[^\s@]+\.[^\s@]+$/.test(email))throw new Error('Ange en giltig e-postadress.');
  return email;
}
export function emailLinkReturnUrl(origin: string): string {
  const url=new URL(origin);
  if(url.protocol!=='https:'||url.username||url.password)throw new Error('E-postinloggning kräver en säker HTTPS-domän.');
  return url.origin+'/'; // Never copy email, query, returnTo or an external redirect from input.
}
export function authProviderOptions(env:Record<string,unknown>) {
  const linkedin=typeof env.VITE_FIREBASE_LINKEDIN_PROVIDER_ID==='string'&&/^oidc\.[a-zA-Z0-9_-]+$/.test(env.VITE_FIREBASE_LINKEDIN_PROVIDER_ID)
    ? env.VITE_FIREBASE_LINKEDIN_PROVIDER_ID : '';
  return { email:env.VITE_FIREBASE_EMAIL_LINK_ENABLED!=='false',facebook:env.VITE_FIREBASE_FACEBOOK_ENABLED==='true',linkedin };
}
export function loginErrorMessage(error:unknown):string {
  const code=(error as {code?:string})?.code;
  const messages:Record<string,string>={
    'auth/operation-not-allowed':'Inloggningssättet är inte aktiverat i Firebase. Använd Google tills administratören konfigurerat alternativet.',
    'auth/unauthorized-domain':'Denna domän är inte godkänd för Firebase-inloggning. Kontakta administratören.',
    'auth/invalid-action-code':'Länken är ogiltig eller redan använd. Begär en ny länk.',
    'auth/expired-action-code':'Länken har gått ut. Begär en ny länk.',
    'auth/invalid-email':'E-postadressen är ogiltig eller matchar inte länken.',
    'auth/invalid-credential':'Inloggningen kunde inte verifieras. Kontrollera adressen eller begär en ny länk.',
    'auth/too-many-requests':'För många försök. Vänta en stund innan du försöker igen.',
    'auth/quota-exceeded':'Firebase kan inte skicka fler länkar just nu. Försök senare eller använd Google.',
    'auth/network-request-failed':'Nätverksfel vid inloggning. Försök igen.',
    'auth/user-disabled':'Kontot är avstängt. Kontakta Sveriges E-handel.',
    'auth/account-exists-with-different-credential':'Adressen används med ett annat inloggningssätt. Logga in med det tidigare alternativet. Konton slås inte ihop automatiskt.',
    'auth/credential-already-in-use':'Inloggningen är redan kopplad till ett annat konto. Kontakta administratören.',
    'auth/popup-blocked':'Popup blockerades. Tillåt popup eller välj Google via omdirigering.',
    'auth/popup-closed-by-user':'Inloggningsfönstret stängdes. Försök igen.',
    'auth/cancelled-popup-request':'Inloggningsförsöket avbröts.',
    'auth/multi-factor-auth-required':'Kontot kräver en andra faktor. Detta inloggningsflöde stöder ännu inte MFA; kontakta administratören. Inget MFA-krav kringgås.',
  };
  return (code&&messages[code])||'Inloggningen kunde inte slutföras. Försök igen eller kontakta administratören.';
}
