import { createContext, useContext, Fragment, type ReactNode } from 'react';
import type { PageLayouts, PortalTab, HomeWidgetLayout } from '../types';
import { PAGE_WIDGETS, pageZoneItems } from '../../shared/pageLayouts';
export const PageLayoutsContext=createContext<{layouts?:PageLayouts;legacyHome?:HomeWidgetLayout}>({});
export function PageZone({page,zone,widgets,legacyLayout}:{page:PortalTab;zone:string;widgets:Record<string,ReactNode>;legacyLayout?:HomeWidgetLayout}) {
  const context=useContext(PageLayoutsContext);
  const items=pageZoneItems(page,zone,context.layouts?.[page],legacyLayout??context.legacyHome);
  return <>{items.map(i=><Fragment key={i.id}>{widgets[i.id]??null}</Fragment>)}</>;
}

export function usePageWidgetEnabled(page:PortalTab,id:string,legacyLayout?:HomeWidgetLayout) {
  const context=useContext(PageLayoutsContext);const defs=PAGE_WIDGETS[page].find(d=>d.id===id);
  return defs? pageZoneItems(page,defs.zone,context.layouts?.[page],legacyLayout??context.legacyHome).some(i=>i.id===id):false;
}
