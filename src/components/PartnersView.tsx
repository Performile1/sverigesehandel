import { useMemo, useState } from 'react';
import { Columns3, ExternalLink, LayoutGrid, Pencil, Plus, Search, Sparkles, Users } from 'lucide-react';
import type { AdBanner, ContactFormConfig, PageCopyBlock, PortalTab, TechPartner } from '../types';
import { AdBannerSlot } from './AdBannerSlot';
import { CheckoutStrategyCTA } from './CheckoutStrategyCTA';
import { PageFormSlot } from './DynamicFormWidget';

interface PartnersViewProps {
  partners: TechPartner[];
  adBanners: AdBanner[];
  contactForms?: ContactFormConfig[];
  pageCopy?: PageCopyBlock;
  initialSearch?: string;
  onNavigate: (tab: PortalTab, searchQuery?: string) => void;
  onBookAdSlot: (slotName: string) => void;
  onOpenDiscover: () => void;
  onOpenEditor: (partner?: TechPartner) => void;
  onRequestIntro: (partner: TechPartner) => void;
  onFormSubmitted?: () => Promise<void> | void;
  onNotify?: (msg: string) => void;
}

type CompareDomainId =
  | 'payments'
  | 'carriers'
  | 'ta'
  | 'platforms'
  | 'martech';

const COMPARE_DOMAINS: Array<{
  id: CompareDomainId;
  label: string;
  title: string;
  subtitle: string;
  match: (p: TechPartner) => boolean;
}> = [
  {
    id: 'payments',
    label: 'Betallösningar',
    title: 'Jämför Betallösningar & Checkout för svensk e-handel',
    subtitle: 'Jämför antal handlare, prismodell, konverteringsstyrkor och vilka betalsätt som passar bäst för B2C och B2B.',
    match: (p) => p.cat === 'Betalning & Checkout' || p.subType === 'Betalning & Checkout',
  },
  {
    id: 'carriers',
    label: 'Logistik (Transportörer)',
    title: 'Jämför Svenska Transportörer & Paketskåpsnät',
    subtitle: 'Ställ PostNord, Instabee, iBoxen, DHL, Bring, Airmee, Early Bird och DB Schenker sida vid sida på paketskåp, ombud, hemleveranstäckning, vikt/mått och integrationer.',
    match: (p) => p.subType === 'Transportör',
  },
  {
    id: 'ta',
    label: 'TA-system',
    title: 'Jämför TA-system & Delivery Checkout',
    subtitle: 'Jämför nShift, Ingrid, Fraktjakt och Shiplink på antal kunder, prismodell, integrationstid och checkout-stöd.',
    match: (p) => p.subType === 'TA-system',
  },
  {
    id: 'platforms',
    label: 'E-handelsplattformar',
    title: 'Jämför Svenska & Nordiska E-handelsplattformar',
    subtitle: 'Sida-vid-sida jämförelse av Centra, Norce, Litium, Brink Commerce, Geins, Shopify Plus och Askås.',
    match: (p) => p.cat === 'E-handelsplattform' || p.subType === 'E-handelsplattform',
  },
  {
    id: 'martech',
    label: 'MarTech & AI',
    title: 'Jämför MarTech, CDP, CRM & AI-personalisering',
    subtitle: 'Jämför Voyado, Funnel, Triggerbee, Rule, Klaviyo, Hello Retail och Lipscore.',
    match: (p) => p.cat === 'MarTech & AI' || p.subType === 'MarTech & AI',
  },
];

const CARRIER_COMPARE_PRESETS: Array<{ label: string; ids: string[] }> = [
  { label: 'PostNord vs Instabee vs iBoxen', ids: ['p-postnord', 'p-instabee', 'p-iboxen'] },
  { label: 'Storstad & Snabbhet: Instabee vs Airmee vs Early Bird', ids: ['p-instabee', 'p-airmee', 'p-earlybird'] },
  { label: 'Rikstäckning & Export: PostNord vs Bring vs DHL', ids: ['p-postnord', 'p-bring', 'p-dhl'] },
  { label: 'iBoxen-nätverket: iBoxen vs DHL vs Bring vs Schenker', ids: ['p-iboxen', 'p-dhl', 'p-bring', 'p-schenker'] },
];

function getWebsiteHref(p: TechPartner): string {
  const raw = p.carrierMetrics?.websiteUrl || p.domain;
  if (!raw) return 'https://sverigesehandel.se';
  return raw.startsWith('http://') || raw.startsWith('https://') ? raw : `https://${raw}`;
}

export function PartnersView({
  partners,
  adBanners,
  contactForms = [],
  pageCopy,
  initialSearch = '',
  onNavigate,
  onBookAdSlot,
  onOpenDiscover,
  onOpenEditor,
  onRequestIntro,
  onFormSubmitted,
  onNotify,
}: PartnersViewProps) {
  const [viewMode, setViewMode] = useState<'catalog' | 'compare'>('catalog');
  const [compareDomain, setCompareDomain] = useState<CompareDomainId>('carriers');
  const [pinnedIds, setPinnedIds] = useState<string[]>([]);
  const [search, setSearch] = useState(initialSearch);
  const [catFilter, setCatFilter] = useState('all');

  const published = useMemo(
    () => partners.filter((p) => p.status === 'published'),
    [partners]
  );

  const categories = useMemo(
    () => [
      'all',
      'E-handelsplattform',
      'Betalning & Checkout',
      'Logistik & Last-mile',
      'MarTech & AI',
      'ERP & Omnichannel',
    ],
    []
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return published.filter((p) => {
      const matchesCat = catFilter === 'all' || p.cat === catFilter;
      const matchesQ =
        !q ||
        p.name.toLowerCase().includes(q) ||
        (p.subType || '').toLowerCase().includes(q) ||
        p.origin.toLowerCase().includes(q) ||
        p.stack.toLowerCase().includes(q) ||
        p.desc.toLowerCase().includes(q) ||
        (p.carrierMetrics?.integrations || []).some((i) => i.toLowerCase().includes(q)) ||
        p.notableClients.some((c) => c.toLowerCase().includes(q));
      return matchesCat && matchesQ;
    });
  }, [published, catFilter, search]);

  const activeCompareConfig =
    COMPARE_DOMAINS.find((d) => d.id === compareDomain) || COMPARE_DOMAINS[0];

  const compareList = useMemo(() => {
    const matches = published.filter(activeCompareConfig.match);
    if (pinnedIds.length === 0) return matches;
    const pinnedInDomain = matches.filter((m) => pinnedIds.includes(m.id));
    return pinnedInDomain.length > 0 ? pinnedInDomain : matches;
  }, [published, activeCompareConfig, pinnedIds]);

  const sideBySideActors = useMemo(() => compareList.slice(0, 4), [compareList]);

  const allDomainPartners = useMemo(
    () => published.filter(activeCompareConfig.match),
    [published, activeCompareConfig]
  );

  function togglePin(id: string) {
    setPinnedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  }

  return (
    <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
      <div className="bg-gradient-to-br from-[#040B16] via-[#0A1628] to-[#022C22] text-white border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <div className="font-mono text-xs text-[#FECC02] font-semibold">
              {pageCopy?.kicker || `Nordic E-commerce Tech Stack · ${published.length} aktiva partners`}
            </div>
            <h1 className="font-display text-3xl sm:text-4xl font-extrabold mt-1">
              {pageCopy?.title || 'Tech-Partners, Transportörer & Jämförelsesidor'}
            </h1>
            <p className="text-slate-300 text-sm sm:text-base mt-2 max-w-2xl leading-relaxed">
              {pageCopy?.subtitle ||
                'Bläddra i hela katalogen eller växla till Jämför-läget för att ställa transportörer (inkl. iBoxen), betallösningar, TA-system, plattformar och MarTech sida vid sida.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <div className="inline-flex bg-white/10 p-1 rounded-xl text-xs font-bold">
              <button
                type="button"
                onClick={() => setViewMode('catalog')}
                className={`px-3.5 py-2 rounded-lg inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  viewMode === 'catalog'
                    ? 'bg-[#FECC02] text-[#040B16]'
                    : 'text-slate-200 hover:text-white'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                Katalog ({published.length})
              </button>
              <button
                type="button"
                onClick={() => setViewMode('compare')}
                className={`px-3.5 py-2 rounded-lg inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  viewMode === 'compare'
                    ? 'bg-[#FECC02] text-[#040B16]'
                    : 'text-slate-200 hover:text-white'
                }`}
              >
                <Columns3 className="w-3.5 h-3.5" />
                Jämför-sidor
              </button>
            </div>

            <button
              type="button"
              onClick={() => onNavigate('3pl')}
              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-[#FECC02] font-semibold text-xs inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              3PL &amp; 4PL i Sverige &rarr;
            </button>
            <button
              type="button"
              onClick={onOpenDiscover}
              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-white font-semibold text-xs inline-flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <Sparkles className="w-4 h-4 text-[#FECC02]" />
              Sök &amp; lägg till
            </button>
            <button
              type="button"
              onClick={() => onOpenEditor(undefined)}
              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-white font-semibold text-xs inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <Plus className="w-4 h-4" />
              Ny partner
            </button>
          </div>
        </div>

        {viewMode === 'catalog' ? (
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-6 border-t border-white/10">
            <div className="flex flex-wrap gap-1.5">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCatFilter(cat)}
                  className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                    catFilter === cat
                      ? 'bg-[#FECC02] text-[#040B16]'
                      : 'bg-white/10 hover:bg-white/20 text-white'
                  }`}
                >
                  {cat === 'all' ? 'Alla partners' : cat}
                </button>
              ))}
            </div>

            <div className="relative w-full md:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Sök partner, integration eller teknik..."
                className="w-full bg-white/10 border border-white/15 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-[#FECC02]"
              />
            </div>
          </div>
        ) : (
          <div className="pt-6 border-t border-white/10 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-1.5">
              {COMPARE_DOMAINS.map((dom) => (
                <button
                  key={dom.id}
                  type="button"
                  onClick={() => {
                    setCompareDomain(dom.id);
                    setPinnedIds([]);
                  }}
                  className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                    compareDomain === dom.id
                      ? 'bg-[#FECC02] text-[#040B16]'
                      : 'bg-white/10 hover:bg-white/20 text-white'
                  }`}
                >
                  {dom.label}
                </button>
              ))}
            </div>
            <div className="text-xs font-mono text-slate-300 tabular-nums">
              Visar {compareList.length} av {allDomainPartners.length} aktörer
            </div>
          </div>
        )}
      </div>

      <AdBannerSlot
        banners={adBanners}
        placement="partners-top"
        onNavigate={onNavigate}
        onBookSlot={onBookAdSlot}
      />

      <PageFormSlot
        forms={contactForms}
        page="partners"
        position="top"
        adBanners={adBanners}
        onSubmitted={onFormSubmitted}
        onNotify={onNotify}
      />

      {/* COMPARISON MODE */}
      {viewMode === 'compare' && (
        <div className="space-y-6">
          <CheckoutStrategyCTA compact />
          <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="font-display text-2xl font-extrabold text-[#040B16]">
                  {activeCompareConfig.title}
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 mt-1">
                  {activeCompareConfig.subtitle}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3 self-start">
                {compareDomain === 'carriers' && (
                  <button
                    type="button"
                    onClick={() => onNavigate('marknad')}
                    className="text-xs font-bold text-[#059669] hover:underline cursor-pointer"
                  >
                    Se skåpdensitet &amp; Paketindex Q1 2026 &rarr;
                  </button>
                )}
                {pinnedIds.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setPinnedIds([])}
                    className="text-xs font-semibold text-[#006AA7] hover:underline cursor-pointer"
                  >
                    Visa alla i kategorin ({allDomainPartners.length})
                  </button>
                )}
              </div>
            </div>

            {compareDomain === 'carriers' && (
              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
                <span className="text-xs font-semibold text-slate-500 mr-1">
                  Snabbjämförelser:
                </span>
                {CARRIER_COMPARE_PRESETS.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => setPinnedIds(preset.ids)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#F4F6F9] hover:bg-[#FECC02]/30 border border-slate-200 text-[#040B16] transition-colors cursor-pointer"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
              <span className="text-xs font-semibold text-slate-500 mr-1">
                Välj aktörer (max 4 i kolumnmatris):
              </span>
              {allDomainPartners.map((p) => {
                const selected = pinnedIds.includes(p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => togglePin(p.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                      selected
                        ? 'bg-[#040B16] text-white border-[#040B16]'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-400'
                    }`}
                  >
                    {p.name}
                  </button>
                );
              })}
            </div>

            {/* Side-by-Side Column Matrix (Up to 4 Actors) - ZERO horizontal scrollbar */}
            {sideBySideActors.length >= 2 && (
              <div className="space-y-3 pt-2">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="font-mono font-bold text-[#006AA7]">
                    Sida-vid-sida jämförelse ({sideBySideActors.length} valda aktörer)
                  </span>
                  <span className="text-slate-500">
                    Klicka på aktörerna ovan för att byta ut kolumnerna
                  </span>
                </div>

                {/* Desktop Table (no overflow-x-auto) */}
                <div className="hidden lg:block border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full table-fixed text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-[#040B16] text-white">
                        <th className="py-3.5 px-3 font-mono font-semibold text-slate-300 w-40">
                          Jämförelsepunkt
                        </th>
                        {sideBySideActors.map((actor) => (
                          <th key={actor.id} className="py-3.5 px-3 align-top break-words">
                            <div className="font-display text-sm font-extrabold text-[#FECC02]">
                              {actor.name}
                            </div>
                            <a
                              href={getWebsiteHref(actor)}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] font-mono font-normal text-slate-300 hover:text-white mt-0.5 break-all"
                            >
                              {actor.domain}
                              <ExternalLink className="w-3 h-3 shrink-0" />
                            </a>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {compareDomain === 'carriers' ? (
                        <>
                          <tr>
                            <td className="py-3 px-3 font-semibold text-slate-600 bg-slate-50 align-top">
                              Paketskåp i Sverige
                            </td>
                            {sideBySideActors.map((actor) => (
                              <td key={actor.id} className="py-3 px-3 align-top break-words">
                                <div className="font-mono font-extrabold text-sm text-[#006AA7] tabular-nums">
                                  {actor.carrierMetrics && actor.carrierMetrics.parcelLockers > 0
                                    ? `${actor.carrierMetrics.parcelLockers.toLocaleString('sv-SE')} skåp`
                                    : 'Inga egna skåp'}
                                </div>
                                {actor.carrierMetrics?.lockerNote && (
                                  <div className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                                    {actor.carrierMetrics.lockerNote}
                                  </div>
                                )}
                              </td>
                            ))}
                          </tr>
                          <tr>
                            <td className="py-3 px-3 font-semibold text-slate-600 bg-slate-50 align-top">
                              Antal ombud
                            </td>
                            {sideBySideActors.map((actor) => (
                              <td
                                key={actor.id}
                                className="py-3 px-3 font-mono font-semibold text-[#040B16] tabular-nums align-top"
                              >
                                {actor.carrierMetrics && actor.carrierMetrics.pickupAgents > 0
                                  ? `${actor.carrierMetrics.pickupAgents.toLocaleString('sv-SE')} ombud`
                                  : '0 (endast box/dörr)'}
                              </td>
                            ))}
                          </tr>
                          <tr>
                            <td className="py-3 px-3 font-semibold text-slate-600 bg-slate-50 align-top">
                              Täckning hemleverans
                            </td>
                            {sideBySideActors.map((actor) => (
                              <td
                                key={actor.id}
                                className="py-3 px-3 font-mono font-extrabold tabular-nums align-top"
                              >
                                {actor.carrierMetrics && actor.carrierMetrics.homeDeliveryPct > 0 ? (
                                  <span className="text-[#059669]">
                                    {actor.carrierMetrics.homeDeliveryPct} % av hushåll
                                  </span>
                                ) : (
                                  <span className="text-slate-500 font-semibold">
                                    0 % · Ej egen hemleverans
                                  </span>
                                )}
                              </td>
                            ))}
                          </tr>
                          <tr>
                            <td className="py-3 px-3 font-semibold text-slate-600 bg-slate-50 align-top">
                              Vikt- &amp; måttgränser
                            </td>
                            {sideBySideActors.map((actor) => (
                              <td key={actor.id} className="py-3 px-3 text-slate-700 align-top break-words">
                                <div className="font-semibold text-[#040B16] leading-snug">
                                  {actor.carrierMetrics?.weightLimits || 'Enligt tjänst/avtal'}
                                </div>
                                {actor.carrierMetrics?.dimensionLimits && (
                                  <div className="text-[11px] text-slate-500 mt-1 leading-snug">
                                    Mått: {actor.carrierMetrics.dimensionLimits}
                                  </div>
                                )}
                              </td>
                            ))}
                          </tr>
                          <tr>
                            <td className="py-3 px-3 font-semibold text-slate-600 bg-slate-50 align-top">
                              Leveranstjänster ({sideBySideActors[0]?.carrierMetrics?.serviceCount ? 'antal & typer' : ''})
                            </td>
                            {sideBySideActors.map((actor) => (
                              <td key={actor.id} className="py-3 px-3 align-top break-words">
                                <div className="font-mono font-bold text-[#040B16] tabular-nums">
                                  {actor.carrierMetrics ? `${actor.carrierMetrics.serviceCount} st tjänster` : '–'}
                                </div>
                                {actor.carrierMetrics?.coreServices && (
                                  <div className="text-[11px] text-slate-500 mt-1 leading-snug">
                                    {actor.carrierMetrics.coreServices.join(' · ')}
                                  </div>
                                )}
                              </td>
                            ))}
                          </tr>
                          <tr>
                            <td className="py-3 px-3 font-semibold text-slate-600 bg-slate-50 align-top">
                              Integrationsmöjligheter
                            </td>
                            {sideBySideActors.map((actor) => (
                              <td key={actor.id} className="py-3 px-3 text-slate-700 align-top break-words">
                                {actor.carrierMetrics?.integrations && actor.carrierMetrics.integrations.length > 0 ? (
                                  <div className="text-[11px] font-medium text-[#040B16] leading-relaxed">
                                    {actor.carrierMetrics.integrations.join(' · ')}
                                  </div>
                                ) : (
                                  <span>{actor.stack}</span>
                                )}
                              </td>
                            ))}
                          </tr>
                          <tr>
                            <td className="py-3 px-3 font-semibold text-slate-600 bg-slate-50 align-top">
                              Same-day, Helg &amp; Ledtid
                            </td>
                            {sideBySideActors.map((actor) => (
                              <td key={actor.id} className="py-3 px-3 text-slate-700 align-top break-words">
                                <div className="font-mono font-semibold text-[#040B16]">
                                  {actor.carrierMetrics?.avgLeadTime || '1–2 vardagar'}
                                </div>
                                <div className="text-[11px] text-slate-500 mt-0.5">
                                  Same-day: {actor.carrierMetrics?.sameDayAvailable ? 'Ja' : 'Nej'} · Helg:{' '}
                                  {actor.carrierMetrics?.weekendDelivery ? 'Ja' : 'Begränsat'}
                                </div>
                              </td>
                            ))}
                          </tr>
                        </>
                      ) : (
                        <tr>
                          <td className="py-3 px-3 font-semibold text-slate-600 bg-slate-50">
                            Antal e-handelskunder
                          </td>
                          {sideBySideActors.map((actor) => (
                            <td
                              key={actor.id}
                              className="py-3 px-3 font-mono font-semibold text-[#059669] tabular-nums"
                            >
                              {actor.customerCount || 'Nordiska e-handlare'}
                            </td>
                          ))}
                        </tr>
                      )}

                      <tr>
                        <td className="py-3 px-3 font-semibold text-slate-600 bg-slate-50 align-top">
                          Prismodell &amp; Setup
                        </td>
                        {sideBySideActors.map((actor) => (
                          <td key={actor.id} className="py-3 px-3 text-slate-700 align-top break-words">
                            <div>{actor.pricingModel || 'Offert / Avtal'}</div>
                            <div className="text-[11px] font-mono text-slate-500 mt-0.5">
                              Setup: {actor.setupTime || '1–4 veckor'}
                            </div>
                          </td>
                        ))}
                      </tr>
                      <tr>
                        <td className="py-3 px-3 font-semibold text-slate-600 bg-slate-50 align-top">
                          Passar bäst för
                        </td>
                        {sideBySideActors.map((actor) => (
                          <td key={actor.id} className="py-3 px-3 text-slate-700 leading-relaxed align-top break-words">
                            {actor.bestFor || actor.desc}
                          </td>
                        ))}
                      </tr>
                      <tr>
                        <td className="py-3 px-3 font-semibold text-slate-600 bg-slate-50 align-top">
                          Hemsida &amp; Intro
                        </td>
                        {sideBySideActors.map((actor) => (
                          <td key={actor.id} className="py-3 px-3 align-top space-y-1.5">
                            <div>
                              <a
                                href={getWebsiteHref(actor)}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 font-mono font-semibold text-[#006AA7] hover:underline break-all"
                              >
                                Besök hemsida
                                <ExternalLink className="w-3 h-3 shrink-0" />
                              </a>
                            </div>
                            <button
                              type="button"
                              onClick={() => onRequestIntro(actor)}
                              className="px-3 py-1.5 rounded-lg bg-[#040B16] hover:bg-[#006AA7] text-white text-xs font-bold cursor-pointer"
                            >
                              Begär intro
                            </button>
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Mobile/Tablet Comparison Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:hidden">
                  {sideBySideActors.map((actor) => (
                    <div
                      key={actor.id}
                      className="border border-slate-200 rounded-xl p-4 bg-[#F4F6F9] space-y-3 text-xs"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-display text-base font-extrabold text-[#040B16]">
                            {actor.name}
                          </div>
                          <a
                            href={getWebsiteHref(actor)}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 font-mono text-[11px] text-[#006AA7] hover:underline"
                          >
                            {actor.domain}
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                        <button
                          type="button"
                          onClick={() => onRequestIntro(actor)}
                          className="px-3 py-1.5 rounded-lg bg-[#040B16] text-white text-xs font-bold shrink-0 cursor-pointer"
                        >
                          Intro
                        </button>
                      </div>

                      {compareDomain === 'carriers' && actor.carrierMetrics ? (
                        <div className="grid grid-cols-2 gap-2.5 bg-white border border-slate-200 rounded-lg p-3">
                          <div>
                            <div className="text-[11px] font-mono text-slate-500">Paketskåp</div>
                            <div className="font-mono font-bold text-[#006AA7] tabular-nums">
                              {actor.carrierMetrics.parcelLockers > 0
                                ? `${actor.carrierMetrics.parcelLockers.toLocaleString('sv-SE')} skåp`
                                : 'Inga egna'}
                            </div>
                            {actor.carrierMetrics.lockerNote && (
                              <div className="text-[10px] text-slate-500">{actor.carrierMetrics.lockerNote}</div>
                            )}
                          </div>
                          <div>
                            <div className="text-[11px] font-mono text-slate-500">Ombud</div>
                            <div className="font-mono font-bold text-[#040B16] tabular-nums">
                              {actor.carrierMetrics.pickupAgents > 0
                                ? `${actor.carrierMetrics.pickupAgents.toLocaleString('sv-SE')} ombud`
                                : '0 st'}
                            </div>
                          </div>
                          <div>
                            <div className="text-[11px] font-mono text-slate-500">Hemleverans</div>
                            <div className="font-mono font-bold text-[#059669] tabular-nums">
                              {actor.carrierMetrics.homeDeliveryPct > 0
                                ? `${actor.carrierMetrics.homeDeliveryPct} %`
                                : '0 % (Endast skåp)'}
                            </div>
                          </div>
                          <div>
                            <div className="text-[11px] font-mono text-slate-500">Tjänster</div>
                            <div className="font-mono font-bold text-[#040B16] tabular-nums">
                              {actor.carrierMetrics.serviceCount} st
                            </div>
                          </div>
                          <div className="col-span-2 pt-1 border-t border-slate-100 space-y-1">
                            <div>
                              <span className="font-semibold text-slate-700">Vikt &amp; mått:</span>{' '}
                              {actor.carrierMetrics.weightLimits} · {actor.carrierMetrics.dimensionLimits}
                            </div>
                            <div>
                              <span className="font-semibold text-slate-700">Integrationer:</span>{' '}
                              {(actor.carrierMetrics.integrations || []).join(', ')}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-white border border-slate-200 rounded-lg p-3 space-y-1">
                          <div>
                            <span className="font-semibold text-slate-700">Kunder:</span>{' '}
                            <span className="font-mono text-[#059669]">{actor.customerCount}</span>
                          </div>
                          <div>
                            <span className="font-semibold text-slate-700">Pris:</span>{' '}
                            {actor.pricingModel}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Full Category Overview Table (ZERO horizontal scrollbar) */}
            <div className="space-y-3 pt-2">
              <div className="font-mono text-xs font-semibold text-slate-500">
                Fullständig översikt ({compareList.length} aktörer)
              </div>

              {/* Desktop full overview table */}
              <div className="hidden lg:block border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full table-fixed text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-mono">
                      <th className="py-3 px-3 font-semibold w-[17%]">
                        {compareDomain === 'carriers' ? 'Transportör & Hemsida' : 'Partner'}
                      </th>
                      {compareDomain === 'carriers' ? (
                        <>
                          <th className="py-3 px-3 font-semibold w-[14%]">Paketskåp</th>
                          <th className="py-3 px-2 font-semibold text-right w-[9%]">Ombud</th>
                          <th className="py-3 px-2 font-semibold text-right w-[9%]">Hemlev.</th>
                          <th className="py-3 px-3 font-semibold w-[22%]">Vikt &amp; mått</th>
                          <th className="py-3 px-3 font-semibold w-[20%]">Integrationer</th>
                          <th className="py-3 px-3 font-semibold text-right w-[9%]">Kontakt</th>
                        </>
                      ) : (
                        <>
                          <th className="py-3 px-3 font-semibold w-[18%]">Antal kunder</th>
                          <th className="py-3 px-3 font-semibold w-[20%]">Prismodell</th>
                          <th className="py-3 px-3 font-semibold w-[12%]">Setup-tid</th>
                          <th className="py-3 px-3 font-semibold w-[24%]">Passar bäst för</th>
                          <th className="py-3 px-3 font-semibold text-right w-[9%]">Kontakt</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {compareList.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50 align-top">
                        <td className="py-3.5 px-3 break-words">
                          <div className="font-display font-extrabold text-sm text-[#040B16]">
                            {p.name}
                          </div>
                          <a
                            href={getWebsiteHref(p)}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-mono text-[#006AA7] hover:underline mt-0.5 break-all"
                          >
                            {p.domain}
                            <ExternalLink className="w-3 h-3 shrink-0" />
                          </a>
                          <div className="text-[11px] text-slate-500">{p.origin}</div>
                        </td>
                        {compareDomain === 'carriers' ? (
                          <>
                            <td className="py-3.5 px-3 break-words">
                              <div className="font-mono font-bold text-[#006AA7] tabular-nums">
                                {p.carrierMetrics && p.carrierMetrics.parcelLockers > 0
                                  ? `${p.carrierMetrics.parcelLockers.toLocaleString('sv-SE')} st`
                                  : '0 st'}
                              </div>
                              {p.carrierMetrics?.lockerNote && (
                                <div className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                                  {p.carrierMetrics.lockerNote}
                                </div>
                              )}
                            </td>
                            <td className="py-3.5 px-2 text-right font-mono font-semibold text-[#040B16] tabular-nums">
                              {p.carrierMetrics && p.carrierMetrics.pickupAgents > 0
                                ? `${p.carrierMetrics.pickupAgents.toLocaleString('sv-SE')} st`
                                : '0 st'}
                            </td>
                            <td className="py-3.5 px-2 text-right font-mono font-bold tabular-nums">
                              {p.carrierMetrics && p.carrierMetrics.homeDeliveryPct > 0 ? (
                                <span className="text-[#059669]">{p.carrierMetrics.homeDeliveryPct} %</span>
                              ) : (
                                <span className="text-slate-500">0 %</span>
                              )}
                            </td>
                            <td className="py-3.5 px-3 text-slate-700 break-words leading-snug">
                              <div className="font-medium text-[#040B16]">
                                {p.carrierMetrics?.weightLimits || 'Enligt tjänst'}
                              </div>
                              {p.carrierMetrics?.dimensionLimits && (
                                <div className="text-[11px] text-slate-500 mt-0.5">
                                  {p.carrierMetrics.dimensionLimits}
                                </div>
                              )}
                            </td>
                            <td className="py-3.5 px-3 text-slate-700 break-words leading-snug">
                              <div className="text-[11px]">
                                {(p.carrierMetrics?.integrations || []).join(' · ') || p.stack}
                              </div>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="py-3.5 px-3 font-mono font-semibold text-[#059669] tabular-nums break-words">
                              {p.customerCount || 'Nordiska e-handlare'}
                            </td>
                            <td className="py-3.5 px-3 text-slate-700 break-words">
                              {p.pricingModel || 'Offert / SaaS'}
                            </td>
                            <td className="py-3.5 px-3 font-mono text-slate-600 break-words">
                              {p.setupTime || '1–4 veckor'}
                            </td>
                            <td className="py-3.5 px-3 text-slate-700 break-words">
                              {p.bestFor || p.desc}
                            </td>
                          </>
                        )}
                        <td className="py-3.5 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => onRequestIntro(p)}
                            className="px-3 py-1.5 rounded-lg bg-[#040B16] hover:bg-[#006AA7] text-white text-xs font-bold cursor-pointer whitespace-nowrap"
                          >
                            Intro
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile/tablet stacked overview cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 lg:hidden">
                {compareList.map((p) => (
                  <div
                    key={p.id}
                    className="border border-slate-200 rounded-xl p-4 bg-slate-50 space-y-2.5 text-xs"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-display font-extrabold text-sm text-[#040B16]">
                          {p.name}
                        </div>
                        <a
                          href={getWebsiteHref(p)}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] font-mono text-[#006AA7] hover:underline"
                        >
                          {p.domain}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                      <button
                        type="button"
                        onClick={() => onRequestIntro(p)}
                        className="px-3 py-1.5 rounded-lg bg-[#040B16] text-white text-xs font-bold shrink-0 cursor-pointer"
                      >
                        Intro
                      </button>
                    </div>
                    {compareDomain === 'carriers' && p.carrierMetrics ? (
                      <div className="space-y-1.5 bg-white border border-slate-200 rounded-lg p-3">
                        <div className="grid grid-cols-3 gap-2 font-mono text-[11px]">
                          <div>
                            <span className="text-slate-500 block">Paketskåp</span>
                            <span className="font-bold text-[#006AA7] tabular-nums">
                              {p.carrierMetrics.parcelLockers.toLocaleString('sv-SE')} st
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500 block">Ombud</span>
                            <span className="font-bold text-[#040B16] tabular-nums">
                              {p.carrierMetrics.pickupAgents.toLocaleString('sv-SE')} st
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500 block">Hemleverans</span>
                            <span className="font-bold text-[#059669] tabular-nums">
                              {p.carrierMetrics.homeDeliveryPct} %
                            </span>
                          </div>
                        </div>
                        <div className="text-[11px] text-slate-700 pt-1 border-t border-slate-100">
                          <strong className="text-[#040B16]">Vikt/mått:</strong>{' '}
                          {p.carrierMetrics.weightLimits} · {p.carrierMetrics.dimensionLimits}
                        </div>
                        <div className="text-[11px] text-slate-700">
                          <strong className="text-[#040B16]">Integrationer:</strong>{' '}
                          {(p.carrierMetrics.integrations || []).join(' · ')}
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-1 text-slate-700">
                        <div>
                          <strong>Kunder:</strong> {p.customerCount || 'Nordiska e-handlare'}
                        </div>
                        <div>
                          <strong>Prismodell:</strong> {p.pricingModel || 'Offert / SaaS'}
                        </div>
                        <div>
                          <strong>Passar bäst för:</strong> {p.bestFor || p.desc}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CATALOG MODE */}
      {viewMode === 'catalog' && (
        <>
          {filtered.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center space-y-4">
              <p className="text-slate-600 text-sm">
                Inga tech-partners matchade din filtrering. Sök på webben med AI-motorn för att hitta och lägga till fler!
              </p>
              <button
                type="button"
                onClick={onOpenDiscover}
                className="px-5 py-2.5 rounded-xl bg-[#040B16] hover:bg-[#006AA7] text-white text-xs font-bold inline-flex items-center gap-2 transition-colors cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-[#FECC02]" />
                Sök &amp; lägg till techpartners
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map((p) => {
                const isCarrier = p.subType === 'Transportör';
                return (
                  <article
                    key={p.id}
                    className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col justify-between space-y-4 hover:border-slate-300 transition-colors"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-xs gap-2">
                        <span className="font-mono font-semibold text-[#006AA7] truncate">
                          {p.subType && p.subType !== p.cat ? `${p.cat} · ${p.subType}` : p.cat}
                        </span>
                        <span className="font-mono text-slate-500 shrink-0">{p.origin}</span>
                      </div>
                      <div>
                        <h3 className="font-display text-2xl font-extrabold text-[#040B16]">{p.name}</h3>
                        <a
                          href={getWebsiteHref(p)}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-mono text-[#006AA7] hover:underline mt-0.5"
                        >
                          {p.domain}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>

                      {!isCarrier && p.customerCount && (
                        <div className="p-2.5 rounded-xl bg-[#F4F6F9] border border-slate-200 flex items-center gap-2 text-xs">
                          <Users className="w-3.5 h-3.5 text-[#059669] shrink-0" />
                          <span className="font-semibold text-[#040B16] tabular-nums">
                            {p.customerCount}
                          </span>
                        </div>
                      )}

                      {p.carrierMetrics && (
                        <div className="space-y-2.5 p-3 rounded-xl bg-[#F4F6F9] border border-slate-200 text-[11px]">
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <div className="font-mono text-slate-500">Paketskåp</div>
                              <div className="font-mono font-bold text-[#006AA7] tabular-nums">
                                {p.carrierMetrics.parcelLockers > 0
                                  ? `${p.carrierMetrics.parcelLockers.toLocaleString('sv-SE')} st`
                                  : '0 st'}
                              </div>
                              {p.carrierMetrics.lockerNote && (
                                <div className="text-[10px] text-slate-500 leading-tight">
                                  {p.carrierMetrics.lockerNote}
                                </div>
                              )}
                            </div>
                            <div>
                              <div className="font-mono text-slate-500">Postombud</div>
                              <div className="font-mono font-bold text-[#040B16] tabular-nums">
                                {p.carrierMetrics.pickupAgents > 0
                                  ? `${p.carrierMetrics.pickupAgents.toLocaleString('sv-SE')} st`
                                  : '0 st'}
                              </div>
                            </div>
                            <div>
                              <div className="font-mono text-slate-500">Hemleverans</div>
                              <div className="font-mono font-bold text-[#059669] tabular-nums">
                                {p.carrierMetrics.homeDeliveryPct > 0
                                  ? `${p.carrierMetrics.homeDeliveryPct} %`
                                  : '0 % (Endast skåp)'}
                              </div>
                            </div>
                            <div>
                              <div className="font-mono text-slate-500">Leveranstjänster</div>
                              <div className="font-mono font-bold text-[#040B16] tabular-nums">
                                {p.carrierMetrics.serviceCount} st
                              </div>
                            </div>
                          </div>
                          {p.carrierMetrics.weightLimits && (
                            <div className="pt-2 border-t border-slate-200 text-slate-700 leading-snug">
                              <span className="font-semibold text-[#040B16]">Vikt &amp; mått:</span>{' '}
                              {p.carrierMetrics.weightLimits}
                              {p.carrierMetrics.dimensionLimits ? ` · ${p.carrierMetrics.dimensionLimits}` : ''}
                            </div>
                          )}
                          {p.carrierMetrics.integrations && p.carrierMetrics.integrations.length > 0 && (
                            <div className="pt-1.5 border-t border-slate-200 text-slate-700 leading-snug">
                              <span className="font-semibold text-[#040B16]">Integrationer:</span>{' '}
                              {p.carrierMetrics.integrations.join(' · ')}
                            </div>
                          )}
                        </div>
                      )}

                      <div className="font-mono text-[11px] text-[#059669] font-semibold">{p.stack}</div>
                      <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">{p.desc}</p>
                      {p.notableClients.length > 0 && (
                        <div className="text-xs text-slate-500 pt-1">
                          <span className="font-semibold text-slate-700">
                            {isCarrier ? 'Anslutna aktörer / handlare:' : 'Exempelkunder:'}
                          </span>{' '}
                          {p.notableClients.join(', ')}
                        </div>
                      )}
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => onRequestIntro(p)}
                        className="text-xs font-bold text-[#040B16] hover:text-[#006AA7] transition-colors cursor-pointer"
                      >
                        Begär partnerintro &rarr;
                      </button>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onOpenEditor(p)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-[#040B16] hover:bg-slate-100 transition-colors cursor-pointer"
                          title="Redigera i CMS"
                          aria-label={`Redigera ${p.name}`}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <a
                          href={getWebsiteHref(p)}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 rounded-lg text-slate-500 hover:text-[#006AA7] hover:bg-slate-100 transition-colors"
                          title={`Besök ${p.domain}`}
                          aria-label={`Besök ${p.name}`}
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </>
      )}

      <PageFormSlot
        forms={contactForms}
        page="partners"
        position="mid"
        adBanners={adBanners}
        onSubmitted={onFormSubmitted}
        onNotify={onNotify}
      />

      <PageFormSlot
        forms={contactForms}
        page="partners"
        position="bottom"
        adBanners={adBanners}
        onSubmitted={onFormSubmitted}
        onNotify={onNotify}
      />
    </div>
  );
}
