import { useMemo, useState } from 'react';
import { Columns3, ExternalLink, LayoutGrid, Pencil, Plus, Search, Sparkles, Users } from 'lucide-react';
import type { AdBanner, PortalTab, TechPartner } from '../types';
import { AdBannerSlot } from './AdBannerSlot';
import { CheckoutStrategyCTA } from './CheckoutStrategyCTA';

interface PartnersViewProps {
  partners: TechPartner[];
  adBanners: AdBanner[];
  initialSearch?: string;
  onNavigate: (tab: PortalTab, searchQuery?: string) => void;
  onBookAdSlot: (slotName: string) => void;
  onOpenDiscover: () => void;
  onOpenEditor: (partner?: TechPartner) => void;
  onRequestIntro: (partnerName: string) => void;
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
    title: 'Jämför Svenska Transportörer & Paketskåpsnät (Last-mile, Skåp & Ombud)',
    subtitle: 'Ställ PostNord, Instabee, iBoxen, DHL, Bring, Airmee, Early Bird och DB Schenker sida vid sida på antal tjänster, paketskåp, ombud och hemleverans.',
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
    subtitle: 'Side-by-side jämförelse av Centra, Norce, Litium, Brink Commerce, Geins, Shopify Plus och Askås.',
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

export function PartnersView({
  partners,
  adBanners,
  initialSearch = '',
  onNavigate,
  onBookAdSlot,
  onOpenDiscover,
  onOpenEditor,
  onRequestIntro,
}: PartnersViewProps) {
  const [viewMode, setViewMode] = useState<'catalog' | 'compare'>('catalog');
  const [compareDomain, setCompareDomain] = useState<CompareDomainId>('payments');
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
              Nordic E-commerce Tech Stack · {published.length} aktiva partners med kunddata
            </div>
            <h1 className="font-display text-3xl sm:text-4xl font-extrabold mt-1">
              Tekniska Partners, Antal Kunder & Jämförelsesidor
            </h1>
            <p className="text-slate-300 text-sm sm:text-base mt-2 max-w-2xl leading-relaxed">
              Bläddra i hela katalogen eller växla till Jämför-läget för att ställa betallösningar, transportörer (inkl. iBoxen), TA-system, plattformar och MarTech sida vid sida.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <div className="inline-flex bg-white/10 p-1 rounded-xl text-xs font-bold">
              <button
                type="button"
                onClick={() => setViewMode('catalog')}
                className={`px-3.5 py-2 rounded-lg inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
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
                className={`px-3.5 py-2 rounded-lg inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
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
              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-[#FECC02] font-semibold text-xs inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
            >
              3PL &amp; 4PL i Sverige &rarr;
            </button>
            <button
              type="button"
              onClick={onOpenDiscover}
              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-white font-semibold text-xs inline-flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap"
            >
              <Sparkles className="w-4 h-4 text-[#FECC02]" />
              Sök & lägg till
            </button>
            <button
              type="button"
              onClick={() => onOpenEditor(undefined)}
              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-white font-semibold text-xs inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
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
                  className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
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
                placeholder="Sök partner, kund eller teknik..."
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
                  className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
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
                    Se skåpdensitet &amp; hemleveranstäckning &rarr;
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

            {/* Carrier Comparison Presets */}
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

            {/* Quick Select Buttons */}
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

            {/* Side-by-Side Column Matrix (Up to 4 Actors) */}
            {sideBySideActors.length >= 2 && (
              <div className="space-y-2.5 pt-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono font-bold text-[#006AA7]">
                    Sida-vid-sida jämförelse ({sideBySideActors.length} valda aktörer)
                  </span>
                  <span className="text-slate-500">
                    Klicka på aktörerna ovan för att byta ut kolumnerna
                  </span>
                </div>

                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-[#040B16] text-white">
                        <th className="py-3.5 px-4 font-mono font-semibold text-slate-300 w-44">
                          Jämförelsepunkt
                        </th>
                        {sideBySideActors.map((actor) => (
                          <th key={actor.id} className="py-3.5 px-4 min-w-[200px] align-top">
                            <div className="font-display text-sm font-extrabold text-[#FECC02]">
                              {actor.name}
                            </div>
                            <div className="text-[11px] font-mono font-normal text-slate-300 mt-0.5">
                              {actor.domain} · {actor.origin}
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {compareDomain === 'carriers' && (
                        <>
                          <tr>
                            <td className="py-3 px-4 font-semibold text-slate-600 bg-slate-50">
                              Antal leveranstjänster
                            </td>
                            {sideBySideActors.map((actor) => (
                              <td key={actor.id} className="py-3 px-4 align-top">
                                <div className="font-mono font-extrabold text-sm text-[#040B16] tabular-nums">
                                  {actor.carrierMetrics ? `${actor.carrierMetrics.serviceCount} st` : '–'}
                                </div>
                                {actor.carrierMetrics?.coreServices && (
                                  <div className="text-[11px] text-slate-500 mt-1">
                                    {actor.carrierMetrics.coreServices.join(' · ')}
                                  </div>
                                )}
                              </td>
                            ))}
                          </tr>
                          <tr>
                            <td className="py-3 px-4 font-semibold text-slate-600 bg-slate-50">
                              Paketskåp i Sverige
                            </td>
                            {sideBySideActors.map((actor) => (
                              <td
                                key={actor.id}
                                className="py-3 px-4 font-mono font-bold text-[#006AA7] tabular-nums"
                              >
                                {actor.carrierMetrics && actor.carrierMetrics.parcelLockers > 0
                                  ? `${actor.carrierMetrics.parcelLockers.toLocaleString('sv-SE')} skåp`
                                  : 'Egen box saknas'}
                              </td>
                            ))}
                          </tr>
                          <tr>
                            <td className="py-3 px-4 font-semibold text-slate-600 bg-slate-50">
                              Postombud &amp; utlämning
                            </td>
                            {sideBySideActors.map((actor) => (
                              <td
                                key={actor.id}
                                className="py-3 px-4 font-mono font-semibold text-[#040B16] tabular-nums"
                              >
                                {actor.carrierMetrics && actor.carrierMetrics.pickupAgents > 0
                                  ? `${actor.carrierMetrics.pickupAgents.toLocaleString('sv-SE')} ombud`
                                  : 'Inga manuella ombud'}
                              </td>
                            ))}
                          </tr>
                          <tr>
                            <td className="py-3 px-4 font-semibold text-slate-600 bg-slate-50">
                              Hemleverans-täckning
                            </td>
                            {sideBySideActors.map((actor) => (
                              <td
                                key={actor.id}
                                className="py-3 px-4 font-mono font-extrabold text-[#059669] tabular-nums"
                              >
                                {actor.carrierMetrics && actor.carrierMetrics.homeDeliveryPct > 0
                                  ? `${actor.carrierMetrics.homeDeliveryPct} % av hushåll`
                                  : 'Endast utomhusskåp'}
                              </td>
                            ))}
                          </tr>
                          <tr>
                            <td className="py-3 px-4 font-semibold text-slate-600 bg-slate-50">
                              Same-day, Helg &amp; Ledtid
                            </td>
                            {sideBySideActors.map((actor) => (
                              <td key={actor.id} className="py-3 px-4 text-slate-700">
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
                      )}

                      <tr>
                        <td className="py-3 px-4 font-semibold text-slate-600 bg-slate-50">
                          Antal e-handelskunder
                        </td>
                        {sideBySideActors.map((actor) => (
                          <td
                            key={actor.id}
                            className="py-3 px-4 font-mono font-semibold text-[#059669] tabular-nums"
                          >
                            {actor.customerCount || 'Nordiska e-handlare'}
                          </td>
                        ))}
                      </tr>
                      <tr>
                        <td className="py-3 px-4 font-semibold text-slate-600 bg-slate-50">
                          Prismodell
                        </td>
                        {sideBySideActors.map((actor) => (
                          <td key={actor.id} className="py-3 px-4 text-slate-700">
                            {actor.pricingModel || 'Offert / SaaS'}
                          </td>
                        ))}
                      </tr>
                      <tr>
                        <td className="py-3 px-4 font-semibold text-slate-600 bg-slate-50">
                          Setup-tid
                        </td>
                        {sideBySideActors.map((actor) => (
                          <td key={actor.id} className="py-3 px-4 font-mono text-slate-700">
                            {actor.setupTime || '1–4 veckor'}
                          </td>
                        ))}
                      </tr>
                      <tr>
                        <td className="py-3 px-4 font-semibold text-slate-600 bg-slate-50">
                          Passar bäst för
                        </td>
                        {sideBySideActors.map((actor) => (
                          <td key={actor.id} className="py-3 px-4 text-slate-700 leading-relaxed">
                            {actor.bestFor || actor.desc}
                          </td>
                        ))}
                      </tr>
                      <tr>
                        <td className="py-3 px-4 font-semibold text-slate-600 bg-slate-50">
                          Nyckelstyrkor
                        </td>
                        {sideBySideActors.map((actor) => (
                          <td key={actor.id} className="py-3 px-4 text-slate-700">
                            {actor.keyStrengths && actor.keyStrengths.length > 0 ? (
                              <ul className="space-y-1">
                                {actor.keyStrengths.map((s, idx) => (
                                  <li key={idx}>· {s}</li>
                                ))}
                              </ul>
                            ) : (
                              <span>{actor.stack}</span>
                            )}
                          </td>
                        ))}
                      </tr>
                      <tr>
                        <td className="py-3 px-4 font-semibold text-slate-600 bg-slate-50">
                          Kontakt
                        </td>
                        {sideBySideActors.map((actor) => (
                          <td key={actor.id} className="py-3 px-4">
                            <button
                              type="button"
                              onClick={() => onRequestIntro(actor.name)}
                              className="px-3 py-1.5 rounded-lg bg-[#040B16] hover:bg-[#006AA7] text-white text-xs font-bold cursor-pointer"
                            >
                              Begär intro till {actor.name}
                            </button>
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Full Category Overview Table */}
            <div className="space-y-2 pt-2">
              <div className="font-mono text-xs font-semibold text-slate-500">
                Fullständig översikt ({compareList.length} aktörer)
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-mono">
                      <th className="py-3 px-4 font-semibold">Partner</th>
                      {compareDomain === 'carriers' && (
                        <>
                          <th className="py-3 px-3 font-semibold text-right">Tjänster</th>
                          <th className="py-3 px-3 font-semibold text-right">Skåp / Ombud</th>
                          <th className="py-3 px-3 font-semibold text-right">Hemlev.</th>
                        </>
                      )}
                      <th className="py-3 px-4 font-semibold">Antal kunder</th>
                      <th className="py-3 px-4 font-semibold">Prismodell</th>
                      <th className="py-3 px-4 font-semibold">Setup-tid</th>
                      <th className="py-3 px-4 font-semibold">Passar bäst för</th>
                      <th className="py-3 px-4 font-semibold text-right">Kontakt</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {compareList.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50 align-top">
                        <td className="py-4 px-4 whitespace-nowrap">
                          <div className="font-display font-extrabold text-sm text-[#040B16]">
                            {p.name}
                          </div>
                          <div className="text-[11px] font-mono text-[#006AA7]">
                            {p.domain} · {p.origin}
                          </div>
                        </td>
                        {compareDomain === 'carriers' && (
                          <>
                            <td className="py-4 px-3 text-right font-mono font-bold text-[#040B16] tabular-nums whitespace-nowrap">
                              {p.carrierMetrics ? `${p.carrierMetrics.serviceCount} st` : '–'}
                            </td>
                            <td className="py-4 px-3 text-right font-mono text-slate-700 tabular-nums whitespace-nowrap">
                              {p.carrierMetrics
                                ? `${p.carrierMetrics.parcelLockers.toLocaleString('sv-SE')} / ${p.carrierMetrics.pickupAgents.toLocaleString('sv-SE')}`
                                : '–'}
                            </td>
                            <td className="py-4 px-3 text-right font-mono font-bold text-[#059669] tabular-nums whitespace-nowrap">
                              {p.carrierMetrics && p.carrierMetrics.homeDeliveryPct > 0
                                ? `${p.carrierMetrics.homeDeliveryPct}%`
                                : '–'}
                            </td>
                          </>
                        )}
                        <td className="py-4 px-4 font-mono font-semibold text-[#059669] tabular-nums min-w-[150px]">
                          {p.customerCount || 'Nordiska e-handlare'}
                        </td>
                        <td className="py-4 px-4 text-slate-700 min-w-[160px]">
                          {p.pricingModel || 'Offert / SaaS'}
                        </td>
                        <td className="py-4 px-4 font-mono text-slate-600 whitespace-nowrap">
                          {p.setupTime || '1–4 veckor'}
                        </td>
                        <td className="py-4 px-4 text-slate-700 min-w-[200px]">
                          {p.bestFor || p.desc}
                        </td>
                        <td className="py-4 px-4 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => onRequestIntro(p.name)}
                            className="px-3 py-1.5 rounded-lg bg-[#040B16] hover:bg-[#006AA7] text-white text-xs font-bold cursor-pointer"
                          >
                            Intro
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
                Sök & lägg till techpartners
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map((p) => (
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
                      <div className="text-xs text-slate-500 mt-0.5">{p.domain}</div>
                    </div>

                    {p.customerCount && (
                      <div className="p-2.5 rounded-xl bg-[#F4F6F9] border border-slate-200 flex items-center gap-2 text-xs">
                        <Users className="w-3.5 h-3.5 text-[#059669] shrink-0" />
                        <span className="font-semibold text-[#040B16] tabular-nums">
                          {p.customerCount}
                        </span>
                      </div>
                    )}

                    {p.carrierMetrics && (
                      <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-[#F4F6F9] border border-slate-200 text-[11px]">
                        <div>
                          <div className="font-mono text-slate-500">Leveranstjänster</div>
                          <div className="font-mono font-bold text-[#040B16] tabular-nums">
                            {p.carrierMetrics.serviceCount} st
                          </div>
                        </div>
                        <div>
                          <div className="font-mono text-slate-500">Paketskåp</div>
                          <div className="font-mono font-bold text-[#006AA7] tabular-nums">
                            {p.carrierMetrics.parcelLockers > 0
                              ? `${p.carrierMetrics.parcelLockers.toLocaleString('sv-SE')} st`
                              : '–'}
                          </div>
                        </div>
                        <div>
                          <div className="font-mono text-slate-500">Postombud</div>
                          <div className="font-mono font-bold text-[#040B16] tabular-nums">
                            {p.carrierMetrics.pickupAgents > 0
                              ? `${p.carrierMetrics.pickupAgents.toLocaleString('sv-SE')} st`
                              : '–'}
                          </div>
                        </div>
                        <div>
                          <div className="font-mono text-slate-500">Hemleverans</div>
                          <div className="font-mono font-bold text-[#059669] tabular-nums">
                            {p.carrierMetrics.homeDeliveryPct > 0
                              ? `${p.carrierMetrics.homeDeliveryPct} %`
                              : 'Utomhusbox'}
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="font-mono text-[11px] text-[#059669] font-semibold">{p.stack}</div>
                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">{p.desc}</p>
                    {p.notableClients.length > 0 && (
                      <div className="text-xs text-slate-500 pt-1">
                        <span className="font-semibold text-slate-700">Exempelkunder:</span>{' '}
                        {p.notableClients.join(', ')}
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => onRequestIntro(p.name)}
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
                        href={`https://${p.domain.replace(/^https?:\/\//, '')}`}
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
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
