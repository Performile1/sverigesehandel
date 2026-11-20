import { useState } from 'react';
import { Star } from 'lucide-react';
import type { AdBanner, ContactFormConfig, PageCopyBlock, TimelineMilestone } from '../types';
import { PageFormSlot } from './DynamicFormWidget';

interface HistoriaViewProps {
  timeline: TimelineMilestone[];
  pageCopy?: PageCopyBlock;
  contactForms?: ContactFormConfig[];
  adBanners?: AdBanner[];
  onFormSubmitted?: () => Promise<void> | void;
  onNotify?: (msg: string) => void;
}

export function HistoriaView({
  timeline,
  pageCopy,
  contactForms = [],
  adBanners = [],
  onFormSubmitted,
  onNotify,
}: HistoriaViewProps) {
  const [tmEra, setTmEra] = useState<'1998' | '2027'>('1998');
  const [eraFilter, setEraFilter] = useState<'all' | '90s' | '00s' | '10s' | '20s'>('all');

  const filtered =
    eraFilter === 'all' ? timeline : timeline.filter((item) => item.era === eraFilter);

  return (
    <div>
      <section className="bg-[#040B16] text-white hero-grid-bg border-b border-white/10 py-12">
        <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-7 space-y-4">
              <div className="font-mono text-xs text-[#FECC02] font-semibold">
                {pageCopy?.kicker || '1994–2027 · Svensk e-handelsevolution'}
              </div>
              <h1 className="font-display text-3xl sm:text-5xl font-extrabold tracking-tight text-balance">
                {pageCopy?.title || (
                  <>
                    Från 8-bitars skärmpixlar till <span className="text-[#10B981]">Meta CAPI</span> &amp; Agentic AI.
                  </>
                )}
              </h1>
              <p className="text-slate-300 text-sm sm:text-base max-w-2xl leading-relaxed">
                {pageCopy?.subtitle ||
                  'Tre decennier av svensk e-handelsteknik. Följ resan från 90-talets synliga GIF-pixlar och postförskott, via Facebook-pixelns guldålder, till dagens integritetssäkrade server-side spårning och AI-drivna köp.'}
              </p>
            </div>

            <div className="lg:col-span-5 bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-mono font-semibold text-[#FECC02]">
                  Interaktiv jämförelse
                </span>
                <div className="inline-flex bg-[#040B16] p-1 rounded-lg border border-white/10 text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setTmEra('1998')}
                    className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
                      tmEra === '1998' ? 'bg-[#FECC02] text-[#040B16]' : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    1998 (HTML 3.2)
                  </button>
                  <button
                    type="button"
                    onClick={() => setTmEra('2027')}
                    className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
                      tmEra === '2027' ? 'bg-[#FECC02] text-[#040B16]' : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    2027 (AI + CAPI)
                  </button>
                </div>
              </div>

              {tmEra === '1998' ? (
                <div className="bg-slate-200 text-slate-950 p-4 rounded-xl font-mono text-xs space-y-2 border border-slate-400">
                  <div className="bg-blue-900 text-white px-2.5 py-1 font-bold flex justify-between">
                    <span>Netscape 4.0 · bokhandel.se</span>
                    <span>640x480px</span>
                  </div>
                  <p className="font-bold">Laddar produktbild.gif (18 KB via 28.8k modem)...</p>
                  <div className="bg-white p-3 border border-slate-400 space-y-1">
                    <div>Betalning: <strong>Postförskott (49 kr avgift)</strong></div>
                    <div>Leverans: 5–8 arbetsdagar till postkontor</div>
                    <div className="text-slate-500">Spårning: Serverloggar (ingen pixel)</div>
                  </div>
                </div>
              ) : (
                <div className="bg-white text-[#040B16] p-4 rounded-xl text-xs space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[11px] font-bold text-[#059669]">
                      Meta CAPI · AI Agent Ready
                    </span>
                    <span className="font-bold text-emerald-700 inline-flex items-center gap-1 tabular-nums">
                      <Star className="w-3.5 h-3.5 fill-emerald-600 text-emerald-600" />
                      4.9 Trustpilot
                    </span>
                  </div>
                  <div className="font-display font-extrabold text-sm">
                    Nordic Shell Jacket (AI-matchad storlek: L)
                  </div>
                  <div className="text-slate-600">
                    Leverans imorgon 07:00 till fossilfritt paketskåp · Swish 1-klick
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                    <span className="font-mono font-extrabold text-base text-[#006AA7] tabular-nums">
                      2 695 SEK
                    </span>
                    <span className="px-3 py-1.5 rounded-lg bg-[#040B16] text-white font-semibold">
                      Betala med BankID
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
        <PageFormSlot
          forms={contactForms}
          page="historia"
          position="top"
          adBanners={adBanners}
          onSubmitted={onFormSubmitted}
          onNotify={onNotify}
        />

        <div className="inline-flex flex-wrap gap-1.5 bg-white p-1.5 rounded-xl border border-slate-200">
          {(
            [
              ['all', 'Alla epoker (1994–2027)'],
              ['90s', '1994–1999: Pionjärer & Modem'],
              ['00s', '2000–2009: Klarna & Bredband'],
              ['10s', '2010–2019: Swish & Facebook-pixeln'],
              ['20s', '2020–2027: Server-Side & Agentic AI'],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setEraFilter(key)}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                eraFilter === key
                  ? 'bg-[#040B16] text-white'
                  : 'text-slate-600 hover:text-[#040B16] hover:bg-slate-50'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <PageFormSlot
          forms={contactForms}
          page="historia"
          position="mid"
          adBanners={adBanners}
          onSubmitted={onFormSubmitted}
          onNotify={onNotify}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col justify-between space-y-4"
            >
              <div>
                <div className="flex items-center justify-between gap-2 text-xs font-mono mb-3">
                  <span className="font-bold text-[#040B16] tabular-nums">{item.year}</span>
                  <span className="text-[#059669] font-semibold">{item.badge}</span>
                </div>
                <h3 className="font-display text-xl font-extrabold text-[#040B16]">{item.title}</h3>
                <p className="text-xs sm:text-sm text-slate-600 mt-2 leading-relaxed">{item.desc}</p>
              </div>
              <div className="pt-3 border-t border-slate-100 font-mono text-[11px] text-[#006AA7] font-semibold">
                {item.stack}
              </div>
            </div>
          ))}
        </div>

        <PageFormSlot
          forms={contactForms}
          page="historia"
          position="bottom"
          adBanners={adBanners}
          onSubmitted={onFormSubmitted}
          onNotify={onNotify}
        />
      </div>
    </div>
  );
}
