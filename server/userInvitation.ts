import { createHash } from 'node:crypto';
export interface UserInvitation {
  email:string; name:string; from:string; startedAt:string; acceptedAt?:string;
}
export type InvitationStatus='accepted'|'already-accepted'|'not-configured'|'failed'|'needs-review';
export function invitationConfigured() {return Boolean(process.env.RESEND_API_KEY?.trim() && process.env.RESEND_FROM_EMAIL?.trim());}
export function invitationPayload(invite:UserInvitation) {
  return {from:invite.from,to:[invite.email],subject:'Välkommen till Sveriges E-handel – så loggar du in',text:[
    `Hej ${invite.name}!`,'','Du har lagts till i Sveriges E-handels användarregister.',
    'Logga in här: https://sverigesehandel.se/',
    `Välj ”Logga in” och använd ditt Google-konto med adressen ${invite.email}.`,
    'Du behöver inget nytt lösenord från oss. Vi ber aldrig om ditt Google-lösenord via mejl.',
    'När du har loggat in når du din profil via ”Min företagsyta”. Medlemskap och eventuell företagsåtkomst behöver godkännas separat av Sveriges E-handel.',
    'Om adressen inte är kopplad till ett Google-konto, kontakta Sveriges E-handel innan du försöker med en annan adress.',
    'Om du inte väntade dig detta mejl kan du bortse från det och kontakta redaktionen via webbplatsen.',
    '','Vänliga hälsningar,','Sveriges E-handel',
  ].join('\n')};
}
export async function sendUserInvitation(invite:UserInvitation, transport=fetch):Promise<boolean> {
  if (!process.env.RESEND_API_KEY?.trim()) return false;
  const key=createHash('sha256').update(JSON.stringify(invitationPayload(invite))+invite.startedAt).digest('hex');
  try {
    const response=await transport('https://api.resend.com/emails',{method:'POST',signal:AbortSignal.timeout(15000),headers:{
      Authorization:`Bearer ${process.env.RESEND_API_KEY.trim()}`,'Content-Type':'application/json','Idempotency-Key':`cms-welcome/${key}`,
    },body:JSON.stringify(invitationPayload(invite))});
    return response.ok;
  }catch{return false;}
}
