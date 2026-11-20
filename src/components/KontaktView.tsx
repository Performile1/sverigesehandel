import { useEffect, useState } from 'react';
import { Check, Copy, ExternalLink, Loader2, Mail, Megaphone, Send } from 'lucide-react';
import type { AdBanner, PageCopyBlock } from '../types';

interface KontaktViewProps {
  adBanners: AdBanner[];
  pageCopy?: PageCopyBlock & { contactEmail?: string };
  initialAdSlot?: string;
  onSubmitContact: (payload: {
    name: string;
    email: string;
    company?: string;
    topic: string;
    adSlot?: string;
    message: string;
  }) => Promise<void>;
  onNotify: (msg: string) => void;
}

const DEFAULT_CONTACT_EMAIL = 'hej@sverigesehandel.se';

export function KontaktView({
  adBanners,
  pageCopy,
  initialAdSlot = '',
  onSubmitContact,
  onNotify,
}: KontaktViewProps) {
  const contactEmail = pageCopy?.contactEmail?.trim() || DEFAULT_CONTACT_EMAIL;
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [topic, setTopic] = useState(
    initialAdSlot ? 'Annonsbanner & Partnerskap' : 'Allmän fråga / Tipsa redaktionen'
  );
  const [adSlot, setAdSlot] = useState(initialAdSlot);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (initialAdSlot) {
      setTopic('Annonsbanner & Partnerskap');
      setAdSlot(initialAdSlot);
    }
  }, [initialAdSlot]);

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim() || sending) return;
    setSending(true);
    try {
      await onSubmitContact({
        name: name.trim(),
        email: email.trim(),
        company: company.trim() || undefined,
        topic,
        adSlot: adSlot || undefined,
        message: message.trim(),
      });
      setSent(true);
      setName('');
      setEmail('');
      setCompany('');
      setMessage('');
      onNotify('Tack! Ditt meddelande har tagits emot av redaktionen.');
    } finally {
      setSending(false);
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

      {/* Contact Form + Ad Slots Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-5">
          <div>
            <div className="text-xs font-mono font-semibold text-[#006AA7]">Kontaktformulär</div>
            <h2 className="font-display text-2xl font-extrabold text-[#040B16] mt-0.5">
              Skicka meddelande till {contactEmail}
            </h2>
            <p className="text-xs text-slate-600 mt-1">
              Vi svarar normalt inom 1 arbetsdag på förfrågningar om data, partnerskap och annonsering.
            </p>
          </div>

          {sent && (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-medium">
              Ditt meddelande har sparats och skickats till redaktionen ({contactEmail}). Vill du komplettera med bilagor kan du även mejla direkt till{' '}
              <a href={`mailto:${contactEmail}`} className="underline font-bold">
                {contactEmail}
              </a>
              .
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Namn *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="För- och efternamn"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#006AA7]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">E-post *</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="namn@foretag.se"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#006AA7]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Företag / Organisation
                </label>
                <input
                  type="text"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="T.ex. Svensk E-handel AB"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#006AA7]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Ärende</label>
                <select
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#006AA7]"
                >
                  <option value="Allmän fråga / Tipsa redaktionen">
                    Allmän fråga / Tipsa redaktionen
                  </option>
                  <option value="Annonsbanner & Partnerskap">Annonsbanner & Partnerskap</option>
                  <option value="Lägg till e-handlare eller tech-partner">
                    Lägg till e-handlare eller tech-partner
                  </option>
                  <option value="Event, D-Congress & Mässa">Event, D-Congress & Mässa</option>
                  <option value="Checkoutstrategi.se & Rådgivning">
                    Checkoutstrategi.se & Rådgivning
                  </option>
                  <option value="Jobbannons & Rekrytering">Jobbannons & Rekrytering</option>
                </select>
              </div>
            </div>

            {topic === 'Annonsbanner & Partnerskap' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Önskad annonsplats / format
                </label>
                <select
                  value={adSlot}
                  onChange={(e) => setAdSlot(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-white"
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

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Meddelande *
              </label>
              <textarea
                rows={5}
                required
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Berätta om ert företag, önskad bannerplacering eller datatips..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#006AA7]"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <span className="text-xs text-slate-500">
                Eller mejla direkt:{' '}
                <a href={`mailto:${contactEmail}`} className="font-semibold text-[#006AA7] hover:underline">
                  {contactEmail}
                </a>
              </span>
              <button
                type="submit"
                disabled={sending}
                className="px-5 py-2.5 rounded-xl bg-[#040B16] hover:bg-[#006AA7] disabled:opacity-50 text-white text-xs font-bold inline-flex items-center gap-2 transition-colors cursor-pointer"
              >
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Skicka meddelande
              </button>
            </div>
          </form>
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
                        setTopic('Annonsbanner & Partnerskap');
                        setAdSlot(b.placementLabel);
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
    </div>
  );
}
