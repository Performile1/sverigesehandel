import { ArrowUpRight, CheckCircle2, CreditCard } from 'lucide-react';

interface CheckoutStrategyCTAProps {
  compact?: boolean;
}

export function CheckoutStrategyCTA({ compact = false }: CheckoutStrategyCTAProps) {
  if (compact) {
    return (
      <div className="bg-[#040B16] text-white border border-slate-800 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="text-xs font-mono font-semibold text-[#FECC02] inline-flex items-center gap-1.5">
            <CreditCard className="w-3.5 h-3.5" />
            Checkoutstrategi.se · Betalning & Frakt i Kassan
          </div>
          <h3 className="font-display text-lg font-extrabold text-white">
            Vill du sänka PSP-avgifterna och öka konverteringen i kassan?
          </h3>
          <p className="text-xs text-slate-300 max-w-2xl">
            Läs djupgående analyser om nordisk betalmix (Swish, Klarna, Qliro, Walley), fraktväljare och checkout-arkitektur på checkoutstrategi.se.
          </p>
        </div>
        <a
          href="https://checkoutstrategi.se"
          target="_blank"
          rel="noopener noreferrer"
          className="px-4 py-2.5 rounded-xl bg-[#FECC02] hover:bg-[#EAB308] text-[#040B16] text-xs font-bold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
        >
          Besök checkoutstrategi.se
          <ArrowUpRight className="w-4 h-4" />
        </a>
      </div>
    );
  }

  return (
    <section className="bg-[#040B16] text-white border border-slate-800 rounded-2xl p-6 sm:p-8">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        <div className="lg:col-span-8 space-y-3">
          <div className="text-xs font-mono font-semibold text-[#FECC02]">
            Partnerresurs & Konvertering · checkoutstrategi.se
          </div>
          <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-white text-balance">
            Rätt checkoutstrategi avgör om besökaren blir kund – eller lämnar i sista steget
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-2xl">
            I svensk e-handel tappas upp till 34% av köpen när betal- och fraktvalen inte matchar kundens förväntan. På{' '}
            <a
              href="https://checkoutstrategi.se"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#FECC02] underline font-semibold hover:text-white"
            >
              checkoutstrategi.se
            </a>{' '}
            får e-handlare konkreta ramverk för PSP-upphandling, Swish-förval, fri frakt-trösklar och leveransordning.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs text-slate-200">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#10B981] shrink-0 mt-0.5" />
              <span>Benchmark av PSP-avgifter & B2C/B2B-kassor</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#10B981] shrink-0 mt-0.5" />
              <span>Optimering av Swish, BankID, Apple Pay & BNPL</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#10B981] shrink-0 mt-0.5" />
              <span>Fraktstrategi & konverteringslyft i checkout</span>
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 flex flex-col sm:flex-row lg:flex-col items-stretch sm:items-center lg:items-end justify-center gap-3">
          <a
            href="https://checkoutstrategi.se"
            target="_blank"
            rel="noopener noreferrer"
            className="px-6 py-3.5 rounded-xl bg-[#FECC02] hover:bg-[#EAB308] text-[#040B16] font-bold text-sm inline-flex items-center justify-center gap-2 transition-colors whitespace-nowrap"
          >
            Utforska checkoutstrategi.se
            <ArrowUpRight className="w-4 h-4" />
          </a>
          <span className="text-[11px] font-mono text-slate-400 text-center lg:text-right">
            Fördjupning för svenska e-handelschefer
          </span>
        </div>
      </div>
    </section>
  );
}
