import type { HomeWidgetId, HomeWidgetLayout } from '../src/types.ts';
export const WIDGET_ZONES={top:'Överst efter huvudsektionen',support:'Annons och formulär före kartan',market:'Karta, branschdata & konsumentinsikter',editorial:'Redaktionell yta längre ned',footer:'Formulär längst ned'} as const;
export type WidgetZone=keyof typeof WIDGET_ZONES;
export const HOME_WIDGETS:Record<HomeWidgetId,{label:string;zone:WidgetZone}>={
  audience:{label:'Målgruppskort',zone:'top'},'latest-index':{label:'Senaste Paketindex',zone:'top'},'index-archive':{label:'Paketindex – periodarkiv',zone:'top'},
  'top-ad':{label:'Övre annonsplats',zone:'support'},'top-form':{label:'Övre kontaktformulär',zone:'support'},
  'regions-map':{label:'Karta, regioner & gränshandel',zone:'market'},'industry-trends':{label:'Branschdiagram & marknadstrend',zone:'market'},'consumer-insights':{label:'Konsumentinsikter & demografi',zone:'market'},
  'checkout-cta':{label:'Checkoutstrategi – partneringång',zone:'editorial'},'mid-ad':{label:'Nedre annonsplats',zone:'editorial'},
  insights:{label:'Blogg & Insikter – urval',zone:'editorial'},'bottom-form':{label:'Nedre kontaktformulär',zone:'footer'},
};
export const DEFAULT_HOME_WIDGETS:HomeWidgetLayout={version:3,revision:0,items:(Object.keys(HOME_WIDGETS) as HomeWidgetId[]).map((id,order)=>({id,order,enabled:true}))};
const legacy=['audience','latest-index','index-archive','insights'];
const marketIds=['regions-map','industry-trends','consumer-insights'];
const version2Ids=Object.keys(HOME_WIDGETS).filter(id=>!marketIds.includes(id));
export function validHomeWidgets(value:unknown):value is HomeWidgetLayout {
  if(!value||typeof value!=='object')return false;const v=value as HomeWidgetLayout;
  const ids=v.version===1?legacy:v.version===2?version2Ids:v.version===3?Object.keys(HOME_WIDGETS):[];
  return ids.length>0&&Number.isSafeInteger(v.revision)&&v.revision>=0&&Array.isArray(v.items)&&v.items.length===ids.length&&
    new Set(v.items.map(i=>i?.id)).size===ids.length&&v.items.every(i=>i&&ids.includes(i.id)&&typeof i.enabled==='boolean'&&Number.isInteger(i.order)&&i.order>=0&&i.order<=100)&&new Set(v.items.map(i=>i.order)).size===ids.length;
}
export function homeWidgetLayout(value:unknown):HomeWidgetLayout {
  if(!validHomeWidgets(value))return structuredClone(DEFAULT_HOME_WIDGETS);
  if(value.version===3)return structuredClone(value);
  // Preserve user choices/order within existing zones; new market zone uses prior fixed order.
  const items=(Object.keys(WIDGET_ZONES) as WidgetZone[]).flatMap(zone=>{
    const defaults=DEFAULT_HOME_WIDGETS.items.filter(i=>HOME_WIDGETS[i.id].zone===zone);
    const existing=value.items.filter(i=>HOME_WIDGETS[i.id].zone===zone).sort((a,b)=>a.order-b.order);
    if(value.version===1&&zone!=='top')return defaults.map(i=>({...i,enabled:value.items.find(old=>old.id===i.id)?.enabled??i.enabled}));
    return [...existing,...defaults.filter(i=>!existing.some(old=>old.id===i.id))];
  });
  return {version:3,revision:value.revision,items:items.map((i,order)=>({...i,order}))};
}
export function widgetsInZone(value:unknown,zone:WidgetZone) {
  return homeWidgetLayout(value).items.filter(i=>i.enabled&&HOME_WIDGETS[i.id].zone===zone).sort((a,b)=>a.order-b.order);
}
