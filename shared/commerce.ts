import { validCmsImage, validLifecycle } from './editorialLifecycle.ts';
import type { GuideChapter, SaleDetails, SaleListing, PublicSaleListing } from '../src/types.ts';
import { insightUrl } from './insightPosts.ts';
export const SALE_INTENTS = {sell:'Säljes',buy:'Köpes'} as const;
export const SALE_CATEGORIES = { brand:'Varumärke', webshop:'Webshop / e-handelsverksamhet', stock:'Varulager / restparti' } as const;
export const SALE_AVAILABILITY = {available:'Tillgänglig',discussions:'Dialog pågår',sold:'Avslutad / såld'} as const;
const bounded=(v:unknown,max:number,required=false):v is string=>typeof v==='string'&&v.length<=max&&(!required||Boolean(v.trim()));
const date=(v:unknown)=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&!Number.isNaN(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v;
export function validChapter(value:unknown):value is GuideChapter {
  if(!value||typeof value!=='object')return false;const c=value as GuideChapter;
  return validLifecycle(c)&&/^guide-[a-z0-9-]{1,60}$/.test(c.id)&&bounded(c.title,180,true)&&bounded(c.summary,600,true)&&bounded(c.body,12000,true)&&
    Array.isArray(c.checklist)&&c.checklist.length<=20&&c.checklist.every(v=>bounded(v,300,true))&&
    ['partners','3pl','ehandlare','kontakt','jobb'].includes(c.targetTab)&&insightUrl(c.sourceUrl)&&
    (c.reviewedDate===''||date(c.reviewedDate))&&['draft','published'].includes(c.status)&&
    (c.status!=='published'||(date(c.reviewedDate)&&c.reviewedDate<=new Date().toISOString().slice(0,10)))&&
    Number.isInteger(c.order)&&c.order>=0&&c.order<=1000;
}
export function validGuide(value:unknown):value is GuideChapter[] {
  return Array.isArray(value)&&value.length<=25&&value.every(validChapter)&&new Set(value.map(c=>c.id)).size===value.length;
}
export function saleDetails(value:unknown):SaleDetails|null {
  if(!value||typeof value!=='object')return null;const v=value as SaleDetails;
  if((v.intent!==undefined&&!['buy','sell'].includes(v.intent))||!Object.hasOwn(SALE_CATEGORIES,v.category)||!bounded(v.title,160,true)||!bounded(v.description,6000,true)||!bounded(v.included,2000,true)||
    !bounded(v.location,100,true)||!bounded(v.priceLabel,100,true)||!bounded(v.quantity,100)||!bounded(v.condition,300)||
    (v.category==='stock'&&(!v.quantity.trim()||!v.condition.trim())))return null;
  return {intent:v.intent??'sell',title:v.title.trim(),category:v.category,description:v.description.trim(),included:v.included.trim(),location:v.location.trim(),priceLabel:v.priceLabel.trim(),quantity:v.quantity.trim(),condition:v.condition.trim()};
}
export function validSaleListings(value:unknown):value is SaleListing[] {
  return Array.isArray(value)&&value.length<=80&&new Set(value.map(v=>v?.id)).size===value.length&&value.every(v=>v&&validLifecycle(v)&&(v.images===undefined||Array.isArray(v.images)&&v.images.length<=5&&v.images.every(validCmsImage)&&new Set(v.images.map((i:{path:string})=>i.path)).size===v.images.length)&&/^sale-[a-zA-Z0-9-]{1,80}$/.test(v.id)&&saleDetails(v)&&
    ['pending','draft','published','rejected'].includes(v.status)&&Object.hasOwn(SALE_AVAILABILITY,v.availability)&&
    (v.origin===undefined?bounded(v.sellerUid,128,true):v.origin==='cms'&&v.sellerUid===''&&bounded(v.createdByUid,128,true))&&bounded(v.sellerEmail,160,true)&&bounded(v.sellerName,100,true)&&bounded(v.internalNotes,2000)&&
    typeof v.authorityConfirmed==='boolean'&&typeof v.publicContentConfirmed==='boolean'&&bounded(v.reviewedBy,128)&&bounded(v.reviewedAt,40)&&bounded(v.createdAt,40,true)&&bounded(v.updatedAt,40,true)&&
    (v.status!=='published'||(v.authorityConfirmed&&v.publicContentConfirmed&&v.reviewedBy&&v.reviewedAt)));
}
export function publicSaleListing(row:SaleListing):PublicSaleListing {
  return {...saleDetails(row)!,id:row.id,availability:row.availability,updatedAt:row.updatedAt,...(row.images?{images:row.images}:{})};
}
