import { Fragment, type ReactNode } from 'react';
import type { HomeWidgetId } from '../types';
import { widgetsInZone } from '../../shared/homeWidgets';
export function HomeWidgetZone({layout,zone,widgets}:{layout:unknown;zone:'top'|'editorial';widgets:Partial<Record<HomeWidgetId,ReactNode>>}) {
  return <>{widgetsInZone(layout,zone).map(w=><Fragment key={w.id}>{widgets[w.id]??null}</Fragment>)}</>;
}
