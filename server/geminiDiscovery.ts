import { GoogleGenAI } from '@google/genai';
import type {
  DiscoveredJobCandidate,
  DiscoveredMerchantCandidate,
  DiscoveredPartnerCandidate,
  DiscoveredRecruiterCandidate,
  GroundingSource,
} from '../src/types.ts';

function getClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    throw Object.assign(
      new Error('GEMINI_API_KEY saknas. Konfigurera nyckeln i Settings > Secrets.'),
      { statusCode: 400 }
    );
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function extractJsonArray<T>(rawText: string): T[] {
  const cleaned = rawText
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim();

  try {
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed)) return parsed as T[];
    if (parsed && typeof parsed === 'object') {
      const firstArray = Object.values(parsed).find((v) => Array.isArray(v));
      if (Array.isArray(firstArray)) return firstArray as T[];
    }
  } catch {
    // Fallback to bracket extraction
  }

  const start = cleaned.indexOf('[');
  const end = cleaned.lastIndexOf(']');
  if (start !== -1 && end > start) {
    const slice = cleaned.slice(start, end + 1);
    const parsed = JSON.parse(slice);
    if (Array.isArray(parsed)) return parsed as T[];
  }

  throw new Error('Kunde inte tolka strukturerat JSON-svar från Gemini.');
}

function extractJsonObject<T>(rawText: string): T {
  const cleaned = rawText
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim();

  try {
    const parsed = JSON.parse(cleaned);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as T;
    }
  } catch {
    // Fallback to brace extraction
  }

  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start !== -1 && end > start) {
    const slice = cleaned.slice(start, end + 1);
    return JSON.parse(slice) as T;
  }

  throw new Error('Kunde inte tolka företagsobjekt från Gemini.');
}

function extractSources(response: unknown): GroundingSource[] {
  const r = response as {
    candidates?: Array<{
      groundingMetadata?: {
        groundingChunks?: Array<{ web?: { uri?: string; title?: string } }>;
      };
    }>;
  };
  const chunks = r?.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
  const seen = new Set<string>();
  const sources: GroundingSource[] = [];

  for (const chunk of chunks) {
    const uri = chunk?.web?.uri;
    const title = chunk?.web?.title;
    if (uri && !seen.has(uri)) {
      seen.add(uri);
      sources.push({
        uri,
        title: title || uri,
      });
    }
  }
  return sources.slice(0, 8);
}

export async function discoverMerchantsWithAI(params: {
  query: string;
  category?: string;
  count?: number;
  existingNames: string[];
}): Promise<{ candidates: DiscoveredMerchantCandidate[]; sources: GroundingSource[] }> {
  const ai = getClient();
  const limit = Math.min(Math.max(params.count ?? 8, 3), 15);
  const excludeList = params.existingNames.slice(0, 40).join(', ');

  const prompt = `Använd Google Search för att hitta riktiga, aktiva svenska e-handlare (webbutiker) som matchar följande sökning:
Sökfråga: "${params.query}"
${params.category && params.category !== 'all' ? `Önskad bransch: "${params.category}"` : ''}
Antal att hitta: cirka ${limit} företag.
Undvik helst att duplicera dessa redan tillagda butiker om det finns andra bra svenska e-handlare: ${excludeList || 'inga'}

För varje svensk e-handlare, returnera en JSON-array (ENDAST giltig JSON-array, ingen övrig text) där varje objekt har EXAKT dessa nycklar:
- "name": string (butikens officiella namn, t.ex. "Gymgrossisten")
- "domain": string (huvuddomän utan https://, t.ex. "gymgrossisten.com")
- "city": string (huvudkontor eller lagerstad i Sverige)
- "region": string (en av: "vast", "svealand", "smaland", "syd", "norrland")
- "category": string (en av: "Apotek & Skönhet", "Hemelektronik", "Mode & Outdoor", "Hem & Inredning", "Sport & Fritid", "Böcker & Media", "Dagligvaror & Mat", "Barn & Familj", "Övrigt")
- "trustpilot": number (verkligt eller ungefärligt betyg 1.0–5.0, t.ex. 4.4)
- "reviews": string (t.ex. "18 400+")
- "revenue": string (uppskattad eller rapporterad e-handelsomsättning, t.ex. "1,2 mdr SEK" eller "480 M SEK")
- "revenueNumericM": number (omsättning i miljoner SEK som heltal, t.ex. 1200 eller 480)
- "yoyGrowth": string (årlig tillväxt YoY t.ex. "+14% YoY" eller "-2% YoY")
- "yoyGrowthPct": number (tillväxtprocent som tal, t.ex. 14 eller -2)
- "revenueYear": string (senaste räkenskapsår, t.ex. "2025/2026")
- "platform": string (e-handelsplattform om känd, t.ex. "Centra", "Shopify Plus", "Norce", "Litium", "Magento", "Egenbyggd")
- "paymentProvider": string (t.ex. "Klarna & Swish")
- "carrier": string (t.ex. "PostNord, Instabox, Budbee")
- "certs": string[] (t.ex. ["Trygg E-handel", "Fossilfri frakt"])
- "desc": string (koncis svensk beskrivning på 1–2 meningar av vad de säljer och deras position på marknaden)`;

  const response = await ai.models.generateContent({
    model: 'gemini-4-hydrogen',
    contents: prompt,
    config: {
      tools: [{ googleSearch: {} }],
      systemInstruction:
        'Du är en svensk e-handelsanalytiker. Du returnerar alltid korrekt, verifierad information om riktiga svenska e-handlare i strikt JSON-format utan markdown-prat runtomkring.',
    },
  });

  const text = response.text ?? '[]';
  const rawList = extractJsonArray<DiscoveredMerchantCandidate>(text);
  const existingSet = new Set(params.existingNames.map((n) => n.toLowerCase().trim()));

  const candidates = rawList
    .filter((item) => item && typeof item.name === 'string' && item.name.trim().length > 0)
    .map((item) => ({
      name: item.name.trim(),
      domain: (item.domain || `${item.name.toLowerCase().replace(/[^a-z0-9]/g, '')}.se`)
        .replace(/^https?:\/\//, '')
        .replace(/\/.*$/, ''),
      city: item.city || 'Stockholm',
      region: ['vast', 'svealand', 'smaland', 'syd', 'norrland'].includes(item.region)
        ? item.region
        : 'svealand',
      category: item.category || 'Övrigt',
      trustpilot: typeof item.trustpilot === 'number' && item.trustpilot >= 1 && item.trustpilot <= 5 ? Number(item.trustpilot.toFixed(1)) : 4.4,
      reviews: item.reviews || 'Verifierad',
      revenue: item.revenue || '100–500M SEK',
      revenueNumericM: typeof item.revenueNumericM === 'number' ? item.revenueNumericM : undefined,
      yoyGrowth: item.yoyGrowth || (typeof item.yoyGrowthPct === 'number' ? `${item.yoyGrowthPct > 0 ? '+' : ''}${item.yoyGrowthPct}% YoY` : '+8% YoY'),
      yoyGrowthPct: typeof item.yoyGrowthPct === 'number' ? item.yoyGrowthPct : 8,
      revenueYear: item.revenueYear || '2025/2026',
      platform: item.platform || 'Modern E-handel',
      paymentProvider: item.paymentProvider || 'Klarna & Swish',
      carrier: item.carrier || 'PostNord, Instabox',
      certs: Array.isArray(item.certs) && item.certs.length > 0 ? item.certs : ['Trygg E-handel'],
      desc: item.desc || 'Svensk e-handlare.',
      alreadyExists: existingSet.has(item.name.toLowerCase().trim()),
    }));

  return {
    candidates,
    sources: extractSources(response),
  };
}

export async function discoverPartnersWithAI(params: {
  query: string;
  category?: string;
  count?: number;
  existingNames: string[];
}): Promise<{ candidates: DiscoveredPartnerCandidate[]; sources: GroundingSource[] }> {
  const ai = getClient();
  const limit = Math.min(Math.max(params.count ?? 8, 3), 15);
  const excludeList = params.existingNames.slice(0, 40).join(', ');

  const prompt = `Använd Google Search för att hitta riktiga, aktiva svenska eller nordiska tech-partners, SaaS-bolag, betallösningar, transportörer, TA-system, logistikaktörer och MarTech-bolag för e-handel som matchar sökningen:
Sökfråga: "${params.query}"
${params.category && params.category !== 'all' ? `Önskad kategori: "${params.category}"` : ''}
Antal att hitta: cirka ${limit} företag.
Undvik helst att duplicera dessa redan tillagda partners om det finns andra relevanta aktörer: ${excludeList || 'inga'}

För varje tech-partner, returnera en JSON-array (ENDAST giltig JSON-array, ingen övrig text) där varje objekt har EXAKT dessa nycklar:
- "name": string (företagets officiella namn, t.ex. "Kustom" eller "Voyado")
- "domain": string (huvuddomän utan https://, t.ex. "kustom.co")
- "cat": string (en av: "E-handelsplattform", "Betalning & Checkout", "Logistik & Last-mile", "MarTech & AI", "ERP & Omnichannel")
- "subType": string (en av: "Betalning & Checkout", "Transportör", "TA-system", "3PL & Returer", "E-handelsplattform", "MarTech & AI", "ERP & Omnichannel")
- "origin": string (huvudkontorsstad i Sverige/Norden, t.ex. "Stockholm", "Göteborg", "Malmö")
- "stack": string (3–4 nyckelkompetenser separerade med " · ", t.ex. "PIM · Omnichannel · B2B")
- "customerCount": string (antal kunder eller anslutna handlare om känt, t.ex. "1 500+ nordiska handlare" eller "50 000+ företag")
- "pricingModel": string (t.ex. "SaaS-licens + % GMV" eller "Transaktionsavgift")
- "setupTime": string (t.ex. "1–2 veckor")
- "bestFor": string (vem lösningen passar bäst för)
- "keyStrengths": string[] (2–3 konkreta styrkor)
- "notableClients": string[] (2–4 kända svenska e-handelskunder om kända, annars tom array)
- "desc": string (koncis svensk beskrivning på 1–2 meningar av vad partnern levererar till svenska e-handlare)`;

  const response = await ai.models.generateContent({
    model: 'gemini-4-hydrogen',
    contents: prompt,
    config: {
      tools: [{ googleSearch: {} }],
      systemInstruction:
        'Du är en svensk e-handelsarkitekt. Du returnerar alltid verifierad information om riktiga tech-partners inom svensk/nordisk e-handel i strikt JSON-format utan extra förklaringar.',
    },
  });

  const text = response.text ?? '[]';
  const rawList = extractJsonArray<DiscoveredPartnerCandidate>(text);
  const existingSet = new Set(params.existingNames.map((n) => n.toLowerCase().trim()));

  const candidates = rawList
    .filter((item) => item && typeof item.name === 'string' && item.name.trim().length > 0)
    .map((item) => ({
      name: item.name.trim(),
      domain: (item.domain || `${item.name.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`)
        .replace(/^https?:\/\//, '')
        .replace(/\/.*$/, ''),
      cat: item.cat || 'E-handelsplattform',
      subType: item.subType || item.cat || 'E-handelsplattform',
      origin: item.origin || 'Stockholm',
      stack: item.stack || 'SaaS · API-first',
      customerCount: item.customerCount || 'Nordiska & europeiska handlare',
      pricingModel: item.pricingModel || 'SaaS / Volymavtal',
      setupTime: item.setupTime || '1–4 veckor',
      bestFor: item.bestFor || 'Växande svenska e-handlare',
      keyStrengths: Array.isArray(item.keyStrengths) ? item.keyStrengths.slice(0, 4) : [],
      notableClients: Array.isArray(item.notableClients) ? item.notableClients.slice(0, 5) : [],
      desc: item.desc || 'Nordisk teknisk partner för digital handel.',
      alreadyExists: existingSet.has(item.name.toLowerCase().trim()),
    }));

  return {
    candidates,
    sources: extractSources(response),
  };
}

export async function enrichSingleEntityWithAI(params: {
  target: 'merchant' | 'partner';
  name: string;
  domain?: string;
}): Promise<{ data: Partial<DiscoveredMerchantCandidate> | Partial<DiscoveredPartnerCandidate>; sources: GroundingSource[] }> {
  const ai = getClient();

  if (params.target === 'merchant') {
    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: `Slå upp den svenska e-handlaren "${params.name}" ${params.domain ? `(${params.domain})` : ''} med Google Search och returnera ETT JSON-objekt med nycklarna: name, domain, city, region ("vast"|"svealand"|"smaland"|"syd"|"norrland"), category ("Apotek & Skönhet"|"Hemelektronik"|"Mode & Outdoor"|"Hem & Inredning"|"Sport & Fritid"|"Böcker & Media"|"Dagligvaror & Mat"|"Barn & Familj"|"Övrigt"), trustpilot (number), reviews (string), revenue (string), revenueNumericM (number i miljoner SEK), yoyGrowth (string t.ex. "+12% YoY"), yoyGrowthPct (number), revenueYear (string), platform (string), paymentProvider (string), carrier (string), certs (string[]), desc (string på svenska). Endast JSON.`,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });
    const data = extractJsonObject<Partial<DiscoveredMerchantCandidate>>(response.text ?? '{}');
    return { data, sources: extractSources(response) };
  }

  const response = await ai.models.generateContent({
    model: 'gemini-4-hydrogen',
    contents: `Slå upp e-handelspartnern / techbolaget "${params.name}" ${params.domain ? `(${params.domain})` : ''} med Google Search och returnera ETT JSON-objekt med nycklarna: name, domain, cat ("E-handelsplattform"|"Betalning & Checkout"|"Logistik & Last-mile"|"MarTech & AI"|"ERP & Omnichannel"), subType (string), origin (stad), stack (sträng med " · "), customerCount (antal kunder t.ex. "2 500+ handlare"), pricingModel (string), setupTime (string), bestFor (string), keyStrengths (string[]), notableClients (string[]), desc (string på svenska). Endast JSON.`,
    config: {
      tools: [{ googleSearch: {} }],
    },
  });
  const data = extractJsonObject<Partial<DiscoveredPartnerCandidate>>(response.text ?? '{}');
  return { data, sources: extractSources(response) };
}

export async function discoverJobsWithAI(params: {
  query: string;
  category?: string;
  count?: number;
  existingTitles: string[];
}): Promise<{ candidates: DiscoveredJobCandidate[]; sources: GroundingSource[] }> {
  const ai = getClient();
  const limit = Math.min(Math.max(params.count ?? 8, 3), 15);
  const excludeList = params.existingTitles.slice(0, 30).join(', ');
  const todayIso = new Date().toISOString().slice(0, 10);

  const prompt = `Dagens datum är ${todayIso}. Använd Google Search för att hitta ENDAST AKTUELLA och fortfarande öppna jobbannonser (inte stängda, tillsatta eller utgångna) inom svensk e-handel som matchar:
Sökfråga: "${params.query}"
${params.category && params.category !== 'all' ? `Rollkategori: "${params.category}"` : ''}
Antal: cirka ${limit} aktiva jobb.
KRITISKT: Inkludera INTE utgångna jobbannonser, gamla annonser från 2024/2025 eller trasiga länkar.
Undvik att duplicera dessa redan listade roller: ${excludeList || 'inga'}

Returnera ENDAST en giltig JSON-array där varje objekt har exakt dessa nycklar:
- "title": string (rolltitel, t.ex. "E-commerce Manager")
- "company": string (svenskt företag, t.ex. "Lyko" eller "Centra")
- "city": string (stad i Sverige eller "Remote")
- "workModel": string ("Hybrid" | "På plats" | "Remote")
- "roleCategory": string ("E-commerce Management" | "Tech & Utveckling" | "Growth & MarTech" | "Logistik & Supply Chain" | "Merchandising & CX")
- "seniority": string (t.ex. "Mid-level", "Senior", "Chef / Lead")
- "applyUrl": string (verifierad aktiv https://-URL till jobbannons eller karriärsida)
- "expiresAt": string (sista ansökningsdag eller giltighetstid i formatet YYYY-MM-DD, minst ${todayIso})
- "skills": string[] (3–4 relevanta kompetenser)
- "desc": string (koncis svensk beskrivning på 1–2 meningar)`;

  const response = await ai.models.generateContent({
    model: 'gemini-4-hydrogen',
    contents: prompt,
    config: {
      tools: [{ googleSearch: {} }],
      systemInstruction:
        'Du är en svensk e-handelsrekryterare. Returnera endast aktuella, aktiva och verifierade svenska e-handelsroller med giltiga karriärlänkar och framtida sista ansökningsdatum i strikt JSON-format.',
    },
  });

  const text = response.text ?? '[]';
  const rawList = extractJsonArray<DiscoveredJobCandidate>(text);
  const existingSet = new Set(params.existingTitles.map((t) => t.toLowerCase().trim()));
  const defaultExpiry = new Date(Date.now() + 45 * 86400000).toISOString().slice(0, 10);

  const candidates = rawList
    .filter((item) => {
      if (!item || typeof item.title !== 'string' || typeof item.company !== 'string') return false;
      const blob = `${item.title} ${item.desc ?? ''}`.toLowerCase();
      if (blob.includes('utgången') || blob.includes('tillsatt') || blob.includes('stängd')) {
        return false;
      }
      if (item.expiresAt && /^\d{4}-\d{2}-\d{2}$/.test(item.expiresAt) && item.expiresAt < todayIso) {
        return false;
      }
      return true;
    })
    .map((item) => ({
      title: item.title.trim(),
      company: item.company.trim(),
      city: item.city || 'Stockholm',
      workModel: (['Hybrid', 'På plats', 'Remote'].includes(item.workModel)
        ? item.workModel
        : 'Hybrid') as 'Hybrid' | 'På plats' | 'Remote',
      roleCategory: item.roleCategory || 'E-commerce Management',
      seniority: item.seniority || 'Mid / Senior',
      applyUrl: item.applyUrl?.startsWith('http')
        ? item.applyUrl
        : `https://${(item.applyUrl || 'ehandel.se/jobb').replace(/^https?:\/\//, '')}`,
      expiresAt:
        item.expiresAt && /^\d{4}-\d{2}-\d{2}$/.test(item.expiresAt) && item.expiresAt >= todayIso
          ? item.expiresAt
          : defaultExpiry,
      skills: Array.isArray(item.skills) ? item.skills.slice(0, 5) : [],
      desc: item.desc || `Roll inom svensk e-handel hos ${item.company}.`,
      alreadyExists: existingSet.has(`${item.title} @ ${item.company}`.toLowerCase().trim()),
    }));

  return {
    candidates,
    sources: extractSources(response),
  };
}

export async function discoverRecruitersWithAI(params: {
  query: string;
  category?: string;
  count?: number;
  existingNames: string[];
}): Promise<{ candidates: DiscoveredRecruiterCandidate[]; sources: GroundingSource[] }> {
  const ai = getClient();
  const limit = Math.min(Math.max(params.count ?? 8, 3), 15);
  const excludeList = params.existingNames.slice(0, 30).join(', ');

  const prompt = `Använd Google Search för att hitta riktiga svenska rekryteringssidor, jobbportaler, headhunters och bemannings-/rekryteringsbyråer som rekryterar till roller inom svensk e-handel (t.ex. E-commerce Manager, Tech/Utvecklare, Performance/Growth, Logistik/Supply Chain, Inköp/CX):
Sökfråga: "${params.query}"
Antal: cirka ${limit} aktörer.
Undvik att duplicera dessa redan listade: ${excludeList || 'inga'}

Returnera ENDAST en giltig JSON-array där varje objekt har exakt dessa nycklar:
- "name": string (namn på rekryteringssidan eller byrån)
- "domain": string (domän/sökväg utan https://, t.ex. "ehandel.se/jobb")
- "type": string ("Jobbportal" | "Rekryteringsbyrå" | "Headhunting & Interim")
- "rolesCovered": string[] (välj bland: "E-commerce Management", "Tech & Utveckling", "Growth & MarTech", "Logistik & Supply Chain", "Merchandising & CX")
- "coverage": string (t.ex. "Stockholm, Göteborg & Malmö" eller "Hela Sverige")
- "desc": string (koncis svensk beskrivning på 1–2 meningar om vilka roller de rekryterar till)`;

  const response = await ai.models.generateContent({
    model: 'gemini-4-hydrogen',
    contents: prompt,
    config: {
      tools: [{ googleSearch: {} }],
      systemInstruction:
        'Du är en svensk karriär- och rekryteringsrådgivare inom digital handel. Returnera en strikt JSON-array med riktiga svenska rekryteringsaktörer och jobbportaler.',
    },
  });

  const text = response.text ?? '[]';
  const rawList = extractJsonArray<DiscoveredRecruiterCandidate>(text);
  const existingSet = new Set(params.existingNames.map((n) => n.toLowerCase().trim()));

  const candidates = rawList
    .filter((item) => item && typeof item.name === 'string')
    .map((item) => ({
      name: item.name.trim(),
      domain: (item.domain || 'ehandel.se/jobb').replace(/^https?:\/\//, ''),
      type: (['Jobbportal', 'Rekryteringsbyrå', 'Headhunting & Interim'].includes(item.type)
        ? item.type
        : 'Rekryteringsbyrå') as 'Jobbportal' | 'Rekryteringsbyrå' | 'Headhunting & Interim',
      rolesCovered:
        Array.isArray(item.rolesCovered) && item.rolesCovered.length > 0
          ? item.rolesCovered
          : ['E-commerce Management'],
      coverage: item.coverage || 'Hela Sverige',
      desc: item.desc || 'Rekryteringssida och karriärpartner inom svensk e-handel.',
      alreadyExists: existingSet.has(item.name.toLowerCase().trim()),
    }));

  return {
    candidates,
    sources: extractSources(response),
  };
}

