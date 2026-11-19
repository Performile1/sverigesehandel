import { useState } from 'react';
import { Check, ExternalLink, Loader2, Search, Sparkles, X } from 'lucide-react';
import { api } from '../api';
import type {
  DiscoveredJobCandidate,
  DiscoveredMerchantCandidate,
  DiscoveredPartnerCandidate,
  DiscoveredRecruiterCandidate,
  GroundingSource,
} from '../types';

export type DiscoveryTargetType = 'merchants' | 'partners' | 'jobs' | 'recruiters';

interface DiscoveryModalProps {
  open: boolean;
  initialTarget: DiscoveryTargetType;
  onClose: () => void;
  onImported: () => Promise<void>;
  onNotify: (msg: string) => void;
}

const PARTNER_PRESETS = [
  {
    label: 'Svenska e-handelsplattformar',
    query:
      'Svenska och nordiska e-handelsplattformar SaaS och headless (t.ex. Askås, Jetshop, Starweb, Kodmyran, Quickbutik, Abicart)',
  },
  {
    label: 'Betallösningar & Checkout',
    query:
      'Svenska betallösningar och PSP för e-handel (t.ex. Kustom, Nets, Bambora, Mondido, Ping Payments, Zettle)',
  },
  {
    label: 'Transportörer & Paketskåp',
    query:
      'Svenska transportörer och sista-milen-aktörer för e-handel (t.ex. PostNord, DHL Freight, Bring, Instabox, Budbee, Airmee, Early Bird, Gordon Delivery)',
  },
  {
    label: 'TA-system & Checkout-frakt',
    query:
      'Svenska TA-system (Transport Administration) och checkout-fraktplattformar för e-handel (t.ex. nShift, Ingrid, Shipwallet, Logtrade, Fraktjakt, Shiplink)',
  },
  {
    label: 'Logistik, 3PL & Returer',
    query:
      'Svenska logistikpartners, 3PL och returplattformar för e-handel (t.ex. Bring Shelfless, Bonver Logistics, Aditro Logistics, Returnado, Yaytrade)',
  },
  {
    label: 'MarTech, Sök & Personalisering',
    query:
      'Svenska MarTech, produktsök, AI-personalisering och CRM-verktyg för e-handel (t.ex. Hello Retail, Clerk.io, Nosto, Voyado, Lipscore, Testfreaks)',
  },
  {
    label: 'Svenska e-handelsbyråer',
    query:
      'Ledande svenska e-handelsbyråer och integrationspartners (t.ex. Panagora, Grebban, Avensia, Columbus, Mild, Vaimo, Efab)',
  },
];

const MERCHANT_PRESETS = [
  {
    label: 'Topp svenska e-handlare',
    query:
      'Största svenska e-handlarna utanför vår lista (t.ex. NetOnNet, Dustin, CDON, Elgiganten, Jollyroom, Ellos, IKEA)',
  },
  {
    label: 'Mode & Sneakers',
    query:
      'Ledande svenska mode- och sneakerhandlare online (t.ex. Axel Arigato, Nudie Jeans, Sneakersnstuff, Care of Carl, Stronger, Chiquelle)',
  },
  {
    label: 'Sport, Hälsa & Träning',
    query:
      'Svenska e-handlare inom sport, kosttillskott och träning (t.ex. Gymgrossisten, Proteinbolaget, XXL, Stadium, Länna Sport, Addnature)',
  },
  {
    label: 'Hem, Bygg & Trädgård',
    query:
      'Svenska e-handlare inom hem, bygg och trädgård (t.ex. Bygghemma, Royal Design, Svenssons i Lammhult, Hemmy, Trademax, Desenio)',
  },
  {
    label: 'Apotek, Skönhet & Barn',
    query:
      'Svenska e-handlare inom apotek, skönhet, optik och barn (t.ex. MEDS, Apoteket, Kronans Apotek, Skincity, Bangerhead, Babyshop, Polarn O. Pyret)',
  },
];

const JOB_PRESETS = [
  {
    label: 'E-commerce Manager & Head of Ecom',
    query:
      'Aktuella lediga jobb som E-commerce Manager, Head of E-commerce eller Digital Commerce Lead hos svenska e-handlare i Stockholm, Göteborg eller Malmö',
  },
  {
    label: 'Tech, Shopify, Centra & PIM',
    query:
      'Lediga jobb för e-handelsutvecklare, Shopify/Centra frontend, backend och PIM-specialister i Sverige',
  },
  {
    label: 'Performance, CRM & Growth',
    query:
      'Lediga jobb inom Performance Marketing, Voyado CRM, SEO och Growth för svensk e-handel',
  },
  {
    label: 'Logistik, 3PL & Supply Chain',
    query:
      'Lediga jobb som Logistikchef, E-handelslogistik och Supply Chain Manager i Borås, Göteborg eller Stockholm',
  },
];

const RECRUITER_PRESETS = [
  {
    label: 'Specialiserade e-handelsrekryterare',
    query:
      'Svenska rekryteringsbyråer och headhunters specialiserade på e-handel, E-commerce Manager, MarTech och Growth',
  },
  {
    label: 'Tech & Utvecklarrekrytering',
    query:
      'Svenska rekryteringsbolag och jobbportaler för IT, e-handelsutvecklare, Shopify, .NET och Product Managers',
  },
  {
    label: 'Logistik & Supply Chain-rekrytering',
    query:
      'Svenska rekryteringsfirmor för e-handelslogistik, lagerchefer och Supply Chain Management',
  },
];

export function DiscoveryModal({
  open,
  initialTarget,
  onClose,
  onImported,
  onNotify,
}: DiscoveryModalProps) {
  const [target, setTarget] = useState<DiscoveryTargetType>(initialTarget);
  const [query, setQuery] = useState('');
  const [count, setCount] = useState(8);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [merchantCandidates, setMerchantCandidates] = useState<DiscoveredMerchantCandidate[]>([]);
  const [partnerCandidates, setPartnerCandidates] = useState<DiscoveredPartnerCandidate[]>([]);
  const [jobCandidates, setJobCandidates] = useState<DiscoveredJobCandidate[]>([]);
  const [recruiterCandidates, setRecruiterCandidates] = useState<DiscoveredRecruiterCandidate[]>([]);
  const [selectedIndexes, setSelectedIndexes] = useState<number[]>([]);
  const [sources, setSources] = useState<GroundingSource[]>([]);

  if (!open) return null;

  const activeCandidates =
    target === 'merchants'
      ? merchantCandidates
      : target === 'partners'
      ? partnerCandidates
      : target === 'jobs'
      ? jobCandidates
      : recruiterCandidates;

  const presets =
    target === 'partners'
      ? PARTNER_PRESETS
      : target === 'merchants'
      ? MERCHANT_PRESETS
      : target === 'jobs'
      ? JOB_PRESETS
      : RECRUITER_PRESETS;

  async function runDiscovery(searchQuery: string) {
    if (!searchQuery.trim() || loading) return;
    setLoading(true);
    setError(null);
    setSelectedIndexes([]);
    try {
      const res = await api.discover({
        target,
        query: searchQuery.trim(),
        count,
      });
      setSources(res.sources || []);
      if (target === 'merchants') {
        const list = res.candidates as DiscoveredMerchantCandidate[];
        setMerchantCandidates(list);
        setSelectedIndexes(list.map((c, idx) => (!c.alreadyExists ? idx : -1)).filter((i) => i >= 0));
      } else if (target === 'partners') {
        const list = res.candidates as DiscoveredPartnerCandidate[];
        setPartnerCandidates(list);
        setSelectedIndexes(list.map((c, idx) => (!c.alreadyExists ? idx : -1)).filter((i) => i >= 0));
      } else if (target === 'jobs') {
        const list = res.candidates as DiscoveredJobCandidate[];
        setJobCandidates(list);
        setSelectedIndexes(list.map((c, idx) => (!c.alreadyExists ? idx : -1)).filter((i) => i >= 0));
      } else {
        const list = res.candidates as DiscoveredRecruiterCandidate[];
        setRecruiterCandidates(list);
        setSelectedIndexes(list.map((c, idx) => (!c.alreadyExists ? idx : -1)).filter((i) => i >= 0));
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  function toggleIndex(idx: number) {
    setSelectedIndexes((prev) =>
      prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx]
    );
  }

  async function handleBatchImport() {
    if (selectedIndexes.length === 0 || importing) return;
    setImporting(true);
    setError(null);
    try {
      if (target === 'merchants') {
        const items = selectedIndexes.map((idx) => ({
          ...merchantCandidates[idx],
          status: 'published' as const,
        }));
        const result = await api.batchAddMerchants(items);
        await onImported();
        onNotify(
          `${result.added.length} e-handlare tillagda i CMS${
            result.skipped.length ? ` (${result.skipped.length} fanns redan)` : ''
          }.`
        );
      } else if (target === 'partners') {
        const items = selectedIndexes.map((idx) => ({
          ...partnerCandidates[idx],
          status: 'published' as const,
        }));
        const result = await api.batchAddPartners(items);
        await onImported();
        onNotify(
          `${result.added.length} tech-partners tillagda i CMS${
            result.skipped.length ? ` (${result.skipped.length} fanns redan)` : ''
          }.`
        );
      } else if (target === 'jobs') {
        const items = selectedIndexes.map((idx) => ({
          ...jobCandidates[idx],
          status: 'published' as const,
        }));
        const result = await api.batchAddJobs(items);
        await onImported();
        onNotify(
          `${result.added.length} jobb tillagda i CMS${
            result.skipped.length ? ` (${result.skipped.length} fanns redan)` : ''
          }.`
        );
      } else {
        const items = selectedIndexes.map((idx) => ({
          ...recruiterCandidates[idx],
          status: 'published' as const,
        }));
        const result = await api.batchAddRecruiters(items);
        await onImported();
        onNotify(
          `${result.added.length} rekryteringssidor tillagda i CMS${
            result.skipped.length ? ` (${result.skipped.length} fanns redan)` : ''
          }.`
        );
      }
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setImporting(false);
    }
  }

  const placeholderText =
    target === 'partners'
      ? 'T.ex. "Svenska headless-plattformar" eller "Betallösningar e-handel Sverige"'
      : target === 'merchants'
      ? 'T.ex. "Största svenska e-handlarna inom sport" eller "Svenska apotek online"'
      : target === 'jobs'
      ? 'T.ex. "E-commerce Manager Stockholm" eller "Shopify-utvecklare Göteborg"'
      : 'T.ex. "Rekryteringsbyråer e-handel" eller "Headhunting Supply Chain Sverige"';

  const targetNoun =
    target === 'partners'
      ? 'tech-partners'
      : target === 'merchants'
      ? 'e-handlare'
      : target === 'jobs'
      ? 'e-handelsjobb'
      : 'rekryteringssidor';

  return (
    <div className="fixed inset-0 z-50 bg-[#040B16]/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col border border-slate-200 overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="px-6 py-4 bg-[#040B16] text-white flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Sparkles className="w-5 h-5 text-[#FECC02]" />
            <div>
              <h2 className="font-display text-lg font-bold">Sök webben & lägg till i CMS</h2>
              <p className="text-xs text-slate-400">
                Hitta riktiga svenska tech-partners, e-handlare, jobb och rekryteringssidor via Google Search.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
            aria-label="Stäng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Controls */}
        <div className="p-6 border-b border-slate-200 space-y-4 bg-slate-50">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex flex-wrap bg-white p-1 rounded-xl border border-slate-200 text-xs font-bold gap-1">
              {(
                [
                  { id: 'partners', label: 'Tech Partners' },
                  { id: 'merchants', label: 'E-handlare' },
                  { id: 'jobs', label: 'Lediga jobb' },
                  { id: 'recruiters', label: 'Rekryteringssidor' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setTarget(tab.id);
                    setError(null);
                  }}
                  className={`px-3.5 py-2 rounded-lg transition-colors cursor-pointer ${
                    target === tab.id ? 'bg-[#040B16] text-white' : 'text-slate-600 hover:text-[#040B16]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-600">
              <span>Antal resultat:</span>
              <select
                value={count}
                onChange={(e) => setCount(Number(e.target.value))}
                className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 font-mono font-semibold text-xs"
              >
                <option value={5}>5</option>
                <option value={8}>8</option>
                <option value={12}>12</option>
                <option value={15}>15</option>
              </select>
            </div>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              runDiscovery(query);
            }}
            className="flex flex-col sm:flex-row gap-2.5"
          >
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={placeholderText}
                className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#006AA7]"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="px-5 py-2.5 rounded-xl bg-[#040B16] hover:bg-[#006AA7] disabled:opacity-50 text-white font-bold text-xs inline-flex items-center justify-center gap-2 transition-colors cursor-pointer whitespace-nowrap"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              {loading ? 'Söker webben...' : 'Sök & hämta'}
            </button>
          </form>

          {/* Presets */}
          <div className="flex flex-wrap gap-1.5">
            {presets.map((preset) => (
              <button
                key={preset.label}
                type="button"
                disabled={loading}
                onClick={() => {
                  setQuery(preset.query);
                  runDiscovery(preset.query);
                }}
                className="px-3 py-1.5 rounded-lg bg-white hover:bg-[#FECC02]/25 border border-slate-200 text-xs font-medium text-slate-700 transition-colors cursor-pointer disabled:opacity-50"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-medium">
              {error}
            </div>
          )}

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((n) => (
                <div key={n} className="h-20 rounded-xl bg-slate-100 animate-pulse" />
              ))}
            </div>
          ) : activeCandidates.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-sm">
              Välj ett snabbval ovan eller skriv en egen sökning för att hämta riktiga svenska {targetNoun}.
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-600 pb-2">
                <span>
                  Hittade <strong>{activeCandidates.length}</strong> träffar ·{' '}
                  <strong className="tabular-nums">{selectedIndexes.length}</strong> valda för import
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setSelectedIndexes(
                      selectedIndexes.length === activeCandidates.length
                        ? []
                        : activeCandidates.map((_, idx) => idx)
                    )
                  }
                  className="font-semibold text-[#006AA7] hover:underline cursor-pointer"
                >
                  {selectedIndexes.length === activeCandidates.length ? 'Avmarkera alla' : 'Markera alla'}
                </button>
              </div>

              {target === 'merchants' &&
                merchantCandidates.map((m, idx) => {
                  const checked = selectedIndexes.includes(idx);
                  return (
                    <label
                      key={`${m.name}-${idx}`}
                      className={`block p-4 rounded-xl border transition-colors cursor-pointer ${
                        checked ? 'border-[#006AA7] bg-[#E0F2FE]/25' : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleIndex(idx)}
                          className="mt-1 rounded border-slate-300"
                        />
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="font-display font-bold text-sm text-[#040B16]">
                              {m.name}{' '}
                              <span className="font-mono text-xs font-normal text-slate-500">({m.domain})</span>
                            </div>
                            <div className="text-xs font-mono text-slate-600 tabular-nums">
                              {m.alreadyExists ? (
                                <span className="text-amber-700 font-semibold">Finns redan i CMS</span>
                              ) : (
                                <span className="text-[#059669] font-semibold">Ny aktör</span>
                              )}
                            </div>
                          </div>
                          <div className="text-xs text-slate-500">
                            {m.category} · {m.city} · Omsättning: {m.revenue}
                            {m.yoyGrowth ? ` (${m.yoyGrowth})` : ''} · Plattform: {m.platform} · Trustpilot{' '}
                            {m.trustpilot.toFixed(1)}
                          </div>
                          <p className="text-xs text-slate-700 leading-relaxed">{m.desc}</p>
                        </div>
                      </div>
                    </label>
                  );
                })}

              {target === 'partners' &&
                partnerCandidates.map((p, idx) => {
                  const checked = selectedIndexes.includes(idx);
                  return (
                    <label
                      key={`${p.name}-${idx}`}
                      className={`block p-4 rounded-xl border transition-colors cursor-pointer ${
                        checked ? 'border-[#006AA7] bg-[#E0F2FE]/25' : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleIndex(idx)}
                          className="mt-1 rounded border-slate-300"
                        />
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="font-display font-bold text-sm text-[#040B16]">
                              {p.name}{' '}
                              <span className="font-mono text-xs font-normal text-slate-500">({p.domain})</span>
                            </div>
                            <div className="text-xs font-mono">
                              {p.alreadyExists ? (
                                <span className="text-amber-700 font-semibold">Finns redan i CMS</span>
                              ) : (
                                <span className="text-[#059669] font-semibold">Ny partner</span>
                              )}
                            </div>
                          </div>
                          <div className="text-xs text-slate-500">
                            {p.subType || p.cat} · {p.origin}
                            {p.customerCount ? ` · Kunder: ${p.customerCount}` : ''} · {p.stack}
                          </div>
                          <p className="text-xs text-slate-700 leading-relaxed">{p.desc}</p>
                        </div>
                      </div>
                    </label>
                  );
                })}

              {target === 'jobs' &&
                jobCandidates.map((j, idx) => {
                  const checked = selectedIndexes.includes(idx);
                  return (
                    <label
                      key={`${j.title}-${j.company}-${idx}`}
                      className={`block p-4 rounded-xl border transition-colors cursor-pointer ${
                        checked ? 'border-[#006AA7] bg-[#E0F2FE]/25' : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleIndex(idx)}
                          className="mt-1 rounded border-slate-300"
                        />
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="font-display font-bold text-sm text-[#040B16]">
                              {j.title}{' '}
                              <span className="font-mono text-xs font-normal text-slate-500">· {j.company}</span>
                            </div>
                            <div className="text-xs font-mono">
                              {j.alreadyExists ? (
                                <span className="text-amber-700 font-semibold">Finns redan i CMS</span>
                              ) : (
                                <span className="text-[#059669] font-semibold">Nytt jobb</span>
                              )}
                            </div>
                          </div>
                          <div className="text-xs text-slate-500">
                            {j.roleCategory} · {j.city} · {j.workModel} · {j.seniority}
                            {j.expiresAt ? ` · Giltig t.o.m. ${j.expiresAt}` : ''}
                          </div>
                          <p className="text-xs text-slate-700 leading-relaxed">{j.desc}</p>
                        </div>
                      </div>
                    </label>
                  );
                })}

              {target === 'recruiters' &&
                recruiterCandidates.map((r, idx) => {
                  const checked = selectedIndexes.includes(idx);
                  return (
                    <label
                      key={`${r.name}-${idx}`}
                      className={`block p-4 rounded-xl border transition-colors cursor-pointer ${
                        checked ? 'border-[#006AA7] bg-[#E0F2FE]/25' : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleIndex(idx)}
                          className="mt-1 rounded border-slate-300"
                        />
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="font-display font-bold text-sm text-[#040B16]">
                              {r.name}{' '}
                              <span className="font-mono text-xs font-normal text-slate-500">({r.domain})</span>
                            </div>
                            <div className="text-xs font-mono">
                              {r.alreadyExists ? (
                                <span className="text-amber-700 font-semibold">Finns redan i CMS</span>
                              ) : (
                                <span className="text-[#059669] font-semibold">Ny rekryteringssida</span>
                              )}
                            </div>
                          </div>
                          <div className="text-xs text-slate-500">
                            {r.type} · {r.coverage} · Roller: {r.rolesCovered.join(', ')}
                          </div>
                          <p className="text-xs text-slate-700 leading-relaxed">{r.desc}</p>
                        </div>
                      </div>
                    </label>
                  );
                })}

              {sources.length > 0 && (
                <div className="pt-3 border-t border-slate-200">
                  <div className="text-[11px] font-mono text-slate-500 mb-1.5">
                    Verifierade källor från Google Search:
                  </div>
                  <div className="flex flex-wrap gap-3 text-xs">
                    {sources.map((s) => (
                      <a
                        key={s.uri}
                        href={s.uri}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[#006AA7] hover:underline truncate max-w-[260px]"
                      >
                        <ExternalLink className="w-3 h-3 shrink-0" />
                        <span className="truncate">{s.title}</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            Avbryt
          </button>
          <button
            type="button"
            disabled={selectedIndexes.length === 0 || importing}
            onClick={handleBatchImport}
            className="px-5 py-2.5 rounded-xl bg-[#059669] hover:bg-[#047857] disabled:opacity-50 text-white text-xs font-bold inline-flex items-center gap-2 transition-colors cursor-pointer"
          >
            {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            Lägg till {selectedIndexes.length} valda i CMS
          </button>
        </div>
      </div>
    </div>
  );
}
