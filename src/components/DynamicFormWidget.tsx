import { neutralPlaceholder } from '../../shared/portalContent';
import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Loader2, LogIn, Mail, Send } from 'lucide-react';
import { api } from '../api';
import { useFirebase } from '../contexts/FirebaseContext';
import type {
  AdBanner,
  ContactFormConfig,
  ContactFormField,
  FormPosition,
  FormRoutingMode,
  PortalTab,
} from '../types';

interface DynamicFormWidgetProps {
  form: ContactFormConfig;
  adBanners?: AdBanner[];
  initialAdSlot?: string;
  targetEntityType?: 'partner' | 'logistics' | 'job' | 'event';
  targetEntityId?: string;
  targetEntityName?: string;
  compact?: boolean;
  onSubmitted?: () => Promise<void> | void;
  onNotify?: (msg: string) => void;
}

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

export function DynamicFormWidget({
  form,
  adBanners = [],
  initialAdSlot = '',
  targetEntityType,
  targetEntityId,
  targetEntityName,
  compact = false,
  onSubmitted,
  onNotify,
}: DynamicFormWidgetProps) {
  const { user, requestSignIn } = useFirebase();
  const enabledFields = useMemo(
    () => (form.fields || []).filter((f) => f.enabled),
    [form.fields]
  );

  const [values, setValues] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const f of enabledFields) {
      if (f.type === 'select' && f.options && f.options.length > 0) {
        init[f.key] = f.options[0];
      } else {
        init[f.key] = '';
      }
    }
    if (initialAdSlot) {
      init.topic = 'Annonsbanner & Partnerskap';
      init.adSlot = initialAdSlot;
    }
    return init;
  });

  const [preferredRouting, setPreferredRouting] = useState<FormRoutingMode>(
    form.routingMode === 'direct-partner' ? 'direct-partner' : 'self'
  );
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentMessage, setSentMessage] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setValues((prev) => ({
        ...prev,
        name: prev.name || user.displayName || '',
        email: prev.email || user.email || '',
      }));
    }
  }, [user]);

  useEffect(() => {
    if (initialAdSlot) {
      setValues((prev) => ({
        ...prev,
        topic: 'Annonsbanner & Partnerskap',
        adSlot: initialAdSlot,
      }));
    }
  }, [initialAdSlot]);

  function setField(key: string, val: string) {
    setValues((prev) => ({ ...prev, [key]: val }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (sending) return;
    setError(null);
    setSentMessage(null);

    if (!user?.emailVerified) {
      setError('Logga in och verifiera din e-post innan du skickar formuläret.');
      return;
    }

    const name = (values.name || user.displayName || '').trim();
    const email = (values.email || user.email || '').trim();
    const needSummary = (values.needSummary || '').trim();
    const messageRaw = (values.message || '').trim();
    const customAnswers: Record<string, string> = {};
    for (const f of enabledFields) {
      if (!KNOWN_KEYS.has(f.key)) {
        const val = (values[f.key] || '').trim();
        if (val) customAnswers[f.label] = val;
      }
    }

    const fallbackMsgParts = [
      needSummary ? `Behov: ${needSummary}` : '',
      ...Object.entries(customAnswers).map(([k, v]) => `${k}: ${v}`),
    ].filter(Boolean);
    const message = messageRaw || fallbackMsgParts.join(' · ') || `Förfrågan via ${form.name}`;

    if (!name || !email || !message) {
      setError('Fyll i alla obligatoriska fält.');
      return;
    }

    setSending(true);
    try {
      const topic =
        (values.topic || '').trim() ||
        (needSummary ? `${form.name}: ${needSummary}` : form.name);

      await api.submitContactMessage({
        name,
        email,
        company: values.company?.trim() || undefined,
        phone: values.phone?.trim() || undefined,
        topic,
        adSlot: values.adSlot?.trim() || undefined,
        message,
        formId: form.id,
        submissionType:
          form.purpose === 'intro'
            ? 'intro'
            : form.purpose === 'ad-booking'
            ? 'ad-booking'
            : 'contact',
        targetEntityType,
        targetEntityId,
        targetEntityName,
        preferredRouting: form.allowRequesterChoice ? preferredRouting : undefined,
        needSummary: needSummary || undefined,
        monthlyVolume: values.monthlyVolume?.trim() || undefined,
        currentPlatform: values.currentPlatform?.trim() || undefined,
        timeline: values.timeline?.trim() || undefined,
        customAnswers: Object.keys(customAnswers).length > 0 ? customAnswers : undefined,
      });

      const reset: Record<string, string> = {};
      for (const f of enabledFields) {
        if (f.type === 'select' && f.options && f.options.length > 0) {
          reset[f.key] = f.options[0];
        } else if (f.key === 'name') {
          reset[f.key] = user.displayName || '';
        } else if (f.key === 'email') {
          reset[f.key] = user.email || '';
        } else {
          reset[f.key] = '';
        }
      }
      setValues(reset);
      const confirmation =
        form.successMessage || 'Tack! Din förfrågan har skickats och registrerats.';
      setSentMessage(confirmation);
      onNotify?.(confirmation);
      await onSubmitted?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kunde inte skicka formuläret.');
    } finally {
      setSending(false);
    }
  }

  const isNavy = form.theme === 'navy';
  const isGold = form.theme === 'gold';

  const containerCls = isNavy
    ? 'bg-[#040B16] text-white border border-slate-800 rounded-2xl'
    : isGold
    ? 'bg-[#FFFDF2] text-[#040B16] border border-[#EAB308]/50 rounded-2xl'
    : 'bg-white text-[#040B16] border border-slate-200 rounded-2xl';

  const labelCls = isNavy ? 'text-slate-300' : 'text-slate-700';
  const inputCls = isNavy
    ? 'w-full px-3.5 py-2.5 rounded-xl border border-white/15 bg-white/10 text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#FECC02]'
    : 'w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-[#040B16] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#006AA7]';
  const selectCls = isNavy
    ? 'w-full px-3.5 py-2.5 rounded-xl border border-white/15 bg-[#0A1628] text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#FECC02]'
    : 'w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-[#040B16] focus:outline-none focus:ring-2 focus:ring-[#006AA7]';

  const showAdSlotSelect =
    adBanners.length > 0 && values.topic === 'Annonsbanner & Partnerskap';

  return (
    <div className={`${containerCls} ${compact ? 'p-5 sm:p-6' : 'p-6 sm:p-8'} space-y-5`}>
      <div className="space-y-1.5">
        <div
          className={`text-xs font-mono font-semibold ${
            isNavy ? 'text-[#FECC02]' : 'text-[#006AA7]'
          }`}
        >
          {form.kicker}
        </div>
        <h2
          className={`font-display ${compact ? 'text-xl' : 'text-2xl'} font-extrabold leading-tight`}
        >
          {form.title}
        </h2>
        {form.subtitle && (
          <p className={`text-xs sm:text-sm leading-relaxed ${isNavy ? 'text-slate-300' : 'text-slate-600'}`}>
            {form.subtitle}
          </p>
        )}
      </div>

      {!user?.emailVerified && (
        <div
          className={`p-3.5 rounded-xl border flex flex-wrap items-center justify-between gap-3 text-xs ${
            isNavy
              ? 'bg-white/5 border-white/15 text-slate-200'
              : 'bg-slate-50 border-slate-200 text-slate-700'
          }`}
        >
          <span>Verifiera din e-post för att skicka formuläret direkt till ansvarig.</span>
          <button
            type="button"
            onClick={() => void requestSignIn()}
            className={`px-3.5 py-1.5 rounded-lg font-bold inline-flex items-center gap-1.5 cursor-pointer shrink-0 ${
              isNavy
                ? 'bg-[#FECC02] hover:bg-[#EAB308] text-[#040B16]'
                : 'bg-[#040B16] hover:bg-[#006AA7] text-white'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            Logga in / registrera dig
          </button>
        </div>
      )}

      {sentMessage && (
        <div
          className={`p-4 rounded-xl border text-xs font-medium flex items-start gap-2.5 ${
            isNavy
              ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-100'
              : 'bg-emerald-50 border-emerald-200 text-emerald-900'
          }`}
        >
          <CheckCircle2 className="w-4 h-4 text-[#10B981] shrink-0 mt-0.5" />
          <span>{sentMessage}</span>
        </div>
      )}

      {error && (
        <div
          className={`p-3.5 rounded-xl border text-xs font-medium ${
            isNavy
              ? 'bg-rose-950/60 border-rose-500/40 text-rose-200'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {enabledFields.map((field: ContactFormField) => {
            const val = values[field.key] ?? '';
            const spanCls =
              field.width === 'full' || field.type === 'textarea' ? 'sm:col-span-2' : '';
            return (
              <div key={field.id} className={spanCls}>
                <label className={`block text-xs font-semibold mb-1.5 ${labelCls}`}>
                  {field.label}
                  {field.required ? ' *' : ''}
                </label>
                {field.type === 'textarea' ? (
                  <textarea
                    rows={4}
                    required={Boolean(field.required)}
                    value={val}
                    onChange={(e) => setField(field.key, e.target.value)}
                    placeholder={neutralPlaceholder(field.placeholder)}
                    className={inputCls}
                  />
                ) : field.type === 'select' ? (
                  <select
                    required={Boolean(field.required)}
                    value={val}
                    onChange={(e) => setField(field.key, e.target.value)}
                    className={selectCls}
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
                    className={inputCls}
                  />
                )}
              </div>
            );
          })}
        </div>

        {showAdSlotSelect && (
          <div>
            <label className={`block text-xs font-semibold mb-1.5 ${labelCls}`}>
              Önskad annonsplats / format
            </label>
            <select
              value={values.adSlot || ''}
              onChange={(e) => setField('adSlot', e.target.value)}
              className={selectCls}
            >
              <option value="">Välj placering (valfritt)</option>
              {adBanners.map((b) => (
                <option key={b.id} value={b.placementLabel}>
                  {b.placementLabel} ({b.dimensions}) –{' '}
                  {b.mode === 'placeholder' ? 'Ledig' : `Idag: ${b.sponsorName}`}
                </option>
              ))}
            </select>
          </div>
        )}

        {form.allowRequesterChoice && (
          <div
            className={`p-3.5 rounded-xl border space-y-2 text-xs ${
              isNavy ? 'bg-white/5 border-white/15' : 'bg-[#F4F6F9] border-slate-200'
            }`}
          >
            <div className="font-semibold">Hur vill du att förfrågan hanteras?</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPreferredRouting('self')}
                className={`text-left px-3 py-2 rounded-lg border transition-colors cursor-pointer ${
                  preferredRouting === 'self'
                    ? isNavy
                      ? 'bg-[#FECC02] text-[#040B16] border-[#FECC02] font-bold'
                      : 'bg-[#040B16] text-white border-[#040B16] font-bold'
                    : isNavy
                    ? 'border-white/15 text-slate-300 hover:bg-white/10'
                    : 'bg-white border-slate-200 text-slate-700 hover:border-slate-400'
                }`}
              >
                Redaktionen hjälper oss först (konfidentiellt)
              </button>
              <button
                type="button"
                onClick={() => setPreferredRouting('direct-partner')}
                className={`text-left px-3 py-2 rounded-lg border transition-colors cursor-pointer ${
                  preferredRouting === 'direct-partner'
                    ? isNavy
                      ? 'bg-[#FECC02] text-[#040B16] border-[#FECC02] font-bold'
                      : 'bg-[#040B16] text-white border-[#040B16] font-bold'
                    : isNavy
                    ? 'border-white/15 text-slate-300 hover:bg-white/10'
                    : 'bg-white border-slate-200 text-slate-700 hover:border-slate-400'
                }`}
              >
                Skicka vidare till utvald partner
              </button>
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <span
            className={`text-xs inline-flex items-center gap-1.5 ${
              isNavy ? 'text-slate-400' : 'text-slate-500'
            }`}
          >
            <Mail className="w-3.5 h-3.5 shrink-0" />
            {form.routingMode === 'self'
              ? 'Hanteras först av sverigesehandel.se innan eventuell vidarekoppling'
              : form.routingMode === 'direct-partner'
              ? 'Skickas enligt konfigurerad partner-routing'
              : 'Dirigeras till dedikerad mottagare i CMS'}
          </span>
          <button
            type="submit"
            disabled={sending}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold inline-flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-50 ${
              isNavy
                ? 'bg-[#FECC02] hover:bg-[#EAB308] text-[#040B16]'
                : 'bg-[#040B16] hover:bg-[#006AA7] text-white'
            }`}
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {form.submitLabel || 'Skicka förfrågan'}
          </button>
        </div>
      </form>
    </div>
  );
}

interface PageFormSlotProps {
  forms?: ContactFormConfig[];
  page: PortalTab;
  position: Exclude<FormPosition, 'intro-modal'>;
  adBanners?: AdBanner[];
  onSubmitted?: () => Promise<void> | void;
  onNotify?: (msg: string) => void;
}

export function PageFormSlot({
  forms = [],
  page,
  position,
  adBanners = [],
  onSubmitted,
  onNotify,
}: PageFormSlotProps) {
  const matching = useMemo(
    () =>
      (forms || []).filter(
        (f) =>
          f.active &&
          f.position === position &&
          (f.page === page || f.page === 'all')
      ),
    [forms, page, position]
  );

  if (matching.length === 0) return null;

  return (
    <div className="space-y-6">
      {matching.map((form) => (
        <DynamicFormWidget
          key={form.id}
          form={form}
          adBanners={adBanners}
          onSubmitted={onSubmitted}
          onNotify={onNotify}
        />
      ))}
    </div>
  );
}
