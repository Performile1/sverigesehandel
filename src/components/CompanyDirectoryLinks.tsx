import { createContext, useContext } from 'react';
import type { PublicCompanyPage, CompanyEntityType } from '../types';
export const CompanyPagesContext=createContext<PublicCompanyPage[]>([]);
export function CompanyDirectoryLinks({type}:{type:CompanyEntityType}) {
  const pages=useContext(CompanyPagesContext).filter(p=>p.entityType===type);
  if(!pages.length)return null;
  return <nav aria-label="Publicerade företagssidor" className="flex flex-wrap gap-3 text-sm border border-white/20 rounded-xl p-3"><span className="font-bold">Företagssidor:</span>{pages.map(p=><a key={p.id} className="underline" href={`#${p.slug}`}>{p.entityName}</a>)}</nav>;
}
