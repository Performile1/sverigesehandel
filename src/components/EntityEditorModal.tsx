import { useEffect, useState } from 'react';
import { Loader2, Sparkles, X } from 'lucide-react';
import { api } from '../api';
import type { Merchant, PublishStatus, TechPartner } from '../types';

interface EntityEditorModalProps {
  open: boolean;
  mode: 'merchant' | 'partner';
  merchant?: Merchant | null;
  partner?: TechPartner | null;
  onClose: () => void;
  onSaved: () => Promise<void>;
  onNotify: (msg: string) => void;
}

export function EntityEditorModal({
  open,
  mode,
  merchant,
  partner,
  onClose,
  onSaved,
  onNotify,
}: EntityEditorModalProps) {
  const [saving, setSaving] = useState(false);
  const [enriching, setEnriching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Merchant form state
  const [mName, setMName] = useState('');
  const [mDomain, setMDomain] = useState('');
  const [mCity, setMCity] = useState('Stockholm');
  const [mRegion, setMRegion] = useState('svealand');
  const [mCategory, setMCategory] = useState('Mode & Outdoor');
  const [mTrustpilot, setMTrustpilot] = useState('4.5');
  const [mReviews, setMReviews] = useState('10 000+');
  const [mRevenue, setMRevenue] = useState('100–500M SEK');
  const [mRevenueNumericM, setMRevenueNumericM] = useState('');
  const [mAnnualPackages, setMAnnualPackages] = useState('');
  const [mYoyGrowth, setMYoyGrowth] = useState('+10% YoY');
  const [mYoyGrowthPct, setMYoyGrowthPct] = useState('10');
  const [mRevenueYear, setMRevenueYear] = useState('2025');
  const [mPlatform, setMPlatform] = useState('Centra');
  const [mPayment, setMPayment] = useState('Klarna & Swish');
  const [mCarrier, setMCarrier] = useState('PostNord, Instabox');
  const [mCerts, setMCerts] = useState('Trygg E-handel');
  const [mDesc, setMDesc] = useState('');
  const [mStatus, setMStatus] = useState<PublishStatus>('published');

  // Partner form state
  const [pName, setPName] = useState('');
  const [pDomain, setPDomain] = useState('');
  const [pCat, setPCat] = useState('E-handelsplattform');
  const [pSubType, setPSubType] = useState('E-handelsplattform');
  const [pOrigin, setPOrigin] = useState('Stockholm');
  const [pStack, setPStack] = useState('');
  const [pCustomerCount, setPCustomerCount] = useState('');
  const [pPricingModel, setPPricingModel] = useState('');
  const [pSetupTime, setPSetupTime] = useState('');
  const [pBestFor, setPBestFor] = useState('');
  const [pClients, setPClients] = useState('');
  const [pDesc, setPDesc] = useState('');
  const [pStatus, setPStatus] = useState<PublishStatus>('published');
  const [pServiceCount, setPServiceCount] = useState('');
  const [pParcelLockers, setPParcelLockers] = useState('');
  const [pPickupAgents, setPPickupAgents] = useState('');
  const [pHomeDeliveryPct, setPHomeDeliveryPct] = useState('');
  const [pAvgLeadTime, setPAvgLeadTime] = useState('');

  useEffect(() => {
    if (!open) return;
    setError(null);
    if (mode === 'merchant') {
      setMName(merchant?.name ?? '');
      setMDomain(merchant?.domain ?? '');
      setMCity(merchant?.city ?? 'Stockholm');
      setMRegion(merchant?.region ?? 'svealand');
      setMCategory(merchant?.category ?? 'Mode & Outdoor');
      setMTrustpilot(merchant ? String(merchant.trustpilot) : '4.5');
      setMReviews(merchant?.reviews ?? '10 000+');
      setMRevenue(merchant?.revenue ?? '100–500M SEK');
      setMRevenueNumericM(
        typeof merchant?.revenueNumericM === 'number' ? String(merchant.revenueNumericM) : ''
      );
      setMAnnualPackages(
        typeof merchant?.annualPackages === 'number' ? String(merchant.annualPackages) : ''
      );
      setMYoyGrowth(merchant?.yoyGrowth ?? '+10% YoY');
      setMYoyGrowthPct(
        typeof merchant?.yoyGrowthPct === 'number' ? String(merchant.yoyGrowthPct) : '10'
      );
      setMRevenueYear(merchant?.revenueYear ?? '2025');
      setMPlatform(merchant?.platform ?? 'Centra');
      setMPayment(merchant?.paymentProvider ?? 'Klarna & Swish');
      setMCarrier(merchant?.carrier ?? 'PostNord, Instabox');
      setMCerts(merchant?.certs?.join(', ') ?? 'Trygg E-handel');
      setMDesc(merchant?.desc ?? '');
      setMStatus(merchant?.status ?? 'published');
    } else {
      setPName(partner?.name ?? '');
      setPDomain(partner?.domain ?? '');
      setPCat(partner?.cat ?? 'E-handelsplattform');
      setPSubType(partner?.subType ?? partner?.cat ?? 'E-handelsplattform');
      setPOrigin(partner?.origin ?? 'Stockholm');
      setPStack(partner?.stack ?? '');
      setPCustomerCount(partner?.customerCount ?? '');
      setPPricingModel(partner?.pricingModel ?? '');
      setPSetupTime(partner?.setupTime ?? '');
      setPBestFor(partner?.bestFor ?? '');
      setPClients(partner?.notableClients?.join(', ') ?? '');
      setPDesc(partner?.desc ?? '');
      setPStatus(partner?.status ?? 'published');
      setPServiceCount(
        partner?.carrierMetrics ? String(partner.carrierMetrics.serviceCount) : ''
      );
      setPParcelLockers(
        partner?.carrierMetrics ? String(partner.carrierMetrics.parcelLockers) : ''
      );
      setPPickupAgents(
        partner?.carrierMetrics ? String(partner.carrierMetrics.pickupAgents) : ''
      );
      setPHomeDeliveryPct(
        partner?.carrierMetrics ? String(partner.carrierMetrics.homeDeliveryPct) : ''
      );
      setPAvgLeadTime(partner?.carrierMetrics?.avgLeadTime ?? '');
    }
  }, [open, mode, merchant, partner]);

  if (!open) return null;

  async function handleEnrich() {
    const name = mode === 'merchant' ? mName.trim() : pName.trim();
    const domain = mode === 'merchant' ? mDomain.trim() : pDomain.trim();
    if (!name) {
      setError('Fyll i företagsnamn först för att hämta data med AI.');
      return;
    }
    setEnriching(true);
    setError(null);
    try {
      const res = await api.enrich({ target: mode, name, domain });
      const d = res.data;
      if (mode === 'merchant') {
        if (typeof d.name === 'string') setMName(d.name);
        if (typeof d.domain === 'string') setMDomain(d.domain);
        if (typeof d.city === 'string') setMCity(d.city);
        if (typeof d.region === 'string') setMRegion(d.region);
        if (typeof d.category === 'string') setMCategory(d.category);
        if (typeof d.trustpilot === 'number') setMTrustpilot(String(d.trustpilot));
        if (typeof d.reviews === 'string') setMReviews(d.reviews);
        if (typeof d.revenue === 'string') setMRevenue(d.revenue);
        if (typeof d.revenueNumericM === 'number') setMRevenueNumericM(String(d.revenueNumericM));
        if (typeof d.yoyGrowth === 'string') setMYoyGrowth(d.yoyGrowth);
        if (typeof d.yoyGrowthPct === 'number') setMYoyGrowthPct(String(d.yoyGrowthPct));
        if (typeof d.revenueYear === 'string') setMRevenueYear(d.revenueYear);
        if (typeof d.platform === 'string') setMPlatform(d.platform);
        if (typeof d.paymentProvider === 'string') setMPayment(d.paymentProvider);
        if (typeof d.carrier === 'string') setMCarrier(d.carrier);
        if (Array.isArray(d.certs)) setMCerts(d.certs.join(', '));
        if (typeof d.desc === 'string') setMDesc(d.desc);
      } else {
        if (typeof d.name === 'string') setPName(d.name);
        if (typeof d.domain === 'string') setPDomain(d.domain);
        if (typeof d.cat === 'string') setPCat(d.cat);
        if (typeof d.subType === 'string') setPSubType(d.subType);
        if (typeof d.origin === 'string') setPOrigin(d.origin);
        if (typeof d.stack === 'string') setPStack(d.stack);
        if (typeof d.customerCount === 'string') setPCustomerCount(d.customerCount);
        if (typeof d.pricingModel === 'string') setPPricingModel(d.pricingModel);
        if (typeof d.setupTime === 'string') setPSetupTime(d.setupTime);
        if (typeof d.bestFor === 'string') setPBestFor(d.bestFor);
        if (Array.isArray(d.notableClients)) setPClients(d.notableClients.join(', '));
        if (typeof d.desc === 'string') setPDesc(d.desc);
      }
      onNotify(`Hämtade uppdaterad företagsdata för ${name}.`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setEnriching(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (mode === 'merchant') {
        const parsedRevM = Number(mRevenueNumericM);
        const parsedPackages = Number(mAnnualPackages);
        const parsedGrowth = Number(mYoyGrowthPct);
        await api.upsertMerchant({
          id: merchant?.id,
          name: mName.trim(),
          domain: mDomain.trim(),
          city: mCity.trim(),
          region: mRegion,
          category: mCategory,
          trustpilot: Number(mTrustpilot) || 4.4,
          reviews: mReviews.trim(),
          revenue: mRevenue.trim(),
          revenueNumericM: Number.isFinite(parsedRevM) && parsedRevM > 0 ? parsedRevM : undefined,
          annualPackages: Number.isFinite(parsedPackages) && parsedPackages > 0 ? parsedPackages : undefined,
          yoyGrowth: mYoyGrowth.trim() || undefined,
          yoyGrowthPct: Number.isFinite(parsedGrowth) ? parsedGrowth : undefined,
          revenueYear: mRevenueYear.trim() || undefined,
          platform: mPlatform.trim(),
          paymentProvider: mPayment.trim(),
          carrier: mCarrier.trim(),
          certs: mCerts
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
          desc: mDesc.trim(),
          status: mStatus,
        });
        onNotify(merchant ? `${mName} uppdaterad i CMS.` : `${mName} tillagd i CMS.`);
      } else {
        const hasCarrierMetricsInput =
          pSubType === 'Transportör' &&
          (pServiceCount !== '' || pParcelLockers !== '' || pPickupAgents !== '' || pHomeDeliveryPct !== '');
        const carrierMetrics = hasCarrierMetricsInput
          ? {
              ...(partner?.carrierMetrics || {}),
              serviceCount: Number(pServiceCount) || 0,
              parcelLockers: Number(pParcelLockers) || 0,
              pickupAgents: Number(pPickupAgents) || 0,
              homeDeliveryPct: Number(pHomeDeliveryPct) || 0,
              avgLeadTime: pAvgLeadTime.trim() || partner?.carrierMetrics?.avgLeadTime,
            }
          : partner?.carrierMetrics;

        await api.upsertPartner({
          id: partner?.id,
          name: pName.trim(),
          domain: pDomain.trim(),
          cat: pCat,
          subType: pSubType.trim() || undefined,
          origin: pOrigin.trim(),
          stack: pStack.trim(),
          customerCount: pCustomerCount.trim() || undefined,
          pricingModel: pPricingModel.trim() || undefined,
          setupTime: pSetupTime.trim() || undefined,
          bestFor: pBestFor.trim() || undefined,
          carrierMetrics,
          notableClients: pClients
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
          desc: pDesc.trim(),
          status: pStatus,
        });
        onNotify(partner ? `${pName} uppdaterad i CMS.` : `${pName} tillagd i CMS.`);
      }
      await onSaved();
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-[#040B16]/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col border border-slate-200 overflow-hidden shadow-2xl">
        <div className="px-6 py-4 bg-[#040B16] text-white flex items-center justify-between">
          <div>
            <h2 className="font-display text-lg font-bold">
              {mode === 'merchant'
                ? merchant
                  ? `Redigera e-handlare: ${merchant.name}`
                  : 'Lägg till ny e-handlare'
                : partner
                ? `Redigera tech-partner: ${partner.name}`
                : 'Lägg till ny tech-partner'}
            </h2>
            <p className="text-xs text-slate-400">
              Fyll i uppgifter manuellt eller hämta verifierad företagsdata via AI.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
            aria-label="Stäng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-medium">
              {error}
            </div>
          )}

          {mode === 'merchant' ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Butiksnamn *
                  </label>
                  <input
                    type="text"
                    required
                    value={mName}
                    onChange={(e) => setMName(e.target.value)}
                    placeholder="T.ex. Gymgrossisten"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-[#006AA7] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Domän
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={mDomain}
                      onChange={(e) => setMDomain(e.target.value)}
                      placeholder="gymgrossisten.com"
                      className="flex-1 px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-[#006AA7] focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleEnrich}
                      disabled={enriching}
                      className="px-3 py-2 rounded-xl bg-[#FECC02] hover:bg-[#EAB308] text-[#040B16] text-xs font-bold inline-flex items-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-50"
                      title="Sök webben och fyll i fälten automatiskt"
                    >
                      {enriching ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Sparkles className="w-3.5 h-3.5" />
                      )}
                      Hämta data
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Stad</label>
                  <input
                    type="text"
                    value={mCity}
                    onChange={(e) => setMCity(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Bransch</label>
                  <select
                    value={mCategory}
                    onChange={(e) => setMCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white"
                  >
                    <option>Apotek & Skönhet</option>
                    <option>Hemelektronik</option>
                    <option>Mode & Outdoor</option>
                    <option>Hem & Inredning</option>
                    <option>Sport & Fritid</option>
                    <option>Böcker & Media</option>
                    <option>Dagligvaror & Mat</option>
                    <option>Barn & Familj</option>
                    <option>Övrigt</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Region</label>
                  <select
                    value={mRegion}
                    onChange={(e) => setMRegion(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white"
                  >
                    <option value="svealand">Svealand</option>
                    <option value="vast">Västsverige</option>
                    <option value="smaland">Småland & Östergötland</option>
                    <option value="syd">Sydsverige</option>
                    <option value="norrland">Norrland</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Trustpilot (1.0–5.0)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    max="5"
                    value={mTrustpilot}
                    onChange={(e) => setMTrustpilot(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Antal omdömen
                  </label>
                  <input
                    type="text"
                    value={mReviews}
                    onChange={(e) => setMReviews(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Omsättning
                  </label>
                  <input
                    type="text"
                    value={mRevenue}
                    onChange={(e) => setMRevenue(e.target.value)}
                    placeholder="t.ex. 3 400 MSEK"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tillväxt (YoY)
                  </label>
                  <input
                    type="text"
                    value={mYoyGrowth}
                    onChange={(e) => setMYoyGrowth(e.target.value)}
                    placeholder="t.ex. +14% YoY"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Omsättning (MSEK)
                  </label>
                  <input
                    type="number"
                    value={mRevenueNumericM}
                    onChange={(e) => setMRevenueNumericM(e.target.value)}
                    placeholder="t.ex. 3400"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Paket / år (valfritt)
                  </label>
                  <input
                    type="number"
                    value={mAnnualPackages}
                    onChange={(e) => setMAnnualPackages(e.target.value)}
                    placeholder="Auto via AOV"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Bokslutsår
                  </label>
                  <input
                    type="text"
                    value={mRevenueYear}
                    onChange={(e) => setMRevenueYear(e.target.value)}
                    placeholder="2025"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    E-handelsplattform
                  </label>
                  <input
                    type="text"
                    value={mPlatform}
                    onChange={(e) => setMPlatform(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Betallösning
                  </label>
                  <input
                    type="text"
                    value={mPayment}
                    onChange={(e) => setMPayment(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Transportörer
                  </label>
                  <input
                    type="text"
                    value={mCarrier}
                    onChange={(e) => setMCarrier(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Certifieringar (komma-separerat)
                  </label>
                  <input
                    type="text"
                    value={mCerts}
                    onChange={(e) => setMCerts(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Status</label>
                  <select
                    value={mStatus}
                    onChange={(e) => setMStatus(e.target.value as PublishStatus)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white"
                  >
                    <option value="published">Publicerad</option>
                    <option value="draft">Utkast</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Beskrivning
                </label>
                <textarea
                  rows={3}
                  value={mDesc}
                  onChange={(e) => setMDesc(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm"
                />
              </div>
            </>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Partnernamn *
                  </label>
                  <input
                    type="text"
                    required
                    value={pName}
                    onChange={(e) => setPName(e.target.value)}
                    placeholder="T.ex. Askås"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-[#006AA7] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Domän
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={pDomain}
                      onChange={(e) => setPDomain(e.target.value)}
                      placeholder="askas.se"
                      className="flex-1 px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-[#006AA7] focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleEnrich}
                      disabled={enriching}
                      className="px-3 py-2 rounded-xl bg-[#FECC02] hover:bg-[#EAB308] text-[#040B16] text-xs font-bold inline-flex items-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-50"
                      title="Sök webben och fyll i fälten automatiskt"
                    >
                      {enriching ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Sparkles className="w-3.5 h-3.5" />
                      )}
                      Hämta data
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Kategori
                  </label>
                  <select
                    value={pCat}
                    onChange={(e) => setPCat(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white"
                  >
                    <option>E-handelsplattform</option>
                    <option>Betalning & Checkout</option>
                    <option>Logistik & Last-mile</option>
                    <option>MarTech & AI</option>
                    <option>ERP & Omnichannel</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Huvudkontor / Stad
                  </label>
                  <input
                    type="text"
                    value={pOrigin}
                    onChange={(e) => setPOrigin(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Status</label>
                  <select
                    value={pStatus}
                    onChange={(e) => setPStatus(e.target.value as PublishStatus)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white"
                  >
                    <option value="published">Publicerad</option>
                    <option value="draft">Utkast</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Subtyp (för Jämför-sidor)
                  </label>
                  <select
                    value={pSubType}
                    onChange={(e) => setPSubType(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white"
                  >
                    <option value="Betalning & Checkout">Betalning & Checkout</option>
                    <option value="Transportör">Transportör</option>
                    <option value="TA-system">TA-system</option>
                    <option value="3PL & Returer">3PL & Returer</option>
                    <option value="E-handelsplattform">E-handelsplattform</option>
                    <option value="MarTech & AI">MarTech & AI</option>
                    <option value="ERP & Omnichannel">ERP & Omnichannel</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Antal kunder
                  </label>
                  <input
                    type="text"
                    value={pCustomerCount}
                    onChange={(e) => setPCustomerCount(e.target.value)}
                    placeholder="t.ex. 25 000+ nordiska e-handlare"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Prismodell
                  </label>
                  <input
                    type="text"
                    value={pPricingModel}
                    onChange={(e) => setPPricingModel(e.target.value)}
                    placeholder="t.ex. Från 1,49% / transaktion"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Implementationstid
                  </label>
                  <input
                    type="text"
                    value={pSetupTime}
                    onChange={(e) => setPSetupTime(e.target.value)}
                    placeholder="t.ex. 1–2 veckor"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Passar bäst för
                  </label>
                  <input
                    type="text"
                    value={pBestFor}
                    onChange={(e) => setPBestFor(e.target.value)}
                    placeholder="t.ex. Scaleup & Enterprise"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs"
                  />
                </div>
              </div>

              {pSubType === 'Transportör' && (
                <div className="p-3.5 rounded-xl bg-[#F4F6F9] border border-slate-200 space-y-2.5">
                  <div className="text-xs font-bold text-[#040B16]">
                    Transportörsdata (tjänster, paketskåp, ombud &amp; hemleverans)
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Tjänster (st)
                      </label>
                      <input
                        type="number"
                        value={pServiceCount}
                        onChange={(e) => setPServiceCount(e.target.value)}
                        placeholder="9"
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Paketskåp
                      </label>
                      <input
                        type="number"
                        value={pParcelLockers}
                        onChange={(e) => setPParcelLockers(e.target.value)}
                        placeholder="5000"
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Ombud
                      </label>
                      <input
                        type="number"
                        value={pPickupAgents}
                        onChange={(e) => setPPickupAgents(e.target.value)}
                        placeholder="1900"
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Hemlev. (%)
                      </label>
                      <input
                        type="number"
                        value={pHomeDeliveryPct}
                        onChange={(e) => setPHomeDeliveryPct(e.target.value)}
                        placeholder="100"
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Ledtid
                      </label>
                      <input
                        type="text"
                        value={pAvgLeadTime}
                        onChange={(e) => setPAvgLeadTime(e.target.value)}
                        placeholder="1–2 vardagar"
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tech-stack / Kompetenser
                </label>
                <input
                  type="text"
                  value={pStack}
                  onChange={(e) => setPStack(e.target.value)}
                  placeholder="Headless · PIM · Multi-market"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Exempelkunder (komma-separerat)
                </label>
                <input
                  type="text"
                  value={pClients}
                  onChange={(e) => setPClients(e.target.value)}
                  placeholder="Apotea, Lyko, RevolutionRace"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Beskrivning
                </label>
                <textarea
                  rows={3}
                  value={pDesc}
                  onChange={(e) => setPDesc(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm"
                />
              </div>
            </>
          )}

          <div className="pt-4 border-t border-slate-200 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
            >
              Avbryt
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 rounded-xl bg-[#040B16] hover:bg-[#006AA7] disabled:opacity-50 text-white text-xs font-bold inline-flex items-center gap-2 cursor-pointer"
            >
              {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Spara i CMS
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
