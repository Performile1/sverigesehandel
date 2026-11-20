import { useMemo, useState } from 'react';
import {
  CheckCircle2,
  Copy,
  Forward,
  Mail,
  Send,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import { api } from '../api';
import type {
  ContactMessage,
  ContactMessageStatus,
  LogisticsProvider,
  TechPartner,
} from '../types';

interface CMSInboxPanelProps {
  messages: ContactMessage[];
  partners: TechPartner[];
  logisticsProviders: LogisticsProvider[];
  editorialEmail?: string;
  onRefresh: () => Promise<void>;
  onNotify: (msg: string) => void;
}

type InboxFilter = 'all' | 'intro' | 'handled-self' | 'contact';

const STATUS_CONFIG: Record<ContactMessageStatus, { label: string; cls: string }> = {
  new: { label: 'Ny', cls: 'bg-sky-50 text-sky-800 border-sky-200' },
  'handled-self': {
    label: 'Hanteras själv',
    cls: 'bg-amber-50 text-amber-800 border-amber-200',
  },
  forwarded: {
    label: 'Vidarebefordrad',
    cls: 'bg-indigo-50 text-indigo-800 border-indigo-200',
  },
  resolved: {
    label: 'Klar',
    cls: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  },
};

function buildSummaryLines(msg: ContactMessage): string {
  const lines = [
    `Ämne: ${msg.topic}`,
    msg.formName ? `Formulär: ${msg.formName}` : '',
    msg.targetEntityName ? `Målaktör: ${msg.targetEntityName}` : '',
    `Avsändare: ${msg.name} (${msg.email})`,
    msg.company ? `Företag: ${msg.company}` : '',
    msg.phone ? `Telefon: ${msg.phone}` : '',
    msg.needSummary ? `Behov: ${msg.needSummary}` : '',
    msg.monthlyVolume ? `Paketvolym: ${msg.monthlyVolume}` : '',
    msg.currentPlatform ? `Nuvarande stack: ${msg.currentPlatform}` : '',
    msg.timeline ? `Tidsplan: ${msg.timeline}` : '',
    msg.customAnswers
      ? Object.entries(msg.customAnswers)
          .map(([k, v]) => `${k}: ${v}`)
          .join('\n')
      : '',
    '',
    'Meddelande:',
    msg.message,
  ];
  return lines.filter((line) => line !== '').join('\n');
}

export function CMSInboxPanel({
  messages = [],
  partners = [],
  logisticsProviders = [],
  editorialEmail = 'hej@sverigesehandel.se',
  onRefresh,
  onNotify,
}: CMSInboxPanelProps) {
  const [filter, setFilter] = useState<InboxFilter>('all');

  const counts = useMemo(() => {
    const intro = messages.filter(
      (m) => m.submissionType === 'intro' || m.submissionType === 'job-apply'
    ).length;
    const self = messages.filter(
      (m) => m.status === 'handled-self' || m.routingMode === 'self'
    ).length;
    const contact = messages.filter(
      (m) => !m.submissionType || m.submissionType === 'contact' || m.submissionType === 'ad-booking'
    ).length;
    return { all: messages.length, intro, self, contact };
  }, [messages]);

  const filtered = useMemo(() => {
    if (filter === 'intro') {
      return messages.filter(
        (m) => m.submissionType === 'intro' || m.submissionType === 'job-apply'
      );
    }
    if (filter === 'handled-self') {
      return messages.filter(
        (m) => m.status === 'handled-self' || m.routingMode === 'self'
      );
    }
    if (filter === 'contact') {
      return messages.filter(
        (m) =>
          !m.submissionType ||
          m.submissionType === 'contact' ||
          m.submissionType === 'ad-booking' ||
          m.submissionType === 'other'
      );
    }
    return messages;
  }, [messages, filter]);

  function findTargetEmail(msg: ContactMessage): string {
    if (msg.targetEntityType === 'partner' && msg.targetEntityId) {
      const p = partners.find((item) => item.id === msg.targetEntityId);
      if (p?.introEmail) return p.introEmail;
    }
    if (msg.targetEntityType === 'logistics' && msg.targetEntityId) {
      const l = logisticsProviders.find((item) => item.id === msg.targetEntityId);
      if (l?.introEmail) return l.introEmail;
    }
    if (msg.routedToEmail && msg.routedToEmail !== editorialEmail) {
      return msg.routedToEmail;
    }
    return '';
  }

  async function handleStatusChange(id: string, status: ContactMessageStatus) {
    await api.updateContactMessageStatus(id, status);
    await onRefresh();
    onNotify(`Status uppdaterad till "${STATUS_CONFIG[status].label}".`);
  }

  async function handleCopy(msg: ContactMessage) {
    try {
      await navigator.clipboard.writeText(buildSummaryLines(msg));
      onNotify('Underlag kopierat till urklipp.');
    } catch {
      onNotify('Kunde inte kopiera automatiskt.');
    }
  }

  async function handleForwardMailto(msg: ContactMessage) {
    const recipient = findTargetEmail(msg);
    const subject = encodeURIComponent(
      `[sverigesehandel.se Intro] ${msg.targetEntityName || msg.topic} – ${msg.company || msg.name}`
    );
    const body = encodeURIComponent(
      `Hej!\n\nHär kommer en verifierad intro-förfrågan via sverigesehandel.se:\n\n${buildSummaryLines(
        msg
      )}\n\nVänliga hälsningar,\nsverigesehandel.se`
    );
    window.location.href = `mailto:${recipient}?subject=${subject}&body=${body}`;
    if (msg.status !== 'forwarded') {
      await api.updateContactMessageStatus(msg.id, 'forwarded');
      await onRefresh();
    }
  }

  return (
    <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-bold text-[#040B16] inline-flex items-center gap-2">
            <Mail className="w-4 h-4 text-[#059669]" />
            Kontakt- &amp; Introinkorg ({messages.length})
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Inkomna intro-förfrågningar, annonsbokningar och kontaktärenden. Hantera själva eller skicka vidare med 1 klick.
          </p>
        </div>

        <div className="flex flex-wrap gap-1.5 text-xs">
          {(
            [
              ['all', `Alla (${counts.all})`],
              ['intro', `Intro (${counts.intro})`],
              ['handled-self', `Hanteras själv (${counts.self})`],
              ['contact', `Kontakt & Annons (${counts.contact})`],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={`px-3 py-1.5 rounded-lg font-semibold cursor-pointer transition-colors ${
                filter === key
                  ? 'bg-[#040B16] text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-xs text-slate-500 p-4 rounded-xl bg-[#F4F6F9] border border-slate-200">
          Inga meddelanden i denna vy ännu.
        </div>
      ) : (
        <div className="divide-y divide-slate-200 max-h-[540px] overflow-y-auto pr-1">
          {filtered.map((msg) => {
            const status = msg.status || 'new';
            const badge = STATUS_CONFIG[status] || STATUS_CONFIG.new;
            const partnerTargetEmail = findTargetEmail(msg);

            return (
              <div key={msg.id} className="py-4 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="space-y-1 text-xs min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded-md border text-[11px] font-mono font-bold ${badge.cls}`}
                      >
                        {badge.label}
                      </span>
                      <span className="font-mono text-[#006AA7] font-semibold">
                        {msg.topic}
                        {msg.adSlot ? ` · ${msg.adSlot}` : ''}
                      </span>
                      <span className="text-slate-400 font-mono tabular-nums">
                        {new Date(msg.createdAt).toLocaleString('sv-SE')}
                      </span>
                    </div>

                    <div className="font-bold text-[#040B16] text-sm">
                      {msg.name} ({msg.email})
                      {msg.company ? ` · ${msg.company}` : ''}
                      {msg.phone ? ` · ${msg.phone}` : ''}
                    </div>

                    {(msg.routedToEmail || msg.routingMode) && (
                      <div className="text-[11px] text-slate-600 flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span className="inline-flex items-center gap-1">
                          <Send className="w-3 h-3 text-[#006AA7]" />
                          Routing:{' '}
                          <strong>
                            {msg.routingMode === 'direct-partner'
                              ? 'Direkt till partner'
                              : msg.routingMode === 'custom-email'
                              ? 'Anpassad e-post'
                              : 'Hanteras själv först'}
                          </strong>
                          {msg.routedToEmail ? ` → ${msg.routedToEmail}` : ''}
                        </span>
                        {msg.emailDispatched && (
                          <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                            <CheckCircle2 className="w-3 h-3" />
                            Auto-mejl skickat
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                    <select
                      value={status}
                      onChange={(e) =>
                        void handleStatusChange(msg.id, e.target.value as ContactMessageStatus)
                      }
                      className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-[11px] font-semibold"
                      aria-label="Ändra status"
                    >
                      <option value="new">Ny</option>
                      <option value="handled-self">Hanteras själv</option>
                      <option value="forwarded">Vidarebefordrad</option>
                      <option value="resolved">Klar</option>
                    </select>

                    <button
                      type="button"
                      onClick={() => void handleForwardMailto(msg)}
                      className="px-2.5 py-1.5 rounded-lg bg-[#040B16] hover:bg-[#006AA7] text-white text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
                      title={
                        partnerTargetEmail
                          ? `Vidarebefordra till ${partnerTargetEmail}`
                          : 'Vidarebefordra via e-post'
                      }
                    >
                      <Forward className="w-3 h-3 text-[#FECC02]" />
                      {partnerTargetEmail ? 'Vidarebefordra' : 'Mejla'}
                    </button>

                    <button
                      type="button"
                      onClick={() => void handleCopy(msg)}
                      className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer"
                      title="Kopiera underlag"
                      aria-label="Kopiera underlag"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={async () => {
                        await api.deleteContactMessage(msg.id);
                        await onRefresh();
                        onNotify('Meddelande borttaget.');
                      }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 cursor-pointer"
                      aria-label="Ta bort meddelande"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Structured Intro Need Details */}
                {(msg.needSummary ||
                  msg.monthlyVolume ||
                  msg.currentPlatform ||
                  msg.timeline ||
                  msg.targetEntityName ||
                  (msg.customAnswers && Object.keys(msg.customAnswers).length > 0)) && (
                  <div className="p-3 rounded-xl bg-[#F4F6F9] border border-slate-200 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-[11px]">
                    {msg.targetEntityName && (
                      <div>
                        <span className="text-slate-500 block">Målaktör</span>
                        <strong className="text-[#040B16]">{msg.targetEntityName}</strong>
                      </div>
                    )}
                    {msg.needSummary && (
                      <div>
                        <span className="text-slate-500 block">Behov</span>
                        <strong className="text-[#040B16]">{msg.needSummary}</strong>
                      </div>
                    )}
                    {msg.monthlyVolume && (
                      <div>
                        <span className="text-slate-500 block">Paketvolym</span>
                        <strong className="text-[#040B16] tabular-nums">{msg.monthlyVolume}</strong>
                      </div>
                    )}
                    {msg.currentPlatform && (
                      <div>
                        <span className="text-slate-500 block">Nuvarande stack</span>
                        <strong className="text-[#040B16]">{msg.currentPlatform}</strong>
                      </div>
                    )}
                    {msg.timeline && (
                      <div>
                        <span className="text-slate-500 block">Tidsplan</span>
                        <strong className="text-[#040B16]">{msg.timeline}</strong>
                      </div>
                    )}
                    {msg.customAnswers &&
                      Object.entries(msg.customAnswers).map(([k, v]) => (
                        <div key={k}>
                          <span className="text-slate-500 block">{k}</span>
                          <strong className="text-[#040B16]">{v}</strong>
                        </div>
                      ))}
                  </div>
                )}

                <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line">
                  {msg.message}
                </p>

                {msg.status === 'handled-self' && partnerTargetEmail && (
                  <div className="text-[11px] text-amber-800 inline-flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    Redaktionen hanterar först – partnerns direkta intro-mejl finns sparat ({partnerTargetEmail}) om ni vill skicka vidare sedan.
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
