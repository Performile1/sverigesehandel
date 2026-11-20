import { articleUrl } from '../../shared/editorial';
import { useMemo, useState } from 'react';
import {
  Check,
  ExternalLink,
  Globe,
  Loader2,
  Newspaper,
  Plus,
  Search,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { api } from '../api';
import type {
  AdBanner,
  ContactFormConfig,
  EcommerceNewsItem,
  GroundingSource,
  NewsCategory,
  PageCopyBlock,
  PortalTab,
} from '../types';
import { AdBannerSlot } from './AdBannerSlot';
import { CheckoutStrategyCTA } from './CheckoutStrategyCTA';
import { PageFormSlot } from './DynamicFormWidget';

interface NewsViewProps {
  news: EcommerceNewsItem[];
  adBanners: AdBanner[];
  contactForms?: ContactFormConfig[];
  pageCopy?: PageCopyBlock;
  isAdmin?: boolean;
  onNavigate: (tab: PortalTab, searchQuery?: string) => void;
  onBookAdSlot: (slotName: string) => void;
  onRefresh: () => Promise<void>;
  onFormSubmitted?: () => Promise<void> | void;
  onNotify: (msg: string) => void;
  onRequireAdmin?: () => void;
}

const NEWS_CATEGORIES: Array<'Alla' | NewsCategory> = [
  'Alla',
  'Temu & Marknadsplatser',
  'Nya Butiker (SE & EU)',
  'SaaS & System',
  'Logistik & Regler',
];

const NEWS_REGIONS = ['Alla', 'Sverige', 'Europa', 'Norden', 'Globalt'] as const;

const AI_NEWS_PRESETS: Array<{ label: string; topic: string }> = [
  {
    label: 'Temu & EU-tullar',
    topic:
      'Senaste nyheterna om Temu, Shein, marknadsplatser, EU-tullar (150 EUR-gränsen) och konsumentregler i Europa 2026–2027',
  },
  {
    label: 'Nya butiker i SE & Europa',
    topic:
      'Nya e-handelsbutiker och D2C-varumärken som öppnar eller expanderar i Sverige och Europa 2026–2027',
  },
  {
    label: 'Nya SaaS & Checkout-system',
    topic:
      'Nya SaaS-plattformar, checkout-lösningar, AI-verktyg och affärssystem inom svensk och europeisk e-handel 2026–2027',
  },
  {
    label: 'Logistik, Skåp & PPWR',
    topic:
      'Nyheter om iBoxen, Instabee, PostNord, 3PL och EU:s förpackningsregler PPWR i Sverige och Norden',
  },
];

type NewsCandidate = Omit<EcommerceNewsItem, 'id' | 'status'> & { alreadyExists?: boolean };

export function NewsView({
  news = [],
  adBanners = [],
  contactForms = [],
  pageCopy,
  isAdmin = false,
  onNavigate,
  onBookAdSlot,
  onRefresh,
  onFormSubmitted,
  onNotify,
  onRequireAdmin,
}: NewsViewProps) {
  const [catFilter, setCatFilter] = useState<'Alla' | NewsCategory>('Alla');
  const [regionFilter, setRegionFilter] = useState<string>('Alla');
  const [search, setSearch] = useState('');

  // AI News Fetch state
  const [aiTopic, setAiTopic] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiCandidates, setAiCandidates] = useState<NewsCandidate[]>([]);
  const [aiSources, setAiSources] = useState<GroundingSource[]>([]);
  const [aiSelected, setAiSelected] = useState<number[]>([]);
  const [aiSaving, setAiSaving] = useState(false);

  // Manual Quick-Add Form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newSummary, setNewSummary] = useState('');
  const [newCategory, setNewCategory] = useState<NewsCategory>('Temu & Marknadsplatser');
  const [newRegion, setNewRegion] = useState<'Sverige' | 'Europa' | 'Norden' | 'Globalt'>('Europa');
  const [newSourceName, setNewSourceName] = useState('');
  const [newSourceUrl, setNewSourceUrl] = useState('');
  const [newImpactNote, setNewImpactNote] = useState('');
  const [newTags, setNewTags] = useState('E-handel, Europa');
  const [savingManual, setSavingManual] = useState(false);

  const published = useMemo(
    () =>
      news
        .filter((item) => item.status === 'published')
        .sort((a, b) => (b.publishedDate || '').localeCompare(a.publishedDate || '')),
    [news]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return published.filter((item) => {
      const matchCat = catFilter === 'Alla' || item.category === catFilter;
      const matchRegion = regionFilter === 'Alla' || item.region === regionFilter;
      const matchQ =
        !q ||
        item.title.toLowerCase().includes(q) ||
        item.summary.toLowerCase().includes(q) ||
        item.sourceName.toLowerCase().includes(q) ||
        (item.impactNote || '').toLowerCase().includes(q) ||
        (item.tags || []).some((t) => t.toLowerCase().includes(q));
      return matchCat && matchRegion && matchQ;
    });
  }, [published, catFilter, regionFilter, search]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { Alla: published.length };
    for (const item of published) {
      counts[item.category] = (counts[item.category] || 0) + 1;
    }
    return counts;
  }, [published]);

  async function handleFetchNews(topicToFetch: string) {
    if (!isAdmin) {
      onRequireAdmin?.();
      return;
    }
    const topic = topicToFetch.trim() || AI_NEWS_PRESETS[0].topic;
    setAiTopic(topic);
    setAiLoading(true);
    setAiError(null);
    setAiSelected([]);
    try {
      const res = await api.fetchNewsWithAI({ topic, count: 6, autoSave: false });
      setAiCandidates(res.candidates || []);
      setAiSources(res.sources || []);
      setAiSelected(
        (res.candidates || [])
          .map((c, idx) => (!c.alreadyExists ? idx : -1))
          .filter((idx) => idx >= 0)
      );
      if (!res.candidates || res.candidates.length === 0) {
        setAiError('Inga nya verifierade nyheter hittades för detta ämne just nu.');
      }
    } catch (err) {
      setAiError((err as Error).message);
    } finally {
      setAiLoading(false);
    }
  }

  async function handleImportSelectedAI() {
    if (aiSelected.length === 0 || aiSaving) return;
    setAiSaving(true);
    setAiError(null);
    try {
      const items = aiSelected.map((idx) => ({
        ...aiCandidates[idx],
        status: 'draft' as const,
      }));
      const res = await api.batchAddNews(items);
      await onRefresh();
      onNotify(
        `${res.added.length} nyhetsutkast sparade för länkgranskning${
          res.skipped.length ? ` (${res.skipped.length} hoppades över som dubbletter)` : ''
        }.`
      );
      setAiCandidates([]);
      setAiSelected([]);
      setAiSources([]);
    } catch (err) {
      setAiError((err as Error).message);
    } finally {
      setAiSaving(false);
    }
  }

  async function handleCreateManualNews(e: React.FormEvent) {
    e.preventDefault();
    if (!isAdmin) {
      onRequireAdmin?.();
      return;
    }
    if (!newTitle.trim() || !newSummary.trim()) return;
    setSavingManual(true);
    try {
      await api.upsertNews({
        title: newTitle.trim(),
        summary: newSummary.trim(),
        category: newCategory,
        region: newRegion,
        sourceName: newSourceName.trim() || 'sverigesehandel.se Redaktion',
        sourceUrl: newSourceUrl.trim(),
        publishedDate: new Date().toISOString().slice(0, 10),
        impactNote: newImpactNote.trim() || undefined,
        tags: newTags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
        status: 'draft',
      });
      setNewTitle('');
      setNewSummary('');
      setNewSourceName('');
      setNewSourceUrl('');
      setNewImpactNote('');
      setShowAddForm(false);
      await onRefresh();
      onNotify('Nyheten sparad som utkast. Granska direktlänken före publicering.');
    } catch (err) {
      onNotify((err as Error).message);
    } finally {
      setSavingManual(false);
    }
  }

  return (
    <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#040B16] via-[#0A1628] to-[#022C22] text-white border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="font-mono text-xs text-[#FECC02] font-semibold inline-flex items-center gap-1.5">
              <Newspaper className="w-3.5 h-3.5" />
              {pageCopy?.kicker || 'Branschnyheter & Omvärldsbevakning'} · {published.length} publicerade artiklar
            </div>
            <h1 className="font-display text-3xl sm:text-4xl font-extrabold leading-tight">
              {pageCopy?.title || 'Nyheter inom Svensk & Europeisk E-handel'}
            </h1>
            <p className="text-slate-300 text-sm sm:text-base max-w-3xl leading-relaxed">
              {pageCopy?.subtitle ||
                'Kurerad och Google Search-groundad bevakning av Temu och marknadsplatser i Europa, nya e-handelsbutiker som öppnar i Sverige & EU, samt nya SaaS-system, checkout-plattformar och logistikregler.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => {
                if (!isAdmin) {
                  onRequireAdmin?.();
                  return;
                }
                setShowAddForm((prev) => !prev);
              }}
              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-white font-semibold text-xs inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-4 h-4 text-[#FECC02]" />
              {showAddForm ? 'Stäng formulär' : 'Publicera nyhet'}
            </button>
          </div>
        </div>

        {/* Category & Search Controls */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pt-6 border-t border-white/10">
          <div className="flex flex-wrap gap-1.5">
            {NEWS_CATEGORIES.map((cat) => {
              const active = catFilter === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCatFilter(cat)}
                  className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                    active
                      ? 'bg-[#FECC02] text-[#040B16]'
                      : 'bg-white/10 hover:bg-white/20 text-white'
                  }`}
                >
                  {cat}{' '}
                  <span className="font-mono opacity-80 tabular-nums">
                    ({categoryCounts[cat] ?? 0})
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            <select
              value={regionFilter}
              onChange={(e) => setRegionFilter(e.target.value)}
              aria-label="Filtrera på region"
              className="bg-white/10 border border-white/15 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-white focus:outline-none focus:border-[#FECC02]"
            >
              {NEWS_REGIONS.map((reg) => (
                <option key={reg} value={reg} className="text-[#040B16]">
                  {reg === 'Alla' ? 'Alla regioner' : reg}
                </option>
              ))}
            </select>

            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Sök Temu, SaaS, butik, källa..."
                className="w-full bg-white/10 border border-white/15 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-[#FECC02]"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Live Google Search News Fetch Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div className="text-xs font-mono font-semibold text-[#006AA7] inline-flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5" />
              Live-bevakning via Google Search
            </div>
            <h2 className="font-display text-lg font-extrabold text-[#040B16] mt-0.5">
              Hämta färska branschnyheter från webben
            </h2>
          </div>
          {!isAdmin && (
            <button
              type="button"
              onClick={() => onRequireAdmin?.()}
              className="text-xs font-bold text-[#006AA7] hover:underline self-start md:self-auto cursor-pointer"
            >
              Logga in som admin i CMS för live-hämtning &rarr;
            </button>
          )}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void handleFetchNews(aiTopic);
          }}
          className="flex flex-col sm:flex-row gap-2.5"
        >
          <input
            type="text"
            value={aiTopic}
            onChange={(e) => setAiTopic(e.target.value)}
            placeholder="Skriv ämne, t.ex. Temu EU-tullar, nya SaaS-system, nya nätbutiker i Norden..."
            className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#006AA7]"
          />
          <button
            type="submit"
            disabled={aiLoading}
            className="px-4 py-2.5 rounded-xl bg-[#040B16] hover:bg-[#006AA7] disabled:opacity-50 text-white text-xs font-bold inline-flex items-center justify-center gap-2 whitespace-nowrap shrink-0 cursor-pointer transition-colors"
          >
            {aiLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-[#FECC02]" />
            ) : (
              <Sparkles className="w-4 h-4 text-[#FECC02]" />
            )}
            {aiLoading ? 'Hämtar via Google Search...' : 'Hämta senaste nyheter'}
          </button>
        </form>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-mono text-slate-500">Snabbämnen:</span>
          {AI_NEWS_PRESETS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              disabled={aiLoading}
              onClick={() => void handleFetchNews(preset.topic)}
              className="px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-[#FECC02]/25 border border-slate-200 text-xs font-semibold text-[#040B16] transition-colors cursor-pointer disabled:opacity-50 whitespace-nowrap"
            >
              {preset.label}
            </button>
          ))}
        </div>

        {aiError && (
          <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-medium">
            {aiError}
          </div>
        )}

        {aiCandidates.length > 0 && (
          <div className="border border-slate-200 rounded-xl overflow-hidden mt-3">
            <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs text-slate-700">
                Hittade <strong>{aiCandidates.length}</strong> nyhetsartiklar ·{' '}
                <strong className="tabular-nums">{aiSelected.length}</strong> valda
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() =>
                    setAiSelected(
                      aiSelected.length === aiCandidates.length
                        ? []
                        : aiCandidates.map((_, idx) => idx)
                    )
                  }
                  className="text-xs font-semibold text-[#006AA7] hover:underline cursor-pointer"
                >
                  {aiSelected.length === aiCandidates.length ? 'Avmarkera alla' : 'Markera alla'}
                </button>
                <button
                  type="button"
                  disabled={aiSelected.length === 0 || aiSaving}
                  onClick={handleImportSelectedAI}
                  className="px-4 py-2 rounded-lg bg-[#059669] hover:bg-[#047857] disabled:opacity-50 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  {aiSaving ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Check className="w-3.5 h-3.5" />
                  )}
                  Spara {aiSelected.length} valda som utkast
                </button>
              </div>
            </div>

            <div className="divide-y divide-slate-200">
              {aiCandidates.map((item, idx) => {
                const checked = aiSelected.includes(idx);
                return (
                  <label
                    key={`${item.title}-${idx}`}
                    className={`flex items-start gap-3 px-5 py-4 cursor-pointer transition-colors ${
                      checked ? 'bg-[#E0F2FE]/25' : 'hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() =>
                        setAiSelected((prev) =>
                          prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx]
                        )
                      }
                      className="mt-1 rounded border-slate-300"
                    />
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                        <span className="font-mono font-semibold text-[#006AA7]">
                          {item.category} · {item.region} · {item.publishedDate}
                        </span>
                        <span
                          className={`font-mono font-semibold ${
                            item.alreadyExists ? 'text-amber-700' : 'text-[#059669]'
                          }`}
                        >
                          {item.alreadyExists ? 'Finns redan' : 'Ny artikel'}
                        </span>
                      </div>
                      <div className="font-display font-bold text-sm text-[#040B16]">
                        {item.title}
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed">{item.summary}</p>
                      <div className="text-[11px] text-slate-500 break-all">Källa: {item.sourceName} · Föreslagen direktlänk: {item.sourceUrl || 'Saknas – behöver granskas'}</div>
                    </div>
                  </label>
                );
              })}
            </div>

            {aiSources.length > 0 && (
              <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 text-[11px] text-slate-600 flex flex-wrap gap-x-4 gap-y-1">
                <span className="font-mono font-semibold text-slate-500">Google-källor:</span>
                {aiSources.map((src, i) => (
                  <a
                    key={`${src.uri}-${i}`}
                    href={src.uri}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#006AA7] hover:underline inline-flex items-center gap-1"
                  >
                    {src.title}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Admin Quick-Add Form */}
      {isAdmin && showAddForm && (
        <form
          onSubmit={handleCreateManualNews}
          className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4"
        >
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-display text-lg font-extrabold text-[#040B16]">
              Skapa nyhetsutkast i CMS
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input
              type="text"
              required
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Rubrik *"
              className="sm:col-span-2 px-3.5 py-2 rounded-xl border border-slate-200 text-xs"
            />
            <select
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value as NewsCategory)}
              className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs bg-white"
            >
              <option value="Temu & Marknadsplatser">Temu & Marknadsplatser</option>
              <option value="Nya Butiker (SE & EU)">Nya Butiker (SE & EU)</option>
              <option value="SaaS & System">SaaS & System</option>
              <option value="Logistik & Regler">Logistik & Regler</option>
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <select
              value={newRegion}
              onChange={(e) =>
                setNewRegion(e.target.value as 'Sverige' | 'Europa' | 'Norden' | 'Globalt')
              }
              className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs bg-white"
            >
              <option value="Sverige">Sverige</option>
              <option value="Europa">Europa</option>
              <option value="Norden">Norden</option>
              <option value="Globalt">Globalt</option>
            </select>
            <input
              type="text"
              value={newSourceName}
              onChange={(e) => setNewSourceName(e.target.value)}
              placeholder="Källa (t.ex. Breakit, Ehandel.se)"
              className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs"
            />
            <input
              type="url"
              value={newSourceUrl}
              onChange={(e) => setNewSourceUrl(e.target.value)}
              placeholder="Käll-URL (https://...)"
              className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs"
            />
          </div>

          <textarea
            required
            rows={3}
            value={newSummary}
            onChange={(e) => setNewSummary(e.target.value)}
            placeholder="Sammanfattning av nyheten (2–3 meningar) *"
            className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              type="text"
              value={newImpactNote}
              onChange={(e) => setNewImpactNote(e.target.value)}
              placeholder="Konsekvens för svenska e-handlare (valfritt)"
              className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs"
            />
            <input
              type="text"
              value={newTags}
              onChange={(e) => setNewTags(e.target.value)}
              placeholder="Taggar (komma-separerat)"
              className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs"
            />
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
            >
              Avbryt
            </button>
            <button
              type="submit"
              disabled={savingManual}
              className="px-5 py-2 rounded-xl bg-[#040B16] hover:bg-[#006AA7] text-white text-xs font-bold cursor-pointer disabled:opacity-50"
            >
              {savingManual ? 'Sparar...' : 'Spara utkast'}
            </button>
          </div>
        </form>
      )}

      <AdBannerSlot
        banners={adBanners}
        placement="ehandlare-top"
        onNavigate={onNavigate}
        onBookSlot={onBookAdSlot}
      />

      <PageFormSlot
        forms={contactForms}
        page="nyheter"
        position="top"
        adBanners={adBanners}
        onSubmitted={onFormSubmitted || onRefresh}
        onNotify={onNotify}
      />

      {/* News Grid */}
      {filtered.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center space-y-3">
          <p className="text-sm text-slate-600">
            Inga nyheter matchade ditt filter. Testa att byta kategori eller hämta nya artiklar via Google Search ovan.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filtered.map((item) => (
            <article
              key={item.id}
              className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col justify-between space-y-4 hover:border-slate-300 transition-colors"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2 text-xs font-mono">
                  <span className="font-semibold text-[#006AA7]">
                    {item.category} · {item.region}
                  </span>
                  <span className="text-slate-500 tabular-nums shrink-0">{item.publishedDate}</span>
                </div>

                <h2 className="font-display text-xl font-extrabold text-[#040B16] leading-snug">
                  {item.linkReviewedAt && articleUrl(item.sourceUrl)
                    ? <a href={articleUrl(item.sourceUrl)!} target="_blank" rel="noopener noreferrer" className="hover:underline">{item.title}</a>
                    : item.title}
                </h2>

                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">{item.summary}</p>

                {item.impactNote && (
                  <div className="p-3.5 rounded-xl bg-[#F4F6F9] border border-slate-200 text-xs text-[#040B16] leading-relaxed">
                    <span className="font-mono text-[11px] font-bold text-[#059669] block mb-0.5">
                      Betydelse för svenska e-handlare
                    </span>
                    {item.impactNote}
                  </div>
                )}

                {item.tags && item.tags.length > 0 && (
                  <div className="text-[11px] font-mono text-slate-500">
                    {item.tags.join(' · ')}
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
                {item.linkReviewedAt && articleUrl(item.sourceUrl) ? <a
                  href={articleUrl(item.sourceUrl)!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-bold text-[#040B16] hover:text-[#006AA7] inline-flex items-center gap-1.5 transition-colors"
                >
                  <span>Läs originalartikeln · {item.sourceName}</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a> : <span className="text-xs text-amber-800">Källa: {item.sourceName} · Direktlänk behöver granskas</span>}

                {isAdmin && (
                  <button
                    type="button"
                    onClick={async () => {
                      await api.deleteNews(item.id);
                      await onRefresh();
                      onNotify(`Tog bort nyheten "${item.title}".`);
                    }}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                    title="Ta bort artikel från CMS"
                    aria-label={`Ta bort ${item.title}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      <PageFormSlot
        forms={contactForms}
        page="nyheter"
        position="mid"
        adBanners={adBanners}
        onSubmitted={onFormSubmitted || onRefresh}
        onNotify={onNotify}
      />

      <CheckoutStrategyCTA compact />

      <PageFormSlot
        forms={contactForms}
        page="nyheter"
        position="bottom"
        adBanners={adBanners}
        onSubmitted={onFormSubmitted || onRefresh}
        onNotify={onNotify}
      />
    </div>
  );
}
