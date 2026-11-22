import type { TeamWorkspace } from '../../server/collaboration';
import type { TeamActionResult } from '../types';

// A POST acknowledgement alone must never be presented as proof of saved pages.
export async function createAndVerifyCompanyPages(
  revision:number,
  execute:(revision:number)=>Promise<TeamActionResult>,
  read:()=>Promise<TeamWorkspace>,
) {
  const result=await execute(revision);
  if(!result.ok||!result.starterPages||result.starterPages.pages.length!==8)
    throw new Error('Skapandet kunde inte bekräftas. Läs om sidlistan innan du försöker igen.');
  const workspace=await read();
  if(!workspace.roles.includes('admin')||result.starterPages.pages.some(expected=>!workspace.pages.some(p=>p.id===expected.id&&p.slug===expected.slug)))
    throw new Error('Servern svarade, men alla sidor kunde inte läsas tillbaka. Läs om sidlistan innan ett nytt försök.');
  return {workspace,summary:result.starterPages};
}
