import 'dotenv/config';
import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import {
  getStore,
  replaceStore,
  resetStore,
  upsertMerchant,
  batchAddMerchants,
  deleteMerchant,
  upsertPartner,
  batchAddPartners,
  deletePartner,
  upsertEvent,
  deleteEvent,
  upsertSession,
  deleteSession,
  upsertJob,
  batchAddJobs,
  validateAndCloseInvalidJobs,
  deleteJob,
  upsertRecruiter,
  batchAddRecruiters,
  deleteRecruiter,
  updateRegion,
  updateOrderBenchmark,
  updateShippingTier,
  updateDeliveryStats,
  upsertLaw,
  deleteLaw,
  addCommunityThread,
  upvoteCommunityThread,
  deleteCommunityThread,
  addCommunityMember,
  upsertAdBanner,
  deleteAdBanner,
  addContactMessage,
  deleteContactMessage,
} from './server/store.ts';
import {
  discoverJobsWithAI,
  discoverMerchantsWithAI,
  discoverPartnersWithAI,
  discoverRecruitersWithAI,
  enrichSingleEntityWithAI,
} from './server/geminiDiscovery.ts';

const PORT = 3000;

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '5mb' }));

  // --- CMS STORE & BACKUP ---
  app.get('/api/cms/store', (_req, res) => {
    res.json(getStore());
  });

  app.post('/api/cms/import', (req, res) => {
    try {
      const payload = req.body;
      if (!payload || !Array.isArray(payload.merchants) || !Array.isArray(payload.partners)) {
        res.status(400).json({ error: 'Ogiltigt CMS-format. merchants och partners krävs.' });
        return;
      }
      const saved = replaceStore(payload);
      res.json(saved);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.post('/api/cms/reset', (_req, res) => {
    res.json(resetStore());
  });

  // --- MERCHANTS (E-HANDLARE) ---
  app.get('/api/merchants', (_req, res) => {
    res.json(getStore().merchants);
  });

  app.post('/api/merchants', (req, res) => {
    if (!req.body?.name) {
      res.status(400).json({ error: 'Butiksnamn krävs.' });
      return;
    }
    const result = upsertMerchant(req.body);
    res.status(result.created ? 201 : 200).json(result);
  });

  app.post('/api/merchants/batch', (req, res) => {
    const items = req.body?.items;
    if (!Array.isArray(items)) {
      res.status(400).json({ error: 'items-array krävs.' });
      return;
    }
    const result = batchAddMerchants(items);
    res.status(201).json(result);
  });

  app.put('/api/merchants/:id', (req, res) => {
    if (!req.body?.name) {
      res.status(400).json({ error: 'Butiksnamn krävs.' });
      return;
    }
    const result = upsertMerchant({ ...req.body, id: req.params.id });
    res.json(result);
  });

  app.delete('/api/merchants/:id', (req, res) => {
    const ok = deleteMerchant(req.params.id);
    if (!ok) {
      res.status(404).json({ error: 'E-handlare hittades inte.' });
      return;
    }
    res.json({ deleted: true });
  });

  // --- TECH PARTNERS ---
  app.get('/api/partners', (_req, res) => {
    res.json(getStore().partners);
  });

  app.post('/api/partners', (req, res) => {
    if (!req.body?.name) {
      res.status(400).json({ error: 'Partnernamn krävs.' });
      return;
    }
    const result = upsertPartner(req.body);
    res.status(result.created ? 201 : 200).json(result);
  });

  app.post('/api/partners/batch', (req, res) => {
    const items = req.body?.items;
    if (!Array.isArray(items)) {
      res.status(400).json({ error: 'items-array krävs.' });
      return;
    }
    const result = batchAddPartners(items);
    res.status(201).json(result);
  });

  app.put('/api/partners/:id', (req, res) => {
    if (!req.body?.name) {
      res.status(400).json({ error: 'Partnernamn krävs.' });
      return;
    }
    const result = upsertPartner({ ...req.body, id: req.params.id });
    res.json(result);
  });

  app.delete('/api/partners/:id', (req, res) => {
    const ok = deletePartner(req.params.id);
    if (!ok) {
      res.status(404).json({ error: 'Partner hittades inte.' });
      return;
    }
    res.json({ deleted: true });
  });

  // --- EVENTS & MÄSSOR ---
  app.post('/api/events', (req, res) => {
    if (!req.body?.name) {
      res.status(400).json({ error: 'Eventnamn krävs.' });
      return;
    }
    const created = upsertEvent(req.body);
    res.status(201).json(created);
  });

  app.put('/api/events/:id', (req, res) => {
    const updated = upsertEvent({ ...req.body, id: req.params.id });
    res.json(updated);
  });

  app.delete('/api/events/:id', (req, res) => {
    const ok = deleteEvent(req.params.id);
    if (!ok) {
      res.status(404).json({ error: 'Event hittades inte.' });
      return;
    }
    res.json({ deleted: true });
  });

  // --- D-CONGRESS SESSIONS ---
  app.post('/api/sessions', (req, res) => {
    if (!req.body?.title) {
      res.status(400).json({ error: 'Programtitel krävs.' });
      return;
    }
    const session = upsertSession(req.body);
    res.status(201).json(session);
  });

  app.put('/api/sessions/:id', (req, res) => {
    const session = upsertSession({ ...req.body, id: req.params.id });
    res.json(session);
  });

  app.delete('/api/sessions/:id', (req, res) => {
    const ok = deleteSession(req.params.id);
    if (!ok) {
      res.status(404).json({ error: 'Session hittades inte.' });
      return;
    }
    res.json({ deleted: true });
  });

  // --- JOBS ---
  app.post('/api/jobs', (req, res) => {
    if (!req.body?.title || !req.body?.company) {
      res.status(400).json({ error: 'Jobbtitel och företag krävs.' });
      return;
    }
    const job = upsertJob(req.body);
    res.status(201).json(job);
  });

  app.post('/api/jobs/batch', (req, res) => {
    const items = req.body?.items;
    if (!Array.isArray(items)) {
      res.status(400).json({ error: 'items-array krävs.' });
      return;
    }
    const result = batchAddJobs(items);
    res.status(201).json(result);
  });

  app.post('/api/jobs/validate', (_req, res) => {
    const summary = validateAndCloseInvalidJobs();
    res.json(summary);
  });

  app.put('/api/jobs/:id', (req, res) => {
    const job = upsertJob({ ...req.body, id: req.params.id });
    res.json(job);
  });

  app.delete('/api/jobs/:id', (req, res) => {
    const ok = deleteJob(req.params.id);
    if (!ok) {
      res.status(404).json({ error: 'Jobb hittades inte.' });
      return;
    }
    res.json({ deleted: true });
  });

  // --- RECRUITMENT SITES ---
  app.post('/api/recruiters', (req, res) => {
    if (!req.body?.name) {
      res.status(400).json({ error: 'Namn på rekryteringssida krävs.' });
      return;
    }
    const rec = upsertRecruiter(req.body);
    res.status(201).json(rec);
  });

  app.post('/api/recruiters/batch', (req, res) => {
    const items = req.body?.items;
    if (!Array.isArray(items)) {
      res.status(400).json({ error: 'items-array krävs.' });
      return;
    }
    const result = batchAddRecruiters(items);
    res.status(201).json(result);
  });

  app.put('/api/recruiters/:id', (req, res) => {
    const rec = upsertRecruiter({ ...req.body, id: req.params.id });
    res.json(rec);
  });

  app.delete('/api/recruiters/:id', (req, res) => {
    const ok = deleteRecruiter(req.params.id);
    if (!ok) {
      res.status(404).json({ error: 'Rekryteringssida hittades inte.' });
      return;
    }
    res.json({ deleted: true });
  });

  // --- REGIONS ---
  app.put('/api/regions/:key', (req, res) => {
    const updated = updateRegion(req.params.key, req.body);
    if (!updated) {
      res.status(404).json({ error: 'Region hittades inte.' });
      return;
    }
    res.json(updated);
  });

  // --- COMMUNITY ---
  app.post('/api/community/threads', (req, res) => {
    if (!req.body?.title) {
      res.status(400).json({ error: 'Titel krävs.' });
      return;
    }
    const created = addCommunityThread(req.body);
    res.status(201).json(created);
  });

  app.post('/api/community/threads/:id/upvote', (req, res) => {
    const updated = upvoteCommunityThread(req.params.id);
    if (!updated) {
      res.status(404).json({ error: 'Tråd hittades inte.' });
      return;
    }
    res.json(updated);
  });

  app.delete('/api/community/threads/:id', (req, res) => {
    const ok = deleteCommunityThread(req.params.id);
    if (!ok) {
      res.status(404).json({ error: 'Tråd hittades inte.' });
      return;
    }
    res.json({ deleted: true });
  });

  app.post('/api/community/members', (req, res) => {
    if (!req.body?.name || !req.body?.email) {
      res.status(400).json({ error: 'Namn och e-post krävs.' });
      return;
    }
    const created = addCommunityMember(req.body);
    res.status(201).json(created);
  });

  // --- GEMINI AI DISCOVERY & ENRICHMENT ---
  app.post('/api/ai/discover', async (req, res) => {
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

      const store = getStore();
      if (target === 'partners') {
        const result = await discoverPartnersWithAI({
          query: query.trim(),
          category,
          count,
          existingNames: store.partners.map((p) => p.name),
        });
        res.json(result);
        return;
      }

      if (target === 'jobs') {
        const result = await discoverJobsWithAI({
          query: query.trim(),
          category,
          count,
          existingTitles: store.jobs.map((j) => `${j.title} @ ${j.company}`),
        });
        res.json(result);
        return;
      }

      if (target === 'recruiters') {
        const result = await discoverRecruitersWithAI({
          query: query.trim(),
          category,
          count,
          existingNames: store.recruitmentSites.map((r) => r.name),
        });
        res.json(result);
        return;
      }

      const result = await discoverMerchantsWithAI({
        query: query.trim(),
        category,
        count,
        existingNames: store.merchants.map((m) => m.name),
      });
      res.json(result);
    } catch (err) {
      const error = err as Error & { statusCode?: number; status?: number };
      const status = error.statusCode || error.status || 500;
      console.error('AI Discover Error:', error);
      res.status(status).json({
        error:
          status === 403 || status === 400
            ? `${error.message} Kontrollera GEMINI_API_KEY i Settings > Secrets.`
            : error.message || 'AI-sökningen misslyckades.',
      });
    }
  });

  app.post('/api/ai/enrich', async (req, res) => {
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
  });

  app.put('/api/benchmarks/orders/:id', (req, res) => {
    const updated = updateOrderBenchmark(req.params.id, req.body);
    if (!updated) {
      res.status(404).json({ error: 'Branschnyckeltal hittades inte.' });
      return;
    }
    res.json(updated);
  });

  app.put('/api/benchmarks/shipping/:id', (req, res) => {
    const updated = updateShippingTier(req.params.id, req.body);
    if (!updated) {
      res.status(404).json({ error: 'Fraktnivå hittades inte.' });
      return;
    }
    res.json(updated);
  });

  app.put('/api/benchmarks/delivery', (req, res) => {
    const updated = updateDeliveryStats(req.body);
    res.json(updated);
  });

  // --- E-COMMERCE LAWS ---
  app.post('/api/laws', (req, res) => {
    if (!req.body?.title) {
      res.status(400).json({ error: 'Lagtitel krävs.' });
      return;
    }
    const created = upsertLaw(req.body);
    res.status(201).json(created);
  });

  app.put('/api/laws/:id', (req, res) => {
    const updated = upsertLaw({ ...req.body, id: req.params.id });
    res.json(updated);
  });

  app.delete('/api/laws/:id', (req, res) => {
    const ok = deleteLaw(req.params.id);
    if (!ok) {
      res.status(404).json({ error: 'Lagregel hittades inte.' });
      return;
    }
    res.json({ deleted: true });
  });

  // --- AD BANNERS & HOLDERS ---
  app.post('/api/ads', (req, res) => {
    if (!req.body?.headline) {
      res.status(400).json({ error: 'Rubrik krävs för annonsbanner.' });
      return;
    }
    const created = upsertAdBanner(req.body);
    res.status(201).json(created);
  });

  app.put('/api/ads/:id', (req, res) => {
    const updated = upsertAdBanner({ ...req.body, id: req.params.id });
    res.json(updated);
  });

  app.delete('/api/ads/:id', (req, res) => {
    const ok = deleteAdBanner(req.params.id);
    if (!ok) {
      res.status(404).json({ error: 'Annonsbanner hittades inte.' });
      return;
    }
    res.json({ deleted: true });
  });

  // --- CONTACT MESSAGES (hej@sverigesehandel.se) ---
  app.post('/api/contact', (req, res) => {
    if (!req.body?.name || !req.body?.email || !req.body?.message) {
      res.status(400).json({ error: 'Namn, e-post och meddelande krävs.' });
      return;
    }
    const created = addContactMessage(req.body);
    res.status(201).json(created);
  });

  app.delete('/api/contact/:id', (req, res) => {
    const ok = deleteContactMessage(req.params.id);
    if (!ok) {
      res.status(404).json({ error: 'Meddelande hittades inte.' });
      return;
    }
    res.json({ deleted: true });
  });

  // --- VITE / STATIC SERVING ---
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Sveriges E-handel CMS kör på http://0.0.0.0:${PORT}`);
  });
}

startServer();
