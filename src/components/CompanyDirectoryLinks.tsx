import { createContext, useContext } from 'react';
import type { PublicCompanyPage, CompanyEntityType } from '../types';
export const CompanyPagesContext=createContext<PublicCompanyPage[]>([]);
export function CompanyDirectoryLinks({type}:{type:CompanyEntityType}) {
  const pages=useContext(CompanyPagesContext).filter(p=>p.entityType===type);
  if(!pages.length)return null;
  return <nav aria-label="Publicerade företagssidor" className="flex flex-wrap gap-3 text-sm border border-white/20 rounded-xl p-3"><span className="font-bold">Företagssidor:</span>{pages.map(p=><a key={p.id} className="underline" href={`#${p.slug}`}>{p.entityName}</a>)}</nav>;
}

// Match stable entity ID and type, never a similar company name or guessed slug.
export function CompanyPageLink({type,entityId}:{type:CompanyEntityType;entityId:string}) {
  const page=useContext(CompanyPagesContext).find(p=>p.entityType===type&&p.entityId===entityId);
  if(!page)return null;
  return <a href={`#${page.slug}`} className="inline-flex items-center rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-[#006AA7] hover:bg-slate-50 focus-visible:outline-2" aria-label={`Visa företagssida för ${page.entityName}`}>Visa företagssida →</a>;
}
