import { InsightPosts } from './InsightPosts';
import type { InsightPost } from '../types';
import { INITIAL_INSIGHT_POSTS } from '../../shared/insightPosts';
import { PaketindexArchive } from './PaketindexArchive';
import type { PaketindexObservation } from '../types';
import { MARKET_TITLE } from '../../shared/portalContent';
import type { MapPoint } from '../types';
import { useMemo, useState } from 'react';
import {
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  Database,
  Package,
  Scale,
  Search,
  ShieldAlert,
  TrendingUp,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type {
  AdBanner,
  CategoryOrderBenchmark,
  ContactFormConfig,
  DeliveryStatsData,
  EcommerceLaw,
  LogisticsProvider,
  MarketIntelligenceSource,
  Merchant,
  PageContentMap,
  PaketindexData,
  PortalTab,
  RegionMetric,
  ShippingCostTier,
  TechStackShare,
} from '../types';
import {
  PARCEL_VOLUME_TIERS,
  estimateMerchantParcels,
  formatParcelCountCompact,
  formatSekCompact,
  getVolumeTierById,
  getVolumeTierForCount,
  type ParcelVolumeTierId,
} from '../utils/shippingEconomics';
import { AdBannerSlot } from './AdBannerSlot';
import { CheckoutStrategyCTA } from './CheckoutStrategyCTA';
import { PageFormSlot } from './DynamicFormWidget';
import { ResilientImage } from './ResilientImage';
import { SwedenLogisticsMap } from './SwedenLogisticsMap';

interface MarknadViewProps {
  insightPosts?: InsightPost[];
  paketindexArchive?: PaketindexObservation[];
  mapPoints?: MapPoint[];
  regions: Record<string, RegionMetric>;
  orderBenchmarks: CategoryOrderBenchmark[];
  shippingTiers: ShippingCostTier[];
  deliveryStats: DeliveryStatsData;
  paketindex?: PaketindexData;
  pageCopy?: PageContentMap['marknad'];
  laws: EcommerceLaw[];
  intelligenceSources: MarketIntelligenceSource[];
  techStackShares: TechStackShare[];
  adBanners: AdBanner[];
  contactForms?: ContactFormConfig[];
  merchants: Merchant[];
  logisticsProviders: LogisticsProvider[];
  merchantCount: number;
  partnerCount: number;
  onNavigate: (tab: PortalTab, searchQuery?: string) => void;
  onBookAdSlot: (slotName: string) => void;
  onFormSubmitted?: () => Promise<void> | void;
  onNotify?: (msg: string) => void;
}

const SWEDISH_ECOMMERCE_TREND = [
  { year: '2021', revenueMdr: 146.0, yoyPct: 20.1, label: 'Pandemitopp' },
  { year: '2022', revenueMdr: 136.0, yoyPct: -6.8, label: 'Rekyl & inflation' },
  { year: '2023', revenueMdr: 133.2, yoyPct: -2.1, label: 'Köpkraftsbotten' },
  { year: '2024', revenueMdr: 143.8, yoyPct: 8.0, label: 'Återhämtning' },
  { year: '2025', revenueMdr: 155.3, yoyPct: 8.0, label: 'Apotek & Beauty driver' },
  { year: '2026', revenueMdr: 168.4, yoyPct: 8.4, label: 'Aktuellt helårsindex' },
  { year: '2027P', revenueMdr: 181.5, yoyPct: 7.8, label: 'Prognos (HUI/ECDB)' },
];

function TrendChartTooltip({
  active,
  payload,
  label,
  mode,
}: {
  active?: boolean;
  payload?: Array<{ payload?: Record<string, unknown> }>;
  label?: string;
  mode: 'categories' | 'macro' | 'merchants';
}) {
  if (!active || !payload || payload.length === 0 || !payload[0]?.payload) return null;
  const row = payload[0].payload;

  if (mode === 'categories') {
    return (
      <div className="bg-[#040B16] text-white border border-white/15 rounded-xl px-3.5 py-2.5 text-xs shadow-xl space-y-1">
        <div className="font-display font-bold text-[#FECC02]">{String(row.category || label)}</div>
        <div className="font-mono tabular-nums">
          Snittillväxt: <strong className="text-[#10B981]">{Number(row.avgGrowthPct) > 0 ? '+' : ''}{Number(row.avgGrowthPct).toFixed(1)}%</strong>
        </div>
        <div className="text-slate-300 tabular-nums">
          {String(row.merchantCount)} handlare · {Number(row.totalRevenueMdr).toFixed(1)} mdr SEK
        </div>
      </div>
    );
  }

  if (mode === 'macro') {
    return (
      <div className="bg-[#040B16] text-white border border-white/15 rounded-xl px-3.5 py-2.5 text-xs shadow-xl space-y-1">
        <div className="font-display font-bold text-[#FECC02]">
          {String(row.year)} · {String(row.label)}
        </div>
        <div className="font-mono tabular-nums">
          Omsättning: <strong>{Number(row.revenueMdr).toFixed(1)} mdr SEK</strong>
        </div>
        <div className="font-mono tabular-nums">
          Tillväxt YoY:{' '}
          <strong className={Number(row.yoyPct) >= 0 ? 'text-[#10B981]' : 'text-red-400'}>
            {Number(row.yoyPct) > 0 ? '+' : ''}{Number(row.yoyPct).toFixed(1)}%
          </strong>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#040B16] text-white border border-white/15 rounded-xl px-3.5 py-2.5 text-xs shadow-xl space-y-1">
      <div className="font-display font-bold text-[#FECC02]">{String(row.name || label)}</div>
      <div className="text-slate-300">{String(row.category)} · {String(row.platform)}</div>
      <div className="font-mono tabular-nums">
        Tillväxt YoY: <strong className="text-[#10B981]">{Number(row.yoyPct) > 0 ? '+' : ''}{Number(row.yoyPct).toFixed(1)}%</strong>
      </div>
      <div className="font-mono text-slate-300 tabular-nums">Omsättning: {String(row.revenue)}</div>
    </div>
  );
}

export function MarknadView({
  insightPosts = INITIAL_INSIGHT_POSTS,
  paketindexArchive = [],
  mapPoints = [],
  regions = {},
  orderBenchmarks = [],
  shippingTiers = [],
  deliveryStats,
  paketindex,
  pageCopy,
  laws = [],
  intelligenceSources = [],
  techStackShares = [],
  adBanners = [],
  contactForms = [],
  merchants = [],
  logisticsProviders = [],
  merchantCount,
  partnerCount,
  onNavigate,
  onBookAdSlot,
  onFormSubmitted,
  onNotify,
}: MarknadViewProps) {
  const [selectedRegion, setSelectedRegion] = useState<string>('vast');
  const [tradeMode, setTradeMode] = useState<'export' | 'import'>('export');
  const [demoTab, setDemoTab] = useState<'generations' | 'payments' | 'delivery'>('generations');
  const [econTab, setEconTab] = useState<'tiers' | 'categories' | 'parcels' | 'calculator'>('tiers');
  const [selectedVolumeTierId, setSelectedVolumeTierId] = useState<ParcelVolumeTierId>('scaleup');
  const [parcelMerchantSearch, setParcelMerchantSearch] = useState<string>('');
  const [deliverySubTab, setDeliverySubTab] = useState<'timing' | 'parcel' | 'coverage'>('coverage');
  const [lawCategory, setLawCategory] = useState<string>('Alla');
  const [selectedSourceId, setSelectedSourceId] = useState<string>('ecdb');
  const [techLayerFilter, setTechLayerFilter] = useState<
    'E-handelsplattform' | 'Betalning (PSP)' | 'MarTech & CRM'
  >('E-handelsplattform');
  const [calcCategoryId, setCalcCategoryId] = useState<string>('ob-mode');
  const [calcOrderValue, setCalcOrderValue] = useState<number>(850);
  const [calcFreeThreshold, setCalcFreeThreshold] = useState<number>(599);
  const [calcBaseShippingFee, setCalcBaseShippingFee] = useState<number>(49);
  const [calcAnnualParcels, setCalcAnnualParcels] = useState<number>(50000);
  const [calcSelectedMerchantId, setCalcSelectedMerchantId] = useState<string>('');
  const [trendMode, setTrendMode] = useState<'categories' | 'macro' | 'merchants'>('categories');
  const [heroQuery, setHeroQuery] = useState('');

  const calcCategory =
    orderBenchmarks.find((b) => b.id === calcCategoryId) || orderBenchmarks[0];
  const activeVolumeTier = getVolumeTierById(selectedVolumeTierId);

  const merchantParcelRows = useMemo(() => {
    return merchants
      .filter((m) => m.status === 'published')
      .map((m) => ({
        merchant: m,
        estimate: estimateMerchantParcels(m, orderBenchmarks),
      }))
      .sort((a, b) => b.estimate.annualParcels - a.estimate.annualParcels);
  }, [merchants, orderBenchmarks]);

  const filteredParcelRows = useMemo(() => {
    const q = parcelMerchantSearch.trim().toLowerCase();
    if (!q) return merchantParcelRows;
    return merchantParcelRows.filter(
      ({ merchant }) =>
        merchant.name.toLowerCase().includes(q) ||
        merchant.category.toLowerCase().includes(q) ||
        merchant.city.toLowerCase().includes(q)
    );
  }, [merchantParcelRows, parcelMerchantSearch]);

  const totalCatalogParcels = useMemo(
    () => merchantParcelRows.reduce((acc, row) => acc + row.estimate.annualParcels, 0),
    [merchantParcelRows]
  );

  const categoryTrendData = useMemo(() => {
    const groups = new Map<
      string,
      { count: number; growthSum: number; growthCount: number; revM: number }
    >();
    for (const m of merchants) {
      if (m.status !== 'published') continue;
      const entry = groups.get(m.category) || {
        count: 0,
        growthSum: 0,
        growthCount: 0,
        revM: 0,
      };
      entry.count += 1;
      if (typeof m.yoyGrowthPct === 'number' && Number.isFinite(m.yoyGrowthPct)) {
        entry.growthSum += m.yoyGrowthPct;
        entry.growthCount += 1;
      }
      if (typeof m.revenueNumericM === 'number' && Number.isFinite(m.revenueNumericM)) {
        entry.revM += m.revenueNumericM;
      }
      groups.set(m.category, entry);
    }
    return Array.from(groups.entries())
      .map(([category, g]) => ({
        category,
        shortCategory: category.length > 16 ? `${category.slice(0, 15)}…` : category,
        avgGrowthPct:
          g.growthCount > 0 ? Math.round((g.growthSum / g.growthCount) * 10) / 10 : 0,
        merchantCount: g.count,
        totalRevenueMdr: Math.round((g.revM / 1000) * 10) / 10,
      }))
      .filter((row) => row.merchantCount > 0)
      .sort((a, b) => b.avgGrowthPct - a.avgGrowthPct);
  }, [merchants]);

  const overallCatalogAvgGrowthPct = useMemo(() => {
    const withGrowth = merchants.filter(
      (m) => m.status === 'published' && typeof m.yoyGrowthPct === 'number'
    );
    if (withGrowth.length === 0) return 8.4;
    const sum = withGrowth.reduce((acc, m) => acc + (m.yoyGrowthPct || 0), 0);
    return Math.round((sum / withGrowth.length) * 10) / 10;
  }, [merchants]);

  const topGrowthMerchants = useMemo(() => {
    return merchants
      .filter((m) => m.status === 'published' && typeof m.yoyGrowthPct === 'number')
      .sort((a, b) => (b.yoyGrowthPct || 0) - (a.yoyGrowthPct || 0))
      .slice(0, 10)
      .map((m) => ({
        name: m.name,
        shortName: m.name.length > 14 ? `${m.name.slice(0, 13)}…` : m.name,
        yoyPct: m.yoyGrowthPct || 0,
        revenue: m.revenue,
        category: m.category,
        platform: m.platform,
      }));
  }, [merchants]);

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = heroQuery.trim().toLowerCase();
    if (!q) {
      onNavigate('ehandlare');
      return;
    }
    if (
      q.includes('congress') ||
      q.includes('mässa') ||
      q.includes('event') ||
      q.includes('expo') ||
      q.includes('retail') ||
      q.includes('talare')
    ) {
      onNavigate('event');
    } else if (
      q.includes('jobb') ||
      q.includes('karriär') ||
      q.includes('rekryter') ||
      q.includes('headhunt')
    ) {
      onNavigate('jobb');
    } else if (
      q.includes('klarna') ||
      q.includes('swish') ||
      q.includes('centra') ||
      q.includes('partner') ||
      q.includes('logistik')
    ) {
      onNavigate('partners', heroQuery.trim());
    } else if (q.includes('pixel') || q.includes('historia') || q.includes('ai')) {
      onNavigate('historia');
    } else {
      onNavigate('ehandlare', heroQuery.trim());
    }
  }

  const exportBars = [
    { country: 'Norge (VOEC-marknad)', pct: '31%', width: '85%', color: 'bg-[#059669]' },
    { country: 'Tyskland & DACH', pct: '24%', width: '68%', color: 'bg-[#006AA7]' },
    { country: 'Danmark & Finland', pct: '21%', width: '60%', color: 'bg-[#0A1628]' },
    { country: 'USA & Storbritannien', pct: '16%', width: '46%', color: 'bg-[#EAB308]' },
  ];

  const importBars = [
    { country: 'Kina & Asien (Temu, Shein m.fl.)', pct: '39%', width: '88%', color: 'bg-[#006AA7]' },
    { country: 'Tyskland (Zalando, Amazon.de)', pct: '28%', width: '66%', color: 'bg-[#0A1628]' },
    { country: 'Övriga EU & Norden', pct: '21%', width: '50%', color: 'bg-[#059669]' },
    { country: 'Storbritannien & USA', pct: '12%', width: '32%', color: 'bg-slate-400' },
  ];

  return (
    <div>
      {/* Hero Section */}
      <section className="bg-[#040B16] text-white hero-grid-bg border-b border-white/10">
        <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch">
            <div className="lg:col-span-7 flex flex-col justify-center space-y-6">
              <div className="text-xs font-mono text-slate-300">
                {pageCopy?.kicker || 'Svensk e-handelsdata · Index 2026–2027'} · {merchantCount} e-handlare &amp; {partnerCount} tech-partners i CMS
              </div>
              <h1 className="font-display text-4xl sm:text-5xl font-extrabold tracking-tight leading-[1.08] max-w-2xl text-balance">
                {pageCopy?.title || MARKET_TITLE}
              </h1>
              <p className="text-slate-300 text-base sm:text-lg max-w-2xl leading-relaxed">
                {pageCopy?.subtitle ||
                  'Datadriven plattform för svenska e-handlare, tech-partners och rekrytering. Utforska regional marknadsdata, gränshandel, Paketindex och lediga jobb inom svensk e-handel.'}
              </p>

              <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3 pt-1 max-w-xl">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    value={heroQuery}
                    onChange={(e) => setHeroQuery(e.target.value)}
                    placeholder="Sök butik, plattform, betalpartner eller stad..."
                    className="w-full bg-white text-[#040B16] rounded-xl pl-10 pr-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#FECC02]"
                  />
                </div>
                <button
                  type="submit"
                  className="px-5 py-3 rounded-xl bg-[#FECC02] hover:bg-[#EAB308] text-[#040B16] font-bold text-sm transition-colors whitespace-nowrap shrink-0 inline-flex items-center justify-center gap-2 cursor-pointer"
                >
                  Sök i katalogen
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            </div>

            <div className="lg:col-span-5">
              <div className="h-full min-h-[260px] rounded-2xl overflow-hidden border border-white/10 relative">
                <ResilientImage
                  src="/src/assets/images/hero_nordic_commerce_1795029383305.jpg"
                  alt="Stockholms digitala handelsnav i skymning"
                  fallbackLabel="Nordisk digital handel"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#040B16]/90 via-[#040B16]/35 to-transparent" />
                <div className="absolute bottom-5 left-5 right-5 flex items-end justify-between gap-4">
                  <div>
                    <div className="text-xs font-mono text-[#FECC02]">Nordisk benchmark</div>
                    <p className="text-base font-bold text-white mt-0.5">
                      Högst digital mognad i Europa
                    </p>
                  </div>
                  <div className="text-right font-mono text-xs text-slate-200 tabular-nums shrink-0">
                    94% BankID-penetration
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 4-column KPI strip below hero split */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-10 pt-8 border-t border-white/10">
            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
              <div className="text-xs font-mono text-slate-400">
                {pageCopy?.kpi1Label || 'Total omsättning (SE)'}
              </div>
              <div className="font-display text-2xl font-extrabold text-white mt-1 tabular-nums">
                {pageCopy?.kpi1Value || '168,4 mdr SEK'}
              </div>
              <div className="text-xs text-[#10B981] font-medium mt-1">
                {pageCopy?.kpi2Value || '+8,4 %'} jämfört med föregående år
              </div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
              <div className="text-xs font-mono text-slate-400">
                {pageCopy?.kpi3Label || `Paketindex ${paketindex?.quarterLabel || ''}`}
              </div>
              <div className="font-display text-2xl font-extrabold text-[#FECC02] mt-1 tabular-nums">
                {pageCopy?.kpi3Value || '64,2M (+16,9 %)'}
              </div>
              <div className="text-xs text-slate-300 mt-1">32,8 % från utlandet · &gt;7M second hand</div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
              <div className="text-xs font-mono text-slate-400">Import &amp; Export</div>
              <div className="font-display text-2xl font-extrabold text-white mt-1 tabular-nums">
                44,2 / 35,8 mdr
              </div>
              <div className="text-xs text-slate-300 mt-1">Norden, DACH &amp; Cross-border</div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
              <div className="text-xs font-mono text-slate-400">
                {pageCopy?.kpi4Label || 'Snittorder (AOV)'}
              </div>
              <div className="font-display text-2xl font-extrabold text-white mt-1 tabular-nums">
                {pageCopy?.kpi4Value || '945 SEK'}
              </div>
              <div className="text-xs text-slate-300 mt-1">71 % genomförs via smartphone</div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        {/* Top Sponsored Banner (D-Congress 2027) */}
        <AdBannerSlot
          banners={adBanners}
          placement="marknad-top"
          onNavigate={onNavigate}
          onBookSlot={onBookAdSlot}
        />

        <PageFormSlot
          forms={contactForms}
          page="marknad"
          position="top"
          adBanners={adBanners}
          onSubmitted={onFormSubmitted}
          onNotify={onNotify}
        />

        {/* Interactive Sweden Map + Cross-Border */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <SwedenLogisticsMap
            mapPoints={mapPoints}
            regions={regions}
            selectedRegion={selectedRegion}
            onSelectRegion={setSelectedRegion}
            logisticsProviders={logisticsProviders}
            onNavigate={onNavigate}
            onOpenDensitySection={() => {
              setDeliverySubTab('coverage');
              document
                .getElementById('hemleverans-densitet')
                ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }}
          />

          <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 flex flex-col justify-between space-y-6">
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-mono font-semibold text-[#059669]">Cross-border analys</span>
                <div className="inline-flex bg-slate-100 p-1 rounded-lg text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setTradeMode('export')}
                    className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
                      tradeMode === 'export'
                        ? 'bg-[#040B16] text-white'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Export (44,2 mdr)
                  </button>
                  <button
                    type="button"
                    onClick={() => setTradeMode('import')}
                    className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
                      tradeMode === 'import'
                        ? 'bg-[#040B16] text-white'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Import (35,8 mdr)
                  </button>
                </div>
              </div>
              <h2 className="font-display text-2xl font-extrabold text-[#040B16] mt-3">
                {tradeMode === 'export'
                  ? 'Svenska exportmarknader (44,2 mdr)'
                  : 'Konsumentimport till Sverige (35,8 mdr)'}
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                {tradeMode === 'export'
                  ? 'Toppländer dit svenska e-handlare exporterar mest.'
                  : 'Ursprungsregioner för svenskarnas utlandsköp.'}
              </p>
            </div>

            <div className="space-y-4">
              {(tradeMode === 'export' ? exportBars : importBars).map((bar) => (
                <div key={bar.country}>
                  <div className="flex justify-between text-xs font-semibold mb-1.5">
                    <span className="text-slate-800">{bar.country}</span>
                    <span className="font-mono text-slate-600 tabular-nums">{bar.pct}</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className={`${bar.color} h-full rounded-full`} style={{ width: bar.width }} />
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-600 font-medium">Nettohandelsbalans digital handel</span>
              <span className="font-mono font-bold text-[#059669] tabular-nums">
                +8,4 mdr SEK överskott
              </span>
            </div>
          </div>
        </div>

        {/* Industry Trend Graph (Recharts) */}
        <section
          id="trendgraf"
          className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-6 scroll-mt-20"
        >
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-slate-100">
            <div>
              <div className="text-xs font-mono font-semibold text-[#059669] inline-flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5" />
                Branschdata &amp; Tillväxttrend · Recharts Liveindex
              </div>
              <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-[#040B16] mt-1">
                Svensk e-handelstillväxt per bransch &amp; marknadstrend (2021–2027)
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-3xl">
                Snitt-tillväxt (YoY %) beräknad direkt från publicerade svenska e-handlare i katalogen samt flerårig marknadsutveckling i miljarder SEK.
              </p>
            </div>

            <div className="inline-flex flex-wrap bg-slate-100 p-1 rounded-lg text-xs font-semibold self-start shrink-0 gap-1">
              <button
                type="button"
                onClick={() => setTrendMode('categories')}
                className={`px-3.5 py-2 rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                  trendMode === 'categories'
                    ? 'bg-[#040B16] text-white'
                    : 'text-slate-600 hover:text-[#040B16]'
                }`}
              >
                Branschtillväxt (YoY %)
              </button>
              <button
                type="button"
                onClick={() => setTrendMode('macro')}
                className={`px-3.5 py-2 rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                  trendMode === 'macro'
                    ? 'bg-[#040B16] text-white'
                    : 'text-slate-600 hover:text-[#040B16]'
                }`}
              >
                Marknadstrend 2021–2027
              </button>
              <button
                type="button"
                onClick={() => setTrendMode('merchants')}
                className={`px-3.5 py-2 rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                  trendMode === 'merchants'
                    ? 'bg-[#040B16] text-white'
                    : 'text-slate-600 hover:text-[#040B16]'
                }`}
              >
                Toppbolag (Tillväxt)
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-[#F4F6F9] border border-slate-200">
              <div className="text-[11px] font-mono text-slate-500">Katalogens snitt-YoY</div>
              <div className="font-display text-xl font-extrabold text-[#059669] mt-1 tabular-nums">
                {overallCatalogAvgGrowthPct > 0 ? '+' : ''}
                {overallCatalogAvgGrowthPct.toFixed(1).replace('.', ',')} %
              </div>
              <div className="text-xs text-slate-600 mt-0.5">
                Baserat på {merchants.filter((m) => m.status === 'published').length} verifierade bolag
              </div>
            </div>
            <div className="p-4 rounded-xl bg-[#F4F6F9] border border-slate-200">
              <div className="text-[11px] font-mono text-slate-500">Starkaste bransch</div>
              <div className="font-display text-xl font-extrabold text-[#040B16] mt-1 truncate">
                {categoryTrendData[0]?.category || 'Apotek & Skönhet'}
              </div>
              <div className="text-xs text-[#059669] font-mono font-bold mt-0.5 tabular-nums">
                +{categoryTrendData[0]?.avgGrowthPct ?? 14.5}% snitt-tillväxt
              </div>
            </div>
            <div className="p-4 rounded-xl bg-[#F4F6F9] border border-slate-200">
              <div className="text-[11px] font-mono text-slate-500">Svensk marknad 2026</div>
              <div className="font-display text-xl font-extrabold text-[#006AA7] mt-1 tabular-nums">
                168,4 mdr SEK
              </div>
              <div className="text-xs text-slate-600 mt-0.5">Prognos 2027: 181,5 mdr (+7,8%)</div>
            </div>
            <div className="p-4 rounded-xl bg-[#F4F6F9] border border-slate-200">
              <div className="text-[11px] font-mono text-slate-500">Snabbast växande bolag</div>
              <div className="font-display text-xl font-extrabold text-[#040B16] mt-1 truncate">
                {topGrowthMerchants[0]?.name || 'Lyko'}
              </div>
              <div className="text-xs text-[#059669] font-mono font-bold mt-0.5 tabular-nums">
                +{topGrowthMerchants[0]?.yoyPct ?? 24}% YoY
              </div>
            </div>
          </div>

          <div className="w-full h-[340px] min-w-0 bg-[#F4F6F9]/60 border border-slate-200 rounded-xl p-4">
            <ResponsiveContainer width="100%" height="100%" minWidth={320} minHeight={290}>
              {trendMode === 'categories' ? (
                <BarChart
                  data={categoryTrendData}
                  margin={{ top: 14, right: 16, left: 0, bottom: 28 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                  <XAxis
                    dataKey="shortCategory"
                    tick={{ fontSize: 11, fill: '#334155' }}
                    interval={0}
                    angle={-15}
                    textAnchor="end"
                    height={54}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#475569' }}
                    tickFormatter={(val) => `${val}%`}
                    width={46}
                  />
                  <ReferenceLine y={0} stroke="#94A3B8" />
                  <ReferenceLine
                    y={overallCatalogAvgGrowthPct}
                    stroke="#006AA7"
                    strokeDasharray="4 4"
                  />
                  <Tooltip content={<TrendChartTooltip mode="categories" />} />
                  <Bar dataKey="avgGrowthPct" name="Snitt-YoY %" radius={[6, 6, 0, 0]} maxBarSize={54}>
                    {categoryTrendData.map((entry) => (
                      <Cell
                        key={entry.category}
                        fill={
                          entry.avgGrowthPct >= overallCatalogAvgGrowthPct
                            ? '#059669'
                            : entry.avgGrowthPct >= 0
                            ? '#006AA7'
                            : '#DC2626'
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              ) : trendMode === 'macro' ? (
                <ComposedChart
                  data={SWEDISH_ECOMMERCE_TREND}
                  margin={{ top: 14, right: 16, left: 0, bottom: 8 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                  <XAxis dataKey="year" tick={{ fontSize: 11, fill: '#334155' }} />
                  <YAxis
                    yAxisId="left"
                    tick={{ fontSize: 11, fill: '#475569' }}
                    tickFormatter={(val) => `${val} mdr`}
                    width={62}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tick={{ fontSize: 11, fill: '#059669' }}
                    tickFormatter={(val) => `${val}%`}
                    width={44}
                  />
                  <ReferenceLine yAxisId="right" y={0} stroke="#94A3B8" strokeDasharray="2 2" />
                  <Tooltip content={<TrendChartTooltip mode="macro" />} />
                  <Bar
                    yAxisId="left"
                    dataKey="revenueMdr"
                    name="Omsättning (mdr SEK)"
                    fill="#040B16"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={48}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="yoyPct"
                    name="Tillväxt YoY (%)"
                    stroke="#059669"
                    strokeWidth={3}
                    dot={{ r: 4, fill: '#FECC02', stroke: '#040B16', strokeWidth: 2 }}
                  />
                </ComposedChart>
              ) : (
                <BarChart
                  data={topGrowthMerchants}
                  margin={{ top: 14, right: 16, left: 0, bottom: 28 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                  <XAxis
                    dataKey="shortName"
                    tick={{ fontSize: 11, fill: '#334155' }}
                    interval={0}
                    angle={-15}
                    textAnchor="end"
                    height={54}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#475569' }}
                    tickFormatter={(val) => `+${val}%`}
                    width={46}
                  />
                  <Tooltip content={<TrendChartTooltip mode="merchants" />} />
                  <Bar dataKey="yoyPct" name="YoY-tillväxt %" fill="#006AA7" radius={[6, 6, 0, 0]} maxBarSize={46} />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>

          <div className="text-xs text-slate-500 flex flex-wrap items-center justify-between gap-2">
            <span>
              {trendMode === 'categories'
                ? `Gröna staplar överstiger katalogsnittet (+${overallCatalogAvgGrowthPct.toFixed(1)}% YoY · streckad linje).`
                : trendMode === 'macro'
                ? 'Staplar visar total svensk B2C e-handelsomsättning (mdr SEK); linjen visar årlig förändringstakt (YoY %).'
                : 'De 10 snabbast växande publicerade svenska e-handlarna i databasen.'}
            </span>
            <button
              type="button"
              onClick={() => onNavigate('ehandlare')}
              className="font-bold text-[#006AA7] hover:underline cursor-pointer"
            >
              Utforska alla e-handlare &amp; nyckeltal &rarr;
            </button>
          </div>
        </section>

        {/* Demographics & Consumer Behavior */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-100">
            <div>
              <div className="text-xs font-mono font-semibold text-[#006AA7]">Konsumentinsikt & demografi</div>
              <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-[#040B16] mt-1">
                Vem handlar vad – och hur vill svensken betala?
              </h2>
            </div>
            <div className="inline-flex bg-slate-100 p-1 rounded-lg text-xs font-semibold self-start">
              <button
                type="button"
                onClick={() => setDemoTab('generations')}
                className={`px-3.5 py-2 rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                  demoTab === 'generations'
                    ? 'bg-white text-[#040B16] shadow-sm'
                    : 'text-slate-600 hover:text-[#040B16]'
                }`}
              >
                Generationer
              </button>
              <button
                type="button"
                onClick={() => setDemoTab('payments')}
                className={`px-3.5 py-2 rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                  demoTab === 'payments'
                    ? 'bg-white text-[#040B16] shadow-sm'
                    : 'text-slate-600 hover:text-[#040B16]'
                }`}
              >
                Betalsätt
              </button>
              <button
                type="button"
                onClick={() => setDemoTab('delivery')}
                className={`px-3.5 py-2 rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                  demoTab === 'delivery'
                    ? 'bg-white text-[#040B16] shadow-sm'
                    : 'text-slate-600 hover:text-[#040B16]'
                }`}
              >
                Leveransval
              </button>
            </div>
          </div>

          <div className="mt-6">
            {demoTab === 'generations' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                <div className="p-5 rounded-xl border border-slate-200">
                  <div className="font-mono text-xs font-bold text-[#006AA7]">Gen Z (18–29 år)</div>
                  <div className="font-display text-3xl font-extrabold text-[#040B16] mt-1 tabular-nums">86 %</div>
                  <div className="text-xs font-medium text-slate-500 mt-1">Handlar varje månad · Snitt 1 980 kr</div>
                  <p className="text-xs text-slate-600 mt-3 leading-relaxed">
                    Social commerce, second hand, skönhet och mode. 89% använder Swish och paketskåp.
                  </p>
                </div>
                <div className="p-5 rounded-xl bg-[#040B16] text-white">
                  <div className="font-mono text-xs font-bold text-[#FECC02]">Millennials (30–49 år)</div>
                  <div className="font-display text-3xl font-extrabold text-white mt-1 tabular-nums">88 %</div>
                  <div className="text-xs font-medium text-slate-400 mt-1">Högst köpkraft · Snitt 2 840 kr</div>
                  <p className="text-xs text-slate-300 mt-3 leading-relaxed">
                    Barnfamiljer driver storhandel inom apotek, sport, barnkläder och heminredning.
                  </p>
                </div>
                <div className="p-5 rounded-xl border border-slate-200">
                  <div className="font-mono text-xs font-bold text-[#059669]">Gen X (50–64 år)</div>
                  <div className="font-display text-3xl font-extrabold text-[#040B16] mt-1 tabular-nums">74 %</div>
                  <div className="text-xs font-medium text-slate-500 mt-1">Hög lojalitet · Snitt 2 290 kr</div>
                  <p className="text-xs text-slate-600 mt-3 leading-relaxed">
                    Värdesätter Trygg E-handel, Trustpilot-omdömen och tydlig kundservice över lägsta pris.
                  </p>
                </div>
                <div className="p-5 rounded-xl border border-slate-200">
                  <div className="font-mono text-xs font-bold text-amber-700">Boomers (65–79 år)</div>
                  <div className="font-display text-3xl font-extrabold text-[#040B16] mt-1 tabular-nums">57 %</div>
                  <div className="text-xs font-medium text-slate-500 mt-1">Snabbast tillväxt · Snitt 1 650 kr</div>
                  <p className="text-xs text-slate-600 mt-3 leading-relaxed">
                    Apoteksvaror, böcker och hemleverans till dörren driver stark digital adoption.
                  </p>
                </div>
              </div>
            )}

            {demoTab === 'payments' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="p-5 rounded-xl border border-slate-200">
                  <div className="flex justify-between items-center font-bold text-sm">
                    <span>Swish (Mobilt BankID)</span>
                    <span className="font-mono text-[#006AA7] tabular-nums">42 %</span>
                  </div>
                  <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                    Överlägsen etta i mobilen. Högst konvertering vid direktköp under 1 500 kr.
                  </p>
                </div>
                <div className="p-5 rounded-xl border border-slate-200">
                  <div className="flex justify-between items-center font-bold text-sm">
                    <span>Faktura / BNPL (Klarna, Qliro, Walley)</span>
                    <span className="font-mono text-[#040B16] tabular-nums">34 %</span>
                  </div>
                  <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                    Dominerar inom mode och skor där kunden vill prova hemma innan betalning.
                  </p>
                </div>
                <div className="p-5 rounded-xl border border-slate-200">
                  <div className="flex justify-between items-center font-bold text-sm">
                    <span>Kort & digitala plånböcker (Apple Pay)</span>
                    <span className="font-mono text-[#059669] tabular-nums">24 %</span>
                  </div>
                  <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                    Apple Pay växer snabbast bland iOS-användare vid internationella köp.
                  </p>
                </div>
              </div>
            )}

            {demoTab === 'delivery' && (
              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  {deliveryStats.receptionChannels.map((rc) => (
                    <div key={rc.id} className="p-5 rounded-xl border border-slate-200">
                      <div className="flex justify-between items-center font-bold text-sm gap-2">
                        <span>{rc.channel.split(' (')[0]}</span>
                        <span className="font-mono text-[#006AA7] tabular-nums shrink-0">
                          {rc.sharePct} %
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mt-2 leading-relaxed">{rc.insight}</p>
                    </div>
                  ))}
                </div>
                <div className="text-[11px] font-mono text-slate-500">
                  Källa: Paketindex {paketindex?.quarterLabel || 'Kvartal 1 2026'} ({paketindex?.publisher || 'Transportföretagen & HUI'}) · Separat äldre sammanfattningsunderlag; inte vald arkivperiod.
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Order Economics & Shipping Cost Benchmarks */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-slate-100">
            <div>
              <div className="text-xs font-mono font-semibold text-[#059669]">
                Order- & fraktekonomi · Sverige 2026–2027
              </div>
              <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-[#040B16] mt-1">
                Snittordervärde, fraktkostnad per ordernivå & artiklar per order
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-3xl">
                Jämför hur fraktavgifter, handlarens faktiska transportkostnad, antal artiklar per order (UPT) och returgrad varierar mellan ordervärden och svenska branscher.
              </p>
            </div>

            <div className="inline-flex flex-wrap bg-slate-100 p-1 rounded-lg text-xs font-semibold self-start shrink-0 gap-1">
              <button
                type="button"
                onClick={() => setEconTab('tiers')}
                className={`px-3.5 py-2 rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                  econTab === 'tiers'
                    ? 'bg-[#040B16] text-white'
                    : 'text-slate-600 hover:text-[#040B16]'
                }`}
              >
                Frakt per ordervärde
              </button>
              <button
                type="button"
                onClick={() => setEconTab('categories')}
                className={`px-3.5 py-2 rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                  econTab === 'categories'
                    ? 'bg-[#040B16] text-white'
                    : 'text-slate-600 hover:text-[#040B16]'
                }`}
              >
                Per bransch (AOV & UPT)
              </button>
              <button
                type="button"
                onClick={() => setEconTab('parcels')}
                className={`px-3.5 py-2 rounded-md transition-colors cursor-pointer whitespace-nowrap inline-flex items-center gap-1.5 ${
                  econTab === 'parcels'
                    ? 'bg-[#040B16] text-white'
                    : 'text-slate-600 hover:text-[#040B16]'
                }`}
              >
                <Package className="w-3.5 h-3.5" />
                Paketvolym & E-handlare
              </button>
              <button
                type="button"
                onClick={() => setEconTab('calculator')}
                className={`px-3.5 py-2 rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                  econTab === 'calculator'
                    ? 'bg-[#040B16] text-white'
                    : 'text-slate-600 hover:text-[#040B16]'
                }`}
              >
                Marginalkalkylator
              </button>
            </div>
          </div>

          {/* Sub-view 1: Shipping Cost by Order Value Bracket (Volume-Adjusted) */}
          {econTab === 'tiers' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-[#F4F6F9] border border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="text-xs font-bold text-[#040B16]">
                    Handlarens paketvolym styr frakttaxan (antal skickade paket / år)
                  </div>
                  <div className="text-[11px] text-slate-600">
                    Välj årlig paketvolym nedan för att se hur fraktavtal, plock &amp; subvention ändras per ordernivå.
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {PARCEL_VOLUME_TIERS.map((vt) => {
                    const active = vt.id === selectedVolumeTierId;
                    return (
                      <button
                        key={vt.id}
                        type="button"
                        onClick={() => setSelectedVolumeTierId(vt.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer whitespace-nowrap ${
                          active
                            ? 'bg-[#040B16] text-white border-[#040B16]'
                            : 'bg-white text-slate-700 border-slate-200 hover:border-slate-400'
                        }`}
                      >
                        {vt.rangeLabel.replace(' paket/år', ' pkt')}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="hidden lg:block border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full table-fixed text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-mono">
                      <th className="py-3 px-3 font-semibold w-[28%]">Ordervärde (Orderkostnad)</th>
                      <th className="py-3 px-2 font-semibold text-right w-[10%]">Kundfrakt</th>
                      <th className="py-3 px-2 font-semibold text-right w-[12%]">Handlarens kostn.</th>
                      <th className="py-3 px-2 font-semibold text-right w-[10%]">Subvention</th>
                      <th className="py-3 px-2 font-semibold text-right w-[9%]">Fri frakt</th>
                      <th className="py-3 px-2 font-semibold text-right w-[9%]">Frakt/AOV</th>
                      <th className="py-3 px-3 font-semibold w-[22%]">Vanligaste leveranssätt</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {shippingTiers.map((tier) => {
                      const adjustedMerchantCost = Math.round(
                        tier.merchantShippingCostSek * activeVolumeTier.costMultiplier
                      );
                      const subsidy = Math.max(0, adjustedMerchantCost - tier.customerShippingFeeSek);
                      return (
                        <tr key={tier.id} className="hover:bg-slate-50 align-top">
                          <td className="py-3.5 px-3 break-words">
                            <div className="font-display font-bold text-sm text-[#040B16] tabular-nums">
                              {tier.orderValueRange}
                            </div>
                            <div className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                              {tier.insight}
                            </div>
                          </td>
                          <td className="py-3.5 px-2 text-right font-mono font-bold text-[#006AA7] tabular-nums">
                            {tier.customerShippingFeeSek} SEK
                          </td>
                          <td className="py-3.5 px-2 text-right font-mono font-bold text-[#040B16] tabular-nums">
                            {adjustedMerchantCost} SEK
                            {activeVolumeTier.id !== 'scaleup' && (
                              <span className="block text-[10px] font-normal text-slate-500">
                                Snitt {tier.merchantShippingCostSek} SEK
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-2 text-right font-mono font-semibold text-amber-700 tabular-nums">
                            -{subsidy} SEK
                          </td>
                          <td className="py-3.5 px-2 text-right font-mono font-bold text-[#059669] tabular-nums">
                            {tier.freeShippingSharePct} %
                          </td>
                          <td className="py-3.5 px-2 text-right font-mono text-slate-700 tabular-nums">
                            {tier.shippingToAovPct.toFixed(1)} %
                          </td>
                          <td className="py-3.5 px-3 text-slate-700 font-medium break-words">
                            {tier.dominantMethod}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 lg:hidden">
                {shippingTiers.map((tier) => {
                  const adjustedMerchantCost = Math.round(
                    tier.merchantShippingCostSek * activeVolumeTier.costMultiplier
                  );
                  const subsidy = Math.max(0, adjustedMerchantCost - tier.customerShippingFeeSek);
                  return (
                    <div
                      key={tier.id}
                      className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-display font-bold text-sm text-[#040B16] tabular-nums">
                          {tier.orderValueRange}
                        </span>
                        <span className="font-mono font-bold text-[#059669] tabular-nums">
                          {tier.freeShippingSharePct} % fri frakt
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600">{tier.insight}</p>
                      <div className="grid grid-cols-3 gap-2 pt-1 font-mono bg-white border border-slate-200 rounded-lg p-2.5">
                        <div>
                          <span className="text-[10px] text-slate-500 block">Kundfrakt</span>
                          <span className="font-bold text-[#006AA7] tabular-nums">{tier.customerShippingFeeSek} SEK</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 block">Handlare</span>
                          <span className="font-bold text-[#040B16] tabular-nums">{adjustedMerchantCost} SEK</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 block">Subvention</span>
                          <span className="font-bold text-amber-700 tabular-nums">-{subsidy} SEK</span>
                        </div>
                      </div>
                      <div className="text-[11px] text-slate-700">
                        <strong>Leveranssätt:</strong> {tier.dominantMethod}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="text-xs text-slate-500 pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                <span>
                  Aktiv volymnivå: <strong className="text-[#040B16]">{activeVolumeTier.label}</strong> ({activeVolumeTier.rangeLabel}) · {activeVolumeTier.carrierAgreementNote}.
                </span>
                <button
                  type="button"
                  onClick={() => setEconTab('parcels')}
                  className="font-mono text-[#006AA7] font-bold hover:underline cursor-pointer"
                >
                  Se e-handlarnas antal paket/år &rarr;
                </button>
              </div>
            </div>
          )}

          {/* Sub-view 2: Benchmarks by Category */}
          {econTab === 'categories' && (
            <div className="space-y-4">
              <div className="hidden lg:block border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full table-fixed text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-mono">
                      <th className="py-3 px-3 font-semibold w-[23%]">Bransch</th>
                      <th className="py-3 px-2 font-semibold text-right w-[12%]">Snittorder</th>
                      <th className="py-3 px-2 font-semibold text-right w-[11%]">Artiklar/order</th>
                      <th className="py-3 px-2 font-semibold text-right w-[10%]">Kundfrakt</th>
                      <th className="py-3 px-2 font-semibold text-right w-[11%]">Handlarfrakt</th>
                      <th className="py-3 px-2 font-semibold text-right w-[12%]">Fri frakt-gräns</th>
                      <th className="py-3 px-2 font-semibold text-right w-[10%]">Returgrad</th>
                      <th className="py-3 px-3 font-semibold text-right w-[11%]">Konvertering</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {orderBenchmarks.map((b) => (
                      <tr key={b.id} className="hover:bg-slate-50 h-11">
                        <td className="py-2.5 px-3 font-display font-bold text-sm text-[#040B16] break-words">
                          {b.category}
                        </td>
                        <td className="py-2.5 px-2 text-right font-mono font-bold text-[#006AA7] tabular-nums">
                          {b.avgOrderValueSek.toLocaleString('sv-SE')} SEK
                        </td>
                        <td className="py-2.5 px-2 text-right font-mono font-bold text-[#040B16] tabular-nums">
                          {b.itemsPerOrder.toFixed(1)} st
                        </td>
                        <td className="py-2.5 px-2 text-right font-mono text-slate-700 tabular-nums">
                          {b.avgCustomerShippingFeeSek} SEK
                        </td>
                        <td className="py-2.5 px-2 text-right font-mono text-slate-700 tabular-nums">
                          {b.merchantShippingCostSek} SEK
                        </td>
                        <td className="py-2.5 px-2 text-right font-mono font-semibold text-[#059669] tabular-nums">
                          {b.freeShippingThresholdSek} SEK
                        </td>
                        <td
                          className={`py-2.5 px-2 text-right font-mono font-semibold tabular-nums ${
                            b.returnRatePct >= 15
                              ? 'text-amber-700'
                              : 'text-slate-700'
                          }`}
                        >
                          {b.returnRatePct.toFixed(1)} %
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-700 tabular-nums">
                          {b.conversionRatePct.toFixed(1)} %
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 lg:hidden">
                {orderBenchmarks.map((b) => (
                  <div key={b.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-display font-bold text-sm text-[#040B16]">{b.category}</span>
                      <span className="font-mono font-bold text-[#006AA7] tabular-nums">
                        {b.avgOrderValueSek.toLocaleString('sv-SE')} SEK
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 font-mono bg-white border border-slate-200 rounded-lg p-2.5">
                      <div>
                        <span className="text-[10px] text-slate-500 block">UPT</span>
                        <span className="font-bold text-[#040B16]">{b.itemsPerOrder.toFixed(1)} st</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block">Handlarfrakt</span>
                        <span className="font-bold text-[#040B16]">{b.merchantShippingCostSek} kr</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block">Retur</span>
                        <span className="font-bold text-amber-700">{b.returnRatePct.toFixed(1)}%</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="text-xs text-slate-500 pt-2 border-t border-slate-100">
                Data avser svenska B2C-ehandlare (2026–2027). Alla siffror kan justeras i CMS Studio.
              </div>
            </div>
          )}

          {/* Sub-view 3: Parcel Volume Tiers & Per-Merchant Parcel Estimates */}
          {econTab === 'parcels' && (
            <div className="space-y-8">
              {/* Part A: Swedish Carrier Volume Pricing Curve */}
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="font-display font-bold text-lg text-[#040B16]">
                      1. Volymtrappa: Antal paket per år avgör handlarens fraktkostnad
                    </h3>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Transportörernas nettotaxa och plockkostnad sjunker med upp till 41% när års-volymen går från uppstart till robotlager.
                    </p>
                  </div>
                  <span className="font-mono text-xs font-bold text-[#059669] tabular-nums">
                    Totalt i CMS-katalogen: {formatParcelCountCompact(totalCatalogParcels)}/år
                  </span>
                </div>

                <div className="hidden lg:block border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full table-fixed text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-mono">
                        <th className="py-2.5 px-3 font-semibold w-[26%]">Volymnivå (Paket / år)</th>
                        <th className="py-2.5 px-2 font-semibold text-right w-[12%]">Transport</th>
                        <th className="py-2.5 px-2 font-semibold text-right w-[12%]">Plock &amp; emb.</th>
                        <th className="py-2.5 px-2 font-semibold text-right w-[12%]">Total / paket</th>
                        <th className="py-2.5 px-2 font-semibold text-right w-[11%]">Volymrabatt</th>
                        <th className="py-2.5 px-3 font-semibold w-[27%]">Typiskt transportupplägg</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {PARCEL_VOLUME_TIERS.map((vt) => (
                        <tr key={vt.id} className="hover:bg-slate-50 align-top">
                          <td className="py-3 px-3 break-words">
                            <div className="font-display font-bold text-sm text-[#040B16]">
                              {vt.rangeLabel}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              {vt.label} · Omsättning {vt.typicalMerchantRevenue}
                            </div>
                          </td>
                          <td className="py-3 px-2 text-right font-mono font-semibold text-slate-700 tabular-nums">
                            {vt.transportFeeSek} SEK
                          </td>
                          <td className="py-3 px-2 text-right font-mono text-slate-700 tabular-nums">
                            {vt.pickPackPackagingSek} SEK
                          </td>
                          <td className="py-3 px-2 text-right font-mono font-extrabold text-[#006AA7] tabular-nums">
                            {vt.totalPerParcelSek} SEK
                          </td>
                          <td className="py-3 px-2 text-right font-mono font-bold text-[#059669] tabular-nums">
                            {vt.discountVsStarterPct === 0 ? 'Baspris' : `-${vt.discountVsStarterPct} %`}
                          </td>
                          <td className="py-3 px-3 text-slate-600 break-words">{vt.carrierAgreementNote}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 lg:hidden">
                  {PARCEL_VOLUME_TIERS.map((vt) => (
                    <div key={vt.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-1.5 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-display font-bold text-sm text-[#040B16]">{vt.rangeLabel}</span>
                        <span className="font-mono font-extrabold text-[#006AA7] tabular-nums">{vt.totalPerParcelSek} SEK</span>
                      </div>
                      <div className="text-[11px] text-slate-500">{vt.label} · {vt.typicalMerchantRevenue}</div>
                      <div className="text-[11px] text-slate-700">{vt.carrierAgreementNote}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Part B: Estimated Parcel Volume & Freight Cost per Merchant */}
              <div className="space-y-3 pt-4 border-t border-slate-100">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="font-display font-bold text-lg text-[#040B16]">
                      2. Hur många paket skickar Sveriges e-handlare? ({merchantParcelRows.length} bolag)
                    </h3>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Beräknat via (Omsättning exkl. moms ÷ Bransch-AOV × 1,06 kollin/order) eller rapporterad volym i CMS. Klicka på Simulera för exakt kalkyl.
                    </p>
                  </div>
                  <div className="relative w-full sm:w-64">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={parcelMerchantSearch}
                      onChange={(e) => setParcelMerchantSearch(e.target.value)}
                      placeholder="Filtrera e-handlare eller bransch..."
                      className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#006AA7]"
                    />
                  </div>
                </div>

                <div className="hidden lg:block max-h-[420px] overflow-y-auto border border-slate-200 rounded-xl">
                  <table className="w-full table-fixed text-left border-collapse text-xs">
                    <thead className="sticky top-0 bg-slate-50 z-10">
                      <tr className="border-b border-slate-200 text-slate-500 font-mono">
                        <th className="py-2.5 px-3 font-semibold w-[26%]">E-handlare</th>
                        <th className="py-2.5 px-2 font-semibold text-right w-[13%]">Omsättning</th>
                        <th className="py-2.5 px-2 font-semibold text-right w-[15%]">Est. paket / år</th>
                        <th className="py-2.5 px-2 font-semibold text-right w-[12%]">Paket / dag</th>
                        <th className="py-2.5 px-2 font-semibold text-right w-[11%]">Kostnad / pkt</th>
                        <th className="py-2.5 px-2 font-semibold text-right w-[13%]">Fraktbudget/år</th>
                        <th className="py-2.5 px-3 font-semibold text-right w-[10%]">Kalkyl</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {filteredParcelRows.map(({ merchant, estimate }) => (
                        <tr key={merchant.id} className="hover:bg-slate-50">
                          <td className="py-3 px-3 break-words">
                            <div className="font-display font-bold text-sm text-[#040B16]">
                              {merchant.name}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              {merchant.category} · Snitt AOV {estimate.categoryAovSek} SEK
                            </div>
                          </td>
                          <td className="py-3 px-2 text-right font-mono font-semibold text-slate-700 tabular-nums">
                            {merchant.revenue}
                          </td>
                          <td className="py-3 px-2 text-right font-mono font-extrabold text-[#040B16] tabular-nums">
                            {formatParcelCountCompact(estimate.annualParcels)}
                            <span className="block text-[10px] font-normal text-slate-500">
                              {estimate.volumeTier.label}
                            </span>
                          </td>
                          <td className="py-3 px-2 text-right font-mono text-slate-700 tabular-nums">
                            {estimate.parcelsPerDay.toLocaleString('sv-SE')} / dag
                          </td>
                          <td className="py-3 px-2 text-right font-mono font-bold text-[#006AA7] tabular-nums">
                            {estimate.estimatedCostPerParcelSek} SEK
                          </td>
                          <td className="py-3 px-2 text-right font-mono font-bold text-[#059669] tabular-nums">
                            {formatSekCompact(estimate.estimatedAnnualFreightCostSek)}
                          </td>
                          <td className="py-3 px-3 text-right">
                            <button
                              type="button"
                              onClick={() => {
                                const bench =
                                  orderBenchmarks.find((b) => b.category === merchant.category) ||
                                  orderBenchmarks[0];
                                if (bench) {
                                  setCalcCategoryId(bench.id);
                                  setCalcOrderValue(bench.avgOrderValueSek);
                                  setCalcFreeThreshold(bench.freeShippingThresholdSek);
                                }
                                setCalcSelectedMerchantId(merchant.id);
                                setCalcAnnualParcels(estimate.annualParcels);
                                setEconTab('calculator');
                              }}
                              className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-[#040B16] hover:text-white text-[#040B16] font-bold text-[11px] transition-colors cursor-pointer"
                            >
                              Simulera
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 lg:hidden max-h-[420px] overflow-y-auto pr-1">
                  {filteredParcelRows.map(({ merchant, estimate }) => (
                    <div key={merchant.id} className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-2 text-xs">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-display font-bold text-sm text-[#040B16]">{merchant.name}</div>
                          <div className="text-[11px] text-slate-500">{merchant.category} · {merchant.revenue}</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const bench =
                              orderBenchmarks.find((b) => b.category === merchant.category) ||
                              orderBenchmarks[0];
                            if (bench) {
                              setCalcCategoryId(bench.id);
                              setCalcOrderValue(bench.avgOrderValueSek);
                              setCalcFreeThreshold(bench.freeShippingThresholdSek);
                            }
                            setCalcSelectedMerchantId(merchant.id);
                            setCalcAnnualParcels(estimate.annualParcels);
                            setEconTab('calculator');
                          }}
                          className="px-2.5 py-1 rounded-lg bg-[#040B16] text-white font-bold text-[11px] cursor-pointer"
                        >
                          Simulera
                        </button>
                      </div>
                      <div className="grid grid-cols-3 gap-2 font-mono bg-slate-50 rounded-lg p-2">
                        <div>
                          <span className="text-[10px] text-slate-500 block">Paket/år</span>
                          <span className="font-bold text-[#040B16]">{formatParcelCountCompact(estimate.annualParcels)}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 block">Kostnad/pkt</span>
                          <span className="font-bold text-[#006AA7]">{estimate.estimatedCostPerParcelSek} kr</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 block">Budget/år</span>
                          <span className="font-bold text-[#059669]">{formatSekCompact(estimate.estimatedAnnualFreightCostSek)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Sub-view 4: Interactive Order, Parcel Volume & Shipping Margin Calculator */}
          {econTab === 'calculator' && calcCategory && (() => {
            const calcVolumeTier = getVolumeTierForCount(calcAnnualParcels);
            const volumeAdjustedMerchantCostSek = Math.round(
              calcCategory.merchantShippingCostSek * calcVolumeTier.costMultiplier
            );
            const customerPaysShipping =
              calcOrderValue >= calcFreeThreshold ? 0 : calcBaseShippingFee;
            const grossMarginSek = Math.round(
              calcOrderValue * (calcCategory.grossMarginPct / 100)
            );
            const shippingNetCost =
              volumeAdjustedMerchantCostSek - customerPaysShipping;
            const expectedReturnHandlingCost = Math.round(
              (calcCategory.returnRatePct / 100) *
                (volumeAdjustedMerchantCostSek + 38)
            );
            const contributionAfterLogistics =
              grossMarginSek - shippingNetCost - expectedReturnHandlingCost;
            const contributionPct = Math.round(
              (contributionAfterLogistics / Math.max(1, calcOrderValue)) * 1000
            ) / 10;

            const totalAnnualFreightCostSek =
              calcAnnualParcels * volumeAdjustedMerchantCostSek;
            const totalAnnualNetSubsidySek =
              calcAnnualParcels * Math.max(0, shippingNetCost);
            const nextTierIndex =
              PARCEL_VOLUME_TIERS.findIndex((t) => t.id === calcVolumeTier.id) + 1;
            const nextTier =
              nextTierIndex < PARCEL_VOLUME_TIERS.length
                ? PARCEL_VOLUME_TIERS[nextTierIndex]
                : null;
            const nextTierCostPerParcel = nextTier
              ? Math.round(calcCategory.merchantShippingCostSek * nextTier.costMultiplier)
              : volumeAdjustedMerchantCostSek;
            const nextTierAnnualSavingsSek = nextTier
              ? Math.max(
                  0,
                  calcAnnualParcels * (volumeAdjustedMerchantCostSek - nextTierCostPerParcel)
                )
              : 0;

            return (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                <div className="lg:col-span-6 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        Välj bransch (marginal &amp; returgrad)
                      </label>
                      <select
                        value={calcCategory.id}
                        onChange={(e) => {
                          const next = orderBenchmarks.find((b) => b.id === e.target.value);
                          setCalcCategoryId(e.target.value);
                          setCalcSelectedMerchantId('');
                          if (next) {
                            setCalcOrderValue(next.avgOrderValueSek);
                            setCalcFreeThreshold(next.freeShippingThresholdSek);
                          }
                        }}
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold bg-white"
                      >
                        {orderBenchmarks.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.category} (AOV {b.avgOrderValueSek} SEK)
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        Hämta volym från e-handlare (valfritt)
                      </label>
                      <select
                        value={calcSelectedMerchantId}
                        onChange={(e) => {
                          const mId = e.target.value;
                          setCalcSelectedMerchantId(mId);
                          const row = merchantParcelRows.find((r) => r.merchant.id === mId);
                          if (row) {
                            const bench = orderBenchmarks.find(
                              (b) => b.category === row.merchant.category
                            );
                            if (bench) {
                              setCalcCategoryId(bench.id);
                              setCalcOrderValue(bench.avgOrderValueSek);
                              setCalcFreeThreshold(bench.freeShippingThresholdSek);
                            }
                            setCalcAnnualParcels(row.estimate.annualParcels);
                          }
                        }}
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold bg-white"
                      >
                        <option value="">Egen paketvolym...</option>
                        {merchantParcelRows.map(({ merchant, estimate }) => (
                          <option key={merchant.id} value={merchant.id}>
                            {merchant.name} ({formatParcelCountCompact(estimate.annualParcels)}/år)
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Annual Parcel Volume Control */}
                  <div className="p-4 rounded-xl bg-[#F4F6F9] border border-slate-200 space-y-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-semibold text-slate-700">
                      <span>Antal skickade paket per år (styr fraktavtalet)</span>
                      <span className="font-mono text-[#006AA7] font-bold tabular-nums">
                        {calcAnnualParcels.toLocaleString('sv-SE')} pkt/år · {calcVolumeTier.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min={1000}
                        max={1000000}
                        step={5000}
                        value={Math.min(1000000, calcAnnualParcels)}
                        onChange={(e) => {
                          setCalcSelectedMerchantId('');
                          setCalcAnnualParcels(Number(e.target.value));
                        }}
                        className="flex-1 accent-[#006AA7]"
                      />
                      <input
                        type="number"
                        min={100}
                        max={25000000}
                        step={1000}
                        value={calcAnnualParcels}
                        onChange={(e) => {
                          setCalcSelectedMerchantId('');
                          setCalcAnnualParcels(Math.max(100, Number(e.target.value) || 1000));
                        }}
                        className="w-28 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-mono font-bold text-right"
                      />
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {[3000, 15000, 50000, 250000, 750000].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => {
                            setCalcSelectedMerchantId('');
                            setCalcAnnualParcels(preset);
                          }}
                          className={`px-2.5 py-1 rounded-md text-[11px] font-mono font-semibold cursor-pointer border ${
                            calcAnnualParcels === preset
                              ? 'bg-[#040B16] text-white border-[#040B16]'
                              : 'bg-white text-slate-700 border-slate-200 hover:border-slate-400'
                          }`}
                        >
                          {preset.toLocaleString('sv-SE')} pkt
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                      <span>Ordervärde (exkl. frakt)</span>
                      <span className="font-mono text-[#006AA7] tabular-nums">
                        {calcOrderValue.toLocaleString('sv-SE')} SEK
                      </span>
                    </div>
                    <input
                      type="range"
                      min={150}
                      max={3500}
                      step={50}
                      value={calcOrderValue}
                      onChange={(e) => setCalcOrderValue(Number(e.target.value))}
                      className="w-full accent-[#040B16]"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                        <span>Fri frakt-gräns</span>
                        <span className="font-mono text-[#059669] tabular-nums">
                          {calcFreeThreshold} SEK
                        </span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={1500}
                        step={50}
                        value={calcFreeThreshold}
                        onChange={(e) => setCalcFreeThreshold(Number(e.target.value))}
                        className="w-full accent-[#059669]"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                        <span>Fraktavgift under gräns</span>
                        <span className="font-mono text-[#040B16] tabular-nums">
                          {calcBaseShippingFee} SEK
                        </span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={99}
                        step={5}
                        value={calcBaseShippingFee}
                        onChange={(e) => setCalcBaseShippingFee(Number(e.target.value))}
                        className="w-full accent-[#040B16]"
                      />
                    </div>
                  </div>

                  <div className="text-xs text-slate-500 pt-2 border-t border-slate-100">
                    Branschbenchmark för <strong>{calcCategory.category}</strong>: Bruttomarginal{' '}
                    <span className="font-mono tabular-nums">{calcCategory.grossMarginPct}%</span> ·{' '}
                    Returgrad <span className="font-mono tabular-nums">{calcCategory.returnRatePct}%</span> ·{' '}
                    Volymjusterad kostnad/pkt{' '}
                    <span className="font-mono tabular-nums font-bold text-[#040B16]">
                      {volumeAdjustedMerchantCostSek} SEK
                    </span>{' '}
                    (rikssnitt {calcCategory.merchantShippingCostSek} SEK).
                  </div>
                </div>

                <div className="lg:col-span-6 bg-[#040B16] text-white rounded-2xl p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-semibold text-[#FECC02]">
                      Simulerad order- &amp; årsekonomi
                    </span>
                    <span className="text-xs font-mono text-slate-300 tabular-nums">
                      {customerPaysShipping === 0
                        ? 'Fri frakt uppnådd'
                        : `Kund betalar ${customerPaysShipping} SEK frakt`}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-xs text-slate-400">Bruttovinst före logistik</div>
                      <div className="font-display text-2xl font-extrabold text-white tabular-nums">
                        {grossMarginSek} SEK
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400">Nettobidrag efter frakt &amp; retur</div>
                      <div
                        className={`font-display text-2xl font-extrabold tabular-nums ${
                          contributionAfterLogistics > 0 ? 'text-[#10B981]' : 'text-red-400'
                        }`}
                      >
                        {contributionAfterLogistics} SEK ({contributionPct}%)
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-white/10 space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-300">
                        Handlarens paketkostnad ({calcVolumeTier.label})
                      </span>
                      <span className="font-mono tabular-nums text-white font-bold">
                        {volumeAdjustedMerchantCostSek} SEK / paket
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-300">Handlarens fraktsubvention / order</span>
                      <span className="font-mono tabular-nums text-amber-300">
                        {shippingNetCost > 0 ? `-${shippingNetCost} SEK` : `+${Math.abs(shippingNetCost)} SEK`}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-300">
                        Förväntad returhantering ({calcCategory.returnRatePct}% risk)
                      </span>
                      <span className="font-mono tabular-nums text-slate-200">
                        -{expectedReturnHandlingCost} SEK
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-300">Förväntat antal artiklar i korgen</span>
                      <span className="font-mono tabular-nums text-[#FECC02]">
                        {calcCategory.itemsPerOrder.toFixed(1)} st
                      </span>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-white/10 space-y-2 text-xs">
                    <div className="text-[11px] font-mono text-[#FECC02] font-semibold">
                      Årsekonomi vid {formatParcelCountCompact(calcAnnualParcels)}/år
                    </div>
                    <div className="grid grid-cols-2 gap-3 bg-white/5 border border-white/10 rounded-xl p-3.5">
                      <div>
                        <div className="text-[11px] text-slate-400">Total frakt- &amp; plockkostnad</div>
                        <div className="font-display text-lg font-extrabold text-white tabular-nums mt-0.5">
                          {formatSekCompact(totalAnnualFreightCostSek)}
                        </div>
                      </div>
                      <div>
                        <div className="text-[11px] text-slate-400">Total fraktsubvention / år</div>
                        <div className="font-display text-lg font-extrabold text-amber-300 tabular-nums mt-0.5">
                          {formatSekCompact(totalAnnualNetSubsidySek)}
                        </div>
                      </div>
                    </div>
                    {nextTier && nextTierAnnualSavingsSek > 0 && (
                      <div className="text-[11px] text-[#10B981] font-medium">
                        Nästa volymtrappa ({nextTier.rangeLabel}) sänker kostnaden till {nextTierCostPerParcel} SEK/paket – motsvarar{' '}
                        <strong className="font-mono tabular-nums">
                          {formatSekCompact(nextTierAnnualSavingsSek)}/år
                        </strong>{' '}
                        i lägre logistikkostnad.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}
        </div>

        {/* Delivery Timing, Reception Preferences, Density & Carrier Coverage */}
        <div
          id="hemleverans-densitet"
          className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-6 scroll-mt-20"
        >
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-slate-100">
            <div>
              <div className="text-xs font-mono font-semibold text-[#006AA7]">
                Leveranspreferenser, Densitet &amp; Täckning · {deliveryStats.updatedNote}
              </div>
              <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-[#040B16] mt-1">
                Befolkningsdensitet, paketskåpsdensitet &amp; hemleveranstäckning
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-3xl">
                Jämför svensk befolkningstäthet, utbyggnaden av paketskåp per 10 000 invånare och hushållstäckning för hemleverans – både samlat och per transportör.
              </p>
            </div>

            <div className="inline-flex flex-wrap bg-slate-100 p-1 rounded-lg text-xs font-semibold self-start shrink-0 gap-1">
              <button
                type="button"
                onClick={() => setDeliverySubTab('coverage')}
                className={`px-3.5 py-2 rounded-md transition-colors cursor-pointer whitespace-nowrap inline-flex items-center gap-1.5 ${
                  deliverySubTab === 'coverage'
                    ? 'bg-[#040B16] text-white'
                    : 'text-slate-600 hover:text-[#040B16]'
                }`}
              >
                Skåpdensitet &amp; Hemleverans
              </button>
              <button
                type="button"
                onClick={() => setDeliverySubTab('timing')}
                className={`px-3.5 py-2 rounded-md transition-colors cursor-pointer whitespace-nowrap inline-flex items-center gap-1.5 ${
                  deliverySubTab === 'timing'
                    ? 'bg-[#040B16] text-white'
                    : 'text-slate-600 hover:text-[#040B16]'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                Tidpunkt &amp; Mottagning
              </button>
              <button
                type="button"
                onClick={() => setDeliverySubTab('parcel')}
                className={`px-3.5 py-2 rounded-md transition-colors cursor-pointer whitespace-nowrap inline-flex items-center gap-1.5 ${
                  deliverySubTab === 'parcel'
                    ? 'bg-[#040B16] text-white'
                    : 'text-slate-600 hover:text-[#040B16]'
                }`}
              >
                <Package className="w-3.5 h-3.5" />
                Storlek &amp; Paketvikt
              </button>
            </div>
          </div>

          {/* 4 Headline KPI Strip */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-[#F4F6F9] border border-slate-200">
              <div className="text-[11px] font-mono text-slate-500">Befolkningsdensitet (SCB)</div>
              <div className="font-display text-lg sm:text-xl font-extrabold text-[#040B16] mt-1 tabular-nums">
                {(deliveryStats.nationalPopulationDensityKm2 ?? 25.9).toFixed(1).replace('.', ',')} inv/km²
              </div>
              <div className="text-xs text-slate-600 mt-0.5">348 i Stockholms län · 2,6 i Norrbotten</div>
            </div>
            <div className="p-4 rounded-xl bg-[#F4F6F9] border border-slate-200">
              <div className="text-[11px] font-mono text-slate-500">Paketskåpsdensitet i Sverige</div>
              <div className="font-display text-lg sm:text-xl font-extrabold text-[#006AA7] mt-1 tabular-nums">
                {(deliveryStats.lockersPer10kNational ?? 10.2).toFixed(1).replace('.', ',')} skåp / 10k inv
              </div>
              <div className="text-xs text-slate-600 mt-0.5 tabular-nums">
                {(deliveryStats.totalParcelLockerStations ?? 10850).toLocaleString('sv-SE')}+ stationer ·{' '}
                {deliveryStats.combinedLockerReachPct ?? 86}% tätortsnärhet
              </div>
            </div>
            <div className="p-4 rounded-xl bg-[#F4F6F9] border border-slate-200">
              <div className="text-[11px] font-mono text-slate-500">Samlad hemleveranstäckning</div>
              <div className="font-display text-lg sm:text-xl font-extrabold text-[#059669] mt-1 tabular-nums">
                {deliveryStats.combinedAnyHomeDeliveryPct ?? 100} % av hushåll
              </div>
              <div className="text-xs text-slate-600 mt-0.5">
                {deliveryStats.combinedEveningHomeDeliveryPct ?? 76}% nås även av kväll/express (17–22)
              </div>
            </div>
            <div className="p-4 rounded-xl bg-[#F4F6F9] border border-slate-200">
              <div className="text-[11px] font-mono text-slate-500">Snittvikt &amp; Dörrlämning</div>
              <div className="font-display text-lg sm:text-xl font-extrabold text-[#040B16] mt-1 tabular-nums">
                {deliveryStats.avgWeightKg.toFixed(1).replace('.', ',')} kg · {deliveryStats.leaveOutsideDoorSharePct}% utan kvittens
              </div>
              <div className="text-xs text-slate-600 mt-0.5">Standardmått {deliveryStats.mostCommonDimensionsCm}</div>
            </div>
          </div>

          {deliverySubTab === 'coverage' ? (
            <div className="space-y-8">
              {/* 1. Per-Carrier & Combined Home Delivery Coverage Table */}
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="font-display font-bold text-lg text-[#040B16]">
                      1. Hemleveranstäckning &amp; skåpnätverk per transportör (samt samlat)
                    </h3>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Kombinerar en e-handlare en rikstäckande aktör (PostNord, Early Bird eller Bring) med en nischad kvällsdistributör (Budbee, Airmee) nås 100% av landets hushåll.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onNavigate('partners', 'Transportör')}
                    className="text-xs font-bold text-[#006AA7] hover:underline cursor-pointer"
                  >
                    Jämför transportörsavtal &rarr;
                  </button>
                </div>

                <div className="hidden lg:block border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full table-fixed text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-mono">
                        <th className="py-3 px-3 font-semibold w-[25%]">Transportör</th>
                        <th className="py-3 px-3 font-semibold w-[14%]">Hemleverans</th>
                        <th className="py-3 px-3 font-semibold w-[14%]">Kväll / Morgon</th>
                        <th className="py-3 px-2 font-semibold text-right w-[11%]">Paketskåp</th>
                        <th className="py-3 px-2 font-semibold text-right w-[10%]">Ombud</th>
                        <th className="py-3 px-3 font-semibold w-[26%]">Leveranstid &amp; Glesbygd</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(deliveryStats.carrierCoverage || []).map((cc) => (
                        <tr key={cc.id} className="hover:bg-slate-50 align-top">
                          <td className="py-3.5 px-3 break-words">
                            <div className="font-display font-bold text-sm text-[#040B16]">
                              {cc.carrierName}
                            </div>
                            <div className="text-[11px] text-slate-500 mt-0.5 leading-snug">{cc.boxNetworkNote}</div>
                          </td>
                          <td className="py-3.5 px-3">
                            <div className="flex items-center justify-between font-mono font-bold text-[#059669] tabular-nums mb-1">
                              <span>{cc.homeDeliveryHouseholdPct} %</span>
                            </div>
                            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-[#059669] rounded-full"
                                style={{ width: `${cc.homeDeliveryHouseholdPct}%` }}
                              />
                            </div>
                          </td>
                          <td className="py-3.5 px-3">
                            <div className="flex items-center justify-between font-mono font-bold text-[#006AA7] tabular-nums mb-1">
                              <span>{cc.eveningOrExpressPct} %</span>
                            </div>
                            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-[#006AA7] rounded-full"
                                style={{ width: `${cc.eveningOrExpressPct}%` }}
                              />
                            </div>
                          </td>
                          <td className="py-3.5 px-2 text-right font-mono font-semibold text-[#040B16] tabular-nums">
                            {cc.parcelLockersCount.toLocaleString('sv-SE')} st
                          </td>
                          <td className="py-3.5 px-2 text-right font-mono text-slate-700 tabular-nums">
                            {cc.pickupAgentsCount > 0
                              ? `${cc.pickupAgentsCount.toLocaleString('sv-SE')} st`
                              : '–'}
                          </td>
                          <td className="py-3.5 px-3 break-words">
                            <div className="font-semibold text-[#040B16]">{cc.timeWindow}</div>
                            <div className="text-[11px] text-slate-500 mt-0.5 leading-snug">{cc.ruralCoverage}</div>
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-[#040B16] text-white font-semibold">
                        <td className="py-3.5 px-3">
                          Samlat svenskt nätverk (Multi-carrier)
                        </td>
                        <td className="py-3.5 px-3 font-mono font-extrabold text-[#FECC02] tabular-nums">
                          100 % av hushåll
                        </td>
                        <td className="py-3.5 px-3 font-mono font-bold text-[#10B981] tabular-nums">
                          76 % kväll · 97 % morg.
                        </td>
                        <td className="py-3.5 px-2 text-right font-mono tabular-nums">
                          10 850+ st
                        </td>
                        <td className="py-3.5 px-2 text-right font-mono tabular-nums">
                          7 200+ st
                        </td>
                        <td className="py-3.5 px-3 text-[11px] text-slate-300">
                          Optimal mix: 1 rikstäckande + 1 kvälls-/boxspecialist via TA-system
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 lg:hidden">
                  {(deliveryStats.carrierCoverage || []).map((cc) => (
                    <div key={cc.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2 text-xs">
                      <div className="font-display font-bold text-sm text-[#040B16]">{cc.carrierName}</div>
                      <div className="text-[11px] text-slate-500">{cc.boxNetworkNote}</div>
                      <div className="grid grid-cols-3 gap-2 font-mono bg-white border border-slate-200 rounded-lg p-2.5">
                        <div>
                          <span className="text-[10px] text-slate-500 block">Hemlev.</span>
                          <span className="font-bold text-[#059669] tabular-nums">{cc.homeDeliveryHouseholdPct} %</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 block">Paketskåp</span>
                          <span className="font-bold text-[#006AA7] tabular-nums">{cc.parcelLockersCount.toLocaleString('sv-SE')}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 block">Ombud</span>
                          <span className="font-bold text-[#040B16] tabular-nums">{cc.pickupAgentsCount > 0 ? cc.pickupAgentsCount.toLocaleString('sv-SE') : '–'}</span>
                        </div>
                      </div>
                      <div className="text-[11px] text-slate-700">{cc.timeWindow} · {cc.ruralCoverage}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 2. Locker Networks Breakdown + Regional Density Correlation */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-6 p-5 rounded-2xl border border-slate-200 space-y-4">
                  <div>
                    <div className="text-xs font-mono font-semibold text-[#006AA7]">
                      Paketskåpsdensitet i Sverige
                    </div>
                    <h3 className="font-display font-bold text-lg text-[#040B16]">
                      2. Största paketskåpsnätverken (Slutna vs Öppna)
                    </h3>
                  </div>

                  <div className="space-y-3">
                    {(deliveryStats.lockerNetworks || []).map((ln) => (
                      <div key={ln.id} className="p-3.5 rounded-xl bg-[#F4F6F9] border border-slate-200 space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-display font-bold text-sm text-[#040B16]">
                            {ln.operator}
                          </span>
                          <span className="font-mono font-extrabold text-xs text-[#006AA7] tabular-nums shrink-0">
                            {ln.stationsSweden.toLocaleString('sv-SE')} skåp · {ln.estimatedCompartments}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] font-mono text-slate-500">
                          <span>{ln.networkType}</span>
                          <span className="font-semibold text-[#059669] tabular-nums">
                            Når ~{ln.populationReachPct}% av befolkningen
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed">{ln.highlight}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="lg:col-span-6 p-5 rounded-2xl border border-slate-200 space-y-4">
                  <div>
                    <div className="text-xs font-mono font-semibold text-[#059669]">
                      Regional korrelation (SCB × Logistik)
                    </div>
                    <h3 className="font-display font-bold text-lg text-[#040B16]">
                      3. Befolkningstäthet vs Skåpdensitet &amp; Hemleverans
                    </h3>
                  </div>

                  <div className="hidden sm:block border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full table-fixed text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-mono">
                          <th className="py-2.5 px-3 font-semibold w-[36%]">Region</th>
                          <th className="py-2.5 px-2 font-semibold text-right w-[15%]">Inv/km²</th>
                          <th className="py-2.5 px-2 font-semibold text-right w-[17%]">Skåp/10k</th>
                          <th className="py-2.5 px-2 font-semibold text-right w-[16%]">/100 km²</th>
                          <th className="py-2.5 px-3 font-semibold text-right w-[16%]">Kväll</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {(['syd', 'vast', 'svealand', 'smaland', 'norrland'] as const).map((rKey) => {
                          const reg = regions[rKey];
                          if (!reg) return null;
                          return (
                            <tr
                              key={rKey}
                              onClick={() => setSelectedRegion(rKey)}
                              className="hover:bg-slate-50 cursor-pointer"
                            >
                              <td className="py-3 px-3 break-words">
                                <div className="font-bold text-[#040B16]">
                                  {reg.name.split(' (')[0]}
                                </div>
                                <div className="text-[11px] text-slate-500">
                                  {reg.populationLabel} · {reg.parcelLockersTotal?.toLocaleString('sv-SE')} skåp
                                </div>
                              </td>
                              <td className="py-3 px-2 text-right font-mono font-bold text-[#040B16] tabular-nums">
                                {(reg.populationDensityPerKm2 ?? 0).toFixed(1).replace('.', ',')}
                              </td>
                              <td className="py-3 px-2 text-right font-mono font-bold text-[#006AA7] tabular-nums">
                                {(reg.lockersPer10kResidents ?? 0).toFixed(1).replace('.', ',')}
                              </td>
                              <td className="py-3 px-2 text-right font-mono text-slate-700 tabular-nums">
                                {(reg.lockersPer100Km2 ?? 0).toFixed(1).replace('.', ',')}
                              </td>
                              <td className="py-3 px-3 text-right font-mono font-extrabold text-[#059669] tabular-nums">
                                {reg.homeDeliveryEveningPct ?? 0} %
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="space-y-2 sm:hidden">
                    {(['syd', 'vast', 'svealand', 'smaland', 'norrland'] as const).map((rKey) => {
                      const reg = regions[rKey];
                      if (!reg) return null;
                      return (
                        <button
                          key={rKey}
                          type="button"
                          onClick={() => setSelectedRegion(rKey)}
                          className="w-full text-left p-3 rounded-xl border border-slate-200 bg-slate-50 space-y-1 text-xs"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-[#040B16]">{reg.name.split(' (')[0]}</span>
                            <span className="font-mono font-bold text-[#059669]">{reg.homeDeliveryEveningPct ?? 0}% kväll</span>
                          </div>
                          <div className="font-mono text-[11px] text-slate-600">
                            {(reg.populationDensityPerKm2 ?? 0).toFixed(1).replace('.', ',')} inv/km² · {(reg.lockersPer10kResidents ?? 0).toFixed(1).replace('.', ',')} skåp/10k
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed pt-2 border-t border-slate-100">
                    I tätbefolkade regioner (Sydsverige, Göteborg/Borås och Mälardalen) driver hög befolkningsdensitet upp både antalet paketskåp per ytenhet och konkurrensen mellan kvällshemleverantörer (81–89% hushållstäckning). I Norrland kompenserar PostNords lantbrevbäring och Early Birds tidningsnät med 97–100% grundtäckning.
                  </p>
                </div>
              </div>
            </div>
          ) : deliverySubTab === 'timing' ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Time Windows */}
              <div className="lg:col-span-6 space-y-4">
                <h3 className="font-display font-bold text-base text-[#040B16]">
                  När vill svenska konsumenter få sina paket?
                </h3>
                <div className="space-y-3.5">
                  {deliveryStats.timeWindows.map((tw) => (
                    <div key={tw.id} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-[#040B16]">{tw.windowLabel}</span>
                        <span className="font-mono font-bold text-[#006AA7] tabular-nums">
                          {tw.sharePct} % · {tw.preferenceRank}
                        </span>
                      </div>
                      <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#006AA7] rounded-full"
                          style={{ width: `${Math.min(100, tw.sharePct)}%` }}
                        />
                      </div>
                      <div className="text-[11px] text-slate-500">{tw.bestFor}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Reception Channels */}
              <div className="lg:col-span-6 space-y-4">
                <h3 className="font-display font-bold text-base text-[#040B16]">
                  Hur vill man ta emot paketet? (äldre sammanfattningsunderlag)
                </h3>
                <div className="space-y-3">
                  {deliveryStats.receptionChannels.map((rc) => (
                    <div
                      key={rc.id}
                      className="p-4 rounded-xl border border-slate-200 space-y-1.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-display font-bold text-sm text-[#040B16]">
                          {rc.channel}
                        </span>
                        <span className="font-mono font-extrabold text-sm text-[#059669] tabular-nums shrink-0">
                          {rc.sharePct} %
                        </span>
                      </div>
                      <div className="text-[11px] font-mono text-slate-500 tabular-nums">
                        Snittledtid: {rc.avgLeadTimeDays}
                        {typeof rc.homeDropSharePct === 'number' &&
                          ` · ${rc.homeDropSharePct}% väljer "lämna utanför dörr"`}
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed">{rc.insight}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="hidden lg:block border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full table-fixed text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-mono">
                      <th className="py-3 px-3 font-semibold w-[28%]">Storleksklass</th>
                      <th className="py-3 px-3 font-semibold w-[18%]">Typiska mått</th>
                      <th className="py-3 px-3 font-semibold w-[14%]">Viktintervall</th>
                      <th className="py-3 px-2 font-semibold text-right w-[11%]">Andel ordrar</th>
                      <th className="py-3 px-3 font-semibold w-[29%]">Dominerande fraktsätt</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {deliveryStats.parcelSizeTiers.map((ps) => (
                      <tr key={ps.id} className="hover:bg-slate-50 align-top">
                        <td className="py-3.5 px-3 font-display font-bold text-sm text-[#040B16] break-words">
                          {ps.sizeClass}
                        </td>
                        <td className="py-3.5 px-3 font-mono text-slate-700 tabular-nums">
                          {ps.typicalDimensionsCm}
                        </td>
                        <td className="py-3.5 px-3 font-mono text-[#006AA7] font-semibold tabular-nums">
                          {ps.weightRangeKg}
                        </td>
                        <td className="py-3.5 px-2 text-right font-mono font-extrabold text-[#059669] tabular-nums">
                          {ps.shareOfOrdersPct} %
                        </td>
                        <td className="py-3.5 px-3 text-slate-700 break-words">{ps.dominantCarrierOption}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 lg:hidden">
                {deliveryStats.parcelSizeTiers.map((ps) => (
                  <div key={ps.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-display font-bold text-sm text-[#040B16]">{ps.sizeClass}</span>
                      <span className="font-mono font-extrabold text-[#059669]">{ps.shareOfOrdersPct} %</span>
                    </div>
                    <div className="font-mono text-[11px] text-slate-700">
                      {ps.typicalDimensionsCm} · {ps.weightRangeKg}
                    </div>
                    <div className="text-[11px] text-slate-600">{ps.dominantCarrierOption}</div>
                  </div>
                ))}
              </div>
              <div className="text-xs text-slate-500 pt-2 border-t border-slate-100 flex flex-wrap justify-between gap-2">
                <span>
                  Obs: EU:s PPWR-regelverk begränsar tillåtet tomrum i e-handelspaket till max 40–50% – mindre skräddarsydda kartonger sänker både fraktpris och volymtaxering.
                </span>
                <button
                  type="button"
                  onClick={() => onNavigate('partners', 'Transportör')}
                  className="font-bold text-[#006AA7] hover:underline cursor-pointer"
                >
                  Jämför transportörer &amp; TA-system &rarr;
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Swedish & EU E-commerce Legislation & Compliance */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-slate-100">
            <div>
              <div className="text-xs font-mono font-semibold text-[#059669] inline-flex items-center gap-1.5">
                <Scale className="w-3.5 h-3.5" />
                Lagstiftning & Compliance · Sverige & EU 2026–2027
              </div>
              <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-[#040B16] mt-1">
                Lagar och regler som varje svensk e-handlare måste följa
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-3xl">
                Uppdaterad checklista för Konsumentverkets, IMY:s och EU:s skärpta krav på prissättning, kassaordning, tillgänglighet (WCAG), produktsäkerhet och hållbarhet.
              </p>
            </div>

            <div className="flex flex-wrap gap-1.5 self-start">
              {['Alla', 'Pris & Kassa', 'Konsumenträtt', 'Data & Tillgänglighet', 'Hållbarhet & Tull'].map(
                (cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setLawCategory(cat)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                      lawCategory === cat
                        ? 'bg-[#040B16] text-white'
                        : 'bg-slate-100 text-slate-600 hover:text-[#040B16]'
                    }`}
                  >
                    {cat}
                  </button>
                )
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {laws
              .filter((law) => lawCategory === 'Alla' || law.category === lawCategory)
              .map((law) => (
                <article
                  key={law.id}
                  className="p-5 rounded-xl border border-slate-200 flex flex-col justify-between space-y-3 hover:border-slate-300 transition-colors"
                >
                  <div className="space-y-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
                      <span className="font-semibold text-[#006AA7]">
                        {law.category} · {law.authority}
                      </span>
                      <span className="text-slate-500">{law.effectiveDate}</span>
                    </div>
                    <h3 className="font-display font-bold text-lg text-[#040B16]">
                      {law.title}
                    </h3>
                    <p className="text-xs text-slate-600 leading-relaxed">{law.summary}</p>
                    <ul className="space-y-1.5 pt-1">
                      {law.requirements.map((req, idx) => (
                        <li
                          key={idx}
                          className="text-xs text-slate-700 flex items-start gap-2"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#059669] shrink-0 mt-0.5" />
                          <span>{req}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="pt-2.5 border-t border-slate-100 text-[11px] text-amber-800 flex items-start gap-1.5">
                    <ShieldAlert className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                    <span>
                      <strong>Sanktion / Risk:</strong> {law.penaltyInfo}
                    </span>
                  </div>
                </article>
              ))}
          </div>
        </div>

        <PageFormSlot
          forms={contactForms}
          page="marknad"
          position="mid"
          adBanners={adBanners}
          onSubmitted={onFormSubmitted}
          onNotify={onNotify}
        />

        {/* Market & Tech Intelligence (ECDB, Statista, BuiltWith, Wappalyzer, Tembi, HUI Research, Paketindex) */}
        {intelligenceSources.length > 0 && (() => {
          const activeSource =
            intelligenceSources.find((s) => s.id === selectedSourceId) ||
            intelligenceSources[0];
          const layerShares = techStackShares.filter(
            (t) => t.layer === techLayerFilter
          );

          return (
            <section
              id="branschdata"
              className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-6"
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-slate-100">
                <div>
                  <div className="text-xs font-mono font-semibold text-[#006AA7] inline-flex items-center gap-1.5">
                    <Database className="w-3.5 h-3.5" />
                    Datakällor & Tech Intelligence · 7 verifierade index
                  </div>
                  <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-[#040B16] mt-1">
                    ECDB, Statista, BuiltWith, Wappalyzer, Tembi, HUI Research & Paketindex
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-3xl">
                    Sammanställda nyckeltal för den svenska e-handelsmarknaden från ledande globala och nordiska analysinstitut samt automatisk teknikdetektering.
                  </p>
                </div>
              </div>

              {/* 7 Source Selector Buttons */}
              <div className="flex flex-wrap gap-2">
                {intelligenceSources.map((src) => {
                  const active = src.id === activeSource.id;
                  return (
                    <button
                      key={src.id}
                      type="button"
                      onClick={() => setSelectedSourceId(src.id)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer whitespace-nowrap ${
                        active
                          ? 'bg-[#040B16] text-white border-[#040B16]'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-400'
                      }`}
                    >
                      {src.shortLabel}
                    </button>
                  );
                })}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Active Intelligence Source Detail */}
                <div className="lg:col-span-7 p-6 rounded-2xl bg-[#F4F6F9] border border-slate-200 space-y-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="text-xs font-mono font-semibold text-[#059669]">
                        {activeSource.focusArea} · {activeSource.updatedPeriod}
                      </div>
                      <h3 className="font-display text-2xl font-extrabold text-[#040B16] mt-1">
                        {activeSource.name}
                      </h3>
                    </div>
                    <div className="text-left sm:text-right">
                      <div className="text-[11px] font-mono text-slate-500">
                        {activeSource.headlineMetric}
                      </div>
                      <div className="font-display text-2xl font-extrabold text-[#006AA7] tabular-nums">
                        {activeSource.headlineValue}
                      </div>
                    </div>
                  </div>

                  <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                    {activeSource.summary}
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {activeSource.keyFindings.map((kf, idx) => (
                      <div
                        key={idx}
                        className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-1"
                      >
                        <div className="text-[11px] font-mono text-slate-500">{kf.label}</div>
                        <div className="font-display text-base font-extrabold text-[#040B16] tabular-nums">
                          {kf.value}
                        </div>
                        {kf.note && (
                          <div className="text-[11px] text-slate-500 leading-snug">
                            {kf.note}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="pt-2 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
                    <span className="text-slate-500">
                      Källa:{' '}
                      <a
                        href={activeSource.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono font-semibold text-[#006AA7] hover:underline inline-flex items-center gap-1"
                      >
                        {activeSource.url.replace(/^https?:\/\//, '')}
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </a>
                    </span>
                    <button
                      type="button"
                      onClick={() => onNavigate('partners')}
                      className="font-bold text-[#040B16] hover:text-[#006AA7] cursor-pointer"
                    >
                      Jämför leverantörer i Tech & Partners &rarr;
                    </button>
                  </div>
                </div>

                {/* BuiltWith & Wappalyzer Swedish Tech Stack Adoption */}
                <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="text-xs font-mono font-semibold text-[#006AA7]">
                        BuiltWith & Wappalyzer
                      </div>
                      <h3 className="font-display text-lg font-extrabold text-[#040B16]">
                        Teknikandelar på .se-sajter
                      </h3>
                    </div>
                  </div>

                  <div className="inline-flex bg-slate-100 p-1 rounded-lg text-[11px] font-semibold flex-wrap gap-1">
                    {(
                      ['E-handelsplattform', 'Betalning (PSP)', 'MarTech & CRM'] as const
                    ).map((layer) => (
                      <button
                        key={layer}
                        type="button"
                        onClick={() => setTechLayerFilter(layer)}
                        className={`px-2.5 py-1.5 rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                          techLayerFilter === layer
                            ? 'bg-[#040B16] text-white'
                            : 'text-slate-600 hover:text-[#040B16]'
                        }`}
                      >
                        {layer}
                      </button>
                    ))}
                  </div>

                  <div className="space-y-3 pt-1">
                    {layerShares.map((item) => (
                      <div key={item.id} className="space-y-1">
                        <div className="flex items-center justify-between text-xs gap-2">
                          <span className="font-bold text-[#040B16]">{item.name}</span>
                          <span className="font-mono font-bold text-[#006AA7] tabular-nums shrink-0">
                            {item.sharePct} % · {item.detectedSites}
                          </span>
                        </div>
                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#040B16] rounded-full"
                            style={{ width: `${Math.min(100, item.sharePct * 1.4)}%` }}
                          />
                        </div>
                        <div className="text-[11px] font-mono text-slate-400">
                          Detekterat via {item.source}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          );
        })()}

        {/* Äldre Paketindexsammanfattning (separat från versionsarkivet) */}
        <PaketindexArchive rows={paketindexArchive} />

        {paketindex && (
          <section className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-slate-100">
              <div>
                <div className="text-xs font-mono font-semibold text-[#006AA7] inline-flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5" />
                  Äldre Paketindexsammanfattning · {paketindex.quarterLabel} ({paketindex.publisher})
                </div>
                <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-[#040B16] mt-1">
                  Officiell svensk paketstatistik: {paketindex.totalParcelsMillions.toFixed(1).replace('.', ',')} miljoner B2C-paket ({paketindex.quarterLabel})
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-3xl leading-relaxed">
                  {paketindex.summaryText}
                </p>
              </div>
              <div className="p-4 rounded-xl bg-[#040B16] text-white shrink-0 space-y-0.5">
                <div className="text-[11px] font-mono text-[#FECC02]">Kvartalstillväxt YoY</div>
                <div className="font-display text-2xl font-extrabold tabular-nums">
                  {paketindex.yoyGrowthPct.toLocaleString('sv-SE', { maximumFractionDigits: 1, minimumFractionDigits: 1, signDisplay: 'exceptZero' })} %
                </div>
                <div className="text-xs text-slate-300 tabular-nums">
                  {paketindex.yoyGrowthMillions.toLocaleString('sv-SE', { maximumFractionDigits: 1, minimumFractionDigits: 1, signDisplay: 'exceptZero' })} milj paket mot motsvarande period föregående år
                </div>
              </div>
            </div>

            {/* Headline KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-5 rounded-xl bg-[#F4F6F9] border border-slate-200 space-y-1.5">
                <div className="text-xs font-mono text-slate-500">E-handelspaket totalt ({paketindex.quarterLabel})</div>
                <div className="font-display text-2xl font-extrabold text-[#040B16] tabular-nums">
                  {paketindex.totalParcelsMillions.toFixed(1).replace('.', ',')} miljoner
                </div>
                <div className="text-xs text-[#059669] font-semibold">
                  Inrikes + Utlandspaket (Returer &amp; Export redovisas separat)
                </div>
              </div>

              <div className="p-5 rounded-xl bg-[#F4F6F9] border border-slate-200 space-y-1.5">
                <div className="text-xs font-mono text-slate-500">Andel paket från utlandet</div>
                <div className="font-display text-2xl font-extrabold text-[#006AA7] tabular-nums">
                  {paketindex.foreignImportSharePct.toFixed(1).replace('.', ',')} %
                </div>
                <div className="text-xs text-slate-600 leading-snug">
                  {paketindex.foreignImportComparison}
                </div>
              </div>

              <div className="p-5 rounded-xl bg-[#F4F6F9] border border-slate-200 space-y-1.5">
                <div className="text-xs font-mono text-slate-500">Second hand via marknadsplatser</div>
                <div className="font-display text-2xl font-extrabold text-[#059669] tabular-nums">
                  {paketindex.secondHandParcelsLabel} (~{paketindex.secondHandSharePct.toFixed(0)} %)
                </div>
                <div className="text-xs text-slate-600 leading-snug">
                  {paketindex.secondHandComparison}
                </div>
              </div>
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-6 p-5 rounded-2xl border border-slate-200 space-y-4">
                <div>
                  <h3 className="font-display font-bold text-base text-[#040B16]">
                    Leveransval enligt den äldre sammanfattningen
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Fördelningen hör till sammanfattningens underlag, inte till vald arkivperiod.
                  </p>
                </div>
                <div className="h-[220px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={paketindex.deliveryChannels}
                      layout="vertical"
                      margin={{ top: 4, right: 24, left: 8, bottom: 4 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" horizontal={false} />
                      <XAxis type="number" domain={[0, 55]} unit="%" tick={{ fontSize: 11, fill: '#64748B' }} />
                      <YAxis
                        type="category"
                        dataKey="label"
                        width={145}
                        tick={{ fontSize: 11, fill: '#0F172A', fontWeight: 600 }}
                      />
                      <Tooltip
                        formatter={(val: unknown) => [`${String(val)} %`, 'Andel']}
                        contentStyle={{
                          backgroundColor: '#040B16',
                          borderRadius: '12px',
                          border: 'none',
                          color: '#fff',
                          fontSize: '12px',
                        }}
                      />
                      <Bar dataKey="sharePct" fill="#006AA7" radius={[0, 6, 6, 0]} barSize={24} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-1.5 text-xs text-slate-600">
                  {paketindex.deliveryChannels.map((ch) => (
                    <div key={ch.id} className="flex justify-between gap-2 border-t border-slate-100 pt-1.5">
                      <span className="font-semibold text-[#040B16]">{ch.label}</span>
                      <span className="text-right text-slate-500">{ch.note}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="lg:col-span-6 p-5 rounded-2xl border border-slate-200 space-y-4">
                <div>
                  <h3 className="font-display font-bold text-base text-[#040B16]">
                    Historiska jämförelsepunkter i äldre sammanfattning
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Separat äldre sammanfattning. Välj rapportversion i arkivet ovan för versionsseparerad historik.
                  </p>
                </div>
                <div className="h-[220px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={paketindex.historicalComparisons}
                      margin={{ top: 8, right: 16, left: 0, bottom: 4 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                      <XAxis dataKey="period" tick={{ fontSize: 11, fill: '#0F172A', fontWeight: 600 }} />
                      <YAxis domain={[0, 40]} unit="%" tick={{ fontSize: 11, fill: '#64748B' }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#040B16',
                          borderRadius: '12px',
                          border: 'none',
                          color: '#fff',
                          fontSize: '12px',
                        }}
                      />
                      <Bar dataKey="importSharePct" name="Utlandspaket (%)" fill="#040B16" radius={[6, 6, 0, 0]} barSize={28} />
                      <Bar dataKey="secondHandSharePct" name="Second hand (%)" fill="#059669" radius={[6, 6, 0, 0]} barSize={28} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-2 pt-1">
                  <div className="text-[11px] font-mono font-bold text-slate-500">
                    Ingående transportörer &amp; metodiknoteringar:
                  </div>
                  {paketindex.carrierScopeNotes.map((cn) => (
                    <div key={cn.id} className="text-xs text-slate-600 bg-[#F4F6F9] rounded-lg px-3 py-2 border border-slate-200">
                      <span className="font-bold text-[#040B16]">{cn.carrier}</span>{' '}
                      <span className="font-mono text-[11px] text-[#006AA7]">({cn.status})</span>: {cn.note}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="text-xs text-slate-500 pt-2 border-t border-slate-100">
              {paketindex.updatedNote}
            </div>
          </section>
        )}

        {/* Checkoutstrategi.se Dedicated CTA + Open Ad Holder */}
        <CheckoutStrategyCTA />

        <AdBannerSlot
          banners={adBanners}
          placement="marknad-mid"
          onNavigate={onNavigate}
          onBookSlot={onBookAdSlot}
        />

        <InsightPosts posts={insightPosts} onNavigate={onNavigate} />

        {/* Quick Navigation Strip to Jobb & Historia */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="text-xs font-mono font-semibold text-[#059669]">Karriär & rekrytering</div>
              <h3 className="font-display font-bold text-lg text-[#040B16]">
                Jobb inom Sveriges e-handel & rekryteringssidor per roll
              </h3>
              <p className="text-xs text-slate-600">
                Roller inom E-commerce Management, Tech, Growth, Logistik och Merchandising samt specialiserade byråer.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('jobb')}
              className="px-4 py-2.5 rounded-xl bg-[#040B16] hover:bg-[#006AA7] text-white text-xs font-bold whitespace-nowrap shrink-0 cursor-pointer transition-colors"
            >
              Öppna Jobb & Karriär &rarr;
            </button>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="text-xs font-mono font-semibold text-[#006AA7]">Branschhistorik 1995–2027</div>
              <h3 className="font-display font-bold text-lg text-[#040B16]">
                Från Pixlar till Agentisk AI – svensk e-handelshistoria
              </h3>
              <p className="text-xs text-slate-600">
                Tidslinje från Bokus och CDON på 90-talet till Swish, BankID, Omnichannel och AI-assistenter.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('historia')}
              className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-[#040B16] text-xs font-bold whitespace-nowrap shrink-0 cursor-pointer transition-colors"
            >
              Se tidslinjen &rarr;
            </button>
          </div>
        </div>

        <PageFormSlot
          forms={contactForms}
          page="marknad"
          position="bottom"
          adBanners={adBanners}
          onSubmitted={onFormSubmitted}
          onNotify={onNotify}
        />
      </div>
    </div>
  );
}
