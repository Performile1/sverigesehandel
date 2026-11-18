import { useState } from 'react';
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
} from 'lucide-react';
import type {
  AdBanner,
  CategoryOrderBenchmark,
  DeliveryStatsData,
  EcommerceLaw,
  MarketIntelligenceSource,
  PortalTab,
  RegionMetric,
  ShippingCostTier,
  TechStackShare,
} from '../types';
import { AdBannerSlot } from './AdBannerSlot';
import { CheckoutStrategyCTA } from './CheckoutStrategyCTA';
import { ResilientImage } from './ResilientImage';

interface MarknadViewProps {
  regions: Record<string, RegionMetric>;
  orderBenchmarks: CategoryOrderBenchmark[];
  shippingTiers: ShippingCostTier[];
  deliveryStats: DeliveryStatsData;
  laws: EcommerceLaw[];
  intelligenceSources: MarketIntelligenceSource[];
  techStackShares: TechStackShare[];
  adBanners: AdBanner[];
  merchantCount: number;
  partnerCount: number;
  onNavigate: (tab: PortalTab, searchQuery?: string) => void;
  onBookAdSlot: (slotName: string) => void;
}

export function MarknadView({
  regions,
  orderBenchmarks,
  shippingTiers,
  deliveryStats,
  laws,
  intelligenceSources,
  techStackShares,
  adBanners,
  merchantCount,
  partnerCount,
  onNavigate,
  onBookAdSlot,
}: MarknadViewProps) {
  const [selectedRegion, setSelectedRegion] = useState<string>('vast');
  const [tradeMode, setTradeMode] = useState<'export' | 'import'>('export');
  const [demoTab, setDemoTab] = useState<'generations' | 'payments' | 'delivery'>('generations');
  const [econTab, setEconTab] = useState<'tiers' | 'categories' | 'calculator'>('tiers');
  const [deliverySubTab, setDeliverySubTab] = useState<'timing' | 'parcel'>('timing');
  const [lawCategory, setLawCategory] = useState<string>('Alla');
  const [selectedSourceId, setSelectedSourceId] = useState<string>('ecdb');
  const [techLayerFilter, setTechLayerFilter] = useState<
    'E-handelsplattform' | 'Betalning (PSP)' | 'MarTech & CRM'
  >('E-handelsplattform');
  const [calcCategoryId, setCalcCategoryId] = useState<string>('ob-mode');
  const [calcOrderValue, setCalcOrderValue] = useState<number>(850);
  const [calcFreeThreshold, setCalcFreeThreshold] = useState<number>(599);
  const [calcBaseShippingFee, setCalcBaseShippingFee] = useState<number>(49);
  const [heroQuery, setHeroQuery] = useState('');

  const activeRegion = regions[selectedRegion] || Object.values(regions)[0];
  const calcCategory =
    orderBenchmarks.find((b) => b.id === calcCategoryId) || orderBenchmarks[0];

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
                Svensk e-handelsdata · Index Q4 2026 · {merchantCount} e-handlare & {partnerCount} tech-partners i CMS
              </div>
              <h1 className="font-display text-4xl sm:text-5xl font-extrabold tracking-tight leading-[1.08] max-w-2xl text-balance">
                Hela Sveriges <span className="text-[#FECC02]">e-handelsdata</span> och ekosystem på ett ställe.
              </h1>
              <p className="text-slate-300 text-base sm:text-lg max-w-2xl leading-relaxed">
                Datadriven plattform för svenska e-handlare, tech-partners och rekrytering. Utforska regional marknadsdata, gränshandel, branschmässor 2027 och lediga jobb inom svensk e-handel.
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
              <div className="text-xs font-mono text-slate-400">Total omsättning</div>
              <div className="font-display text-2xl font-extrabold text-white mt-1 tabular-nums">
                168,4 mdr SEK
              </div>
              <div className="text-xs text-[#10B981] font-medium mt-1">+8,4% jämfört med föregående år</div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
              <div className="text-xs font-mono text-slate-400">Exportvolym</div>
              <div className="font-display text-2xl font-extrabold text-[#FECC02] mt-1 tabular-nums">
                44,2 mdr SEK
              </div>
              <div className="text-xs text-slate-300 mt-1">Norden, DACH & Nordamerika</div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
              <div className="text-xs font-mono text-slate-400">Import (Cross-border)</div>
              <div className="font-display text-2xl font-extrabold text-white mt-1 tabular-nums">
                35,8 mdr SEK
              </div>
              <div className="text-xs text-slate-300 mt-1">Asien 39% · EU 52%</div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
              <div className="text-xs font-mono text-slate-400">Snittorder (AOV)</div>
              <div className="font-display text-2xl font-extrabold text-white mt-1 tabular-nums">
                945 SEK
              </div>
              <div className="text-xs text-slate-300 mt-1">71% genomförs via smartphone</div>
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

        {/* Interactive Sweden Map + Cross-Border */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-6 sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-6">
              <div>
                <div className="text-xs font-mono text-[#006AA7] font-semibold">Geografisk analys</div>
                <h2 className="font-display text-2xl font-extrabold text-[#040B16] mt-0.5">
                  Sveriges e-handelsregioner & logistiknav
                </h2>
              </div>
              <div className="text-xs text-slate-500">Klicka på en region i kartan</div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 items-center">
              <div className="sm:col-span-5 bg-[#040B16] rounded-xl p-4 flex justify-center items-center">
                <svg viewBox="0 0 220 440" className="w-44 h-auto" aria-label="Interaktiv karta över Sverige">
                  <path
                    onClick={() => setSelectedRegion('norrland')}
                    className="cursor-pointer transition-colors"
                    fill={selectedRegion === 'norrland' ? '#FECC02' : '#064E3B'}
                    stroke="#1E293B"
                    strokeWidth="1.5"
                    d="M115,15 L155,25 L175,65 L165,115 L145,155 L125,195 L72,190 L68,145 L85,95 L98,45 Z"
                  />
                  <path
                    onClick={() => setSelectedRegion('svealand')}
                    className="cursor-pointer transition-colors"
                    fill={selectedRegion === 'svealand' ? '#FECC02' : '#006AA7'}
                    stroke="#1E293B"
                    strokeWidth="1.5"
                    d="M72,190 L125,195 L138,235 L132,272 L68,268 L58,230 Z"
                  />
                  <path
                    onClick={() => setSelectedRegion('vast')}
                    className="cursor-pointer transition-colors"
                    fill={selectedRegion === 'vast' ? '#FECC02' : '#0284C7'}
                    stroke="#1E293B"
                    strokeWidth="1.5"
                    d="M52,268 L88,268 L86,335 L48,332 L44,295 Z"
                  />
                  <path
                    onClick={() => setSelectedRegion('smaland')}
                    className="cursor-pointer transition-colors"
                    fill={selectedRegion === 'smaland' ? '#FECC02' : '#059669'}
                    stroke="#1E293B"
                    strokeWidth="1.5"
                    d="M88,268 L132,272 L124,342 L86,335 Z"
                  />
                  <path
                    onClick={() => setSelectedRegion('syd')}
                    className="cursor-pointer transition-colors"
                    fill={selectedRegion === 'syd' ? '#FECC02' : '#0369A1'}
                    stroke="#1E293B"
                    strokeWidth="1.5"
                    d="M56,335 L112,342 L106,385 L58,382 Z"
                  />
                  <path
                    onClick={() => setSelectedRegion('smaland')}
                    className="cursor-pointer transition-colors"
                    fill={selectedRegion === 'smaland' ? '#FECC02' : '#059669'}
                    stroke="#1E293B"
                    strokeWidth="1.2"
                    d="M148,305 L158,302 L155,332 L145,330 Z"
                  />

                  <circle cx="122" cy="242" r="4.5" fill="#FFFFFF" stroke="#040B16" strokeWidth="1.5" />
                  <text x="130" y="245" fontSize="9" fontWeight="bold" fill="#FFFFFF">Stockholm</text>
                  <circle cx="58" cy="312" r="4.5" fill="#040B16" stroke="#FFFFFF" strokeWidth="1.5" />
                  <text x="8" y="315" fontSize="9" fontWeight="bold" fill="#FFFFFF">Gbg / Borås</text>
                  <circle cx="98" cy="304" r="4" fill="#FECC02" stroke="#040B16" strokeWidth="1.2" />
                  <text x="90" y="296" fontSize="8" fontWeight="bold" fill="#FFFFFF">Jönköping</text>
                  <circle cx="68" cy="370" r="4.5" fill="#FECC02" stroke="#040B16" strokeWidth="1.5" />
                  <text x="76" y="373" fontSize="9" fontWeight="bold" fill="#FFFFFF">Malmö</text>
                  <circle cx="145" cy="110" r="4" fill="#FECC02" stroke="#040B16" strokeWidth="1.2" />
                  <text x="96" y="106" fontSize="8" fontWeight="bold" fill="#FFFFFF">Umeå / Luleå</text>
                </svg>
              </div>

              {activeRegion && (
                <div className="sm:col-span-7 space-y-4">
                  <div className="text-xs font-mono text-[#059669] font-semibold">
                    {activeRegion.tag}
                  </div>
                  <h3 className="font-display text-2xl font-extrabold text-[#040B16]">
                    {activeRegion.name}
                  </h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{activeRegion.desc}</p>
                  <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-100">
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
                  <div className="text-xs text-slate-600 pt-2 border-t border-slate-100">
                    <strong className="text-[#040B16]">Nyckelhubbar:</strong> {activeRegion.hubs}
                  </div>
                </div>
              )}
            </div>
          </div>

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
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="p-5 rounded-xl border border-slate-200">
                  <div className="flex justify-between items-center font-bold text-sm">
                    <span>Paketskåp (Instabox, PostNord, Budbee)</span>
                    <span className="font-mono text-[#059669] tabular-nums">46 %</span>
                  </div>
                  <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                    Svenskarnas favorit tack vare dygnet-runt-tillgänglighet utan kötid.
                  </p>
                </div>
                <div className="p-5 rounded-xl border border-slate-200">
                  <div className="flex justify-between items-center font-bold text-sm">
                    <span>Postombud i butik</span>
                    <span className="font-mono text-[#040B16] tabular-nums">31 %</span>
                  </div>
                  <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                    Fortsatt starkt för större paket och på orter utanför storstadskärnorna.
                  </p>
                </div>
                <div className="p-5 rounded-xl border border-slate-200">
                  <div className="flex justify-between items-center font-bold text-sm">
                    <span>Hemleverans (Kväll / Same-day)</span>
                    <span className="font-mono text-[#006AA7] tabular-nums">23 %</span>
                  </div>
                  <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                    Standard för dagligvaror, möbler, apotek och skrymmande hemelektronik.
                  </p>
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

            <div className="inline-flex bg-slate-100 p-1 rounded-lg text-xs font-semibold self-start shrink-0">
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

          {/* Sub-view 1: Shipping Cost by Order Value Bracket */}
          {econTab === 'tiers' && (
            <div className="space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 font-mono">
                      <th className="py-3 pr-4 font-semibold">Ordervärde (Orderkostnad)</th>
                      <th className="py-3 px-4 font-semibold text-right">Kundbetald frakt</th>
                      <th className="py-3 px-4 font-semibold text-right">Handlarens kostnad</th>
                      <th className="py-3 px-4 font-semibold text-right">Subvention / order</th>
                      <th className="py-3 px-4 font-semibold text-right">Andel fri frakt</th>
                      <th className="py-3 px-4 font-semibold text-right">Frakt / Ordervärde</th>
                      <th className="py-3 pl-4 font-semibold">Vanligaste leveranssätt</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {shippingTiers.map((tier) => {
                      const subsidy = Math.max(0, tier.merchantShippingCostSek - tier.customerShippingFeeSek);
                      return (
                        <tr key={tier.id} className="hover:bg-slate-50">
                          <td className="py-3.5 pr-4">
                            <div className="font-display font-bold text-sm text-[#040B16] tabular-nums">
                              {tier.orderValueRange}
                            </div>
                            <div className="text-[11px] text-slate-500 mt-0.5 max-w-sm">
                              {tier.insight}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono font-bold text-[#006AA7] tabular-nums whitespace-nowrap">
                            {tier.customerShippingFeeSek} SEK
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono font-bold text-[#040B16] tabular-nums whitespace-nowrap">
                            {tier.merchantShippingCostSek} SEK
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono font-semibold text-amber-700 tabular-nums whitespace-nowrap">
                            -{subsidy} SEK
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono font-bold text-[#059669] tabular-nums whitespace-nowrap">
                            {tier.freeShippingSharePct} %
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono text-slate-700 tabular-nums whitespace-nowrap">
                            {tier.shippingToAovPct.toFixed(1)} %
                          </td>
                          <td className="py-3.5 pl-4 text-slate-700 font-medium whitespace-nowrap">
                            {tier.dominantMethod}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="text-xs text-slate-500 pt-2 border-t border-slate-100 flex flex-wrap justify-between gap-2">
                <span>
                  Handlarens kostnad inkluderar transportavgift till ombud/paketskåp/dörr samt genomsnittlig emballage- och plockkostnad.
                </span>
                <span className="font-mono text-[#040B16] font-semibold tabular-nums">
                  Svenskt rikssnitt: AOV 945 SEK · 2,4 artiklar/order
                </span>
              </div>
            </div>
          )}

          {/* Sub-view 2: Benchmarks by Category */}
          {econTab === 'categories' && (
            <div className="space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 font-mono">
                      <th className="py-3 pr-4 font-semibold">Bransch</th>
                      <th className="py-3 px-3 font-semibold text-right">Snittorder (AOV)</th>
                      <th className="py-3 px-3 font-semibold text-right">Artiklar / order</th>
                      <th className="py-3 px-3 font-semibold text-right">Kundfrakt</th>
                      <th className="py-3 px-3 font-semibold text-right">Handlarfrakt</th>
                      <th className="py-3 px-3 font-semibold text-right">Fri frakt-gräns</th>
                      <th className="py-3 px-3 font-semibold text-right">Returgrad</th>
                      <th className="py-3 pl-3 font-semibold text-right">Konvertering</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {orderBenchmarks.map((b) => (
                      <tr key={b.id} className="hover:bg-slate-50 h-11">
                        <td className="py-2.5 pr-4 font-display font-bold text-sm text-[#040B16] whitespace-nowrap">
                          {b.category}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-[#006AA7] tabular-nums whitespace-nowrap">
                          {b.avgOrderValueSek.toLocaleString('sv-SE')} SEK
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-[#040B16] tabular-nums whitespace-nowrap">
                          {b.itemsPerOrder.toFixed(1)} st
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-700 tabular-nums whitespace-nowrap">
                          {b.avgCustomerShippingFeeSek} SEK
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-700 tabular-nums whitespace-nowrap">
                          {b.merchantShippingCostSek} SEK
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-semibold text-[#059669] tabular-nums whitespace-nowrap">
                          {b.freeShippingThresholdSek} SEK
                        </td>
                        <td
                          className={`py-2.5 px-3 text-right font-mono font-semibold tabular-nums whitespace-nowrap ${
                            b.returnRatePct >= 15
                              ? 'text-amber-700'
                              : 'text-slate-700'
                          }`}
                        >
                          {b.returnRatePct.toFixed(1)} %
                        </td>
                        <td className="py-2.5 pl-3 text-right font-mono text-slate-700 tabular-nums whitespace-nowrap">
                          {b.conversionRatePct.toFixed(1)} %
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="text-xs text-slate-500 pt-2 border-t border-slate-100">
                Data avser svenska B2C-ehandlare (2026–2027). Alla siffror kan justeras i CMS Studio under Regioner & Data.
              </div>
            </div>
          )}

          {/* Sub-view 3: Interactive Order & Shipping Margin Calculator */}
          {econTab === 'calculator' && calcCategory && (() => {
            const customerPaysShipping =
              calcOrderValue >= calcFreeThreshold ? 0 : calcBaseShippingFee;
            const grossMarginSek = Math.round(
              calcOrderValue * (calcCategory.grossMarginPct / 100)
            );
            const shippingNetCost =
              calcCategory.merchantShippingCostSek - customerPaysShipping;
            const expectedReturnHandlingCost = Math.round(
              (calcCategory.returnRatePct / 100) *
                (calcCategory.merchantShippingCostSek + 38)
            );
            const contributionAfterLogistics =
              grossMarginSek - shippingNetCost - expectedReturnHandlingCost;
            const contributionPct = Math.round(
              (contributionAfterLogistics / Math.max(1, calcOrderValue)) * 1000
            ) / 10;

            return (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                <div className="lg:col-span-6 space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Välj bransch (styr marginal, fraktkostnad & returgrad)
                    </label>
                    <select
                      value={calcCategory.id}
                      onChange={(e) => {
                        const next = orderBenchmarks.find((b) => b.id === e.target.value);
                        setCalcCategoryId(e.target.value);
                        if (next) {
                          setCalcOrderValue(next.avgOrderValueSek);
                          setCalcFreeThreshold(next.freeShippingThresholdSek);
                        }
                      }}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold bg-white"
                    >
                      {orderBenchmarks.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.category} (Snitt AOV {b.avgOrderValueSek} SEK · {b.itemsPerOrder} st/order)
                        </option>
                      ))}
                    </select>
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
                    Handlarfrakt <span className="font-mono tabular-nums">{calcCategory.merchantShippingCostSek} SEK</span>
                  </div>
                </div>

                <div className="lg:col-span-6 bg-[#040B16] text-white rounded-2xl p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-semibold text-[#FECC02]">
                      Simulerad orderekonomi
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
                      <div className="text-xs text-slate-400">Nettobidrag efter frakt & retur</div>
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
                      <span className="text-slate-300">Handlarens fraktsubvention</span>
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
                </div>
              </div>
            );
          })()}
        </div>

        {/* Delivery Timing, Reception Preferences & Parcel Size/Weight */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-slate-100">
            <div>
              <div className="text-xs font-mono font-semibold text-[#006AA7]">
                Leveranspreferenser & Paketprofil · {deliveryStats.updatedNote}
              </div>
              <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-[#040B16] mt-1">
                När vill kunden ha paketet, hur vill man ta emot det & snittvikt?
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-3xl">
                Data över svenskarnas önskade leveranstider, val mellan paketskåp, ombud och dörrleverans samt paketens faktiska snittstorlek och vikt per order.
              </p>
            </div>

            <div className="inline-flex bg-slate-100 p-1 rounded-lg text-xs font-semibold self-start shrink-0">
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
                Tidpunkt & Mottagning
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
                Storlek & Paketvikt
              </button>
            </div>
          </div>

          {/* 4 Headline KPI Strip */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-[#F4F6F9] border border-slate-200">
              <div className="text-[11px] font-mono text-slate-500">Vanligaste hemleveranstid</div>
              <div className="font-display text-lg sm:text-xl font-extrabold text-[#040B16] mt-1 tabular-nums">
                {deliveryStats.homeDeliveryPreferredSlot}
              </div>
              <div className="text-xs text-slate-600 mt-0.5">54% föredrar kväll efter arbetstid</div>
            </div>
            <div className="p-4 rounded-xl bg-[#F4F6F9] border border-slate-200">
              <div className="text-[11px] font-mono text-slate-500">"Lämna utanför dörren"</div>
              <div className="font-display text-lg sm:text-xl font-extrabold text-[#059669] mt-1 tabular-nums">
                {deliveryStats.leaveOutsideDoorSharePct} %
              </div>
              <div className="text-xs text-slate-600 mt-0.5">Av alla hemleveranser sker utan kvittens</div>
            </div>
            <div className="p-4 rounded-xl bg-[#F4F6F9] border border-slate-200">
              <div className="text-[11px] font-mono text-slate-500">Snittvikt / Medianvikt</div>
              <div className="font-display text-lg sm:text-xl font-extrabold text-[#006AA7] mt-1 tabular-nums">
                {deliveryStats.avgWeightKg.toFixed(1).replace('.', ',')} kg · Median {deliveryStats.medianWeightKg.toFixed(1).replace('.', ',')} kg
              </div>
              <div className="text-xs text-slate-600 mt-0.5">{deliveryStats.varubrevOrSmallBoxSharePct}% ryms i Varubrev / S-fack</div>
            </div>
            <div className="p-4 rounded-xl bg-[#F4F6F9] border border-slate-200">
              <div className="text-[11px] font-mono text-slate-500">Vanligaste kartongmått</div>
              <div className="font-display text-lg sm:text-xl font-extrabold text-[#040B16] mt-1 tabular-nums">
                {deliveryStats.mostCommonDimensionsCm}
              </div>
              <div className="text-xs text-slate-600 mt-0.5">M-fack i Instabox / PostNord / Budbee</div>
            </div>
          </div>

          {deliverySubTab === 'timing' ? (
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
                  Hur vill man ta emot paketet? (Skåp vs Ombud vs Hem)
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
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 font-mono">
                      <th className="py-3 pr-4 font-semibold">Storleksklass</th>
                      <th className="py-3 px-4 font-semibold">Typiska mått (L×B×H)</th>
                      <th className="py-3 px-4 font-semibold">Viktintervall</th>
                      <th className="py-3 px-4 font-semibold text-right">Andel av ordrar</th>
                      <th className="py-3 pl-4 font-semibold">Dominerande fraktsätt</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {deliveryStats.parcelSizeTiers.map((ps) => (
                      <tr key={ps.id} className="hover:bg-slate-50">
                        <td className="py-3.5 pr-4 font-display font-bold text-sm text-[#040B16]">
                          {ps.sizeClass}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-slate-700 tabular-nums whitespace-nowrap">
                          {ps.typicalDimensionsCm}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-[#006AA7] font-semibold tabular-nums whitespace-nowrap">
                          {ps.weightRangeKg}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-extrabold text-[#059669] tabular-nums whitespace-nowrap">
                          {ps.shareOfOrdersPct} %
                        </td>
                        <td className="py-3.5 pl-4 text-slate-700">{ps.dominantCarrierOption}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
                  Jämför transportörer & TA-system &rarr;
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

        {/* Checkoutstrategi.se Dedicated CTA + Open Ad Holder */}
        <CheckoutStrategyCTA />

        <AdBannerSlot
          banners={adBanners}
          placement="marknad-mid"
          onNavigate={onNavigate}
          onBookSlot={onBookAdSlot}
        />

        {/* 3 Insight Cards with Generated Visuals */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden flex flex-col">
            <div className="h-44 relative">
              <ResilientImage
                src="/src/assets/images/checkout_mobile_payment_1795029384663.jpg"
                alt="Svensk konsument betalar med mobilen"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
              <div>
                <div className="text-xs font-mono text-[#006AA7] font-semibold">Checkout-data</div>
                <h3 className="font-display font-bold text-lg text-[#040B16] mt-1">
                  One-Click BankID & Swish sänker avhopp med 34%
                </h3>
                <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                  Svenska konsumenter överger kassan direkt om manuella kortuppgifter krävs. Friktionsfri identifiering är standard 2027.
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('ehandlare')}
                className="text-xs font-bold text-[#006AA7] hover:underline text-left cursor-pointer"
              >
                Jämför topprankade e-handlare &rarr;
              </button>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden flex flex-col">
            <div className="h-44 relative">
              <ResilientImage
                src="/src/assets/images/nordic_green_logistics_1795029385111.jpg"
                alt="Eldrivet paketfordon och nordiskt paketskåp"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
              <div>
                <div className="text-xs font-mono text-[#059669] font-semibold">Grön logistik</div>
                <h3 className="font-display font-bold text-lg text-[#040B16] mt-1">
                  64% väljer fossilfritt paketskåp i kassan
                </h3>
                <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                  När speditören märker leveransvalet med tydlig klimatdata väljer majoriteten av svenskarna eldrivna transporter.
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('partners')}
                className="text-xs font-bold text-[#059669] hover:underline text-left cursor-pointer"
              >
                Se tech- & logistikpartners &rarr;
              </button>
            </div>
          </div>

          <div className="bg-[#040B16] text-white border border-slate-800 rounded-2xl overflow-hidden flex flex-col">
            <div className="h-44 relative">
              <ResilientImage
                src="/src/assets/images/dcongress_stage_1795029383597.jpg"
                alt="Svenska e-handelsmässor och konferenser 2027"
                className="w-full h-full object-cover opacity-85"
              />
            </div>
            <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
              <div>
                <div className="text-xs font-mono text-[#FECC02] font-semibold">
                  Göteborg · Stockholm · Oslo 2027
                </div>
                <h3 className="font-display font-bold text-lg text-white mt-1">
                  D-Congress, E-commerce Expo & Retail Technology
                </h3>
                <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                  Komplett mäss- och konferensguide: Kistamässan (25–26 maj), Älvsjö + Formex (24–25 aug), Stora Ehandelsdagen, NXT Nordic & D-Congress.
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('event')}
                className="text-xs font-bold text-[#FECC02] hover:underline text-left cursor-pointer"
              >
                Öppna Event & Mässor &rarr;
              </button>
            </div>
          </div>
        </div>

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
      </div>
    </div>
  );
}
