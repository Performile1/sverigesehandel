import { randomUUID } from 'node:crypto';
import type { CMSStore, EditorialKind, EditorialLifecycle, SaleListing, GuideChapter, InsightPost } from '../src/types.ts';
import { validLifecycle } from '../shared/editorialLifecycle.ts';
export function editorialConflict(current:EditorialLifecycle|undefined,revision:unknown) {
  if(revision!==(current?.revision??0))throw Object.assign(new Error('Posten har ändrats. Ladda om och jämför innan du sparar igen.'),{status:409});
}
export function editorialChange(store:CMSStore,kind:EditorialKind,before:SaleListing|GuideChapter|InsightPost|undefined,actorUid:string,action:string) {
  if(!before)return;
  const history=store.editorialHistory??[];
  if(history.length>=120)throw Object.assign(new Error('Versionsarkivet är fullt. Exportera och besluta om arkivering innan fler ändringar.'),{status:413});
  history.push({id:randomUUID(),kind,targetId:before.id,actorUid,at:new Date().toISOString(),action,before:structuredClone(before)});
  store.editorialHistory=history;
}
export function lifecycleInput(input:EditorialLifecycle,current?:EditorialLifecycle):EditorialLifecycle {
  const result={revision:(current?.revision??0)+1,publishAt:input.publishAt??'',expiresAt:input.expiresAt??'',trashedAt:current?.trashedAt??''};
  if(!validLifecycle(result))throw Object.assign(new Error('Ogiltig publiceringsperiod.'),{status:400});
  return result;
}
