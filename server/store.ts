import { AsyncLocalStorage } from 'node:async_hooks';
import fs from 'fs';
import path from 'path';
import type {
  AdBanner,
  CategoryOrderBenchmark,
  CMSStore,
  CommunityMember,
  CommunityThread,
  ContactMessage,
  DCSession,
  DeliveryStatsData,
  EcommerceEvent,
  EcommerceJob,
  EcommerceLaw,
  EcommerceNewsItem,
  JobValidityStatus,
  LogisticsProvider,
  MarketIntelligenceSource,
  Merchant,
  PageContentMap,
  PaketindexData,
  RecruitmentSite,
  RegionMetric,
  ShippingCostTier,
  TechPartner,
  TechStackShare,
  TimelineMilestone,
} from '../src/types.ts';
import { INITIAL_CMS_DATA } from './seedData.ts';
import { upgradeSnapshot } from './snapshot.ts';

// Keep each Firestore transaction's synchronous domain operations isolated.
// The file adapter below remains available for the original local data tooling.
const requestStore = new AsyncLocalStorage<{ store: CMSStore; changed: boolean }>();

export function withStore<T>(store: CMSStore, operation: () => T) {
  const state = { store: structuredClone(store), changed: false };
  const value = requestStore.run(state, operation);
  return { value, ...state };
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'cms-db.json');
let memoryFallbackStore: CMSStore | null = null;

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function defaultExpiryIso(daysAhead = 45): string {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  return d.toISOString().slice(0, 10);
}

function isValidHttpsUrl(url: string | undefined): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url.trim());
    return (
      (parsed.protocol === 'https:' || parsed.protocol === 'http:') &&
      parsed.hostname.includes('.') &&
      !parsed.hostname.includes('example.') &&
      !parsed.hostname.includes('localhost')
    );
  } catch {
    return false;
  }
}

function evaluateJobValidity(job: EcommerceJob, today: string): {
  jobStatus: JobValidityStatus;
  status: 'published' | 'draft';
  validationNote: string;
} {
  if (job.jobStatus === 'closed') {
    return {
      jobStatus: 'closed',
      status: 'draft',
      validationNote: job.validationNote || 'Stängd av redaktör',
    };
  }

  const textBlob = `${job.title} ${job.desc} ${job.postedAt}`.toLowerCase();
  if (
    textBlob.includes('tillsatt') ||
    textBlob.includes('stängd annons') ||
    textBlob.includes('ansökningstid passerad') ||
    textBlob.includes('utgången')
  ) {
    return {
      jobStatus: 'expired',
      status: 'draft',
      validationNote: 'Stängd automatiskt: annonsen markerad som utgången/tillsatt',
    };
  }

  if (job.expiresAt && /^\d{4}-\d{2}-\d{2}$/.test(job.expiresAt) && job.expiresAt < today) {
    return {
      jobStatus: 'expired',
      status: 'draft',
      validationNote: `Stängd automatiskt: sista ansökningsdag passerad (${job.expiresAt})`,
    };
  }

  if (!isValidHttpsUrl(job.applyUrl)) {
    return {
      jobStatus: 'expired',
      status: 'draft',
      validationNote: 'Stängd automatiskt: ogiltig eller saknad ansökningslänk',
    };
  }

  return {
    jobStatus: 'active',
    status: job.status === 'draft' ? 'draft' : 'published',
    validationNote: job.validationNote || 'Aktiv annons · verifierad länk',
  };
}

function mergeSeedMerchants(existing: Merchant[]): { list: Merchant[]; changed: boolean } {
  const seedById = new Map(INITIAL_CMS_DATA.merchants.map((m) => [m.id, m]));
  let changed = false;

  const updatedExisting = existing.map((m) => {
    const seed = seedById.get(m.id);
    if (!seed) return m;
    if (!m.yoyGrowth || !m.revenueNumericM) {
      changed = true;
      return {
        ...seed,
        ...m,
        revenue: m.revenue.includes('>') || m.revenue.includes('–') ? seed.revenue : m.revenue,
        revenueNumericM: m.revenueNumericM ?? seed.revenueNumericM,
        yoyGrowth: m.yoyGrowth ?? seed.yoyGrowth,
        yoyGrowthPct: m.yoyGrowthPct ?? seed.yoyGrowthPct,
        revenueYear: m.revenueYear ?? seed.revenueYear,
      };
    }
    return m;
  });

  const existingKeys = new Set(
    updatedExisting.flatMap((m) => [m.id.toLowerCase(), m.name.toLowerCase(), m.domain.toLowerCase()])
  );
  const toAdd = INITIAL_CMS_DATA.merchants.filter(
    (s) =>
      !existingKeys.has(s.id.toLowerCase()) &&
      !existingKeys.has(s.name.toLowerCase()) &&
      !existingKeys.has(s.domain.toLowerCase())
  );

  if (toAdd.length > 0) changed = true;
  return { list: [...updatedExisting, ...toAdd], changed };
}

function mergeSeedPartners(existing: TechPartner[]): { list: TechPartner[]; changed: boolean } {
  const seedById = new Map(INITIAL_CMS_DATA.partners.map((p) => [p.id, p]));
  let changed = false;

  const updatedExisting = existing.map((p) => {
    const seed = seedById.get(p.id);
    if (!seed) return p;
    const isCarrier = p.subType === 'Transportör' || seed.subType === 'Transportör';
    const needsUpgrade = isCarrier
      ? Boolean(p.customerCount) ||
        !p.carrierMetrics ||
        !p.carrierMetrics.weightLimits ||
        !p.carrierMetrics.websiteUrl ||
        !p.carrierMetrics.integrations ||
        (p.id === 'p-iboxen' && p.carrierMetrics.homeDeliveryPct === 70) ||
        (p.id === 'p-dhl' && p.carrierMetrics.parcelLockers === 1100)
      : !p.customerCount || !p.subType || !p.pricingModel;

    if (needsUpgrade) {
      changed = true;
      const next: TechPartner = {
        ...seed,
        ...p,
        subType: p.subType ?? seed.subType,
        pricingModel: p.pricingModel ?? seed.pricingModel,
        setupTime: p.setupTime ?? seed.setupTime,
        bestFor: p.bestFor ?? seed.bestFor,
        keyStrengths: p.keyStrengths && p.keyStrengths.length > 0 ? p.keyStrengths : seed.keyStrengths,
        carrierMetrics: seed.carrierMetrics
          ? {
              ...seed.carrierMetrics,
              ...(p.carrierMetrics ?? {}),
              parcelLockers:
                p.id === 'p-dhl' && p.carrierMetrics?.parcelLockers === 1100
                  ? 750
                  : p.carrierMetrics?.parcelLockers ?? seed.carrierMetrics.parcelLockers,
              homeDeliveryPct:
                p.id === 'p-iboxen' && p.carrierMetrics?.homeDeliveryPct === 70
                  ? 0
                  : p.carrierMetrics?.homeDeliveryPct ?? seed.carrierMetrics.homeDeliveryPct,
              lockerNote: p.carrierMetrics?.lockerNote ?? seed.carrierMetrics.lockerNote,
              weightLimits: p.carrierMetrics?.weightLimits ?? seed.carrierMetrics.weightLimits,
              dimensionLimits: p.carrierMetrics?.dimensionLimits ?? seed.carrierMetrics.dimensionLimits,
              websiteUrl: p.carrierMetrics?.websiteUrl ?? seed.carrierMetrics.websiteUrl,
              integrations:
                p.carrierMetrics?.integrations && p.carrierMetrics.integrations.length > 0
                  ? p.carrierMetrics.integrations
                  : seed.carrierMetrics.integrations,
            }
          : p.carrierMetrics,
      };
      if (isCarrier) {
        delete next.customerCount;
      } else {
        next.customerCount = p.customerCount ?? seed.customerCount;
      }
      return next;
    }
    return p;
  });

  const existingKeys = new Set(
    updatedExisting.flatMap((p) => [p.id.toLowerCase(), p.name.toLowerCase(), p.domain.toLowerCase()])
  );
  const toAdd = INITIAL_CMS_DATA.partners.filter(
    (s) =>
      !existingKeys.has(s.id.toLowerCase()) &&
      !existingKeys.has(s.name.toLowerCase()) &&
      !existingKeys.has(s.domain.toLowerCase())
  );

  if (toAdd.length > 0) changed = true;
  return { list: [...updatedExisting, ...toAdd], changed };
}

function mergeAndValidateJobs(existing: EcommerceJob[]): { list: EcommerceJob[]; changed: boolean } {
  const seedById = new Map(INITIAL_CMS_DATA.jobs.map((j) => [j.id, j]));
  const today = todayIso();
  let changed = false;

  const updatedExisting = existing.map((j) => {
    const seed = seedById.get(j.id);
    const merged: EcommerceJob = seed
      ? {
          ...seed,
          ...j,
          expiresAt: j.expiresAt ?? seed.expiresAt,
          verifiedAt: j.verifiedAt ?? seed.verifiedAt,
        }
      : {
          ...j,
          expiresAt: j.expiresAt ?? defaultExpiryIso(45),
          verifiedAt: j.verifiedAt ?? today,
        };

    const check = evaluateJobValidity(merged, today);
    if (
      merged.jobStatus !== check.jobStatus ||
      merged.status !== check.status ||
      merged.validationNote !== check.validationNote
    ) {
      changed = true;
    }

    return {
      ...merged,
      jobStatus: check.jobStatus,
      status: check.status,
      validationNote: check.validationNote,
    };
  });

  const existingIds = new Set(updatedExisting.map((j) => j.id));
  const missingSeed = INITIAL_CMS_DATA.jobs.filter((s) => !existingIds.has(s.id));
  if (missingSeed.length > 0) changed = true;

  return { list: [...updatedExisting, ...missingSeed], changed };
}

function ensureStoreFile(): CMSStore {
  const state = requestStore.getStore();
  if (state) return state.store;
  if (memoryFallbackStore && !fs.existsSync(DB_FILE)) {
    return memoryFallbackStore;
  }
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(DB_FILE)) {
      fs.writeFileSync(DB_FILE, JSON.stringify(INITIAL_CMS_DATA, null, 2), 'utf-8');
      return structuredClone(INITIAL_CMS_DATA);
    }
  } catch {
    if (!memoryFallbackStore) memoryFallbackStore = structuredClone(INITIAL_CMS_DATA);
    return memoryFallbackStore;
  }
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    const parsed = JSON.parse(raw) as Partial<CMSStore>;

    const baseMerchants = Array.isArray(parsed.merchants) ? parsed.merchants : INITIAL_CMS_DATA.merchants;
    const basePartners = Array.isArray(parsed.partners) ? parsed.partners : INITIAL_CMS_DATA.partners;
    const baseJobs =
      Array.isArray(parsed.jobs) && parsed.jobs.length > 0 ? parsed.jobs : INITIAL_CMS_DATA.jobs;

    const mergedMerchants = mergeSeedMerchants(baseMerchants);
    const mergedPartners = mergeSeedPartners(basePartners);
    const mergedJobs = mergeAndValidateJobs(baseJobs);

    const baseLogistics = Array.isArray(parsed.logisticsProviders)
      ? parsed.logisticsProviders
      : INITIAL_CMS_DATA.logisticsProviders;
    const hadDream = baseLogistics.some(
      (l) => l.id === 'lp-dreamlogistics' || l.name.toLowerCase() === 'dreamlogistics'
    );
    const seedShelfless = INITIAL_CMS_DATA.logisticsProviders.find((s) => s.id === 'lp-shelfless');
    let shelflessUpgraded = false;
    const cleanedLogistics = baseLogistics
      .filter((l) => l.id !== 'lp-dreamlogistics' && l.name.toLowerCase() !== 'dreamlogistics')
      .map((l) => {
        if (
          l.id === 'lp-shelfless' &&
          seedShelfless &&
          !l.desc.includes('tidigare DreamLogistics')
        ) {
          shelflessUpgraded = true;
          return { ...seedShelfless, updatedAt: l.updatedAt };
        }
        return l;
      });
    const existingLogIds = new Set(cleanedLogistics.map((l) => l.id));
    const missingSeedLogistics = INITIAL_CMS_DATA.logisticsProviders.filter(
      (s) => !existingLogIds.has(s.id)
    );
    const mergedLogistics = [...cleanedLogistics, ...missingSeedLogistics];
    const logisticsChanged =
      hadDream || shelflessUpgraded || missingSeedLogistics.length > 0 || !parsed.logisticsProviders;

    const rawRegions = parsed.regions ?? INITIAL_CMS_DATA.regions;
    let regionsChanged = !parsed.regions;
    const mergedRegions: Record<string, RegionMetric> = { ...rawRegions };
    for (const [key, seedReg] of Object.entries(INITIAL_CMS_DATA.regions)) {
      const existingReg = mergedRegions[key];
      if (!existingReg) {
        mergedRegions[key] = seedReg;
        regionsChanged = true;
      } else if (
        existingReg.populationDensityPerKm2 === undefined ||
        existingReg.lockersPer10kResidents === undefined ||
        existingReg.homeDeliveryEveningPct === undefined
      ) {
        mergedRegions[key] = { ...seedReg, ...existingReg };
        regionsChanged = true;
      }
    }

    const rawDelivery = parsed.deliveryStats;
    const deliveryChanged =
      !rawDelivery ||
      !Array.isArray(rawDelivery.carrierCoverage) ||
      rawDelivery.carrierCoverage.length === 0 ||
      !Array.isArray(rawDelivery.lockerNetworks) ||
      rawDelivery.lockerNetworks.length === 0;
    const mergedDelivery: DeliveryStatsData = rawDelivery
      ? {
          ...INITIAL_CMS_DATA.deliveryStats,
          ...rawDelivery,
          carrierCoverage:
            Array.isArray(rawDelivery.carrierCoverage) && rawDelivery.carrierCoverage.length > 0
              ? rawDelivery.carrierCoverage
              : INITIAL_CMS_DATA.deliveryStats.carrierCoverage,
          lockerNetworks:
            Array.isArray(rawDelivery.lockerNetworks) && rawDelivery.lockerNetworks.length > 0
              ? rawDelivery.lockerNetworks
              : INITIAL_CMS_DATA.deliveryStats.lockerNetworks,
        }
      : INITIAL_CMS_DATA.deliveryStats;

    const upgradedRaw = upgradeSnapshot(parsed) as Partial<CMSStore>;
    const hydrated: CMSStore = {
      schemaVersion: 3,
      merchants: mergedMerchants.list,
      partners: mergedPartners.list,
      logisticsProviders: mergedLogistics,
      news: Array.isArray(upgradedRaw.news) ? upgradedRaw.news : INITIAL_CMS_DATA.news,
      events:
        Array.isArray(upgradedRaw.events) && upgradedRaw.events.length > 0
          ? upgradedRaw.events
          : INITIAL_CMS_DATA.events,
      sessions: upgradedRaw.sessions ?? INITIAL_CMS_DATA.sessions,
      jobs: mergedJobs.list,
      recruitmentSites:
        Array.isArray(upgradedRaw.recruitmentSites) && upgradedRaw.recruitmentSites.length > 0
          ? upgradedRaw.recruitmentSites
          : INITIAL_CMS_DATA.recruitmentSites,
      regions: mergedRegions,
      orderBenchmarks:
        Array.isArray(upgradedRaw.orderBenchmarks) && upgradedRaw.orderBenchmarks.length > 0
          ? upgradedRaw.orderBenchmarks
          : INITIAL_CMS_DATA.orderBenchmarks,
      shippingTiers:
        Array.isArray(upgradedRaw.shippingTiers) && upgradedRaw.shippingTiers.length > 0
          ? upgradedRaw.shippingTiers
          : INITIAL_CMS_DATA.shippingTiers,
      deliveryStats: mergedDelivery,
      paketindex:
        upgradedRaw.paketindex && typeof upgradedRaw.paketindex === 'object'
          ? upgradedRaw.paketindex
          : INITIAL_CMS_DATA.paketindex,
      pageContent:
        upgradedRaw.pageContent && typeof upgradedRaw.pageContent === 'object'
          ? { ...INITIAL_CMS_DATA.pageContent, ...upgradedRaw.pageContent }
          : INITIAL_CMS_DATA.pageContent,
      laws:
        Array.isArray(upgradedRaw.laws) && upgradedRaw.laws.length > 0
          ? upgradedRaw.laws
          : INITIAL_CMS_DATA.laws,
      intelligenceSources:
        Array.isArray(upgradedRaw.intelligenceSources) && upgradedRaw.intelligenceSources.length > 0
          ? upgradedRaw.intelligenceSources
          : INITIAL_CMS_DATA.intelligenceSources,
      techStackShares:
        Array.isArray(upgradedRaw.techStackShares) && upgradedRaw.techStackShares.length > 0
          ? upgradedRaw.techStackShares
          : INITIAL_CMS_DATA.techStackShares,
      adBanners:
        Array.isArray(upgradedRaw.adBanners) && upgradedRaw.adBanners.length > 0
          ? upgradedRaw.adBanners
          : INITIAL_CMS_DATA.adBanners,
      contactMessages: Array.isArray(upgradedRaw.contactMessages) ? upgradedRaw.contactMessages : [],
      timeline: upgradedRaw.timeline ?? INITIAL_CMS_DATA.timeline,
      communityThreads: upgradedRaw.communityThreads ?? INITIAL_CMS_DATA.communityThreads,
      communityMembers: upgradedRaw.communityMembers ?? [],
      updatedAt: upgradedRaw.updatedAt ?? new Date().toISOString(),
    };

    const rawReceptionLegacy = mergedDelivery.receptionChannels?.some(
      (c) => c.id === 'rc-locker' && c.sharePct === 46
    );
    if (rawReceptionLegacy && upgradedRaw.deliveryStats?.receptionChannels) {
      hydrated.deliveryStats = {
        ...hydrated.deliveryStats,
        receptionChannels: upgradedRaw.deliveryStats.receptionChannels,
      };
    }

    if (
      mergedMerchants.changed ||
      mergedPartners.changed ||
      mergedJobs.changed ||
      regionsChanged ||
      deliveryChanged ||
      (parsed.schemaVersion ?? 1) < 3 ||
      !parsed.paketindex ||
      !parsed.pageContent ||
      !parsed.news ||
      !parsed.events ||
      !parsed.jobs ||
      !parsed.recruitmentSites ||
      !parsed.orderBenchmarks ||
      !parsed.shippingTiers ||
      !parsed.laws ||
      !parsed.intelligenceSources ||
      !parsed.techStackShares ||
      !parsed.adBanners ||
      logisticsChanged
    ) {
      try {
        fs.writeFileSync(DB_FILE, JSON.stringify(hydrated, null, 2), 'utf-8');
      } catch {
        memoryFallbackStore = hydrated;
      }
    }
    return hydrated;
  } catch {
    const fresh = structuredClone(INITIAL_CMS_DATA);
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(fresh, null, 2), 'utf-8');
    } catch {
      memoryFallbackStore = fresh;
    }
    return fresh;
  }
}

function saveStore(store: CMSStore): CMSStore {
  const state = requestStore.getStore();
  if (state) {
    store.updatedAt = new Date().toISOString();
    state.store = store;
    state.changed = true;
    return store;
  }
  store.updatedAt = new Date().toISOString();
  memoryFallbackStore = store;
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(store, null, 2), 'utf-8');
  } catch {
    // Keep memoryFallbackStore in read-only environments
  }
  return store;
}

export function getStore(): CMSStore {
  return ensureStoreFile();
}

export function replaceStore(newStore: CMSStore): CMSStore {
  return saveStore(newStore);
}

export function resetStore(): CMSStore {
  return saveStore({ ...structuredClone(INITIAL_CMS_DATA), contactMessages: [], communityMembers: [] });
}

export function upsertMerchant(input: Partial<Merchant> & { name: string }): { merchant: Merchant; created: boolean } {
  const store = ensureStoreFile();
  const now = new Date().toISOString();
  const cleanName = input.name.trim();
  const cleanDomain = (input.domain || '').trim().toLowerCase();

  const existingIdx = store.merchants.findIndex(
    (m) =>
      (input.id && m.id === input.id) ||
      m.name.toLowerCase() === cleanName.toLowerCase() ||
      (cleanDomain && m.domain.toLowerCase() === cleanDomain)
  );

  if (existingIdx >= 0) {
    const existing = store.merchants[existingIdx];
    const updated: Merchant = {
      ...existing,
      ...input,
      id: existing.id,
      name: cleanName || existing.name,
      domain: cleanDomain || existing.domain,
      annualPackages:
        'annualPackages' in input
          ? typeof input.annualPackages === 'number' && input.annualPackages > 0
            ? Math.round(input.annualPackages)
            : undefined
          : existing.annualPackages,
      updatedAt: now,
    };
    store.merchants[existingIdx] = updated;
    saveStore(store);
    return { merchant: updated, created: false };
  }

  const created: Merchant = {
    id: input.id || `m-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: cleanName,
    domain: cleanDomain || `${cleanName.toLowerCase().replace(/[^a-z0-9]/g, '')}.se`,
    city: input.city?.trim() || 'Stockholm',
    region: input.region || 'svealand',
    category: input.category || 'Övrigt',
    trustpilot: typeof input.trustpilot === 'number' ? input.trustpilot : 4.5,
    reviews: input.reviews || '1 000+',
    revenue: input.revenue || '100–500M SEK',
    revenueNumericM: input.revenueNumericM,
    annualPackages:
      typeof input.annualPackages === 'number' && input.annualPackages > 0
        ? Math.round(input.annualPackages)
        : undefined,
    yoyGrowth: input.yoyGrowth || '+8% YoY',
    yoyGrowthPct: typeof input.yoyGrowthPct === 'number' ? input.yoyGrowthPct : 8,
    revenueYear: input.revenueYear || '2025/2026',
    platform: input.platform || 'Shopify Plus / Headless',
    paymentProvider: input.paymentProvider || 'Klarna & Swish',
    carrier: input.carrier || 'PostNord, Instabox',
    certs: Array.isArray(input.certs) && input.certs.length > 0 ? input.certs : ['Trygg E-handel'],
    desc: input.desc?.trim() || `Svensk e-handlare baserad i ${input.city || 'Sverige'}.`,
    status: input.status || 'published',
    sourceUrl: input.sourceUrl,
    updatedAt: now,
  };

  store.merchants.unshift(created);
  saveStore(store);
  return { merchant: created, created: true };
}

export function batchAddMerchants(items: Array<Partial<Merchant> & { name: string }>): { added: Merchant[]; skipped: string[] } {
  const store = ensureStoreFile();
  const now = new Date().toISOString();
  const added: Merchant[] = [];
  const skipped: string[] = [];

  for (const input of items) {
    const cleanName = input.name.trim();
    if (!cleanName) continue;
    const cleanDomain = (input.domain || '').trim().toLowerCase();
    const exists = store.merchants.some(
      (m) =>
        m.name.toLowerCase() === cleanName.toLowerCase() ||
        (cleanDomain && m.domain.toLowerCase() === cleanDomain)
    );
    if (exists) {
      skipped.push(cleanName);
      continue;
    }

    const created: Merchant = {
      id: `m-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: cleanName,
      domain: cleanDomain || `${cleanName.toLowerCase().replace(/[^a-z0-9]/g, '')}.se`,
      city: input.city?.trim() || 'Sverige',
      region: input.region || 'svealand',
      category: input.category || 'Övrigt',
      trustpilot: typeof input.trustpilot === 'number' ? input.trustpilot : 4.4,
      reviews: input.reviews || 'Verifierad',
      revenue: input.revenue || '100–500M SEK',
      revenueNumericM: input.revenueNumericM,
      annualPackages:
        typeof input.annualPackages === 'number' && input.annualPackages > 0
          ? Math.round(input.annualPackages)
          : undefined,
      yoyGrowth: input.yoyGrowth || '+8% YoY',
      yoyGrowthPct: typeof input.yoyGrowthPct === 'number' ? input.yoyGrowthPct : 8,
      revenueYear: input.revenueYear || '2025/2026',
      platform: input.platform || 'Modern E-handel',
      paymentProvider: input.paymentProvider || 'Klarna & Swish',
      carrier: input.carrier || 'PostNord, Instabox',
      certs: Array.isArray(input.certs) && input.certs.length > 0 ? input.certs : ['Trygg E-handel'],
      desc: input.desc?.trim() || `Svensk e-handlare inom ${input.category || 'digital handel'}.`,
      status: input.status || 'published',
      sourceUrl: input.sourceUrl,
      updatedAt: now,
    };
    store.merchants.unshift(created);
    added.push(created);
  }

  saveStore(store);
  return { added, skipped };
}

export function deleteMerchant(id: string): boolean {
  const store = ensureStoreFile();
  const before = store.merchants.length;
  store.merchants = store.merchants.filter((m) => m.id !== id);
  if (store.merchants.length === before) return false;
  saveStore(store);
  return true;
}

export function upsertPartner(input: Partial<TechPartner> & { name: string }): { partner: TechPartner; created: boolean } {
  const store = ensureStoreFile();
  const now = new Date().toISOString();
  const cleanName = input.name.trim();
  const cleanDomain = (input.domain || '').trim().toLowerCase();

  const existingIdx = store.partners.findIndex(
    (p) =>
      (input.id && p.id === input.id) ||
      p.name.toLowerCase() === cleanName.toLowerCase() ||
      (cleanDomain && p.domain.toLowerCase() === cleanDomain)
  );

  if (existingIdx >= 0) {
    const existing = store.partners[existingIdx];
    const resolvedSubType = input.subType ?? existing.subType;
    const isCarrier = resolvedSubType === 'Transportör';
    const updated: TechPartner = {
      ...existing,
      ...input,
      id: existing.id,
      name: cleanName || existing.name,
      domain: cleanDomain || existing.domain,
      updatedAt: now,
    };
    if (isCarrier) {
      delete updated.customerCount;
    }
    store.partners[existingIdx] = updated;
    saveStore(store);
    return { partner: updated, created: false };
  }

  const resolvedSubType = input.subType || input.cat || 'E-handelsplattform';
  const isCarrier = resolvedSubType === 'Transportör';
  const created: TechPartner = {
    id: input.id || `p-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: cleanName,
    domain: cleanDomain || `${cleanName.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`,
    cat: input.cat || 'E-handelsplattform',
    subType: resolvedSubType,
    origin: input.origin?.trim() || 'Stockholm',
    stack: input.stack?.trim() || 'Cloud · API-first',
    ...(isCarrier
      ? {}
      : { customerCount: input.customerCount?.trim() || 'Verifierade nordiska kunder' }),
    pricingModel: input.pricingModel?.trim() || 'SaaS / Avtal',
    setupTime: input.setupTime?.trim() || '1–4 veckor',
    bestFor: input.bestFor?.trim() || 'Svenska e-handlare i tillväxt',
    keyStrengths: Array.isArray(input.keyStrengths) ? input.keyStrengths : [],
    ...(input.carrierMetrics ? { carrierMetrics: input.carrierMetrics } : {}),
    notableClients: Array.isArray(input.notableClients) ? input.notableClients : [],
    desc: input.desc?.trim() || 'Teknisk partner för nordisk e-handel.',
    status: input.status || 'published',
    sourceUrl: input.sourceUrl,
    updatedAt: now,
  };

  store.partners.unshift(created);
  saveStore(store);
  return { partner: created, created: true };
}

export function batchAddPartners(items: Array<Partial<TechPartner> & { name: string }>): { added: TechPartner[]; skipped: string[] } {
  const store = ensureStoreFile();
  const now = new Date().toISOString();
  const added: TechPartner[] = [];
  const skipped: string[] = [];

  for (const input of items) {
    const cleanName = input.name.trim();
    if (!cleanName) continue;
    const cleanDomain = (input.domain || '').trim().toLowerCase();
    const exists = store.partners.some(
      (p) =>
        p.name.toLowerCase() === cleanName.toLowerCase() ||
        (cleanDomain && p.domain.toLowerCase() === cleanDomain)
    );
    if (exists) {
      skipped.push(cleanName);
      continue;
    }

    const resolvedSubType = input.subType || input.cat || 'E-handelsplattform';
    const isCarrier = resolvedSubType === 'Transportör';
    const created: TechPartner = {
      id: `p-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: cleanName,
      domain: cleanDomain || `${cleanName.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`,
      cat: input.cat || 'E-handelsplattform',
      subType: resolvedSubType,
      origin: input.origin?.trim() || 'Stockholm',
      stack: input.stack?.trim() || 'SaaS · API-first',
      ...(isCarrier
        ? {}
        : { customerCount: input.customerCount?.trim() || 'Nordiska & globala handlare' }),
      pricingModel: input.pricingModel?.trim() || 'SaaS / Transaktionsbaserad',
      setupTime: input.setupTime?.trim() || '1–4 veckor',
      bestFor: input.bestFor?.trim() || 'Växande svenska e-handlare',
      keyStrengths: Array.isArray(input.keyStrengths) ? input.keyStrengths : [],
      ...(input.carrierMetrics ? { carrierMetrics: input.carrierMetrics } : {}),
      notableClients: Array.isArray(input.notableClients) ? input.notableClients : [],
      desc: input.desc?.trim() || `Nordisk tech-partner inom ${input.cat || 'e-handel'}.`,
      status: input.status || 'published',
      sourceUrl: input.sourceUrl,
      updatedAt: now,
    };
    store.partners.unshift(created);
    added.push(created);
  }

  saveStore(store);
  return { added, skipped };
}

export function deletePartner(id: string): boolean {
  const store = ensureStoreFile();
  const before = store.partners.length;
  store.partners = store.partners.filter((p) => p.id !== id);
  if (store.partners.length === before) return false;
  saveStore(store);
  return true;
}

export function upsertEvent(input: Partial<EcommerceEvent> & { name: string }): EcommerceEvent {
  const store = ensureStoreFile();
  const idx = input.id ? store.events.findIndex((e) => e.id === input.id) : -1;
  if (idx >= 0) {
    const updated: EcommerceEvent = { ...store.events[idx], ...input };
    store.events[idx] = updated;
    saveStore(store);
    return updated;
  }
  const created: EcommerceEvent = {
    id: `ev-${Date.now()}`,
    name: input.name.trim(),
    dateLabel: input.dateLabel || '2027',
    city: input.city || 'Stockholm',
    venue: input.venue || 'Stockholm',
    organizer: input.organizer || 'Branscharrangör',
    ticketInfo: input.ticketInfo || 'Branschregistrering',
    focusAreas: Array.isArray(input.focusAreas) ? input.focusAreas : ['E-handel'],
    audienceType: input.audienceType || 'E-handlare och partners',
    website: input.website || '',
    desc: input.desc || '',
    featured: input.featured ?? false,
    status: input.status || 'published',
  };
  store.events.push(created);
  saveStore(store);
  return created;
}

export function deleteEvent(id: string): boolean {
  const store = ensureStoreFile();
  const before = store.events.length;
  store.events = store.events.filter((e) => e.id !== id);
  if (store.events.length === before) return false;
  saveStore(store);
  return true;
}

export function upsertSession(input: Partial<DCSession> & { title: string }): DCSession {
  const store = ensureStoreFile();
  const idx = input.id ? store.sessions.findIndex((s) => s.id === input.id) : -1;
  if (idx >= 0) {
    const updated: DCSession = { ...store.sessions[idx], ...input };
    store.sessions[idx] = updated;
    saveStore(store);
    return updated;
  }
  const created: DCSession = {
    id: `dc-${Date.now()}`,
    time: input.time || 'Dag 1 · 12:00',
    stage: input.stage || 'Main Stage',
    track: input.track || 'AI & Data',
    title: input.title.trim(),
    speaker: input.speaker || 'Meddelas inom kort',
    status: input.status || 'published',
  };
  store.sessions.push(created);
  saveStore(store);
  return created;
}

export function deleteSession(id: string): boolean {
  const store = ensureStoreFile();
  const before = store.sessions.length;
  store.sessions = store.sessions.filter((s) => s.id !== id);
  if (store.sessions.length === before) return false;
  saveStore(store);
  return true;
}

export function upsertJob(input: Partial<EcommerceJob> & { title: string; company: string }): EcommerceJob {
  const store = ensureStoreFile();
  const today = todayIso();
  const idx = input.id ? store.jobs.findIndex((j) => j.id === input.id) : -1;
  if (idx >= 0) {
    const merged: EcommerceJob = { ...store.jobs[idx], ...input };
    if (input.jobStatus === 'active' && input.status === 'published') {
      merged.validationNote = 'Aktiv annons · verifierad av redaktör';
      merged.verifiedAt = today;
      if (!merged.expiresAt || merged.expiresAt < today) {
        merged.expiresAt = defaultExpiryIso(45);
      }
    }
    store.jobs[idx] = merged;
    saveStore(store);
    return merged;
  }
  const expiresAt = input.expiresAt || defaultExpiryIso(45);
  const created: EcommerceJob = {
    id: `j-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    title: input.title.trim(),
    company: input.company.trim(),
    city: input.city || 'Stockholm',
    workModel: input.workModel || 'Hybrid',
    roleCategory: input.roleCategory || 'E-commerce Management',
    seniority: input.seniority || 'Mid / Senior',
    salaryRange: input.salaryRange,
    applyUrl: input.applyUrl || 'https://ehandel.se/jobb',
    skills: Array.isArray(input.skills) ? input.skills : [],
    desc: input.desc || '',
    postedAt: input.postedAt || 'Just nu',
    expiresAt,
    verifiedAt: today,
    jobStatus: input.jobStatus || (expiresAt < today ? 'expired' : 'active'),
    validationNote:
      input.validationNote ||
      (expiresAt < today ? `Utgången (${expiresAt})` : 'Aktiv annons · verifierad'),
    status: expiresAt < today ? 'draft' : input.status || 'published',
  };
  store.jobs.unshift(created);
  saveStore(store);
  return created;
}

export function batchAddJobs(items: Array<Partial<EcommerceJob> & { title: string; company: string }>): { added: EcommerceJob[]; skipped: string[] } {
  const store = ensureStoreFile();
  const today = todayIso();
  const added: EcommerceJob[] = [];
  const skipped: string[] = [];

  for (const input of items) {
    const title = input.title?.trim();
    const company = input.company?.trim();
    if (!title || !company) continue;
    const expiresAt = input.expiresAt || defaultExpiryIso(45);
    if (expiresAt < today || !isValidHttpsUrl(input.applyUrl)) {
      skipped.push(`${title} (${company}) – utgången eller ogiltig länk`);
      continue;
    }

    const exists = store.jobs.some(
      (j) =>
        j.title.toLowerCase() === title.toLowerCase() &&
        j.company.toLowerCase() === company.toLowerCase()
    );
    if (exists) {
      skipped.push(`${title} (${company})`);
      continue;
    }
    const created: EcommerceJob = {
      id: `j-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      title,
      company,
      city: input.city || 'Stockholm',
      workModel: input.workModel || 'Hybrid',
      roleCategory: input.roleCategory || 'E-commerce Management',
      seniority: input.seniority || 'Mid / Senior',
      salaryRange: input.salaryRange,
      applyUrl: input.applyUrl || 'https://ehandel.se/jobb',
      skills: Array.isArray(input.skills) ? input.skills : [],
      desc: input.desc || `Roll inom svensk e-handel hos ${company}.`,
      postedAt: 'Nyupptäckt',
      expiresAt,
      verifiedAt: today,
      jobStatus: 'active',
      validationNote: 'Aktiv annons · verifierad vid import',
      status: input.status || 'published',
    };
    store.jobs.unshift(created);
    added.push(created);
  }
  saveStore(store);
  return { added, skipped };
}

export function validateAndCloseInvalidJobs(): {
  totalChecked: number;
  activeCount: number;
  closedCount: number;
  newlyClosedTitles: string[];
} {
  const store = ensureStoreFile();
  const today = todayIso();
  const newlyClosedTitles: string[] = [];

  store.jobs = store.jobs.map((job) => {
    const check = evaluateJobValidity(job, today);
    const wasActive = job.status === 'published' && job.jobStatus !== 'expired' && job.jobStatus !== 'closed';
    if (wasActive && check.jobStatus !== 'active') {
      newlyClosedTitles.push(`${job.title} (${job.company})`);
    }
    return {
      ...job,
      verifiedAt: today,
      jobStatus: check.jobStatus,
      status: check.status,
      validationNote: check.validationNote,
    };
  });

  saveStore(store);
  const activeCount = store.jobs.filter((j) => j.status === 'published' && j.jobStatus === 'active').length;
  const closedCount = store.jobs.length - activeCount;

  return {
    totalChecked: store.jobs.length,
    activeCount,
    closedCount,
    newlyClosedTitles,
  };
}

export function deleteJob(id: string): boolean {
  const store = ensureStoreFile();
  const before = store.jobs.length;
  store.jobs = store.jobs.filter((j) => j.id !== id);
  if (store.jobs.length === before) return false;
  saveStore(store);
  return true;
}

export function upsertRecruiter(input: Partial<RecruitmentSite> & { name: string }): RecruitmentSite {
  const store = ensureStoreFile();
  const idx = input.id ? store.recruitmentSites.findIndex((r) => r.id === input.id) : -1;
  if (idx >= 0) {
    const updated: RecruitmentSite = { ...store.recruitmentSites[idx], ...input };
    store.recruitmentSites[idx] = updated;
    saveStore(store);
    return updated;
  }
  const created: RecruitmentSite = {
    id: `rec-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name: input.name.trim(),
    domain: (input.domain || '').replace(/^https?:\/\//, '') || 'ehandel.se/jobb',
    type: input.type || 'Rekryteringsbyrå',
    rolesCovered: Array.isArray(input.rolesCovered) && input.rolesCovered.length > 0
      ? input.rolesCovered
      : ['E-commerce Management'],
    coverage: input.coverage || 'Hela Sverige',
    desc: input.desc || 'Rekryteringsaktör inom svensk e-handel.',
    status: input.status || 'published',
  };
  store.recruitmentSites.unshift(created);
  saveStore(store);
  return created;
}

export function batchAddRecruiters(items: Array<Partial<RecruitmentSite> & { name: string }>): { added: RecruitmentSite[]; skipped: string[] } {
  const store = ensureStoreFile();
  const added: RecruitmentSite[] = [];
  const skipped: string[] = [];

  for (const input of items) {
    const cleanName = input.name?.trim();
    if (!cleanName) continue;
    const exists = store.recruitmentSites.some(
      (r) => r.name.toLowerCase() === cleanName.toLowerCase()
    );
    if (exists) {
      skipped.push(cleanName);
      continue;
    }
    const created: RecruitmentSite = {
      id: `rec-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: cleanName,
      domain: (input.domain || '').replace(/^https?:\/\//, '') || `${cleanName.toLowerCase().replace(/[^a-z0-9]/g, '')}.se`,
      type: input.type || 'Rekryteringsbyrå',
      rolesCovered: Array.isArray(input.rolesCovered) && input.rolesCovered.length > 0
        ? input.rolesCovered
        : ['E-commerce Management'],
      coverage: input.coverage || 'Hela Sverige',
      desc: input.desc || 'Specialiserad rekryteringspartner för svenska e-handelsroller.',
      status: input.status || 'published',
    };
    store.recruitmentSites.unshift(created);
    added.push(created);
  }
  saveStore(store);
  return { added, skipped };
}

export function deleteRecruiter(id: string): boolean {
  const store = ensureStoreFile();
  const before = store.recruitmentSites.length;
  store.recruitmentSites = store.recruitmentSites.filter((r) => r.id !== id);
  if (store.recruitmentSites.length === before) return false;
  saveStore(store);
  return true;
}

export function updateRegion(key: string, patch: Partial<RegionMetric>): RegionMetric | null {
  const store = ensureStoreFile();
  if (!store.regions[key]) return null;
  store.regions[key] = { ...store.regions[key], ...patch };
  saveStore(store);
  return store.regions[key];
}

export function updateOrderBenchmark(
  id: string,
  patch: Partial<CategoryOrderBenchmark>
): CategoryOrderBenchmark | null {
  const store = ensureStoreFile();
  const idx = store.orderBenchmarks.findIndex((b) => b.id === id);
  if (idx < 0) return null;
  store.orderBenchmarks[idx] = { ...store.orderBenchmarks[idx], ...patch, id };
  saveStore(store);
  return store.orderBenchmarks[idx];
}

export function updateShippingTier(
  id: string,
  patch: Partial<ShippingCostTier>
): ShippingCostTier | null {
  const store = ensureStoreFile();
  const idx = store.shippingTiers.findIndex((t) => t.id === id);
  if (idx < 0) return null;
  store.shippingTiers[idx] = { ...store.shippingTiers[idx], ...patch, id };
  saveStore(store);
  return store.shippingTiers[idx];
}

export function updateDeliveryStats(patch: Partial<DeliveryStatsData>): DeliveryStatsData {
  const store = ensureStoreFile();
  store.deliveryStats = { ...store.deliveryStats, ...patch };
  saveStore(store);
  return store.deliveryStats;
}

export function upsertLaw(input: Partial<EcommerceLaw> & { title: string }): EcommerceLaw {
  const store = ensureStoreFile();
  const idx = input.id ? store.laws.findIndex((l) => l.id === input.id) : -1;
  if (idx >= 0) {
    const updated: EcommerceLaw = { ...store.laws[idx], ...input };
    store.laws[idx] = updated;
    saveStore(store);
    return updated;
  }
  const created: EcommerceLaw = {
    id: `law-${Date.now()}`,
    title: input.title.trim(),
    category: input.category || 'Konsumenträtt',
    authority: input.authority || 'Konsumentverket',
    effectiveDate: input.effectiveDate || 'Gällande',
    summary: input.summary || '',
    requirements: Array.isArray(input.requirements) ? input.requirements : [],
    penaltyInfo: input.penaltyInfo || 'Föreläggande eller marknadsstörningsavgift.',
  };
  store.laws.unshift(created);
  saveStore(store);
  return created;
}

export function deleteLaw(id: string): boolean {
  const store = ensureStoreFile();
  const before = store.laws.length;
  store.laws = store.laws.filter((l) => l.id !== id);
  if (store.laws.length === before) return false;
  saveStore(store);
  return true;
}

export function addCommunityThread(input: { channel: string; author: string; title: string; authorUid?: string }): CommunityThread {
  const store = ensureStoreFile();
  const thread: CommunityThread = {
    ...(input.authorUid ? { authorUid: input.authorUid } : {}),
    id: `c-${Date.now()}`,
    channel: input.channel || '#ai-och-data',
    author: input.author || 'Verifierad Medlem',
    title: input.title.trim(),
    votes: 1,
    replies: 0,
    time: 'Just nu',
  };
  store.communityThreads.unshift(thread);
  saveStore(store);
  return thread;
}

export function upvoteCommunityThread(id: string): CommunityThread | null {
  const store = ensureStoreFile();
  const thread = store.communityThreads.find((t) => t.id === id);
  if (!thread) return null;
  thread.votes += 1;
  saveStore(store);
  return thread;
}

export function deleteCommunityThread(id: string): boolean {
  const store = ensureStoreFile();
  const before = store.communityThreads.length;
  store.communityThreads = store.communityThreads.filter((t) => t.id !== id);
  if (store.communityThreads.length === before) return false;
  saveStore(store);
  return true;
}

export function addCommunityMember(input: { name: string; email: string; role: string; city: string }): CommunityMember {
  const store = ensureStoreFile();
  const member: CommunityMember = {
    id: `mem-${Date.now()}`,
    name: input.name.trim(),
    email: input.email.trim(),
    role: input.role,
    city: input.city,
    createdAt: new Date().toISOString(),
  };
  store.communityMembers.unshift(member);
  saveStore(store);
  return member;
}

export function upsertAdBanner(input: Partial<AdBanner> & { headline: string }): AdBanner {
  const store = ensureStoreFile();
  const idx = input.id ? store.adBanners.findIndex((b) => b.id === input.id) : -1;
  if (idx >= 0) {
    const updated: AdBanner = { ...store.adBanners[idx], ...input };
    store.adBanners[idx] = updated;
    saveStore(store);
    return updated;
  }
  const created: AdBanner = {
    id: `ad-${Date.now()}`,
    placement: input.placement || 'marknad-mid',
    placementLabel: input.placementLabel || 'Anpassad annonsplats',
    dimensions: input.dimensions || '980 × 120 px',
    mode: input.mode || 'active',
    sponsorName: input.sponsorName?.trim() || 'Sponsor',
    kicker: input.kicker?.trim() || 'Annons',
    headline: input.headline.trim(),
    body: input.body?.trim() || '',
    ctaLabel: input.ctaLabel?.trim() || 'Läs mer',
    targetUrl: input.targetUrl?.trim() || 'https://sverigesehandel.se',
    internalTab: input.internalTab,
    theme: input.theme || 'navy',
    active: input.active ?? true,
  };
  store.adBanners.unshift(created);
  saveStore(store);
  return created;
}

export function deleteAdBanner(id: string): boolean {
  const store = ensureStoreFile();
  const before = store.adBanners.length;
  store.adBanners = store.adBanners.filter((b) => b.id !== id);
  if (store.adBanners.length === before) return false;
  saveStore(store);
  return true;
}

export function addContactMessage(input: {
  authorUid?: string;
  name: string;
  email: string;
  company?: string;
  topic: string;
  adSlot?: string;
  message: string;
}): ContactMessage {
  const store = ensureStoreFile();
  const item: ContactMessage = {
    ...(input.authorUid ? { authorUid: input.authorUid } : {}),
    id: `msg-${Date.now()}`,
    name: input.name.trim(),
    email: input.email.trim(),
    company: input.company?.trim() || undefined,
    topic: input.topic.trim() || 'Allmän fråga',
    adSlot: input.adSlot?.trim() || undefined,
    message: input.message.trim(),
    createdAt: new Date().toISOString(),
  };
  store.contactMessages.unshift(item);
  saveStore(store);
  return item;
}

export function deleteContactMessage(id: string): boolean {
  const store = ensureStoreFile();
  const before = store.contactMessages.length;
  store.contactMessages = store.contactMessages.filter((m) => m.id !== id);
  if (store.contactMessages.length === before) return false;
  saveStore(store);
  return true;
}

export function upsertLogisticsProvider(
  input: Partial<LogisticsProvider> & { name: string }
): { provider: LogisticsProvider; created: boolean } {
  const store = ensureStoreFile();
  const now = new Date().toISOString();
  const cleanName = input.name.trim();
  const existingIdx = store.logisticsProviders.findIndex(
    (l) => (input.id && l.id === input.id) || l.name.toLowerCase() === cleanName.toLowerCase()
  );

  if (existingIdx >= 0) {
    const existing = store.logisticsProviders[existingIdx];
    const updated: LogisticsProvider = {
      ...existing,
      ...input,
      id: existing.id,
      name: cleanName || existing.name,
      updatedAt: now,
    };
    store.logisticsProviders[existingIdx] = updated;
    saveStore(store);
    return { provider: updated, created: false };
  }

  const created: LogisticsProvider = {
    id: input.id || `lp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name: cleanName,
    domain: (input.domain || `${cleanName.toLowerCase().replace(/[^a-z0-9]/g, '')}.se`).replace(
      /^https?:\/\//,
      ''
    ),
    logisticsType: input.logisticsType || '3PL',
    hqCity: input.hqCity?.trim() || 'Stockholm',
    warehouseCities:
      Array.isArray(input.warehouseCities) && input.warehouseCities.length > 0
        ? input.warehouseCities
        : [input.hqCity?.trim() || 'Stockholm'],
    region: input.region || 'svealand',
    warehouseSqm: input.warehouseSqm?.trim() || '25 000 m²',
    automation: input.automation?.trim() || 'WMS-styrd plock & pack',
    wmsPlatform: input.wmsPlatform?.trim() || 'Ongoing WMS',
    minOrderVolume: input.minOrderVolume?.trim() || 'Från 300 ordrar/mån',
    cutoffTime: input.cutoffTime?.trim() || '17:00 samma dag',
    integrations: Array.isArray(input.integrations) ? input.integrations : ['Shopify Plus', 'Centra', 'nShift'],
    specialties: Array.isArray(input.specialties) ? input.specialties : ['E-handelsfulfilment'],
    notableClients: Array.isArray(input.notableClients) ? input.notableClients : [],
    pricingModel: input.pricingModel?.trim() || 'Rörligt pris per order + pallplats',
    desc: input.desc?.trim() || `Svensk logistikpartner (${input.logisticsType || '3PL'}) för e-handel.`,
    status: input.status || 'published',
    updatedAt: now,
  };

  store.logisticsProviders.unshift(created);
  saveStore(store);
  return { provider: created, created: true };
}

export function deleteLogisticsProvider(id: string): boolean {
  const store = ensureStoreFile();
  const before = store.logisticsProviders.length;
  store.logisticsProviders = store.logisticsProviders.filter((l) => l.id !== id);
  if (store.logisticsProviders.length === before) return false;
  saveStore(store);
  return true;
}

export function upsertNews(
  input: Partial<EcommerceNewsItem> & { title: string }
): { item: EcommerceNewsItem; created: boolean } {
  const store = ensureStoreFile();
  const list = Array.isArray(store.news) ? store.news : [];
  const cleanTitle = input.title.trim();
  const existingIdx = input.id ? list.findIndex((n) => n.id === input.id) : -1;

  if (existingIdx >= 0) {
    const updated: EcommerceNewsItem = {
      ...list[existingIdx],
      ...input,
      id: list[existingIdx].id,
      title: cleanTitle || list[existingIdx].title,
    };
    list[existingIdx] = updated;
    store.news = list;
    saveStore(store);
    return { item: updated, created: false };
  }

  const created: EcommerceNewsItem = {
    id: input.id || `news-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    title: cleanTitle,
    summary: input.summary?.trim() || 'Nyhet inom svensk och europeisk e-handel.',
    category: input.category || 'SaaS & System',
    region: input.region || 'Sverige',
    sourceName: input.sourceName?.trim() || 'Redaktionen',
    sourceUrl: input.sourceUrl?.trim() || 'https://sverigesehandel.se',
    publishedDate: input.publishedDate || todayIso(),
    impactNote: input.impactNote?.trim() || undefined,
    tags: Array.isArray(input.tags) ? input.tags.filter(Boolean) : [],
    status: input.status || 'published',
    fetchedByAI: input.fetchedByAI,
  };
  store.news = [created, ...list];
  saveStore(store);
  return { item: created, created: true };
}

export function batchAddNews(
  items: Array<Partial<EcommerceNewsItem> & { title: string }>
): { added: EcommerceNewsItem[]; skipped: string[] } {
  const store = ensureStoreFile();
  const list = Array.isArray(store.news) ? store.news : [];
  const existingTitles = new Set(list.map((n) => n.title.toLowerCase().trim()));
  const added: EcommerceNewsItem[] = [];
  const skipped: string[] = [];

  for (const input of items) {
    const cleanTitle = input.title?.trim();
    if (!cleanTitle) continue;
    if (existingTitles.has(cleanTitle.toLowerCase())) {
      skipped.push(cleanTitle);
      continue;
    }
    const created: EcommerceNewsItem = {
      id: `news-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title: cleanTitle,
      summary: input.summary?.trim() || 'Aktuell nyhet inom digital handel.',
      category: input.category || 'SaaS & System',
      region: input.region || 'Europa',
      sourceName: input.sourceName?.trim() || 'Branschnyhet',
      sourceUrl: input.sourceUrl?.trim() || 'https://sverigesehandel.se',
      publishedDate: input.publishedDate || todayIso(),
      impactNote: input.impactNote?.trim() || undefined,
      tags: Array.isArray(input.tags) ? input.tags.filter(Boolean) : [],
      status: input.status || 'published',
      fetchedByAI: input.fetchedByAI ?? true,
    };
    list.unshift(created);
    existingTitles.add(cleanTitle.toLowerCase());
    added.push(created);
  }

  store.news = list;
  saveStore(store);
  return { added, skipped };
}

export function deleteNews(id: string): boolean {
  const store = ensureStoreFile();
  const list = Array.isArray(store.news) ? store.news : [];
  const before = list.length;
  store.news = list.filter((n) => n.id !== id);
  if (store.news.length === before) return false;
  saveStore(store);
  return true;
}

export function updatePaketindex(patch: Partial<PaketindexData>): PaketindexData {
  const store = ensureStoreFile();
  const base = store.paketindex || INITIAL_CMS_DATA.paketindex;
  store.paketindex = { ...base, ...patch };
  saveStore(store);
  return store.paketindex;
}

export function updateIntelligenceSource(
  id: string,
  patch: Partial<MarketIntelligenceSource>
): MarketIntelligenceSource | null {
  const store = ensureStoreFile();
  const idx = store.intelligenceSources.findIndex((s) => s.id === id);
  if (idx < 0) return null;
  store.intelligenceSources[idx] = { ...store.intelligenceSources[idx], ...patch };
  saveStore(store);
  return store.intelligenceSources[idx];
}

export function updateTechStackShare(id: string, patch: Partial<TechStackShare>): TechStackShare | null {
  const store = ensureStoreFile();
  const idx = store.techStackShares.findIndex((t) => t.id === id);
  if (idx < 0) return null;
  store.techStackShares[idx] = { ...store.techStackShares[idx], ...patch, id };
  saveStore(store);
  return store.techStackShares[idx];
}

export function upsertTimelineMilestone(
  input: Partial<TimelineMilestone> & { title: string }
): TimelineMilestone {
  const store = ensureStoreFile();
  const idx = input.id ? store.timeline.findIndex((t) => t.id === input.id) : -1;
  if (idx >= 0) {
    const updated: TimelineMilestone = { ...store.timeline[idx], ...input };
    store.timeline[idx] = updated;
    saveStore(store);
    return updated;
  }
  const created: TimelineMilestone = {
    id: input.id || `t-${Date.now()}`,
    era: input.era || '20s',
    year: input.year?.trim() || '2026',
    badge: input.badge?.trim() || 'Milstolpe',
    title: input.title.trim(),
    desc: input.desc?.trim() || '',
    stack: input.stack?.trim() || '',
  };
  store.timeline.push(created);
  saveStore(store);
  return created;
}

export function deleteTimelineMilestone(id: string): boolean {
  const store = ensureStoreFile();
  const before = store.timeline.length;
  store.timeline = store.timeline.filter((t) => t.id !== id);
  if (store.timeline.length === before) return false;
  saveStore(store);
  return true;
}

export function updatePageContent(patch: Partial<PageContentMap>): PageContentMap {
  const store = ensureStoreFile();
  const base = store.pageContent || INITIAL_CMS_DATA.pageContent;
  const merged: PageContentMap = {
    marknad: { ...base.marknad, ...(patch.marknad ?? {}) },
    nyheter: { ...base.nyheter, ...(patch.nyheter ?? {}) },
    event: { ...base.event, ...(patch.event ?? {}) },
    historia: { ...base.historia, ...(patch.historia ?? {}) },
    ehandlare: { ...base.ehandlare, ...(patch.ehandlare ?? {}) },
    partners: { ...base.partners, ...(patch.partners ?? {}) },
    logistics: { ...base.logistics, ...(patch.logistics ?? {}) },
    jobb: { ...base.jobb, ...(patch.jobb ?? {}) },
    community: { ...base.community, ...(patch.community ?? {}) },
    kontakt: { ...base.kontakt, ...(patch.kontakt ?? {}) },
  };
  store.pageContent = merged;
  saveStore(store);
  return merged;
}
