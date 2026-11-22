import type { EditorialLifecycle } from '../types';
export function PublicationFields({value,onChange}:{value:EditorialLifecycle;onChange:(value:Partial<EditorialLifecycle>)=>void}) {
  const local=(v?:string)=>v?new Date(Date.parse(v)-new Date(v).getTimezoneOffset()*60000).toISOString().slice(0,16):'';
  return <fieldset className="border rounded-xl p-3 space-y-3 text-sm"><legend>Publiceringsperiod</legend>
    <p>Tider anges i din webbläsares lokala tidszon och sparas i UTC. Status måste vara Publicerad. Tom starttid betyder omedelbart; tom sluttid betyder tills vidare. Servern döljer posten utanför intervallet vid nästa hämtning, utan att radera den. En redan öppen sida uppdateras vid omladdning.</p>
    <label className="block">Publicera tidigast<input className="block w-full border p-2 rounded-lg" type="datetime-local" value={local(value.publishAt)} onChange={e=>onChange({publishAt:e.target.value?new Date(e.target.value).toISOString():''})}/></label>
    <label className="block">Avpublicera vid / slutdatum<input className="block w-full border p-2 rounded-lg" type="datetime-local" value={local(value.expiresAt)} onChange={e=>onChange({expiresAt:e.target.value?new Date(e.target.value).toISOString():''})}/></label>
    <p className="text-xs">Revision {value.revision??0}. Vid ändringskonflikt: kopiera din text, ladda om och jämför med sparad version innan nytt försök.</p>
  </fieldset>;
}
