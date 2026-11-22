import { PageZone } from './PageLayout';
import { useMemo, useState } from 'react';
import { ExternalLink, Package, Pencil, Plus, Search, ShieldCheck, Sparkles, Star, TrendingUp } from 'lucide-react';
import type {
  AdBanner,
  CategoryOrderBenchmark,
  ContactFormConfig,
  Merchant,
  PageCopyBlock,
  PortalTab,
} from '../types';
import {
  estimateMerchantParcels,
  formatParcelCountCompact,
  formatSekCompact,
} from '../utils/shippingEconomics';
import { AdBannerSlot } from './AdBannerSlot';
import { PageFormSlot } from './DynamicFormWidget';

interface MerchantsViewProps {
  merchants: Merchant[];
  orderBenchmarks: CategoryOrderBenchmark[];
  adBanners: AdBanner[];
  contactForms?: ContactFormConfig[];
  pageCopy?: PageCopyBlock;
  initialSearch?: string;
  onNavigate: (tab: PortalTab, searchQuery?: string) => void;
  onBookAdSlot: (slotName: string) => void;
  onOpenDiscover: () => void;
  onOpenEditor: (merchant?: Merchant) => void;
  onFormSubmitted?: () => Promise<void> | void;
  onNotify?: (msg: string) => void;
}

export function MerchantsView({
  merchants = [],
  orderBenchmarks = [],
  adBanners = [],
  contactForms = [],
  pageCopy,
  initialSearch = '',
  onNavigate,
  onBookAdSlot,
  onOpenDiscover,
  onOpenEditor,
  onFormSubmitted,
  onNotify,
}: MerchantsViewProps) {
  const [search, setSearch] = useState(initialSearch);
  const [catFilter, setCatFilter] = useState('all');
  const [certFilter, setCertFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'revenue' | 'parcels' | 'growth' | 'rating' | 'name'>('revenue');

  const published = useMemo(
    () => (merchants || []).filter((m) => m.status === 'published'),
    [merchants]
  );

  const categories = useMemo(
    () => Array.from(new Set(published.map((m) => m.category))).sort((a, b) => a.localeCompare(b, 'sv')),
    [published]
  );

  const parcelEstimateById = useMemo(() => {
    const map = new Map<string, ReturnType<typeof estimateMerchantParcels>>();
    for (const m of published) {
      map.set(m.id, estimateMerchantParcels(m, orderBenchmarks));
    }
    return map;
  }, [published, orderBenchmarks]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = published.filter((m) => {
      const matchesQ =
        !q ||
        m.name.toLowerCase().includes(q) ||
        m.city.toLowerCase().includes(q) ||
        m.domain.toLowerCase().includes(q) ||
        m.platform.toLowerCase().includes(q) ||
        m.desc.toLowerCase().includes(q);
      const matchesCat = catFilter === 'all' || m.category === catFilter;
      const matchesCert = certFilter === 'all' || m.certs.includes(certFilter);
      return matchesQ && matchesCat && matchesCert;
    });

    if (sortBy === 'revenue') {
      return [...list].sort((a, b) => (b.revenueNumericM ?? 0) - (a.revenueNumericM ?? 0));
    }
    if (sortBy === 'parcels') {
      return [...list].sort(
        (a, b) =>
          (parcelEstimateById.get(b.id)?.annualParcels ?? 0) -
          (parcelEstimateById.get(a.id)?.annualParcels ?? 0)
      );
    }
    if (sortBy === 'growth') {
      return [...list].sort((a, b) => (b.yoyGrowthPct ?? 0) - (a.yoyGrowthPct ?? 0));
    }
    if (sortBy === 'rating') {
      return [...list].sort((a, b) => b.trustpilot - a.trustpilot);
    }
    return [...list].sort((a, b) => a.name.localeCompare(b.name, 'sv'));
  }, [published, search, catFilter, certFilter, sortBy, parcelEstimateById]);

  return (
    <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
      <PageZone page="ehandlare" zone="content" widgets={{
"header": (<div className="bg-[#040B16] text-white border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <div className="font-mono text-xs text-[#10B981] font-semibold">
              {pageCopy?.kicker || 'Verifierad branschkatalog'} · {published.length} aktiva e-handlare med omsättning &amp; tillväxt
            </div>
            <h1 className="font-display text-3xl sm:text-4xl font-extrabold mt-1">
              {pageCopy?.title || 'Svenska E-handlare, Omsättning, Tillväxt & Tech-stack'}
            </h1>
            <p className="text-slate-300 text-sm mt-2 max-w-2xl leading-relaxed">
              {pageCopy?.subtitle ||
                'Jämför Sveriges största nätbutiker och D2C-varumärken på omsättning, årlig tillväxt (YoY), Trustpilot-betyg och teknisk stack – eller sök webben för att lägga till fler.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={onOpenDiscover}
              className="px-4 py-2.5 rounded-xl bg-[#FECC02] hover:bg-[#EAB308] text-[#040B16] font-bold text-xs inline-flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap"
            >
              <Sparkles className="w-4 h-4" />
              Sök & lägg till e-handlare
            </button>
            <button
              type="button"
              onClick={() => onOpenEditor(undefined)}
              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-white font-semibold text-xs inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              Lägg till manuellt
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-6 border-t border-white/10">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Sök butik, stad, domän eller plattform..."
              className="w-full bg-white/10 border border-white/15 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-[#FECC02]"
            />
          </div>

          <select
            value={catFilter}
            onChange={(e) => setCatFilter(e.target.value)}
            className="bg-[#0A1628] border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#FECC02]"
          >
            <option value="all">Alla branscher</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          <select
            value={certFilter}
            onChange={(e) => setCertFilter(e.target.value)}
            className="bg-[#0A1628] border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#FECC02]"
          >
            <option value="all">Alla certifieringar</option>
            <option value="Trygg E-handel">Trygg E-handel</option>
            <option value="Certifierad E-handel">Certifierad E-handel</option>
            <option value="Fossilfri frakt">Fossilfri frakt</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) =>
              setSortBy(e.target.value as 'revenue' | 'parcels' | 'growth' | 'rating' | 'name')
            }
            className="bg-[#0A1628] border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#FECC02]"
          >
            <option value="revenue">Sortera: Störst omsättning</option>
            <option value="parcels">Sortera: Flest paket / år</option>
            <option value="growth">Sortera: Högst tillväxt (YoY)</option>
            <option value="rating">Sortera: Högst Trustpilot</option>
            <option value="name">Sortera: A–Ö</option>
          </select>
        </div>
      </div>),
"ad": (<AdBannerSlot
        banners={adBanners}
        placement="ehandlare-top"
        onNavigate={onNavigate}
        onBookSlot={onBookAdSlot}
      />),
"top-form": (<PageFormSlot
        forms={contactForms}
        page="ehandlare"
        position="top"
        adBanners={adBanners}
        onSubmitted={onFormSubmitted}
        onNotify={onNotify}
      />),
"mid-form": (<PageFormSlot
        forms={contactForms}
        page="ehandlare"
        position="mid"
        adBanners={adBanners}
        onSubmitted={onFormSubmitted}
        onNotify={onNotify}
      />),
"catalog": (filtered.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center space-y-4">
          <p className="text-slate-600 text-sm">
            Inga e-handlare i katalogen matchade "{search}". Vill du söka webben och importera dem direkt?
          </p>
          <button
            type="button"
            onClick={onOpenDiscover}
            className="px-5 py-2.5 rounded-xl bg-[#040B16] hover:bg-[#006AA7] text-white text-xs font-bold inline-flex items-center gap-2 transition-colors cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-[#FECC02]" />
            Sök webben efter fler e-handlare
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((m) => {
            const growthPositive = (m.yoyGrowthPct ?? 0) >= 0;
            const parcelEst = parcelEstimateById.get(m.id);
            return (
              <article
                key={m.id}
                className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col justify-between space-y-4 hover:border-slate-300 transition-colors"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-xs font-mono text-[#006AA7] font-semibold truncate">
                        {m.category}
                      </div>
                      <h3 className="font-display text-xl font-extrabold text-[#040B16] mt-0.5 truncate">
                        {m.name}
                      </h3>
                      <div className="text-xs text-slate-500 mt-0.5 truncate">
                        {m.city} · {m.domain}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="font-mono font-extrabold text-sm text-[#059669] inline-flex items-center gap-1 tabular-nums">
                        <Star className="w-3.5 h-3.5 fill-[#059669] text-[#059669]" />
                        {m.trustpilot.toFixed(1)}
                      </div>
                      <div className="text-[11px] text-slate-500 tabular-nums">{m.reviews}</div>
                    </div>
                  </div>

                  {/* Revenue, YoY Growth & Parcel Volume Strip */}
                  <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-[#F4F6F9] border border-slate-200">
                    <div>
                      <div className="text-[10px] font-mono text-slate-500">
                        Omsättning ({m.revenueYear || '2025/2026'})
                      </div>
                      <div className="font-display font-extrabold text-sm text-[#040B16] tabular-nums mt-0.5">
                        {m.revenue}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] font-mono text-slate-500">Tillväxt (YoY)</div>
                      <div
                        className={`font-mono font-extrabold text-sm tabular-nums mt-0.5 inline-flex items-center gap-1 ${
                          growthPositive ? 'text-[#059669]' : 'text-amber-700'
                        }`}
                      >
                        <TrendingUp className="w-3.5 h-3.5" />
                        {m.yoyGrowth || '+8% YoY'}
                      </div>
                    </div>
                    {parcelEst && (
                      <>
                        <div className="pt-2 border-t border-slate-200/80">
                          <div className="text-[10px] font-mono text-slate-500 inline-flex items-center gap-1">
                            <Package className="w-3 h-3 text-[#006AA7]" />
                            {parcelEst.isReportedExact ? 'Paket / år' : 'Est. paket / år'}
                          </div>
                          <div className="font-mono font-bold text-xs text-[#040B16] tabular-nums mt-0.5">
                            {formatParcelCountCompact(parcelEst.annualParcels)}
                          </div>
                        </div>
                        <div className="pt-2 border-t border-slate-200/80">
                          <div className="text-[10px] font-mono text-slate-500">
                            Est. fraktkostnad
                          </div>
                          <div className="font-mono font-bold text-xs text-[#006AA7] tabular-nums mt-0.5">
                            {parcelEst.estimatedCostPerParcelSek} SEK/pkt ·{' '}
                            {formatSekCompact(parcelEst.estimatedAnnualFreightCostSek)}/år
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">{m.desc}</p>

                  <div className="pt-2 border-t border-slate-100 text-xs text-slate-600 space-y-1">
                    <div>
                      <span className="font-semibold text-slate-800">Plattform:</span> {m.platform}
                    </div>
                    <div>
                      <span className="font-semibold text-slate-800">Betalning:</span> {m.paymentProvider}
                    </div>
                    <div>
                      <span className="font-semibold text-slate-800">Frakt:</span> {m.carrier}
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <div className="text-[11px] text-slate-600 inline-flex items-center gap-1.5 truncate">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#059669] shrink-0" />
                    <span className="truncate">{m.certs.join(' · ')}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => onOpenEditor(m)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-[#040B16] hover:bg-slate-100 transition-colors cursor-pointer"
                      title="Redigera i CMS"
                      aria-label={`Redigera ${m.name}`}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <a
                      href={`https://${m.domain.replace(/^https?:\/\//, '')}`}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1.5 rounded-lg text-slate-500 hover:text-[#006AA7] hover:bg-slate-100 transition-colors"
                      title={`Besök ${m.domain}`}
                      aria-label={`Besök ${m.name}`}
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )),
"bottom-form": (<PageFormSlot
        forms={contactForms}
        page="ehandlare"
        position="bottom"
        adBanners={adBanners}
        onSubmitted={onFormSubmitted}
        onNotify={onNotify}
      />)
}}/>
    </div>
  );
}
