export type PublishStatus = 'published' | 'draft';

export type MerchantCategory =
  | 'Apotek & Skönhet'
  | 'Hemelektronik'
  | 'Mode & Outdoor'
  | 'Hem & Inredning'
  | 'Sport & Fritid'
  | 'Böcker & Media'
  | 'Dagligvaror & Mat'
  | 'Barn & Familj'
  | 'Övrigt';

export type PartnerCategory =
  | 'E-handelsplattform'
  | 'Betalning & Checkout'
  | 'Logistik & Last-mile'
  | 'MarTech & AI'
  | 'ERP & Omnichannel';

export type JobRoleCategory =
  | 'E-commerce Management'
  | 'Tech & Utveckling'
  | 'Growth & MarTech'
  | 'Logistik & Supply Chain'
  | 'Merchandising & CX';

export interface Merchant {
  id: string;
  name: string;
  domain: string;
  city: string;
  region: string;
  category: MerchantCategory | string;
  trustpilot: number;
  reviews: string;
  revenue: string;
  revenueNumericM?: number;
  annualPackages?: number;
  yoyGrowth?: string;
  yoyGrowthPct?: number;
  revenueYear?: string;
  platform: string;
  paymentProvider: string;
  carrier: string;
  certs: string[];
  desc: string;
  status: PublishStatus;
  sourceUrl?: string;
  updatedAt: string;
}

export type PartnerSubType =
  | 'Betalning & Checkout'
  | 'Transportör'
  | 'TA-system'
  | '3PL & Returer'
  | 'E-handelsplattform'
  | 'MarTech & AI'
  | 'ERP & Omnichannel';

export interface TechPartner {
  id: string;
  name: string;
  domain: string;
  cat: PartnerCategory | string;
  subType?: PartnerSubType | string;
  origin: string;
  stack: string;
  customerCount?: string;
  pricingModel?: string;
  setupTime?: string;
  bestFor?: string;
  keyStrengths?: string[];
  notableClients: string[];
  desc: string;
  status: PublishStatus;
  sourceUrl?: string;
  updatedAt: string;
}

export type LogisticsRoleType = '3PL' | '4PL' | '3PL & 4PL';

export interface LogisticsProvider {
  id: string;
  name: string;
  domain: string;
  logisticsType: LogisticsRoleType;
  hqCity: string;
  warehouseCities: string[];
  region: 'vast' | 'svealand' | 'smaland' | 'syd' | 'norrland' | string;
  warehouseSqm: string;
  automation: string;
  wmsPlatform: string;
  minOrderVolume: string;
  cutoffTime: string;
  integrations: string[];
  specialties: string[];
  notableClients: string[];
  pricingModel: string;
  desc: string;
  status: PublishStatus;
  updatedAt: string;
}

export interface EcommerceEvent {
  id: string;
  name: string;
  dateLabel: string;
  city: string;
  venue: string;
  organizer: string;
  ticketInfo: string;
  focusAreas: string[];
  audienceType: string;
  website: string;
  desc: string;
  featured?: boolean;
  status: PublishStatus;
}

export interface DCSession {
  id: string;
  time: string;
  stage: string;
  track: string;
  title: string;
  speaker: string;
  status: PublishStatus;
}

export type JobValidityStatus = 'active' | 'expired' | 'closed';

export interface EcommerceJob {
  id: string;
  title: string;
  company: string;
  city: string;
  workModel: 'Hybrid' | 'På plats' | 'Remote';
  roleCategory: JobRoleCategory | string;
  seniority: string;
  salaryRange?: string;
  applyUrl: string;
  skills: string[];
  desc: string;
  postedAt: string;
  expiresAt?: string;
  verifiedAt?: string;
  jobStatus?: JobValidityStatus;
  validationNote?: string;
  status: PublishStatus;
}

export interface RecruitmentSite {
  id: string;
  name: string;
  domain: string;
  type: 'Jobbportal' | 'Rekryteringsbyrå' | 'Headhunting & Interim';
  rolesCovered: Array<JobRoleCategory | string>;
  coverage: string;
  desc: string;
  status: PublishStatus;
}

export interface RegionMetric {
  key: 'vast' | 'svealand' | 'smaland' | 'syd' | 'norrland';
  name: string;
  tag: string;
  share: string;
  aov: string;
  hubs: string;
  desc: string;
  populationLabel?: string;
  populationDensityPerKm2?: number;
  parcelLockersTotal?: number;
  lockersPer10kResidents?: number;
  lockersPer100Km2?: number;
  homeDeliveryTotalPct?: number;
  homeDeliveryEveningPct?: number;
}

export interface CategoryOrderBenchmark {
  id: string;
  category: string;
  avgOrderValueSek: number;
  itemsPerOrder: number;
  avgCustomerShippingFeeSek: number;
  merchantShippingCostSek: number;
  freeShippingThresholdSek: number;
  returnRatePct: number;
  conversionRatePct: number;
  grossMarginPct: number;
}

export interface ShippingCostTier {
  id: string;
  orderValueRange: string;
  minOrderSek: number;
  maxOrderSek: number | null;
  customerShippingFeeSek: number;
  merchantShippingCostSek: number;
  freeShippingSharePct: number;
  shippingToAovPct: number;
  dominantMethod: string;
  insight: string;
}

export interface DeliveryTimeWindow {
  id: string;
  windowLabel: string;
  sharePct: number;
  preferenceRank: string;
  bestFor: string;
}

export interface DeliveryReceptionChannel {
  id: string;
  channel: string;
  sharePct: number;
  homeDropSharePct?: number;
  avgLeadTimeDays: string;
  insight: string;
}

export interface ParcelSizeTier {
  id: string;
  sizeClass: string;
  typicalDimensionsCm: string;
  weightRangeKg: string;
  shareOfOrdersPct: number;
  dominantCarrierOption: string;
}

export interface CarrierDeliveryCoverage {
  id: string;
  carrierName: string;
  homeDeliveryHouseholdPct: number;
  eveningOrExpressPct: number;
  parcelLockersCount: number;
  pickupAgentsCount: number;
  timeWindow: string;
  ruralCoverage: string;
  boxNetworkNote: string;
}

export interface LockerNetworkStat {
  id: string;
  operator: string;
  stationsSweden: number;
  estimatedCompartments: string;
  networkType: 'Eget slutet nätverk' | 'Öppet transportörsoberoende';
  populationReachPct: number;
  highlight: string;
}

export interface DeliveryStatsData {
  avgWeightKg: number;
  medianWeightKg: number;
  mostCommonDimensionsCm: string;
  varubrevOrSmallBoxSharePct: number;
  leaveOutsideDoorSharePct: number;
  homeDeliveryPreferredSlot: string;
  nationalPopulationDensityKm2?: number;
  totalParcelLockerStations?: number;
  lockersPer10kNational?: number;
  combinedAnyHomeDeliveryPct?: number;
  combinedEveningHomeDeliveryPct?: number;
  combinedLockerReachPct?: number;
  timeWindows: DeliveryTimeWindow[];
  receptionChannels: DeliveryReceptionChannel[];
  parcelSizeTiers: ParcelSizeTier[];
  carrierCoverage?: CarrierDeliveryCoverage[];
  lockerNetworks?: LockerNetworkStat[];
  updatedNote: string;
}

export type LawCategory =
  | 'Pris & Kassa'
  | 'Konsumenträtt'
  | 'Data & Tillgänglighet'
  | 'Hållbarhet & Tull';

export interface EcommerceLaw {
  id: string;
  title: string;
  category: LawCategory | string;
  authority: string;
  effectiveDate: string;
  summary: string;
  requirements: string[];
  penaltyInfo: string;
}

export interface TimelineMilestone {
  id: string;
  era: '90s' | '00s' | '10s' | '20s';
  year: string;
  badge: string;
  title: string;
  desc: string;
  stack: string;
}

export interface CommunityThread {
  id: string;
  channel: string;
  author: string;
  title: string;
  votes: number;
  replies: number;
  time: string;
}

export interface CommunityMember {
  id: string;
  name: string;
  email: string;
  role: string;
  city: string;
  createdAt: string;
}

export type IntelligenceSourceId =
  | 'ecdb'
  | 'statista'
  | 'builtwith'
  | 'wappalyzer'
  | 'tembi'
  | 'hui'
  | 'paketindex';

export interface MarketIntelligenceSource {
  id: IntelligenceSourceId;
  name: string;
  shortLabel: string;
  focusArea: string;
  url: string;
  headlineMetric: string;
  headlineValue: string;
  updatedPeriod: string;
  summary: string;
  keyFindings: Array<{ label: string; value: string; note?: string }>;
}

export interface TechStackShare {
  id: string;
  layer: 'E-handelsplattform' | 'Betalning (PSP)' | 'MarTech & CRM';
  source: 'BuiltWith' | 'Wappalyzer';
  name: string;
  sharePct: number;
  detectedSites: string;
}

export type AdBannerPlacement =
  | 'marknad-top'
  | 'marknad-mid'
  | 'event-top'
  | 'partners-top'
  | 'ehandlare-top'
  | 'jobb-top';

export interface AdBanner {
  id: string;
  placement: AdBannerPlacement;
  placementLabel: string;
  dimensions: string;
  mode: 'active' | 'placeholder';
  sponsorName: string;
  kicker: string;
  headline: string;
  body: string;
  ctaLabel: string;
  targetUrl: string;
  internalTab?: PortalTab;
  theme: 'navy' | 'gold' | 'light';
  active: boolean;
}

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  company?: string;
  topic: string;
  adSlot?: string;
  message: string;
  createdAt: string;
}

export interface CMSStore {
  merchants: Merchant[];
  partners: TechPartner[];
  logisticsProviders: LogisticsProvider[];
  events: EcommerceEvent[];
  sessions: DCSession[];
  jobs: EcommerceJob[];
  recruitmentSites: RecruitmentSite[];
  regions: Record<string, RegionMetric>;
  orderBenchmarks: CategoryOrderBenchmark[];
  shippingTiers: ShippingCostTier[];
  deliveryStats: DeliveryStatsData;
  laws: EcommerceLaw[];
  intelligenceSources: MarketIntelligenceSource[];
  techStackShares: TechStackShare[];
  adBanners: AdBanner[];
  contactMessages: ContactMessage[];
  timeline: TimelineMilestone[];
  communityThreads: CommunityThread[];
  communityMembers: CommunityMember[];
  communityMemberCount?: number;
  communityMemberCities?: string[];
  updatedAt: string;
}

export interface GroundingSource {
  title: string;
  uri: string;
}

export interface DiscoveredMerchantCandidate {
  name: string;
  domain: string;
  city: string;
  region: string;
  category: string;
  trustpilot: number;
  reviews: string;
  revenue: string;
  revenueNumericM?: number;
  annualPackages?: number;
  yoyGrowth?: string;
  yoyGrowthPct?: number;
  revenueYear?: string;
  platform: string;
  paymentProvider: string;
  carrier: string;
  certs: string[];
  desc: string;
  alreadyExists?: boolean;
}

export interface DiscoveredPartnerCandidate {
  name: string;
  domain: string;
  cat: string;
  subType?: string;
  origin: string;
  stack: string;
  customerCount?: string;
  pricingModel?: string;
  setupTime?: string;
  bestFor?: string;
  keyStrengths?: string[];
  notableClients: string[];
  desc: string;
  alreadyExists?: boolean;
}

export interface DiscoveredJobCandidate {
  title: string;
  company: string;
  city: string;
  workModel: 'Hybrid' | 'På plats' | 'Remote';
  roleCategory: string;
  seniority: string;
  applyUrl: string;
  expiresAt?: string;
  skills: string[];
  desc: string;
  alreadyExists?: boolean;
}

export interface DiscoveredRecruiterCandidate {
  name: string;
  domain: string;
  type: 'Jobbportal' | 'Rekryteringsbyrå' | 'Headhunting & Interim';
  rolesCovered: string[];
  coverage: string;
  desc: string;
  alreadyExists?: boolean;
}

export type PortalTab =
  | 'marknad'
  | 'event'
  | 'historia'
  | 'ehandlare'
  | 'partners'
  | '3pl'
  | 'jobb'
  | 'community'
  | 'kontakt';

export type CMSSection =
  | 'overview'
  | 'discover'
  | 'merchants'
  | 'partners'
  | 'events'
  | 'jobs'
  | 'content';
