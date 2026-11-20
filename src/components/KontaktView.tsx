import { useEffect, useState } from 'react';
import { Check, Copy, ExternalLink, Mail, Megaphone } from 'lucide-react';
import type { AdBanner, ContactFormConfig, PageCopyBlock } from '../types';
import { DynamicFormWidget, PageFormSlot } from './DynamicFormWidget';

interface KontaktViewProps {
  adBanners: AdBanner[];
  contactForms?: ContactFormConfig[];
  pageCopy?: PageCopyBlock & { contactEmail?: string };
  initialAdSlot?: string;
  onFormSubmitted?: () => Promise<void> | void;
  onNotify: (msg: string) => void;
}

const DEFAULT_CONTACT_EMAIL = 'hej@sverigesehandel.se';

const FALLBACK_KONTAKT_FORM: ContactFormConfig = {
  id: 'form-kontakt-main',
  name: 'Huvudformulär (Kontakt & Annons)',
  purpose: 'contact',
  page: 'kontakt',
  position: 'top',
  active: true,
  theme: 'light',
  kicker: 'Kontaktformulär',
  title: 'Skicka meddelande till redaktionen',
  subtitle:
    'Vi svarar normalt inom 1 arbetsdag på förfrågningar om data, partnerskap och annonsering.',
  submitLabel: 'Skicka meddelande',
  successMessage: 'Tack! Ditt meddelande har tagits emot av redaktionen.',
  routingMode: 'self',
  recipientEmail: DEFAULT_CONTACT_EMAIL,
  allowRequesterChoice: false,
  updatedAt: new Date().toISOString(),
  fields: [
    {
      id: 'kf-name',
      key: 'name',
      label: 'Namn',
      type: 'text',
      placeholder: 'För- och efternamn',
      required: true,
      enabled: true,
      width: 'half',
    },
    {
      id: 'kf-email',
      key: 'email',
      label: 'E-post',
      type: 'email',
      placeholder: 'namn@foretag.se',
      required: true,
      enabled: true,
      width: 'half',
    },
    {
      id: 'kf-company',
      key: 'company',
      label: 'Företag / Organisation',
      type: 'text',
      placeholder: 'T.ex. Svensk E-handel AB',
      required: false,
      enabled: true,
      width: 'half',
    },
    {
      id: 'kf-topic',
      key: 'topic',
      label: 'Ärende',
      type: 'select',
      required: true,
      enabled: true,
      width: 'half',
      options: [
        'Allmän fråga / Tipsa redaktionen',
        'Annonsbanner & Partnerskap',
        'Lägg till e-handlare eller tech-partner',
        'Event, D-Congress & Mässa',
        'Checkoutstrategi.se & Rådgivning',
        'Jobbannons & Rekrytering',
      ],
    },
    {
      id: 'kf-message',
      key: 'message',
      label: 'Meddelande',
      type: 'textarea',
      placeholder: 'Berätta om ert företag, önskad bannerplacering eller datatips...',
      required: true,
      enabled: true,
      width: 'full',
    },
  ],
};

export function KontaktView({
  adBanners,
  contactForms = [],
  pageCopy,
  initialAdSlot = '',
  onFormSubmitted,
  onNotify,
}: KontaktViewProps) {
  const contactEmail = pageCopy?.contactEmail?.trim() || DEFAULT_CONTACT_EMAIL;
  const [selectedAdSlot, setSelectedAdSlot] = useState(initialAdSlot);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setSelectedAdSlot(initialAdSlot);
  }, [initialAdSlot]);

  const primaryForm =
    contactForms.find(
      (f) => f.active && f.page === 'kontakt' && f.position === 'top'
    ) ||
    contactForms.find((f) => f.active && f.page === 'kontakt') ||
    FALLBACK_KONTAKT_FORM;

  const extraTopForms = contactForms.filter(
    (f) => f.active && (f.page === 'kontakt' || f.page === 'all') && f.position === 'top' && f.id !== primaryForm.id
  );

  async function handleCopyEmail() {
    try {
      await navigator.clipboard.writeText(contactEmail);
      setCopied(true);
      onNotify(`Kopierade ${contactEmail} till urklipp.`);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      onNotify(`E-postadress: ${contactEmail}`);
    }
  }

  return (
    <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header Banner */}
      <div className="bg-[#040B16] text-white border border-slate-800 rounded-2xl p-6 sm:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-8 space-y-3">
            <div className="text-xs font-mono text-[#FECC02] font-semibold">
              {pageCopy?.kicker || 'Kontakt & Annonsering · Redaktionen sverigesehandel.se'}
            </div>
            <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-balance">
              {pageCopy?.title || 'Kontakta oss, tipsa om data eller boka annonsbanner'}
            </h1>
            <p className="text-slate-300 text-sm sm:text-base max-w-2xl leading-relaxed">
              {pageCopy?.subtitle ||
                'Vill ni lägga till en svensk e-handlare, uppdatera en tech-partner, annonsera inför D-Congress 2027 eller diskutera checkoutstrategi? Hör av er direkt till vår redaktion.'}
            </p>
          </div>

          <div className="lg:col-span-4 bg-white/5 border border-white/10 rounded-2xl p-5 space-y-3">
            <div className="text-xs font-mono text-slate-400">Direktkontakt redaktion & annons</div>
            <a
              href={`mailto:${contactEmail}`}
              className="font-display text-xl font-extrabold text-[#FECC02] hover:underline flex items-center gap-2 break-all"
            >
              <Mail className="w-5 h-5 shrink-0" />
              {contactEmail}
            </a>
            <div className="flex flex-wrap gap-2 pt-1">
              <a
                href={`mailto:${contactEmail}?subject=Kontakt%20via%20sverigesehandel.se`}
                className="px-3.5 py-2 rounded-lg bg-[#FECC02] hover:bg-[#EAB308] text-[#040B16] text-xs font-bold inline-flex items-center gap-1.5"
              >
                <Mail className="w-3.5 h-3.5" />
                Skicka e-post
              </a>
              <button
                type="button"
                onClick={handleCopyEmail}
                className="px-3.5 py-2 rounded-lg bg-white/10 hover:bg-white/15 border border-white/15 text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-[#10B981]" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Kopierad' : 'Kopiera adress'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {extraTopForms.map((f) => (
        <DynamicFormWidget
          key={f.id}
          form={f}
          adBanners={adBanners}
          onSubmitted={onFormSubmitted}
          onNotify={onNotify}
        />
      ))}

      {/* Contact Form + Ad Slots Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-7">
          <DynamicFormWidget
            form={primaryForm}
            adBanners={adBanners}
            initialAdSlot={selectedAdSlot}
            onSubmitted={onFormSubmitted}
            onNotify={onNotify}
          />
        </div>

        {/* Ad Slots & Partnerships */}
        <div className="lg:col-span-5 space-y-5">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-2 text-xs font-mono font-semibold text-[#059669]">
              <Megaphone className="w-4 h-4" />
              Annonsplatser & Banner Holders
            </div>
            <h3 className="font-display text-xl font-extrabold text-[#040B16]">
              Synlighet bland svenska e-handelschefer
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Vi erbjuder tydliga, native-anpassade annonsbanners på Marknad & Insikter, Event, E-handlare, Jämför-sidorna och Jobb. Klicka på en ledig plats nedan för att välja den i formuläret.
            </p>

            <div className="space-y-2.5 pt-2">
              {adBanners.map((b) => {
                const isOpen = b.mode === 'placeholder';
                return (
                  <div
                    key={b.id}
                    className="p-3.5 rounded-xl border border-slate-200 flex items-center justify-between gap-3 hover:border-slate-300 transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="font-display font-bold text-xs text-[#040B16] truncate">
                        {b.placementLabel}
                      </div>
                      <div className="text-[11px] font-mono text-slate-500 mt-0.5 tabular-nums">
                        {b.dimensions} · {isOpen ? 'Ledig plats' : `Bokad: ${b.sponsorName}`}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedAdSlot(b.placementLabel);
                        onNotify(`Valde annonsplats: ${b.placementLabel}`);
                      }}
                      className={`px-3 py-1.5 rounded-lg text-[11px] font-bold shrink-0 cursor-pointer ${
                        isOpen
                          ? 'bg-[#FECC02] hover:bg-[#EAB308] text-[#040B16]'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      }`}
                    >
                      {isOpen ? 'Välj plats' : 'Bevaka'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-[#040B16] text-white border border-slate-800 rounded-2xl p-6 space-y-3">
            <div className="text-xs font-mono font-semibold text-[#FECC02]">
              Systertjänst & Fördjupning
            </div>
            <h3 className="font-display text-lg font-extrabold">
              Checkoutstrategi.se
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Behöver ni hjälp med kassaoptimering, betalleverantörsval eller fraktstrategi i checkout? Besök vår fördjupningsresurs för svenska e-handlare.
            </p>
            <a
              href="https://checkoutstrategi.se"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#FECC02] hover:underline"
            >
              Gå till checkoutstrategi.se
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>

      <PageFormSlot
        forms={contactForms}
        page="kontakt"
        position="mid"
        adBanners={adBanners}
        onSubmitted={onFormSubmitted}
        onNotify={onNotify}
      />

      <PageFormSlot
        forms={contactForms}
        page="kontakt"
        position="bottom"
        adBanners={adBanners}
        onSubmitted={onFormSubmitted}
        onNotify={onNotify}
      />
    </div>
  );
}

