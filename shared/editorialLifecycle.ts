import type { EditorialLifecycle, CmsImage, SaleCase } from '../src/types.ts';
export function validInstant(value:unknown):value is string {
  return typeof value==='string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)&&!Number.isNaN(Date.parse(value))&&new Date(value).toISOString()===value;
}
export function validLifecycle(v:EditorialLifecycle) {
  return (v.revision===undefined||Number.isSafeInteger(v.revision)&&v.revision>=0)&&
    [v.publishAt,v.expiresAt,v.trashedAt].every(d=>d===undefined||d===''||validInstant(d))&&
    !(v.publishAt&&v.expiresAt&&v.expiresAt<=v.publishAt);
}
export function publiclyVisible(v:EditorialLifecycle&{status:string},now=new Date().toISOString()) {
  return v.status==='published'&&!v.trashedAt&&(!v.publishAt||v.publishAt<=now)&&(!v.expiresAt||v.expiresAt>now);
}
export function validCmsImage(v:unknown):v is CmsImage {
  if(!v||typeof v!=='object')return false;const i=v as CmsImage;
  try{const u=new URL(i.url);return u.protocol==='https:'&&u.hostname==='firebasestorage.googleapis.com'&&!u.username&&!u.password&&
    typeof i.path==='string'&&/^cms-public\/[a-zA-Z0-9-]+\.webp$/.test(i.path)&&typeof i.alt==='string'&&!!i.alt.trim()&&i.alt.length<=200&&
    Number.isInteger(i.width)&&i.width>0&&i.width<=6000&&Number.isInteger(i.height)&&i.height>0&&i.height<=6000;}catch{return false;}
}
export function validSaleCases(value:unknown):value is SaleCase[] {
  return Array.isArray(value)&&value.length<=300&&new Set(value.map(v=>v?.messageId)).size===value.length&&value.every(v=>v&&
    typeof v.messageId==='string'&&v.messageId.length<=128&&typeof v.assignedUid==='string'&&v.assignedUid.length<=128&&
    ['new','working','waiting','resolved'].includes(v.state)&&typeof v.note==='string'&&v.note.length<=2000&&
    (v.dueDate===''||typeof v.dueDate==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v.dueDate)&&!Number.isNaN(Date.parse(v.dueDate))&&new Date(v.dueDate).toISOString().slice(0,10)===v.dueDate)&&
    Number.isSafeInteger(v.revision)&&v.revision>0&&validInstant(v.updatedAt)&&typeof v.updatedBy==='string'&&!!v.updatedBy&&v.updatedBy.length<=128);
}
