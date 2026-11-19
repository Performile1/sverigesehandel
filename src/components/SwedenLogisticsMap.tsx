import { useMemo, useState } from 'react';
import { BarChart3, Layers, MapPin, Warehouse } from 'lucide-react';
import type { LogisticsProvider, PortalTab, RegionMetric } from '../types';

interface SwedenLogisticsMapProps {
  regions: Record<string, RegionMetric>;
  selectedRegion: string;
  onSelectRegion: (regionKey: string) => void;
  logisticsProviders: LogisticsProvider[];
  onNavigate: (tab: PortalTab, searchQuery?: string) => void;
  onOpenDensitySection?: () => void;
}

type LonLat = [number, number];

// Equirectangular projection tuned for Sweden (centered around 62°N)
const LON_MIN = 9.2;
const LAT_MAX = 69.5;
const COS_REF = Math.cos((62 * Math.PI) / 180); // ~0.4695
const SCALE = 48.16;
const X_OFFSET = 27.35;
const Y_OFFSET = 16;

function project([lon, lat]: LonLat): [number, number] {
  const x = X_OFFSET + (lon - LON_MIN) * COS_REF * SCALE;
  const y = Y_OFFSET + (LAT_MAX - lat) * SCALE;
  return [Number(x.toFixed(1)), Number(y.toFixed(1))];
}

function toPath(coords: LonLat[], close = true): string {
  return (
    coords
      .map((pt, idx) => {
        const [x, y] = project(pt);
        return `${idx === 0 ? 'M' : 'L'}${x},${y}`;
      })
      .join(' ') + (close ? ' Z' : '')
  );
}

// Surrounding Nordic context landmasses (Norway, Finland, Själland/Denmark, Åland)
const NORWAY_CONTEXT: LonLat[] = [
  [8.8, 58.0],
  [9.6, 58.8],
  [10.5, 59.8],
  [11.28, 59.1],
  [11.15, 58.94],
  [11.75, 59.45],
  [12.25, 59.88],
  [12.55, 60.38],
  [12.75, 60.95],
  [12.22, 61.55],
  [12.3, 62.12],
  [12.05, 62.65],
  [12.18, 63.1],
  [12.06, 63.33],
  [12.6, 63.75],
  [13.8, 64.15],
  [14.14, 64.52],
  [14.48, 65.05],
  [15.1, 65.58],
  [14.65, 65.85],
  [15.35, 66.22],
  [16.1, 66.75],
  [16.38, 67.15],
  [17.2, 67.65],
  [18.08, 68.43],
  [19.15, 68.68],
  [20.55, 69.06],
  [21.4, 69.5],
  [16.5, 69.5],
  [13.5, 68.2],
  [12.0, 66.6],
  [10.4, 64.6],
  [9.2, 63.4],
  [9.0, 60.5],
];

const FINLAND_CONTEXT: LonLat[] = [
  [20.55, 69.06],
  [21.15, 68.88],
  [22.25, 68.42],
  [23.48, 67.92],
  [23.68, 67.2],
  [23.95, 66.65],
  [23.65, 66.35],
  [24.15, 65.84],
  [24.9, 65.65],
  [25.3, 65.0],
  [24.4, 64.2],
  [22.8, 63.7],
  [21.4, 63.0],
  [21.3, 61.8],
  [21.4, 60.8],
  [22.4, 60.1],
  [25.8, 60.1],
  [25.8, 69.5],
  [21.4, 69.5],
];

const DENMARK_SJAELLAND_CONTEXT: LonLat[] = [
  [10.9, 55.9],
  [12.35, 56.12],
  [12.58, 55.72],
  [12.42, 55.45],
  [12.05, 55.02],
  [11.2, 54.92],
  [10.9, 55.4],
];

const ALAND_CONTEXT: LonLat[] = [
  [19.62, 60.38],
  [20.22, 60.35],
  [20.32, 60.05],
  [19.82, 59.98],
  [19.55, 60.18],
];

// Shared border segments so Swedish regions tessellate seamlessly without gaps
const BORDER_NORRLAND_SVEALAND: LonLat[] = [
  [12.75, 60.95],
  [13.55, 61.22],
  [14.55, 61.15],
  [15.65, 60.95],
  [16.65, 60.58],
  [17.45, 60.63],
];

const BORDER_SVEALAND_GOTALAND: LonLat[] = [
  [11.75, 59.45],
  [11.88, 59.22],
  [12.75, 59.05],
  [13.5, 59.1],
  [14.12, 58.95],
  [14.95, 58.82],
  [15.7, 58.75],
  [16.65, 58.62],
];

const BORDER_VAST_SMALAND: LonLat[] = [
  [14.95, 58.82],
  [14.55, 58.4],
  [14.18, 57.78],
  [13.75, 57.35],
  [13.35, 56.92],
  [13.05, 56.45],
];

const BORDER_GOTALAND_SYD: LonLat[] = [
  [12.88, 56.44],
  [13.05, 56.45],
  [13.85, 56.42],
  [14.65, 56.45],
  [15.45, 56.38],
  [16.08, 56.32],
];

const REGION_POLYGONS: Array<{
  key: 'norrland' | 'svealand' | 'vast' | 'smaland' | 'syd';
  paths: LonLat[][];
  baseFill: string;
}> = [
  {
    key: 'norrland',
    baseFill: '#114A47',
    paths: [
      [
        ...BORDER_NORRLAND_SVEALAND.slice().reverse(),
        [12.22, 61.55],
        [12.3, 62.12],
        [12.05, 62.65],
        [12.18, 63.1],
        [12.06, 63.33],
        [12.6, 63.75],
        [13.8, 64.15],
        [14.14, 64.52],
        [14.48, 65.05],
        [15.1, 65.58],
        [14.65, 65.85],
        [15.35, 66.22],
        [16.1, 66.75],
        [16.38, 67.15],
        [17.2, 67.65],
        [18.08, 68.43],
        [19.15, 68.68],
        [20.55, 69.06],
        [21.15, 68.88],
        [22.25, 68.42],
        [23.48, 67.92],
        [23.68, 67.2],
        [23.95, 66.65],
        [23.65, 66.35],
        [24.15, 65.84],
        [23.2, 65.76],
        [22.15, 65.58],
        [21.48, 65.31],
        [21.18, 64.74],
        [21.35, 64.35],
        [20.92, 63.95],
        [20.3, 63.72],
        [19.72, 63.52],
        [18.75, 63.26],
        [18.35, 62.88],
        [17.92, 62.62],
        [17.35, 62.39],
        [17.42, 62.1],
        [17.16, 61.73],
        [17.18, 61.3],
        [17.22, 60.85],
        [17.45, 60.63],
      ],
    ],
  },
  {
    key: 'svealand',
    baseFill: '#0D5584',
    paths: [
      [
        ...BORDER_NORRLAND_SVEALAND,
        [17.95, 60.52],
        [18.42, 60.35],
        [18.85, 60.08],
        [19.02, 59.75],
        [18.82, 59.35],
        [18.35, 58.85],
        [17.85, 58.78],
        [17.12, 58.72],
        [16.65, 58.62],
        ...BORDER_SVEALAND_GOTALAND.slice().reverse(),
        [12.25, 59.88],
        [12.55, 60.38],
        [12.75, 60.95],
      ],
    ],
  },
  {
    key: 'vast',
    baseFill: '#0E6B9E',
    paths: [
      [
        [11.75, 59.45],
        [11.88, 59.22],
        [12.75, 59.05],
        [13.5, 59.1],
        [14.12, 58.95],
        [14.95, 58.82],
        ...BORDER_VAST_SMALAND,
        [12.88, 56.44],
        [12.84, 56.67],
        [12.35, 56.9],
        [12.22, 57.11],
        [11.9, 57.48],
        [11.82, 57.7],
        [11.55, 57.9],
        [11.42, 58.26],
        [11.24, 58.58],
        [11.15, 58.94],
        [11.28, 59.1],
      ],
    ],
  },
  {
    key: 'smaland',
    baseFill: '#0D6E52',
    paths: [
      // Småland & Östergötland mainland
      [
        [14.95, 58.82],
        [15.7, 58.75],
        [16.65, 58.62],
        [16.85, 58.35],
        [16.72, 57.76],
        [16.56, 57.26],
        [16.36, 56.66],
        [16.08, 56.32],
        ...BORDER_GOTALAND_SYD.slice(1).reverse(),
        ...BORDER_VAST_SMALAND.slice().reverse(),
      ],
      // Öland
      [
        [17.02, 57.35],
        [17.1, 57.15],
        [16.85, 56.82],
        [16.65, 56.55],
        [16.46, 56.2],
        [16.38, 56.24],
        [16.48, 56.64],
        [16.74, 57.05],
        [16.92, 57.33],
      ],
      // Gotland
      [
        [19.22, 57.98],
        [19.05, 57.82],
        [18.92, 57.62],
        [18.88, 57.42],
        [18.72, 57.22],
        [18.48, 57.08],
        [18.28, 56.92],
        [18.15, 56.95],
        [18.14, 57.22],
        [18.16, 57.45],
        [18.29, 57.63],
        [18.58, 57.82],
        [18.92, 57.95],
      ],
    ],
  },
  {
    key: 'syd',
    baseFill: '#0B537B',
    paths: [
      [
        ...BORDER_GOTALAND_SYD,
        [15.86, 56.08],
        [15.58, 56.15],
        [14.86, 56.16],
        [14.58, 56.04],
        [14.29, 55.92],
        [14.21, 55.7],
        [14.36, 55.55],
        [14.18, 55.38],
        [13.82, 55.42],
        [13.36, 55.34],
        [13.15, 55.37],
        [12.83, 55.39],
        [12.98, 55.6],
        [13.01, 55.87],
        [12.69, 56.04],
        [12.46, 56.3],
        [12.82, 56.42],
      ],
    ],
  },
];

// Authentic major Swedish lakes
const MAJOR_LAKES: LonLat[][] = [
  // Vänern
  [
    [13.18, 59.38],
    [13.82, 59.36],
    [14.08, 59.12],
    [13.82, 58.65],
    [13.15, 58.48],
    [12.42, 58.42],
    [12.45, 58.88],
    [12.88, 59.15],
  ],
  // Vättern
  [
    [14.92, 58.8],
    [15.0, 58.55],
    [14.85, 58.18],
    [14.42, 57.88],
    [14.18, 57.78],
    [14.15, 58.05],
    [14.35, 58.48],
    [14.68, 58.78],
  ],
  // Mälaren
  [
    [16.05, 59.48],
    [16.65, 59.52],
    [17.35, 59.56],
    [17.75, 59.58],
    [17.95, 59.33],
    [17.45, 59.22],
    [16.65, 59.32],
    [16.1, 59.38],
  ],
  // Hjälmaren
  [
    [15.32, 59.28],
    [15.85, 59.26],
    [16.05, 59.16],
    [15.55, 59.14],
  ],
  // Storsjön
  [
    [14.18, 63.34],
    [14.62, 63.22],
    [14.52, 62.95],
    [14.1, 63.08],
  ],
];

// Primary Swedish freight arteries (E4, E6, E20)
const FREIGHT_CORRIDORS: LonLat[][] = [
  // E4 Corridor: Helsingborg -> Jönköping -> Norrköping -> Stockholm -> Sundsvall -> Umeå -> Luleå
  [
    [12.69, 56.04],
    [14.16, 57.78],
    [16.19, 58.59],
    [18.07, 59.33],
    [17.64, 59.86],
    [17.14, 60.67],
    [17.31, 62.39],
    [20.26, 63.83],
    [22.15, 65.58],
  ],
  // E6 West Coast: Malmö -> Helsingborg -> Halmstad -> Göteborg -> Svinesund
  [
    [13.0, 55.6],
    [12.69, 56.04],
    [12.86, 56.67],
    [11.97, 57.71],
    [11.28, 59.1],
  ],
  // RV40 + E20 Diagonal: Göteborg -> Borås -> Jönköping & Borås -> Örebro -> Eskilstuna -> Stockholm
  [
    [11.97, 57.71],
    [12.94, 57.72],
    [14.16, 57.78],
  ],
  [
    [11.97, 57.71],
    [13.85, 58.39],
    [15.21, 59.27],
    [16.51, 59.37],
    [18.07, 59.33],
  ],
];

interface MapCityHub {
  id: string;
  label: string;
  searchTerm: string;
  regionKey: 'vast' | 'svealand' | 'smaland' | 'syd' | 'norrland';
  coords: LonLat;
  anchor: 'start' | 'end' | 'middle';
  dx: number;
  dy: number;
  isPrimary3plHub?: boolean;
  hubRole: string;
}

const CITY_HUBS: MapCityHub[] = [
  {
    id: 'lulea',
    label: 'Luleå',
    searchTerm: 'Luleå',
    regionKey: 'norrland',
    coords: [22.15, 65.58],
    anchor: 'end',
    dx: -8,
    dy: 3,
    hubRole: 'Norra Sveriges logistiknod',
  },
  {
    id: 'umea',
    label: 'Umeå',
    searchTerm: 'Umeå',
    regionKey: 'norrland',
    coords: [20.26, 63.83],
    anchor: 'end',
    dx: -8,
    dy: 3,
    hubRole: 'Västerbotten & e-handelstillväxt',
  },
  {
    id: 'sundsvall',
    label: 'Sundsvall',
    searchTerm: 'Sundsvall',
    regionKey: 'norrland',
    coords: [17.31, 62.39],
    anchor: 'start',
    dx: 8,
    dy: 3,
    hubRole: 'Mellannorrlands omlastning',
  },
  {
    id: 'stockholm',
    label: 'Stockholm / Rosersberg',
    searchTerm: 'Stockholm',
    regionKey: 'svealand',
    coords: [18.07, 59.45],
    anchor: 'start',
    dx: 9,
    dy: -2,
    isPrimary3plHub: true,
    hubRole: 'Arlanda/Rosersberg · Same-day & 3PL',
  },
  {
    id: 'eskilstuna',
    label: 'Eskilstuna / Örebro',
    searchTerm: 'Örebro',
    regionKey: 'svealand',
    coords: [15.85, 59.32],
    anchor: 'end',
    dx: -8,
    dy: -5,
    isPrimary3plHub: true,
    hubRole: 'Mälardalen & Hallsberg · Stora centrallager',
  },
  {
    id: 'norrkoping',
    label: 'Norrköping',
    searchTerm: 'Norrköping',
    regionKey: 'smaland',
    coords: [16.19, 58.59],
    anchor: 'start',
    dx: 8,
    dy: 5,
    isPrimary3plHub: true,
    hubRole: 'PostNord TPL & Stadiums e-handelsnav',
  },
  {
    id: 'jonkoping',
    label: 'Jönköping / Torsvik',
    searchTerm: 'Jönköping',
    regionKey: 'smaland',
    coords: [14.16, 57.78],
    anchor: 'start',
    dx: 8,
    dy: -3,
    isPrimary3plHub: true,
    hubRole: 'Sveriges största E4-nav för 3PL & AutoStore',
  },
  {
    id: 'boras',
    label: 'Gbg / Borås',
    searchTerm: 'Borås',
    regionKey: 'vast',
    coords: [12.55, 57.72],
    anchor: 'end',
    dx: -10,
    dy: 3,
    isPrimary3plHub: true,
    hubRole: 'Viared & Hisingen · Mode, D2C & 3PL',
  },
  {
    id: 'kalmar',
    label: 'Kalmar',
    searchTerm: 'Kalmar',
    regionKey: 'smaland',
    coords: [16.36, 56.66],
    anchor: 'start',
    dx: 8,
    dy: 4,
    isPrimary3plHub: true,
    hubRole: 'Hem & inredning · Exportkluster',
  },
  {
    id: 'helsingborg',
    label: 'Helsingborg / Malmö',
    searchTerm: 'Helsingborg',
    regionKey: 'syd',
    coords: [12.82, 55.86],
    anchor: 'end',
    dx: -9,
    dy: 6,
    isPrimary3plHub: true,
    hubRole: 'Öresund & EU-port · Nowaste, Boozt & DSV',
  },
];

type DensityMetricKey = 'population' | 'lockers' | 'evening';

const REGION_LABEL_ANCHOR: Record<
  'norrland' | 'svealand' | 'vast' | 'smaland' | 'syd',
  LonLat
> = {
  norrland: [17.4, 65.1],
  svealand: [15.4, 60.0],
  vast: [12.9, 58.1],
  smaland: [15.3, 57.3],
  syd: [13.7, 55.9],
};

function getDensityChoroplethFill(metric: DensityMetricKey, reg?: RegionMetric): string {
  if (!reg) return '#0D5584';
  if (metric === 'population') {
    const v = reg.populationDensityPerKm2 ?? 25;
    if (v >= 100) return '#059669'; // Syd (118.2)
    if (v >= 60) return '#0D9488'; // Väst (68.4)
    if (v >= 40) return '#0284C7'; // Svealand (43.2)
    if (v >= 25) return '#1D4ED8'; // Småland (36.1)
    return '#1E293B'; // Norrland (4.9)
  }
  if (metric === 'lockers') {
    const v = reg.lockersPer10kResidents ?? 8;
    if (v >= 11.0) return '#059669'; // Svealand (11.2)
    if (v >= 10.5) return '#0D9488'; // Väst / Syd (10.8 / 10.7)
    if (v >= 9.0) return '#0284C7'; // Småland (9.5)
    return '#1E293B'; // Norrland (6.1)
  }
  const v = reg.homeDeliveryEveningPct ?? 50;
  if (v >= 85) return '#059669'; // Svealand (89%) / Syd (86%)
  if (v >= 75) return '#0D9488'; // Väst (81%)
  if (v >= 60) return '#0284C7'; // Småland (68%)
  return '#1E293B'; // Norrland (38%)
}

function formatRegionMapBadge(metric: DensityMetricKey, reg?: RegionMetric): string {
  if (!reg) return '';
  if (metric === 'population') {
    return `${(reg.populationDensityPerKm2 ?? 0).toFixed(1).replace('.', ',')}/km²`;
  }
  if (metric === 'lockers') {
    return `${(reg.lockersPer10kResidents ?? 0).toFixed(1).replace('.', ',')} skåp`;
  }
  return `${reg.homeDeliveryEveningPct ?? 0}%`;
}

export function SwedenLogisticsMap({
  regions,
  selectedRegion,
  onSelectRegion,
  logisticsProviders = [],
  onNavigate,
  onOpenDensitySection,
}: SwedenLogisticsMapProps) {
  const [mapLayer, setMapLayer] = useState<'regions' | 'hubs' | 'density'>('regions');
  const [densityMetric, setDensityMetric] = useState<DensityMetricKey>('population');
  const [hoveredRegion, setHoveredRegion] = useState<string | null>(null);
  const [selectedHubId, setSelectedHubId] = useState<string>('jonkoping');

  const activeRegion = regions[selectedRegion] || Object.values(regions)[0];

  const publishedLogistics = useMemo(
    () => (logisticsProviders || []).filter((l) => l.status === 'published'),
    [logisticsProviders]
  );

  const activeHub = useMemo(
    () => CITY_HUBS.find((h) => h.id === selectedHubId) || CITY_HUBS[6],
    [selectedHubId]
  );

  const hubProviders = useMemo(() => {
    const terms = activeHub.label
      .toLowerCase()
      .split('/')
      .map((s) => s.trim())
      .concat([activeHub.searchTerm.toLowerCase()]);
    return publishedLogistics.filter(
      (lp) =>
        lp.region === activeHub.regionKey ||
        lp.hqCity.toLowerCase().includes(activeHub.searchTerm.toLowerCase()) ||
        lp.warehouseCities.some((city) =>
          terms.some((t) => city.toLowerCase().includes(t))
        )
    );
  }, [activeHub, publishedLogistics]);

  const graticuleLatitudes = [56, 58, 60, 62, 64, 66, 68];
  const graticuleLongitudes = [12, 16, 20, 24];

  return (
    <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 flex flex-col justify-between space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-xs font-mono text-[#006AA7] font-semibold">
            Geografisk analys · SWEREF-projicerad Sverigekarta
          </div>
          <h2 className="font-display text-2xl font-extrabold text-[#040B16] mt-0.5">
            Sveriges e-handelsregioner &amp; 3PL-logistiknav
          </h2>
        </div>

        <div className="inline-flex flex-wrap bg-slate-100 p-1 rounded-lg text-xs font-semibold gap-1">
          <button
            type="button"
            onClick={() => setMapLayer('regions')}
            className={`px-3 py-1.5 rounded-md inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
              mapLayer === 'regions'
                ? 'bg-[#040B16] text-white'
                : 'text-slate-600 hover:text-[#040B16]'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Regioner
          </button>
          <button
            type="button"
            onClick={() => setMapLayer('hubs')}
            className={`px-3 py-1.5 rounded-md inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
              mapLayer === 'hubs'
                ? 'bg-[#040B16] text-white'
                : 'text-slate-600 hover:text-[#040B16]'
            }`}
          >
            <Warehouse className="w-3.5 h-3.5" />
            3PL &amp; Nav ({publishedLogistics.length})
          </button>
          <button
            type="button"
            onClick={() => setMapLayer('density')}
            className={`px-3 py-1.5 rounded-md inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
              mapLayer === 'density'
                ? 'bg-[#040B16] text-white'
                : 'text-slate-600 hover:text-[#040B16]'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            Densitet &amp; Täckning
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 items-center">
        {/* Realistic Cartographic SVG Canvas */}
        <div className="sm:col-span-6 relative rounded-2xl overflow-hidden border border-slate-800 bg-gradient-to-b from-[#061324] via-[#091D36] to-[#071528] p-2">
          <svg
            viewBox="0 0 430 740"
            className="w-full max-w-[330px] mx-auto h-auto select-none"
            role="img"
            aria-label="Detaljerad interaktiv karta över Sveriges e-handelsregioner och logistiknav"
          >
            <defs>
              <filter id="sweden-drop-shadow" x="-8%" y="-4%" width="116%" height="108%">
                <feDropShadow dx="0" dy="4" stdDeviation="5" floodColor="#020617" floodOpacity="0.65" />
              </filter>
            </defs>

            {/* Lat / Lon Graticule */}
            <g stroke="#163252" strokeWidth="0.6" strokeDasharray="2 4" opacity="0.55">
              {graticuleLatitudes.map((lat) => {
                const [, y] = project([12, lat]);
                return (
                  <g key={`lat-${lat}`}>
                    <line x1="12" y1={y} x2="418" y2={y} />
                    <text
                      x="16"
                      y={y - 3}
                      fontSize="7"
                      fill="#4B7099"
                      fontFamily="monospace"
                      stroke="none"
                    >
                      {lat}°N
                    </text>
                  </g>
                );
              })}
              {graticuleLongitudes.map((lon) => {
                const [x] = project([lon, 60]);
                return <line key={`lon-${lon}`} x1={x} y1="10" x2={x} y2="730" />;
              })}
            </g>

            {/* Surrounding Nordic Landmasses for geographic realism */}
            <g fill="#0E2036" stroke="#1C3554" strokeWidth="0.8" opacity="0.85">
              <path d={toPath(NORWAY_CONTEXT)} />
              <path d={toPath(FINLAND_CONTEXT)} />
              <path d={toPath(DENMARK_SJAELLAND_CONTEXT)} />
              <path d={toPath(ALAND_CONTEXT)} />
            </g>

            {/* Sea Labels */}
            <g fill="#3E6794" fontSize="8.5" fontStyle="italic" opacity="0.7" letterSpacing="1.6">
              <text x="292" y="340" transform="rotate(-12 292 340)">
                BOTTENHAVET
              </text>
              <text x="278" y="545" transform="rotate(-15 278 545)">
                ÖSTERSJÖN
              </text>
              <text x="44" y="640" transform="rotate(-60 44 640)">
                KATTEGAT
              </text>
            </g>

            {/* Sweden 5 E-commerce Regions */}
            <g filter="url(#sweden-drop-shadow)">
              {REGION_POLYGONS.map((reg) => {
                const isSelected = selectedRegion === reg.key;
                const isHovered = hoveredRegion === reg.key;
                const regData = regions[reg.key];
                const fill =
                  mapLayer === 'density'
                    ? isHovered
                      ? '#EAB308'
                      : getDensityChoroplethFill(densityMetric, regData)
                    : mapLayer === 'regions'
                    ? isSelected
                      ? '#FECC02'
                      : isHovered
                      ? '#1D6FA8'
                      : reg.baseFill
                    : isSelected
                    ? '#1A5E8C'
                    : reg.baseFill;

                return (
                  <g
                    key={reg.key}
                    onClick={() => {
                      onSelectRegion(reg.key);
                      const firstHubInRegion = CITY_HUBS.find((h) => h.regionKey === reg.key);
                      if (firstHubInRegion) setSelectedHubId(firstHubInRegion.id);
                    }}
                    onMouseEnter={() => setHoveredRegion(reg.key)}
                    onMouseLeave={() => setHoveredRegion(null)}
                    className="cursor-pointer"
                  >
                    {reg.paths.map((coords, i) => (
                      <path
                        key={`${reg.key}-${i}`}
                        d={toPath(coords)}
                        fill={fill}
                        stroke={
                          isSelected
                            ? mapLayer === 'density'
                              ? '#FECC02'
                              : '#FEF08A'
                            : '#32567C'
                        }
                        strokeWidth={isSelected ? (mapLayer === 'density' ? 2 : 1.4) : 0.9}
                        strokeLinejoin="round"
                        className="transition-colors duration-150"
                      />
                    ))}
                  </g>
                );
              })}
            </g>

            {/* Major Swedish Lakes (Vänern, Vättern, Mälaren, Hjälmaren, Storsjön) */}
            <g fill="#081A30" stroke="#2D5782" strokeWidth="0.8" pointerEvents="none">
              {MAJOR_LAKES.map((lake, idx) => (
                <path key={`lake-${idx}`} d={toPath(lake)} strokeLinejoin="round" />
              ))}
            </g>

            {/* E4 / E6 / E20 Freight Arteries */}
            <g
              fill="none"
              stroke={mapLayer === 'hubs' ? '#FECC02' : '#93C5FD'}
              strokeWidth={mapLayer === 'hubs' ? '1.35' : '0.9'}
              strokeDasharray="3 3"
              opacity={mapLayer === 'hubs' ? 0.6 : 0.35}
              pointerEvents="none"
            >
              {FREIGHT_CORRIDORS.map((line, idx) => (
                <path key={`route-${idx}`} d={toPath(line, false)} />
              ))}
            </g>

            {/* Density Mode Value Labels per Region */}
            {mapLayer === 'density' && (
              <g pointerEvents="none">
                {(['norrland', 'svealand', 'vast', 'smaland', 'syd'] as const).map((rKey) => {
                  const [rx, ry] = project(REGION_LABEL_ANCHOR[rKey]);
                  const labelVal = formatRegionMapBadge(densityMetric, regions[rKey]);
                  const isSel = selectedRegion === rKey;
                  return (
                    <g key={`lbl-${rKey}`} transform={`translate(${rx}, ${ry})`}>
                      <rect
                        x="-28"
                        y="-10"
                        width="56"
                        height="18"
                        rx="4"
                        fill={isSel ? '#FECC02' : '#040B16'}
                        fillOpacity={isSel ? 0.96 : 0.85}
                        stroke={isSel ? '#040B16' : '#38BDF8'}
                        strokeWidth="0.9"
                      />
                      <text
                        x="0"
                        y="2.5"
                        textAnchor="middle"
                        fontSize="8.5"
                        fontWeight="bold"
                        fontFamily="monospace"
                        fill={isSel ? '#040B16' : '#FFFFFF'}
                      >
                        {labelVal}
                      </text>
                    </g>
                  );
                })}
              </g>
            )}

            {/* Interactive City & 3PL Hub Pins */}
            {CITY_HUBS.map((city) => {
              const [cx, cy] = project(city.coords);
              const isHubSelected = mapLayer === 'hubs' && selectedHubId === city.id;
              const isRegionSelected = selectedRegion === city.regionKey;
              const showEmphasized =
                mapLayer === 'hubs' ? Boolean(city.isPrimary3plHub) : isRegionSelected;

              return (
                <g
                  key={city.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectRegion(city.regionKey);
                    setSelectedHubId(city.id);
                  }}
                  className="cursor-pointer"
                >
                  {isHubSelected && (
                    <circle
                      cx={cx}
                      cy={cy}
                      r="10"
                      fill="#FECC02"
                      fillOpacity="0.22"
                      stroke="#FECC02"
                      strokeWidth="1"
                    />
                  )}
                  <circle
                    cx={cx}
                    cy={cy}
                    r={isHubSelected ? 5 : city.isPrimary3plHub ? 4 : 3.2}
                    fill={
                      isHubSelected || (mapLayer === 'hubs' && city.isPrimary3plHub)
                        ? '#FECC02'
                        : isRegionSelected
                        ? '#040B16'
                        : '#FFFFFF'
                    }
                    stroke="#040B16"
                    strokeWidth="1.4"
                  />
                  {mapLayer !== 'density' && (
                    <text
                      x={cx + city.dx}
                      y={cy + city.dy}
                      textAnchor={city.anchor}
                      fontSize={city.isPrimary3plHub ? '9.2' : '8.2'}
                      fontWeight={showEmphasized || isHubSelected ? '700' : '600'}
                      fill={isHubSelected ? '#FECC02' : '#F8FAFC'}
                      stroke="#040B16"
                      strokeWidth="2.4"
                      paintOrder="stroke"
                      className="pointer-events-none"
                    >
                      {city.label}
                    </text>
                  )}
                </g>
              );
            })}

            {/* Cartographic Scale Bar & North Arrow */}
            <g transform="translate(310, 686)" fill="#7DA1C7" fontSize="7.5" fontFamily="monospace">
              <line x1="0" y1="14" x2="72" y2="14" stroke="#7DA1C7" strokeWidth="1.2" />
              <line x1="0" y1="10" x2="0" y2="18" stroke="#7DA1C7" strokeWidth="1.2" />
              <line x1="36" y1="11" x2="36" y2="17" stroke="#7DA1C7" strokeWidth="1" />
              <line x1="72" y1="10" x2="72" y2="18" stroke="#7DA1C7" strokeWidth="1.2" />
              <text x="16" y="7">
                200 km
              </text>
            </g>
            <g transform="translate(390, 42)" fill="#7DA1C7" fontSize="8" fontFamily="monospace">
              <path d="M0,-12 L4,2 L0,-1 L-4,2 Z" fill="#FECC02" />
              <text x="-3" y="13">
                N
              </text>
            </g>
          </svg>

          {mapLayer === 'density' && (
            <div className="px-3 pb-2 pt-1 flex items-center justify-between text-[10px] font-mono text-slate-300 border-t border-white/10">
              <span>Låg täthet / glesbygd</span>
              <div className="flex items-center gap-1">
                <span className="w-4 h-2 rounded-xs bg-[#1E293B] border border-white/20" />
                <span className="w-4 h-2 rounded-xs bg-[#1D4ED8]" />
                <span className="w-4 h-2 rounded-xs bg-[#0284C7]" />
                <span className="w-4 h-2 rounded-xs bg-[#0D9488]" />
                <span className="w-4 h-2 rounded-xs bg-[#059669]" />
              </div>
              <span>Högst densitet</span>
            </div>
          )}
        </div>

        {/* Right Detail Panel: Either Selected Region OR Selected 3PL Logistics Hub */}
        <div className="sm:col-span-6 space-y-4">
          {mapLayer === 'regions' && activeRegion ? (
            <>
              <div className="flex flex-wrap gap-1.5">
                {(['vast', 'svealand', 'smaland', 'syd', 'norrland'] as const).map((rKey) => {
                  const reg = regions[rKey];
                  if (!reg) return null;
                  const active = selectedRegion === rKey;
                  return (
                    <button
                      key={rKey}
                      type="button"
                      onClick={() => onSelectRegion(rKey)}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-semibold border transition-colors cursor-pointer ${
                        active
                          ? 'bg-[#040B16] text-white border-[#040B16]'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-400'
                      }`}
                    >
                      {reg.name.split(' ')[0]}
                    </button>
                  );
                })}
              </div>

              <div className="text-xs font-mono text-[#059669] font-semibold">
                {activeRegion.tag}
              </div>
              <h3 className="font-display text-2xl font-extrabold text-[#040B16]">
                {activeRegion.name}
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">{activeRegion.desc}</p>

              <div className="grid grid-cols-2 gap-4 pt-3 border-t border-slate-100">
                <div>
                  <div className="text-xs font-mono text-slate-500">Andel av riket</div>
                  <div className="font-display text-2xl font-extrabold text-[#006AA7] mt-0.5 tabular-nums">
                    {activeRegion.share}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-mono text-slate-500">Snittorder (AOV)</div>
                  <div className="font-display text-2xl font-extrabold text-[#040B16] mt-0.5 tabular-nums">
                    {activeRegion.aov}
                  </div>
                </div>
              </div>

              <div className="text-xs text-slate-600 pt-3 border-t border-slate-100 space-y-2">
                <div>
                  <strong className="text-[#040B16]">Nyckelhubbar:</strong> {activeRegion.hubs}
                </div>
                {typeof activeRegion.populationDensityPerKm2 === 'number' && (
                  <div className="font-mono text-[11px] text-slate-600 tabular-nums">
                    {activeRegion.populationDensityPerKm2.toFixed(1).replace('.', ',')} inv/km² ·{' '}
                    {activeRegion.parcelLockersTotal?.toLocaleString('sv-SE')} paketskåp (
                    {activeRegion.lockersPer10kResidents?.toFixed(1).replace('.', ',')} / 10k inv) ·{' '}
                    {activeRegion.homeDeliveryEveningPct}% kvällshemleverans
                  </div>
                )}
                <div className="flex flex-wrap gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => onNavigate('3pl')}
                    className="font-bold text-[#006AA7] hover:underline cursor-pointer"
                  >
                    Se 3PL &amp; 4PL-aktörer &rarr;
                  </button>
                  <button
                    type="button"
                    onClick={() => onNavigate('ehandlare', activeRegion.name.split(' ')[0])}
                    className="font-semibold text-slate-700 hover:text-[#040B16] hover:underline cursor-pointer"
                  >
                    Visa e-handlare &rarr;
                  </button>
                </div>
              </div>
            </>
          ) : mapLayer === 'density' && activeRegion ? (
            <div className="space-y-4">
              <div className="inline-flex flex-wrap bg-slate-100 p-1 rounded-lg text-[11px] font-semibold gap-1">
                {(
                  [
                    { id: 'population', label: 'Befolkning / km²' },
                    { id: 'lockers', label: 'Skåp / 10k inv' },
                    { id: 'evening', label: 'Kvällshemleverans %' },
                  ] as const
                ).map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setDensityMetric(m.id)}
                    className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                      densityMetric === m.id
                        ? 'bg-[#040B16] text-white'
                        : 'text-slate-600 hover:text-[#040B16]'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>

              <div>
                <div className="text-xs font-mono text-[#059669] font-semibold">
                  SCB &amp; PTS Infrastrukturindex · {activeRegion.populationLabel || 'Region'}
                </div>
                <h3 className="font-display text-2xl font-extrabold text-[#040B16] mt-0.5">
                  {activeRegion.name}
                </h3>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="p-3.5 rounded-xl bg-[#F4F6F9] border border-slate-200">
                  <div className="text-[11px] font-mono text-slate-500">Befolkningsdensitet</div>
                  <div className="font-display text-xl font-extrabold text-[#040B16] tabular-nums mt-0.5">
                    {(activeRegion.populationDensityPerKm2 ?? 0).toFixed(1).replace('.', ',')} inv/km²
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">Rikssnitt: 25,9 inv/km²</div>
                </div>
                <div className="p-3.5 rounded-xl bg-[#F4F6F9] border border-slate-200">
                  <div className="text-[11px] font-mono text-slate-500">Paketskåpsdensitet</div>
                  <div className="font-display text-xl font-extrabold text-[#006AA7] tabular-nums mt-0.5">
                    {(activeRegion.lockersPer10kResidents ?? 0).toFixed(1).replace('.', ',')} / 10k inv
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5 tabular-nums">
                    {activeRegion.parcelLockersTotal?.toLocaleString('sv-SE')} skåp ·{' '}
                    {(activeRegion.lockersPer100Km2 ?? 0).toFixed(1).replace('.', ',')} / 100 km²
                  </div>
                </div>
                <div className="p-3.5 rounded-xl bg-[#F4F6F9] border border-slate-200">
                  <div className="text-[11px] font-mono text-slate-500">Samlad hemleverans</div>
                  <div className="font-display text-xl font-extrabold text-[#059669] tabular-nums mt-0.5">
                    {activeRegion.homeDeliveryTotalPct ?? 100} %
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">PostNord, Early Bird &amp; Bring</div>
                </div>
                <div className="p-3.5 rounded-xl bg-[#F4F6F9] border border-slate-200">
                  <div className="text-[11px] font-mono text-slate-500">Kväll / Express (17–22)</div>
                  <div className="font-display text-xl font-extrabold text-[#040B16] tabular-nums mt-0.5">
                    {activeRegion.homeDeliveryEveningPct ?? 76} %
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">Budbee, Airmee &amp; PostNord</div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="text-slate-500">Klicka på annan region i kartan för att jämföra.</span>
                {onOpenDensitySection && (
                  <button
                    type="button"
                    onClick={onOpenDensitySection}
                    className="font-bold text-[#006AA7] hover:underline cursor-pointer"
                  >
                    Se täckning per transportör &darr;
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-xs font-mono text-[#006AA7] font-semibold inline-flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" />
                Logistik- &amp; Fulfillmentnav · Klicka på en punkt i kartan
              </div>
              <h3 className="font-display text-2xl font-extrabold text-[#040B16]">
                {activeHub.label}
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                {activeHub.hubRole}. Klicka direkt på valfri stad i kartan eller byt till 3PL &amp; 4PL-fliken för full specifikation och jämförelse.
              </p>

              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="text-xs font-mono text-slate-500 flex items-center justify-between">
                  <span>Verksamma 3PL &amp; 4PL-partners</span>
                  <span className="font-bold text-[#040B16] tabular-nums">
                    {hubProviders.length} st
                  </span>
                </div>
                <div className="space-y-2 max-h-[240px] overflow-y-auto pr-1">
                  {hubProviders.slice(0, 6).map((lp) => (
                    <div
                      key={lp.id}
                      className="p-2.5 rounded-xl bg-[#F4F6F9] border border-slate-200 flex items-center justify-between gap-2 text-xs"
                    >
                      <div className="min-w-0">
                        <div className="font-bold text-[#040B16] truncate">{lp.name}</div>
                        <div className="text-[11px] text-slate-500 truncate">
                          {lp.logisticsType} · {lp.wmsPlatform} · Stopptid {lp.cutoffTime}
                        </div>
                      </div>
                      <span className="font-mono text-[11px] font-semibold text-[#059669] shrink-0">
                        {lp.warehouseSqm.split(' ')[0]}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => onNavigate('3pl', activeHub.searchTerm)}
                  className="w-full py-2.5 px-4 rounded-xl bg-[#040B16] hover:bg-[#006AA7] text-white text-xs font-bold transition-colors cursor-pointer"
                >
                  Öppna komplett lista med 3PL &amp; 4PL i Sverige &rarr;
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
