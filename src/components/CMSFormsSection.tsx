import { useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Check,
  ClipboardList,
  Copy,
  Inbox,
  Mail,
  Pause,
  Pencil,
  Play,
  Plus,
  Send,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import { api } from '../api';
import type {
  ContactFormConfig,
  ContactFormField,
  ContactFormFieldType,
  FormPosition,
  FormPurpose,
  FormRoutingMode,
  LogisticsProvider,
  PortalTab,
  TechPartner,
} from '../types';

interface CMSFormsSectionProps {
  forms: ContactFormConfig[];
  partners: TechPartner[];
  logisticsProviders: LogisticsProvider[];
  editorialEmail: string;
  inboxCount: number;
  onRefresh: () => Promise<void>;
  onNotify: (msg: string) => void;
  onOpenInbox: () => void;
}

const PAGE_LABELS: Array<{ value: PortalTab | 'all'; label: string }> = [
  { value: 'all', label: 'Alla sidor (global / modal)' },
  { value: 'kontakt', label: 'Kontakt & Annonsering' },
  { value: 'marknad', label: 'Marknad & Data' },
  { value: 'nyheter', label: 'Nyheter' },
  { value: 'partners', label: 'Partners & Tech' },
  { value: '3pl', label: '3PL & 4PL' },
  { value: 'ehandlare', label: 'Svenska E-handlare' },
  { value: 'event', label: 'Event & Mässor' },
  { value: 'jobb', label: 'Jobb & Rekrytering' },
  { value: 'historia', label: 'Historia' },
  { value: 'community', label: 'Community' },
];

const POSITION_LABELS: Array<{ value: FormPosition; label: string }> = [
  { value: 'top', label: 'Högst upp (Top)' },
  { value: 'mid', label: 'Mitten av sidan (Mid)' },
  { value: 'bottom', label: 'Längst ned (Bottom)' },
  { value: 'intro-modal', label: 'Intro-popup (Modal)' },
];

const PURPOSE_LABELS: Array<{ value: FormPurpose; label: string }> = [
  { value: 'contact', label: 'Kontakt & Allmänt' },
  { value: 'intro', label: 'Partner- / 3PL-intro' },
  { value: 'ad-booking', label: 'Annonsbokning' },
  { value: 'tip', label: 'Nyhetstips / Rådgivning' },
  { value: 'recruitment', label: 'Jobb & Rekrytering' },
];

const ROUTING_LABELS: Record<FormRoutingMode, string> = {
  self: 'Ta hand om själv först (Redaktionen)',
  'direct-partner': 'Skicka direkt till partnerns intro-mejl',
  'custom-email': 'Skicka till annan specifik e-postadress',
};

function createEmptyForm(editorialEmail: string): ContactFormConfig {
  const now = new Date().toISOString();
  return {
    id: '',
    name: '',
    purpose: 'contact',
    page: 'partners',
    position: 'bottom',
    active: true,
    theme: 'light',
    kicker: 'Rådgivning & Intro',
    title: 'Behöver ni hjälp att välja rätt lösning?',
    subtitle: 'Berätta om ert behov så återkommer vi med oberoende rekommendation eller intro.',
    submitLabel: 'Skicka förfrågan',
    successMessage: 'Tack! Din förfrågan är mottagen.',
    routingMode: 'self',
    recipientEmail: editorialEmail || 'hej@sverigesehandel.se',
    allowRequesterChoice: false,
    updatedAt: now,
    fields: [
      {
        id: `fld-name-${Date.now()}`,
        key: 'name',
        label: 'Namn',
        type: 'text',
        placeholder: 'För- och efternamn',
        required: true,
        enabled: true,
        width: 'half',
      },
      {
        id: `fld-email-${Date.now() + 1}`,
        key: 'email',
        label: 'Arbetsmejl',
        type: 'email',
        placeholder: 'namn@butik.se',
        required: true,
        enabled: true,
        width: 'half',
      },
      {
        id: `fld-company-${Date.now() + 2}`,
        key: 'company',
        label: 'Företag / Butik',
        type: 'text',
        placeholder: 'Företagsnamn AB',
        required: false,
        enabled: true,
        width: 'half',
      },
      {
        id: `fld-need-${Date.now() + 3}`,
        key: 'needSummary',
        label: 'Vad vill ni ha hjälp med?',
        type: 'select',
        required: true,
        enabled: true,
        width: 'half',
        options: [
          'Byta e-handelsplattform / tech-stack',
          'Välja ny transportör eller paketskåp',
          'Upphandla 3PL / fulfillment',
          'Annonsering & partnerskap',
        ],
      },
      {
        id: `fld-msg-${Date.now() + 4}`,
        key: 'message',
        label: 'Meddelande & bakgrund',
        type: 'textarea',
        placeholder: 'Beskriv kort vad ni söker...',
        required: true,
        enabled: true,
        width: 'full',
      },
    ],
  };
}

export function CMSFormsSection({
  forms = [],
  partners = [],
  logisticsProviders = [],
  editorialEmail,
  inboxCount,
  onRefresh,
  onNotify,
  onOpenInbox,
}: CMSFormsSectionProps) {
  const [draft, setDraft] = useState<ContactFormConfig>(() => createEmptyForm(editorialEmail));
  const [editingId, setEditingId] = useState<string>('new');
  const [saving, setSaving] = useState(false);

  const partnersWithDirect = partners.filter((p) => Boolean(p.introEmail));
  const logisticsWithDirect = logisticsProviders.filter((l) => Boolean(l.introEmail));

  function startNew() {
    setEditingId('new');
    setDraft(createEmptyForm(editorialEmail));
  }

  function startEdit(form: ContactFormConfig) {
    setEditingId(form.id);
    setDraft({
      ...form,
      fields: (form.fields || []).map((f) => ({
        ...f,
        options: f.options ? [...f.options] : undefined,
      })),
    });
  }

  function duplicateForm(form: ContactFormConfig) {
    setEditingId('new');
    setDraft({
      ...form,
      id: '',
      name: `${form.name} (kopia)`,
      active: false,
      fields: (form.fields || []).map((f, idx) => ({
        ...f,
        id: `fld-${Date.now()}-${idx}`,
        options: f.options ? [...f.options] : undefined,
      })),
    });
    onNotify(`Kopierade "${form.name}". Välj sida/position och spara.`);
  }

  async function handleToggleActive(form: ContactFormConfig) {
    await api.upsertContactForm({ ...form, active: !form.active });
    await onRefresh();
    onNotify(form.active ? `Pausade "${form.name}".` : `Aktiverade "${form.name}".`);
  }

  async function handleDelete(form: ContactFormConfig) {
    await api.deleteContactForm(form.id);
    if (editingId === form.id) {
      startNew();
    }
    await onRefresh();
    onNotify(`Tog bort formuläret "${form.name}".`);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.name.trim() || !draft.title.trim()) {
      onNotify('Ange namn och rubrik för formuläret.');
      return;
    }
    setSaving(true);
    try {
      await api.upsertContactForm({
        ...draft,
        id: editingId === 'new' ? undefined : editingId,
        name: draft.name.trim(),
        kicker: draft.kicker.trim() || 'Kontaktformulär',
        title: draft.title.trim(),
        subtitle: draft.subtitle.trim(),
        submitLabel: draft.submitLabel.trim() || 'Skicka',
        successMessage: draft.successMessage.trim() || 'Tack! Din förfrågan är mottagen.',
        recipientEmail: draft.recipientEmail.trim() || editorialEmail || 'hej@sverigesehandel.se',
      });
      await onRefresh();
      onNotify(
        editingId === 'new'
          ? `Skapade formulär "${draft.name}".`
          : `Uppdaterade "${draft.name}".`
      );
      if (editingId === 'new') startNew();
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'Kunde inte spara formuläret.');
    } finally {
      setSaving(false);
    }
  }

  function updateField(idx: number, patch: Partial<ContactFormField>) {
    setDraft((prev) => {
      const next = [...prev.fields];
      next[idx] = { ...next[idx], ...patch };
      return { ...prev, fields: next };
    });
  }

  function moveField(idx: number, dir: -1 | 1) {
    setDraft((prev) => {
      const next = [...prev.fields];
      const target = idx + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[idx], next[target]] = [next[target], next[idx]];
      return { ...prev, fields: next };
    });
  }

  function removeField(idx: number) {
    setDraft((prev) => ({
      ...prev,
      fields: prev.fields.filter((_, i) => i !== idx),
    }));
  }

  function addField(preset?: Partial<ContactFormField>) {
    const suffix = Date.now().toString(36).slice(-4);
    const nextField: ContactFormField = {
      id: `fld-${Date.now()}`,
      key: preset?.key || `custom_${suffix}`,
      label: preset?.label || 'Nytt fält',
      type: preset?.type || 'text',
      placeholder: preset?.placeholder || '',
      required: preset?.required ?? false,
      enabled: true,
      width: preset?.width || 'half',
      options: preset?.options,
    };
    setDraft((prev) => ({ ...prev, fields: [...prev.fields, nextField] }));
  }

  return (
    <div className="space-y-6">
      {/* Header summary */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="font-mono text-xs font-semibold text-[#006AA7] inline-flex items-center gap-1.5">
            <ClipboardList className="w-3.5 h-3.5" />
            Formulärbyggare &amp; Intro-routing · {forms.length} formulär
          </div>
          <h2 className="font-display text-xl font-extrabold text-[#040B16]">
            Placera formulär på valfri sida &amp; styr vart intro-förfrågningar skickas
          </h2>
          <p className="text-xs text-slate-600 max-w-3xl">
            Välj om intro-förfrågningar ska hanteras av er först i Inkorgen, dirigeras till en annan e-postadress eller skickas direkt till respektive partners/3PL:s intro-mejl.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onOpenInbox}
            className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-[#040B16] text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Inbox className="w-3.5 h-3.5 text-[#059669]" />
            Öppna Inkorg ({inboxCount})
          </button>
          <button
            type="button"
            onClick={startNew}
            className="px-4 py-2 rounded-xl bg-[#040B16] hover:bg-[#006AA7] text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-[#FECC02]" />
            Nytt formulär
          </button>
        </div>
      </div>

      {/* Existing Forms List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {forms.map((form) => {
          const pageLabel = PAGE_LABELS.find((p) => p.value === form.page)?.label || form.page;
          const posLabel =
            POSITION_LABELS.find((p) => p.value === form.position)?.label || form.position;
          const isEditing = editingId === form.id;

          return (
            <div
              key={form.id}
              className={`bg-white border rounded-2xl p-5 flex flex-col justify-between gap-4 transition-colors ${
                isEditing ? 'border-[#006AA7] ring-2 ring-[#006AA7]/15' : 'border-slate-200'
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[11px] font-mono font-semibold text-[#006AA7]">
                      {pageLabel} · {posLabel}
                    </div>
                    <h3 className="font-display font-bold text-base text-[#040B16] truncate">
                      {form.name}
                    </h3>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-md text-[11px] font-mono font-bold shrink-0 ${
                      form.active
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-slate-100 text-slate-600 border border-slate-200'
                    }`}
                  >
                    {form.active ? 'Aktiv' : 'Pausad'}
                  </span>
                </div>

                <div className="text-xs text-slate-600">
                  <strong>Rubrik:</strong> {form.title}
                </div>

                <div className="text-xs text-slate-600 flex flex-wrap items-center gap-x-3 gap-y-1 pt-1">
                  <span className="inline-flex items-center gap-1 font-medium text-[#040B16]">
                    <Mail className="w-3 h-3 text-[#006AA7]" />
                    {ROUTING_LABELS[form.routingMode]}
                  </span>
                  {form.recipientEmail && (
                    <span className="font-mono text-[11px] text-slate-500">
                      ({form.recipientEmail})
                    </span>
                  )}
                </div>

                <div className="text-[11px] font-mono text-slate-500">
                  {(form.fields || []).filter((f) => f.enabled).length} aktiva fält · Tema: {form.theme}
                  {form.allowRequesterChoice ? ' · Besökarval aktivt' : ''}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => startEdit(form)}
                    className="px-3 py-1.5 rounded-lg bg-[#040B16] hover:bg-[#006AA7] text-white text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Pencil className="w-3 h-3" />
                    Redigera
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleActive(form)}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
                  >
                    {form.active ? (
                      <>
                        <Pause className="w-3 h-3" /> Pausa
                      </>
                    ) : (
                      <>
                        <Play className="w-3 h-3" /> Aktivera
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => duplicateForm(form)}
                    className="px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
                    title="Duplicera formulär"
                  >
                    <Copy className="w-3 h-3" />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => handleDelete(form)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 cursor-pointer"
                  aria-label={`Ta bort ${form.name}`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Form Editor / Builder */}
      <form
        onSubmit={handleSave}
        className="bg-white border border-slate-200 rounded-2xl p-6 space-y-6"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-slate-100">
          <div>
            <h3 className="font-display text-lg font-extrabold text-[#040B16]">
              {editingId === 'new' ? 'Skapa nytt formulär' : `Redigerar: ${draft.name}`}
            </h3>
            <p className="text-xs text-slate-500">
              Styr placering, fält, design och mottagaradress direkt utan kodändringar.
            </p>
          </div>
          {editingId !== 'new' && (
            <button
              type="button"
              onClick={startNew}
              className="text-xs font-semibold text-[#006AA7] hover:underline cursor-pointer"
            >
              + Skapa nytt formulär istället
            </button>
          )}
        </div>

        {/* Metadata & Placement */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Internt namn *
            </label>
            <input
              type="text"
              required
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              placeholder="T.ex. 3PL-rådgivning Bottom"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Sida (Placering)
            </label>
            <select
              value={draft.page}
              onChange={(e) => setDraft({ ...draft, page: e.target.value as PortalTab | 'all' })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white"
            >
              {PAGE_LABELS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Position på sidan
            </label>
            <select
              value={draft.position}
              onChange={(e) => setDraft({ ...draft, position: e.target.value as FormPosition })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white"
            >
              {POSITION_LABELS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Syfte</label>
            <select
              value={draft.purpose}
              onChange={(e) => setDraft({ ...draft, purpose: e.target.value as FormPurpose })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white"
            >
              {PURPOSE_LABELS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Copy & Visuals */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Kicker</label>
            <input
              type="text"
              value={draft.kicker}
              onChange={(e) => setDraft({ ...draft, kicker: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Rubrik för besökare *
            </label>
            <input
              type="text"
              required
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Tema</label>
            <select
              value={draft.theme}
              onChange={(e) =>
                setDraft({ ...draft, theme: e.target.value as 'light' | 'navy' | 'gold' })
              }
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white"
            >
              <option value="light">Ljus (Vit)</option>
              <option value="navy">Mörkblå (Navy)</option>
              <option value="gold">Guld-accent (Nordic Gold)</option>
            </select>
          </div>

          <div className="sm:col-span-2">
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Ingress / Beskrivning
            </label>
            <input
              type="text"
              value={draft.subtitle}
              onChange={(e) => setDraft({ ...draft, subtitle: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Knapptext</label>
            <input
              type="text"
              value={draft.submitLabel}
              onChange={(e) => setDraft({ ...draft, submitLabel: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Status vid sparning
            </label>
            <label className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold cursor-pointer">
              <input
                type="checkbox"
                checked={draft.active}
                onChange={(e) => setDraft({ ...draft, active: e.target.checked })}
              />
              Aktivt och synligt
            </label>
          </div>

          <div className="sm:col-span-4">
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Bekräftelsemeddelande efter skickat formulär
            </label>
            <input
              type="text"
              value={draft.successMessage}
              onChange={(e) => setDraft({ ...draft, successMessage: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
            />
          </div>
        </div>

        {/* Routing Configuration */}
        <div className="p-4 rounded-xl bg-[#F4F6F9] border border-slate-200 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-xs font-bold text-[#040B16] inline-flex items-center gap-1.5">
              <Send className="w-3.5 h-3.5 text-[#006AA7]" />
              Mottagare &amp; Intro-routing
            </div>
            <span className="text-[11px] text-slate-500">
              {partnersWithDirect.length} partners &amp; {logisticsWithDirect.length} 3PL/4PL har egen intro-mejl angiven
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Hanteringsläge
              </label>
              <select
                value={draft.routingMode}
                onChange={(e) =>
                  setDraft({ ...draft, routingMode: e.target.value as FormRoutingMode })
                }
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white"
              >
                <option value="self">Ta hand om själv först (Inkorg / Redaktion)</option>
                <option value="direct-partner">
                  Skicka direkt till vald partners/3PL:s intro-mejl
                </option>
                <option value="custom-email">Skicka till annan e-postadress</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                {draft.routingMode === 'custom-email'
                  ? 'Specifik mottagaradress *'
                  : 'Reserv- / redaktionsmejl'}
              </label>
              <input
                type="email"
                value={draft.recipientEmail}
                onChange={(e) => setDraft({ ...draft, recipientEmail: e.target.value })}
                placeholder="t.ex. intro@sverigesehandel.se"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white"
              />
            </div>

            <div className="flex items-end">
              <label className="w-full flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean(draft.allowRequesterChoice)}
                  onChange={(e) =>
                    setDraft({ ...draft, allowRequesterChoice: e.target.checked })
                  }
                />
                Låt besökaren välja (oss först vs direkt)
              </label>
            </div>
          </div>

          <p className="text-[11px] text-slate-600 flex items-start gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-[#059669] shrink-0 mt-0.5" />
            <span>
              Enskilda partners och 3PL-aktörer kan även styra detta individuellt via fälten &quot;Intro-e-post&quot; och &quot;Intro-hantering&quot; i sin CMS-profil.
            </span>
          </p>
        </div>

        {/* Dynamic Field Builder */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h4 className="font-display font-bold text-sm text-[#040B16]">
                Fält i formuläret ({draft.fields.length})
              </h4>
              <p className="text-[11px] text-slate-500">
                Aktivera, döp om, ändra ordning eller lägg till egna valfält för att samla in rätt behovsdata.
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() =>
                  addField({
                    key: 'monthlyVolume',
                    label: 'Ungefärlig paketvolym / mån',
                    type: 'select',
                    options: [
                      'Under 500 paket/mån',
                      '500 – 2 500 paket/mån',
                      '2 500 – 10 000 paket/mån',
                      'Över 10 000 paket/mån',
                    ],
                  })
                }
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-[11px] font-semibold cursor-pointer"
              >
                + Volymfält
              </button>
              <button
                type="button"
                onClick={() =>
                  addField({
                    key: 'timeline',
                    label: 'Önskad tidsplan',
                    type: 'select',
                    options: ['Omgående (1 mån)', 'Inom 3 månader', '3–6 månader', 'Bara orienterande'],
                  })
                }
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-[11px] font-semibold cursor-pointer"
              >
                + Tidsplan
              </button>
              <button
                type="button"
                onClick={() => addField()}
                className="px-3 py-1.5 rounded-lg bg-[#006AA7] text-white text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                Nytt fält
              </button>
            </div>
          </div>

          <div className="space-y-2.5">
            {draft.fields.map((field, idx) => (
              <div
                key={field.id}
                className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2.5"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2.5 items-center">
                  <div className="lg:col-span-2">
                    <label className="block text-[10px] font-mono text-slate-500 mb-0.5">
                      Etikett ({field.key})
                    </label>
                    <input
                      type="text"
                      value={field.label}
                      onChange={(e) => updateField(idx, { label: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono text-slate-500 mb-0.5">Typ</label>
                    <select
                      value={field.type}
                      onChange={(e) =>
                        updateField(idx, {
                          type: e.target.value as ContactFormFieldType,
                          options:
                            e.target.value === 'select' && (!field.options || field.options.length === 0)
                              ? ['Alternativ 1', 'Alternativ 2']
                              : field.options,
                        })
                      }
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs"
                    >
                      <option value="text">Text</option>
                      <option value="email">E-post</option>
                      <option value="tel">Telefon</option>
                      <option value="select">Rullgardinslista</option>
                      <option value="textarea">Stort textfält</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono text-slate-500 mb-0.5">
                      Bredd
                    </label>
                    <select
                      value={field.width || 'half'}
                      onChange={(e) =>
                        updateField(idx, { width: e.target.value as 'half' | 'full' })
                      }
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs"
                    >
                      <option value="half">Halv bredd</option>
                      <option value="full">Full bredd</option>
                    </select>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 pt-3 sm:pt-4 text-xs">
                    <label className="inline-flex items-center gap-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={field.enabled}
                        onChange={(e) => updateField(idx, { enabled: e.target.checked })}
                      />
                      Aktiv
                    </label>
                    <label className="inline-flex items-center gap-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={Boolean(field.required)}
                        onChange={(e) => updateField(idx, { required: e.target.checked })}
                      />
                      Krav
                    </label>
                  </div>

                  <div className="flex items-center justify-end gap-1 pt-2 sm:pt-4">
                    <button
                      type="button"
                      onClick={() => moveField(idx, -1)}
                      disabled={idx === 0}
                      className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-[#040B16] disabled:opacity-30 cursor-pointer"
                      aria-label="Flytta upp"
                    >
                      <ArrowUp className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveField(idx, 1)}
                      disabled={idx === draft.fields.length - 1}
                      className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-[#040B16] disabled:opacity-30 cursor-pointer"
                      aria-label="Flytta ned"
                    >
                      <ArrowDown className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeField(idx)}
                      className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-400 hover:text-red-600 cursor-pointer"
                      aria-label="Ta bort fält"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {field.type === 'select' ? (
                  <div>
                    <label className="block text-[10px] font-mono text-slate-500 mb-0.5">
                      Valbara alternativ (komma- eller radseparerade)
                    </label>
                    <input
                      type="text"
                      value={(field.options || []).join(', ')}
                      onChange={(e) =>
                        updateField(idx, {
                          options: e.target.value
                            .split(/[\n,]/)
                            .map((s) => s.trim())
                            .filter(Boolean),
                        })
                      }
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-[10px] font-mono text-slate-500 mb-0.5">
                      Platshållartext (Placeholder)
                    </label>
                    <input
                      type="text"
                      value={field.placeholder || ''}
                      onChange={(e) => updateField(idx, { placeholder: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
          {editingId !== 'new' && (
            <button
              type="button"
              onClick={startNew}
              className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
            >
              Avbryt
            </button>
          )}
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2.5 rounded-xl bg-[#040B16] hover:bg-[#006AA7] text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Check className="w-3.5 h-3.5 text-[#FECC02]" />
            {saving
              ? 'Sparar...'
              : editingId === 'new'
              ? 'Spara nytt formulär'
              : 'Uppdatera formulär'}
          </button>
        </div>
      </form>
    </div>
  );
}
