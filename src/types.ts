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
  hasCompanyIntroInbox?: boolean;
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
  hasCompanyIntroInbox?: boolean;
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
  salaryEstimate?: SalaryEstimate | null;
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
  invitation?: {email:string;name:string;from:string;startedAt:string;acceptedAt?:string;templateVersion?:2};
  directoryHidden?: boolean;
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
  authorUid?: string;
  assignedStaffUid?: string;
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
  om?: PageCopyBlock & { body?: string };
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
  collaboration?: CollaborationStore;
  publicCompanyPages?: PublicCompanyPage[];
  pageLayouts?: PageLayouts;
  homeWidgets?: HomeWidgetLayout;
  editorialHistory?: EditorialVersion[];
  saleCases?: SaleCase[];
  startGuide?: GuideChapter[];
  saleListings?: SaleListing[];
  publicSaleListings?: PublicSaleListing[];
  staffProfiles?: StaffProfile[];
  memberGovernance?: MemberGovernance;
  communitySettings?: CommunitySettings;
  insightPosts?: InsightPost[];
  paketindexArchive?: PaketindexObservation[];
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
  | 'blogg'
  | 'starta'
  | 'kop-salj'
  | 'om'
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
  | 'company-pages'
  | 'collaboration'
  | 'widgets'
  | 'workflow'
  | 'commerce'
  | 'members'
  | 'insights'
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

export interface PaketindexObservation {
  edition: string;
  period: string;
  metric: 'total' | 'domestic' | 'foreign' | 'returns' | 'secondhand' | 'export' | 'bulky' | 'returnRate' | 'pickupShare' | 'homeShare' | 'lockerShare';
  basis: 'carrier' | 'survey' | 'legacy';
  value: number;
  unit: 'packages' | 'percent';
  sourceName: string;
  sourceUrl: string;
  publishedDate: string;
  precision: 'exact' | 'rounded-thousands';
  sampleSize?: number;
  note: string;
  status: PublishStatus;
}

export interface SalaryEstimate {
  min: number;
  max: number;
  currency: 'SEK';
  period: 'month';
  fullTime: true;
  occupation: string;
  geography: string;
  geographicLevel: 'local' | 'regional' | 'national';
  sourceName: string;
  sourceUrl: string;
  year: number;
  method: string;
}

export interface InsightPost extends EditorialLifecycle, ContentMetadata {
  id: string;
  title: string;
  category: string;
  excerpt: string;
  body: string;
  imageKey: '' | 'checkout' | 'logistics' | 'events';
  imageAlt: string;
  image?: CmsImage;
  ctaLabel: string;
  targetTab: PortalTab | '';
  targetUrl: string;
  sourceUrl: string;
  author: string;
  publishedDate: string;
  theme: 'light' | 'dark';
  order: number;
  status: PublishStatus;
}

export type CompanyEntityType = 'partner' | 'logistics' | 'merchant';
export interface CommunitySettings {
  enabled: boolean; postingEnabled: boolean; commentsEnabled: boolean; messagesEnabled: boolean;
  registrationEnabled: boolean; directoryEnabled: boolean; reportsEnabled: boolean;
}
export interface CompanyMemberLink {
  verificationClaimId?:string; verifiedEmail?:string;
  id: string; uid: string; entityType: CompanyEntityType; entityId: string;
  status: 'active' | 'revoked'; canPropose: boolean; receiveIntros: boolean;
  receiveMessages: boolean; includeHistory: boolean; createdAt: string; updatedAt: string;
}
export interface CompanyProposal {
  id: string; uid: string; entityType: CompanyEntityType; entityId: string; kind: 'edit' | 'delete';
  patch: Record<string, string>; base: Record<string, string>; reason: string;
  status: 'pending' | 'approved' | 'rejected'; createdAt: string; comment: string;
}
export interface CommunityReport {
  id: string; uid: string; threadId: string; commentId: string;
  reason: 'offensive' | 'incorrect' | 'spam' | 'other'; detail: string;
  status: 'open' | 'resolved'; createdAt: string; resolution: string;
}
export interface MemberGovernance {
  settings: CommunitySettings; links: CompanyMemberLink[]; proposals: CompanyProposal[];
  reports: CommunityReport[]; blocks: Array<{ uid: string; reason: string; createdAt: string }>;
  hidden: Array<{ threadId: string; commentId: string }>;
  audit: Array<{ id: string; actorUid: string; action: string; target: string; createdAt: string; detail?: string }>;
  inboxReads: Array<{ uid: string; messageId: string }>;
}
export interface CompanyWorkspace {
  companies: Array<{ link: CompanyMemberLink; name: string; fields: Record<string,string> }>;
  proposals: CompanyProposal[];
  messages: Array<{ id: string; name: string; email: string; company?: string; topic: string;
    message: string; createdAt: string; entityName: string; read: boolean; kind: string }>;
}

export interface StaffProfile {
  uid: string; email: string; name: string; phone: string; position: string;
  company: string; employmentSince: string; expertise: string; photoUrl: string; updatedAt: string;
}
export interface MyStaffProfile {
  profile: StaffProfile | null;
  identity: { uid: string; email: string; admin: boolean };
}

export interface GuideChapter extends EditorialLifecycle, ContentMetadata {
  id: string; title: string; summary: string; body: string; checklist: string[];
  targetTab: 'partners' | '3pl' | 'ehandlare' | 'kontakt' | 'jobb';
  sourceUrl: string; reviewedDate: string; order: number; status: PublishStatus;
}
export type SaleCategory = 'brand' | 'webshop' | 'stock';
export interface SaleDetails extends ContentMetadata {
  intent?: 'buy' | 'sell';
  title: string; category: SaleCategory; description: string; included: string;
  location: string; priceLabel: string; quantity: string; condition: string;
}
export interface SaleListing extends SaleDetails, EditorialLifecycle {
  images?: CmsImage[];
  origin?: 'cms';
  createdByUid?: string;
  id: string; status: 'pending' | 'draft' | 'published' | 'rejected';
  availability: 'available' | 'discussions' | 'sold';
  sellerUid: string; sellerEmail: string; sellerName: string;
  authorityConfirmed: boolean; publicContentConfirmed: boolean;
  internalNotes: string; reviewedBy: string; reviewedAt: string; createdAt: string; updatedAt: string;
}
export type PublicSaleListing = SaleDetails & Pick<SaleListing,'id'|'availability'|'updatedAt'|'images'>;

export interface EditorialLifecycle {
  revision?: number; publishAt?: string; expiresAt?: string; trashedAt?: string;
}
export type EditorialKind = 'sale' | 'guide' | 'insight';
export interface EditorialVersion {
  id: string; kind: EditorialKind; targetId: string; actorUid: string; at: string;
  action: string; before: SaleListing | GuideChapter | InsightPost;
}
export interface SaleCase {
  messageId: string; assignedUid: string; state: 'new'|'working'|'waiting'|'resolved';
  dueDate: string; note: string; revision: number; updatedAt: string; updatedBy: string;
}

export type HomeWidgetId = 'audience' | 'latest-index' | 'index-archive' | 'insights' | 'top-ad' | 'top-form' | 'checkout-cta' | 'mid-ad' | 'bottom-form' | 'regions-map' | 'industry-trends' | 'consumer-insights';
export interface HomeWidgetLayout {
  version: 1 | 2 | 3; revision: number;
  items: Array<{id:HomeWidgetId;enabled:boolean;order:number}>;
}

export interface ContentMetadata {
  contentFormat?: 'markdown'; seoTitle?: string; seoDescription?: string; tags?: string[];
}

export interface PageLayout {version:1;revision:number;legacyHomeRevision?:number;items:Array<{id:string;enabled:boolean;order:number}>}
export type PageLayouts=Partial<Record<PortalTab,PageLayout>>;

export type PlatformRole='admin'|'editor'|'writer'|'community-admin';
export interface RoleGrant {uid:string;roles:PlatformRole[];updatedAt:string;updatedBy:string}
export interface EditorialDraft {id:string;uid:string;revision:number;kind:'insight'|'guide'|'news';targetId:string;baseHash:string;targetHash?:string;state:'draft'|'review'|'published';title:string;summary:string;body:string;category:string;sourceUrl:string;sourceName:string;date:string;updatedAt:string}
export interface CompanyWidget {id:string;type:'text'|'services'|'image'|'contact'|'form';title:string;body:string;url:string;alt:string;formId:string;enabled:boolean}
export interface CompanyPageField {id:string;label:string;type:'text'|'email'|'tel'|'textarea'|'select';required:boolean;options:string[]}
export interface CompanyPageForm {id:string;title:string;purpose:'lead'|'quote'|'support';fields:CompanyPageField[];recipientUids:string[]}
export interface CompanyPageContent {title:string;summary:string;widgets:CompanyWidget[];forms:CompanyPageForm[]}
export interface CompanyPage {managedByPlatform?:boolean;responsibleUid?:string;id:string;entityType:CompanyEntityType;entityId:string;slug:string;revision:number;draft:CompanyPageContent;published?:CompanyPageContent;state:'draft'|'review'|'published'|'rejected';submittedAsAdmin?:boolean;submittedBy:string;reviewedBy:string;updatedAt:string}
export interface PublicCompanyPage {entityId?:string;entityType?:CompanyEntityType;id:string;slug:string;entityName:string;content:Omit<CompanyPageContent,'forms'>&{forms:Array<Omit<CompanyPageForm,'recipientUids'>>}}
export interface CompanyPageMessage {id:string;pageId:string;formId:string;purpose:'lead'|'quote'|'support';uid:string;email:string;answers:Record<string,string>;createdAt:string;assignedUid:string;state:'new'|'working'|'resolved';revision:number}
export interface CollaborationStore {verification?:CompanyVerificationState;revision:number;roles:RoleGrant[];drafts:EditorialDraft[];pages:CompanyPage[];messages:CompanyPageMessage[];audit:Array<{id:string;uid:string;action:string;target:string;at:string}>;communityBlocks:Array<{uid:string;reason:string;at:string}>}

export interface StarterPagesResult {created:number;existing:number;pages:Array<{id:string;slug:string;created:boolean}>}
export interface TeamActionResult {ok:boolean;id?:string;starterPages?:StarterPagesResult}

export interface CompanyVerificationPolicy {entityType:CompanyEntityType;entityId:string;domains:string[];registrationNumber:string;address:string;reviewedBy:string;reviewedAt:string}
export interface CompanyAdministrationClaim {id:string;uid:string;email:string;entityType:CompanyEntityType;entityId:string;name:string;position:string;registrationNumber:string;address:string;reason:string;state:'pending'|'approved'|'rejected'|'revoked';revision:number;createdAt:string;reviewedBy:string;reviewedAt:string;reviewNote:string;domainMatched:boolean;mfaVerifiedAt:string;linkId?:string}
export interface CompanyVerificationState {policies:CompanyVerificationPolicy[];claims:CompanyAdministrationClaim[]}
