import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Globe,
  Inbox,
  Mail,
  MessageSquare,
  Search,
  Send,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { api } from '../api';
import type {
  AdBanner,
  CommunityDirectMessage,
  CommunityMemberType,
  CommunityThread,
  ContactFormConfig,
  PageCopyBlock,
  PublicMemberProfile,
} from '../types';
import { PageFormSlot } from './DynamicFormWidget';

export interface JoinMemberPayload {
  name: string;
  email: string;
  memberType: CommunityMemberType;
  role: string;
  city: string;
  company?: string;
  website?: string;
  linkedinUrl?: string;
  annualOrders?: string;
  platform?: string;
  serviceFocus?: string;
  interests?: string[];
  motivation?: string;
}

interface CommunityViewProps {
  threads: CommunityThread[];
  pageCopy?: PageCopyBlock;
  contactForms?: ContactFormConfig[];
  adBanners?: AdBanner[];
  memberCount?: number;
  verifiedCount?: number;
  memberCities?: string[];
  userUid?: string | null;
  userDisplayName?: string | null;
  userEmail?: string | null;
  isSignedIn?: boolean;
  onSignIn?: () => void;
  onAddThread: (payload: {
    channel: string;
    author: string;
    title: string;
    body?: string;
  }) => Promise<void>;
  onAddComment?: (threadId: string, payload: { author: string; body: string }) => Promise<void>;
  onUpvote: (id: string) => Promise<void>;
  onJoinMember: (payload: JoinMemberPayload) => Promise<void>;
  onFormSubmitted?: () => Promise<void> | void;
  onNotify?: (msg: string) => void;
}

const CHANNELS = [
  'all',
  '#checkout-optimering',
  '#export-tull',
  '#ai-och-data',
  '#d-congress-2027',
];

const MEMBER_CATEGORIES: Array<{
  type: CommunityMemberType;
  short: string;
  desc: string;
}> = [
  {
    type: 'E-handlare / Butik',
    short: 'E-handlare',
    desc: 'Webbutiker, D2C-varumärken & omni-kedjor',
  },
  {
    type: 'Tjänsteleverantör / Byrå',
    short: 'Tjänsteleverantör',
    desc: 'Byråer, konsulter, CRO, SEO & performance',
  },
  {
    type: 'Transportör / Logistik / 3PL',
    short: 'Transport & 3PL',
    desc: 'Paketoperatörer, 3PL-lager, 4PL & last-mile',
  },
  {
    type: 'Plattform / PSP / SaaS',
    short: 'Plattform & SaaS',
    desc: 'E-handelsplattformar, PSP, TA-system & ERP',
  },
];

const ROLES_BY_TYPE: Record<CommunityMemberType, string[]> = {
  'E-handlare / Butik': [
    'E-handlare / Grundare',
    'E-commerce Manager',
    'Head of E-commerce / COO',
    'Performance / Growth',
    'CTO / Tech Lead',
    'Logistik / Supply Chain-ansvarig',
  ],
  'Tjänsteleverantör / Byrå': [
    'Byrågrundare / VD',
    'E-handelskonsult / Strateg',
    'Teknisk arkitekt / Utvecklare',
    'Performance / Paid Media Specialist',
    'SEO / CRO / UX-specialist',
    'Partner & Affärsutveckling',
  ],
  'Transportör / Logistik / 3PL': [
    'Logistikchef / 3PL-ansvarig',
    'Key Account / E-commerce Logistics',
    'Head of Last-Mile / Nätverk',
    'Supply Chain & Tull-specialist',
    'VD / Affärsområdeschef',
  ],
  'Plattform / PSP / SaaS': [
    'Partner Manager / Ecosystem',
    'Solution Architect / Tech Lead',
    'Produktchef / Founder',
    'Checkout / Payments Specialist',
    'Account Executive / Commercial',
  ],
};

const SERVICE_FOCUS_BY_TYPE: Record<Exclude<CommunityMemberType, 'E-handlare / Butik'>, string[]> = {
  'Tjänsteleverantör / Byrå': [
    'Teknisk e-handelsbyrå & Implementation',
    'Performance Marketing & Paid Social',
    'CRO, UX & Checkout-optimering',
    'SEO, Content & Organisk tillväxt',
    'CRM, Retention & Lojalitet',
    'Frakt-, tull- & 3PL-rådgivning',
  ],
  'Transportör / Logistik / 3PL': [
    '3PL / Lagerhotell & AutoStore',
    'Inrikes paket, ombud & paketskåp',
    'Hemleverans & Last-mile',
    '4PL / Cross-border & Tullhantering',
    'Returlogistik & Recommerce',
  ],
  'Plattform / PSP / SaaS': [
    'E-handelsplattform (Headless / SaaS)',
    'Betallösning (PSP) & Checkout',
    'TA-system & Leveransväljare',
    'ERP, WMS & OMS',
    'AI, Sök & Personalisering',
  ],
};

const MEMBER_REGIONS = [
  'Göteborg / Borås',
  'Stockholm / Uppsala',
  'Malmö / Skåne',
  'Småland / Östergötland',
  'Norrland / Remote',
];

const ORDER_VOLUME_OPTIONS = [
  'Under 5 000 paket/år',
  '5 000 – 25 000 paket/år',
  '25 000 – 100 000 paket/år',
  '100 000+ paket/år',
];

const PLATFORM_OPTIONS = [
  'Shopify',
  'Centra',
  'WooCommerce',
  'Adobe Commerce / Magento',
  'Askås / Starweb',
  'Egenutvecklad / Annan',
];

const ECOSYSTEM_OPTIONS = [
  'Flera plattformar (Plattformsoberoende)',
  'Shopify / Shopify Plus',
  'Centra / Headless',
  'WooCommerce / Askås / Starweb',
  'Enterprise (SAP / Norce / Litium)',
];

const NETWORK_INTERESTS = [
  'Benchmark-rapporter',
  'Frakt & 3PL',
  'Checkout & PSP',
  'AI & MarTech',
  'Export & Tull',
  'Fysiska nätverksträffar',
];

export function CommunityView({
  threads,
  pageCopy,
  contactForms = [],
  adBanners = [],
  memberCount = 0,
  verifiedCount = 0,
  memberCities = [],
  userUid = null,
  userDisplayName = null,
  userEmail = null,
  isSignedIn = false,
  onSignIn,
  onAddThread,
  onAddComment,
  onUpvote,
  onJoinMember,
  onFormSubmitted,
  onNotify,
}: CommunityViewProps) {
  const [workspaceTab, setWorkspaceTab] = useState<'forum' | 'directory'>('forum');
  const [activeChannel, setActiveChannel] = useState('all');
  const [newTitle, setNewTitle] = useState('');
  const [newBody, setNewBody] = useState('');
  const [newChannel, setNewChannel] = useState('#checkout-optimering');
  const [posting, setPosting] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);

  // Thread comments drawer state
  const [expandedThreads, setExpandedThreads] = useState<Record<string, boolean>>({});
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [commentingId, setCommentingId] = useState<string | null>(null);

  // Membership application state
  const [joinStep, setJoinStep] = useState<1 | 2>(1);
  const [joinMemberType, setJoinMemberType] = useState<CommunityMemberType>('E-handlare / Butik');
  const [joinName, setJoinName] = useState(userDisplayName || '');
  const [joinEmail, setJoinEmail] = useState(userEmail || '');
  const [joinRole, setJoinRole] = useState(ROLES_BY_TYPE['E-handlare / Butik'][0]);
  const [joinCity, setJoinCity] = useState('Göteborg / Borås');
  const [joinCompany, setJoinCompany] = useState('');
  const [joinWebsite, setJoinWebsite] = useState('');
  const [joinAnnualOrders, setJoinAnnualOrders] = useState('5 000 – 25 000 paket/år');
  const [joinPlatform, setJoinPlatform] = useState('Shopify');
  const [joinServiceFocus, setJoinServiceFocus] = useState(
    SERVICE_FOCUS_BY_TYPE['Tjänsteleverantör / Byrå'][0]
  );
  const [joinLinkedin, setJoinLinkedin] = useState('');
  const [joinInterests, setJoinInterests] = useState<string[]>([
    'Benchmark-rapporter',
    'Frakt & 3PL',
  ]);
  const [joinMotivation, setJoinMotivation] = useState('');
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [submittedProfile, setSubmittedProfile] = useState<JoinMemberPayload | null>(null);

  // Member directory & direct messaging state
  const [directoryMembers, setDirectoryMembers] = useState<PublicMemberProfile[]>([]);
  const [directoryCategory, setDirectoryCategory] = useState<'all' | CommunityMemberType>('all');
  const [directoryQuery, setDirectoryQuery] = useState('');
  const [messages, setMessages] = useState<CommunityDirectMessage[]>([]);
  const [myMemberIds, setMyMemberIds] = useState<string[]>([]);
  const [loadingNetwork, setLoadingNetwork] = useState(false);
  const [networkError, setNetworkError] = useState<string | null>(null);

  // DM Composer state
  const [dmRecipient, setDmRecipient] = useState<PublicMemberProfile | null>(null);
  const [dmSubject, setDmSubject] = useState('');
  const [dmBody, setDmBody] = useState('');
  const [sendingDm, setSendingDm] = useState(false);

  useEffect(() => {
    if (userDisplayName) {
      setJoinName((prev) => prev || userDisplayName);
    }
    if (userEmail) {
      setJoinEmail((prev) => prev || userEmail);
    }
  }, [userDisplayName, userEmail]);

  const loadMemberNetwork = useCallback(async () => {
    if (!isSignedIn) {
      setDirectoryMembers([]);
      setMessages([]);
      setMyMemberIds([]);
      return;
    }
    setLoadingNetwork(true);
    setNetworkError(null);
    try {
      const [dirRes, msgRes] = await Promise.all([
        api.getMemberDirectory(),
        api.getDirectMessages(),
      ]);
      setDirectoryMembers(dirRes.members || []);
      setMessages(msgRes.messages || []);
      setMyMemberIds(msgRes.myMemberIds || []);
    } catch (err) {
      setNetworkError((err as Error).message || 'Kunde inte hämta medlemskatalog och meddelanden.');
    } finally {
      setLoadingNetwork(false);
    }
  }, [isSignedIn]);

  useEffect(() => {
    void loadMemberNetwork();
  }, [loadMemberNetwork]);

  function handleSelectMemberType(nextType: CommunityMemberType) {
    setJoinMemberType(nextType);
    setJoinRole(ROLES_BY_TYPE[nextType][0]);
    if (nextType === 'E-handlare / Butik') {
      setJoinPlatform(PLATFORM_OPTIONS[0]);
    } else {
      setJoinPlatform(ECOSYSTEM_OPTIONS[0]);
      setJoinServiceFocus(SERVICE_FOCUS_BY_TYPE[nextType][0]);
    }
  }

  const filtered =
    activeChannel === 'all' ? threads : threads.filter((t) => t.channel === activeChannel);

  const filteredDirectory = useMemo(() => {
    const q = directoryQuery.trim().toLowerCase();
    return directoryMembers.filter((m) => {
      if (directoryCategory !== 'all' && m.memberType !== directoryCategory) return false;
      if (!q) return true;
      return (
        m.name.toLowerCase().includes(q) ||
        (m.company || '').toLowerCase().includes(q) ||
        m.role.toLowerCase().includes(q) ||
        m.city.toLowerCase().includes(q) ||
        (m.serviceFocus || '').toLowerCase().includes(q)
      );
    });
  }, [directoryMembers, directoryCategory, directoryQuery]);

  const unreadIncomingCount = useMemo(() => {
    return messages.filter((msg) => {
      const isRecipient =
        (userUid && msg.recipientUid === userUid) || myMemberIds.includes(msg.recipientMemberId);
      return isRecipient && !msg.read;
    }).length;
  }, [messages, myMemberIds, userUid]);

  function toggleInterest(label: string) {
    setJoinInterests((prev) =>
      prev.includes(label) ? prev.filter((item) => item !== label) : [...prev, label]
    );
  }

  function handleNextStep() {
    setJoinError(null);
    if (!joinName.trim() || !joinEmail.trim()) {
      setJoinError('Fyll i namn och arbetsmejl först.');
      return;
    }
    if (!joinCompany.trim() || !joinWebsite.trim()) {
      setJoinError('Ange företagsnamn och webbplats/domän för att vi ska kunna verifiera profilen.');
      return;
    }
    setJoinStep(2);
  }

  async function handlePost(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim() || posting) return;
    setPostError(null);
    setPosting(true);
    try {
      await onAddThread({
        channel: newChannel,
        author: userDisplayName || 'Verifierad medlem · Sveriges E-handel',
        title: newTitle.trim(),
        body: newBody.trim() || undefined,
      });
      setNewTitle('');
      setNewBody('');
    } catch (err) {
      setPostError((err as Error).message || 'Kunde inte publicera tråden.');
    } finally {
      setPosting(false);
    }
  }

  async function handleCommentSubmit(threadId: string) {
    const text = (commentDrafts[threadId] || '').trim();
    if (!text || commentingId) return;
    if (!isSignedIn) {
      onSignIn?.();
      return;
    }
    setCommentingId(threadId);
    try {
      if (onAddComment) {
        await onAddComment(threadId, {
          author: userDisplayName || 'Verifierad medlem · Sveriges E-handel',
          body: text,
        });
      } else {
        await api.addThreadComment(threadId, {
          author: userDisplayName || 'Verifierad medlem · Sveriges E-handel',
          body: text,
        });
      }
      setCommentDrafts((prev) => ({ ...prev, [threadId]: '' }));
      setExpandedThreads((prev) => ({ ...prev, [threadId]: true }));
    } catch (err) {
      onNotify?.((err as Error).message || 'Kunde inte spara kommentaren.');
    } finally {
      setCommentingId(null);
    }
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    if (joining) return;
    if (!isSignedIn) {
      setJoinError('Verifiera först med ditt Google-konto innan du skickar in ansökan.');
      return;
    }
    if (!joinName.trim() || !joinEmail.trim() || !joinCompany.trim() || !joinWebsite.trim()) {
      setJoinError('Fyll i alla obligatoriska fält i steg 1 (namn, e-post, företag och webbplats).');
      setJoinStep(1);
      return;
    }

    setJoinError(null);
    setJoining(true);
    const isMerchant = joinMemberType === 'E-handlare / Butik';
    const payload: JoinMemberPayload = {
      name: joinName.trim(),
      email: joinEmail.trim(),
      memberType: joinMemberType,
      role: joinRole,
      city: joinCity,
      company: joinCompany.trim(),
      website: joinWebsite.trim(),
      linkedinUrl: joinLinkedin.trim() || undefined,
      annualOrders: isMerchant ? joinAnnualOrders : undefined,
      platform: joinPlatform,
      serviceFocus: !isMerchant ? joinServiceFocus : undefined,
      interests: joinInterests,
      motivation: joinMotivation.trim() || undefined,
    };

    try {
      await onJoinMember(payload);
      setSubmittedProfile(payload);
      setJoinStep(1);
      await loadMemberNetwork();
    } catch (err) {
      setJoinError((err as Error).message || 'Kunde inte skicka ansökan.');
    } finally {
      setJoining(false);
    }
  }

  async function handleSendDm(e: React.FormEvent) {
    e.preventDefault();
    if (!dmRecipient || !dmSubject.trim() || !dmBody.trim() || sendingDm) return;
    setSendingDm(true);
    try {
      await api.sendDirectMessage({
        recipientMemberId: dmRecipient.id,
        subject: dmSubject.trim(),
        body: dmBody.trim(),
        senderName: userDisplayName || joinName || undefined,
      });
      onNotify?.(`Meddelande skickat till ${dmRecipient.name}.`);
      setDmRecipient(null);
      setDmSubject('');
      setDmBody('');
      await loadMemberNetwork();
    } catch (err) {
      onNotify?.((err as Error).message || 'Kunde inte skicka meddelandet.');
    } finally {
      setSendingDm(false);
    }
  }

  async function handleMarkRead(msgId: string) {
    try {
      await api.markMessageRead(msgId);
      setMessages((prev) =>
        prev.map((m) => (m.id === msgId ? { ...m, read: true } : m))
      );
    } catch (err) {
      onNotify?.((err as Error).message || 'Kunde inte markera som läst.');
    }
  }

  function handleReplyToMessage(msg: CommunityDirectMessage) {
    const isIncoming =
      (userUid && msg.recipientUid === userUid) || myMemberIds.includes(msg.recipientMemberId);
    const targetMemberId = isIncoming ? msg.senderMemberId : msg.recipientMemberId;
    const match = targetMemberId
      ? directoryMembers.find((m) => m.id === targetMemberId)
      : undefined;
    if (!match) {
      onNotify?.('Avsändaren saknar en aktiv katalogprofil att svara direkt till.');
      return;
    }
    setDmRecipient(match);
    setDmSubject(msg.subject.startsWith('Sv:') ? msg.subject : `Sv: ${msg.subject}`);
    setDmBody('');
  }

  const regionSummary =
    memberCities.length > 0 ? memberCities.join(', ') : 'Väntar på första ansökan';
  const isMerchantType = joinMemberType === 'E-handlare / Butik';

  return (
    <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="bg-[#040B16] text-white border border-slate-800 rounded-2xl p-6 sm:p-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-6 space-y-4">
          <div className="font-mono text-xs font-semibold text-[#10B981]">
            {pageCopy?.kicker || 'Sveriges E-handel Network'} · {memberCount} registrerade i nätverket
          </div>
          <h1 className="font-display text-3xl sm:text-5xl font-extrabold tracking-tight text-balance">
            {pageCopy?.title || (
              <>
                Där svenska e-handlare &amp; branschexperter <span className="text-[#FECC02]">delar riktig data.</span>
              </>
            )}
          </h1>
          <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
            {pageCopy?.subtitle ||
              'Ett leverantörsoberoende branschnätverk för e-handlare, tjänsteleverantörer, transportörer, 3PL och e-handelsplattformar. Skapa trådar, kommentera och skicka direktmeddelanden.'}
          </p>

          <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-2.5 text-xs text-slate-300">
            <div className="font-semibold text-white inline-flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[#10B981]" />
              Detta kan du göra som inloggad medlem
            </div>
            <ul className="space-y-1.5 text-slate-300">
              <li>
                · <strong className="text-white">Skriva egna inlägg:</strong> Starta diskussioner i ämneskanalerna med rubrik och fördjupande text.
              </li>
              <li>
                · <strong className="text-white">Kommentera &amp; rösta:</strong> Delta direkt i andras trådar och rösta upp värdefulla spaningar.
              </li>
              <li>
                · <strong className="text-white">Skicka direktmeddelanden (DM):</strong> Kontakta handlare, byråer, transportörer &amp; plattformar via medlemskatalogen.
              </li>
              <li>
                · <strong className="text-white">Hela ekosystemet välkomnas:</strong> E-handlare, tjänsteleverantörer, transport/3PL och SaaS-plattformar (nolltolerans mot kalla pitches i öppna trådar).
              </li>
            </ul>
          </div>

          <div className="grid grid-cols-3 gap-4 pt-3 border-t border-white/10">
            <div>
              <div className="font-mono text-2xl font-extrabold text-[#FECC02] tabular-nums">
                {memberCount}
              </div>
              <div className="text-xs text-slate-400">
                Medlemmar{verifiedCount > 0 ? ` (${verifiedCount} verifierade)` : ''}
              </div>
            </div>
            <div>
              <div className="font-mono text-2xl font-extrabold text-[#10B981] tabular-nums">
                {memberCities.length} {memberCities.length === 1 ? 'region' : 'regioner'}
              </div>
              <div className="text-xs text-slate-400 truncate" title={regionSummary}>
                {regionSummary}
              </div>
            </div>
            <div>
              <div className="font-mono text-2xl font-extrabold text-white tabular-nums">0 SEK</div>
              <div className="text-xs text-slate-400">Kostnadsfritt nätverk</div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-6 bg-white text-[#040B16] rounded-2xl p-6 space-y-4">
          <div>
            <h3 className="font-display text-xl font-extrabold">Ansök om verifierat medlemskap</h3>
            <p className="text-xs text-slate-500 mt-1">
              Välj om du representerar en e-handel, tjänsteleverantör, transportör/3PL eller plattform. Varje ansökan räknas upp i nätverket och ger tillgång till direktmeddelanden &amp; katalog.
            </p>
          </div>

          {!isSignedIn ? (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between gap-2 text-xs text-amber-950">
              <span>Verifiera med Google-konto för att skicka in din medlemsansökan.</span>
              <button
                type="button"
                onClick={onSignIn}
                className="shrink-0 px-3 py-1.5 rounded-lg bg-[#040B16] text-white font-bold cursor-pointer hover:bg-[#006AA7]"
              >
                Logga in
              </button>
            </div>
          ) : (
            <div className="px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between gap-2 text-xs text-emerald-900">
              <span className="inline-flex items-center gap-1.5 font-medium truncate">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#059669] shrink-0" />
                Google-konto verifierat: <strong className="truncate">{userEmail}</strong>
              </span>
              <span className="font-mono text-[11px] font-bold text-[#059669] shrink-0">
                Steg {joinStep}/2
              </span>
            </div>
          )}

          {submittedProfile ? (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 space-y-2 text-xs text-emerald-950">
                <div className="font-display font-bold text-sm inline-flex items-center gap-1.5 text-emerald-900">
                  <CheckCircle2 className="w-4 h-4 text-[#059669]" />
                  Ansökan mottagen &amp; registrerad ({memberCount} i nätverket)
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-[11px]">
                  <div>
                    <span className="text-emerald-700 block">Profil &amp; Kategori</span>
                    <strong>{submittedProfile.name}</strong> · {submittedProfile.memberType}
                  </div>
                  <div>
                    <span className="text-emerald-700 block">Företag &amp; domän</span>
                    <strong>{submittedProfile.company}</strong> · {submittedProfile.website}
                  </div>
                  <div>
                    <span className="text-emerald-700 block">
                      {submittedProfile.memberType === 'E-handlare / Butik'
                        ? 'Region & paketvolym'
                        : 'Region & inriktning'}
                    </span>
                    <strong>{submittedProfile.city}</strong> ·{' '}
                    {submittedProfile.annualOrders || submittedProfile.serviceFocus || submittedProfile.platform}
                  </div>
                  <div>
                    <span className="text-emerald-700 block">Status</span>
                    <strong className="text-[#006AA7]">Aktiv i medlemskatalogen · Granskas</strong>
                  </div>
                </div>
                {submittedProfile.interests && submittedProfile.interests.length > 0 && (
                  <div className="pt-1 text-[11px] text-emerald-900">
                    <strong>Fokusområden:</strong> {submittedProfile.interests.join(' · ')}
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setWorkspaceTab('directory');
                    void loadMemberNetwork();
                  }}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-[#040B16] hover:bg-[#006AA7] text-white text-xs font-bold cursor-pointer transition-colors"
                >
                  Öppna Medlemskatalog &amp; DM →
                </button>
                <button
                  type="button"
                  onClick={() => setSubmittedProfile(null)}
                  className="py-2.5 px-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-bold text-[#040B16] cursor-pointer"
                >
                  Redigera profil
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleJoin} className="space-y-3.5">
              {/* Step Switcher */}
              <div className="grid grid-cols-2 gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setJoinStep(1)}
                  className={`py-2 px-3 rounded-lg transition-colors cursor-pointer ${
                    joinStep === 1 ? 'bg-white text-[#040B16] shadow-sm font-bold' : 'text-slate-600'
                  }`}
                >
                  1. Kategori &amp; Företag
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (joinStep === 1) handleNextStep();
                  }}
                  className={`py-2 px-3 rounded-lg transition-colors cursor-pointer ${
                    joinStep === 2 ? 'bg-white text-[#040B16] shadow-sm font-bold' : 'text-slate-600'
                  }`}
                >
                  2. Inriktning &amp; Intressen
                </button>
              </div>

              {joinStep === 1 ? (
                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1.5">
                      Typ av medlem *
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {MEMBER_CATEGORIES.map((cat) => {
                        const selected = joinMemberType === cat.type;
                        return (
                          <button
                            key={cat.type}
                            type="button"
                            onClick={() => handleSelectMemberType(cat.type)}
                            className={`text-left px-3 py-2 rounded-xl border transition-colors cursor-pointer ${
                              selected
                                ? 'bg-[#040B16] text-white border-[#040B16]'
                                : 'bg-slate-50 text-slate-800 border-slate-200 hover:border-slate-400'
                            }`}
                          >
                            <div className="text-xs font-bold leading-tight">{cat.type}</div>
                            <div
                              className={`text-[10px] mt-0.5 leading-snug ${
                                selected ? 'text-slate-300' : 'text-slate-500'
                              }`}
                            >
                              {cat.desc}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Namn *
                      </label>
                      <input
                        type="text"
                        required
                        value={joinName}
                        onChange={(e) => setJoinName(e.target.value)}
                        placeholder="För- och efternamn"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-[#006AA7] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Arbetsmejl *
                      </label>
                      <input
                        type="email"
                        required
                        value={joinEmail}
                        onChange={(e) => setJoinEmail(e.target.value)}
                        placeholder="namn@foretag.se"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-[#006AA7] focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Roll *
                      </label>
                      <select
                        value={joinRole}
                        onChange={(e) => setJoinRole(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold bg-white"
                      >
                        {ROLES_BY_TYPE[joinMemberType].map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Region *
                      </label>
                      <select
                        value={joinCity}
                        onChange={(e) => setJoinCity(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold bg-white"
                      >
                        {MEMBER_REGIONS.map((reg) => (
                          <option key={reg} value={reg}>
                            {reg}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        {isMerchantType ? 'Butik / Varumärke *' : 'Företag / Organisation *'}
                      </label>
                      <div className="relative">
                        <Building2 className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                        <input
                          type="text"
                          required
                          value={joinCompany}
                          onChange={(e) => setJoinCompany(e.target.value)}
                          placeholder={
                            isMerchantType ? 'T.ex. Nordic Outdoor AB' : 'T.ex. PostNord / Shipwallet AB'
                          }
                          className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm focus:ring-2 focus:ring-[#006AA7] focus:outline-none"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Webbplats / Domän *
                      </label>
                      <div className="relative">
                        <Globe className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                        <input
                          type="text"
                          required
                          value={joinWebsite}
                          onChange={(e) => setJoinWebsite(e.target.value)}
                          placeholder="t.ex. foretag.se"
                          className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm focus:ring-2 focus:ring-[#006AA7] focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {joinError && (
                    <div className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">
                      {joinError}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleNextStep}
                    className="w-full py-3 rounded-xl bg-[#040B16] hover:bg-[#006AA7] text-white font-bold text-xs sm:text-sm inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    Nästa: Inriktning &amp; fokusområden
                    <ArrowRight className="w-4 h-4 text-[#FECC02]" />
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {isMerchantType ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Årlig paketvolym
                        </label>
                        <select
                          value={joinAnnualOrders}
                          onChange={(e) => setJoinAnnualOrders(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold bg-white"
                        >
                          {ORDER_VOLUME_OPTIONS.map((v) => (
                            <option key={v} value={v}>
                              {v}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          E-handelsplattform
                        </label>
                        <select
                          value={joinPlatform}
                          onChange={(e) => setJoinPlatform(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold bg-white"
                        >
                          {PLATFORM_OPTIONS.map((p) => (
                            <option key={p} value={p}>
                              {p}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Huvudsakligt erbjudande / Fokus
                        </label>
                        <select
                          value={joinServiceFocus}
                          onChange={(e) => setJoinServiceFocus(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold bg-white"
                        >
                          {SERVICE_FOCUS_BY_TYPE[joinMemberType].map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Primärt ekosystem
                        </label>
                        <select
                          value={joinPlatform}
                          onChange={(e) => setJoinPlatform(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold bg-white"
                        >
                          {ECOSYSTEM_OPTIONS.map((p) => (
                            <option key={p} value={p}>
                              {p}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      LinkedIn-URL eller telefon (valfritt, snabbare verifiering)
                    </label>
                    <input
                      type="text"
                      value={joinLinkedin}
                      onChange={(e) => setJoinLinkedin(e.target.value)}
                      placeholder="https://linkedin.com/in/... eller 070-..."
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-[#006AA7] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1.5">
                      Vad vill du bidra med eller få ut av nätverket?
                    </label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {NETWORK_INTERESTS.map((topic) => {
                        const selected = joinInterests.includes(topic);
                        return (
                          <button
                            key={topic}
                            type="button"
                            onClick={() => toggleInterest(topic)}
                            className={`text-left px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
                              selected
                                ? 'bg-[#040B16] text-white border-[#040B16]'
                                : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-400'
                            }`}
                          >
                            <Check
                              className={`w-3 h-3 shrink-0 ${
                                selected ? 'text-[#FECC02]' : 'text-slate-300'
                              }`}
                            />
                            <span className="truncate">{topic}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Kort presentation till nätverket (valfritt)
                    </label>
                    <textarea
                      rows={2}
                      value={joinMotivation}
                      onChange={(e) => setJoinMotivation(e.target.value)}
                      placeholder={
                        isMerchantType
                          ? 'T.ex. vill jämföra fraktavtal, skala till Norge eller utbyta erfarenheter kring Centra/Shopify...'
                          : 'T.ex. delar gärna benchmark-insikter om checkout, paketflöden eller teknisk arkitektur utan säljspam...'
                      }
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-[#006AA7] focus:outline-none"
                    />
                  </div>

                  {joinError && (
                    <div className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">
                      {joinError}
                    </div>
                  )}

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setJoinStep(1)}
                      className="px-3.5 py-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-700 inline-flex items-center gap-1 cursor-pointer shrink-0"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      Tillbaka
                    </button>
                    <button
                      type="submit"
                      disabled={joining}
                      className="flex-1 py-3 rounded-xl bg-[#FECC02] hover:bg-[#EAB308] disabled:opacity-60 text-[#040B16] font-bold text-sm transition-colors cursor-pointer"
                    >
                      {joining ? 'Skickar ansökan...' : 'Skicka ansökan →'}
                    </button>
                  </div>
                </div>
              )}
            </form>
          )}
        </div>
      </div>

      {/* Workspace Tabs: Forum vs Member Directory & Direct Messages */}
      <div className="bg-white border border-slate-200 rounded-2xl p-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setWorkspaceTab('forum')}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold inline-flex items-center gap-2 transition-colors cursor-pointer ${
              workspaceTab === 'forum'
                ? 'bg-[#040B16] text-white'
                : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            <MessageSquare className="w-4 h-4 text-[#FECC02]" />
            Diskussioner &amp; Kommentarer
            <span className="font-mono text-[11px] opacity-80 tabular-nums">({threads.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setWorkspaceTab('directory')}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold inline-flex items-center gap-2 transition-colors cursor-pointer ${
              workspaceTab === 'directory'
                ? 'bg-[#040B16] text-white'
                : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            <Users className="w-4 h-4 text-[#10B981]" />
            Medlemskatalog &amp; Direktmeddelanden
            {isSignedIn && (
              <span className="font-mono text-[11px] opacity-80 tabular-nums">
                ({directoryMembers.length})
              </span>
            )}
            {unreadIncomingCount > 0 && (
              <span className="px-1.5 py-0.5 rounded bg-[#FECC02] text-[#040B16] font-mono text-[10px] font-extrabold tabular-nums">
                {unreadIncomingCount} nya DM
              </span>
            )}
          </button>
        </div>

        <div className="px-3 text-xs text-slate-500">
          {isSignedIn
            ? `Inloggad som ${userDisplayName || userEmail} · Full skriv- & DM-behörighet`
            : 'Logga in med Google för att starta trådar, kommentera och skicka DM'}
        </div>
      </div>

      <PageFormSlot
        forms={contactForms}
        page="community"
        position="top"
        adBanners={adBanners}
        onSubmitted={onFormSubmitted}
        onNotify={onNotify}
      />

      {workspaceTab === 'forum' ? (
        <>
          <PageFormSlot
            forms={contactForms}
            page="community"
            position="mid"
            adBanners={adBanners}
            onSubmitted={onFormSubmitted}
            onNotify={onNotify}
          />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-4 space-y-6">
              <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
                <div className="text-xs font-mono font-semibold text-[#006AA7]">Ämneskanaler</div>
                <div className="space-y-1 text-xs font-mono font-semibold">
                  {CHANNELS.map((ch) => (
                    <button
                      key={ch}
                      type="button"
                      onClick={() => setActiveChannel(ch)}
                      className={`w-full text-left px-3 py-2 rounded-lg transition-colors cursor-pointer ${
                        activeChannel === ch
                          ? 'bg-[#040B16] text-white'
                          : 'text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {ch === 'all' ? '# alla-kanaler' : ch}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
                <div className="text-xs font-mono font-semibold text-[#059669]">Svenska branschnätverk</div>
                <div className="space-y-3 text-xs divide-y divide-slate-100">
                  <div className="pt-1">
                    <div className="font-bold text-[#040B16]">E-handelsstaden Borås</div>
                    <p className="text-slate-600 mt-0.5">
                      Sveriges ledande regionala kluster för handel, textil och logistikutveckling.
                    </p>
                  </div>
                  <div className="pt-3">
                    <div className="font-bold text-[#040B16]">Svensk Handel – Digital Handel</div>
                    <p className="text-slate-600 mt-0.5">
                      Arrangör av D-Congress och ansvarig för Trygg E-handel.
                    </p>
                  </div>
                  <div className="pt-3">
                    <div className="font-bold text-[#040B16]">Women in E-Commerce Sweden</div>
                    <p className="text-slate-600 mt-0.5">
                      Nätverk och mentorskapsprogram för kvinnliga ledare inom nordisk e-handel.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-8 bg-white border border-slate-200 rounded-2xl p-6 space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-2xl font-extrabold text-[#040B16]">
                  Diskussioner i nätverket
                </h2>
                <span className="text-xs font-mono text-slate-500 tabular-nums">
                  {filtered.length} aktiva trådar
                </span>
              </div>

              <form
                onSubmit={handlePost}
                className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                  <span>
                    Publicerar som:{' '}
                    <strong className="text-[#040B16]">
                      {userDisplayName || 'Verifierad medlem · Sveriges E-handel'}
                    </strong>
                  </span>
                  {!isSignedIn && (
                    <button
                      type="button"
                      onClick={onSignIn}
                      className="text-[#006AA7] font-semibold hover:underline cursor-pointer"
                    >
                      Logga in med Google för att publicera
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Rubrik: Starta en ny diskussion eller ställ en fråga till nätverket..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#006AA7]"
                />
                <textarea
                  rows={2}
                  value={newBody}
                  onChange={(e) => setNewBody(e.target.value)}
                  placeholder="Fördjupning eller bakgrund (valfritt) — beskriv frågeställning, paketvolym, plattform eller erfarenhet..."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#006AA7]"
                />
                {postError && (
                  <div className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">
                    {postError}
                  </div>
                )}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <select
                    value={newChannel}
                    onChange={(e) => setNewChannel(e.target.value)}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-mono font-semibold"
                  >
                    <option value="#checkout-optimering">#checkout-optimering</option>
                    <option value="#export-tull">#export-tull</option>
                    <option value="#ai-och-data">#ai-och-data</option>
                    <option value="#d-congress-2027">#d-congress-2027</option>
                  </select>
                  <button
                    type="submit"
                    disabled={posting}
                    className="px-4 py-2 rounded-lg bg-[#040B16] hover:bg-[#006AA7] disabled:opacity-60 text-white text-xs font-bold transition-colors cursor-pointer"
                  >
                    {posting ? 'Publicerar...' : 'Publicera tråd →'}
                  </button>
                </div>
              </form>

              <div className="space-y-3">
                {filtered.map((t) => {
                  const comments = Array.isArray(t.comments) ? t.comments : [];
                  const isExpanded = Boolean(expandedThreads[t.id]);
                  const commentCount = Math.max(t.replies || 0, comments.length);

                  return (
                    <div
                      key={t.id}
                      className="p-4 rounded-xl border border-slate-200 hover:border-slate-300 transition-colors space-y-3"
                    >
                      <div className="flex items-start gap-4">
                        <button
                          type="button"
                          onClick={() => onUpvote(t.id)}
                          className="shrink-0 flex flex-col items-center justify-center w-12 py-2 rounded-lg bg-slate-50 hover:bg-[#FECC02]/25 border border-slate-200 transition-colors cursor-pointer"
                          aria-label={`Rösta upp ${t.title}`}
                        >
                          <ChevronUp className="w-4 h-4 text-[#040B16]" />
                          <span className="font-mono text-xs font-bold text-[#040B16] tabular-nums">
                            {t.votes}
                          </span>
                        </button>
                        <div className="flex-1 space-y-1.5">
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500">
                            <span className="font-mono font-semibold text-[#006AA7]">{t.channel}</span>
                            <span>·</span>
                            <span className="font-semibold text-slate-700">{t.author}</span>
                            {t.authorCompany && (
                              <span className="text-slate-500">({t.authorCompany})</span>
                            )}
                            {t.authorMemberType && (
                              <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-mono text-[10px]">
                                {t.authorMemberType}
                              </span>
                            )}
                            <span>·</span>
                            <span>{t.time}</span>
                          </div>
                          <h4 className="font-display font-bold text-sm sm:text-base text-[#040B16]">
                            {t.title}
                          </h4>
                          {t.body && (
                            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed whitespace-pre-line">
                              {t.body}
                            </p>
                          )}
                          <div className="pt-1 flex flex-wrap items-center gap-3">
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedThreads((prev) => ({ ...prev, [t.id]: !prev[t.id] }))
                              }
                              className="text-xs text-[#006AA7] hover:text-[#040B16] font-semibold inline-flex items-center gap-1.5 tabular-nums cursor-pointer"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                              {isExpanded ? 'Dölj kommentarer' : `Visa & skriv kommentarer (${commentCount})`}
                              <ChevronDown
                                className={`w-3.5 h-3.5 transition-transform ${
                                  isExpanded ? 'rotate-180' : ''
                                }`}
                              />
                            </button>
                          </div>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="ml-0 sm:ml-16 pt-3 border-t border-slate-100 space-y-3">
                          {comments.length > 0 ? (
                            <div className="space-y-2.5">
                              {comments.map((cm) => (
                                <div
                                  key={cm.id}
                                  className="p-3 rounded-lg bg-[#F4F6F9] border border-slate-200/80 space-y-1 text-xs"
                                >
                                  <div className="flex flex-wrap items-center justify-between gap-2 text-slate-500">
                                    <div className="flex flex-wrap items-center gap-1.5">
                                      <strong className="text-[#040B16]">{cm.author}</strong>
                                      {cm.authorCompany && <span>· {cm.authorCompany}</span>}
                                      {cm.authorMemberType && (
                                        <span className="px-1.5 py-0.5 rounded bg-white border border-slate-200 text-[10px] font-mono text-slate-700">
                                          {cm.authorMemberType}
                                        </span>
                                      )}
                                    </div>
                                    <span className="font-mono text-[10px]">
                                      {new Date(cm.createdAt).toLocaleDateString('sv-SE')}
                                    </span>
                                  </div>
                                  <p className="text-slate-700 leading-relaxed whitespace-pre-line">
                                    {cm.body}
                                  </p>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-xs text-slate-500">
                              Inga skriftliga kommentarer ännu. Var först med att svara i tråden.
                            </div>
                          )}

                          <div className="flex flex-col sm:flex-row gap-2">
                            <input
                              type="text"
                              value={commentDrafts[t.id] || ''}
                              onChange={(e) =>
                                setCommentDrafts((prev) => ({ ...prev, [t.id]: e.target.value }))
                              }
                              placeholder={
                                isSignedIn
                                  ? 'Skriv en kommentar eller erfarenhet...'
                                  : 'Logga in med Google för att kommentera...'
                              }
                              className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-[#006AA7] focus:outline-none"
                            />
                            <button
                              type="button"
                              disabled={commentingId === t.id || !(commentDrafts[t.id] || '').trim()}
                              onClick={() => void handleCommentSubmit(t.id)}
                              className="px-3.5 py-2 rounded-lg bg-[#040B16] hover:bg-[#006AA7] disabled:opacity-50 text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                            >
                              <Send className="w-3 h-3" />
                              {commentingId === t.id ? 'Skickar...' : 'Kommentera'}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </>
      ) : (
        /* Member Directory & Direct Messaging Workspace */
        <div className="space-y-6">
          {!isSignedIn ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center max-w-2xl mx-auto space-y-4">
              <div className="w-12 h-12 rounded-xl bg-[#040B16] text-[#FECC02] flex items-center justify-center mx-auto">
                <Users className="w-6 h-6" />
              </div>
              <h2 className="font-display text-2xl font-extrabold text-[#040B16]">
                Logga in för medlemskatalog &amp; direktmeddelanden
              </h2>
              <p className="text-sm text-slate-600 leading-relaxed">
                Av integritetsskäl visas medlemskatalogen och privat meddelandefunktion endast för inloggade användare med verifierat Google-konto. Din e-postadress delas aldrig offentligt i katalogen.
              </p>
              <button
                type="button"
                onClick={onSignIn}
                className="px-5 py-3 rounded-xl bg-[#040B16] hover:bg-[#006AA7] text-white text-sm font-bold cursor-pointer transition-colors"
              >
                Logga in med Google →
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Directory Column */}
              <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-6 space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="font-display text-xl font-extrabold text-[#040B16]">
                      Medlemskatalog ({filteredDirectory.length})
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Hitta och skicka direktmeddelanden till handlare, tjänsteleverantörer, transportörer &amp; plattformar.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void loadMemberNetwork()}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 cursor-pointer"
                  >
                    Uppdatera
                  </button>
                </div>

                <div className="space-y-3">
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={directoryQuery}
                      onChange={(e) => setDirectoryQuery(e.target.value)}
                      placeholder="Sök namn, företag, roll, region eller inriktning..."
                      className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm focus:ring-2 focus:ring-[#006AA7] focus:outline-none"
                    />
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => setDirectoryCategory('all')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                        directoryCategory === 'all'
                          ? 'bg-[#040B16] text-white'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      Alla ({directoryMembers.length})
                    </button>
                    {MEMBER_CATEGORIES.map((cat) => (
                      <button
                        key={cat.type}
                        type="button"
                        onClick={() => setDirectoryCategory(cat.type)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                          directoryCategory === cat.type
                            ? 'bg-[#040B16] text-white'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        {cat.short}
                      </button>
                    ))}
                  </div>
                </div>

                {networkError && (
                  <div className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-xl p-3">
                    {networkError}
                  </div>
                )}

                {loadingNetwork && directoryMembers.length === 0 ? (
                  <div className="text-xs text-slate-500 py-6 text-center">
                    Laddar medlemskatalog...
                  </div>
                ) : filteredDirectory.length === 0 ? (
                  <div className="text-xs text-slate-500 p-5 rounded-xl bg-[#F4F6F9] border border-slate-200">
                    Inga registrerade medlemmar matchade filtret ännu. Registrera din egen profil i formuläret ovan för att bli sökbar i katalogen.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredDirectory.map((mem) => (
                      <div
                        key={mem.id}
                        className="p-4 rounded-xl border border-slate-200 hover:border-slate-300 transition-colors space-y-2.5"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-display font-bold text-sm text-[#040B16]">
                                {mem.name}
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded border text-[10px] font-mono font-bold ${
                                  mem.verificationStatus === 'verified'
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                    : 'bg-amber-50 text-amber-800 border-amber-200'
                                }`}
                              >
                                {mem.verificationStatus === 'verified' ? 'Verifierad' : 'Granskas'}
                              </span>
                              <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-mono font-semibold">
                                {mem.memberType}
                              </span>
                            </div>
                            <div className="text-xs text-slate-600">
                              <strong className="text-slate-800">{mem.role}</strong>
                              {mem.company ? ` · ${mem.company}` : ''} · {mem.city}
                            </div>
                          </div>

                          {mem.isSelf ? (
                            <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 text-[11px] font-semibold">
                              Din profil
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setDmRecipient(mem);
                                setDmSubject('');
                                setDmBody('');
                              }}
                              className="px-3 py-1.5 rounded-lg bg-[#040B16] hover:bg-[#006AA7] text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer shrink-0 transition-colors"
                            >
                              <Mail className="w-3.5 h-3.5 text-[#FECC02]" />
                              Skicka meddelande
                            </button>
                          )}
                        </div>

                        {(mem.serviceFocus || mem.platform || mem.website) && (
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500">
                            {mem.serviceFocus && <span>Fokus: {mem.serviceFocus}</span>}
                            {mem.platform && <span>Ekosystem: {mem.platform}</span>}
                            {mem.website && (
                              <span className="font-mono text-[#006AA7]">{mem.website}</span>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Direct Messages & Composer Column */}
              <div className="lg:col-span-5 space-y-5">
                {dmRecipient && (
                  <form
                    onSubmit={handleSendDm}
                    className="bg-[#040B16] text-white border border-slate-800 rounded-2xl p-5 space-y-3.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-[11px] font-mono font-semibold text-[#FECC02]">
                          Nytt direktmeddelande
                        </div>
                        <h3 className="font-display font-bold text-base">
                          Till: {dmRecipient.name}
                          {dmRecipient.company ? ` (${dmRecipient.company})` : ''}
                        </h3>
                        <p className="text-[11px] text-slate-400">
                          {dmRecipient.memberType} · {dmRecipient.role}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setDmRecipient(null)}
                        className="text-xs text-slate-400 hover:text-white cursor-pointer"
                      >
                        Avbryt
                      </button>
                    </div>

                    <input
                      type="text"
                      required
                      value={dmSubject}
                      onChange={(e) => setDmSubject(e.target.value)}
                      placeholder="Ämne (t.ex. Fråga om fraktavtal / integration)"
                      className="w-full px-3 py-2 rounded-xl bg-white text-[#040B16] text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#FECC02]"
                    />
                    <textarea
                      rows={4}
                      required
                      value={dmBody}
                      onChange={(e) => setDmBody(e.target.value)}
                      placeholder="Skriv ditt meddelande här. Håll det relevant och kollegialt..."
                      className="w-full px-3 py-2 rounded-xl bg-white text-[#040B16] text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#FECC02]"
                    />
                    <button
                      type="submit"
                      disabled={sendingDm}
                      className="w-full py-2.5 rounded-xl bg-[#FECC02] hover:bg-[#EAB308] disabled:opacity-60 text-[#040B16] text-xs font-extrabold inline-flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      {sendingDm ? 'Skickar...' : 'Skicka direktmeddelande →'}
                    </button>
                  </form>
                )}

                <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-display font-bold text-lg text-[#040B16] inline-flex items-center gap-2">
                      <Inbox className="w-4 h-4 text-[#006AA7]" />
                      Mina meddelanden ({messages.length})
                    </h3>
                    {unreadIncomingCount > 0 && (
                      <span className="text-[11px] font-mono font-bold text-[#006AA7]">
                        {unreadIncomingCount} olästa
                      </span>
                    )}
                  </div>

                  {messages.length === 0 ? (
                    <div className="text-xs text-slate-500 p-4 rounded-xl bg-[#F4F6F9] border border-slate-200">
                      Du har inga direktmeddelanden ännu. Välj en medlem i katalogen till vänster och klicka på &ldquo;Skicka meddelande&rdquo;.
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[540px] overflow-y-auto pr-1">
                      {messages.map((msg) => {
                        const isIncoming =
                          (userUid && msg.recipientUid === userUid) ||
                          myMemberIds.includes(msg.recipientMemberId);
                        const unread = isIncoming && !msg.read;
                        return (
                          <div
                            key={msg.id}
                            className={`p-3.5 rounded-xl border space-y-2 text-xs ${
                              unread
                                ? 'bg-sky-50/70 border-[#006AA7]/40'
                                : 'bg-slate-50/70 border-slate-200'
                            }`}
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <span className="font-mono text-[10px] font-bold text-[#006AA7]">
                                {isIncoming
                                  ? `Mottaget från ${msg.senderName}${msg.senderCompany ? ` (${msg.senderCompany})` : ''}`
                                  : `Skickat till ${msg.recipientName}${msg.recipientCompany ? ` (${msg.recipientCompany})` : ''}`}
                              </span>
                              <span className="font-mono text-[10px] text-slate-400">
                                {new Date(msg.createdAt).toLocaleDateString('sv-SE')}
                              </span>
                            </div>
                            <div className="font-bold text-[#040B16] text-sm">{msg.subject}</div>
                            <p className="text-slate-700 leading-relaxed whitespace-pre-line">
                              {msg.body}
                            </p>
                            <div className="flex flex-wrap items-center gap-2 pt-1">
                              {unread && (
                                <button
                                  type="button"
                                  onClick={() => void handleMarkRead(msg.id)}
                                  className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-[11px] font-semibold text-slate-700 cursor-pointer"
                                >
                                  Markera som läst
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => handleReplyToMessage(msg)}
                                className="px-2.5 py-1 rounded-lg bg-[#040B16] hover:bg-[#006AA7] text-white text-[11px] font-bold cursor-pointer"
                              >
                                Svara
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <PageFormSlot
        forms={contactForms}
        page="community"
        position="bottom"
        adBanners={adBanners}
        onSubmitted={onFormSubmitted}
        onNotify={onNotify}
      />
    </div>
  );
}
