import { CommerceEditor } from './CommerceEditor';
import { ABOUT_CONTENT } from '../../shared/portalContent';
import { MemberGovernancePanel } from './MemberGovernancePanel';
import { InsightPostsEditor } from './InsightPostsEditor';
import { PaketindexArchiveEditor } from './PaketindexArchiveEditor';
import { CmsFirebasePanel } from './CmsFirebasePanel';
import { MapPointsEditor } from './MapPointsEditor';
import { JobTextPanel, NewsReviewPanel } from './EditorialPanels';
import { useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  Briefcase,
  Building2,
  Calendar,
  Check,
  ClipboardList,
  Clock,
  Database,
  Download,
  ExternalLink,
  FileText,
  Layers,
  LayoutDashboard,
  Loader2,
  MapPin,
  Megaphone,
  Newspaper,
  Pencil,
  Plus,
  RotateCcw,
  Scale,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  Warehouse,
  Users,
} from 'lucide-react';
import { api } from '../api';
import { useFirebase } from '../contexts/FirebaseContext';
import { CMSFormsSection } from './CMSFormsSection';
import { CMSInboxPanel } from './CMSInboxPanel';
import type {
  AdBanner,
  CMSSection,
  CMSStore,
  DCSession,
  DiscoveredJobCandidate,
  DiscoveredMerchantCandidate,
  DiscoveredPartnerCandidate,
  DiscoveredRecruiterCandidate,
  EcommerceEvent,
  EcommerceJob,
  EcommerceLaw,
  GroundingSource,
  JobRoleCategory,
  LawCategory,
  LogisticsProvider,
  LogisticsRoleType,
  Merchant,
  NewsCategory,
  PageContentMap,
  PaketindexData,
  PublishStatus,
  RecruitmentSite,
  TechPartner,
  TimelineMilestone,
} from '../types';

interface CMSStudioProps {
  store: CMSStore;
  onRefresh: () => Promise<void>;
  onOpenEditor: (mode: 'merchant' | 'partner', item?: Merchant | TechPartner) => void;
  onNotify: (msg: string) => void;
}

type DiscoveryTarget = 'partners' | 'merchants' | 'jobs' | 'recruiters';

const DISCOVERY_QUICK_BATCHES: Array<{
  target: DiscoveryTarget;
  label: string;
  query: string;
}> = [
  {
    target: 'partners',
    label: 'Alla svenska e-handelsplattformar',
    query:
      'Svenska e-handelsplattformar utöver Centra, Norce, Litium, Brink och Geins (t.ex. Askås, Starweb, Kodmyran, Quickbutik, Abicart, Wikinggruppen, Vendre)',
  },
  {
    target: 'partners',
    label: 'Alla betallösningar & PSP',
    query:
      'Svenska och nordiska betallösningar och PSP för e-handel utöver Klarna, Swish, Qliro, Walley och Svea (t.ex. Kustom, Nets Easy, Adyen, Stripe, Mondido, Ping Payments)',
  },
  {
    target: 'partners',
    label: 'Transportörer & TA-system',
    query:
      'Svenska transportörer, paketskåp och TA-system för e-handel (t.ex. PostNord, DHL Freight, Bring, Instabox, Budbee, Airmee, nShift, Ingrid, Shipwallet, Logtrade)',
  },
  {
    target: 'partners',
    label: 'Logistik, 3PL & returer',
    query:
      'Svenska logistikpartners, 3PL och returlösningar (t.ex. Bring Shelfless, Aditro Logistics, Bonver Logistics, Gordon Delivery, Returnado, Early Bird)',
  },
  {
    target: 'partners',
    label: 'MarTech, CDP, Sök & Recensioner',
    query:
      'MarTech, kundklubbar, produktsök och recensionspartners i svensk e-handel (t.ex. Lipscore, Trustpilot, Hello Retail, Clerk.io, Nosto, Klaviyo, Voyado Elevate)',
  },
  {
    target: 'partners',
    label: 'Svenska e-handelsbyråer',
    query:
      'Ledande svenska e-handelsbyråer och digitala implementationspartners (t.ex. Avensia, Vaimo, Grebban, Panagora, Columbus, Efab, Mild Media)',
  },
  {
    target: 'merchants',
    label: 'Sveriges största e-handlare',
    query:
      'Stora svenska e-handlare som inte redan finns i listan (t.ex. NetOnNet, Dustin, Elgiganten, CDON, Jollyroom, Ellos, IKEA, H&M)',
  },
  {
    target: 'merchants',
    label: 'Sport, Träning & Outdoor',
    query:
      'Svenska e-handlare inom sport, kosttillskott, cykel och outdoor (t.ex. Gymgrossisten, Proteinbolaget, XXL, Stadium, Länna Sport, Addnature, Bikester)',
  },
  {
    target: 'merchants',
    label: 'Mode, Skor & Livsstil',
    query:
      'Svenska D2C-varumärken och e-handlare inom mode och skor (t.ex. Axel Arigato, Nudie Jeans, Sneakersnstuff, Care of Carl, Stronger, Chiquelle, Eton)',
  },
  {
    target: 'merchants',
    label: 'Hem, Bygg & Design',
    query:
      'Svenska e-handlare inom heminredning, möbler, bygg och trädgård (t.ex. Bygghemma, Royal Design, Svenssons i Lammhult, Trademax, Chilli, Desenio, Cervera)',
  },
  {
    target: 'merchants',
    label: 'Apotek, Skönhet & Barn',
    query:
      'Svenska e-handlare inom apotek, skönhet, optik och barn (t.ex. MEDS, Apoteket, Kronans Apotek, Skincity, Bangerhead, Synsam, Babyshop, Polarn O. Pyret)',
  },
  {
    target: 'jobs',
    label: 'E-commerce Manager & Head of Ecom',
    query:
      'Aktuella jobb som E-commerce Manager, Head of E-commerce eller Digital Commerce Lead i Stockholm, Göteborg och Malmö',
  },
  {
    target: 'jobs',
    label: 'Tech, Shopify, Centra & PIM',
    query:
      'Lediga jobb för e-handelsutvecklare, Shopify Plus, Centra och PIM-specialister i Sverige',
  },
  {
    target: 'jobs',
    label: 'Growth, CRM & Performance',
    query:
      'Lediga jobb inom Performance Marketing, Voyado CRM, SEO och Growth för svenska e-handlare',
  },
  {
    target: 'jobs',
    label: 'Logistik & Supply Chain',
    query:
      'Lediga jobb inom e-handelslogistik, 3PL, inköp och Supply Chain Management i Sverige',
  },
  {
    target: 'recruiters',
    label: 'E-handelsbyråer & Headhunters',
    query:
      'Svenska rekryteringsbyråer och headhunters specialiserade på e-handel, E-commerce Management, Growth och Tech',
  },
  {
    target: 'recruiters',
    label: 'Tech & Logistik-rekrytering',
    query:
      'Svenska jobbportaler och rekryteringsbolag för tech-utvecklare, AI och Supply Chain inom retail och e-handel',
  },
];

const JOB_ROLE_OPTIONS: JobRoleCategory[] = [
  'E-commerce Management',
  'Tech & Utveckling',
  'Growth & MarTech',
  'Logistik & Supply Chain',
  'Merchandising & CX',
];

export function CMSStudio({ store, onRefresh, onOpenEditor, onNotify }: CMSStudioProps) {
  const { user, isAdmin, signingIn, requestSignIn } = useFirebase();
  const [section, setSection] = useState<CMSSection>('discover');

  // Table Filters
  const [merchantSearch, setMerchantSearch] = useState('');
  const [merchantStatusFilter, setMerchantStatusFilter] = useState<'all' | 'published' | 'draft'>('all');
  const [partnerSearch, setPartnerSearch] = useState('');
  const [partnerCatFilter, setPartnerCatFilter] = useState('all');

  // Inline Discovery Workspace state
  const [discTarget, setDiscTarget] = useState<DiscoveryTarget>('partners');
  const [discQuery, setDiscQuery] = useState('');
  const [discCount, setDiscCount] = useState(10);
  const [discLoading, setDiscLoading] = useState(false);
  const [discImporting, setDiscImporting] = useState(false);
  const [discError, setDiscError] = useState<string | null>(null);
  const [discMerchants, setDiscMerchants] = useState<DiscoveredMerchantCandidate[]>([]);
  const [discPartners, setDiscPartners] = useState<DiscoveredPartnerCandidate[]>([]);
  const [discJobs, setDiscJobs] = useState<DiscoveredJobCandidate[]>([]);
  const [discRecruiters, setDiscRecruiters] = useState<DiscoveredRecruiterCandidate[]>([]);
  const [discSelected, setDiscSelected] = useState<number[]>([]);
  const [discSources, setDiscSources] = useState<GroundingSource[]>([]);

  // Event & Mässa form
  const [newEventName, setNewEventName] = useState('');
  const [newEventDate, setNewEventDate] = useState('');
  const [newEventCity, setNewEventCity] = useState('Stockholm');
  const [newEventVenue, setNewEventVenue] = useState('');
  const [newEventOrganizer, setNewEventOrganizer] = useState('');
  const [newEventTicket, setNewEventTicket] = useState('Branschbiljett');
  const [newEventWebsite, setNewEventWebsite] = useState('');
  const [newEventFocus, setNewEventFocus] = useState('E-handel, AI, Omnikanal');
  const [newEventDesc, setNewEventDesc] = useState('');

  // D-Congress session form
  const [newSessionTitle, setNewSessionTitle] = useState('');
  const [newSessionTime, setNewSessionTime] = useState('Dag 1 · 16:00');
  const [newSessionStage, setNewSessionStage] = useState('Main Stage');
  const [newSessionTrack, setNewSessionTrack] = useState('AI & Data');
  const [newSessionSpeaker, setNewSessionSpeaker] = useState('');

  // Jobs & Recruitment forms
  const [jobsTab, setJobsTab] = useState<'jobs' | 'recruiters'>('jobs');
  const [newJobTitle, setNewJobTitle] = useState('');
  const [newJobCompany, setNewJobCompany] = useState('');
  const [newJobCity, setNewJobCity] = useState('Stockholm');
  const [newJobModel, setNewJobModel] = useState<'Hybrid' | 'På plats' | 'Remote'>('Hybrid');
  const [newJobRole, setNewJobRole] = useState<JobRoleCategory>('E-commerce Management');
  const [newJobSeniority, setNewJobSeniority] = useState('Senior');
  const [newJobSalary, setNewJobSalary] = useState('');
  const [newJobUrl, setNewJobUrl] = useState('');
  const [newJobSkills, setNewJobSkills] = useState('Centra, Voyado, Tillväxt');
  const [newJobDesc, setNewJobDesc] = useState('');
  const [newJobSummary, setNewJobSummary] = useState('');
  const [newJobExpiresAt, setNewJobExpiresAt] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 45);
    return d.toISOString().slice(0, 10);
  });
  const [validatingJobs, setValidatingJobs] = useState(false);

  const [newRecName, setNewRecName] = useState('');
  const [newRecDomain, setNewRecDomain] = useState('');
  const [newRecType, setNewRecType] = useState<RecruitmentSite['type']>('Rekryteringsbyrå');
  const [newRecCoverage, setNewRecCoverage] = useState('Hela Sverige');
  const [newRecRoles, setNewRecRoles] = useState<JobRoleCategory[]>(['E-commerce Management']);
  const [newRecDesc, setNewRecDesc] = useState('');

  // Region, Benchmark & Law editor state
  const [editingRegionKey, setEditingRegionKey] = useState<string>('vast');
  const [editingBenchmarkId, setEditingBenchmarkId] = useState<string>('ob-mode');
  const [editingTierId, setEditingTierId] = useState<string>('st-3');
  const [newLawTitle, setNewLawTitle] = useState('');
  const [newLawCategory, setNewLawCategory] = useState<LawCategory>('Pris & Kassa');
  const [newLawAuthority, setNewLawAuthority] = useState('Konsumentverket');
  const [newLawDate, setNewLawDate] = useState('Gällande');
  const [newLawSummary, setNewLawSummary] = useState('');
  const [newLawRequirements, setNewLawRequirements] = useState('');
  const [newLawPenalty, setNewLawPenalty] = useState('Marknadsstörningsavgift / sanktionsavgift');

  // News management state
  const [cmsNewsTitle, setCmsNewsTitle] = useState('');
  const [cmsNewsCategory, setCmsNewsCategory] = useState<NewsCategory>('Temu & Marknadsplatser');
  const [cmsNewsRegion, setCmsNewsRegion] = useState<'Sverige' | 'Europa' | 'Norden' | 'Globalt'>('Europa');
  const [cmsNewsSourceName, setCmsNewsSourceName] = useState('');
  const [cmsNewsSourceUrl, setCmsNewsSourceUrl] = useState('');
  const [cmsNewsSummary, setCmsNewsSummary] = useState('');
  const [cmsNewsAiTopic, setCmsNewsAiTopic] = useState(
    'Temu, nya svenska e-handelsbutiker och nya SaaS-system i Europa 2026–2027'
  );
  const [cmsNewsAiLoading, setCmsNewsAiLoading] = useState(false);

  // 3PL & 4PL editor state
  const [editingLogisticsId, setEditingLogisticsId] = useState<string>('new');
  const [lpName, setLpName] = useState('');
  const [lpDomain, setLpDomain] = useState('');
  const [lpType, setLpType] = useState<LogisticsRoleType>('3PL');
  const [lpHqCity, setLpHqCity] = useState('Jönköping');
  const [lpRegion, setLpRegion] = useState('smaland');
  const [lpWarehouses, setLpWarehouses] = useState('Jönköping, Borås');
  const [lpSqm, setLpSqm] = useState('25 000 m²');
  const [lpAutomation, setLpAutomation] = useState('AutoStore & plockrobot');
  const [lpWms, setLpWms] = useState('Ongoing WMS');
  const [lpMinVol, setLpMinVol] = useState('Från 15 000 ordrar/år');
  const [lpCutoff, setLpCutoff] = useState('17:00');
  const [lpPricing, setLpPricing] = useState('Startavgift + pallplats + plock/order');
  const [lpIntegrations, setLpIntegrations] = useState('Centra, Shopify, Ingrid, nShift');
  const [lpSpecialties, setLpSpecialties] = useState('Mode & D2C, Returhantering');
  const [lpClients, setLpClients] = useState('');
  const [lpDesc, setLpDesc] = useState('');
  const [lpIntroEmail, setLpIntroEmail] = useState('');
  const [lpIntroRoutingMode, setLpIntroRoutingMode] = useState<'default' | 'self' | 'direct'>('default');
  const [lpStatus, setLpStatus] = useState<PublishStatus>('published');

  // Paketindex & Intelligence editor state
  const [piDraft, setPiDraft] = useState<PaketindexData>(() => store.paketindex);
  const [editingIntelId, setEditingIntelId] = useState<string>('paketindex');
  const [editingTechShareId, setEditingTechShareId] = useState<string>(
    () => store.techStackShares[0]?.id || ''
  );

  // Timeline editor state
  const [editingTimelineId, setEditingTimelineId] = useState<string>('new');
  const [tlEra, setTlEra] = useState<TimelineMilestone['era']>('20s');
  const [tlYear, setTlYear] = useState('2026');
  const [tlBadge, setTlBadge] = useState('Nytt skifte');
  const [tlTitle, setTlTitle] = useState('');
  const [tlDesc, setTlDesc] = useState('');
  const [tlStack, setTlStack] = useState('Agentic AI · Server-Side · Paketbox');

  // PageContent editor state
  const [pagesDraft, setPagesDraft] = useState<PageContentMap>(() => store.pageContent);
  const [activePageKey, setActivePageKey] = useState<keyof PageContentMap>('marknad');

  useEffect(() => {
    setPiDraft(store.paketindex);
  }, [store.paketindex]);

  useEffect(() => {
    setPagesDraft(store.pageContent);
  }, [store.pageContent]);

  function loadLogisticsForEdit(lp?: LogisticsProvider) {
    if (!lp) {
      setEditingLogisticsId('new');
      setLpName('');
      setLpDomain('');
      setLpType('3PL');
      setLpHqCity('Jönköping');
      setLpRegion('smaland');
      setLpWarehouses('Jönköping');
      setLpSqm('25 000 m²');
      setLpAutomation('AutoStore & plockrobot');
      setLpWms('Ongoing WMS');
      setLpMinVol('Från 15 000 ordrar/år');
      setLpCutoff('17:00');
      setLpPricing('Startavgift + pallplats + plock/order');
      setLpIntegrations('Centra, Shopify, Ingrid, nShift');
      setLpSpecialties('E-handel D2C, Returhantering');
      setLpClients('');
      setLpDesc('');
      setLpIntroEmail('');
      setLpIntroRoutingMode('default');
      setLpStatus('published');
      return;
    }
    setEditingLogisticsId(lp.id);
    setLpName(lp.name);
    setLpDomain(lp.domain);
    setLpType(lp.logisticsType);
    setLpHqCity(lp.hqCity);
    setLpRegion(lp.region || 'smaland');
    setLpWarehouses(lp.warehouseCities.join(', '));
    setLpSqm(lp.warehouseSqm);
    setLpAutomation(lp.automation);
    setLpWms(lp.wmsPlatform);
    setLpMinVol(lp.minOrderVolume);
    setLpCutoff(lp.cutoffTime);
    setLpPricing(lp.pricingModel);
    setLpIntegrations(lp.integrations.join(', '));
    setLpSpecialties(lp.specialties.join(', '));
    setLpClients(lp.notableClients.join(', '));
    setLpDesc(lp.desc);
    setLpIntroEmail(lp.introEmail || '');
    setLpIntroRoutingMode(lp.introRoutingMode || 'default');
    setLpStatus(lp.status);
  }

  function loadTimelineForEdit(m?: TimelineMilestone) {
    if (!m) {
      setEditingTimelineId('new');
      setTlEra('20s');
      setTlYear('2026');
      setTlBadge('Nytt skifte');
      setTlTitle('');
      setTlDesc('');
      setTlStack('');
      return;
    }
    setEditingTimelineId(m.id);
    setTlEra(m.era);
    setTlYear(m.year);
    setTlBadge(m.badge);
    setTlTitle(m.title);
    setTlDesc(m.desc);
    setTlStack(m.stack);
  }

  // Server CMS diagnostics (non-secret booleans)
  const [cmsStatus, setCmsStatus] = useState<{
    persistence: 'firestore' | 'local';
    hasExplicitAdminCredentials: boolean;
    hasGeminiKey: boolean;
  } | null>(null);
  const [cmsStatusError, setCmsStatusError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAdmin || section !== 'overview') return;
    let cancelled = false;
    api
      .getCmsStatus()
      .then((res) => {
        if (!cancelled) {
          setCmsStatus(res);
          setCmsStatusError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) setCmsStatusError((err as Error).message);
      });
    return () => {
      cancelled = true;
    };
  }, [isAdmin, section]);

  const filteredMerchants = useMemo(() => {
    const q = merchantSearch.trim().toLowerCase();
    return store.merchants.filter((m) => {
      const matchQ =
        !q ||
        m.name.toLowerCase().includes(q) ||
        m.domain.toLowerCase().includes(q) ||
        m.city.toLowerCase().includes(q) ||
        m.platform.toLowerCase().includes(q);
      const matchStatus = merchantStatusFilter === 'all' || m.status === merchantStatusFilter;
      return matchQ && matchStatus;
    });
  }, [store.merchants, merchantSearch, merchantStatusFilter]);

  const filteredPartners = useMemo(() => {
    const q = partnerSearch.trim().toLowerCase();
    return store.partners.filter((p) => {
      const matchQ =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.domain.toLowerCase().includes(q) ||
        p.origin.toLowerCase().includes(q) ||
        p.stack.toLowerCase().includes(q);
      const matchCat = partnerCatFilter === 'all' || p.cat === partnerCatFilter;
      return matchQ && matchCat;
    });
  }, [store.partners, partnerSearch, partnerCatFilter]);

  async function runDiscovery(target: DiscoveryTarget, query: string) {
    if (!query.trim() || discLoading) return;
    setDiscTarget(target);
    setDiscQuery(query);
    setDiscLoading(true);
    setDiscError(null);
    setDiscSelected([]);
    try {
      const res = await api.discover({
        target,
        query: query.trim(),
        count: discCount,
      });
      setDiscSources(res.sources || []);
      if (target === 'merchants') {
        const list = res.candidates as DiscoveredMerchantCandidate[];
        setDiscMerchants(list);
        setDiscSelected(list.map((c, idx) => (!c.alreadyExists ? idx : -1)).filter((i) => i >= 0));
      } else if (target === 'partners') {
        const list = res.candidates as DiscoveredPartnerCandidate[];
        setDiscPartners(list);
        setDiscSelected(list.map((c, idx) => (!c.alreadyExists ? idx : -1)).filter((i) => i >= 0));
      } else if (target === 'jobs') {
        const list = res.candidates as DiscoveredJobCandidate[];
        setDiscJobs(list);
        setDiscSelected(list.map((c, idx) => (!c.alreadyExists ? idx : -1)).filter((i) => i >= 0));
      } else {
        const list = res.candidates as DiscoveredRecruiterCandidate[];
        setDiscRecruiters(list);
        setDiscSelected(list.map((c, idx) => (!c.alreadyExists ? idx : -1)).filter((i) => i >= 0));
      }
    } catch (err) {
      setDiscError((err as Error).message);
    } finally {
      setDiscLoading(false);
    }
  }

  async function handleBatchImport() {
    if (discSelected.length === 0 || discImporting) return;
    setDiscImporting(true);
    setDiscError(null);
    try {
      if (discTarget === 'merchants') {
        const items = discSelected.map((idx) => ({
          ...discMerchants[idx],
          status: 'published' as const,
        }));
        const res = await api.batchAddMerchants(items);
        await onRefresh();
        onNotify(
          `${res.added.length} e-handlare importerade i CMS${
            res.skipped.length ? ` (${res.skipped.length} hoppades över som dubbletter)` : ''
          }.`
        );
        setDiscMerchants((prev) =>
          prev.map((c) => ({
            ...c,
            alreadyExists:
              c.alreadyExists || res.added.some((a) => a.name.toLowerCase() === c.name.toLowerCase()),
          }))
        );
      } else if (discTarget === 'partners') {
        const items = discSelected.map((idx) => ({
          ...discPartners[idx],
          status: 'published' as const,
        }));
        const res = await api.batchAddPartners(items);
        await onRefresh();
        onNotify(
          `${res.added.length} tech-partners importerade i CMS${
            res.skipped.length ? ` (${res.skipped.length} hoppades över som dubbletter)` : ''
          }.`
        );
        setDiscPartners((prev) =>
          prev.map((c) => ({
            ...c,
            alreadyExists:
              c.alreadyExists || res.added.some((a) => a.name.toLowerCase() === c.name.toLowerCase()),
          }))
        );
      } else if (discTarget === 'jobs') {
        const items = discSelected.map((idx) => ({
          ...discJobs[idx],
          status: 'published' as const,
        }));
        const res = await api.batchAddJobs(items);
        await onRefresh();
        onNotify(
          `${res.added.length} jobb importerade i CMS${
            res.skipped.length ? ` (${res.skipped.length} hoppades över som dubbletter)` : ''
          }.`
        );
        setDiscJobs((prev) =>
          prev.map((c) => ({
            ...c,
            alreadyExists:
              c.alreadyExists ||
              res.added.some(
                (a) =>
                  a.title.toLowerCase() === c.title.toLowerCase() &&
                  a.company.toLowerCase() === c.company.toLowerCase()
              ),
          }))
        );
      } else {
        const items = discSelected.map((idx) => ({
          ...discRecruiters[idx],
          status: 'published' as const,
        }));
        const res = await api.batchAddRecruiters(items);
        await onRefresh();
        onNotify(
          `${res.added.length} rekryteringssidor importerade i CMS${
            res.skipped.length ? ` (${res.skipped.length} hoppades över som dubbletter)` : ''
          }.`
        );
        setDiscRecruiters((prev) =>
          prev.map((c) => ({
            ...c,
            alreadyExists:
              c.alreadyExists || res.added.some((a) => a.name.toLowerCase() === c.name.toLowerCase()),
          }))
        );
      }
      setDiscSelected([]);
    } catch (err) {
      setDiscError((err as Error).message);
    } finally {
      setDiscImporting(false);
    }
  }

  async function toggleMerchantStatus(m: Merchant) {
    const nextStatus = m.status === 'published' ? 'draft' : 'published';
    await api.upsertMerchant({ ...m, status: nextStatus });
    await onRefresh();
    onNotify(`${m.name} ändrad till ${nextStatus === 'published' ? 'Publicerad' : 'Utkast'}.`);
  }

  async function togglePartnerStatus(p: TechPartner) {
    const nextStatus = p.status === 'published' ? 'draft' : 'published';
    await api.upsertPartner({ ...p, status: nextStatus });
    await onRefresh();
    onNotify(`${p.name} ändrad till ${nextStatus === 'published' ? 'Publicerad' : 'Utkast'}.`);
  }

  async function handleDeleteMerchant(m: Merchant) {
    await api.deleteMerchant(m.id);
    await onRefresh();
    onNotify(`${m.name} borttagen från CMS.`);
  }

  async function handleDeletePartner(p: TechPartner) {
    await api.deletePartner(p.id);
    await onRefresh();
    onNotify(`${p.name} borttagen från CMS.`);
  }

  async function handleAddEvent(e: React.FormEvent) {
    e.preventDefault();
    if (!newEventName.trim()) return;
    await api.upsertEvent({
      name: newEventName.trim(),
      dateLabel: newEventDate.trim() || 'Datum meddelas',
      city: newEventCity.trim() || 'Stockholm',
      venue: newEventVenue.trim() || 'Meddelas inom kort',
      organizer: newEventOrganizer.trim() || 'Branscharrangör',
      ticketInfo: newEventTicket.trim() || 'Biljett krävs',
      focusAreas: newEventFocus
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      audienceType: 'E-handlare & beslutsfattare',
      website: newEventWebsite.trim(),
      desc: newEventDesc.trim() || 'Svenskt e-handelsevent i branschkalendern.',
      status: 'published',
    });
    setNewEventName('');
    setNewEventDate('');
    setNewEventVenue('');
    setNewEventOrganizer('');
    setNewEventWebsite('');
    setNewEventDesc('');
    await onRefresh();
    onNotify('Event sparat i Event & Mässor.');
  }

  async function toggleEventStatus(ev: EcommerceEvent) {
    await api.upsertEvent({
      ...ev,
      status: ev.status === 'published' ? 'draft' : 'published',
    });
    await onRefresh();
  }

  async function handleAddSession(e: React.FormEvent) {
    e.preventDefault();
    if (!newSessionTitle.trim()) return;
    await api.upsertSession({
      title: newSessionTitle.trim(),
      time: newSessionTime,
      stage: newSessionStage,
      track: newSessionTrack,
      speaker: newSessionSpeaker.trim() || 'Meddelas inom kort',
      status: 'published',
    });
    setNewSessionTitle('');
    setNewSessionSpeaker('');
    await onRefresh();
    onNotify('Programpunkt skapad för D-Congress 2027.');
  }

  async function toggleSessionStatus(s: DCSession) {
    await api.upsertSession({
      ...s,
      status: s.status === 'published' ? 'draft' : 'published',
    });
    await onRefresh();
  }

  async function handleAddJob(e: React.FormEvent) {
    e.preventDefault();
    if (!newJobTitle.trim() || !newJobCompany.trim()) return;
    await api.upsertJob({
      title: newJobTitle.trim(),
      company: newJobCompany.trim(),
      city: newJobCity.trim() || 'Stockholm',
      workModel: newJobModel,
      roleCategory: newJobRole,
      seniority: newJobSeniority.trim() || 'Mid-Senior',
      salaryRange: newJobSalary.trim() || undefined,
      applyUrl: newJobUrl.trim() || 'https://sverigesehandel.se',
      skills: newJobSkills
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      summary: newJobSummary.trim(),
      desc: newJobDesc.trim() || `${newJobTitle.trim()} hos ${newJobCompany.trim()}.`,
      postedAt: 'Ny idag',
      expiresAt: newJobExpiresAt || undefined,
      jobStatus: 'active',
      status: 'published',
    });
    setNewJobTitle('');
    setNewJobCompany('');
    setNewJobSalary('');
    setNewJobUrl('');
    setNewJobDesc('');
    setNewJobSummary('');
    await onRefresh();
    onNotify('Jobbannons publicerad i Sveriges E-handel.');
  }

  async function handleValidateJobs() {
    setValidatingJobs(true);
    try {
      const res = await api.validateJobs();
      await onRefresh();
      onNotify(
        `Kontrollerade ${res.totalChecked} jobb: ${res.activeCount} aktiva, ${res.closedCount} utgångna/stängda.`
      );
    } catch (err) {
      onNotify((err as Error).message);
    } finally {
      setValidatingJobs(false);
    }
  }

  async function toggleJobStatus(j: EcommerceJob) {
    const closing = j.status === 'published' && j.jobStatus !== 'closed' && j.jobStatus !== 'expired';
    await api.upsertJob({
      ...j,
      status: closing ? 'draft' : 'published',
      jobStatus: closing ? 'closed' : 'active',
      validationNote: closing ? 'Manuellt stängd i CMS Studio' : 'Återaktiverad och verifierad i CMS Studio',
    });
    await onRefresh();
    onNotify(closing ? `Annonsen "${j.title}" stängdes.` : `Annonsen "${j.title}" återaktiverades.`);
  }

  async function handleAddRecruiter(e: React.FormEvent) {
    e.preventDefault();
    if (!newRecName.trim()) return;
    await api.upsertRecruiter({
      name: newRecName.trim(),
      domain: newRecDomain.trim() || `${newRecName.trim().toLowerCase().replace(/\s+/g, '')}.se`,
      type: newRecType,
      coverage: newRecCoverage.trim() || 'Hela Sverige',
      rolesCovered: newRecRoles.length > 0 ? newRecRoles : ['E-commerce Management'],
      desc: newRecDesc.trim() || 'Specialiserad rekrytering för svensk e-handel.',
      status: 'published',
    });
    setNewRecName('');
    setNewRecDomain('');
    setNewRecDesc('');
    await onRefresh();
    onNotify('Rekryteringssida sparad i CMS.');
  }

  async function toggleRecruiterStatus(r: RecruitmentSite) {
    await api.upsertRecruiter({
      ...r,
      status: r.status === 'published' ? 'draft' : 'published',
    });
    await onRefresh();
  }

  function handleExportJSON() {
    const blob = new Blob([JSON.stringify(store, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sverigesehandel-cms-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    onNotify('CMS-databasen exporterad som JSON.');
  }

  const sidebarItems: Array<{ id: CMSSection; label: string; icon: typeof LayoutDashboard; count?: number }> = [
    { id: 'discover', label: 'Sök & Lägg till', icon: Sparkles },
    { id: 'merchants', label: 'E-handlare', icon: Building2, count: store.merchants.length },
    { id: 'partners', label: 'Tech & Partners', icon: Layers, count: store.partners.length },
    { id: 'logistics', label: '3PL & 4PL', icon: Warehouse, count: (store.logisticsProviders || []).length },
    { id: 'paketindex', label: 'Paketindex & Marknad', icon: BarChart3 },
    { id: 'commerce', label: 'Startguide & Köp/sälj', icon: FileText, count: (store.saleListings||[]).filter(r=>r.status==='pending').length },
    { id: 'insights', label: 'Blogg & Insikter', icon: FileText, count: (store.insightPosts || []).length },
    { id: 'news', label: 'Nyheter', icon: Newspaper, count: (store.news || []).length },
    { id: 'events', label: 'Event & Mässor', icon: Calendar, count: store.events.length },
    { id: 'timeline', label: 'Historia (Tidslinje)', icon: Clock, count: store.timeline.length },
    { id: 'jobs', label: 'Jobb & Rekrytering', icon: Briefcase, count: store.jobs.length + store.recruitmentSites.length },
    { id: 'forms', label: 'Formulär & Intro', icon: ClipboardList, count: (store.contactForms || []).length },
    { id: 'pages', label: 'Sidtexter & Kontakt', icon: FileText },
    { id: 'content', label: 'Annons, Data & Inkorg', icon: MapPin, count: store.adBanners.length + store.contactMessages.length },
    { id: 'firebase', label: 'Firebase: Bilder & Statistik', icon: BarChart3 },
    { id: 'members', label: 'Medlemmar & Community', icon: Users },
    { id: 'overview', label: 'Översikt & Backup', icon: Database },
  ];

  const activeDiscList =
    discTarget === 'merchants'
      ? discMerchants
      : discTarget === 'partners'
      ? discPartners
      : discTarget === 'jobs'
      ? discJobs
      : discRecruiters;

  const activeRegion = store.regions[editingRegionKey];

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col lg:flex-row bg-[#F4F6F9]">
      {/* Sidebar */}
      <aside className="w-full lg:w-[250px] bg-[#040B16] text-white border-b lg:border-b-0 lg:border-r border-white/10 shrink-0">
        <div className="p-4 lg:p-5 space-y-5">
          <div>
            <div className="text-xs font-mono text-[#FECC02] font-semibold">CMS Studio</div>
            <div className="text-xs text-slate-400 mt-0.5">Hantera hela katalogen</div>
          </div>

          <nav className="flex flex-wrap lg:flex-col gap-1 pb-1 lg:pb-0">
            {sidebarItems.map((item) => {
              const Icon = item.icon;
              const active = section === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSection(item.id)}
                  className={`flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                    active
                      ? 'bg-[#FECC02] text-[#040B16] font-bold'
                      : 'text-slate-300 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <span className="inline-flex items-center gap-2.5">
                    <Icon className="w-4 h-4 shrink-0" />
                    {item.label}
                  </span>
                  {typeof item.count === 'number' && (
                    <span
                      className={`font-mono text-[11px] tabular-nums ${
                        active ? 'text-[#040B16]' : 'text-slate-400'
                      }`}
                    >
                      {item.count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </aside>

      {/* Main Workspace */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top Breadcrumb Bar */}
        <div className="bg-white border-b border-slate-200 px-6 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="text-xs font-medium text-slate-500">
            CMS Studio <span className="mx-1.5">/</span>{' '}
            <span className="text-[#040B16] font-semibold">
              {sidebarItems.find((i) => i.id === section)?.label}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            {isAdmin ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs font-semibold text-[#059669] whitespace-nowrap">
                <ShieldCheck className="w-3.5 h-3.5" />
                Firestore Admin-synk
              </span>
            ) : (
              <button
                type="button"
                disabled={signingIn}
                onClick={requestSignIn}
                className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap disabled:opacity-60"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-[#006AA7]" />
                {user ? 'Admin-synk inaktiv' : signingIn ? 'Loggar in...' : 'Logga in för molnsynk'}
              </button>
            )}
            <button
              type="button"
              onClick={() => onOpenEditor('merchant')}
              className="px-3.5 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-[#040B16] inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              Ny e-handlare
            </button>
            <button
              type="button"
              onClick={() => onOpenEditor('partner')}
              className="px-3.5 py-2 rounded-lg bg-[#040B16] hover:bg-[#006AA7] text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              Ny tech-partner
            </button>
          </div>
        </div>

        <div className="p-6 lg:p-8 space-y-6 max-w-[1200px] w-full">
          {/* SECTION: DISCOVERY (SEARCH & BATCH ADD) */}
          {section === 'discover' && (
            <div className="space-y-6">
              <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h1 className="font-display text-2xl font-extrabold text-[#040B16]">
                      Sök webben & lägg till i katalogen
                    </h1>
                    <p className="text-xs sm:text-sm text-slate-600 mt-1">
                      Använd Google Search-grounding för att hitta fler svenska tech-partners, e-handlare, jobb och rekryteringssidor.
                    </p>
                  </div>

                  <div className="inline-flex flex-wrap bg-slate-100 p-1 rounded-xl text-xs font-bold gap-1">
                    {(
                      [
                        { id: 'partners', label: `Tech Partners (${store.partners.length})` },
                        { id: 'merchants', label: `E-handlare (${store.merchants.length})` },
                        { id: 'jobs', label: `Jobb (${store.jobs.length})` },
                        { id: 'recruiters', label: `Rekryteringssidor (${store.recruitmentSites.length})` },
                      ] as const
                    ).map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => {
                          setDiscTarget(tab.id);
                          setDiscError(null);
                        }}
                        className={`px-3.5 py-2 rounded-lg transition-colors cursor-pointer ${
                          discTarget === tab.id
                            ? 'bg-[#040B16] text-white'
                            : 'text-slate-600 hover:text-[#040B16]'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    runDiscovery(discTarget, discQuery);
                  }}
                  className="flex flex-col sm:flex-row gap-3"
                >
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type="text"
                      value={discQuery}
                      onChange={(e) => setDiscQuery(e.target.value)}
                      placeholder={
                        discTarget === 'partners'
                          ? 'Sök t.ex. "Svenska e-handelsplattformar", "Betallösningar" eller "Logistik i Borås"...'
                          : discTarget === 'merchants'
                          ? 'Sök t.ex. "Största svenska e-handlarna", "Svenska apotek online" eller "Mode D2C"...'
                          : discTarget === 'jobs'
                          ? 'Sök t.ex. "E-commerce Manager Stockholm" eller "Shopify-utvecklare Göteborg"...'
                          : 'Sök t.ex. "Rekryteringsbyrå e-handel" eller "Headhunting Supply Chain"...'
                      }
                      className="w-full px-4 py-2.5 pl-10 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#006AA7]"
                    />
                  </div>
                  <select
                    value={discCount}
                    onChange={(e) => setDiscCount(Number(e.target.value))}
                    className="px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-mono font-semibold bg-white"
                  >
                    <option value={5}>5 st</option>
                    <option value={10}>10 st</option>
                    <option value={15}>15 st</option>
                  </select>
                  <button
                    type="submit"
                    disabled={discLoading || !discQuery.trim()}
                    className="px-5 py-2.5 rounded-xl bg-[#FECC02] hover:bg-[#EAB308] disabled:opacity-50 text-[#040B16] font-bold text-xs inline-flex items-center justify-center gap-2 transition-colors cursor-pointer whitespace-nowrap"
                  >
                    {discLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Sparkles className="w-4 h-4" />
                    )}
                    {discLoading ? 'Söker webben...' : 'Sök & hämta kandidater'}
                  </button>
                </form>

                {/* Quick Batch Discovery Buttons */}
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <div className="text-xs font-semibold text-slate-500">
                    Snabbval för att fylla katalogen:
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {DISCOVERY_QUICK_BATCHES.filter((b) => b.target === discTarget).map((batch) => (
                      <button
                        key={batch.label}
                        type="button"
                        disabled={discLoading}
                        onClick={() => runDiscovery(batch.target, batch.query)}
                        className="px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-[#FECC02]/25 border border-slate-200 text-xs font-medium text-slate-800 transition-colors cursor-pointer disabled:opacity-50"
                      >
                        {batch.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {discError && (
                <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-medium">
                  {discError}
                </div>
              )}

              {discLoading && (
                <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-3">
                  <div className="text-xs font-medium text-slate-600 flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-[#006AA7]" />
                    Söker svenska aktörer via Google Search...
                  </div>
                  {[1, 2, 3, 4].map((n) => (
                    <div key={n} className="h-14 rounded-xl bg-slate-100 animate-pulse" />
                  ))}
                </div>
              )}

              {!discLoading && activeDiscList.length > 0 && (
                <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                  <div className="px-6 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50">
                    <div className="text-xs text-slate-700">
                      Visar <strong>{activeDiscList.length}</strong> sökresultat ·{' '}
                      <strong className="tabular-nums">{discSelected.length}</strong> valda för import
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() =>
                          setDiscSelected(
                            discSelected.length === activeDiscList.length
                              ? []
                              : activeDiscList.map((_, idx) => idx)
                          )
                        }
                        className="text-xs font-semibold text-[#006AA7] hover:underline cursor-pointer"
                      >
                        {discSelected.length === activeDiscList.length ? 'Avmarkera alla' : 'Markera alla'}
                      </button>
                      <button
                        type="button"
                        disabled={discSelected.length === 0 || discImporting}
                        onClick={handleBatchImport}
                        className="px-4 py-2 rounded-lg bg-[#059669] hover:bg-[#047857] disabled:opacity-50 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        {discImporting ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Check className="w-3.5 h-3.5" />
                        )}
                        Lägg till {discSelected.length} valda i CMS
                      </button>
                    </div>
                  </div>

                  <div className="divide-y divide-slate-200">
                    {discTarget === 'merchants' &&
                      discMerchants.map((m, idx) => {
                        const checked = discSelected.includes(idx);
                        return (
                          <label
                            key={`${m.name}-${idx}`}
                            className={`flex items-start gap-3 px-6 py-4 cursor-pointer transition-colors ${
                              checked ? 'bg-[#E0F2FE]/25' : 'hover:bg-slate-50'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() =>
                                setDiscSelected((prev) =>
                                  prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx]
                                )
                              }
                              className="mt-1 rounded border-slate-300"
                            />
                            <div className="flex-1 min-w-0 space-y-1">
                              <div className="flex items-center justify-between gap-2">
                                <div className="font-display font-bold text-sm text-[#040B16]">
                                  {m.name}{' '}
                                  <span className="font-mono text-xs font-normal text-slate-500">
                                    · {m.domain}
                                  </span>
                                </div>
                                <span
                                  className={`text-xs font-mono font-semibold ${
                                    m.alreadyExists ? 'text-amber-700' : 'text-[#059669]'
                                  }`}
                                >
                                  {m.alreadyExists ? 'Finns redan' : 'Ny'}
                                </span>
                              </div>
                              <div className="text-xs text-slate-500">
                                {m.category} · {m.city} · Omsättning: {m.revenue}
                                {m.yoyGrowth ? ` (${m.yoyGrowth})` : ''} · {m.platform} · Trustpilot{' '}
                                <span className="tabular-nums">{m.trustpilot.toFixed(1)}</span>
                              </div>
                              <p className="text-xs text-slate-700">{m.desc}</p>
                            </div>
                          </label>
                        );
                      })}

                    {discTarget === 'partners' &&
                      discPartners.map((p, idx) => {
                        const checked = discSelected.includes(idx);
                        return (
                          <label
                            key={`${p.name}-${idx}`}
                            className={`flex items-start gap-3 px-6 py-4 cursor-pointer transition-colors ${
                              checked ? 'bg-[#E0F2FE]/25' : 'hover:bg-slate-50'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() =>
                                setDiscSelected((prev) =>
                                  prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx]
                                )
                              }
                              className="mt-1 rounded border-slate-300"
                            />
                            <div className="flex-1 min-w-0 space-y-1">
                              <div className="flex items-center justify-between gap-2">
                                <div className="font-display font-bold text-sm text-[#040B16]">
                                  {p.name}{' '}
                                  <span className="font-mono text-xs font-normal text-slate-500">
                                    · {p.domain}
                                  </span>
                                </div>
                                <span
                                  className={`text-xs font-mono font-semibold ${
                                    p.alreadyExists ? 'text-amber-700' : 'text-[#059669]'
                                  }`}
                                >
                                  {p.alreadyExists ? 'Finns redan' : 'Ny'}
                                </span>
                              </div>
                              <div className="text-xs text-slate-500">
                                {p.subType || p.cat} · {p.origin}
                                {p.subType !== 'Transportör' && p.customerCount
                                  ? ` · Kunder: ${p.customerCount}`
                                  : ''}{' '}
                                · {p.stack}
                              </div>
                              <p className="text-xs text-slate-700">{p.desc}</p>
                            </div>
                          </label>
                        );
                      })}

                    {discTarget === 'jobs' &&
                      discJobs.map((j, idx) => {
                        const checked = discSelected.includes(idx);
                        return (
                          <label
                            key={`${j.title}-${j.company}-${idx}`}
                            className={`flex items-start gap-3 px-6 py-4 cursor-pointer transition-colors ${
                              checked ? 'bg-[#E0F2FE]/25' : 'hover:bg-slate-50'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() =>
                                setDiscSelected((prev) =>
                                  prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx]
                                )
                              }
                              className="mt-1 rounded border-slate-300"
                            />
                            <div className="flex-1 min-w-0 space-y-1">
                              <div className="flex items-center justify-between gap-2">
                                <div className="font-display font-bold text-sm text-[#040B16]">
                                  {j.title}{' '}
                                  <span className="font-mono text-xs font-normal text-slate-500">
                                    · {j.company}
                                  </span>
                                </div>
                                <span
                                  className={`text-xs font-mono font-semibold ${
                                    j.alreadyExists ? 'text-amber-700' : 'text-[#059669]'
                                  }`}
                                >
                                  {j.alreadyExists ? 'Finns redan' : 'Ny'}
                                </span>
                              </div>
                              <div className="text-xs text-slate-500">
                                {j.roleCategory} · {j.city} · {j.workModel} · {j.seniority}
                                {j.expiresAt ? ` · Giltig t.o.m. ${j.expiresAt}` : ''}
                              </div>
                              <p className="text-xs text-slate-700">{j.desc}</p>
                            </div>
                          </label>
                        );
                      })}

                    {discTarget === 'recruiters' &&
                      discRecruiters.map((r, idx) => {
                        const checked = discSelected.includes(idx);
                        return (
                          <label
                            key={`${r.name}-${idx}`}
                            className={`flex items-start gap-3 px-6 py-4 cursor-pointer transition-colors ${
                              checked ? 'bg-[#E0F2FE]/25' : 'hover:bg-slate-50'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() =>
                                setDiscSelected((prev) =>
                                  prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx]
                                )
                              }
                              className="mt-1 rounded border-slate-300"
                            />
                            <div className="flex-1 min-w-0 space-y-1">
                              <div className="flex items-center justify-between gap-2">
                                <div className="font-display font-bold text-sm text-[#040B16]">
                                  {r.name}{' '}
                                  <span className="font-mono text-xs font-normal text-slate-500">
                                    · {r.domain}
                                  </span>
                                </div>
                                <span
                                  className={`text-xs font-mono font-semibold ${
                                    r.alreadyExists ? 'text-amber-700' : 'text-[#059669]'
                                  }`}
                                >
                                  {r.alreadyExists ? 'Finns redan' : 'Ny'}
                                </span>
                              </div>
                              <div className="text-xs text-slate-500">
                                {r.type} · {r.coverage} · {r.rolesCovered.join(', ')}
                              </div>
                              <p className="text-xs text-slate-700">{r.desc}</p>
                            </div>
                          </label>
                        );
                      })}
                  </div>

                  {discSources.length > 0 && (
                    <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center gap-3 text-xs">
                      <span className="font-mono text-slate-500">Källor:</span>
                      {discSources.map((s) => (
                        <a
                          key={s.uri}
                          href={s.uri}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[#006AA7] hover:underline truncate max-w-[240px]"
                        >
                          <ExternalLink className="w-3 h-3 shrink-0" />
                          <span className="truncate">{s.title}</span>
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* SECTION: MERCHANTS TABLE */}
          {section === 'merchants' && (
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
              <div className="p-5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2.5 flex-1">
                  <div className="relative flex-1 min-w-0 w-full sm:w-auto sm:max-w-sm">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={merchantSearch}
                      onChange={(e) => setMerchantSearch(e.target.value)}
                      placeholder="Filtrera e-handlare..."
                      className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#006AA7]"
                    />
                  </div>
                  <select
                    value={merchantStatusFilter}
                    onChange={(e) =>
                      setMerchantStatusFilter(e.target.value as 'all' | 'published' | 'draft')
                    }
                    className="px-3 py-2 rounded-lg border border-slate-200 text-xs font-medium bg-white"
                  >
                    <option value="all">Alla statusar ({store.merchants.length})</option>
                    <option value="published">Publicerade</option>
                    <option value="draft">Utkast</option>
                  </select>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setDiscTarget('merchants');
                    setSection('discover');
                  }}
                  className="px-3.5 py-2 rounded-lg bg-[#FECC02] hover:bg-[#EAB308] text-[#040B16] text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Sök & lägg till fler
                </button>
              </div>

              <div className="hidden lg:block">
                <table className="w-full table-fixed text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-mono">
                      <th className="py-2.5 px-4 font-semibold w-[30%]">Butik</th>
                      <th className="py-2.5 px-4 font-semibold w-[22%]">Omsättning & Tillväxt</th>
                      <th className="py-2.5 px-4 font-semibold w-[16%]">Plattform</th>
                      <th className="py-2.5 px-4 font-semibold text-right w-[10%]">Trustpilot</th>
                      <th className="py-2.5 px-4 font-semibold w-[12%]">Status</th>
                      <th className="py-2.5 px-4 font-semibold text-right w-[10%]">Åtgärder</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredMerchants.map((m) => (
                      <tr key={m.id} className="hover:bg-slate-50 h-11">
                        <td className="py-2 px-4">
                          <div className="font-semibold text-[#040B16] truncate">{m.name}</div>
                          <div className="text-[11px] text-slate-500 truncate">
                            {m.domain} · {m.city} · {m.category}
                          </div>
                        </td>
                        <td className="py-2 px-4 font-mono tabular-nums">
                          <div className="font-semibold text-[#040B16] truncate">{m.revenue}</div>
                          {m.yoyGrowth && (
                            <div
                              className={`text-[11px] font-semibold ${
                                (m.yoyGrowthPct ?? 0) < 0 ? 'text-red-600' : 'text-[#059669]'
                              }`}
                            >
                              {m.yoyGrowth}
                            </div>
                          )}
                        </td>
                        <td className="py-2 px-4 text-slate-600 truncate">{m.platform}</td>
                        <td className="py-2 px-4 text-right font-mono font-bold text-[#059669] tabular-nums">
                          {m.trustpilot.toFixed(1)}
                        </td>
                        <td className="py-2 px-4">
                          <button
                            type="button"
                            onClick={() => toggleMerchantStatus(m)}
                            className={`text-xs font-semibold cursor-pointer hover:underline ${
                              m.status === 'published' ? 'text-[#059669]' : 'text-amber-700'
                            }`}
                          >
                            {m.status === 'published' ? 'Publicerad' : 'Utkast'}
                          </button>
                        </td>
                        <td className="py-2 px-4 text-right">
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => onOpenEditor('merchant', m)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-[#040B16] hover:bg-slate-100 cursor-pointer"
                              aria-label={`Redigera ${m.name}`}
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteMerchant(m)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 cursor-pointer"
                              aria-label={`Ta bort ${m.name}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="lg:hidden divide-y divide-slate-100">
                {filteredMerchants.map((m) => (
                  <div key={m.id} className="p-4 flex items-start justify-between gap-3 text-xs">
                    <div className="min-w-0 space-y-1">
                      <div className="font-semibold text-[#040B16]">{m.name}</div>
                      <div className="text-[11px] text-slate-500">
                        {m.domain} · {m.city} · {m.platform}
                      </div>
                      <div className="font-mono text-[11px] tabular-nums text-slate-700">
                        {m.revenue} {m.yoyGrowth ? `(${m.yoyGrowth})` : ''} · TP {m.trustpilot.toFixed(1)}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => toggleMerchantStatus(m)}
                        className={`text-[11px] font-semibold cursor-pointer ${
                          m.status === 'published' ? 'text-[#059669]' : 'text-amber-700'
                        }`}
                      >
                        {m.status === 'published' ? 'Publicerad' : 'Utkast'}
                      </button>
                      <button
                        type="button"
                        onClick={() => onOpenEditor('merchant', m)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-[#040B16] cursor-pointer"
                        aria-label={`Redigera ${m.name}`}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteMerchant(m)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 cursor-pointer"
                        aria-label={`Ta bort ${m.name}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SECTION: TECH PARTNERS TABLE */}
          {section === 'partners' && (
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
              <div className="p-5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2.5 flex-1">
                  <div className="relative flex-1 min-w-0 w-full sm:w-auto sm:max-w-sm">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={partnerSearch}
                      onChange={(e) => setPartnerSearch(e.target.value)}
                      placeholder="Filtrera tech-partners..."
                      className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#006AA7]"
                    />
                  </div>
                  <select
                    value={partnerCatFilter}
                    onChange={(e) => setPartnerCatFilter(e.target.value)}
                    className="px-3 py-2 rounded-lg border border-slate-200 text-xs font-medium bg-white"
                  >
                    <option value="all">Alla kategorier ({store.partners.length})</option>
                    <option>E-handelsplattform</option>
                    <option>Betalning & Checkout</option>
                    <option>Logistik & Last-mile</option>
                    <option>MarTech & AI</option>
                    <option>ERP & Omnichannel</option>
                  </select>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setDiscTarget('partners');
                    setSection('discover');
                  }}
                  className="px-3.5 py-2 rounded-lg bg-[#FECC02] hover:bg-[#EAB308] text-[#040B16] text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Sök & lägg till fler
                </button>
              </div>

              <div className="hidden lg:block">
                <table className="w-full table-fixed text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-mono">
                      <th className="py-2.5 px-4 font-semibold w-[26%]">Partner</th>
                      <th className="py-2.5 px-4 font-semibold w-[28%]">Kategori / Subtyp</th>
                      <th className="py-2.5 px-4 font-semibold w-[24%]">Kunder / Transportnät</th>
                      <th className="py-2.5 px-4 font-semibold w-[12%]">Status</th>
                      <th className="py-2.5 px-4 font-semibold text-right w-[10%]">Åtgärder</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredPartners.map((p) => {
                      const isCarrier = p.subType === 'Transportör';
                      return (
                        <tr key={p.id} className="hover:bg-slate-50 h-11">
                          <td className="py-2 px-4">
                            <div className="font-semibold text-[#040B16] truncate">{p.name}</div>
                            <div className="text-[11px] text-slate-500 truncate">
                              {p.domain} · {p.origin}
                            </div>
                          </td>
                          <td className="py-2 px-4 text-slate-700">
                            <div className="truncate">{p.subType || p.cat}</div>
                            <div className="text-[11px] text-slate-500 truncate">
                              {p.stack}
                            </div>
                          </td>
                          <td className="py-2 px-4 text-slate-700 font-mono text-[11px] tabular-nums">
                            {isCarrier
                              ? `${(p.carrierMetrics?.parcelLockers ?? 0).toLocaleString('sv-SE')} skåp · ${(p.carrierMetrics?.pickupAgents ?? 0).toLocaleString('sv-SE')} ombud · ${p.carrierMetrics?.homeDeliveryPct ?? 0}% hem`
                              : p.customerCount || 'Ej angivet'}
                          </td>
                          <td className="py-2 px-4">
                            <button
                              type="button"
                              onClick={() => togglePartnerStatus(p)}
                              className={`text-xs font-semibold cursor-pointer hover:underline ${
                                p.status === 'published' ? 'text-[#059669]' : 'text-amber-700'
                              }`}
                            >
                              {p.status === 'published' ? 'Publicerad' : 'Utkast'}
                            </button>
                          </td>
                          <td className="py-2 px-4 text-right">
                            <div className="inline-flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => onOpenEditor('partner', p)}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-[#040B16] hover:bg-slate-100 cursor-pointer"
                                aria-label={`Redigera ${p.name}`}
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeletePartner(p)}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 cursor-pointer"
                                aria-label={`Ta bort ${p.name}`}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="lg:hidden divide-y divide-slate-100">
                {filteredPartners.map((p) => {
                  const isCarrier = p.subType === 'Transportör';
                  return (
                    <div key={p.id} className="p-4 flex items-start justify-between gap-3 text-xs">
                      <div className="min-w-0 space-y-1">
                        <div className="font-semibold text-[#040B16]">{p.name}</div>
                        <div className="text-[11px] text-slate-500">
                          {p.subType || p.cat} · {p.domain}
                        </div>
                        <div className="font-mono text-[11px] text-slate-700 tabular-nums">
                          {isCarrier
                            ? `${(p.carrierMetrics?.parcelLockers ?? 0).toLocaleString('sv-SE')} skåp · ${(p.carrierMetrics?.pickupAgents ?? 0).toLocaleString('sv-SE')} ombud`
                            : p.customerCount || p.stack}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => togglePartnerStatus(p)}
                          className={`text-[11px] font-semibold cursor-pointer ${
                            p.status === 'published' ? 'text-[#059669]' : 'text-amber-700'
                          }`}
                        >
                          {p.status === 'published' ? 'Publicerad' : 'Utkast'}
                        </button>
                        <button
                          type="button"
                          onClick={() => onOpenEditor('partner', p)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-[#040B16] cursor-pointer"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeletePartner(p)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* SECTION: EVENTS & D-CONGRESS */}
          {section === 'events' && (
            <div className="space-y-6">
              {/* Create Event Form */}
              <form
                onSubmit={handleAddEvent}
                className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4"
              >
                <h2 className="font-display text-lg font-bold text-[#040B16]">
                  Lägg till mässa eller branschkonferens
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <input
                    type="text"
                    required
                    value={newEventName}
                    onChange={(e) => setNewEventName(e.target.value)}
                    placeholder="Namn på event / mässa *"
                    className="sm:col-span-2 px-3.5 py-2 rounded-xl border border-slate-200 text-xs"
                  />
                  <input
                    type="text"
                    value={newEventDate}
                    onChange={(e) => setNewEventDate(e.target.value)}
                    placeholder="Datum (t.ex. 25–26 maj 2027)"
                    className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs"
                  />
                  <input
                    type="text"
                    value={newEventCity}
                    onChange={(e) => setNewEventCity(e.target.value)}
                    placeholder="Stad (t.ex. Stockholm)"
                    className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs"
                  />
                  <input
                    type="text"
                    value={newEventVenue}
                    onChange={(e) => setNewEventVenue(e.target.value)}
                    placeholder="Plats / Mässgolv (t.ex. Kistamässan)"
                    className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs"
                  />
                  <input
                    type="text"
                    value={newEventOrganizer}
                    onChange={(e) => setNewEventOrganizer(e.target.value)}
                    placeholder="Arrangör"
                    className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs"
                  />
                  <input
                    type="text"
                    value={newEventTicket}
                    onChange={(e) => setNewEventTicket(e.target.value)}
                    placeholder="Biljettinfo (t.ex. Kostnadsfri entré)"
                    className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs"
                  />
                  <input
                    type="text"
                    value={newEventWebsite}
                    onChange={(e) => setNewEventWebsite(e.target.value)}
                    placeholder="Webbplats (valfri)"
                    className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    type="text"
                    value={newEventFocus}
                    onChange={(e) => setNewEventFocus(e.target.value)}
                    placeholder="Fokusområden (komma-separerat)"
                    className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs"
                  />
                  <input
                    type="text"
                    value={newEventDesc}
                    onChange={(e) => setNewEventDesc(e.target.value)}
                    placeholder="Kort beskrivning av mässan/konferensen"
                    className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs"
                  />
                </div>
                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-[#040B16] hover:bg-[#006AA7] text-white text-xs font-bold cursor-pointer"
                  >
                    + Spara event
                  </button>
                </div>
              </form>

              {/* Events Table */}
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50 font-display font-bold text-sm text-[#040B16]">
                  Branschevent & Mässor ({store.events.length})
                </div>
                <div className="hidden lg:block">
                  <table className="w-full table-fixed text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-mono">
                        <th className="py-2.5 px-4 font-semibold w-[36%]">Event</th>
                        <th className="py-2.5 px-4 font-semibold w-[22%]">Datum & Stad</th>
                        <th className="py-2.5 px-4 font-semibold w-[20%]">Biljett</th>
                        <th className="py-2.5 px-4 font-semibold w-[12%]">Status</th>
                        <th className="py-2.5 px-4 font-semibold text-right w-[10%]">Ta bort</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {store.events.map((ev) => (
                        <tr key={ev.id} className="hover:bg-slate-50">
                          <td className="py-2.5 px-4">
                            <div className="font-semibold text-[#040B16] truncate">{ev.name}</div>
                            <div className="text-[11px] text-slate-500 truncate">
                              {ev.venue} · {ev.organizer}
                            </div>
                          </td>
                          <td className="py-2.5 px-4 text-slate-600">
                            <div className="font-mono truncate">{ev.dateLabel}</div>
                            <div className="text-[11px] truncate">{ev.city}</div>
                          </td>
                          <td className="py-2.5 px-4 text-slate-700 truncate">{ev.ticketInfo}</td>
                          <td className="py-2.5 px-4">
                            <button
                              type="button"
                              onClick={() => toggleEventStatus(ev)}
                              className={`text-xs font-semibold cursor-pointer hover:underline ${
                                ev.status === 'published' ? 'text-[#059669]' : 'text-amber-700'
                              }`}
                            >
                              {ev.status === 'published' ? 'Publicerad' : 'Utkast'}
                            </button>
                          </td>
                          <td className="py-2.5 px-4 text-right">
                            <button
                              type="button"
                              onClick={async () => {
                                await api.deleteEvent(ev.id);
                                await onRefresh();
                                onNotify(`${ev.name} borttagen.`);
                              }}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="lg:hidden divide-y divide-slate-100">
                  {store.events.map((ev) => (
                    <div key={ev.id} className="p-4 flex items-start justify-between gap-3 text-xs">
                      <div className="min-w-0 space-y-1">
                        <div className="font-semibold text-[#040B16]">{ev.name}</div>
                        <div className="text-[11px] text-slate-500">
                          {ev.dateLabel} · {ev.city} · {ev.ticketInfo}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => toggleEventStatus(ev)}
                          className={`text-[11px] font-semibold cursor-pointer ${
                            ev.status === 'published' ? 'text-[#059669]' : 'text-amber-700'
                          }`}
                        >
                          {ev.status === 'published' ? 'Publicerad' : 'Utkast'}
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            await api.deleteEvent(ev.id);
                            await onRefresh();
                            onNotify(`${ev.name} borttagen.`);
                          }}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* D-Congress Sessions */}
              <form
                onSubmit={handleAddSession}
                className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4"
              >
                <h2 className="font-display text-lg font-bold text-[#040B16]">
                  Lägg till programpunkt för D-Congress 2027
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <input
                    type="text"
                    required
                    value={newSessionTitle}
                    onChange={(e) => setNewSessionTitle(e.target.value)}
                    placeholder="Titel på programpunkt *"
                    className="sm:col-span-2 px-3.5 py-2 rounded-xl border border-slate-200 text-xs"
                  />
                  <input
                    type="text"
                    value={newSessionSpeaker}
                    onChange={(e) => setNewSessionSpeaker(e.target.value)}
                    placeholder="Talare & bolag"
                    className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs"
                  />
                  <input
                    type="text"
                    value={newSessionTime}
                    onChange={(e) => setNewSessionTime(e.target.value)}
                    placeholder="Dag 1 · 16:00"
                    className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs"
                  />
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex gap-2">
                    <select
                      value={newSessionStage}
                      onChange={(e) => setNewSessionStage(e.target.value)}
                      className="px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white"
                    >
                      <option>Main Stage</option>
                      <option>Global Stage</option>
                      <option>Tech & Growth</option>
                    </select>
                    <select
                      value={newSessionTrack}
                      onChange={(e) => setNewSessionTrack(e.target.value)}
                      className="px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white"
                    >
                      <option>AI & Data</option>
                      <option>Cross-Border & Logistik</option>
                      <option>Checkout & Tillväxt</option>
                    </select>
                  </div>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-[#040B16] hover:bg-[#006AA7] text-white text-xs font-bold cursor-pointer"
                  >
                    + Spara programpunkt
                  </button>
                </div>
              </form>

              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-mono">
                      <th className="py-2.5 px-4 font-semibold">Tid & Scen</th>
                      <th className="py-2.5 px-4 font-semibold">Titel & Talare</th>
                      <th className="py-2.5 px-4 font-semibold">Spår</th>
                      <th className="py-2.5 px-4 font-semibold">Status</th>
                      <th className="py-2.5 px-4 font-semibold text-right">Ta bort</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {store.sessions.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-4 font-mono text-slate-600">
                          <div>{s.time}</div>
                          <div className="text-[11px]">{s.stage}</div>
                        </td>
                        <td className="py-2.5 px-4">
                          <div className="font-semibold text-[#040B16]">{s.title}</div>
                          <div className="text-[11px] text-slate-500">{s.speaker}</div>
                        </td>
                        <td className="py-2.5 px-4 text-slate-700">{s.track}</td>
                        <td className="py-2.5 px-4">
                          <button
                            type="button"
                            onClick={() => toggleSessionStatus(s)}
                            className={`text-xs font-semibold cursor-pointer hover:underline ${
                              s.status === 'published' ? 'text-[#059669]' : 'text-amber-700'
                            }`}
                          >
                            {s.status === 'published' ? 'Publicerad' : 'Utkast'}
                          </button>
                        </td>
                        <td className="py-2.5 px-4 text-right">
                          <button
                            type="button"
                            onClick={async () => {
                              await api.deleteSession(s.id);
                              await onRefresh();
                              onNotify('Programpunkt borttagen.');
                            }}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SECTION: JOBS & RECRUITMENT SITES */}
          {section === 'jobs' && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="inline-flex bg-white p-1 rounded-xl border border-slate-200 text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setJobsTab('jobs')}
                    className={`px-4 py-2 rounded-lg transition-colors cursor-pointer ${
                      jobsTab === 'jobs' ? 'bg-[#040B16] text-white' : 'text-slate-600 hover:text-[#040B16]'
                    }`}
                  >
                    Lediga jobb ({store.jobs.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setJobsTab('recruiters')}
                    className={`px-4 py-2 rounded-lg transition-colors cursor-pointer ${
                      jobsTab === 'recruiters'
                        ? 'bg-[#040B16] text-white'
                        : 'text-slate-600 hover:text-[#040B16]'
                    }`}
                  >
                    Rekryteringssidor per roll ({store.recruitmentSites.length})
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {jobsTab === 'jobs' && (
                    <button
                      type="button"
                      disabled={validatingJobs}
                      onClick={handleValidateJobs}
                      className="px-3.5 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-[#040B16] text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {validatingJobs ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <ShieldCheck className="w-3.5 h-3.5 text-[#059669]" />
                      )}
                      Validera & stäng utgångna/felaktiga jobb
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setDiscTarget(jobsTab === 'jobs' ? 'jobs' : 'recruiters');
                      setSection('discover');
                    }}
                    className="px-3.5 py-2 rounded-lg bg-[#FECC02] hover:bg-[#EAB308] text-[#040B16] text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    {jobsTab === 'jobs'
                      ? 'Sök & lägg till jobb via AI'
                      : 'Sök & lägg till rekryteringssidor via AI'}
                  </button>
                </div>
              </div>

              {jobsTab === 'jobs' ? (
                <>
                  <JobTextPanel jobs={store.jobs} onRefresh={onRefresh} onNotify={onNotify} />
                  <form
                    onSubmit={handleAddJob}
                    className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4"
                  >
                    <h2 className="font-display text-lg font-bold text-[#040B16]">
                      Publicera nytt e-handelsjobb
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      <input
                        type="text"
                        required
                        value={newJobTitle}
                        onChange={(e) => setNewJobTitle(e.target.value)}
                        placeholder="Rolltitel *"
                        className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs"
                      />
                      <input
                        type="text"
                        required
                        value={newJobCompany}
                        onChange={(e) => setNewJobCompany(e.target.value)}
                        placeholder="Företag *"
                        className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs"
                      />
                      <input
                        type="text"
                        value={newJobCity}
                        onChange={(e) => setNewJobCity(e.target.value)}
                        placeholder="Stad"
                        className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs"
                      />
                      <select
                        value={newJobModel}
                        onChange={(e) => setNewJobModel(e.target.value as 'Hybrid' | 'På plats' | 'Remote')}
                        className="px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white"
                      >
                        <option value="Hybrid">Hybrid</option>
                        <option value="På plats">På plats</option>
                        <option value="Remote">Remote</option>
                      </select>
                      <select
                        value={newJobRole}
                        onChange={(e) => setNewJobRole(e.target.value as JobRoleCategory)}
                        className="px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white"
                      >
                        {JOB_ROLE_OPTIONS.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                      <input
                        type="text"
                        value={newJobSeniority}
                        onChange={(e) => setNewJobSeniority(e.target.value)}
                        placeholder="Nivå (t.ex. Senior)"
                        className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs"
                      />
                      <input
                        type="text"
                        value={newJobSalary}
                        onChange={(e) => setNewJobSalary(e.target.value)}
                        placeholder="Lönespann (valfritt)"
                        className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs"
                      />
                      <input
                        type="text"
                        value={newJobUrl}
                        onChange={(e) => setNewJobUrl(e.target.value)}
                        placeholder="Ansökningslänk (https://...)"
                        className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs"
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <input
                        type="text"
                        value={newJobSkills}
                        onChange={(e) => setNewJobSkills(e.target.value)}
                        placeholder="Kompetenser (komma-separerat)"
                        className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs"
                      />
                      <textarea
                        aria-label="Kort ingress"
                        maxLength={240}
                        rows={2}
                        value={newJobSummary}
                        onChange={(e) => setNewJobSummary(e.target.value)}
                        placeholder="Kort ingress (högst 240 tecken)"
                        className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs"
                      />
                      <input
                        type="date"
                        value={newJobExpiresAt}
                        onChange={(e) => setNewJobExpiresAt(e.target.value)}
                        title="Sista ansökningsdag"
                        className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-mono"
                      />
                    </div>
                    <label className="block text-sm">Fullständig beskrivning
                      <textarea rows={8} value={newJobDesc} onChange={(e) => setNewJobDesc(e.target.value)} placeholder="Tom rad skapar stycke; börja punktlistor med -." className="w-full px-3 py-2 rounded-xl border border-slate-300" />
                    </label>
                    <div className="flex justify-end">
                      <button
                        type="submit"
                        className="px-4 py-2 rounded-xl bg-[#040B16] hover:bg-[#006AA7] text-white text-xs font-bold cursor-pointer"
                      >
                        + Publicera jobb
                      </button>
                    </div>
                  </form>

                  <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                    <div className="hidden lg:block">
                      <table className="w-full table-fixed text-left border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-mono">
                            <th className="py-2.5 px-4 font-semibold w-[30%]">Roll & Företag</th>
                            <th className="py-2.5 px-4 font-semibold w-[26%]">Giltighet & Kontroll</th>
                            <th className="py-2.5 px-4 font-semibold w-[18%]">Plats</th>
                            <th className="py-2.5 px-4 font-semibold w-[12%]">Status</th>
                            <th className="py-2.5 px-4 font-semibold text-right w-[14%]">Åtgärder</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {store.jobs.map((j) => {
                            const isClosed =
                              j.status !== 'published' ||
                              j.jobStatus === 'expired' ||
                              j.jobStatus === 'closed';
                            return (
                              <tr key={j.id} className={`hover:bg-slate-50 ${isClosed ? 'opacity-70 bg-slate-50/50' : ''}`}>
                                <td className="py-2.5 px-4">
                                  <div className="font-semibold text-[#040B16] truncate">{j.title}</div>
                                  <div className="text-[11px] text-slate-500 truncate">
                                    {j.company} · {j.roleCategory} · {j.seniority}
                                  </div>
                                </td>
                                <td className="py-2.5 px-4">
                                  <div className="font-mono tabular-nums text-[11px] text-slate-700">
                                    {j.expiresAt ? `T.o.m. ${j.expiresAt}` : 'Ingen slutdatum'}
                                  </div>
                                  {j.validationNote && (
                                    <div className="text-[11px] text-slate-500 truncate">
                                      {j.validationNote}
                                    </div>
                                  )}
                                </td>
                                <td className="py-2.5 px-4 text-slate-600 truncate">
                                  {j.city} · {j.workModel}
                                </td>
                                <td className="py-2.5 px-4">
                                  <span
                                    className={`text-xs font-semibold ${
                                      j.jobStatus === 'expired'
                                        ? 'text-red-600'
                                        : isClosed
                                        ? 'text-amber-700'
                                        : 'text-[#059669]'
                                    }`}
                                  >
                                    {j.jobStatus === 'expired'
                                      ? 'Utgången (Stängd)'
                                      : j.jobStatus === 'closed' || j.status !== 'published'
                                      ? 'Stängd'
                                      : 'Aktiv'}
                                  </span>
                                </td>
                                <td className="py-2.5 px-4 text-right">
                                  <div className="inline-flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => toggleJobStatus(j)}
                                      className="text-[11px] font-semibold text-[#006AA7] hover:underline cursor-pointer"
                                    >
                                      {isClosed ? 'Återaktivera' : 'Stäng'}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={async () => {
                                        await api.deleteJob(j.id);
                                        await onRefresh();
                                        onNotify('Jobb borttaget.');
                                      }}
                                      className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 cursor-pointer"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    <div className="lg:hidden divide-y divide-slate-100">
                      {store.jobs.map((j) => {
                        const isClosed =
                          j.status !== 'published' ||
                          j.jobStatus === 'expired' ||
                          j.jobStatus === 'closed';
                        return (
                          <div key={j.id} className="p-4 flex items-start justify-between gap-3 text-xs">
                            <div className="min-w-0 space-y-1">
                              <div className="font-semibold text-[#040B16]">{j.title}</div>
                              <div className="text-[11px] text-slate-500">
                                {j.company} · {j.city} · {j.workModel}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                type="button"
                                onClick={() => toggleJobStatus(j)}
                                className="text-[11px] font-semibold text-[#006AA7] cursor-pointer"
                              >
                                {isClosed ? 'Aktivera' : 'Stäng'}
                              </button>
                              <button
                                type="button"
                                onClick={async () => {
                                  await api.deleteJob(j.id);
                                  await onRefresh();
                                  onNotify('Jobb borttaget.');
                                }}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <form
                    onSubmit={handleAddRecruiter}
                    className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4"
                  >
                    <h2 className="font-display text-lg font-bold text-[#040B16]">
                      Lägg till rekryteringssida eller headhunter
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      <input
                        type="text"
                        required
                        value={newRecName}
                        onChange={(e) => setNewRecName(e.target.value)}
                        placeholder="Namn på aktör *"
                        className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs"
                      />
                      <input
                        type="text"
                        value={newRecDomain}
                        onChange={(e) => setNewRecDomain(e.target.value)}
                        placeholder="Domän (t.ex. ehandelsjobb.se)"
                        className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs"
                      />
                      <select
                        value={newRecType}
                        onChange={(e) => setNewRecType(e.target.value as RecruitmentSite['type'])}
                        className="px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white"
                      >
                        <option value="Rekryteringsbyrå">Rekryteringsbyrå</option>
                        <option value="Jobbportal">Jobbportal</option>
                        <option value="Headhunting & Interim">Headhunting & Interim</option>
                      </select>
                      <input
                        type="text"
                        value={newRecCoverage}
                        onChange={(e) => setNewRecCoverage(e.target.value)}
                        placeholder="Täckning (t.ex. Hela Sverige)"
                        className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs"
                      />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {JOB_ROLE_OPTIONS.map((role) => {
                        const active = newRecRoles.includes(role);
                        return (
                          <button
                            key={role}
                            type="button"
                            onClick={() =>
                              setNewRecRoles((prev) =>
                                prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
                              )
                            }
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                              active
                                ? 'bg-[#040B16] text-white'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            {role}
                          </button>
                        );
                      })}
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <input
                        type="text"
                        value={newRecDesc}
                        onChange={(e) => setNewRecDesc(e.target.value)}
                        placeholder="Beskrivning av specialisering..."
                        className="flex-1 px-3.5 py-2 rounded-xl border border-slate-200 text-xs"
                      />
                      <button
                        type="submit"
                        className="px-4 py-2 rounded-xl bg-[#040B16] hover:bg-[#006AA7] text-white text-xs font-bold cursor-pointer whitespace-nowrap"
                      >
                        + Spara rekryteringssida
                      </button>
                    </div>
                  </form>

                  <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-mono">
                          <th className="py-2.5 px-4 font-semibold">Aktör</th>
                          <th className="py-2.5 px-4 font-semibold">Typ</th>
                          <th className="py-2.5 px-4 font-semibold">Roller</th>
                          <th className="py-2.5 px-4 font-semibold">Status</th>
                          <th className="py-2.5 px-4 font-semibold text-right">Ta bort</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {store.recruitmentSites.map((r) => (
                          <tr key={r.id} className="hover:bg-slate-50">
                            <td className="py-2.5 px-4">
                              <div className="font-semibold text-[#040B16]">{r.name}</div>
                              <div className="text-[11px] text-slate-500">
                                {r.domain} · {r.coverage}
                              </div>
                            </td>
                            <td className="py-2.5 px-4 text-slate-700">{r.type}</td>
                            <td className="py-2.5 px-4 text-slate-600">{r.rolesCovered.join(' · ')}</td>
                            <td className="py-2.5 px-4">
                              <button
                                type="button"
                                onClick={() => toggleRecruiterStatus(r)}
                                className={`text-xs font-semibold cursor-pointer hover:underline ${
                                  r.status === 'published' ? 'text-[#059669]' : 'text-amber-700'
                                }`}
                              >
                                {r.status === 'published' ? 'Publicerad' : 'Utkast'}
                              </button>
                            </td>
                            <td className="py-2.5 px-4 text-right">
                              <button
                                type="button"
                                onClick={async () => {
                                  await api.deleteRecruiter(r.id);
                                  await onRefresh();
                                  onNotify('Rekryteringssida borttagen.');
                                }}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          )}

          {/* SECTION: REGIONS & COMMUNITY */}
          {section === 'content' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <MapPointsEditor points={store.mapPoints || []} regions={store.regions} onRefresh={onRefresh} onNotify={onNotify} />
              {activeRegion && (
                <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="font-display text-lg font-bold text-[#040B16]">
                      Redigera regional marknadsdata
                    </h2>
                    <select
                      value={editingRegionKey}
                      onChange={(e) => setEditingRegionKey(e.target.value)}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold bg-white"
                    >
                      {Object.values(store.regions).map((r) => (
                        <option key={r.key} value={r.key}>
                          {r.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      const form = new FormData(e.currentTarget);
                      await api.updateRegion(editingRegionKey, {
                        share: String(form.get('share') || activeRegion.share),
                        aov: String(form.get('aov') || activeRegion.aov),
                        hubs: String(form.get('hubs') || activeRegion.hubs),
                        desc: String(form.get('desc') || activeRegion.desc),
                      });
                      await onRefresh();
                      onNotify(`Uppdaterade ${activeRegion.name}.`);
                    }}
                    key={activeRegion.key}
                    className="space-y-3"
                  >
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">
                          Andel av riket
                        </label>
                        <input
                          name="share"
                          defaultValue={activeRegion.share}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">
                          Snittorder (AOV)
                        </label>
                        <input
                          name="aov"
                          defaultValue={activeRegion.aov}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">
                        Nyckelhubbar
                      </label>
                      <input
                        name="hubs"
                        defaultValue={activeRegion.hubs}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">
                        Beskrivning
                      </label>
                      <textarea
                        name="desc"
                        rows={3}
                        defaultValue={activeRegion.desc}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                      />
                    </div>
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-xl bg-[#040B16] hover:bg-[#006AA7] text-white text-xs font-bold cursor-pointer"
                    >
                      Spara regiondata
                    </button>
                  </form>
                </div>
              )}

              {/* Community Member Applications & Verification */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="font-display text-lg font-bold text-[#040B16] inline-flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-[#059669]" />
                      Medlemsansökningar &amp; Verifiering ({store.communityMembers.length})
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Granska e-handelsbutik, domän och ordervolym innan medlemmar markeras som verifierade.
                    </p>
                  </div>
                </div>

                {store.communityMembers.length === 0 ? (
                  <div className="text-xs text-slate-500 p-4 rounded-xl bg-[#F4F6F9] border border-slate-200">
                    Inga medlemsansökningar ännu.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-200 max-h-96 overflow-y-auto pr-1">
                    {store.communityMembers.map((mem) => {
                      const vStatus = mem.verificationStatus || 'pending';
                      const badgeCls =
                        vStatus === 'verified'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : vStatus === 'rejected'
                          ? 'bg-rose-50 text-rose-800 border-rose-200'
                          : 'bg-amber-50 text-amber-800 border-amber-200';
                      const badgeLabel =
                        vStatus === 'verified'
                          ? 'Verifierad'
                          : vStatus === 'rejected'
                          ? 'Avslagen'
                          : 'Väntar verifiering';

                      return (
                        <div key={mem.id} className="py-3.5 space-y-2">
                          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                            <div className="space-y-0.5 text-xs">
                              <div className="flex flex-wrap items-center gap-2">
                                <span
                                  className={`px-2 py-0.5 rounded-md border text-[11px] font-mono font-bold ${badgeCls}`}
                                >
                                  {badgeLabel}
                                </span>
                                <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-mono font-semibold">
                                  {mem.memberType || 'E-handlare / Butik'}
                                </span>
                                <span className="font-bold text-[#040B16]">{mem.name}</span>
                                <span className="text-slate-500">({mem.email})</span>
                              </div>
                              <div className="text-slate-700">
                                <strong>{mem.role}</strong> · {mem.city}
                                {mem.company ? ` · ${mem.company}` : ''}
                                {mem.website ? ` (${mem.website})` : ''}
                              </div>
                              {(mem.annualOrders || mem.serviceFocus || mem.platform || mem.linkedinUrl) && (
                                <div className="text-[11px] text-slate-500">
                                  {[mem.annualOrders, mem.serviceFocus, mem.platform, mem.linkedinUrl]
                                    .filter(Boolean)
                                    .join(' · ')}
                                </div>
                              )}
                              {mem.interests && mem.interests.length > 0 && (
                                <div className="text-[11px] text-[#006AA7] font-medium">
                                  Intressen: {mem.interests.join(' · ')}
                                </div>
                              )}
                              {mem.motivation && (
                                <p className="text-[11px] text-slate-600 pt-0.5">{mem.motivation}</p>
                              )}
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <select
                                value={vStatus}
                                onChange={async (e) => {
                                  const next = e.target.value as 'pending' | 'verified' | 'rejected';
                                  await api.updateMemberStatus(mem.id, next);
                                  await onRefresh();
                                  onNotify(`Medlemsstatus för ${mem.name} uppdaterad.`);
                                }}
                                className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-[11px] font-semibold"
                                aria-label={`Verifieringsstatus för ${mem.name}`}
                              >
                                <option value="pending">Väntar</option>
                                <option value="verified">Verifierad</option>
                                <option value="rejected">Avslagen</option>
                              </select>
                              <button
                                type="button"
                                onClick={async () => {
                                  await api.deleteMember(mem.id);
                                  await onRefresh();
                                  onNotify(`Ansökan från ${mem.name} borttagen.`);
                                }}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 cursor-pointer"
                                aria-label={`Ta bort ${mem.name}`}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
                <h2 className="font-display text-lg font-bold text-[#040B16]">
                  Moderera Community-trådar ({store.communityThreads.length})
                </h2>
                <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
                  {store.communityThreads.map((t) => (
                    <div key={t.id} className="py-3 flex items-start justify-between gap-3">
                      <div className="text-xs space-y-0.5">
                        <div className="font-mono text-[#006AA7] font-semibold">
                          {t.channel} · {t.votes} röster
                        </div>
                        <div className="font-semibold text-[#040B16]">{t.title}</div>
                        <div className="text-slate-500">{t.author}</div>
                      </div>
                      <button
                        type="button"
                        onClick={async () => {
                          await api.deleteThread(t.id);
                          await onRefresh();
                          onNotify('Tråd borttagen.');
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 shrink-0 cursor-pointer"
                        aria-label="Ta bort tråd"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Order Benchmarks by Category Editor */}
              {(() => {
                const activeBench =
                  store.orderBenchmarks.find((b) => b.id === editingBenchmarkId) ||
                  store.orderBenchmarks[0];
                if (!activeBench) return null;
                return (
                  <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
                    <div className="flex items-center justify-between gap-2">
                      <h2 className="font-display text-lg font-bold text-[#040B16]">
                        Redigera branschnyckeltal (AOV & UPT)
                      </h2>
                      <select
                        value={activeBench.id}
                        onChange={(e) => setEditingBenchmarkId(e.target.value)}
                        className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold bg-white"
                      >
                        {store.orderBenchmarks.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.category}
                          </option>
                        ))}
                      </select>
                    </div>
                    <form
                      key={activeBench.id}
                      onSubmit={async (e) => {
                        e.preventDefault();
                        const form = new FormData(e.currentTarget);
                        await api.updateOrderBenchmark(activeBench.id, {
                          avgOrderValueSek: Number(form.get('aov') || activeBench.avgOrderValueSek),
                          itemsPerOrder: Number(form.get('upt') || activeBench.itemsPerOrder),
                          avgCustomerShippingFeeSek: Number(
                            form.get('custShip') || activeBench.avgCustomerShippingFeeSek
                          ),
                          merchantShippingCostSek: Number(
                            form.get('merchShip') || activeBench.merchantShippingCostSek
                          ),
                          freeShippingThresholdSek: Number(
                            form.get('threshold') || activeBench.freeShippingThresholdSek
                          ),
                          returnRatePct: Number(form.get('ret') || activeBench.returnRatePct),
                        });
                        await onRefresh();
                        onNotify(`Uppdaterade nyckeltal för ${activeBench.category}.`);
                      }}
                      className="space-y-3"
                    >
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                            Snittorder (SEK)
                          </label>
                          <input
                            type="number"
                            name="aov"
                            defaultValue={activeBench.avgOrderValueSek}
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                            Artiklar / order
                          </label>
                          <input
                            type="number"
                            step="0.1"
                            name="upt"
                            defaultValue={activeBench.itemsPerOrder}
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                            Returgrad (%)
                          </label>
                          <input
                            type="number"
                            step="0.1"
                            name="ret"
                            defaultValue={activeBench.returnRatePct}
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                            Kundfrakt (SEK)
                          </label>
                          <input
                            type="number"
                            name="custShip"
                            defaultValue={activeBench.avgCustomerShippingFeeSek}
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                            Handlarfrakt (SEK)
                          </label>
                          <input
                            type="number"
                            name="merchShip"
                            defaultValue={activeBench.merchantShippingCostSek}
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                            Fri frakt-gräns (SEK)
                          </label>
                          <input
                            type="number"
                            name="threshold"
                            defaultValue={activeBench.freeShippingThresholdSek}
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono"
                          />
                        </div>
                      </div>
                      <button
                        type="submit"
                        className="px-4 py-2 rounded-xl bg-[#040B16] hover:bg-[#006AA7] text-white text-xs font-bold cursor-pointer"
                      >
                        Spara branschnyckeltal
                      </button>
                    </form>
                  </div>
                );
              })()}

              {/* Shipping Tiers Editor */}
              {(() => {
                const activeTier =
                  store.shippingTiers.find((t) => t.id === editingTierId) ||
                  store.shippingTiers[0];
                if (!activeTier) return null;
                return (
                  <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
                    <div className="flex items-center justify-between gap-2">
                      <h2 className="font-display text-lg font-bold text-[#040B16]">
                        Redigera fraktkostnad per ordernivå
                      </h2>
                      <select
                        value={activeTier.id}
                        onChange={(e) => setEditingTierId(e.target.value)}
                        className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold bg-white"
                      >
                        {store.shippingTiers.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.orderValueRange}
                          </option>
                        ))}
                      </select>
                    </div>
                    <form
                      key={activeTier.id}
                      onSubmit={async (e) => {
                        e.preventDefault();
                        const form = new FormData(e.currentTarget);
                        await api.updateShippingTier(activeTier.id, {
                          customerShippingFeeSek: Number(
                            form.get('custFee') || activeTier.customerShippingFeeSek
                          ),
                          merchantShippingCostSek: Number(
                            form.get('merchCost') || activeTier.merchantShippingCostSek
                          ),
                          freeShippingSharePct: Number(
                            form.get('freePct') || activeTier.freeShippingSharePct
                          ),
                          dominantMethod: String(
                            form.get('method') || activeTier.dominantMethod
                          ),
                        });
                        await onRefresh();
                        onNotify(`Uppdaterade fraktnivå: ${activeTier.orderValueRange}.`);
                      }}
                      className="space-y-3"
                    >
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                            Kundbetald frakt (SEK)
                          </label>
                          <input
                            type="number"
                            name="custFee"
                            defaultValue={activeTier.customerShippingFeeSek}
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                            Handlarens fraktkostnad (SEK)
                          </label>
                          <input
                            type="number"
                            name="merchCost"
                            defaultValue={activeTier.merchantShippingCostSek}
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                            Andel fri frakt (%)
                          </label>
                          <input
                            type="number"
                            name="freePct"
                            defaultValue={activeTier.freeShippingSharePct}
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                            Dominerande leveranssätt
                          </label>
                          <input
                            type="text"
                            name="method"
                            defaultValue={activeTier.dominantMethod}
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                          />
                        </div>
                      </div>
                      <button
                        type="submit"
                        className="px-4 py-2 rounded-xl bg-[#040B16] hover:bg-[#006AA7] text-white text-xs font-bold cursor-pointer"
                      >
                        Spara fraktnivå
                      </button>
                    </form>
                  </div>
                );
              })()}

              {/* Legislation & Compliance Manager */}
              <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="font-display text-lg font-bold text-[#040B16] inline-flex items-center gap-2">
                      <Scale className="w-4 h-4 text-[#006AA7]" />
                      Lagstiftning & Compliance ({store.laws.length})
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Lagar och EU-förordningar som visas på Marknad & Insikter.
                    </p>
                  </div>
                </div>

                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!newLawTitle.trim()) return;
                    await api.upsertLaw({
                      title: newLawTitle.trim(),
                      category: newLawCategory,
                      authority: newLawAuthority.trim() || 'Konsumentverket',
                      effectiveDate: newLawDate.trim() || 'Gällande',
                      summary: newLawSummary.trim() || 'Regelverk för svensk e-handel.',
                      requirements: newLawRequirements
                        .split(',')
                        .map((s) => s.trim())
                        .filter(Boolean),
                      penaltyInfo: newLawPenalty.trim() || 'Sanktionsavgift vid överträdelse',
                    });
                    setNewLawTitle('');
                    setNewLawSummary('');
                    setNewLawRequirements('');
                    await onRefresh();
                    onNotify('Lagstiftning sparad i CMS.');
                  }}
                  className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pb-4 border-b border-slate-100"
                >
                  <input
                    type="text"
                    required
                    value={newLawTitle}
                    onChange={(e) => setNewLawTitle(e.target.value)}
                    placeholder="Lag / Förordning *"
                    className="sm:col-span-2 px-3 py-2 rounded-xl border border-slate-200 text-xs"
                  />
                  <select
                    value={newLawCategory}
                    onChange={(e) => setNewLawCategory(e.target.value as LawCategory)}
                    className="px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white"
                  >
                    <option value="Pris & Kassa">Pris & Kassa</option>
                    <option value="Konsumenträtt">Konsumenträtt</option>
                    <option value="Data & Tillgänglighet">Data & Tillgänglighet</option>
                    <option value="Hållbarhet & Tull">Hållbarhet & Tull</option>
                  </select>
                  <input
                    type="text"
                    value={newLawAuthority}
                    onChange={(e) => setNewLawAuthority(e.target.value)}
                    placeholder="Tillsynsmyndighet"
                    className="px-3 py-2 rounded-xl border border-slate-200 text-xs"
                  />
                  <input
                    type="text"
                    value={newLawDate}
                    onChange={(e) => setNewLawDate(e.target.value)}
                    placeholder="Ikraftträdande (t.ex. Juni 2026)"
                    className="px-3 py-2 rounded-xl border border-slate-200 text-xs"
                  />
                  <input
                    type="text"
                    value={newLawSummary}
                    onChange={(e) => setNewLawSummary(e.target.value)}
                    placeholder="Kort sammanfattning"
                    className="sm:col-span-2 px-3 py-2 rounded-xl border border-slate-200 text-xs"
                  />
                  <input
                    type="text"
                    value={newLawPenalty}
                    onChange={(e) => setNewLawPenalty(e.target.value)}
                    placeholder="Sanktion vid brott"
                    className="px-3 py-2 rounded-xl border border-slate-200 text-xs"
                  />
                  <input
                    type="text"
                    value={newLawRequirements}
                    onChange={(e) => setNewLawRequirements(e.target.value)}
                    placeholder="Krav i praktiken (komma-separerat)"
                    className="sm:col-span-3 px-3 py-2 rounded-xl border border-slate-200 text-xs"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-[#040B16] hover:bg-[#006AA7] text-white text-xs font-bold cursor-pointer"
                  >
                    + Lägg till regelverk
                  </button>
                </form>

                <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
                  {store.laws.map((law: EcommerceLaw) => (
                    <div key={law.id} className="py-3 flex items-start justify-between gap-4">
                      <div className="space-y-0.5 text-xs">
                        <div className="font-mono text-[#006AA7] font-semibold">
                          {law.category} · {law.authority} · {law.effectiveDate}
                        </div>
                        <div className="font-semibold text-[#040B16]">{law.title}</div>
                        <div className="text-slate-600">{law.summary}</div>
                      </div>
                      <button
                        type="button"
                        onClick={async () => {
                          await api.deleteLaw(law.id);
                          await onRefresh();
                          onNotify(`Tog bort ${law.title}.`);
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 shrink-0 cursor-pointer"
                        aria-label={`Ta bort ${law.title}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Ad Banners & Holders Manager */}
              <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="font-display text-lg font-bold text-[#040B16] inline-flex items-center gap-2">
                      <Megaphone className="w-4 h-4 text-[#006AA7]" />
                      Annonsbanners & Banner Holders ({store.adBanners.length})
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Hantera aktiva annonser (t.ex. D-Congress 2027 & Checkoutstrategi.se) samt lediga annonsplatser på portalen.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {store.adBanners.map((banner: AdBanner) => (
                    <form
                      key={`${banner.id}-${banner.mode}-${banner.active}`}
                      onSubmit={async (e) => {
                        e.preventDefault();
                        const form = new FormData(e.currentTarget);
                        await api.upsertAdBanner({
                          ...banner,
                          sponsorName: String(form.get('sponsorName') || banner.sponsorName),
                          headline: String(form.get('headline') || banner.headline),
                          body: String(form.get('body') || banner.body),
                          ctaLabel: String(form.get('ctaLabel') || banner.ctaLabel),
                          targetUrl: String(form.get('targetUrl') || banner.targetUrl),
                          theme: (String(form.get('theme') || banner.theme) as AdBanner['theme']),
                          mode: (String(form.get('mode') || banner.mode) as AdBanner['mode']),
                        });
                        await onRefresh();
                        onNotify(`Annonsplats "${banner.placementLabel}" uppdaterad.`);
                      }}
                      className="p-4 rounded-xl border border-slate-200 space-y-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <div className="font-display font-bold text-sm text-[#040B16]">
                            {banner.placementLabel}
                          </div>
                          <div className="text-[11px] font-mono text-slate-500 tabular-nums">
                            {banner.placement} · {banner.dimensions}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={async () => {
                            await api.upsertAdBanner({
                              ...banner,
                              active: !banner.active,
                            });
                            await onRefresh();
                            onNotify(
                              !banner.active
                                ? `${banner.placementLabel} aktiverad.`
                                : `${banner.placementLabel} pausad.`
                            );
                          }}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer ${
                            banner.active
                              ? 'bg-emerald-50 text-[#059669] border border-emerald-200'
                              : 'bg-slate-100 text-slate-600 border border-slate-200'
                          }`}
                        >
                          {banner.active ? 'Aktiv' : 'Pausad'}
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <input
                          name="sponsorName"
                          defaultValue={banner.sponsorName}
                          placeholder="Annonsör"
                          className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs"
                        />
                        <select
                          name="mode"
                          defaultValue={banner.mode}
                          className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs bg-white"
                        >
                          <option value="active">Aktiv annons</option>
                          <option value="placeholder">Ledig holder</option>
                        </select>
                      </div>

                      <input
                        name="headline"
                        defaultValue={banner.headline}
                        placeholder="Rubrik"
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold"
                      />

                      <input
                        name="body"
                        defaultValue={banner.body}
                        placeholder="Annonstext"
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs"
                      />

                      <div className="grid grid-cols-3 gap-2">
                        <input
                          name="ctaLabel"
                          defaultValue={banner.ctaLabel}
                          placeholder="CTA-knapp"
                          className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs"
                        />
                        <input
                          name="targetUrl"
                          defaultValue={banner.targetUrl}
                          placeholder="Länk (https://...)"
                          className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs"
                        />
                        <select
                          name="theme"
                          defaultValue={banner.theme}
                          className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs bg-white"
                        >
                          <option value="navy">Tema: Navy</option>
                          <option value="gold">Tema: Guld</option>
                          <option value="light">Tema: Ljus</option>
                        </select>
                      </div>

                      <div className="flex justify-end">
                        <button
                          type="submit"
                          className="px-3 py-1.5 rounded-lg bg-[#040B16] hover:bg-[#006AA7] text-white text-xs font-bold cursor-pointer"
                        >
                          Spara banner
                        </button>
                      </div>
                    </form>
                  ))}
                </div>
              </div>

              {/* Contact & Intro Inbox */}
              <CMSInboxPanel
                messages={store.contactMessages}
                partners={store.partners}
                logisticsProviders={store.logisticsProviders}
                editorialEmail={store.pageContent?.kontakt?.contactEmail || 'hej@sverigesehandel.se'}
                onRefresh={onRefresh}
                onNotify={onNotify}
              />
            </div>
          )}

          {/* SECTION: FORMS & INTRO ROUTING */}
          {section === 'forms' && (
            <CMSFormsSection
              forms={store.contactForms || []}
              partners={store.partners}
              logisticsProviders={store.logisticsProviders || []}
              editorialEmail={store.pageContent?.kontakt?.contactEmail || 'hej@sverigesehandel.se'}
              inboxCount={store.contactMessages.length}
              onRefresh={onRefresh}
              onNotify={onNotify}
              onOpenInbox={() => setSection('content')}
            />
          )}

          {section === 'members' && <MemberGovernancePanel store={store} onRefresh={onRefresh} />}

          {section === 'commerce' && <CommerceEditor store={store} onRefresh={onRefresh}/>}
          {section === 'insights' && <InsightPostsEditor posts={store.insightPosts || []} onRefresh={onRefresh} />}

          {section === 'firebase' && <CmsFirebasePanel store={store} onRefresh={onRefresh} />}

          {/* SECTION: NEWS */}
          {section === 'news' && (
            <div className="space-y-6">
              <NewsReviewPanel news={store.news || []} onRefresh={onRefresh} onNotify={onNotify} />
              <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="font-display text-lg font-bold text-[#040B16]">
                      Hämta färska nyheter via Google Search AI
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Hämtar och sparar nya e-handelsnyheter om Temu, nya nätbutiker och nya SaaS-system direkt i CMS.
                    </p>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="text"
                    value={cmsNewsAiTopic}
                    onChange={(e) => setCmsNewsAiTopic(e.target.value)}
                    placeholder="Ämne att hämta nyheter om..."
                    className="flex-1 px-3.5 py-2 rounded-xl border border-slate-200 text-xs"
                  />
                  <button
                    type="button"
                    disabled={cmsNewsAiLoading}
                    onClick={async () => {
                      setCmsNewsAiLoading(true);
                      try {
                        const res = await api.fetchNewsWithAI({
                          topic: cmsNewsAiTopic,
                          count: 5,
                          autoSave: true,
                        });
                        await onRefresh();
                        onNotify(
                          `Hämtade ${res.candidates.length} artiklar och sparade ${res.saved?.added.length ?? 0} nya utkast för länkgranskning.`
                        );
                      } catch (err) {
                        onNotify((err as Error).message);
                      } finally {
                        setCmsNewsAiLoading(false);
                      }
                    }}
                    className="px-4 py-2 rounded-xl bg-[#FECC02] hover:bg-[#EAB308] disabled:opacity-50 text-[#040B16] text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                  >
                    {cmsNewsAiLoading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5" />
                    )}
                    {cmsNewsAiLoading ? 'Hämtar...' : 'Hämta & spara 5 utkast'}
                  </button>
                </div>
              </div>

              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!cmsNewsTitle.trim() || !cmsNewsSummary.trim()) return;
                  await api.upsertNews({
                    title: cmsNewsTitle.trim(),
                    summary: cmsNewsSummary.trim(),
                    category: cmsNewsCategory,
                    region: cmsNewsRegion,
                    sourceName: cmsNewsSourceName.trim() || 'sverigesehandel.se Redaktion',
                    sourceUrl: cmsNewsSourceUrl.trim(),
                    publishedDate: new Date().toISOString().slice(0, 10),
                    status: 'draft',
                  });
                  setCmsNewsTitle('');
                  setCmsNewsSummary('');
                  setCmsNewsSourceName('');
                  setCmsNewsSourceUrl('');
                  await onRefresh();
                  onNotify('Nyheten sparad som utkast. Granska direktlänken ovan före publicering.');
                }}
                className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4"
              >
                <h2 className="font-display text-lg font-bold text-[#040B16]">
                  Skapa nyhetsutkast manuellt
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <input
                    type="text"
                    required
                    value={cmsNewsTitle}
                    onChange={(e) => setCmsNewsTitle(e.target.value)}
                    placeholder="Rubrik *"
                    className="sm:col-span-2 px-3.5 py-2 rounded-xl border border-slate-200 text-xs"
                  />
                  <select
                    value={cmsNewsCategory}
                    onChange={(e) => setCmsNewsCategory(e.target.value as NewsCategory)}
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
                    value={cmsNewsRegion}
                    onChange={(e) =>
                      setCmsNewsRegion(
                        e.target.value as 'Sverige' | 'Europa' | 'Norden' | 'Globalt'
                      )
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
                    value={cmsNewsSourceName}
                    onChange={(e) => setCmsNewsSourceName(e.target.value)}
                    placeholder="Källa (t.ex. Breakit, Ehandel.se)"
                    className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs"
                  />
                  <input
                    type="url"
                    value={cmsNewsSourceUrl}
                    onChange={(e) => setCmsNewsSourceUrl(e.target.value)}
                    placeholder="Länk (https://...)"
                    className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs"
                  />
                </div>
                <textarea
                  rows={2}
                  required
                  value={cmsNewsSummary}
                  onChange={(e) => setCmsNewsSummary(e.target.value)}
                  placeholder="Sammanfattning av nyheten *"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs"
                />
                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-[#040B16] hover:bg-[#006AA7] text-white text-xs font-bold cursor-pointer"
                  >
                    + Spara nyhetsutkast
                  </button>
                </div>
              </form>

              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                <div className="hidden lg:block">
                  <table className="w-full table-fixed text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-mono">
                        <th className="py-2.5 px-4 font-semibold w-[40%]">Artikel &amp; Källa</th>
                        <th className="py-2.5 px-4 font-semibold w-[26%]">Kategori &amp; Region</th>
                        <th className="py-2.5 px-4 font-semibold w-[14%]">Datum</th>
                        <th className="py-2.5 px-4 font-semibold w-[12%]">Status</th>
                        <th className="py-2.5 px-4 font-semibold text-right w-[8%]">Ta bort</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(store.news || []).map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50">
                          <td className="py-3 px-4">
                            <div className="font-semibold text-[#040B16] truncate">{item.title}</div>
                            <div className="text-[11px] text-slate-500 truncate">{item.sourceName}</div>
                          </td>
                          <td className="py-3 px-4 text-slate-700 truncate">
                            {item.category} · {item.region}
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-500 tabular-nums">
                            {item.publishedDate}
                          </td>
                          <td className="py-3 px-4">
                            <button
                              type="button"
                              disabled={item.status === 'draft'}
                              title="Publicera via länkgranskningen ovan"
                              onClick={async () => {
                                await api.upsertNews({
                                  ...item,
                                  status: 'draft',
                                });
                                await onRefresh();
                              }}
                              className={`text-xs font-semibold cursor-pointer hover:underline ${
                                item.status === 'published' ? 'text-[#059669]' : 'text-amber-700'
                              }`}
                            >
                              {item.status === 'published' ? 'Avpublicera' : 'Utkast – granska ovan'}
                            </button>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              type="button"
                              onClick={async () => {
                                await api.deleteNews(item.id);
                                await onRefresh();
                                onNotify('Nyhetsartikel borttagen.');
                              }}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="lg:hidden divide-y divide-slate-100">
                  {(store.news || []).map((item) => (
                    <div key={item.id} className="p-4 flex items-start justify-between gap-3 text-xs">
                      <div className="min-w-0 space-y-1">
                        <div className="font-semibold text-[#040B16]">{item.title}</div>
                        <div className="text-[11px] text-slate-500">
                          {item.category} · {item.publishedDate} · {item.sourceName}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          disabled={item.status === 'draft'}
                          title="Publicera via länkgranskningen ovan"
                          onClick={async () => {
                            await api.upsertNews({
                              ...item,
                              status: 'draft',
                            });
                            await onRefresh();
                          }}
                          className={`text-[11px] font-semibold cursor-pointer ${
                            item.status === 'published' ? 'text-[#059669]' : 'text-amber-700'
                          }`}
                        >
                          {item.status === 'published' ? 'Avpublicera' : 'Utkast – granska ovan'}
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            await api.deleteNews(item.id);
                            await onRefresh();
                            onNotify('Nyhetsartikel borttagen.');
                          }}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* SECTION: 3PL & 4PL */}
          {section === 'logistics' && (
            <div className="space-y-6">
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!lpName.trim()) return;
                  const splitCsv = (val: string) =>
                    val
                      .split(',')
                      .map((s) => s.trim())
                      .filter(Boolean);
                  await api.upsertLogisticsProvider({
                    id: editingLogisticsId === 'new' ? undefined : editingLogisticsId,
                    name: lpName.trim(),
                    domain: lpDomain.trim() || `${lpName.trim().toLowerCase().replace(/\s+/g, '')}.se`,
                    logisticsType: lpType,
                    hqCity: lpHqCity.trim() || 'Stockholm',
                    region: lpRegion,
                    warehouseCities: splitCsv(lpWarehouses),
                    warehouseSqm: lpSqm.trim() || 'Ej angivet',
                    automation: lpAutomation.trim() || 'AutoStore',
                    wmsPlatform: lpWms.trim() || 'Ongoing WMS',
                    minOrderVolume: lpMinVol.trim() || 'Enligt offert',
                    cutoffTime: lpCutoff.trim() || '17:00',
                    pricingModel: lpPricing.trim() || 'Plock + lageryta',
                    integrations: splitCsv(lpIntegrations),
                    specialties: splitCsv(lpSpecialties),
                    notableClients: splitCsv(lpClients),
                    desc: lpDesc.trim() || `${lpName.trim()} erbjuder ${lpType}-logistik i Sverige.`,
                    introEmail: lpIntroEmail.trim() || undefined,
                    introRoutingMode: lpIntroRoutingMode,
                    status: lpStatus,
                  });
                  await onRefresh();
                  onNotify(
                    editingLogisticsId === 'new'
                      ? `${lpName} skapad i 3PL & 4PL.`
                      : `${lpName} uppdaterad.`
                  );
                  loadLogisticsForEdit();
                }}
                className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="font-display text-lg font-bold text-[#040B16]">
                    {editingLogisticsId === 'new'
                      ? 'Lägg till ny 3PL / 4PL-aktör'
                      : `Redigerar 3PL/4PL: ${lpName}`}
                  </h2>
                  {editingLogisticsId !== 'new' && (
                    <button
                      type="button"
                      onClick={() => loadLogisticsForEdit()}
                      className="text-xs font-semibold text-[#006AA7] hover:underline cursor-pointer"
                    >
                      + Skapa ny istället
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <input
                    type="text"
                    required
                    value={lpName}
                    onChange={(e) => setLpName(e.target.value)}
                    placeholder="Aktörsnamn * (t.ex. Bring Shelfless)"
                    className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs"
                  />
                  <input
                    type="text"
                    value={lpDomain}
                    onChange={(e) => setLpDomain(e.target.value)}
                    placeholder="Domän (t.ex. bringshelfless.se)"
                    className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs"
                  />
                  <select
                    value={lpType}
                    onChange={(e) => setLpType(e.target.value as LogisticsRoleType)}
                    className="px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white"
                  >
                    <option value="3PL">3PL</option>
                    <option value="4PL">4PL</option>
                    <option value="3PL & 4PL">3PL &amp; 4PL</option>
                  </select>
                  <select
                    value={lpStatus}
                    onChange={(e) => setLpStatus(e.target.value as PublishStatus)}
                    className="px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white"
                  >
                    <option value="published">Publicerad</option>
                    <option value="draft">Utkast</option>
                  </select>
                  <input
                    type="text"
                    value={lpHqCity}
                    onChange={(e) => setLpHqCity(e.target.value)}
                    placeholder="Huvudkontor / Stad"
                    className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs"
                  />
                  <select
                    value={lpRegion}
                    onChange={(e) => setLpRegion(e.target.value)}
                    className="px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white"
                  >
                    <option value="vast">Västsverige</option>
                    <option value="svealand">Svealand</option>
                    <option value="smaland">Småland &amp; Östergötland</option>
                    <option value="syd">Sydsverige</option>
                    <option value="norrland">Norrland</option>
                  </select>
                  <input
                    type="text"
                    value={lpWarehouses}
                    onChange={(e) => setLpWarehouses(e.target.value)}
                    placeholder="Lagerorter (komma-separerat)"
                    className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs"
                  />
                  <input
                    type="text"
                    value={lpSqm}
                    onChange={(e) => setLpSqm(e.target.value)}
                    placeholder="Lageryta (t.ex. 45 000 m²)"
                    className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs"
                  />
                  <input
                    type="text"
                    value={lpAutomation}
                    onChange={(e) => setLpAutomation(e.target.value)}
                    placeholder="Automation (AutoStore etc.)"
                    className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs"
                  />
                  <input
                    type="text"
                    value={lpWms}
                    onChange={(e) => setLpWms(e.target.value)}
                    placeholder="WMS-plattform"
                    className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs"
                  />
                  <input
                    type="text"
                    value={lpCutoff}
                    onChange={(e) => setLpCutoff(e.target.value)}
                    placeholder="Stopptid / Cut-off (t.ex. 17:30)"
                    className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-mono"
                  />
                  <input
                    type="text"
                    value={lpMinVol}
                    onChange={(e) => setLpMinVol(e.target.value)}
                    placeholder="Minsta ordervolym"
                    className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <input
                    type="text"
                    value={lpIntegrations}
                    onChange={(e) => setLpIntegrations(e.target.value)}
                    placeholder="Integrationer (komma-separerat)"
                    className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs"
                  />
                  <input
                    type="text"
                    value={lpSpecialties}
                    onChange={(e) => setLpSpecialties(e.target.value)}
                    placeholder="Specialiteter (komma-separerat)"
                    className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs"
                  />
                  <input
                    type="text"
                    value={lpPricing}
                    onChange={(e) => setLpPricing(e.target.value)}
                    placeholder="Prismodell"
                    className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    type="text"
                    value={lpClients}
                    onChange={(e) => setLpClients(e.target.value)}
                    placeholder="Exempelkunder (komma-separerat)"
                    className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs"
                  />
                  <input
                    type="text"
                    value={lpDesc}
                    onChange={(e) => setLpDesc(e.target.value)}
                    placeholder="Beskrivning av logistikupplägg"
                    className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-xl bg-[#F4F6F9] border border-slate-200">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Intro-e-post hos aktören (valfritt)
                    </label>
                    <input
                      type="email"
                      value={lpIntroEmail}
                      onChange={(e) => setLpIntroEmail(e.target.value)}
                      placeholder="sales@aktör.se"
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Intro-hantering för denna aktör
                    </label>
                    <select
                      value={lpIntroRoutingMode}
                      onChange={(e) =>
                        setLpIntroRoutingMode(e.target.value as 'default' | 'self' | 'direct')
                      }
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs"
                    >
                      <option value="default">Följ formulärets standardregel</option>
                      <option value="self">Ta hand om själv först (Redaktionen)</option>
                      <option value="direct">Skicka direkt till aktörens intro-mejl</option>
                    </select>
                  </div>
                </div>
                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-[#040B16] hover:bg-[#006AA7] text-white text-xs font-bold cursor-pointer"
                  >
                    {editingLogisticsId === 'new' ? '+ Spara 3PL/4PL-aktör' : 'Uppdatera 3PL/4PL'}
                  </button>
                </div>
              </form>

              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-100">
                {(store.logisticsProviders || []).map((lp) => (
                  <div key={lp.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div className="min-w-0 space-y-0.5">
                      <div className="font-semibold text-[#040B16]">
                        {lp.name}{' '}
                        <span className="font-mono text-[#006AA7] font-semibold">
                          · {lp.logisticsType}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {lp.warehouseCities.join(', ')} · {lp.wmsPlatform} · Cut-off {lp.cutoffTime} · {lp.warehouseSqm}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={async () => {
                          await api.upsertLogisticsProvider({
                            ...lp,
                            status: lp.status === 'published' ? 'draft' : 'published',
                          });
                          await onRefresh();
                        }}
                        className={`text-xs font-semibold cursor-pointer hover:underline ${
                          lp.status === 'published' ? 'text-[#059669]' : 'text-amber-700'
                        }`}
                      >
                        {lp.status === 'published' ? 'Publicerad' : 'Utkast'}
                      </button>
                      <button
                        type="button"
                        onClick={() => loadLogisticsForEdit(lp)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-[#040B16] hover:bg-slate-100 cursor-pointer"
                        aria-label={`Redigera ${lp.name}`}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          await api.deleteLogisticsProvider(lp.id);
                          await onRefresh();
                          onNotify(`${lp.name} borttagen.`);
                        }}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 cursor-pointer"
                        aria-label={`Ta bort ${lp.name}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SECTION: PAKETINDEX & MARKNADSDATA */}
          {section === 'paketindex' && (
            <div className="space-y-6">
              <PaketindexArchiveEditor rows={store.paketindexArchive || []} onRefresh={onRefresh} />
              <h2 className="text-xl font-bold">Äldre Paketindexsammanfattning (separat från arkivet)</h2>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  await api.updatePaketindex(piDraft);
                  await onRefresh();
                  onNotify('Paketindex och kvartalssiffror uppdaterade.');
                }}
                className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="font-display text-lg font-bold text-[#040B16]">
                      Redigera Paketindex (Transportföretagen &amp; HUI)
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Styr KPI-kort, grafer och transportörsnoter under Marknad &amp; Insikter.
                    </p>
                  </div>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-[#040B16] hover:bg-[#006AA7] text-white text-xs font-bold cursor-pointer"
                  >
                    Spara Paketindex
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Kvartal / Period
                    </label>
                    <input
                      type="text"
                      value={piDraft.quarterLabel}
                      onChange={(e) => setPiDraft({ ...piDraft, quarterLabel: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Total volym (milj paket)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={piDraft.totalParcelsMillions}
                      onChange={(e) =>
                        setPiDraft({ ...piDraft, totalParcelsMillions: Number(e.target.value) })
                      }
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Tillväxt YoY (%)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={piDraft.yoyGrowthPct}
                      onChange={(e) =>
                        setPiDraft({ ...piDraft, yoyGrowthPct: Number(e.target.value) })
                      }
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Ökning (milj fler paket)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={piDraft.yoyGrowthMillions}
                      onChange={(e) =>
                        setPiDraft({ ...piDraft, yoyGrowthMillions: Number(e.target.value) })
                      }
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Utlandspaket andel (%)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={piDraft.foreignImportSharePct}
                      onChange={(e) =>
                        setPiDraft({ ...piDraft, foreignImportSharePct: Number(e.target.value) })
                      }
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Utlandsjämförelse
                    </label>
                    <input
                      type="text"
                      value={piDraft.foreignImportComparison}
                      onChange={(e) =>
                        setPiDraft({ ...piDraft, foreignImportComparison: e.target.value })
                      }
                      className="w-full px-3 py-2 rounded-xl border border-slate-200"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Second hand volymtext
                    </label>
                    <input
                      type="text"
                      value={piDraft.secondHandParcelsLabel}
                      onChange={(e) =>
                        setPiDraft({ ...piDraft, secondHandParcelsLabel: e.target.value })
                      }
                      className="w-full px-3 py-2 rounded-xl border border-slate-200"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Second hand andel (%)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={piDraft.secondHandSharePct}
                      onChange={(e) =>
                        setPiDraft({ ...piDraft, secondHandSharePct: Number(e.target.value) })
                      }
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Sammanfattning / Huvudinsikt
                  </label>
                  <textarea
                    rows={2}
                    value={piDraft.summaryText}
                    onChange={(e) => setPiDraft({ ...piDraft, summaryText: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                  />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                  <div className="space-y-2">
                    <div className="text-xs font-bold text-[#040B16]">
                      Leveranssätt (Mars fördelning %)
                    </div>
                    {piDraft.deliveryChannels.map((ch, idx) => (
                      <div key={ch.id} className="grid grid-cols-12 gap-2 items-center text-xs">
                        <input
                          type="text"
                          value={ch.label}
                          onChange={(e) => {
                            const next = [...piDraft.deliveryChannels];
                            next[idx] = { ...ch, label: e.target.value };
                            setPiDraft({ ...piDraft, deliveryChannels: next });
                          }}
                          className="col-span-5 px-2.5 py-1.5 rounded-lg border border-slate-200"
                        />
                        <input
                          type="number"
                          value={ch.sharePct}
                          onChange={(e) => {
                            const next = [...piDraft.deliveryChannels];
                            next[idx] = { ...ch, sharePct: Number(e.target.value) };
                            setPiDraft({ ...piDraft, deliveryChannels: next });
                          }}
                          className="col-span-2 px-2 py-1.5 rounded-lg border border-slate-200 font-mono"
                        />
                        <input
                          type="text"
                          value={ch.note}
                          onChange={(e) => {
                            const next = [...piDraft.deliveryChannels];
                            next[idx] = { ...ch, note: e.target.value };
                            setPiDraft({ ...piDraft, deliveryChannels: next });
                          }}
                          className="col-span-5 px-2.5 py-1.5 rounded-lg border border-slate-200"
                        />
                      </div>
                    ))}
                  </div>

                  <div className="space-y-2">
                    <div className="text-xs font-bold text-[#040B16]">
                      Transportörsnoter i Paketindex
                    </div>
                    {piDraft.carrierScopeNotes.map((cn, idx) => (
                      <div key={cn.id} className="grid grid-cols-12 gap-2 items-center text-xs">
                        <input
                          type="text"
                          value={cn.carrier}
                          onChange={(e) => {
                            const next = [...piDraft.carrierScopeNotes];
                            next[idx] = { ...cn, carrier: e.target.value };
                            setPiDraft({ ...piDraft, carrierScopeNotes: next });
                          }}
                          className="col-span-4 px-2.5 py-1.5 rounded-lg border border-slate-200 font-semibold"
                        />
                        <input
                          type="text"
                          value={cn.status}
                          onChange={(e) => {
                            const next = [...piDraft.carrierScopeNotes];
                            next[idx] = { ...cn, status: e.target.value };
                            setPiDraft({ ...piDraft, carrierScopeNotes: next });
                          }}
                          className="col-span-3 px-2.5 py-1.5 rounded-lg border border-slate-200"
                        />
                        <input
                          type="text"
                          value={cn.note}
                          onChange={(e) => {
                            const next = [...piDraft.carrierScopeNotes];
                            next[idx] = { ...cn, note: e.target.value };
                            setPiDraft({ ...piDraft, carrierScopeNotes: next });
                          }}
                          className="col-span-5 px-2.5 py-1.5 rounded-lg border border-slate-200"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </form>

              {/* Intelligence Sources & Tech Stack Shares */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {(() => {
                  const activeIntel =
                    store.intelligenceSources.find((s) => s.id === editingIntelId) ||
                    store.intelligenceSources[0];
                  if (!activeIntel) return null;
                  return (
                    <form
                      key={activeIntel.id}
                      onSubmit={async (e) => {
                        e.preventDefault();
                        const form = new FormData(e.currentTarget);
                        await api.updateIntelligenceSource(activeIntel.id, {
                          headlineMetric: String(form.get('headlineMetric') || activeIntel.headlineMetric),
                          headlineValue: String(form.get('headlineValue') || activeIntel.headlineValue),
                          updatedPeriod: String(form.get('updatedPeriod') || activeIntel.updatedPeriod),
                          summary: String(form.get('summary') || activeIntel.summary),
                        });
                        await onRefresh();
                        onNotify(`Uppdaterade ${activeIntel.name}.`);
                      }}
                      className="bg-white border border-slate-200 rounded-2xl p-6 space-y-3 text-xs"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="font-display text-base font-bold text-[#040B16]">
                          Datakällor (ECDB, Statista, Paketindex, HUI)
                        </h3>
                        <select
                          value={activeIntel.id}
                          onChange={(e) => setEditingIntelId(e.target.value)}
                          className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white font-semibold"
                        >
                          {store.intelligenceSources.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="grid grid-cols-2 gap-2.5">
                        <input
                          name="headlineMetric"
                          defaultValue={activeIntel.headlineMetric}
                          placeholder="Nyckeltal"
                          className="px-3 py-2 rounded-xl border border-slate-200"
                        />
                        <input
                          name="headlineValue"
                          defaultValue={activeIntel.headlineValue}
                          placeholder="Värde"
                          className="px-3 py-2 rounded-xl border border-slate-200 font-mono"
                        />
                      </div>
                      <input
                        name="updatedPeriod"
                        defaultValue={activeIntel.updatedPeriod}
                        placeholder="Period"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200"
                      />
                      <textarea
                        name="summary"
                        rows={2}
                        defaultValue={activeIntel.summary}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200"
                      />
                      <button
                        type="submit"
                        className="px-4 py-2 rounded-xl bg-[#040B16] hover:bg-[#006AA7] text-white font-bold cursor-pointer"
                      >
                        Spara datakälla
                      </button>
                    </form>
                  );
                })()}

                {(() => {
                  const activeShare =
                    store.techStackShares.find((t) => t.id === editingTechShareId) ||
                    store.techStackShares[0];
                  if (!activeShare) return null;
                  return (
                    <form
                      key={activeShare.id}
                      onSubmit={async (e) => {
                        e.preventDefault();
                        const form = new FormData(e.currentTarget);
                        await api.updateTechStackShare(activeShare.id, {
                          sharePct: Number(form.get('sharePct') || activeShare.sharePct),
                          detectedSites: String(form.get('detectedSites') || activeShare.detectedSites),
                        });
                        await onRefresh();
                        onNotify(`Uppdaterade marknadsandel för ${activeShare.name}.`);
                      }}
                      className="bg-white border border-slate-200 rounded-2xl p-6 space-y-3 text-xs"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="font-display text-base font-bold text-[#040B16]">
                          Tech-andelar (BuiltWith &amp; Wappalyzer)
                        </h3>
                        <select
                          value={activeShare.id}
                          onChange={(e) => setEditingTechShareId(e.target.value)}
                          className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white font-semibold"
                        >
                          {store.techStackShares.map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.name} ({t.layer})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="grid grid-cols-2 gap-2.5">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                            Marknadsandel (%)
                          </label>
                          <input
                            type="number"
                            step="0.1"
                            name="sharePct"
                            defaultValue={activeShare.sharePct}
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                            Upptäckta sajter
                          </label>
                          <input
                            type="text"
                            name="detectedSites"
                            defaultValue={activeShare.detectedSites}
                            className="w-full px-3 py-2 rounded-xl border border-slate-200"
                          />
                        </div>
                      </div>
                      <button
                        type="submit"
                        className="px-4 py-2 rounded-xl bg-[#040B16] hover:bg-[#006AA7] text-white font-bold cursor-pointer"
                      >
                        Spara tech-andel
                      </button>
                    </form>
                  );
                })()}
              </div>
            </div>
          )}

          {/* SECTION: TIMELINE (HISTORIA) */}
          {section === 'timeline' && (
            <div className="space-y-6">
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!tlTitle.trim()) return;
                  await api.upsertTimelineMilestone({
                    id: editingTimelineId === 'new' ? undefined : editingTimelineId,
                    era: tlEra,
                    year: tlYear.trim() || '2026',
                    badge: tlBadge.trim() || 'Milstolpe',
                    title: tlTitle.trim(),
                    desc: tlDesc.trim() || 'Viktig händelse i svensk e-handelshistoria.',
                    stack: tlStack.trim() || 'Svensk e-handel',
                  });
                  await onRefresh();
                  onNotify(
                    editingTimelineId === 'new'
                      ? 'Milstolpe tillagd i Historia.'
                      : 'Milstolpe uppdaterad.'
                  );
                  loadTimelineForEdit();
                }}
                className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 text-xs"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="font-display text-lg font-bold text-[#040B16]">
                    {editingTimelineId === 'new'
                      ? 'Lägg till milstolpe i Historia / Tidslinje'
                      : `Redigerar milstolpe: ${tlTitle}`}
                  </h2>
                  {editingTimelineId !== 'new' && (
                    <button
                      type="button"
                      onClick={() => loadTimelineForEdit()}
                      className="text-xs font-semibold text-[#006AA7] hover:underline cursor-pointer"
                    >
                      + Lägg till ny istället
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <select
                    value={tlEra}
                    onChange={(e) => setTlEra(e.target.value as TimelineMilestone['era'])}
                    className="px-3 py-2 rounded-xl border border-slate-200 bg-white"
                  >
                    <option value="90s">1990-tal (90s)</option>
                    <option value="00s">2000-tal (00s)</option>
                    <option value="10s">2010-tal (10s)</option>
                    <option value="20s">2020-tal (20s)</option>
                  </select>
                  <input
                    type="text"
                    value={tlYear}
                    onChange={(e) => setTlYear(e.target.value)}
                    placeholder="År (t.ex. 2026)"
                    className="px-3 py-2 rounded-xl border border-slate-200 font-mono"
                  />
                  <input
                    type="text"
                    value={tlBadge}
                    onChange={(e) => setTlBadge(e.target.value)}
                    placeholder="Etikett / Tema"
                    className="px-3 py-2 rounded-xl border border-slate-200"
                  />
                  <input
                    type="text"
                    value={tlStack}
                    onChange={(e) => setTlStack(e.target.value)}
                    placeholder="Teknik / Aktörer"
                    className="px-3 py-2 rounded-xl border border-slate-200"
                  />
                </div>
                <input
                  type="text"
                  required
                  value={tlTitle}
                  onChange={(e) => setTlTitle(e.target.value)}
                  placeholder="Rubrik *"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200"
                />
                <textarea
                  rows={2}
                  value={tlDesc}
                  onChange={(e) => setTlDesc(e.target.value)}
                  placeholder="Beskrivning av milstolpen"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200"
                />
                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-[#040B16] hover:bg-[#006AA7] text-white font-bold cursor-pointer"
                  >
                    {editingTimelineId === 'new' ? '+ Spara milstolpe' : 'Uppdatera milstolpe'}
                  </button>
                </div>
              </form>

              <div className="bg-white border border-slate-200 rounded-2xl divide-y divide-slate-100">
                {store.timeline.map((m) => (
                  <div key={m.id} className="p-4 flex items-start justify-between gap-4 text-xs">
                    <div className="space-y-1">
                      <div className="font-mono text-[#006AA7] font-semibold">
                        {m.year} · {m.era} · {m.badge}
                      </div>
                      <div className="font-bold text-[#040B16]">{m.title}</div>
                      <div className="text-slate-600">{m.desc}</div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => loadTimelineForEdit(m)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-[#040B16] hover:bg-slate-100 cursor-pointer"
                        aria-label={`Redigera ${m.title}`}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          await api.deleteTimelineMilestone(m.id);
                          await onRefresh();
                          onNotify('Milstolpe borttagen.');
                        }}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 cursor-pointer"
                        aria-label={`Ta bort ${m.title}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SECTION: PAGE CONTENT & KONTAKT */}
          {section === 'pages' && (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                await api.updatePageContent(pagesDraft);
                await onRefresh();
                onNotify('Sidtexter & kontaktinställningar sparade i CMS.');
              }}
              className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-display text-lg font-bold text-[#040B16]">
                    Redigera rubriker &amp; texter på alla sidor
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Välj sida nedan för att redigera kicker, huvudrubrik, ingress, KPI-värden och kontaktmejl.
                  </p>
                </div>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#040B16] hover:bg-[#006AA7] text-white text-xs font-bold cursor-pointer"
                >
                  Spara sidtexter
                </button>
              </div>

              <div className="flex flex-wrap gap-1.5 bg-slate-100 p-1.5 rounded-xl text-xs font-semibold">
                {(
                  [
                    ['marknad', 'Marknad & Karta'],
                    ['nyheter', 'Nyheter'],
                    ['event', 'Event & Mässor'],
                    ['historia', 'Historia'],
                    ['ehandlare', 'E-handlare'],
                    ['partners', 'Jämför Partners'],
                    ['logistics', '3PL & 4PL'],
                    ['jobb', 'Jobb'],
                    ['community', 'Community'],
                    ['kontakt', 'Kontakt'],
                    ['om', 'Om Sveriges E-handel'],
                  ] as Array<[keyof PageContentMap, string]>
                ).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setActivePageKey(key)}
                    className={`px-3 py-1.5 rounded-lg cursor-pointer transition-colors ${
                      activePageKey === key
                        ? 'bg-[#040B16] text-white'
                        : 'text-slate-600 hover:text-[#040B16]'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {(() => {
                const block = activePageKey === 'om' ? {...ABOUT_CONTENT,...pagesDraft.om} : pagesDraft[activePageKey];
                return (
                  <div className="space-y-3 text-xs">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Kicker (rad över rubrik)
                      </label>
                      <input
                        type="text"
                        value={block.kicker}
                        onChange={(e) =>
                          setPagesDraft({
                            ...pagesDraft,
                            [activePageKey]: { ...block, kicker: e.target.value },
                          })
                        }
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-200 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Huvudrubrik (H1)
                      </label>
                      <input
                        type="text"
                        value={block.title}
                        onChange={(e) =>
                          setPagesDraft({
                            ...pagesDraft,
                            [activePageKey]: { ...block, title: e.target.value },
                          })
                        }
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-200 font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Ingress / Beskrivning
                      </label>
                      <textarea
                        rows={3}
                        value={block.subtitle}
                        onChange={(e) =>
                          setPagesDraft({
                            ...pagesDraft,
                            [activePageKey]: { ...block, subtitle: e.target.value },
                          })
                        }
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-200"
                      />
                    </div>

                    {activePageKey === 'om' && <label className="block">Om oss – brödtext (stycken)
                      <textarea rows={10} className="block w-full p-3 border rounded-xl" value={pagesDraft.om?.body ?? ABOUT_CONTENT.body}
                        onChange={e=>setPagesDraft({...pagesDraft,om:{...ABOUT_CONTENT,...pagesDraft.om,body:e.target.value}})}/>
                    </label>}
                    {activePageKey === 'marknad' && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-3 border-t border-slate-100">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                            KPI 1 Etikett
                          </label>
                          <input
                            type="text"
                            value={pagesDraft.marknad.kpi1Label || ''}
                            onChange={(e) =>
                              setPagesDraft({
                                ...pagesDraft,
                                marknad: { ...pagesDraft.marknad, kpi1Label: e.target.value },
                              })
                            }
                            className="w-full px-3 py-1.5 rounded-lg border border-slate-200"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                            KPI 1 Värde
                          </label>
                          <input
                            type="text"
                            value={pagesDraft.marknad.kpi1Value || ''}
                            onChange={(e) =>
                              setPagesDraft({
                                ...pagesDraft,
                                marknad: { ...pagesDraft.marknad, kpi1Value: e.target.value },
                              })
                            }
                            className="w-full px-3 py-1.5 rounded-lg border border-slate-200 font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                            KPI 2 Etikett
                          </label>
                          <input
                            type="text"
                            value={pagesDraft.marknad.kpi2Label || ''}
                            onChange={(e) =>
                              setPagesDraft({
                                ...pagesDraft,
                                marknad: { ...pagesDraft.marknad, kpi2Label: e.target.value },
                              })
                            }
                            className="w-full px-3 py-1.5 rounded-lg border border-slate-200"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                            KPI 2 Värde
                          </label>
                          <input
                            type="text"
                            value={pagesDraft.marknad.kpi2Value || ''}
                            onChange={(e) =>
                              setPagesDraft({
                                ...pagesDraft,
                                marknad: { ...pagesDraft.marknad, kpi2Value: e.target.value },
                              })
                            }
                            className="w-full px-3 py-1.5 rounded-lg border border-slate-200 font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                            KPI 3 Etikett
                          </label>
                          <input
                            type="text"
                            value={pagesDraft.marknad.kpi3Label || ''}
                            onChange={(e) =>
                              setPagesDraft({
                                ...pagesDraft,
                                marknad: { ...pagesDraft.marknad, kpi3Label: e.target.value },
                              })
                            }
                            className="w-full px-3 py-1.5 rounded-lg border border-slate-200"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                            KPI 3 Värde
                          </label>
                          <input
                            type="text"
                            value={pagesDraft.marknad.kpi3Value || ''}
                            onChange={(e) =>
                              setPagesDraft({
                                ...pagesDraft,
                                marknad: { ...pagesDraft.marknad, kpi3Value: e.target.value },
                              })
                            }
                            className="w-full px-3 py-1.5 rounded-lg border border-slate-200 font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                            KPI 4 Etikett
                          </label>
                          <input
                            type="text"
                            value={pagesDraft.marknad.kpi4Label || ''}
                            onChange={(e) =>
                              setPagesDraft({
                                ...pagesDraft,
                                marknad: { ...pagesDraft.marknad, kpi4Label: e.target.value },
                              })
                            }
                            className="w-full px-3 py-1.5 rounded-lg border border-slate-200"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                            KPI 4 Värde
                          </label>
                          <input
                            type="text"
                            value={pagesDraft.marknad.kpi4Value || ''}
                            onChange={(e) =>
                              setPagesDraft({
                                ...pagesDraft,
                                marknad: { ...pagesDraft.marknad, kpi4Value: e.target.value },
                              })
                            }
                            className="w-full px-3 py-1.5 rounded-lg border border-slate-200 font-mono"
                          />
                        </div>
                      </div>
                    )}

                    {activePageKey === 'kontakt' && (
                      <div className="pt-3 border-t border-slate-100">
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Redaktionens kontaktmejl
                        </label>
                        <input
                          type="email"
                          value={pagesDraft.kontakt.contactEmail || ''}
                          onChange={(e) =>
                            setPagesDraft({
                              ...pagesDraft,
                              kontakt: { ...pagesDraft.kontakt, contactEmail: e.target.value },
                            })
                          }
                          placeholder="hej@sverigesehandel.se"
                          className="w-full sm:max-w-sm px-3.5 py-2 rounded-xl border border-slate-200 font-mono"
                        />
                      </div>
                    )}
                  </div>
                );
              })()}
            </form>
          )}

          {/* SECTION: OVERVIEW & BACKUP */}
          {section === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white border border-slate-200 rounded-2xl p-5">
                  <div className="text-xs font-mono text-slate-500">E-handlare i CMS</div>
                  <div className="font-display text-3xl font-extrabold text-[#040B16] mt-1 tabular-nums">
                    {store.merchants.length}
                  </div>
                  <div className="text-xs text-[#059669] mt-1 tabular-nums">
                    {store.merchants.filter((m) => m.status === 'published').length} publicerade
                  </div>
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl p-5">
                  <div className="text-xs font-mono text-slate-500">Tech-partners i CMS</div>
                  <div className="font-display text-3xl font-extrabold text-[#040B16] mt-1 tabular-nums">
                    {store.partners.length}
                  </div>
                  <div className="text-xs text-[#059669] mt-1 tabular-nums">
                    {store.partners.filter((p) => p.status === 'published').length} publicerade
                  </div>
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl p-5">
                  <div className="text-xs font-mono text-slate-500">Nyheter &amp; Event</div>
                  <div className="font-display text-3xl font-extrabold text-[#040B16] mt-1 tabular-nums">
                    {(store.news || []).length + store.events.length}
                  </div>
                  <div className="text-xs text-slate-500 mt-1 tabular-nums">
                    {(store.news || []).length} nyheter · {store.events.length} event
                  </div>
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl p-5">
                  <div className="text-xs font-mono text-slate-500">Jobb & Rekrytering</div>
                  <div className="font-display text-3xl font-extrabold text-[#040B16] mt-1 tabular-nums">
                    {store.jobs.length + store.recruitmentSites.length}
                  </div>
                  <div className="text-xs text-slate-500 mt-1 tabular-nums">
                    {store.jobs.length} jobb · {store.recruitmentSites.length} byråer/portaler
                  </div>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h2 className="font-display text-lg font-bold text-[#040B16]">
                      Server- &amp; Vercel-status (CMS API)
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Verifierar att Vercel API, Firestore och Firebase Admin fungerar på aktiv domän.
                    </p>
                  </div>
                </div>
                {cmsStatusError ? (
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800">
                    Kunde inte hämta serverstatus: {cmsStatusError}
                  </div>
                ) : cmsStatus ? (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div className="p-3.5 rounded-xl bg-[#F4F6F9] border border-slate-200">
                      <div className="font-mono text-slate-500">Databaslager</div>
                      <div className="font-bold text-[#040B16] mt-1">
                        {cmsStatus.persistence === 'firestore'
                          ? 'Firebase Firestore (Moln)'
                          : 'Lokal JSON-lagring (Dev)'}
                      </div>
                    </div>
                    <div className="p-3.5 rounded-xl bg-[#F4F6F9] border border-slate-200">
                      <div className="font-mono text-slate-500">Admin-autentisering</div>
                      <div
                        className={`font-bold mt-1 ${
                          cmsStatus.hasExplicitAdminCredentials
                            ? 'text-[#059669]'
                            : 'text-amber-700'
                        }`}
                      >
                        {cmsStatus.hasExplicitAdminCredentials
                          ? 'Verifierad via Service Account'
                          : 'Använder default ADC / begränsad verifiering'}
                      </div>
                    </div>
                    <div className="p-3.5 rounded-xl bg-[#F4F6F9] border border-slate-200">
                      <div className="font-mono text-slate-500">Gemini AI Search</div>
                      <div
                        className={`font-bold mt-1 ${
                          cmsStatus.hasGeminiKey ? 'text-[#059669]' : 'text-amber-700'
                        }`}
                      >
                        {cmsStatus.hasGeminiKey
                          ? 'Konfigurerad på server'
                          : 'GEMINI_API_KEY saknas i miljövariabler'}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-slate-500">Kontrollerar serverstatus...</div>
                )}
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="font-display text-lg font-bold text-[#040B16]">
                    Exportera & återställ CMS-data
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Senast uppdaterad:{' '}
                    <span className="font-mono">{new Date(store.updatedAt).toLocaleString('sv-SE')}</span>
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={handleExportJSON}
                    className="px-4 py-2.5 rounded-xl bg-[#040B16] hover:bg-[#006AA7] text-white text-xs font-bold inline-flex items-center gap-2 cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    Exportera JSON
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      await api.resetStore();
                      await onRefresh();
                      onNotify('CMS-databasen återställd till grunddata.');
                    }}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold inline-flex items-center gap-2 cursor-pointer"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Återställ grunddata
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
