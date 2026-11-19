import express, { type RequestHandler, type ErrorRequestHandler } from 'express';
import type { CmsDataStore } from './firestoreStore.ts';
import { publicStore } from './publicStore.ts';
import type { CmsIdentity } from './authPolicy.ts';
import { upgradeSnapshot, validateSnapshot } from './snapshot.ts';
import {
  discoverJobsWithAI,
  discoverMerchantsWithAI,
  discoverPartnersWithAI,
  discoverRecruitersWithAI,
  enrichSingleEntityWithAI,
} from './geminiDiscovery.ts';


const route = (handler: RequestHandler): RequestHandler => (req, res, next) => {
  Promise.resolve(handler(req, res, next)).catch(next);
};

// These member actions require verified login; all editorial writes and AI calls require admin.
const isMemberSubmission = (method: string, path: string) => method === 'POST' && (
  ['/api/contact', '/api/community/threads', '/api/community/members'].includes(path) ||
  /^\/api\/community\/threads\/[^/]+\/upvote$/.test(path)
);

export function createCmsApp(store: CmsDataStore, verifyToken: (token: string) => Promise<CmsIdentity>) {
  const app = express();
  app.disable('x-powered-by');
  app.use('/api', (_req, res, next) => {
    // Authenticated and public responses share URLs; never cache either variant.
    res.setHeader('Cache-Control', 'private, no-store');
    next();
  });
  app.use('/api', route(async (req, res, next) => {
    const path = req.originalUrl.split('?')[0].replace(/\/$/, '');
    const publicRead = ['GET', 'HEAD'].includes(req.method) &&
      ['/api/cms/store', '/api/merchants', '/api/partners'].includes(path);
    const authorization = req.get('authorization');
    let identity: CmsIdentity | undefined;
    if (authorization) {
      if (!authorization.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Ogiltig inloggning. Logga in igen.' });
        return;
      }
      try { identity = await verifyToken(authorization.slice(7)); }
      catch {
        res.status(401).json({ error: 'Inloggningen har gått ut. Logga in igen.' });
        return;
      }
    }
    const admin = identity?.admin === true;
    res.locals.cmsIdentity = identity;
    res.locals.cmsAdmin = admin;
    if (isMemberSubmission(req.method, path) && !identity?.verified) {
      res.status(identity ? 403 : 401).json({ error: 'Logga in med ett verifierat Google-konto för att skicka formuläret.' });
      return;
    }
    if (!publicRead && !isMemberSubmission(req.method, path) && !admin) {
      res.status(authorization ? 403 : 401).json({ error: 'CMS-administratör krävs. Öppna CMS och logga in.' });
      return;
    }
    next();
  }));
  app.use(express.json({ limit: '800kb' }));

  app.use('/api', (req, res, next) => {
    const path = req.originalUrl.split('?')[0].replace(/\/$/, '');
    if (!isMemberSubmission(req.method, path)) { next(); return; }
    const fields: Record<string, [number, number]> = path === '/api/contact'
      ? { name: [1, 100], email: [3, 160], topic: [1, 100], message: [2, 2000] }
      : path === '/api/community/members'
      ? { name: [1, 80], email: [3, 160], role: [1, 80], city: [1, 60] }
      : path === '/api/community/threads'
      ? { channel: [2, 40], author: [1, 80], title: [3, 220] } : {};
    if (Object.entries(fields).some(([key, [min, max]]) => typeof req.body?.[key] !== 'string' ||
      req.body[key].trim().length < min || req.body[key].length > max) ||
      Object.entries({ company: 120, adSlot: 100 }).some(([key, max]) => req.body?.[key] !== undefined &&
        (typeof req.body[key] !== 'string' || req.body[key].length > max))) {
      res.status(400).json({ error: 'Fyll i formulärets obligatoriska fält med giltig text.' });
      return;
    }
    next();
  });

  // --- CMS STORE & BACKUP ---
  app.get('/api/cms/store', route(async (_req, res) => {
    res.json(publicStore(await store.getStore(), res.locals.cmsAdmin === true));
  }));

  app.post('/api/cms/import', route(async (req, res) => {
    const imported = upgradeSnapshot(req.body);
    if (!validateSnapshot(imported)) {
      res.status(400).json({ error: 'Ogiltigt CMS-format. Exportera en fullständig CMS-backup och försök igen.' });
      return;
    }
    res.json(await store.replaceStore(imported));
  }));

  app.post('/api/cms/reset', route(async (_req, res) => {
    res.json(await store.resetStore());
  }));

  // --- MERCHANTS (E-HANDLARE) ---
  app.get('/api/merchants', route(async (_req, res) => {
    res.json(publicStore(await store.getStore(), res.locals.cmsAdmin === true).merchants);
  }));

  app.post('/api/merchants', route(async (req, res) => {
    if (!req.body?.name) {
      res.status(400).json({ error: 'Butiksnamn krävs.' });
      return;
    }
    const result = await store.upsertMerchant(req.body);
    res.status(result.created ? 201 : 200).json(result);
  }));

  app.post('/api/merchants/batch', route(async (req, res) => {
    const items = req.body?.items;
    if (!Array.isArray(items)) {
      res.status(400).json({ error: 'items-array krävs.' });
      return;
    }
    const result = await store.batchAddMerchants(items);
    res.status(201).json(result);
  }));

  app.put('/api/merchants/:id', route(async (req, res) => {
    if (!req.body?.name) {
      res.status(400).json({ error: 'Butiksnamn krävs.' });
      return;
    }
    const result = await store.upsertMerchant({ ...req.body, id: req.params.id });
    res.json(result);
  }));

  app.delete('/api/merchants/:id', route(async (req, res) => {
    const ok = await store.deleteMerchant(req.params.id);
    if (!ok) {
      res.status(404).json({ error: 'E-handlare hittades inte.' });
      return;
    }
    res.json({ deleted: true });
  }));

  // --- TECH PARTNERS ---
  app.get('/api/partners', route(async (_req, res) => {
    res.json(publicStore(await store.getStore(), res.locals.cmsAdmin === true).partners);
  }));

  app.post('/api/partners', route(async (req, res) => {
    if (!req.body?.name) {
      res.status(400).json({ error: 'Partnernamn krävs.' });
      return;
    }
    const result = await store.upsertPartner(req.body);
    res.status(result.created ? 201 : 200).json(result);
  }));

  app.post('/api/partners/batch', route(async (req, res) => {
    const items = req.body?.items;
    if (!Array.isArray(items)) {
      res.status(400).json({ error: 'items-array krävs.' });
      return;
    }
    const result = await store.batchAddPartners(items);
    res.status(201).json(result);
  }));

  app.put('/api/partners/:id', route(async (req, res) => {
    if (!req.body?.name) {
      res.status(400).json({ error: 'Partnernamn krävs.' });
      return;
    }
    const result = await store.upsertPartner({ ...req.body, id: req.params.id });
    res.json(result);
  }));

  app.delete('/api/partners/:id', route(async (req, res) => {
    const ok = await store.deletePartner(req.params.id);
    if (!ok) {
      res.status(404).json({ error: 'Partner hittades inte.' });
      return;
    }
    res.json({ deleted: true });
  }));

  // --- 3PL & 4PL LOGISTICS PROVIDERS ---
  app.post('/api/logistics', route(async (req, res) => {
    if (!req.body?.name) {
      res.status(400).json({ error: 'Namn på logistikpartner krävs.' });
      return;
    }
    const result = await store.upsertLogisticsProvider(req.body);
    res.status(result.created ? 201 : 200).json(result);
  }));

  app.put('/api/logistics/:id', route(async (req, res) => {
    if (!req.body?.name) {
      res.status(400).json({ error: 'Namn på logistikpartner krävs.' });
      return;
    }
    const result = await store.upsertLogisticsProvider({ ...req.body, id: req.params.id });
    res.json(result);
  }));

  app.delete('/api/logistics/:id', route(async (req, res) => {
    const ok = await store.deleteLogisticsProvider(req.params.id);
    if (!ok) {
      res.status(404).json({ error: 'Logistikpartner hittades inte.' });
      return;
    }
    res.json({ deleted: true });
  }));

  // --- EVENTS & MÄSSOR ---
  app.post('/api/events', route(async (req, res) => {
    if (!req.body?.name) {
      res.status(400).json({ error: 'Eventnamn krävs.' });
      return;
    }
    const created = await store.upsertEvent(req.body);
    res.status(201).json(created);
  }));

  app.put('/api/events/:id', route(async (req, res) => {
    const updated = await store.upsertEvent({ ...req.body, id: req.params.id });
    res.json(updated);
  }));

  app.delete('/api/events/:id', route(async (req, res) => {
    const ok = await store.deleteEvent(req.params.id);
    if (!ok) {
      res.status(404).json({ error: 'Event hittades inte.' });
      return;
    }
    res.json({ deleted: true });
  }));

  // --- D-CONGRESS SESSIONS ---
  app.post('/api/sessions', route(async (req, res) => {
    if (!req.body?.title) {
      res.status(400).json({ error: 'Programtitel krävs.' });
      return;
    }
    const session = await store.upsertSession(req.body);
    res.status(201).json(session);
  }));

  app.put('/api/sessions/:id', route(async (req, res) => {
    const session = await store.upsertSession({ ...req.body, id: req.params.id });
    res.json(session);
  }));

  app.delete('/api/sessions/:id', route(async (req, res) => {
    const ok = await store.deleteSession(req.params.id);
    if (!ok) {
      res.status(404).json({ error: 'Session hittades inte.' });
      return;
    }
    res.json({ deleted: true });
  }));

  // --- JOBS ---
  app.post('/api/jobs', route(async (req, res) => {
    if (!req.body?.title || !req.body?.company) {
      res.status(400).json({ error: 'Jobbtitel och företag krävs.' });
      return;
    }
    const job = await store.upsertJob(req.body);
    res.status(201).json(job);
  }));

  app.post('/api/jobs/batch', route(async (req, res) => {
    const items = req.body?.items;
    if (!Array.isArray(items)) {
      res.status(400).json({ error: 'items-array krävs.' });
      return;
    }
    const result = await store.batchAddJobs(items);
    res.status(201).json(result);
  }));

  app.post('/api/jobs/validate', route(async (_req, res) => {
    const summary = await store.validateAndCloseInvalidJobs();
    res.json(summary);
  }));

  app.put('/api/jobs/:id', route(async (req, res) => {
    const job = await store.upsertJob({ ...req.body, id: req.params.id });
    res.json(job);
  }));

  app.delete('/api/jobs/:id', route(async (req, res) => {
    const ok = await store.deleteJob(req.params.id);
    if (!ok) {
      res.status(404).json({ error: 'Jobb hittades inte.' });
      return;
    }
    res.json({ deleted: true });
  }));

  // --- RECRUITMENT SITES ---
  app.post('/api/recruiters', route(async (req, res) => {
    if (!req.body?.name) {
      res.status(400).json({ error: 'Namn på rekryteringssida krävs.' });
      return;
    }
    const rec = await store.upsertRecruiter(req.body);
    res.status(201).json(rec);
  }));

  app.post('/api/recruiters/batch', route(async (req, res) => {
    const items = req.body?.items;
    if (!Array.isArray(items)) {
      res.status(400).json({ error: 'items-array krävs.' });
      return;
    }
    const result = await store.batchAddRecruiters(items);
    res.status(201).json(result);
  }));

  app.put('/api/recruiters/:id', route(async (req, res) => {
    const rec = await store.upsertRecruiter({ ...req.body, id: req.params.id });
    res.json(rec);
  }));

  app.delete('/api/recruiters/:id', route(async (req, res) => {
    const ok = await store.deleteRecruiter(req.params.id);
    if (!ok) {
      res.status(404).json({ error: 'Rekryteringssida hittades inte.' });
      return;
    }
    res.json({ deleted: true });
  }));

  // --- REGIONS ---
  app.put('/api/regions/:key', route(async (req, res) => {
    const updated = await store.updateRegion(req.params.key, req.body);
    if (!updated) {
      res.status(404).json({ error: 'Region hittades inte.' });
      return;
    }
    res.json(updated);
  }));

  // --- COMMUNITY ---
  app.post('/api/community/threads', route(async (req, res) => {
    if (!req.body?.title) {
      res.status(400).json({ error: 'Titel krävs.' });
      return;
    }
    const created = await store.addCommunityThread({ ...req.body, authorUid: res.locals.cmsIdentity.uid });
    res.status(201).json(created);
  }));

  app.post('/api/community/threads/:id/upvote', route(async (req, res) => {
    const updated = await store.upvoteCommunityThread(req.params.id);
    if (!updated) {
      res.status(404).json({ error: 'Tråd hittades inte.' });
      return;
    }
    res.json(updated);
  }));

  app.delete('/api/community/threads/:id', route(async (req, res) => {
    const ok = await store.deleteCommunityThread(req.params.id);
    if (!ok) {
      res.status(404).json({ error: 'Tråd hittades inte.' });
      return;
    }
    res.json({ deleted: true });
  }));

  app.post('/api/community/members', route(async (req, res) => {
    if (!req.body?.name || !req.body?.email) {
      res.status(400).json({ error: 'Namn och e-post krävs.' });
      return;
    }
    const created = await store.addCommunityMember(req.body);
    res.status(201).json(created);
  }));

  // --- GEMINI AI DISCOVERY & ENRICHMENT ---
  app.post('/api/ai/discover', route(async (req, res) => {
    try {
      const { target, query, category, count } = req.body as {
        target: 'merchants' | 'partners' | 'jobs' | 'recruiters';
        query: string;
        category?: string;
        count?: number;
      };

      if (!query || !query.trim()) {
        res.status(400).json({ error: 'Ange en sökfråga för att söka.' });
        return;
      }

      const snapshot = await store.getStore();
      if (target === 'partners') {
        const result = await discoverPartnersWithAI({
          query: query.trim(),
          category,
          count,
          existingNames: snapshot.partners.map((p) => p.name),
        });
        res.json(result);
        return;
      }

      if (target === 'jobs') {
        const result = await discoverJobsWithAI({
          query: query.trim(),
          category,
          count,
          existingTitles: snapshot.jobs.map((j) => `${j.title} @ ${j.company}`),
        });
        res.json(result);
        return;
      }

      if (target === 'recruiters') {
        const result = await discoverRecruitersWithAI({
          query: query.trim(),
          category,
          count,
          existingNames: snapshot.recruitmentSites.map((r) => r.name),
        });
        res.json(result);
        return;
      }

      const result = await discoverMerchantsWithAI({
        query: query.trim(),
        category,
        count,
        existingNames: snapshot.merchants.map((m) => m.name),
      });
      res.json(result);
    } catch (err) {
      const error = err as Error & { statusCode?: number; status?: number };
      const status = error.statusCode || error.status || 500;
      console.error('AI Discover Error:', error);
      res.status(status).json({
        error:
          status === 403 || status === 400
            ? `${error.message} Kontrollera serverns GEMINI_API_KEY.`
            : error.message || 'AI-sökningen misslyckades.',
      });
    }
  }));

  app.post('/api/ai/enrich', route(async (req, res) => {
    try {
      const { target, name, domain } = req.body as {
        target: 'merchant' | 'partner';
        name: string;
        domain?: string;
      };
      if (!name || !name.trim()) {
        res.status(400).json({ error: 'Ange företagsnamn att hämta data för.' });
        return;
      }
      const result = await enrichSingleEntityWithAI({
        target: target === 'partner' ? 'partner' : 'merchant',
        name: name.trim(),
        domain: domain?.trim(),
      });
      res.json(result);
    } catch (err) {
      const error = err as Error & { statusCode?: number; status?: number };
      const status = error.statusCode || error.status || 500;
      console.error('AI Enrich Error:', error);
      res.status(status).json({
        error: error.message || 'Kunde inte hämta företagsdata.',
      });
    }
  }));

  app.put('/api/benchmarks/orders/:id', route(async (req, res) => {
    const updated = await store.updateOrderBenchmark(req.params.id, req.body);
    if (!updated) {
      res.status(404).json({ error: 'Branschnyckeltal hittades inte.' });
      return;
    }
    res.json(updated);
  }));

  app.put('/api/benchmarks/shipping/:id', route(async (req, res) => {
    const updated = await store.updateShippingTier(req.params.id, req.body);
    if (!updated) {
      res.status(404).json({ error: 'Fraktnivå hittades inte.' });
      return;
    }
    res.json(updated);
  }));

  app.put('/api/benchmarks/delivery', route(async (req, res) => {
    const updated = await store.updateDeliveryStats(req.body);
    res.json(updated);
  }));

  // --- E-COMMERCE LAWS ---
  app.post('/api/laws', route(async (req, res) => {
    if (!req.body?.title) {
      res.status(400).json({ error: 'Lagtitel krävs.' });
      return;
    }
    const created = await store.upsertLaw(req.body);
    res.status(201).json(created);
  }));

  app.put('/api/laws/:id', route(async (req, res) => {
    const updated = await store.upsertLaw({ ...req.body, id: req.params.id });
    res.json(updated);
  }));

  app.delete('/api/laws/:id', route(async (req, res) => {
    const ok = await store.deleteLaw(req.params.id);
    if (!ok) {
      res.status(404).json({ error: 'Lagregel hittades inte.' });
      return;
    }
    res.json({ deleted: true });
  }));

  // --- AD BANNERS & HOLDERS ---
  app.post('/api/ads', route(async (req, res) => {
    if (!req.body?.headline) {
      res.status(400).json({ error: 'Rubrik krävs för annonsbanner.' });
      return;
    }
    const created = await store.upsertAdBanner(req.body);
    res.status(201).json(created);
  }));

  app.put('/api/ads/:id', route(async (req, res) => {
    const updated = await store.upsertAdBanner({ ...req.body, id: req.params.id });
    res.json(updated);
  }));

  app.delete('/api/ads/:id', route(async (req, res) => {
    const ok = await store.deleteAdBanner(req.params.id);
    if (!ok) {
      res.status(404).json({ error: 'Annonsbanner hittades inte.' });
      return;
    }
    res.json({ deleted: true });
  }));

  // --- CONTACT MESSAGES (hej@sverigesehandel.se) ---
  app.post('/api/contact', route(async (req, res) => {
    if (!req.body?.name || !req.body?.email || !req.body?.message) {
      res.status(400).json({ error: 'Namn, e-post och meddelande krävs.' });
      return;
    }
    const created = await store.addContactMessage({ ...req.body, authorUid: res.locals.cmsIdentity.uid });
    res.status(201).json(created);
  }));

  app.delete('/api/contact/:id', route(async (req, res) => {
    const ok = await store.deleteContactMessage(req.params.id);
    if (!ok) {
      res.status(404).json({ error: 'Meddelande hittades inte.' });
      return;
    }
    res.json({ deleted: true });
  }));

  app.use('/api', (_req, res) => { res.status(404).json({ error: 'API-routen finns inte.' }); });
  const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
    console.error('CMS API error:', error instanceof Error ? error.message : 'Unknown error');
    const status = error.status === 400 || error.status === 413 ? error.status : 503;
    res.status(status).json({ error: status === 503
      ? 'CMS-databasen kunde inte nås. Kontrollera Firebase-konfigurationen på servern.'
      : 'Ogiltig eller för stor begäran.' });
  };
  app.use(errorHandler);
  return app;
}
