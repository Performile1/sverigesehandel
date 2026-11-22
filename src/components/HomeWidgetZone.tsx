import type { ReactNode } from 'react';
import type { HomeWidgetId } from '../types';
import { PageZone } from './PageLayout';
export function HomeWidgetZone({layout,zone,widgets}:{layout:import('../types').HomeWidgetLayout|undefined;zone:import('../../shared/homeWidgets').WidgetZone;widgets:Partial<Record<HomeWidgetId,ReactNode>>}) {
  return <PageZone page="marknad" zone={zone} legacyLayout={layout} widgets={widgets}/>;
}
