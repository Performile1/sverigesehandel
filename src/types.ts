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

export interface CarrierMetrics {
  serviceCount: number;
  parcelLockers: number;
  lockerNote?: string;
  pickupAgents: number;
  homeDeliveryPct: number;
  weightLimits?: string;
  dimensionLimits?: string;
  websiteUrl?: string;
  integrations?: string[];
  sameDayAvailable?: boolean;
  weekendDelivery?: boolean;
  avgLeadTime?: string;
  coreServices?: string[];
}

export interface TechPartner {
  image?: CmsImage;
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
  carrierMetrics?: CarrierMetrics;
  notableClients: string[];
  desc: string;
  introEmail?: string;
  introRoutingMode?: 'default' | 'self' | 'direct';
  hasDirectIntroEmail?: boolean;
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
  introEmail?: string;
  introRoutingMode?: 'default' | 'self' | 'direct';
  hasDirectIntroEmail?: boolean;
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
  summary?: string;
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

export type CommunityMemberType =
  | 'E-handlare / Butik'
  | 'Tjänsteleverantör / Byrå'
  | 'Transportör / Logistik / 3PL'
  | 'Plattform / PSP / SaaS';

export interface CommunityComment {
  id: string;
  author: string;
  authorRole?: string;
  authorCompany?: string;
  authorMemberType?: CommunityMemberType;
  authorUid?: string;
  body: string;
  createdAt: string;
}

export interface CommunityThread {
  id: string;
  channel: string;
  author: string;
  authorRole?: string;
  authorCompany?: string;
  authorMemberType?: CommunityMemberType;
  authorUid?: string;
  title: string;
  body?: string;
  votes: number;
  replies: number;
  comments?: CommunityComment[];
  time: string;
}

export type MemberVerificationStatus = 'pending' | 'verified' | 'rejected';

export interface CommunityMember {
  id: string;
  name: string;
  email: string;
  memberType?: CommunityMemberType;
  role: string;
  city: string;
  company?: string;
  website?: string;
  linkedinUrl?: string;
  annualOrders?: string;
  platform?: string;
  serviceFocus?: string;
  interests?: string[];
  motivation?: string;
  verificationStatus?: MemberVerificationStatus;
  verifiedAt?: string;
  authorUid?: string;
  createdAt: string;
}

export interface PublicMemberProfile {
  id: string;
  name: string;
  memberType: CommunityMemberType;
  role: string;
  city: string;
  company?: string;
  website?: string;
  platform?: string;
  serviceFocus?: string;
  interests?: string[];
  verificationStatus: MemberVerificationStatus;
  isSelf?: boolean;
}

export interface CommunityDirectMessage {
  id: string;
  senderMemberId?: string;
  senderUid: string;
  senderName: string;
  senderCompany?: string;
  senderMemberType?: CommunityMemberType;
  recipientMemberId: string;
  recipientUid?: string;
  recipientName: string;
  recipientCompany?: string;
  subject: string;
  body: string;
  read: boolean;
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
  image?: CmsImage;
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

export type FormPosition = 'top' | 'mid' | 'bottom' | 'intro-modal';
export type FormPurpose = 'contact' | 'intro' | 'ad-booking' | 'tip' | 'recruitment';
export type FormRoutingMode = 'self' | 'direct-partner' | 'custom-email';
export type ContactFormFieldType = 'text' | 'email' | 'tel' | 'select' | 'textarea';
export type ContactMessageStatus = 'new' | 'handled-self' | 'forwarded' | 'resolved';

export interface ContactFormField {
  id: string;
  key: string;
  label: string;
  type: ContactFormFieldType;
  placeholder?: string;
  required?: boolean;
  enabled: boolean;
  options?: string[];
  width?: 'half' | 'full';
}

export interface ContactFormConfig {
  id: string;
  name: string;
  purpose: FormPurpose;
  page: PortalTab | 'all';
  position: FormPosition;
  active: boolean;
  theme: 'navy' | 'light' | 'gold';
  kicker: string;
  title: string;
  subtitle: string;
  submitLabel: string;
  successMessage: string;
  routingMode: FormRoutingMode;
  recipientEmail: string;
  allowRequesterChoice?: boolean;
  fields: ContactFormField[];
  updatedAt: string;
}

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  company?: string;
  phone?: string;
  topic: string;
  adSlot?: string;
  message: string;
  formId?: string;
  formName?: string;
  submissionType?: 'contact' | 'intro' | 'ad-booking' | 'job-apply' | 'other';
  targetEntityType?: 'partner' | 'logistics' | 'job' | 'event';
  targetEntityId?: string;
  targetEntityName?: string;
  routingMode?: FormRoutingMode;
  routedToEmail?: string;
  needSummary?: string;
  monthlyVolume?: string;
  currentPlatform?: string;
  timeline?: string;
  customAnswers?: Record<string, string>;
  status?: ContactMessageStatus;
  emailDispatched?: boolean;
  createdAt: string;
}

export type NewsCategory =
  | 'Temu & Marknadsplatser'
  | 'Nya Butiker (SE & EU)'
  | 'SaaS & System'
  | 'Logistik & Regler';

export interface EcommerceNewsItem {
  id: string;
  title: string;
  summary: string;
  category: NewsCategory | string;
  region: 'Sverige' | 'Europa' | 'Norden' | 'Globalt' | string;
  sourceName: string;
  sourceUrl: string;
  publishedDate: string;
  impactNote?: string;
  tags?: string[];
  status: PublishStatus;
  fetchedByAI?: boolean;
  linkReviewedAt?: string;
}

export interface PaketindexChannelSplit {
  id: string;
  label: string;
  sharePct: number;
  note: string;
}

export interface PaketindexComparisonPoint {
  id: string;
  period: string;
  importSharePct: number;
  secondHandSharePct: number;
  note: string;
}

export interface PaketindexCarrierNote {
  id: string;
  carrier: string;
  status: string;
  note: string;
}

export interface PaketindexData {
  quarterLabel: string;
  publisher: string;
  totalParcelsMillions: number;
  yoyGrowthPct: number;
  yoyGrowthMillions: number;
  foreignImportSharePct: number;
  foreignImportComparison: string;
  secondHandParcelsLabel: string;
  secondHandSharePct: number;
  secondHandComparison: string;
  summaryText: string;
  deliveryChannels: PaketindexChannelSplit[];
  historicalComparisons: PaketindexComparisonPoint[];
  carrierScopeNotes: PaketindexCarrierNote[];
  updatedNote: string;
}

export interface PageCopyBlock {
  kicker: string;
  title: string;
  subtitle: string;
}

export interface PageContentMap {
  marknad: PageCopyBlock & {
    badgeLabel?: string;
    heroHighlight?: string;
    kpi1Label?: string;
    kpi1Value?: string;
    kpi2Label?: string;
    kpi2Value?: string;
    kpi3Label?: string;
    kpi3Value?: string;
    kpi4Label?: string;
    kpi4Value?: string;
  };
  nyheter: PageCopyBlock;
  event: PageCopyBlock;
  historia: PageCopyBlock;
  ehandlare: PageCopyBlock;
  partners: PageCopyBlock;
  logistics: PageCopyBlock;
  jobb: PageCopyBlock;
  community: PageCopyBlock;
  kontakt: PageCopyBlock & {
    contactEmail?: string;
  };
}

export interface MapPoint {
  id: string;
  label: string;
  longitude: number;
  latitude: number;
  regionKey: RegionMetric['key'];
  description: string;
  status: PublishStatus;
}

export interface CMSStore {
  mapPoints?: MapPoint[];
  schemaVersion?: number;
  merchants: Merchant[];
  partners: TechPartner[];
  logisticsProviders: LogisticsProvider[];
  news: EcommerceNewsItem[];
  events: EcommerceEvent[];
  sessions: DCSession[];
  jobs: EcommerceJob[];
  recruitmentSites: RecruitmentSite[];
  regions: Record<string, RegionMetric>;
  orderBenchmarks: CategoryOrderBenchmark[];
  shippingTiers: ShippingCostTier[];
  deliveryStats: DeliveryStatsData;
  paketindex: PaketindexData;
  pageContent: PageContentMap;
  laws: EcommerceLaw[];
  intelligenceSources: MarketIntelligenceSource[];
  techStackShares: TechStackShare[];
  adBanners: AdBanner[];
  contactForms: ContactFormConfig[];
  contactMessages: ContactMessage[];
  timeline: TimelineMilestone[];
  communityThreads: CommunityThread[];
  communityMembers: CommunityMember[];
  directMessages?: CommunityDirectMessage[];
  communityMemberCount?: number;
  communityVerifiedCount?: number;
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
  summary?: string;
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
  | 'nyheter'
  | 'event'
  | 'historia'
  | 'ehandlare'
  | 'partners'
  | '3pl'
  | 'jobb'
  | 'community'
  | 'kontakt';

export type CMSSection =
  | 'firebase'
  | 'overview'
  | 'discover'
  | 'merchants'
  | 'partners'
  | 'logistics'
  | 'paketindex'
  | 'news'
  | 'events'
  | 'timeline'
  | 'jobs'
  | 'forms'
  | 'pages'
  | 'content';

export interface CmsImage {
  path: string;
  url: string;
  alt: string;
  width: number;
  height: number;
}
export interface CmsAnalyticsReport {
  days: number;
  timeZone: string;
  rows: Array<{ page: string; views: number; activeUsers: number; engagementSeconds: number }>;
  truncated: boolean;
  dataLossFromOtherRow: boolean;
  subjectToThresholding: boolean;
}
export interface FirebaseFeatureStatus {
  mediaEnabled: boolean;
  reportsEnabled: boolean;
  collectionEnabled: boolean;
  rawIpEnabled: boolean;
  heatmapsEnabled: boolean;
}
