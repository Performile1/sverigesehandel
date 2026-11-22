import type { HomeWidgetId, HomeWidgetLayout } from '../src/types.ts';
export const HOME_WIDGETS:Record<HomeWidgetId,{label:string;zone:'top'|'editorial'}>={
  audience:{label:'Målgruppskort',zone:'top'},
  'latest-index':{label:'Senaste Paketindex',zone:'top'},
  'index-archive':{label:'Paketindex – periodarkiv',zone:'top'},
  insights:{label:'Blogg & Insikter – urval',zone:'editorial'},
};
export const DEFAULT_HOME_WIDGETS:HomeWidgetLayout={version:1,revision:0,items:[
  {id:'audience',enabled:true,order:0},{id:'latest-index',enabled:true,order:1},
  {id:'index-archive',enabled:true,order:2},{id:'insights',enabled:true,order:3},
]};
export function validHomeWidgets(value:unknown):value is HomeWidgetLayout {
  if(!value||typeof value!=='object')return false;const v=value as HomeWidgetLayout;
  return v.version===1&&Number.isSafeInteger(v.revision)&&v.revision>=0&&Array.isArray(v.items)&&v.items.length===4&&
    new Set(v.items.map(i=>i?.id)).size===4&&v.items.every(i=>i&&Object.hasOwn(HOME_WIDGETS,i.id)&&typeof i.enabled==='boolean'&&Number.isInteger(i.order)&&i.order>=0&&i.order<=100)&&
    new Set(v.items.map(i=>i.order)).size===4;
}
export function homeWidgetLayout(value:unknown):HomeWidgetLayout {
  return structuredClone(validHomeWidgets(value)?value:DEFAULT_HOME_WIDGETS);
}
export function widgetsInZone(value:unknown,zone:'top'|'editorial') {
  return homeWidgetLayout(value).items.filter(i=>i.enabled&&HOME_WIDGETS[i.id].zone===zone).sort((a,b)=>a.order-b.order);
}
