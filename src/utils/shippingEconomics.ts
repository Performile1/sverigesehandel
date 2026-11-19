import type { CategoryOrderBenchmark, Merchant } from '../types';

export type ParcelVolumeTierId =
  | 'starter'
  | 'growth'
  | 'scaleup'
  | 'large'
  | 'enterprise';

export interface ParcelVolumeTier {
  id: ParcelVolumeTierId;
  label: string;
  rangeLabel: string;
  minParcels: number;
  maxParcels: number | null;
  /** Multiplier applied to national benchmark merchant shipping cost (scaleup = 1.00) */
  costMultiplier: number;
  transportFeeSek: number;
  pickPackPackagingSek: number;
  totalPerParcelSek: number;
  discountVsStarterPct: number;
  typicalMerchantRevenue: string;
  carrierAgreementNote: string;
}

export const PARCEL_VOLUME_TIERS: ParcelVolumeTier[] = [
  {
    id: 'starter',
    label: 'Uppstart / Låg volym',
    rangeLabel: 'Under 5 000 paket/år',
    minParcels: 0,
    maxParcels: 4999,
    costMultiplier: 1.26,
    transportFeeSek: 59,
    pickPackPackagingSek: 14,
    totalPerParcelSek: 73,
    discountVsStarterPct: 0,
    typicalMerchantRevenue: '< 4 M SEK',
    carrierAgreementNote: 'Listpris eller basavtal via TA-system (t.ex. Fraktjakt / Shiplink / Sendify)',
  },
  {
    id: 'growth',
    label: 'Tillväxt',
    rangeLabel: '5 000 – 24 999 paket/år',
    minParcels: 5000,
    maxParcels: 24999,
    costMultiplier: 1.11,
    transportFeeSek: 51,
    pickPackPackagingSek: 13,
    totalPerParcelSek: 64,
    discountVsStarterPct: 12,
    typicalMerchantRevenue: '4 – 22 M SEK',
    carrierAgreementNote: 'Förhandlat direktavtal med PostNord, DHL & Instabox via nShift / Ingrid',
  },
  {
    id: 'scaleup',
    label: 'Scaleup (Rikssnitt)',
    rangeLabel: '25 000 – 99 999 paket/år',
    minParcels: 25000,
    maxParcels: 99999,
    costMultiplier: 1.0,
    transportFeeSek: 46,
    pickPackPackagingSek: 12,
    totalPerParcelSek: 58,
    discountVsStarterPct: 21,
    typicalMerchantRevenue: '22 – 90 M SEK',
    carrierAgreementNote: 'Multi-carrier-upplägg (PostNord, Instabox, Budbee) med volymrabatt och returavtal',
  },
  {
    id: 'large',
    label: 'Storhandlare',
    rangeLabel: '100 000 – 499 999 paket/år',
    minParcels: 100000,
    maxParcels: 499999,
    costMultiplier: 0.86,
    transportFeeSek: 40,
    pickPackPackagingSek: 10,
    totalPerParcelSek: 50,
    discountVsStarterPct: 32,
    typicalMerchantRevenue: '90 – 450 M SEK',
    carrierAgreementNote: 'Automatiserad pall-/burlastning, direkta linjebilar och 3PL-skalfördelar',
  },
  {
    id: 'enterprise',
    label: 'Enterprise / Robotlager',
    rangeLabel: '500 000+ paket/år',
    minParcels: 500000,
    maxParcels: null,
    costMultiplier: 0.74,
    transportFeeSek: 35,
    pickPackPackagingSek: 8,
    totalPerParcelSek: 43,
    discountVsStarterPct: 41,
    typicalMerchantRevenue: '450+ M SEK',
    carrierAgreementNote: 'Egen linjetrafik till sorteringsterminaler, AutoStore-plock & skräddarsydda avtal',
  },
];

export function getVolumeTierForCount(annualParcels: number): ParcelVolumeTier {
  const safe = Math.max(0, annualParcels);
  return (
    PARCEL_VOLUME_TIERS.find(
      (t) => safe >= t.minParcels && (t.maxParcels === null || safe <= t.maxParcels)
    ) || PARCEL_VOLUME_TIERS[2]
  );
}

export function getVolumeTierById(id: ParcelVolumeTierId): ParcelVolumeTier {
  return PARCEL_VOLUME_TIERS.find((t) => t.id === id) || PARCEL_VOLUME_TIERS[2];
}

export function parseRevenueNumericM(merchant: Merchant): number {
  if (typeof merchant.revenueNumericM === 'number' && merchant.revenueNumericM > 0) {
    return merchant.revenueNumericM;
  }
  const raw = (merchant.revenue || '').toLowerCase().replace(/\s+/g, '').replace(',', '.');
  const numMatch = raw.match(/[\d.]+/);
  if (!numMatch) return 250;
  const val = parseFloat(numMatch[0]);
  if (!Number.isFinite(val) || val <= 0) return 250;
  if (raw.includes('mdr')) return val * 1000;
  return val;
}

export interface MerchantParcelEstimate {
  annualParcels: number;
  parcelsPerDay: number;
  isReportedExact: boolean;
  categoryAovSek: number;
  volumeTier: ParcelVolumeTier;
  estimatedCostPerParcelSek: number;
  estimatedAnnualFreightCostSek: number;
  estimatedAnnualFreightCostM: number;
}

export function estimateMerchantParcels(
  merchant: Merchant,
  orderBenchmarks: CategoryOrderBenchmark[]
): MerchantParcelEstimate {
  const bench =
    orderBenchmarks.find((b) => b.category === merchant.category) ||
    orderBenchmarks[0];

  const categoryAovSek = bench?.avgOrderValueSek ?? 945;
  const baseCategoryCostSek = bench?.merchantShippingCostSek ?? 58;

  let annualParcels: number;
  let isReportedExact = false;

  if (typeof merchant.annualPackages === 'number' && merchant.annualPackages > 0) {
    annualParcels = Math.round(merchant.annualPackages);
    isReportedExact = true;
  } else {
    const revM = parseRevenueNumericM(merchant);
    // Omsättning redovisas normalt exkl. moms; bransch-AOV inkluderar ~25% moms (12% för livsmedel/6% böcker).
    const vatFactor =
      merchant.category === 'Dagligvaror & Mat'
        ? 0.89
        : merchant.category === 'Böcker & Media'
        ? 0.94
        : 0.8;
    const netAovSek = Math.max(200, categoryAovSek * vatFactor);
    const estimatedOrders = (revM * 1_000_000) / netAovSek;
    // Genomsnittligt 1,06 kollin per order p.g.a. delade sändningar & utgående ersättningskollin
    const rawParcels = estimatedOrders * 1.06;
    annualParcels = Math.max(1000, Math.round(rawParcels / 1000) * 1000);
  }

  const volumeTier = getVolumeTierForCount(annualParcels);
  const estimatedCostPerParcelSek = Math.round(
    baseCategoryCostSek * volumeTier.costMultiplier
  );
  const estimatedAnnualFreightCostSek = annualParcels * estimatedCostPerParcelSek;

  return {
    annualParcels,
    parcelsPerDay: Math.round(annualParcels / 365),
    isReportedExact,
    categoryAovSek,
    volumeTier,
    estimatedCostPerParcelSek,
    estimatedAnnualFreightCostSek,
    estimatedAnnualFreightCostM: Math.round((estimatedAnnualFreightCostSek / 1_000_000) * 10) / 10,
  };
}

export function formatParcelCountCompact(count: number): string {
  if (count >= 1_000_000) {
    return `${(count / 1_000_000).toFixed(2).replace('.', ',')} milj pkt`;
  }
  return `${count.toLocaleString('sv-SE')} pkt`;
}

export function formatSekCompact(sek: number): string {
  if (sek >= 1_000_000_000) {
    return `${(sek / 1_000_000_000).toFixed(2).replace('.', ',')} mdr SEK`;
  }
  if (sek >= 1_000_000) {
    return `${(sek / 1_000_000).toFixed(1).replace('.', ',')} M SEK`;
  }
  return `${Math.round(sek).toLocaleString('sv-SE')} SEK`;
}
