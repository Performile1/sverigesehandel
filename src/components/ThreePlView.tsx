import { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  ExternalLink,
  LayoutGrid,
  List,
  Pencil,
  Plus,
  Search,
  Warehouse,
  X,
} from 'lucide-react';
import { api } from '../api';
import type {
  AdBanner,
  ContactFormConfig,
  LogisticsProvider,
  LogisticsRoleType,
  PageCopyBlock,
  PortalTab,
  PublishStatus,
} from '../types';
import { AdBannerSlot } from './AdBannerSlot';
import { PageFormSlot } from './DynamicFormWidget';

interface ThreePlViewProps {
  logisticsProviders: LogisticsProvider[];
  adBanners: AdBanner[];
  contactForms?: ContactFormConfig[];
  pageCopy?: PageCopyBlock;
  initialSearch?: string;
  isAdmin?: boolean;
  onRequireAdmin?: () => void;
  onNavigate: (tab: PortalTab, searchQuery?: string) => void;
  onBookAdSlot: (slotName: string) => void;
  onRefresh: () => Promise<void>;
  onNotify: (message: string) => void;
  onRequestIntro: (provider: LogisticsProvider) => void;
}

const REGION_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'all', label: 'Alla regioner' },
  { value: 'vast', label: 'Västsverige (Gbg / Borås)' },
  { value: 'svealand', label: 'Svealand & Mälardalen' },
  { value: 'smaland', label: 'Småland & Östergötland' },
  { value: 'syd', label: 'Sydsverige & Öresund' },
  { value: 'norrland', label: 'Norrland' },
];

const REGION_LABEL_MAP: Record<string, string> = {
  vast: 'Västsverige',
  svealand: 'Svealand',
  smaland: 'Småland & Östergötland',
  syd: 'Sydsverige',
  norrland: 'Norrland',
};

export function ThreePlView({
  logisticsProviders = [],
  adBanners = [],
  contactForms = [],
  pageCopy,
  initialSearch = '',
  isAdmin = false,
  onRequireAdmin,
  onNavigate,
  onBookAdSlot,
  onRefresh,
  onNotify,
  onRequestIntro,
}: ThreePlViewProps) {
  const [viewMode, setViewMode] = useState<'list' | 'cards'>('list');
  const [typeFilter, setTypeFilter] = useState<'all' | '3PL' | '4PL' | '3PL & 4PL'>('all');
  const [regionFilter, setRegionFilter] = useState<string>('all');
  const [search, setSearch] = useState<string>(initialSearch);

  // Modal state for adding / editing 3PL & 4PL providers
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | undefined>(undefined);
  const [saving, setSaving] = useState(false);
  const [formName, setFormName] = useState('');
  const [formDomain, setFormDomain] = useState('');
  const [formType, setFormType] = useState<LogisticsRoleType>('3PL');
  const [formHqCity, setFormHqCity] = useState('Jönköping');
  const [formRegion, setFormRegion] = useState('smaland');
  const [formWarehouses, setFormWarehouses] = useState('Jönköping, Borås');
  const [formSqm, setFormSqm] = useState('25 000 m²');
  const [formAutomation, setFormAutomation] = useState('AutoStore & plockrobot');
  const [formWms, setFormWms] = useState('Ongoing WMS');
  const [formMinVol, setFormMinVol] = useState('Från 15 000 ordrar/år');
  const [formCutoff, setFormCutoff] = useState('17:00');
  const [formPricing, setFormPricing] = useState('Startavgift + pallplats + plock/order');
  const [formIntegrations, setFormIntegrations] = useState('Centra, Shopify, Ingrid, nShift');
  const [formSpecialties, setFormSpecialties] = useState('Mode & D2C, Returhantering');
  const [formClients, setFormClients] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formIntroEmail, setFormIntroEmail] = useState('');
  const [formIntroRoutingMode, setFormIntroRoutingMode] = useState<'default' | 'self' | 'direct'>('default');

  useEffect(() => {
    setSearch(initialSearch);
  }, [initialSearch]);

  const published = useMemo(
    () => (logisticsProviders || []).filter((lp) => lp.status === 'published'),
    [logisticsProviders]
  );

  const counts = useMemo(() => {
    const pure3pl = published.filter((lp) => lp.logisticsType === '3PL').length;
    const pure4pl = published.filter((lp) => lp.logisticsType === '4PL').length;
    const hybrid = published.filter((lp) => lp.logisticsType === '3PL & 4PL').length;
    const cities = new Set(
      published.flatMap((lp) => lp.warehouseCities.map((c) => c.trim())).filter(Boolean)
    );
    return { total: published.length, pure3pl, pure4pl, hybrid, cityCount: cities.size };
  }, [published]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return published.filter((lp) => {
      const matchesType =
        typeFilter === 'all'
          ? true
          : typeFilter === '3PL'
          ? lp.logisticsType === '3PL' || lp.logisticsType === '3PL & 4PL'
          : typeFilter === '4PL'
          ? lp.logisticsType === '4PL' || lp.logisticsType === '3PL & 4PL'
          : lp.logisticsType === typeFilter;

      const matchesRegion = regionFilter === 'all' || lp.region === regionFilter;

      const matchesSearch =
        !q ||
        lp.name.toLowerCase().includes(q) ||
        lp.hqCity.toLowerCase().includes(q) ||
        lp.wmsPlatform.toLowerCase().includes(q) ||
        lp.automation.toLowerCase().includes(q) ||
        lp.desc.toLowerCase().includes(q) ||
        lp.warehouseCities.some((c) => c.toLowerCase().includes(q)) ||
        lp.specialties.some((s) => s.toLowerCase().includes(q)) ||
        lp.integrations.some((i) => i.toLowerCase().includes(q)) ||
        lp.notableClients.some((c) => c.toLowerCase().includes(q));

      return matchesType && matchesRegion && matchesSearch;
    });
  }, [published, typeFilter, regionFilter, search]);

  function openEditor(provider?: LogisticsProvider) {
    if (!isAdmin && onRequireAdmin) {
      onRequireAdmin();
      return;
    }
    if (provider) {
      setEditingId(provider.id);
      setFormName(provider.name);
      setFormDomain(provider.domain);
      setFormType(provider.logisticsType);
      setFormHqCity(provider.hqCity);
      setFormRegion(provider.region || 'smaland');
      setFormWarehouses(provider.warehouseCities.join(', '));
      setFormSqm(provider.warehouseSqm);
      setFormAutomation(provider.automation);
      setFormWms(provider.wmsPlatform);
      setFormMinVol(provider.minOrderVolume);
      setFormCutoff(provider.cutoffTime);
      setFormPricing(provider.pricingModel);
      setFormIntegrations(provider.integrations.join(', '));
      setFormSpecialties(provider.specialties.join(', '));
      setFormClients(provider.notableClients.join(', '));
      setFormDesc(provider.desc);
      setFormIntroEmail(provider.introEmail ?? '');
      setFormIntroRoutingMode(provider.introRoutingMode ?? 'default');
    } else {
      setEditingId(undefined);
      setFormName('');
      setFormDomain('');
      setFormType('3PL');
      setFormHqCity('Jönköping');
      setFormRegion('smaland');
      setFormWarehouses('Jönköping');
      setFormSqm('25 000 m²');
      setFormAutomation('AutoStore & plockrobot');
      setFormWms('Ongoing WMS');
      setFormMinVol('Från 15 000 ordrar/år');
      setFormCutoff('17:00');
      setFormPricing('Startavgift + pallplats + plock/order');
      setFormIntegrations('Centra, Shopify, Ingrid, nShift');
      setFormSpecialties('E-handel D2C, Returhantering');
      setFormClients('');
      setFormDesc('');
      setFormIntroEmail('');
      setFormIntroRoutingMode('default');
    }
    setModalOpen(true);
  }

  async function handleSaveProvider(e: React.FormEvent) {
    e.preventDefault();
    if (!formName.trim()) return;
    setSaving(true);
    try {
      const splitCsv = (val: string) =>
        val
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);

      await api.upsertLogisticsProvider({
        id: editingId,
        name: formName.trim(),
        domain: formDomain.trim() || `${formName.trim().toLowerCase().replace(/\s+/g, '')}.se`,
        logisticsType: formType,
        hqCity: formHqCity.trim() || 'Stockholm',
        region: formRegion,
        warehouseCities: splitCsv(formWarehouses),
        warehouseSqm: formSqm.trim() || 'Ej angivet',
        automation: formAutomation.trim() || 'Manuell & semi-automatiserad',
        wmsPlatform: formWms.trim() || 'Ongoing WMS',
        minOrderVolume: formMinVol.trim() || 'Enligt offert',
        cutoffTime: formCutoff.trim() || '16:30',
        pricingModel: formPricing.trim() || 'Plock + lageryta + frakt',
        integrations: splitCsv(formIntegrations),
        specialties: splitCsv(formSpecialties),
        notableClients: splitCsv(formClients),
        desc:
          formDesc.trim() ||
          `${formName.trim()} erbjuder ${formType}-tjänster för nordiska e-handlare.`,
        introEmail: formIntroEmail.trim() || undefined,
        introRoutingMode: formIntroRoutingMode,
        status: 'published' as PublishStatus,
      });

      setModalOpen(false);
      await onRefresh();
      onNotify(
        editingId
          ? `${formName.trim()} har uppdaterats i 3PL & 4PL-listan.`
          : `${formName.trim()} har lagts till i 3PL & 4PL-listan.`
      );
    } catch (err) {
      onNotify((err as Error).message || 'Kunde inte spara logistikpartner.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
      {/* Dark Hero Header & Filter Controls */}
      <div className="bg-gradient-to-br from-[#040B16] via-[#0A1628] to-[#022C22] text-white border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="font-mono text-xs text-[#FECC02] font-semibold">
              {pageCopy?.kicker || 'Svensk E-handelslogistik'} · {counts.total} verifierade 3PL &amp; 4PL-aktörer
            </div>
            <h1 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight">
              {pageCopy?.title || '3PL & 4PL i Sverige – Fulfillment, WMS & Kontrolltorn'}
            </h1>
            <p className="text-slate-300 text-sm sm:text-base max-w-3xl leading-relaxed">
              {pageCopy?.subtitle ||
                'Komplett jämförelselista över tredjepartslogistik (3PL) och fjärdepartslogistik (4PL) för svensk e-handel. Jämför lagerorter, AutoStore-automation, WMS-system, stopptider (cut-off) och minsta ordervolym.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <div className="inline-flex bg-white/10 p-1 rounded-xl text-xs font-bold">
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`px-3.5 py-2 rounded-lg inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                  viewMode === 'list'
                    ? 'bg-[#FECC02] text-[#040B16]'
                    : 'text-slate-200 hover:text-white'
                }`}
              >
                <List className="w-3.5 h-3.5" />
                Lista &amp; Jämförelse
              </button>
              <button
                type="button"
                onClick={() => setViewMode('cards')}
                className={`px-3.5 py-2 rounded-lg inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                  viewMode === 'cards'
                    ? 'bg-[#FECC02] text-[#040B16]'
                    : 'text-slate-200 hover:text-white'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                Detaljkort
              </button>
            </div>

            <button
              type="button"
              onClick={() => openEditor(undefined)}
              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-white font-semibold text-xs inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-4 h-4 text-[#FECC02]" />
              Lägg till 3PL / 4PL
            </button>
          </div>
        </div>

        {/* Summary KPI Strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 pt-4 border-t border-white/10">
          <div className="bg-white/5 border border-white/10 rounded-xl p-3.5">
            <div className="text-[11px] font-mono text-slate-400">Aktiva aktörer totalt</div>
            <div className="font-display text-2xl font-extrabold text-white mt-0.5 tabular-nums">
              {counts.total} st
            </div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-3.5">
            <div className="text-[11px] font-mono text-slate-400">3PL &amp; Hybrid (Fulfillment)</div>
            <div className="font-display text-2xl font-extrabold text-[#FECC02] mt-0.5 tabular-nums">
              {counts.pure3pl + counts.hybrid} st
            </div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-3.5">
            <div className="text-[11px] font-mono text-slate-400">4PL &amp; Kontrolltorn</div>
            <div className="font-display text-2xl font-extrabold text-[#10B981] mt-0.5 tabular-nums">
              {counts.pure4pl + counts.hybrid} st
            </div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-3.5">
            <div className="text-[11px] font-mono text-slate-400">Täckta logistikorter</div>
            <div className="font-display text-2xl font-extrabold text-white mt-0.5 tabular-nums">
              {counts.cityCount} orter
            </div>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pt-4 border-t border-white/10">
          <div className="flex flex-wrap items-center gap-2">
            {(
              [
                { id: 'all', label: `Alla (${counts.total})` },
                { id: '3PL', label: '3PL (Lager & Plock)' },
                { id: '4PL', label: '4PL (Kontrolltorn)' },
                { id: '3PL & 4PL', label: 'Kombinerad 3PL + 4PL' },
              ] as const
            ).map((btn) => (
              <button
                key={btn.id}
                type="button"
                onClick={() => setTypeFilter(btn.id)}
                className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                  typeFilter === btn.id
                    ? 'bg-[#FECC02] text-[#040B16]'
                    : 'bg-white/10 hover:bg-white/20 text-white'
                }`}
              >
                {btn.label}
              </button>
            ))}

            <select
              value={regionFilter}
              onChange={(e) => setRegionFilter(e.target.value)}
              aria-label="Filtrera på region"
              className="bg-white/10 border border-white/15 rounded-lg px-3 py-2 text-xs font-semibold text-white focus:outline-none focus:border-[#FECC02]"
            >
              {REGION_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value} className="text-[#040B16]">
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="relative w-full lg:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Sök 3PL, stad, WMS (Ongoing), AutoStore..."
              className="w-full bg-white/10 border border-white/15 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-[#FECC02]"
            />
          </div>
        </div>
      </div>

      {/* Quick 3PL vs 4PL Decision Matrix */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-2">
          <div className="font-mono text-xs font-semibold text-slate-500">
            Fas 1 · Under 15 000 paket/år
          </div>
          <h2 className="font-display text-lg font-extrabold text-[#040B16]">
            Eget lager + TA-system
          </h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            Vid lägre volym ger eget lager i kombination med Ongoing/Shiphero och TA-system (nShift, Shiplink, Fraktjakt) full kontroll och lägst fast månadskostnad.
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-2">
          <div className="font-mono text-xs font-semibold text-[#006AA7]">
            Fas 2 · 10 000 – 500 000+ paket/år
          </div>
          <h2 className="font-display text-lg font-extrabold text-[#040B16]">
            3PL (Tredjepartslogistik)
          </h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            Partnern äger och driver lagret, personalen och AutoStore-robotiken (t.ex. Bring Shelfless, Nowaste, PostNord TPL, Aditro Logistics). Du betalar per pallplats, plock och frakt.
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-2">
          <div className="font-mono text-xs font-semibold text-[#059669]">
            Fas 3 · Multi-lager &amp; global skala
          </div>
          <h2 className="font-display text-lg font-extrabold text-[#040B16]">
            4PL (Fjärdepartslogistik)
          </h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            Oberoende kontrolltorn utan egna lastbilar som orkestrerar flera 3PL-lager, rederier, tull och transportavtal i ett gemensamt TMS/BI-lager (t.ex. 4PLCS, Inquire, KN Integrated).
          </p>
        </div>
      </section>

      <AdBannerSlot
        banners={adBanners}
        placement="partners-top"
        onNavigate={onNavigate}
        onBookSlot={onBookAdSlot}
      />

      <PageFormSlot
        forms={contactForms}
        page="3pl"
        position="top"
        adBanners={adBanners}
        onSubmitted={onRefresh}
        onNotify={onNotify}
      />

      {/* Empty State */}
      {filtered.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center space-y-4">
          <Warehouse className="w-8 h-8 text-slate-400 mx-auto" />
          <p className="text-sm text-slate-600">
            Inga 3PL- eller 4PL-aktörer matchade din filtrering ({search || REGION_LABEL_MAP[regionFilter] || typeFilter}).
          </p>
          <button
            type="button"
            onClick={() => {
              setTypeFilter('all');
              setRegionFilter('all');
              setSearch('');
            }}
            className="px-4 py-2 rounded-xl bg-[#040B16] text-white text-xs font-bold cursor-pointer"
          >
            Återställ filter
          </button>
        </div>
      ) : viewMode === 'list' ? (
        /* Structured Scannable List / Comparison Table without horizontal overflow */
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="px-4 sm:px-5 py-3.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="font-display text-base sm:text-lg font-extrabold text-[#040B16]">
                Komplett lista: 3PL &amp; 4PL i Sverige ({filtered.length} aktörer)
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-500">
                Kompakt översikt över lagerorter, yta, WMS, automation, stopptid och minsta volym.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <button
                type="button"
                onClick={() => onNavigate('partners')}
                className="font-semibold text-[#006AA7] hover:underline cursor-pointer inline-flex items-center gap-1"
              >
                Jämför transportörer &amp; TA-system
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Desktop compact fixed table (fits 100% width with zero scrollbar) */}
          <div className="hidden lg:block">
            <table className="w-full table-fixed text-left border-collapse text-[11px]">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-mono">
                  <th className="w-[22%] py-2.5 pl-4 pr-2 font-semibold">Aktör &amp; Domän</th>
                  <th className="w-[8%] py-2.5 px-2 font-semibold">Typ</th>
                  <th className="w-[19%] py-2.5 px-2 font-semibold">Lagerorter &amp; Yta</th>
                  <th className="w-[19%] py-2.5 px-2 font-semibold">WMS &amp; Automation</th>
                  <th className="w-[9%] py-2.5 px-2 font-semibold">Stopptid</th>
                  <th className="w-[13%] py-2.5 px-2 font-semibold">Min. volym</th>
                  <th className="w-[10%] py-2.5 pl-2 pr-4 font-semibold text-right">Åtgärd</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((lp) => {
                  const shortDomain = lp.domain.replace(/^https?:\/\//, '').split('/')[0];
                  return (
                    <tr key={lp.id} className="hover:bg-slate-50 align-top">
                      <td className="py-2.5 pl-4 pr-2 break-words">
                        <div className="font-display font-bold text-xs text-[#040B16] leading-tight">
                          {lp.name}
                        </div>
                        <div className="text-[10px] font-mono text-[#006AA7] mt-0.5 leading-snug truncate">
                          {shortDomain} · {lp.hqCity}
                        </div>
                        {lp.notableClients.length > 0 && (
                          <div className="text-[10px] text-slate-500 mt-0.5 truncate" title={lp.notableClients.join(', ')}>
                            {lp.notableClients.slice(0, 2).join(', ')}
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-2 font-mono font-bold leading-snug">
                        <span
                          className={
                            lp.logisticsType === '4PL'
                              ? 'text-[#059669]'
                              : lp.logisticsType === '3PL & 4PL'
                              ? 'text-amber-700'
                              : 'text-[#006AA7]'
                          }
                        >
                          {lp.logisticsType}
                        </span>
                        <div className="text-[10px] font-sans font-normal text-slate-500 mt-0.5 leading-tight">
                          {REGION_LABEL_MAP[lp.region] || lp.region}
                        </div>
                      </td>
                      <td className="py-2.5 px-2 break-words leading-snug">
                        <div className="font-semibold text-[#040B16]">
                          {lp.warehouseCities.join(', ')}
                        </div>
                        <div className="text-[10px] font-mono text-slate-600 mt-0.5 tabular-nums">
                          {lp.warehouseSqm}
                        </div>
                      </td>
                      <td className="py-2.5 px-2 break-words leading-snug">
                        <div className="font-mono font-semibold text-[#059669]">{lp.wmsPlatform}</div>
                        <div className="text-[10px] text-slate-600 mt-0.5">{lp.automation}</div>
                      </td>
                      <td className="py-2.5 px-2 font-mono font-bold text-[#040B16] tabular-nums leading-snug break-words">
                        {lp.cutoffTime}
                      </td>
                      <td className="py-2.5 px-2 text-slate-700 break-words leading-snug">
                        <div className="font-medium text-[#040B16]">{lp.minOrderVolume}</div>
                        <div className="text-[10px] text-slate-500 mt-0.5 line-clamp-2" title={lp.pricingModel}>
                          {lp.pricingModel}
                        </div>
                      </td>
                      <td className="py-2.5 pl-2 pr-4 text-right">
                        <div className="inline-flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => onRequestIntro(lp)}
                            className="px-2 py-1 rounded-md bg-[#040B16] hover:bg-[#006AA7] text-white text-[11px] font-bold cursor-pointer"
                          >
                            Intro
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditor(lp)}
                            className="p-1 rounded-md text-slate-500 hover:text-[#040B16] hover:bg-slate-100 cursor-pointer"
                            title={`Redigera ${lp.name}`}
                            aria-label={`Redigera ${lp.name}`}
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                          <a
                            href={`https://${lp.domain.replace(/^https?:\/\//, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 rounded-md text-slate-500 hover:text-[#006AA7] hover:bg-slate-100"
                            title={`Besök ${lp.domain}`}
                            aria-label={`Besök ${lp.name}`}
                          >
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile & Tablet compact list rows (zero horizontal scroll) */}
          <div className="lg:hidden divide-y divide-slate-100">
            {filtered.map((lp) => {
              const shortDomain = lp.domain.replace(/^https?:\/\//, '').split('/')[0];
              return (
                <div key={lp.id} className="p-3.5 space-y-2 text-xs">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                        <span className="font-display font-bold text-sm text-[#040B16]">
                          {lp.name}
                        </span>
                        <span
                          className={`font-mono text-[11px] font-bold ${
                            lp.logisticsType === '4PL'
                              ? 'text-[#059669]'
                              : lp.logisticsType === '3PL & 4PL'
                              ? 'text-amber-700'
                              : 'text-[#006AA7]'
                          }`}
                        >
                          {lp.logisticsType}
                        </span>
                      </div>
                      <div className="text-[11px] font-mono text-[#006AA7] truncate">
                        {shortDomain} · {lp.hqCity}
                      </div>
                    </div>
                    <div className="inline-flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => onRequestIntro(lp)}
                        className="px-2.5 py-1 rounded-lg bg-[#040B16] hover:bg-[#006AA7] text-white text-[11px] font-bold cursor-pointer"
                      >
                        Intro
                      </button>
                      <button
                        type="button"
                        onClick={() => openEditor(lp)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-[#040B16] hover:bg-slate-100 cursor-pointer"
                        aria-label={`Redigera ${lp.name}`}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <a
                        href={`https://${lp.domain.replace(/^https?:\/\//, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded-lg text-slate-500 hover:text-[#006AA7] hover:bg-slate-100"
                        aria-label={`Besök ${lp.name}`}
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] leading-snug bg-slate-50 rounded-xl p-2.5">
                    <div>
                      <span className="text-slate-500 font-mono block text-[10px]">Lager &amp; Yta</span>
                      <span className="font-semibold text-[#040B16]">{lp.warehouseCities.join(', ')}</span>
                      <span className="block text-slate-600 font-mono">{lp.warehouseSqm}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 font-mono block text-[10px]">WMS &amp; Auto</span>
                      <span className="font-mono font-semibold text-[#059669]">{lp.wmsPlatform}</span>
                      <span className="block text-slate-600">{lp.automation}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 font-mono block text-[10px]">Stopptid</span>
                      <span className="font-mono font-bold text-[#040B16]">{lp.cutoffTime}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 font-mono block text-[10px]">Min. volym</span>
                      <span className="font-medium text-[#040B16]">{lp.minOrderVolume}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Detailed Cards Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((lp) => (
            <article
              key={lp.id}
              className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col justify-between space-y-4 hover:border-slate-300 transition-colors"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs gap-2">
                  <span
                    className={`font-mono font-bold ${
                      lp.logisticsType === '4PL'
                        ? 'text-[#059669]'
                        : lp.logisticsType === '3PL & 4PL'
                        ? 'text-amber-700'
                        : 'text-[#006AA7]'
                    }`}
                  >
                    {lp.logisticsType} · {REGION_LABEL_MAP[lp.region] || lp.region}
                  </span>
                  <span className="font-mono text-slate-500 shrink-0">HQ {lp.hqCity}</span>
                </div>

                <div>
                  <h3 className="font-display text-2xl font-extrabold text-[#040B16]">{lp.name}</h3>
                  <div className="text-xs text-slate-500 mt-0.5">{lp.domain}</div>
                </div>

                <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-[#F4F6F9] border border-slate-200 text-xs">
                  <div>
                    <div className="text-[11px] font-mono text-slate-500">Yta / Kapacitet</div>
                    <div className="font-bold text-[#040B16] tabular-nums mt-0.5">
                      {lp.warehouseSqm}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] font-mono text-slate-500">Stopptid (Cut-off)</div>
                    <div className="font-bold text-[#059669] tabular-nums mt-0.5">
                      {lp.cutoffTime}
                    </div>
                  </div>
                </div>

                <div className="font-mono text-[11px] text-[#006AA7] font-semibold">
                  {lp.wmsPlatform} · {lp.automation}
                </div>

                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">{lp.desc}</p>

                <div className="text-xs text-slate-600 space-y-1 pt-1">
                  <div>
                    <span className="font-semibold text-[#040B16]">Lagerorter:</span>{' '}
                    {lp.warehouseCities.join(', ')}
                  </div>
                  <div>
                    <span className="font-semibold text-[#040B16]">Specialitet:</span>{' '}
                    {lp.specialties.join(' · ')}
                  </div>
                  <div>
                    <span className="font-semibold text-[#040B16]">Integrationer:</span>{' '}
                    {lp.integrations.join(', ')}
                  </div>
                  {lp.notableClients.length > 0 && (
                    <div>
                      <span className="font-semibold text-[#040B16]">Exempelkunder:</span>{' '}
                      {lp.notableClients.join(', ')}
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => onRequestIntro(lp)}
                  className="text-xs font-bold text-[#040B16] hover:text-[#006AA7] transition-colors cursor-pointer"
                >
                  Begär offert / intro &rarr;
                </button>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => openEditor(lp)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-[#040B16] hover:bg-slate-100 transition-colors cursor-pointer"
                    title="Redigera"
                    aria-label={`Redigera ${lp.name}`}
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <a
                    href={`https://${lp.domain.replace(/^https?:\/\//, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 rounded-lg text-slate-500 hover:text-[#006AA7] hover:bg-slate-100 transition-colors"
                    title={`Besök ${lp.domain}`}
                    aria-label={`Besök ${lp.name}`}
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      <PageFormSlot
        forms={contactForms}
        page="3pl"
        position="mid"
        adBanners={adBanners}
        onSubmitted={onRefresh}
        onNotify={onNotify}
      />

      {/* Cross-links footer box */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="text-xs font-mono font-semibold text-[#059669]">
            Koppla ihop lagervolym med fraktkostnad
          </div>
          <h3 className="font-display text-lg font-extrabold text-[#040B16]">
            Se hur din års-volym påverkar plockkostnad &amp; transportavtal
          </h3>
        </div>
        <div className="flex flex-wrap gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => onNavigate('marknad')}
            className="px-4 py-2.5 rounded-xl border border-slate-300 hover:border-[#040B16] text-xs font-bold text-[#040B16] cursor-pointer"
          >
            Öppna Order- &amp; Fraktekonomi
          </button>
          <button
            type="button"
            onClick={() => onNavigate('partners')}
            className="px-4 py-2.5 rounded-xl bg-[#040B16] hover:bg-[#006AA7] text-white text-xs font-bold cursor-pointer"
          >
            Jämför Transportörer &amp; TA &rarr;
          </button>
        </div>
      </div>

      <PageFormSlot
        forms={contactForms}
        page="3pl"
        position="bottom"
        adBanners={adBanners}
        onSubmitted={onRefresh}
        onNotify={onNotify}
      />

      {/* Add / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-[#040B16]/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 my-8">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-bold text-[#006AA7]">
                {editingId ? 'Redigera 3PL / 4PL-aktör' : 'Lägg till ny 3PL / 4PL-aktör'}
              </span>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-800 p-1 cursor-pointer"
                aria-label="Stäng"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveProvider} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Företagsnamn *"
                  className="px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs"
                />
                <input
                  type="text"
                  value={formDomain}
                  onChange={(e) => setFormDomain(e.target.value)}
                  placeholder="Domän (t.ex. shelfless.se)"
                  className="px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs"
                />
                <select
                  value={formType}
                  onChange={(e) => setFormType(e.target.value as LogisticsRoleType)}
                  className="px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs bg-white"
                >
                  <option value="3PL">3PL (Lager &amp; Fulfillment)</option>
                  <option value="4PL">4PL (Kontrolltorn &amp; Orkestrering)</option>
                  <option value="3PL & 4PL">Kombinerad 3PL &amp; 4PL</option>
                </select>
                <select
                  value={formRegion}
                  onChange={(e) => setFormRegion(e.target.value)}
                  className="px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs bg-white"
                >
                  <option value="vast">Västsverige (Gbg / Borås)</option>
                  <option value="svealand">Svealand &amp; Mälardalen</option>
                  <option value="smaland">Småland &amp; Östergötland</option>
                  <option value="syd">Sydsverige &amp; Öresund</option>
                  <option value="norrland">Norrland</option>
                </select>
                <input
                  type="text"
                  value={formHqCity}
                  onChange={(e) => setFormHqCity(e.target.value)}
                  placeholder="Huvudsäte (stad)"
                  className="px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs"
                />
                <input
                  type="text"
                  value={formWarehouses}
                  onChange={(e) => setFormWarehouses(e.target.value)}
                  placeholder="Lagerorter (komma-separerat)"
                  className="px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs"
                />
                <input
                  type="text"
                  value={formSqm}
                  onChange={(e) => setFormSqm(e.target.value)}
                  placeholder="Lageryta (t.ex. 80 000+ m²)"
                  className="px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs"
                />
                <input
                  type="text"
                  value={formCutoff}
                  onChange={(e) => setFormCutoff(e.target.value)}
                  placeholder="Stopptid / Cut-off (t.ex. 18:00)"
                  className="px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs"
                />
                <input
                  type="text"
                  value={formWms}
                  onChange={(e) => setFormWms(e.target.value)}
                  placeholder="WMS-plattform (t.ex. Ongoing WMS)"
                  className="px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs"
                />
                <input
                  type="text"
                  value={formAutomation}
                  onChange={(e) => setFormAutomation(e.target.value)}
                  placeholder="Automation (t.ex. AutoStore, AGV)"
                  className="px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs"
                />
                <input
                  type="text"
                  value={formMinVol}
                  onChange={(e) => setFormMinVol(e.target.value)}
                  placeholder="Minsta ordervolym"
                  className="px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs"
                />
                <input
                  type="text"
                  value={formPricing}
                  onChange={(e) => setFormPricing(e.target.value)}
                  placeholder="Prismodell"
                  className="px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs"
                />
              </div>

              <input
                type="text"
                value={formIntegrations}
                onChange={(e) => setFormIntegrations(e.target.value)}
                placeholder="Integrationer (komma-separerat: Centra, Shopify, Ingrid, nShift)"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs"
              />
              <input
                type="text"
                value={formSpecialties}
                onChange={(e) => setFormSpecialties(e.target.value)}
                placeholder="Specialiteter (komma-separerat)"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs"
              />
              <input
                type="text"
                value={formClients}
                onChange={(e) => setFormClients(e.target.value)}
                placeholder="Exempelkunder (komma-separerat)"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs"
              />
              <textarea
                rows={3}
                value={formDesc}
                onChange={(e) => setFormDesc(e.target.value)}
                placeholder="Beskrivning av logistikerbjudande och styrkor..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs"
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
                <input
                  type="email"
                  value={formIntroEmail}
                  onChange={(e) => setFormIntroEmail(e.target.value)}
                  placeholder="Intro-mottagarmejl (t.ex. sales@3pl.se)"
                  className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs"
                />
                <select
                  value={formIntroRoutingMode}
                  onChange={(e) =>
                    setFormIntroRoutingMode(e.target.value as 'default' | 'self' | 'direct')
                  }
                  className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs"
                >
                  <option value="default">Routing: Följ Intro-formulärets standard</option>
                  <option value="self">Routing: Ta hand om själv först</option>
                  <option value="direct">Routing: Skicka direkt till partner</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Avbryt
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-[#040B16] text-white hover:bg-[#006AA7] disabled:opacity-50 cursor-pointer"
                >
                  {saving ? 'Sparar...' : editingId ? 'Spara ändringar' : 'Lägg till aktör'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
