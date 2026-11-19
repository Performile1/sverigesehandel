import { CMSAccess } from './components/CMSAccess';
import { useCallback, useEffect, useRef, useState } from 'react';
import { CheckCircle2, Loader2, X } from 'lucide-react';
import { api } from './api';
import { useFirebase } from './contexts/FirebaseContext';
import { CMSStudio } from './components/CMSStudio';
import { CommunityView } from './components/CommunityView';
import { DiscoveryModal, type DiscoveryTargetType } from './components/DiscoveryModal';
import { EntityEditorModal } from './components/EntityEditorModal';
import { EventsView } from './components/EventsView';
import { HistoriaView } from './components/HistoriaView';
import { JobsView } from './components/JobsView';
import { KontaktView } from './components/KontaktView';
import { MarknadView } from './components/MarknadView';
import { MerchantsView } from './components/MerchantsView';
import { Navbar } from './components/Navbar';
import { NewsView } from './components/NewsView';
import { PartnersView } from './components/PartnersView';
import { ThreePlView } from './components/ThreePlView';
import type { CMSStore, JobRoleCategory, Merchant, PortalTab, TechPartner } from './types';

const TAB_TITLES: Record<PortalTab, string> = {
  marknad: 'Sveriges E-handel – Marknadsdata, ECDB, Statista & Tech | sverigesehandel.se',
  nyheter: 'E-handelsnyheter – Temu, Nya Butiker & SaaS i Sverige & Europa | sverigesehandel.se',
  event: 'Event & Mässor 2027 – D-Congress, E-commerce Expo & Retail Tech | sverigesehandel.se',
  ehandlare: 'Svenska E-handlare – Omsättning, Tillväxt & Tech-stack | sverigesehandel.se',
  partners: 'Jämför Betallösningar, Transportörer, TA-system & Plattformar | sverigesehandel.se',
  '3pl': '3PL & 4PL i Sverige – Logistikpartners, Fulfillment & WMS | sverigesehandel.se',
  jobb: 'Jobb inom Sveriges E-handel & Rekryteringssidor | sverigesehandel.se',
  historia: 'Svensk E-handelshistoria – Från Pixlar till AI | sverigesehandel.se',
  community: 'Sveriges E-handel Network – Branschforum & Nätverk | sverigesehandel.se',
  kontakt: 'Kontakt & Annonsering – hej@sverigesehandel.se | sverigesehandel.se',
};

function getInitialTab(): PortalTab {
  if (typeof window === 'undefined') return 'marknad';
  const hash = window.location.hash.replace('#', '').toLowerCase() as PortalTab;
  return hash && hash in TAB_TITLES ? hash : 'marknad';
}

export default function App() {
  const { user, authReady, isAdmin, authError, signInWithGoogle, signOutUser } = useFirebase();
  const fetchSequence = useRef(0);
  const [store, setStore] = useState<CMSStore | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [mode, setMode] = useState<'portal' | 'cms'>('portal');
  const [activeTab, setActiveTab] = useState<PortalTab>(getInitialTab);
  const [initialSearch, setInitialSearch] = useState<string>('');
  const [selectedAdSlot, setSelectedAdSlot] = useState<string>('');

  // Modals & Toast
  const [discoveryModal, setDiscoveryModal] = useState<{
    open: boolean;
    target: DiscoveryTargetType;
  }>({ open: false, target: 'partners' });

  const [editorModal, setEditorModal] = useState<{
    open: boolean;
    mode: 'merchant' | 'partner';
    merchant?: Merchant | null;
    partner?: TechPartner | null;
  }>({ open: false, mode: 'merchant' });

  const [jobModalOpen, setJobModalOpen] = useState(false);
  const [jobTitle, setJobTitle] = useState('');
  const [jobCompany, setJobCompany] = useState('');
  const [jobCity, setJobCity] = useState('Stockholm');
  const [jobModel, setJobModel] = useState<'Hybrid' | 'På plats' | 'Remote'>('Hybrid');
  const [jobRole, setJobRole] = useState<JobRoleCategory>('E-commerce Management');
  const [jobSeniority, setJobSeniority] = useState('Senior');
  const [jobSalary, setJobSalary] = useState('');
  const [jobUrl, setJobUrl] = useState('');
  const [jobSkills, setJobSkills] = useState('Shopify, Centra, Growth');
  const [jobDesc, setJobDesc] = useState('');
  const [jobExpiresAt, setJobExpiresAt] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 45);
    return d.toISOString().slice(0, 10);
  });

  const [infoModal, setInfoModal] = useState<{
    open: boolean;
    title: string;
    body: string;
    email: string;
  }>({ open: false, title: '', body: '', email: '' });

  const [toast, setToast] = useState<string | null>(null);

  const notify = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => {
      setToast((current) => (current === msg ? null : current));
    }, 3800);
  }, []);

  const fetchStore = useCallback(async () => {
    const sequence = ++fetchSequence.current;
    try {
      const data = await api.getStore();
      if (sequence !== fetchSequence.current) return;
      setStore({
        ...data,
        logisticsProviders: Array.isArray(data.logisticsProviders) ? data.logisticsProviders : [],
        news: Array.isArray(data.news) ? data.news : [],
      });
      setLoadError(null);
    } catch (err) {
      if (sequence === fetchSequence.current) setLoadError((err as Error).message);
    } finally {
      if (sequence === fetchSequence.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    setStore(null);
    setLoading(true);
    setEditorModal((previous) => ({ ...previous, open: false }));
    setDiscoveryModal((previous) => ({ ...previous, open: false }));
    setJobModalOpen(false);
    if (!authReady) return;
    void fetchStore();
    return () => { fetchSequence.current++; };
  }, [fetchStore, authReady, user?.uid, isAdmin]);

  useEffect(() => {
    document.title =
      mode === 'cms'
        ? 'CMS Studio | sverigesehandel.se'
        : TAB_TITLES[activeTab] || TAB_TITLES.marknad;
  }, [activeTab, mode]);

  useEffect(() => {
    if (authError) notify(authError);
  }, [authError, notify]);

  function handleNavigate(tab: PortalTab, searchQuery?: string) {
    setInitialSearch(searchQuery || '');
    setActiveTab(tab);
    if (typeof window !== 'undefined' && window.location.hash !== `#${tab}`) {
      window.history.replaceState(null, '', `#${tab}`);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handleBookAdSlot(slotName: string) {
    setSelectedAdSlot(slotName);
    handleNavigate('kontakt');
  }

  async function handlePublishJob(e: React.FormEvent) {
    e.preventDefault();
    if (!jobTitle.trim() || !jobCompany.trim()) return;
    await api.upsertJob({
      title: jobTitle.trim(),
      company: jobCompany.trim(),
      city: jobCity.trim() || 'Stockholm',
      workModel: jobModel,
      roleCategory: jobRole,
      seniority: jobSeniority.trim() || 'Senior',
      salaryRange: jobSalary.trim() || undefined,
      applyUrl: jobUrl.trim() || 'https://sverigesehandel.se',
      skills: jobSkills
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      desc: jobDesc.trim() || `${jobTitle.trim()} hos ${jobCompany.trim()}.`,
      postedAt: 'Ny idag',
      expiresAt: jobExpiresAt || undefined,
      jobStatus: 'active',
      status: 'published',
    });
    setJobModalOpen(false);
    setJobTitle('');
    setJobCompany('');
    setJobSalary('');
    setJobUrl('');
    setJobDesc('');
    await fetchStore();
    notify('Jobbannons publicerad!');
  }

  if (loading || !authReady) {
    return (
      <div className="min-h-screen bg-[#040B16] text-white flex items-center justify-center">
        <div className="flex items-center gap-3 text-sm font-medium">
          <Loader2 className="w-5 h-5 animate-spin text-[#FECC02]" />
          Laddar Sveriges E-handel CMS...
        </div>
      </div>
    );
  }

  if (loadError || !store) {
    return (
      <div className="min-h-screen bg-[#F4F6F9] flex items-center justify-center p-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-md w-full space-y-4 text-center">
          <h1 className="font-display text-xl font-bold text-[#040B16]">
            Kunde inte ansluta till CMS-servern
          </h1>
          <p className="text-xs text-slate-600">{loadError || 'Okänt fel.'}</p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={fetchStore}
              className="px-4 py-2 rounded-xl bg-[#040B16] text-white text-xs font-bold cursor-pointer"
            >
              Försök igen
            </button>
            {user && (
              <button
                type="button"
                onClick={async () => {
                  await signOutUser();
                  setLoadError(null);
                }}
                className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-[#040B16] text-xs font-semibold cursor-pointer"
              >
                Logga ut &amp; ladda publik portal
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F4F6F9]">
      <Navbar
        mode={mode}
        activeTab={activeTab}
        onSelectTab={(tab) => handleNavigate(tab)}
        onToggleMode={() => setMode((prev) => (prev === 'portal' ? 'cms' : 'portal'))}
      />

      <main className="flex-1">
        {mode === 'cms' ? (
          <CMSAccess isAdmin={isAdmin}>
            <CMSStudio
              store={store}
              onRefresh={fetchStore}
              onOpenEditor={(editorMode, item) => {
                if (editorMode === 'merchant') {
                  setEditorModal({
                    open: true,
                    mode: 'merchant',
                    merchant: (item as Merchant) || null,
                  });
                } else {
                  setEditorModal({
                    open: true,
                    mode: 'partner',
                    partner: (item as TechPartner) || null,
                  });
                }
              }}
              onNotify={notify}
            />
          </CMSAccess>
        ) : (
          <>
            {activeTab === 'marknad' && (
              <MarknadView
                merchants={store.merchants}
                logisticsProviders={store.logisticsProviders}
                regions={store.regions}
                orderBenchmarks={store.orderBenchmarks}
                shippingTiers={store.shippingTiers}
                deliveryStats={store.deliveryStats}
                laws={store.laws}
                intelligenceSources={store.intelligenceSources}
                techStackShares={store.techStackShares}
                adBanners={store.adBanners}
                merchantCount={store.merchants.filter((m) => m.status === 'published').length}
                partnerCount={store.partners.filter((p) => p.status === 'published').length}
                onNavigate={handleNavigate}
                onBookAdSlot={handleBookAdSlot}
              />
            )}
            {activeTab === 'nyheter' && (
              <NewsView
                news={store.news || []}
                adBanners={store.adBanners}
                isAdmin={isAdmin}
                onNavigate={handleNavigate}
                onBookAdSlot={handleBookAdSlot}
                onRefresh={fetchStore}
                onNotify={notify}
                onRequireAdmin={() => setMode('cms')}
              />
            )}
            {activeTab === 'event' && (
              <EventsView
                events={store.events}
                sessions={store.sessions}
                adBanners={store.adBanners}
                onNavigate={handleNavigate}
                onBookAdSlot={handleBookAdSlot}
                onNotify={notify}
                onOpenModal={(title, body) =>
                  setInfoModal({ open: true, title, body, email: '' })
                }
              />
            )}
            {activeTab === 'historia' && <HistoriaView timeline={store.timeline} />}
            {activeTab === 'ehandlare' && (
              <MerchantsView
                orderBenchmarks={store.orderBenchmarks}
                merchants={store.merchants}
                adBanners={store.adBanners}
                initialSearch={initialSearch}
                onNavigate={handleNavigate}
                onBookAdSlot={handleBookAdSlot}
                onOpenDiscover={() =>
                  isAdmin ? setDiscoveryModal({ open: true, target: 'merchants' }) : setMode('cms')
                }
                onOpenEditor={(merchant) =>
                  isAdmin ? setEditorModal({
                    open: true,
                    mode: 'merchant',
                    merchant: merchant || null,
                  }) : setMode('cms')
                }
              />
            )}
            {activeTab === 'partners' && (
              <PartnersView
                partners={store.partners}
                adBanners={store.adBanners}
                initialSearch={initialSearch}
                onNavigate={handleNavigate}
                onBookAdSlot={handleBookAdSlot}
                onOpenDiscover={() =>
                  isAdmin ? setDiscoveryModal({ open: true, target: 'partners' }) : setMode('cms')
                }
                onOpenEditor={(partner) =>
                  isAdmin ? setEditorModal({
                    open: true,
                    mode: 'partner',
                    partner: partner || null,
                  }) : setMode('cms')
                }
                onRequestIntro={(partnerName) =>
                  setInfoModal({
                    open: true,
                    title: `Kontakta ${partnerName}`,
                    body: `Ange din e-post så kopplar vi ihop dig med rätt partneransvarig hos ${partnerName}.`,
                    email: '',
                  })
                }
              />
            )}
            {activeTab === '3pl' && (
              <ThreePlView
                logisticsProviders={store.logisticsProviders}
                adBanners={store.adBanners}
                initialSearch={initialSearch}
                isAdmin={isAdmin}
                onRequireAdmin={() => setMode('cms')}
                onNavigate={handleNavigate}
                onBookAdSlot={handleBookAdSlot}
                onRefresh={fetchStore}
                onNotify={notify}
                onRequestIntro={(providerName) =>
                  setInfoModal({
                    open: true,
                    title: `Kontakta ${providerName}`,
                    body: `Ange din e-post så kopplar vi ihop dig med rätt logistikansvarig hos ${providerName}.`,
                    email: '',
                  })
                }
              />
            )}
            {activeTab === 'jobb' && (
              <JobsView
                jobs={store.jobs}
                recruitmentSites={store.recruitmentSites}
                adBanners={store.adBanners}
                onNavigate={handleNavigate}
                onBookAdSlot={handleBookAdSlot}
                onOpenDiscoverJobs={() =>
                  isAdmin ? setDiscoveryModal({ open: true, target: 'jobs' }) : setMode('cms')
                }
                onOpenDiscoverRecruiters={() =>
                  isAdmin ? setDiscoveryModal({ open: true, target: 'recruiters' }) : setMode('cms')
                }
                onOpenJobModal={() => isAdmin ? setJobModalOpen(true) : setMode('cms')}
                onApplyJob={(job) =>
                  setInfoModal({
                    open: true,
                    title: `Intresseanmälan: ${job.title}`,
                    body: `${job.company} (${job.city} · ${job.workModel}). Ange din e-post eller LinkedIn-adress så förmedlar vi din intresseanmälan.`,
                    email: '',
                  })
                }
              />
            )}
            {activeTab === 'community' && (
              <CommunityView
                threads={store.communityThreads}
                memberCount={store.communityMemberCount ?? store.communityMembers.length}
                memberCities={
                  store.communityMemberCities ??
                  Array.from(
                    new Set(store.communityMembers.map((m) => m.city.trim()).filter(Boolean))
                  )
                }
                userDisplayName={user?.displayName || null}
                userEmail={user?.email || null}
                isSignedIn={Boolean(user)}
                onSignIn={() => {
                  void signInWithGoogle();
                }}
                onAddThread={async (payload) => {
                  await api.addThread(payload);
                  await fetchStore();
                  notify('Din tråd har publicerats i nätverket.');
                }}
                onUpvote={async (id) => {
                  await api.upvoteThread(id);
                  await fetchStore();
                }}
                onJoinMember={async (payload) => {
                  await api.addMember(payload);
                  await fetchStore();
                  notify(`Tack ${payload.name}! Din ansökan till nätverket (${payload.city}) är mottagen.`);
                }}
              />
            )}
            {activeTab === 'kontakt' && (
              <KontaktView
                adBanners={store.adBanners}
                initialAdSlot={selectedAdSlot}
                onSubmitContact={async (payload) => {
                  await api.submitContactMessage(payload);
                  await fetchStore();
                }}
                onNotify={notify}
              />
            )}
          </>
        )}
      </main>

      {mode === 'portal' && (
        <footer className="bg-[#040B16] text-slate-400 border-t border-white/10 mt-16">
          <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 pb-8 border-b border-white/10">
              <div className="md:col-span-4 space-y-3">
                <div className="font-display font-extrabold text-xl text-white">
                  sverigesehandel<span className="text-[#FECC02]">.se</span>
                </div>
                <p className="text-xs sm:text-sm text-slate-400 max-w-md leading-relaxed">
                  Sveriges kunskaps- och CMS-plattform för digital handel. Marknadsdata från ECDB, Statista, BuiltWith, Wappalyzer, Tembi, HUI Research & Paketindex.
                </p>
                <div className="pt-1 text-xs space-y-1">
                  <div>
                    Redaktion & Annons:{' '}
                    <a
                      href="mailto:hej@sverigesehandel.se"
                      className="text-[#FECC02] font-semibold hover:underline"
                    >
                      hej@sverigesehandel.se
                    </a>
                  </div>
                  <div>
                    Checkout & konvertering:{' '}
                    <a
                      href="https://checkoutstrategi.se"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-white font-semibold hover:text-[#FECC02] underline"
                    >
                      checkoutstrategi.se
                    </a>
                  </div>
                </div>
              </div>

              <div className="md:col-span-2">
                <h4 className="text-xs font-mono font-bold text-[#FECC02] mb-3">Plattform</h4>
                <ul className="space-y-2 text-xs">
                  <li>
                    <a
                      href="#marknad"
                      onClick={(e) => {
                        e.preventDefault();
                        handleNavigate('marknad');
                      }}
                      className="hover:text-white"
                    >
                      Marknad & regional data
                    </a>
                  </li>
                  <li>
                    <a
                      href="#nyheter"
                      onClick={(e) => {
                        e.preventDefault();
                        handleNavigate('nyheter');
                      }}
                      className="hover:text-white"
                    >
                      Nyheter &amp; Trender
                    </a>
                  </li>
                  <li>
                    <a
                      href="#event"
                      onClick={(e) => {
                        e.preventDefault();
                        handleNavigate('event');
                      }}
                      className="hover:text-white"
                    >
                      D-Congress & Event 2027
                    </a>
                  </li>
                  <li>
                    <a
                      href="#historia"
                      onClick={(e) => {
                        e.preventDefault();
                        handleNavigate('historia');
                      }}
                      className="hover:text-white"
                    >
                      Från Pixlar till AI
                    </a>
                  </li>
                  <li>
                    <a
                      href="#ehandlare"
                      onClick={(e) => {
                        e.preventDefault();
                        handleNavigate('ehandlare');
                      }}
                      className="hover:text-white"
                    >
                      E-handlare & Omsättning
                    </a>
                  </li>
                </ul>
              </div>

              <div className="md:col-span-3">
                <h4 className="text-xs font-mono font-bold text-[#FECC02] mb-3">Ekosystem & Kontakt</h4>
                <ul className="space-y-2 text-xs">
                  <li>
                    <a
                      href="#partners"
                      onClick={(e) => {
                        e.preventDefault();
                        handleNavigate('partners');
                      }}
                      className="hover:text-white"
                    >
                      Jämför betalning, frakt & TA
                    </a>
                  </li>
                  <li>
                    <a
                      href="#3pl"
                      onClick={(e) => {
                        e.preventDefault();
                        handleNavigate('3pl');
                      }}
                      className="hover:text-white"
                    >
                      3PL & 4PL i Sverige
                    </a>
                  </li>
                  <li>
                    <a
                      href="#jobb"
                      onClick={(e) => {
                        e.preventDefault();
                        handleNavigate('jobb');
                      }}
                      className="hover:text-white"
                    >
                      Jobb & rekryteringssidor
                    </a>
                  </li>
                  <li>
                    <a
                      href="#community"
                      onClick={(e) => {
                        e.preventDefault();
                        handleNavigate('community');
                      }}
                      className="hover:text-white"
                    >
                      Sveriges E-handel Network
                    </a>
                  </li>
                  <li>
                    <a
                      href="#kontakt"
                      onClick={(e) => {
                        e.preventDefault();
                        handleNavigate('kontakt');
                      }}
                      className="hover:text-white font-semibold text-white"
                    >
                      Kontakt & Annonsbanners
                    </a>
                  </li>
                </ul>
              </div>

              <div className="md:col-span-3">
                <h4 className="text-xs font-mono font-bold text-[#FECC02] mb-3">Datakällor & Partnerlänkar</h4>
                <ul className="space-y-2 text-xs">
                  <li>
                    <a
                      href="https://checkoutstrategi.se"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-white font-semibold text-white"
                    >
                      Checkoutstrategi.se (Kassa & PSP)
                    </a>
                  </li>
                  <li>
                    <a
                      href="https://dcongress.se"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-white"
                    >
                      D-Congress 2027 (Göteborg)
                    </a>
                  </li>
                  <li>
                    <a
                      href="https://ecommercedb.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-white"
                    >
                      ECDB (ecommerceDB) & Statista
                    </a>
                  </li>
                  <li>
                    <a
                      href="https://builtwith.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-white"
                    >
                      BuiltWith & Wappalyzer Tech Index
                    </a>
                  </li>
                  <li>
                    <a
                      href="https://tembi.io"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-white"
                    >
                      Tembi · HUI Research · Paketindex
                    </a>
                  </li>
                </ul>
              </div>
            </div>
            <div className="pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
              <p>© 2026–2027 sverigesehandel.se · hej@sverigesehandel.se · Byggd för svensk e-handel.</p>
              <p className="font-mono tabular-nums">
                Katalog: {store.merchants.length} e-handlare · {store.partners.length} tech-partners · {(store.logisticsProviders || []).length} 3PL/4PL · {store.events.length} event · {store.jobs.length} jobb
              </p>
            </div>
          </div>
        </footer>
      )}

      {/* AI Discovery Modal */}
      <DiscoveryModal
        key={`${discoveryModal.open}-${discoveryModal.target}`}
        open={isAdmin && discoveryModal.open}
        initialTarget={discoveryModal.target}
        onClose={() => setDiscoveryModal((prev) => ({ ...prev, open: false }))}
        onImported={fetchStore}
        onNotify={notify}
      />

      {/* Entity Editor Modal */}
      <EntityEditorModal
        open={isAdmin && editorModal.open}
        mode={editorModal.mode}
        merchant={editorModal.merchant}
        partner={editorModal.partner}
        onClose={() => setEditorModal((prev) => ({ ...prev, open: false }))}
        onSaved={fetchStore}
        onNotify={notify}
      />

      {/* Publish Job Modal */}
      {isAdmin && jobModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#040B16]/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-bold text-[#006AA7]">Publicera jobbannons</span>
              <button
                type="button"
                onClick={() => setJobModalOpen(false)}
                className="text-slate-400 hover:text-slate-800 p-1"
                aria-label="Stäng"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <h3 className="font-display text-xl font-extrabold text-[#040B16]">
              Lägg till roll inom svensk e-handel
            </h3>
            <form onSubmit={handlePublishJob} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  required
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  placeholder="Rolltitel *"
                  className="px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs"
                />
                <input
                  type="text"
                  required
                  value={jobCompany}
                  onChange={(e) => setJobCompany(e.target.value)}
                  placeholder="Företag *"
                  className="px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs"
                />
                <input
                  type="text"
                  value={jobCity}
                  onChange={(e) => setJobCity(e.target.value)}
                  placeholder="Stad"
                  className="px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs"
                />
                <select
                  value={jobModel}
                  onChange={(e) => setJobModel(e.target.value as 'Hybrid' | 'På plats' | 'Remote')}
                  className="px-3 py-2.5 rounded-xl border border-slate-200 text-xs bg-white"
                >
                  <option value="Hybrid">Hybrid</option>
                  <option value="På plats">På plats</option>
                  <option value="Remote">Remote</option>
                </select>
                <select
                  value={jobRole}
                  onChange={(e) => setJobRole(e.target.value as JobRoleCategory)}
                  className="px-3 py-2.5 rounded-xl border border-slate-200 text-xs bg-white"
                >
                  <option value="E-commerce Management">E-commerce Management</option>
                  <option value="Tech & Utveckling">Tech & Utveckling</option>
                  <option value="Growth & MarTech">Growth & MarTech</option>
                  <option value="Logistik & Supply Chain">Logistik & Supply Chain</option>
                  <option value="Merchandising & CX">Merchandising & CX</option>
                </select>
                <input
                  type="text"
                  value={jobSeniority}
                  onChange={(e) => setJobSeniority(e.target.value)}
                  placeholder="Nivå (t.ex. Senior)"
                  className="px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  value={jobSalary}
                  onChange={(e) => setJobSalary(e.target.value)}
                  placeholder="Lönespann (valfritt)"
                  className="px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs"
                />
                <input
                  type="text"
                  value={jobUrl}
                  onChange={(e) => setJobUrl(e.target.value)}
                  placeholder="Ansökningslänk (https://...)"
                  className="px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  value={jobSkills}
                  onChange={(e) => setJobSkills(e.target.value)}
                  placeholder="Kompetenser (komma-separerat)"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs"
                />
                <input
                  type="date"
                  value={jobExpiresAt}
                  onChange={(e) => setJobExpiresAt(e.target.value)}
                  title="Sista ansökningsdag"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono"
                />
              </div>
              <textarea
                rows={3}
                value={jobDesc}
                onChange={(e) => setJobDesc(e.target.value)}
                placeholder="Kort beskrivning av rollen..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs"
              />
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setJobModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Avbryt
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-[#040B16] text-white hover:bg-[#006AA7] cursor-pointer"
                >
                  Publicera jobb
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Info / Ticket Confirmation Modal */}
      {infoModal.open && (
        <div className="fixed inset-0 z-50 bg-[#040B16]/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-bold text-[#006AA7]">sverigesehandel.se</span>
              <button
                type="button"
                onClick={() => setInfoModal((prev) => ({ ...prev, open: false }))}
                className="text-slate-400 hover:text-slate-800 p-1"
                aria-label="Stäng"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <h3 className="font-display text-xl font-extrabold text-[#040B16]">
              {infoModal.title}
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed">{infoModal.body}</p>
            <input
              type="email"
              value={infoModal.email}
              onChange={(e) => setInfoModal((prev) => ({ ...prev, email: e.target.value }))}
              placeholder="din@epost.se"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#006AA7]"
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setInfoModal((prev) => ({ ...prev, open: false }))}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Avbryt
              </button>
              <button
                type="button"
                onClick={() => {
                  setInfoModal((prev) => ({ ...prev, open: false }));
                  notify('Bekräftat! Information har skickats till din e-post.');
                }}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-[#040B16] text-white hover:bg-[#006AA7] cursor-pointer"
              >
                Bekräfta
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 bg-[#040B16] text-white px-5 py-3.5 rounded-xl shadow-2xl border border-[#FECC02]/40 text-xs font-semibold flex items-center gap-2.5">
          <CheckCircle2 className="w-4 h-4 text-[#FECC02] shrink-0" />
          <span>{toast}</span>
        </div>
      )}
    </div>
  );
}
