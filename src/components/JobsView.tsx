import { useMemo, useState } from 'react';
import { Briefcase, ExternalLink, MapPin, Plus, Search, Sparkles, Users } from 'lucide-react';
import type {
  AdBanner,
  ContactFormConfig,
  EcommerceJob,
  JobRoleCategory,
  PageCopyBlock,
  PortalTab,
  RecruitmentSite,
} from '../types';
import { AdBannerSlot } from './AdBannerSlot';
import { PageFormSlot } from './DynamicFormWidget';

interface JobsViewProps {
  jobs: EcommerceJob[];
  recruitmentSites: RecruitmentSite[];
  adBanners: AdBanner[];
  contactForms?: ContactFormConfig[];
  pageCopy?: PageCopyBlock;
  onNavigate: (tab: PortalTab, searchQuery?: string) => void;
  onBookAdSlot: (slotName: string) => void;
  onOpenDiscoverJobs: () => void;
  onOpenDiscoverRecruiters: () => void;
  onOpenJobModal: () => void;
  onApplyJob: (job: EcommerceJob) => void;
  onFormSubmitted?: () => Promise<void> | void;
  onNotify?: (msg: string) => void;
}

const ROLE_CATEGORIES: Array<'all' | JobRoleCategory> = [
  'all',
  'E-commerce Management',
  'Tech & Utveckling',
  'Growth & MarTech',
  'Logistik & Supply Chain',
  'Merchandising & CX',
];

export function JobsView({
  jobs,
  recruitmentSites,
  adBanners,
  contactForms = [],
  pageCopy,
  onNavigate,
  onBookAdSlot,
  onOpenDiscoverJobs,
  onOpenDiscoverRecruiters,
  onOpenJobModal,
  onApplyJob,
  onFormSubmitted,
  onNotify,
}: JobsViewProps) {
  const [subTab, setSubTab] = useState<'jobs' | 'recruiters'>('jobs');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [workModelFilter, setWorkModelFilter] = useState<string>('all');
  const [recruiterTypeFilter, setRecruiterTypeFilter] = useState<string>('all');

  const todayIso = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const publishedJobs = useMemo(
    () =>
      jobs.filter((j) => {
        if (j.status !== 'published') return false;
        if (j.jobStatus === 'expired' || j.jobStatus === 'closed') return false;
        if (j.expiresAt && /^\d{4}-\d{2}-\d{2}$/.test(j.expiresAt) && j.expiresAt < todayIso) {
          return false;
        }
        return /^https?:\/\/.+\..+/i.test(j.applyUrl || '');
      }),
    [jobs, todayIso]
  );

  const closedOrExpiredCount = useMemo(
    () => Math.max(0, jobs.length - publishedJobs.length),
    [jobs.length, publishedJobs.length]
  );

  const publishedRecruiters = useMemo(
    () => recruitmentSites.filter((r) => r.status === 'published'),
    [recruitmentSites]
  );

  const filteredJobs = useMemo(() => {
    const q = search.trim().toLowerCase();
    return publishedJobs.filter((j) => {
      const matchQ =
        !q ||
        j.title.toLowerCase().includes(q) ||
        j.company.toLowerCase().includes(q) ||
        j.city.toLowerCase().includes(q) ||
        j.skills.some((s) => s.toLowerCase().includes(q)) ||
        j.desc.toLowerCase().includes(q);
      const matchRole = roleFilter === 'all' || j.roleCategory === roleFilter;
      const matchModel = workModelFilter === 'all' || j.workModel === workModelFilter;
      return matchQ && matchRole && matchModel;
    });
  }, [publishedJobs, search, roleFilter, workModelFilter]);

  const filteredRecruiters = useMemo(() => {
    const q = search.trim().toLowerCase();
    return publishedRecruiters.filter((r) => {
      const matchQ =
        !q ||
        r.name.toLowerCase().includes(q) ||
        r.domain.toLowerCase().includes(q) ||
        r.coverage.toLowerCase().includes(q) ||
        r.desc.toLowerCase().includes(q) ||
        r.rolesCovered.some((role) => role.toLowerCase().includes(q));
      const matchRole = roleFilter === 'all' || r.rolesCovered.includes(roleFilter);
      const matchType = recruiterTypeFilter === 'all' || r.type === recruiterTypeFilter;
      return matchQ && matchRole && matchType;
    });
  }, [publishedRecruiters, search, roleFilter, recruiterTypeFilter]);

  return (
    <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
      {/* Header Banner */}
      <div className="bg-[#040B16] text-white border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <div className="font-mono text-xs text-[#10B981] font-semibold">
              {pageCopy?.kicker || 'Karriär & rekrytering'} · {publishedJobs.length} aktuella jobb · {publishedRecruiters.length} rekryteringssidor
              {closedOrExpiredCount > 0 && ` · ${closedOrExpiredCount} utgångna/stängda bortfiltrerade`}
            </div>
            <h1 className="font-display text-3xl sm:text-4xl font-extrabold mt-1">
              {pageCopy?.title || 'Jobb inom Sveriges E-handel & Rekryteringssidor'}
            </h1>
            <p className="text-slate-300 text-sm mt-2 max-w-2xl leading-relaxed">
              {pageCopy?.subtitle ||
                'Endast granskade, aktiva roller med giltigt ansökningsdatum och verifierad karriärlänk – samt specialiserade rekryteringsbyråer och jobbportaler för din roll.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={subTab === 'jobs' ? onOpenDiscoverJobs : onOpenDiscoverRecruiters}
              className="px-4 py-2.5 rounded-xl bg-[#FECC02] hover:bg-[#EAB308] text-[#040B16] font-bold text-xs inline-flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap"
            >
              <Sparkles className="w-4 h-4" />
              {subTab === 'jobs'
                ? 'Sök & lägg till jobb'
                : 'Sök & lägg till rekryteringssidor'}
            </button>
            <button
              type="button"
              onClick={onOpenJobModal}
              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-white font-semibold text-xs inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              Publicera jobb
            </button>
          </div>
        </div>

        {/* Sub-tab Switcher & Filters */}
        <div className="pt-6 border-t border-white/10 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex bg-white/10 p-1 rounded-xl text-xs font-bold">
              <button
                type="button"
                onClick={() => setSubTab('jobs')}
                className={`px-4 py-2 rounded-lg inline-flex items-center gap-2 transition-colors cursor-pointer ${
                  subTab === 'jobs' ? 'bg-[#FECC02] text-[#040B16]' : 'text-slate-200 hover:text-white'
                }`}
              >
                <Briefcase className="w-3.5 h-3.5" />
                Lediga jobb ({publishedJobs.length})
              </button>
              <button
                type="button"
                onClick={() => setSubTab('recruiters')}
                className={`px-4 py-2 rounded-lg inline-flex items-center gap-2 transition-colors cursor-pointer ${
                  subTab === 'recruiters'
                    ? 'bg-[#FECC02] text-[#040B16]'
                    : 'text-slate-200 hover:text-white'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                Rekryteringssidor per roll ({publishedRecruiters.length})
              </button>
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={
                  subTab === 'jobs'
                    ? 'Sök roll, företag, stad eller teknik...'
                    : 'Sök byrå, jobbportal eller kompetens...'
                }
                className="w-full bg-white/10 border border-white/15 rounded-xl pl-10 pr-4 py-2 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-[#FECC02]"
              />
            </div>
          </div>

          {/* Role Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-1.5">
              {ROLE_CATEGORIES.map((role) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => setRoleFilter(role)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                    roleFilter === role
                      ? 'bg-white text-[#040B16]'
                      : 'bg-white/10 hover:bg-white/20 text-slate-200'
                  }`}
                >
                  {role === 'all' ? 'Alla roller' : role}
                </button>
              ))}
            </div>

            {subTab === 'jobs' ? (
              <select
                value={workModelFilter}
                onChange={(e) => setWorkModelFilter(e.target.value)}
                className="bg-[#0A1628] border border-white/15 rounded-xl px-3 py-1.5 text-xs text-white"
              >
                <option value="all">Alla arbetsmodeller</option>
                <option value="Hybrid">Hybrid</option>
                <option value="På plats">På plats</option>
                <option value="Remote">Remote</option>
              </select>
            ) : (
              <select
                value={recruiterTypeFilter}
                onChange={(e) => setRecruiterTypeFilter(e.target.value)}
                className="bg-[#0A1628] border border-white/15 rounded-xl px-3 py-1.5 text-xs text-white"
              >
                <option value="all">Alla aktörstyper</option>
                <option value="Jobbportal">Jobbportal</option>
                <option value="Rekryteringsbyrå">Rekryteringsbyrå</option>
                <option value="Headhunting & Interim">Headhunting & Interim</option>
              </select>
            )}
          </div>
        </div>
      </div>

      <AdBannerSlot
        banners={adBanners}
        placement="jobb-top"
        onNavigate={onNavigate}
        onBookSlot={onBookAdSlot}
      />

      <PageFormSlot
        forms={contactForms}
        page="jobb"
        position="top"
        adBanners={adBanners}
        onSubmitted={onFormSubmitted}
        onNotify={onNotify}
      />

      <PageFormSlot
        forms={contactForms}
        page="jobb"
        position="mid"
        adBanners={adBanners}
        onSubmitted={onFormSubmitted}
        onNotify={onNotify}
      />

      {/* JOBS TAB */}
      {subTab === 'jobs' && (
        <>
          {filteredJobs.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center space-y-4">
              <p className="text-slate-600 text-sm">
                Inga jobb matchade din filtrering. Sök webben efter fler roller inom svensk e-handel!
              </p>
              <button
                type="button"
                onClick={onOpenDiscoverJobs}
                className="px-5 py-2.5 rounded-xl bg-[#040B16] hover:bg-[#006AA7] text-white text-xs font-bold inline-flex items-center gap-2 cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-[#FECC02]" />
                Sök & lägg till jobb via AI
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {filteredJobs.map((job) => (
                <article
                  key={job.id}
                  className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col justify-between space-y-4 hover:border-slate-300 transition-colors"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between gap-2 text-xs font-mono">
                      <span className="font-semibold text-[#006AA7]">{job.roleCategory}</span>
                      <span className="text-slate-500 tabular-nums">
                        {job.postedAt}
                        {job.expiresAt ? ` · t.o.m. ${job.expiresAt}` : ''}
                      </span>
                    </div>

                    <div>
                      <h3 className="font-display text-xl font-extrabold text-[#040B16]">
                        {job.title}
                      </h3>
                      <div className="text-xs text-slate-600 mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                        <strong className="text-[#040B16]">{job.company}</strong>
                        <span>·</span>
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-[#059669]" />
                          {job.city}
                        </span>
                        <span>·</span>
                        <span>{job.workModel}</span>
                        <span>·</span>
                        <span>{job.seniority}</span>
                      </div>
                    </div>

                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">{job.desc}</p>

                    <div className="text-xs text-slate-600 pt-1">
                      <span className="font-semibold text-slate-800">Kompetenser:</span>{' '}
                      {job.skills.join(' · ')}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
                    <span className="font-mono text-xs font-semibold text-[#059669] tabular-nums">
                      {job.salaryRange || 'Marknadsmässig lön'}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onApplyJob(job)}
                        className="px-4 py-2 rounded-xl bg-[#040B16] hover:bg-[#006AA7] text-white text-xs font-bold transition-colors cursor-pointer"
                      >
                        Intresseanmälan
                      </button>
                      <a
                        href={job.applyUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 hover:text-[#006AA7] transition-colors"
                        title={`Karriärsida hos ${job.company}`}
                        aria-label={`Öppna karriärsida hos ${job.company}`}
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

      {/* RECRUITMENT SITES TAB */}
      {subTab === 'recruiters' && (
        <>
          {filteredRecruiters.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center space-y-4">
              <p className="text-slate-600 text-sm">
                Inga rekryteringssidor matchade din filtrering.
              </p>
              <button
                type="button"
                onClick={onOpenDiscoverRecruiters}
                className="px-5 py-2.5 rounded-xl bg-[#040B16] hover:bg-[#006AA7] text-white text-xs font-bold inline-flex items-center gap-2 cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-[#FECC02]" />
                Sök & lägg till rekryteringssidor via AI
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredRecruiters.map((rec) => (
                <article
                  key={rec.id}
                  className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col justify-between space-y-4 hover:border-slate-300 transition-colors"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2 text-xs font-mono">
                      <span className="font-semibold text-[#006AA7]">{rec.type}</span>
                      <span className="text-slate-500">{rec.coverage}</span>
                    </div>

                    <div>
                      <h3 className="font-display text-xl font-extrabold text-[#040B16]">
                        {rec.name}
                      </h3>
                      <div className="text-xs text-slate-500 mt-0.5">{rec.domain}</div>
                    </div>

                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">{rec.desc}</p>

                    <div className="pt-2 border-t border-slate-100 text-xs text-slate-700">
                      <span className="font-semibold">Roller som täcks:</span>{' '}
                      {rec.rolesCovered.join(' · ')}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                    <a
                      href={`https://${rec.domain.replace(/^https?:\/\//, '')}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-bold text-[#040B16] hover:text-[#006AA7] inline-flex items-center gap-1.5"
                    >
                      Besök rekryteringssida
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </article>
              ))}
            </div>
          )}
        </>
      )}

      <PageFormSlot
        forms={contactForms}
        page="jobb"
        position="bottom"
        adBanners={adBanners}
        onSubmitted={onFormSubmitted}
        onNotify={onNotify}
      />
    </div>
  );
}
