import { neutralPlaceholder } from '../../shared/portalContent';
import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, CheckCircle2, Loader2, LogIn, ShieldCheck, X } from 'lucide-react';
import { api } from '../api';
import { useFirebase } from '../contexts/FirebaseContext';
import type { ContactFormConfig, ContactFormField, FormRoutingMode } from '../types';

export interface IntroModalTarget {
  title: string;
  subtitle?: string;
  submissionType: 'intro' | 'job-apply' | 'other';
  entityType?: 'partner' | 'logistics' | 'job' | 'event';
  entityId?: string;
  entityName?: string;
  entityRoutingMode?: 'default' | 'self' | 'direct';
  hasDirectIntroEmail?: boolean;
  defaultTopic?: string;
}

interface IntroRequestModalProps {
  open: boolean;
  target: IntroModalTarget | null;
  introForm?: ContactFormConfig;
  editorialEmail?: string;
  onClose: () => void;
  onSubmitted: () => Promise<void> | void;
  onNotify: (msg: string) => void;
}

const FALLBACK_FIELDS: ContactFormField[] = [
  {
    id: 'fb-name',
    key: 'name',
    label: 'Ditt namn',
    type: 'text',
    placeholder: 'För- och efternamn',
    required: true,
    enabled: true,
    width: 'half',
  },
  {
    id: 'fb-email',
    key: 'email',
    label: 'Arbetsmejl',
    type: 'email',
    placeholder: 'namn@butik.se',
    required: true,
    enabled: true,
    width: 'half',
  },
  {
    id: 'fb-company',
    key: 'company',
    label: 'Företag / Butik',
    type: 'text',
    placeholder: 'T.ex. Nordic E-handel AB',
    required: true,
    enabled: true,
    width: 'half',
  },
  {
    id: 'fb-phone',
    key: 'phone',
    label: 'Telefon (valfritt)',
    type: 'tel',
    placeholder: '070-123 45 67',
    required: false,
    enabled: true,
    width: 'half',
  },
  {
    id: 'fb-need',
    key: 'needSummary',
    label: 'Vad vill ni ha hjälp med?',
    type: 'select',
    required: true,
    enabled: true,
    width: 'full',
    options: [
      'Byta eller upphandla 3PL / fulfillment',
      'Ny transportör, paketskåp eller fraktavtal',
      'Ny betallösning (PSP) & checkout-optimering',
      'Ny e-handelsplattform / tech-stack',
      'Oberoende rådgivning & leverantörsjämförelse',
    ],
  },
  {
    id: 'fb-vol',
    key: 'monthlyVolume',
    label: 'Ungefärlig paketvolym per månad',
    type: 'select',
    required: true,
    enabled: true,
    width: 'half',
    options: [
      'Under 500 paket/mån',
      '500 – 2 500 paket/mån',
      '2 500 – 10 000 paket/mån',
      'Över 10 000 paket/mån',
    ],
  },
  {
    id: 'fb-platform',
    key: 'currentPlatform',
    label: 'Nuvarande plattform / kassa / WMS',
    type: 'text',
    placeholder: 't.ex. Shopify, Klarna, Ingrid, Ongoing WMS',
    required: false,
    enabled: true,
    width: 'half',
  },
  {
    id: 'fb-msg',
    key: 'message',
    label: 'Beskriv ert behov och mål',
    type: 'textarea',
    placeholder: 'Berätta kort vad ni vill uppnå, tidsplan eller särskilda krav...',
    required: true,
    enabled: true,
    width: 'full',
  },
];

const KNOWN_KEYS = new Set([
  'name',
  'email',
  'company',
  'phone',
  'topic',
  'adSlot',
  'needSummary',
  'monthlyVolume',
  'currentPlatform',
  'timeline',
  'message',
]);

export function IntroRequestModal({
  open,
  target,
  introForm,
  editorialEmail = 'hej@sverigesehandel.se',
  onClose,
  onSubmitted,
  onNotify,
}: IntroRequestModalProps) {
  const { user, signInWithGoogle } = useFirebase();

  const activeFields = useMemo(() => {
    const list =
      introForm && introForm.fields.length > 0
        ? introForm.fields.filter((f) => f.enabled)
        : FALLBACK_FIELDS;
    return list;
  }, [introForm]);

  const [values, setValues] = useState<Record<string, string>>({});
  const [preferredRouting, setPreferredRouting] = useState<FormRoutingMode>('self');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [completedMsg, setCompletedMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !target) return;
    const init: Record<string, string> = {};
    for (const f of activeFields) {
      if (f.type === 'select' && f.options && f.options.length > 0) {
        init[f.key] = f.options[0];
      } else if (f.key === 'name') {
        init[f.key] = user?.displayName || '';
      } else if (f.key === 'email') {
        init[f.key] = user?.email || '';
      } else {
        init[f.key] = '';
      }
    }
    setValues(init);
    setPreferredRouting(
      target.entityRoutingMode === 'direct' ||
        (target.entityRoutingMode !== 'self' &&
          introForm?.routingMode === 'direct-partner' &&
          target.hasDirectIntroEmail)
        ? 'direct-partner'
        : 'self'
    );
    setError(null);
    setCompletedMsg(null);
  }, [open, target, activeFields, introForm?.routingMode, user?.displayName, user?.email]);

  if (!open || !target) return null;

  const isForcedByEntity =
    target.entityRoutingMode === 'self' || target.entityRoutingMode === 'direct';
  const showRoutingChoice =
    Boolean(introForm?.allowRequesterChoice) &&
    !isForcedByEntity &&
    (target.entityType === 'partner' || target.entityType === 'logistics');

  const routingDescription = (() => {
    if (target.entityRoutingMode === 'direct' && target.hasDirectIntroEmail) {
      return `Skickas direkt till ansvarig kontakt hos ${target.entityName}.`;
    }
    if (target.entityRoutingMode === 'self') {
      return `Hanteras först av redaktionen (${editorialEmail}) så att vi kan kvalificera ert behov innan vidarekontakt.`;
    }
    if (introForm?.routingMode === 'custom-email') {
      return 'Dirigeras till ansvarig koordinator enligt CMS-inställningen.';
    }
    if (introForm?.routingMode === 'direct-partner' && target.hasDirectIntroEmail) {
      return `Kan skickas direkt till ${target.entityName}s dedikerade intro-adress.`;
    }
    return `Hanteras först av redaktionen (${editorialEmail}) som säkerställer rätt kontaktperson och underlag.`;
  })();

  function setField(key: string, val: string) {
    setValues((prev) => ({ ...prev, [key]: val }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (sending || !target) return;
    setError(null);

    if (!user) {
      setError('Logga in med Google först för att skicka en verifierad förfrågan.');
      return;
    }

    const name = (values.name || user.displayName || '').trim();
    const email = (values.email || user.email || '').trim();
    const needSummary = (values.needSummary || '').trim();
    const messageRaw = (values.message || '').trim();
    const customAnswers: Record<string, string> = {};
    for (const f of activeFields) {
      if (!KNOWN_KEYS.has(f.key)) {
        const val = (values[f.key] || '').trim();
        if (val) customAnswers[f.label] = val;
      }
    }

    const message =
      messageRaw ||
      [
        needSummary ? `Behov: ${needSummary}` : '',
        values.monthlyVolume ? `Volym: ${values.monthlyVolume}` : '',
        ...Object.entries(customAnswers).map(([k, v]) => `${k}: ${v}`),
      ]
        .filter(Boolean)
        .join(' · ') ||
      `Intresseanmälan för ${target.entityName || target.title}`;

    if (!name || !email || !message) {
      setError('Fyll i obligatoriska fält.');
      return;
    }

    setSending(true);
    try {
      const saved = await api.submitContactMessage({
        name,
        email,
        company: values.company?.trim() || undefined,
        phone: values.phone?.trim() || undefined,
        topic:
          target.defaultTopic ||
          (target.entityName ? `Intro: ${target.entityName}` : target.title),
        message,
        formId: introForm?.id || 'form-intro-default',
        submissionType: target.submissionType,
        targetEntityType: target.entityType,
        targetEntityId: target.entityId,
        targetEntityName: target.entityName,
        preferredRouting: showRoutingChoice ? preferredRouting : undefined,
        needSummary: needSummary || undefined,
        monthlyVolume: values.monthlyVolume?.trim() || undefined,
        currentPlatform: values.currentPlatform?.trim() || undefined,
        timeline: values.timeline?.trim() || undefined,
        customAnswers: Object.keys(customAnswers).length > 0 ? customAnswers : undefined,
      });

      const msg =
        introForm?.successMessage ||
        `Tack! Din förfrågan för ${target.entityName || target.title} är registrerad.`;
      setCompletedMsg(
        `${msg}${
          saved.routingMode === 'direct-partner'
            ? ' Förfrågan har dirigerats direkt till partnerns mottagaradress.'
            : ' Redaktionen går igenom ditt behov och återkommer.'
        }`
      );
      onNotify(msg);
      await onSubmitted();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kunde inte skicka introförfrågan.');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-[#040B16]/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 sm:p-7 shadow-2xl border border-slate-200 space-y-5 my-8">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="font-mono text-xs font-bold text-[#006AA7]">
              {introForm?.kicker || 'Verifierad Introduktion'} · sverigesehandel.se
            </div>
            <h3 className="font-display text-2xl font-extrabold text-[#040B16] mt-0.5">
              {target.title}
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 mt-1 leading-relaxed">
              {target.subtitle ||
                introForm?.subtitle ||
                'Berätta kort vad ni behöver hjälp med så matchar vi rätt kontaktperson och förslag.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-800 p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer shrink-0"
            aria-label="Stäng"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-3.5 rounded-xl bg-[#F4F6F9] border border-slate-200 text-xs text-slate-700 flex items-start gap-2.5">
          <ShieldCheck className="w-4 h-4 text-[#059669] shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-[#040B16]">Hantering &amp; utskick: </span>
            {routingDescription}
          </div>
        </div>

        {!user && (
          <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 flex flex-wrap items-center justify-between gap-2 text-xs text-amber-950">
            <span>Logga in med ditt Google-konto för att verifiera och skicka förfrågan.</span>
            <button
              type="button"
              onClick={() => void signInWithGoogle()}
              className="px-3.5 py-1.5 rounded-lg bg-[#040B16] hover:bg-[#006AA7] text-white font-bold inline-flex items-center gap-1.5 cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5" />
              Logga in med Google
            </button>
          </div>
        )}

        {completedMsg ? (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950 text-xs sm:text-sm flex items-start gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-[#059669] shrink-0 mt-0.5" />
              <span>{completedMsg}</span>
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl bg-[#040B16] text-white text-xs font-bold cursor-pointer"
              >
                Stäng
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {activeFields.map((field) => {
                const spanCls =
                  field.width === 'full' || field.type === 'textarea' ? 'sm:col-span-2' : '';
                const val = values[field.key] ?? '';
                return (
                  <div key={field.id} className={spanCls}>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      {field.label}
                      {field.required ? ' *' : ''}
                    </label>
                    {field.type === 'textarea' ? (
                      <textarea
                        rows={3}
                        required={Boolean(field.required)}
                        value={val}
                        onChange={(e) => setField(field.key, e.target.value)}
                        placeholder={neutralPlaceholder(field.placeholder)}
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#006AA7]"
                      />
                    ) : field.type === 'select' ? (
                      <select
                        required={Boolean(field.required)}
                        value={val}
                        onChange={(e) => setField(field.key, e.target.value)}
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#006AA7]"
                      >
                        {(field.options || []).map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type={field.type}
                        required={Boolean(field.required)}
                        value={val}
                        onChange={(e) => setField(field.key, e.target.value)}
                        placeholder={neutralPlaceholder(field.placeholder)}
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#006AA7]"
                      />
                    )}
                  </div>
                );
              })}
            </div>

            {showRoutingChoice && (
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                <div className="font-semibold text-[#040B16]">
                  Önskat arbetssätt för denna intro
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPreferredRouting('self')}
                    className={`text-left px-3 py-2 rounded-lg border cursor-pointer transition-colors ${
                      preferredRouting === 'self'
                        ? 'bg-[#040B16] text-white border-[#040B16] font-bold'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-slate-400'
                    }`}
                  >
                    Låt sverigesehandel.se hjälpa oss först
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreferredRouting('direct-partner')}
                    className={`text-left px-3 py-2 rounded-lg border cursor-pointer transition-colors ${
                      preferredRouting === 'direct-partner'
                        ? 'bg-[#040B16] text-white border-[#040B16] font-bold'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-slate-400'
                    }`}
                  >
                    {target.hasDirectIntroEmail
                      ? `Skicka direkt till ${target.entityName}`
                      : `Koppla vidare till ${target.entityName} via oss`}
                  </button>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Avbryt
              </button>
              <button
                type="submit"
                disabled={sending}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-[#040B16] hover:bg-[#006AA7] text-white inline-flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                {sending ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <ArrowRight className="w-3.5 h-3.5" />
                )}
                {introForm?.submitLabel || 'Skicka introförfrågan'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
