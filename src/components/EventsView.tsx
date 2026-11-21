import { useMemo, useState } from 'react';
import { CalendarCheck, Check, ExternalLink, MapPin, Plus, Ticket, X } from 'lucide-react';
import { useFirebase } from '../contexts/FirebaseContext';
import type { AdBanner, ContactFormConfig, DCSession, EcommerceEvent, PageCopyBlock, PortalTab } from '../types';
import { AdBannerSlot } from './AdBannerSlot';
import { PageFormSlot } from './DynamicFormWidget';
import { ResilientImage } from './ResilientImage';

interface EventsViewProps {
  events: EcommerceEvent[];
  sessions: DCSession[];
  adBanners: AdBanner[];
  contactForms?: ContactFormConfig[];
  pageCopy?: PageCopyBlock;
  onNavigate: (tab: PortalTab, searchQuery?: string) => void;
  onBookAdSlot: (slotName: string) => void;
  onFormSubmitted?: () => Promise<void> | void;
  onNotify: (msg: string) => void;
  onOpenModal: (title: string, body: string) => void;
}

export function EventsView({
  events,
  sessions,
  adBanners,
  contactForms = [],
  pageCopy,
  onNavigate,
  onBookAdSlot,
  onFormSubmitted,
  onNotify,
  onOpenModal,
}: EventsViewProps) {
  const [cityFilter, setCityFilter] = useState<'all' | 'Stockholm' | 'Göteborg' | 'Oslo'>('all');
  const [focusFilter, setFocusFilter] = useState<string>('all');
  const [roleView, setRoleView] = useState<'visitor' | 'exhibitor'>('visitor');

  const [activeTrack, setActiveTrack] = useState<string>('all');
  const { user, savedSessionIds, toggleSavedSession, requestSignIn } = useFirebase();

  const publishedEvents = useMemo(
    () => events.filter((e) => e.status === 'published'),
    [events]
  );

  const filteredEvents = useMemo(() => {
    return publishedEvents.filter((ev) => {
      const matchCity = cityFilter === 'all' || ev.city.toLowerCase().includes(cityFilter.toLowerCase());
      const matchFocus =
        focusFilter === 'all' ||
        ev.focusAreas.some((f) => f.toLowerCase().includes(focusFilter.toLowerCase())) ||
        ev.desc.toLowerCase().includes(focusFilter.toLowerCase());
      return matchCity && matchFocus;
    });
  }, [publishedEvents, cityFilter, focusFilter]);

  const publishedSessions = sessions.filter((s) => s.status === 'published');
  const filteredSessions =
    activeTrack === 'all'
      ? publishedSessions
      : publishedSessions.filter((s) => s.track === activeTrack);

  const savedSessions = publishedSessions.filter((s) => savedSessionIds.includes(s.id));

  async function handleToggleSession(session: DCSession) {
    try {
      const added = await toggleSavedSession(session);
      if (added) {
        onNotify(
          user
            ? 'Programpunkt sparad i ditt konto för D-Congress 2027.'
            : 'Programpunkt tillagd i ditt D-Congress 2027-schema.'
        );
      }
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'Kunde inte uppdatera schemat.');
    }
  }

  return (
    <div>
      {/* Hero Banner */}
      <section className="bg-[#040B16] text-white hero-grid-bg border-b border-white/10">
        <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch">
            <div className="lg:col-span-7 flex flex-col justify-center space-y-5">
              <div className="text-xs font-mono text-[#FECC02]">
                {pageCopy?.kicker || 'Svenska & nordiska branschevent 2026–2027 · Göteborg · Stockholm · Oslo'}
              </div>

              <h1 className="font-display text-4xl sm:text-5xl font-extrabold tracking-tight leading-[1.06] max-w-2xl text-balance">
                {pageCopy?.title || (
                  <>
                    Mässor, konferenser &amp; <span className="text-[#FECC02]">D-Congress 2027.</span>
                  </>
                )}
              </h1>
              <p className="text-slate-300 text-base sm:text-lg max-w-2xl leading-relaxed">
                {pageCopy?.subtitle ||
                  'Alla viktiga mötesplatser för svenska e-handlare och tech-leverantörer: från D-Congress på Svenska Mässan till E-commerce Expo på Kistamässan, Retail Technology i Älvsjö, Stora Ehandelsdagen och NXT Nordic i Oslo.'}
              </p>

              <div className="flex flex-wrap gap-3 pt-2">
                <a
                  href="#events-directory"
                  className="px-6 py-3 rounded-xl bg-[#FECC02] hover:bg-[#EAB308] text-[#040B16] font-bold text-sm transition-colors"
                >
                  Se alla mässor & event &rarr;
                </a>
                <a
                  href="#dc-program"
                  className="px-5 py-3 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-white font-semibold text-sm transition-colors"
                >
                  D-Congress scenprogram
                </a>
              </div>
            </div>

            <div className="lg:col-span-5">
              <div className="h-full min-h-[260px] rounded-2xl overflow-hidden border border-white/10 relative">
                <ResilientImage
                  src="/src/assets/images/dcongress_stage_1795029383597.jpg"
                  alt="Keynote-scen på svensk e-handelsmässa"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#040B16]/90 via-transparent to-transparent" />
                <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-xs text-white">
                  <span className="font-semibold">Göteborg · Stockholm · Oslo</span>
                  <span className="font-mono text-[#FECC02] tabular-nums">
                    {publishedEvents.length} branschevent
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-10 pt-8 border-t border-white/10">
            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
              <div className="text-xs font-mono text-slate-400">D-Congress 2027</div>
              <div className="font-display text-xl font-extrabold text-[#FECC02] mt-1 tabular-nums">
                10–11 mars
              </div>
              <div className="text-xs text-slate-300 mt-1">Svenska Mässan, Göteborg</div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
              <div className="text-xs font-mono text-slate-400">E-commerce Expo</div>
              <div className="font-display text-xl font-extrabold text-white mt-1 tabular-nums">
                25–26 maj
              </div>
              <div className="text-xs text-slate-300 mt-1">Kistamässan, Stockholm</div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
              <div className="text-xs font-mono text-slate-400">Retail Technology</div>
              <div className="font-display text-xl font-extrabold text-[#10B981] mt-1 tabular-nums">
                24–25 aug
              </div>
              <div className="text-xs text-slate-300 mt-1">Stockholmsmässan + Formex</div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
              <div className="text-xs font-mono text-slate-400">Konferenser</div>
              <div className="font-display text-xl font-extrabold text-white mt-1">
                Sthlm & Oslo
              </div>
              <div className="text-xs text-slate-300 mt-1">Stora Ehandelsdagen · NXT</div>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12">
        <AdBannerSlot
          banners={adBanners}
          placement="event-top"
          onNavigate={onNavigate}
          onBookSlot={onBookAdSlot}
        />

        <PageFormSlot
          forms={contactForms}
          page="event"
          position="top"
          adBanners={adBanners}
          onSubmitted={onFormSubmitted}
          onNotify={onNotify}
        />

        {/* ALL EVENTS & EXPOS DIRECTORY */}
        <section id="events-directory" className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <div className="text-xs font-mono font-semibold text-[#006AA7]">
                  Komplett mäss- & konferenskalender
                </div>
                <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-[#040B16] mt-0.5">
                  Svenska & nordiska e-handelsevent
                </h2>
              </div>

              <div className="inline-flex bg-slate-100 p-1 rounded-xl text-xs font-bold self-start">
                <button
                  type="button"
                  onClick={() => setRoleView('visitor')}
                  className={`px-3.5 py-2 rounded-lg transition-colors cursor-pointer ${
                    roleView === 'visitor'
                      ? 'bg-[#040B16] text-white'
                      : 'text-slate-600 hover:text-[#040B16]'
                  }`}
                >
                  Jag vill besöka
                </button>
                <button
                  type="button"
                  onClick={() => setRoleView('exhibitor')}
                  className={`px-3.5 py-2 rounded-lg transition-colors cursor-pointer ${
                    roleView === 'exhibitor'
                      ? 'bg-[#040B16] text-white'
                      : 'text-slate-600 hover:text-[#040B16]'
                  }`}
                >
                  Jag vill ställa ut
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-100">
              <div className="flex flex-wrap gap-1.5">
                {(['all', 'Stockholm', 'Göteborg', 'Oslo'] as const).map((city) => (
                  <button
                    key={city}
                    type="button"
                    onClick={() => setCityFilter(city)}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                      cityFilter === city
                        ? 'bg-[#040B16] text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {city === 'all' ? 'Alla städer' : city}
                  </button>
                ))}
              </div>

              <select
                value={focusFilter}
                onChange={(e) => setFocusFilter(e.target.value)}
                className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold bg-white"
              >
                <option value="all">Alla fokusområden</option>
                <option value="AI">AI & Omnikanal</option>
                <option value="Plattform">Plattformar & Tech</option>
                <option value="Betal">Betalningssystem</option>
                <option value="Logistik">Logistikpartners</option>
                <option value="Nätverk">Ledarskap & Nätverk</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredEvents.map((ev) => (
              <article
                key={ev.id}
                className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col justify-between space-y-4 hover:border-slate-300 transition-colors"
              >
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
                    <span className="font-bold text-[#006AA7] tabular-nums">{ev.dateLabel}</span>
                    <span className="text-slate-500 inline-flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-[#059669]" />
                      {ev.city}
                    </span>
                  </div>

                  <div>
                    <h3 className="font-display text-2xl font-extrabold text-[#040B16]">
                      {ev.name}
                    </h3>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {ev.venue} · Arrangör: {ev.organizer}
                    </div>
                  </div>

                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">{ev.desc}</p>

                  <div className="text-xs text-slate-700 pt-2 border-t border-slate-100 space-y-1">
                    <div>
                      <span className="font-semibold">Fokus:</span> {ev.focusAreas.join(' · ')}
                    </div>
                    <div>
                      <span className="font-semibold">
                        {roleView === 'visitor' ? 'Biljett / Entré:' : 'Utställarmöjlighet:'}
                      </span>{' '}
                      {roleView === 'visitor'
                        ? ev.ticketInfo
                        : `Monterplats & sponsring mot ${ev.audienceType}`}
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      onOpenModal(
                        roleView === 'visitor'
                          ? `Bevaka / Boka biljett till ${ev.name}`
                          : `Utställarförfrågan: ${ev.name}`,
                        roleView === 'visitor'
                          ? `${ev.dateLabel} · ${ev.venue}. ${ev.ticketInfo}. Ange din e-post för biljettlänk och påminnelse.`
                          : `Fyll i din e-post så skickar vi utställarunderlag och monterkarta för ${ev.name} (${ev.venue}).`
                      )
                    }
                    className="px-4 py-2 rounded-xl bg-[#040B16] hover:bg-[#006AA7] text-white text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Ticket className="w-3.5 h-3.5 text-[#FECC02]" />
                    {roleView === 'visitor' ? 'Biljett & info' : 'Förfrågan om monter'}
                  </button>

                  {ev.website && (
                    <a
                      href={`https://${ev.website.replace(/^https?:\/\//, '')}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-semibold text-[#006AA7] hover:underline inline-flex items-center gap-1"
                    >
                      {ev.website}
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>

        <PageFormSlot
          forms={contactForms}
          page="event"
          position="mid"
          adBanners={adBanners}
          onSubmitted={onFormSubmitted}
          onNotify={onNotify}
        />

        {/* D-CONGRESS 2027 SCENPROGRAM & AGENDA BUILDER */}
        <section id="dc-program" className="space-y-6 pt-4 border-t border-slate-200">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8 bg-white border border-slate-200 rounded-2xl p-6 space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-mono font-semibold text-[#006AA7]">
                    D-Congress 2027 · Interaktivt scenprogram
                  </div>
                  <h2 className="font-display text-2xl font-extrabold text-[#040B16] mt-0.5">
                    Program & spår – 10–11 mars 2027 i Göteborg
                  </h2>
                </div>

                <div className="inline-flex bg-slate-100 p-1 rounded-lg text-xs font-semibold flex-wrap gap-1">
                  {['all', 'AI & Data', 'Cross-Border & Logistik', 'Checkout & Tillväxt'].map(
                    (track) => (
                      <button
                        key={track}
                        type="button"
                        onClick={() => setActiveTrack(track)}
                        className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                          activeTrack === track
                            ? 'bg-[#040B16] text-white'
                            : 'text-slate-600 hover:text-[#040B16]'
                        }`}
                      >
                        {track === 'all' ? 'Alla spår' : track}
                      </button>
                    )
                  )}
                </div>
              </div>

              <div className="space-y-3">
                {filteredSessions.map((s) => {
                  const isSaved = savedSessionIds.includes(s.id);
                  return (
                    <div
                      key={s.id}
                      className="p-4 rounded-xl border border-slate-200 hover:border-[#006AA7]/50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="text-xs font-mono text-slate-500">
                          <span className="font-bold text-[#040B16]">{s.time}</span> · {s.stage} ·{' '}
                          <span className="text-[#059669] font-semibold">{s.track}</span>
                        </div>
                        <h4 className="font-display font-bold text-sm sm:text-base text-[#040B16]">
                          {s.title}
                        </h4>
                        <p className="text-xs text-slate-500">{s.speaker}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleToggleSession(s)}
                        className={`shrink-0 px-3.5 py-2 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                          isSaved
                            ? 'bg-[#059669] text-white'
                            : 'bg-slate-100 hover:bg-[#040B16] hover:text-white text-[#040B16]'
                        }`}
                      >
                        {isSaved ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                        {isSaved ? 'Tillagd' : 'Lägg till'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="lg:col-span-4 bg-[#040B16] text-white border border-slate-800 rounded-2xl p-6 flex flex-col justify-between space-y-5">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-semibold text-[#FECC02]">Mitt schema</span>
                  <span className="text-xs font-mono text-slate-300 tabular-nums">
                    {savedSessions.length} valda
                  </span>
                </div>
                <h3 className="font-display text-xl font-bold">Din personliga agenda</h3>
                <p className="text-xs text-slate-400">
                  Välj programpunkter i listan för att bygga ditt schema inför Göteborg.
                  {!user && (
                    <>
                      {' '}
                      <button
                        type="button"
                        onClick={requestSignIn}
                        className="text-[#FECC02] hover:underline font-semibold cursor-pointer"
                      >
                        Logga in / registrera dig
                      </button>{' '}
                      för att spara mellan enheter.
                    </>
                  )}
                </p>

                <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                  {savedSessions.length === 0 ? (
                    <div className="text-xs text-slate-400 bg-white/5 rounded-xl p-4 border border-white/10">
                      Inga programpunkter tillagda ännu.
                    </div>
                  ) : (
                    savedSessions.map((s) => (
                      <div
                        key={s.id}
                        className="p-3 rounded-xl bg-white/10 border border-white/10 flex items-start justify-between gap-2"
                      >
                        <div>
                          <div className="font-mono text-[11px] text-[#FECC02]">
                            {s.time} · {s.stage}
                          </div>
                          <div className="text-xs font-bold text-white mt-0.5">{s.title}</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleToggleSession(s)}
                          className="text-slate-400 hover:text-white p-1"
                          aria-label="Ta bort"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (savedSessions.length === 0) {
                    onNotify('Välj minst en programpunkt i schemat först.');
                    return;
                  }
                  onOpenModal(
                    'Exportera D-Congress 2027-schema',
                    `Du har valt ${savedSessions.length} programpunkter. Ange din e-post för att få kalenderinbjudningar (.ics).`
                  );
                }}
                className="w-full py-3 rounded-xl bg-[#FECC02] hover:bg-[#EAB308] text-[#040B16] font-bold text-xs inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <CalendarCheck className="w-4 h-4" />
                Skicka schema till min e-post
              </button>
            </div>
          </div>
        </section>

        <PageFormSlot
          forms={contactForms}
          page="event"
          position="bottom"
          adBanners={adBanners}
          onSubmitted={onFormSubmitted}
          onNotify={onNotify}
        />
      </div>
    </div>
  );
}
