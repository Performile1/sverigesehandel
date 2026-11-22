import { PageZone } from './PageLayout';
import type { PageContentMap, PortalTab } from '../types';
import { ABOUT_CONTENT } from '../../shared/portalContent';
export function AboutView({copy,onNavigate}:{copy?:PageContentMap['om'];onNavigate:(tab:PortalTab)=>void}) {
  const content={...ABOUT_CONTENT,...copy};
  return <section className="max-w-4xl mx-auto px-5 py-12 space-y-6">
    <PageZone page="om" zone="content" widgets={{
"header": (<><p className="text-sm font-semibold text-[#006AA7]">{content.kicker}</p>
    <h1 className="text-3xl sm:text-4xl font-bold">{content.title}</h1>
    <p className="text-xl text-slate-600">{content.subtitle}</p></>),
"body": (<div className="space-y-4 leading-relaxed">{content.body.split(/\n\s*\n/).map((text,i)=><p key={i} className="whitespace-pre-wrap">{text}</p>)}</div>),
"contact": (<div className="bg-slate-50 rounded-xl p-5 space-y-2"><h2 className="font-bold text-lg">Frågor, rättelser eller samarbete?</h2>
      <p>Kontakta Sveriges E-handels redaktion via kontaktsidan. Medlemskap och företagskopplingar granskas separat från e-postverifieringen.</p>
      <button className="px-4 py-3 rounded-lg bg-[#006AA7] text-white" onClick={()=>onNavigate('kontakt')}>Kontakta redaktionen</button>
    </div>)
}}/>
  </section>;
}
