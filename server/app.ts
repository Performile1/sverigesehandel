import { firebaseFeatureStatus, prepareImage, uploadCmsImage, reportDays, getCmsAnalytics } from './firebaseFeatures.ts';
import express, { type RequestHandler, type ErrorRequestHandler } from 'express';
import type { CmsDataStore } from './firestoreStore.ts';
import { publicStore } from './publicStore.ts';
import type { CmsIdentity } from './authPolicy.ts';
import { upgradeSnapshot, validateSnapshot } from './snapshot.ts';
import { hasExplicitAdminCredentials } from './firebaseAdmin.ts';
import {
  discoverJobsWithAI,
  discoverMerchantsWithAI,
  discoverPartnersWithAI,
  discoverRecruitersWithAI,
  enrichSingleEntityWithAI,
  fetchEcommerceNewsWithAI,
} from './geminiDiscovery.ts';


const route = (handler: RequestHandler): RequestHandler => (req, res, next) => {
  Promise.resolve(handler(req, res, next)).catch(next);
};

// These member actions require verified login; all editorial writes and AI calls require admin.
const isMemberCommentRoute = (path: string) => /^\/api\/community\/threads\/[^/]+\/comments$/.test(path);
const isMemberMessageReadRoute = (path: string) => /^\/api\/community\/messages\/[^/]+\/read$/.test(path);

const isMemberSubmission = (method: string, path: string) => (
  (method === 'POST' && (
    ['/api/contact', '/api/community/threads', '/api/community/members', '/api/community/messages'].includes(path) ||
    /^\/api\/community\/threads\/[^/]+\/upvote$/.test(path) ||
    isMemberCommentRoute(path)
  )) ||
  (method === 'GET' && ['/api/community/directory', '/api/community/messages'].includes(path)) ||
  (method === 'PUT' && isMemberMessageReadRoute(path))
);

export function createCmsApp(store: CmsDataStore, verifyToken: (token: string) => Promise<CmsIdentity>, features = {
  status: firebaseFeatureStatus, upload: uploadCmsImage, report: getCmsAnalytics,
}) {
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
      ['/api/cms/store', '/api/merchants', '/api/partners', '/api/news'].includes(path);
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
      res.status(identity ? 403 : 401).json({ error: 'Logga in med ett verifierat Google-konto för att använda denna medlemsfunktion.' });
      return;
    }
    if (!publicRead && !isMemberSubmission(req.method, path) && !admin) {
      res.status(authorization ? 403 : 401).json({ error: 'CMS-administratör krävs. Öppna CMS och logga in.' });
      return;
    }
    next();
  }));
  app.use(express.json({ limit: '800kb' }));

  // Auth middleware above protects all feature endpoints, including disabled status.
  app.get('/api/firebase-features', (_req, res) => { res.json(features.status()); });
  app.get('/api/analytics/report', route(async (req, res) => {
    if (!features.status().reportsEnabled) { res.json({ enabled: false }); return; }
    let days: number;
    try { days = reportDays(req.query.days); }
    catch { res.status(400).json({ error: 'Välj 7, 30 eller 90 dagar.' }); return; }
    try { res.json({ enabled: true, report: await features.report(days) }); }
    catch { res.status(503).json({ error: 'Rapporten kunde inte hämtas. Kontrollera GA4-egendom, API och läsbehörighet på servern.' }); }
  }));
  app.post('/api/media/image', route(async (req, res) => {
    if (!features.status().mediaEnabled) { res.status(409).json({ error: 'Firebase-bildlagring är avstängd i denna miljö.' }); return; }
    const { targetType, targetId, data, alt } = req.body || {};
    if (!['partner', 'ad'].includes(targetType) || typeof targetId !== 'string') {
      res.status(400).json({ error: 'Välj partner eller annons.' }); return;
    }
    const snapshot = await store.getStore();
    if (!(targetType === 'partner' ? snapshot.partners : snapshot.adBanners).some((item) => item.id === targetId)) {
      res.status(404).json({ error: 'Partnern eller annonsen finns inte längre.' }); return;
    }
    let prepared;
    try { prepared = await prepareImage(data, alt); }
    catch { res.status(400).json({ error: 'Välj en PNG/JPEG/WebP-stillbild, högst 350 kB, 6000 × 6000 och 16 megapixel, samt alt-text (1–200 tecken).' }); return; }
    try {
      const image = await features.upload(prepared);
      if (!await store.assignCmsImage(targetType, targetId, image)) {
        res.status(409).json({ error: 'Bilden laddades upp men posten försvann. Filen behöver granskas vid lagringsstädning.' }); return;
      }
      res.json({ image });
    } catch {
      // No provider response, access URL or credential is logged or reflected.
      res.status(503).json({ error: 'Bilden kunde inte kopplas säkert. Ladda om och kontrollera posten före nytt försök; en uppladdad fil kan finnas kvar. Kontrollera Storage-konfiguration och IAM.' });
    }
  }));
  app.delete('/api/media/image', route(async (req, res) => {
    const { targetType, targetId } = req.body || {};
    if (!['partner', 'ad'].includes(targetType) || typeof targetId !== 'string') {
      res.status(400).json({ error: 'Välj partner eller annons.' }); return;
    }
    if (!await store.assignCmsImage(targetType, targetId, null)) {
      res.status(404).json({ error: 'Posten hittades inte.' }); return;
    }
    // Detach only: a file can be referenced by a backup or another item.
    res.json({ detached: true });
  }));

  app.use('/api', (req, res, next) => {
    const path = req.originalUrl.split('?')[0].replace(/\/$/, '');
    if (req.method !== 'POST' || !isMemberSubmission(req.method, path)) { next(); return; }
    const fields: Record<string, [number, number]> = path === '/api/contact'
      ? { name: [1, 100], email: [3, 160], topic: [1, 140], message: [2, 2000] }
      : path === '/api/community/members'
      ? { name: [1, 80], email: [3, 160], role: [1, 80], city: [1, 60] }
      : path === '/api/community/threads'
      ? { channel: [2, 40], author: [1, 80], title: [3, 220] }
      : isMemberCommentRoute(path)
      ? { author: [1, 80], body: [2, 800] }
      : path === '/api/community/messages'
      ? { recipientMemberId: [2, 80], subject: [1, 140], body: [2, 1200] }
      : {};
    const optionalStringLimits: Record<string, number> = path === '/api/contact'
      ? {
          company: 120,
          adSlot: 100,
          phone: 60,
          formId: 80,
          submissionType: 40,
          targetEntityType: 30,
          targetEntityId: 80,
          targetEntityName: 120,
          preferredRouting: 30,
          needSummary: 240,
          monthlyVolume: 120,
          currentPlatform: 160,
          timeline: 120,
        }
      : path === '/api/community/members'
      ? {
          memberType: 60,
          company: 120,
          website: 180,
          linkedinUrl: 200,
          annualOrders: 80,
          platform: 80,
          serviceFocus: 120,
          motivation: 800,
        }
      : path === '/api/community/threads'
      ? { body: 1500 }
      : path === '/api/community/messages'
      ? { senderName: 80 }
      : { company: 120, adSlot: 100 };

    const invalidCustomAnswers =
      path === '/api/contact' &&
      req.body?.customAnswers !== undefined &&
      (typeof req.body.customAnswers !== 'object' ||
        req.body.customAnswers === null ||
        Array.isArray(req.body.customAnswers) ||
        Object.keys(req.body.customAnswers).length > 20 ||
        Object.entries(req.body.customAnswers).some(
          ([k, v]) => typeof k !== 'string' || k.length > 80 || typeof v !== 'string' || v.length > 500
        ));

    const invalidInterests =
      path === '/api/community/members' &&
      req.body?.interests !== undefined &&
      (!Array.isArray(req.body.interests) ||
        req.body.interests.length > 10 ||
        req.body.interests.some((item: unknown) => typeof item !== 'string' || item.length > 60));

    if (
      Object.entries(fields).some(([key, [min, max]]) => typeof req.body?.[key] !== 'string' ||
        req.body[key].trim().length < min || req.body[key].length > max) ||
      Object.entries(optionalStringLimits).some(([key, max]) => req.body?.[key] !== undefined &&
        (typeof req.body[key] !== 'string' || req.body[key].length > max)) ||
      invalidCustomAnswers ||
      invalidInterests
    ) {
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

  app.get('/api/cms/status', (_req, res) => {
    const explicitCreds = hasExplicitAdminCredentials();
    const firestoreEnabled = explicitCreds || process.env.USE_FIRESTORE_ADMIN === 'true';
    res.json({
      persistence: firestoreEnabled ? 'firestore' : 'local',
      hasExplicitAdminCredentials: explicitCreds,
      hasGeminiKey: Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY'),
    });
  });

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

  // --- E-COMMERCE NEWS ---
  app.get('/api/news', route(async (_req, res) => {
    res.json(publicStore(await store.getStore(), res.locals.cmsAdmin === true).news);
  }));

  app.post('/api/news', route(async (req, res) => {
    if (!req.body?.title) {
      res.status(400).json({ error: 'Nyhetsrubrik krävs.' });
      return;
    }
    const result = await store.upsertNews(req.body);
    res.status(result.created ? 201 : 200).json(result);
  }));

  app.post('/api/news/batch', route(async (req, res) => {
    const items = req.body?.items;
    if (!Array.isArray(items)) {
      res.status(400).json({ error: 'items-array krävs.' });
      return;
    }
    const result = await store.batchAddNews(items);
    res.status(201).json(result);
  }));

  app.put('/api/news/:id', route(async (req, res) => {
    if (!req.body?.title) {
      res.status(400).json({ error: 'Nyhetsrubrik krävs.' });
      return;
    }
    const result = await store.upsertNews({ ...req.body, id: req.params.id });
    res.json(result);
  }));

  app.delete('/api/news/:id', route(async (req, res) => {
    const ok = await store.deleteNews(req.params.id);
    if (!ok) {
      res.status(404).json({ error: 'Nyhet hittades inte.' });
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

  app.put('/api/map-points/:id', route(async (req, res) => {
    res.json(await store.upsertMapPoint({ ...req.body, id: req.params.id }));
  }));
  app.delete('/api/map-points/:id', route(async (req, res) => {
    if (!await store.deleteMapPoint(req.params.id)) { res.status(404).json({ error: 'Kartpunkten hittades inte.' }); return; }
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
    const created = await store.addCommunityThread({
      ...req.body,
      authorUid: res.locals.cmsIdentity?.uid,
      authorEmail: res.locals.cmsIdentity?.email,
    });
    res.status(201).json(created);
  }));

  app.post('/api/community/threads/:id/comments', route(async (req, res) => {
    const updated = await store.addCommunityComment(req.params.id, {
      author: req.body.author,
      body: req.body.body,
      authorUid: res.locals.cmsIdentity?.uid,
      authorEmail: res.locals.cmsIdentity?.email,
    });
    if (!updated) {
      res.status(404).json({ error: 'Tråd hittades inte.' });
      return;
    }
    res.status(201).json(updated);
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

  app.get('/api/community/directory', route(async (_req, res) => {
    const identity = res.locals.cmsIdentity as CmsIdentity;
    const members = await store.getMemberDirectory(identity.uid, identity.email);
    res.json({ members });
  }));

  app.get('/api/community/messages', route(async (_req, res) => {
    const identity = res.locals.cmsIdentity as CmsIdentity;
    const result = await store.getDirectMessagesForUser(identity.uid, identity.email);
    res.json(result);
  }));

  app.post('/api/community/messages', route(async (req, res) => {
    const identity = res.locals.cmsIdentity as CmsIdentity;
    const dm = await store.sendDirectMessage({
      senderUid: identity.uid,
      senderName: req.body.senderName || identity.email || 'Verifierad medlem',
      senderEmail: identity.email,
      recipientMemberId: req.body.recipientMemberId,
      subject: req.body.subject,
      body: req.body.body,
    });
    if (!dm) {
      res.status(404).json({ error: 'Mottagaren hittades inte i medlemskatalogen.' });
      return;
    }
    res.status(201).json(dm);
  }));

  app.put('/api/community/messages/:id/read', route(async (req, res) => {
    const identity = res.locals.cmsIdentity as CmsIdentity;
    const result = await store.markDirectMessageRead(req.params.id, identity.uid, identity.email);
    if (result.status === 'not_found') {
      res.status(404).json({ error: 'Meddelandet hittades inte.' });
      return;
    }
    if (result.status === 'forbidden') {
      res.status(403).json({ error: 'Du kan endast klarmarkera dina egna mottagna meddelanden.' });
      return;
    }
    res.json(result.message);
  }));

  app.post('/api/community/members', route(async (req, res) => {
    if (!req.body?.name || !req.body?.email) {
      res.status(400).json({ error: 'Namn och e-post krävs.' });
      return;
    }
    const created = await store.addCommunityMember({
      ...req.body,
      authorUid: res.locals.cmsIdentity?.uid,
    });
    res.status(201).json(created);
  }));

  app.put('/api/community/members/:id/status', route(async (req, res) => {
    const status = req.body?.verificationStatus;
    if (status !== 'pending' && status !== 'verified' && status !== 'rejected') {
      res.status(400).json({ error: 'Ogiltig verifieringsstatus.' });
      return;
    }
    const updated = await store.updateCommunityMemberStatus(req.params.id, status);
    if (!updated) {
      res.status(404).json({ error: 'Medlemsansökan hittades inte.' });
      return;
    }
    res.json(updated);
  }));

  app.delete('/api/community/members/:id', route(async (req, res) => {
    const ok = await store.deleteCommunityMember(req.params.id);
    if (!ok) {
      res.status(404).json({ error: 'Medlemsansökan hittades inte.' });
      return;
    }
    res.json({ deleted: true });
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

  app.post('/api/ai/news', route(async (req, res) => {
    try {
      const { topic, count, autoSave } = req.body as {
        topic?: string;
        count?: number;
        autoSave?: boolean;
      };
      const snapshot = await store.getStore();
      const result = await fetchEcommerceNewsWithAI({
        topic,
        count,
        existingTitles: (snapshot.news || []).map((n) => n.title),
      });
      if (autoSave) {
        const toAdd = result.candidates
          .filter((c) => !c.alreadyExists)
          .map((c) => ({ ...c, status: 'draft' as const }));
        const saved = await store.batchAddNews(toAdd);
        res.json({ ...result, saved });
        return;
      }
      res.json(result);
    } catch (err) {
      const error = err as Error & { statusCode?: number; status?: number };
      const status = error.statusCode || error.status || 500;
      console.error('AI News Fetch Error:', error);
      res.status(status).json({
        error:
          status === 403 || status === 400
            ? `${error.message} Kontrollera serverns GEMINI_API_KEY.`
            : error.message || 'Kunde inte hämta senaste nyheterna.',
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

  // Only controlled archive validation messages are exposed, not storage errors.
  const archiveRoute = (handler: RequestHandler) => route(async (req, res, next) => {
    try { await handler(req, res, next); }
    catch (error) {
      const failure = error as Error & { status?: number };
      if (failure.status === 400 || failure.status === 413) { res.status(failure.status).json({ error: failure.message }); return; }
      throw error;
    }
  });
  app.post('/api/paketindex/archive', archiveRoute(async (req, res) => {
    res.json(await store.upsertPaketindexObservation(req.body));
  }));
  app.post('/api/paketindex/archive/import', archiveRoute(async (req, res) => {
    res.json(await store.importPaketindexCsv(req.body?.csv, req.body?.policy, req.body?.commit));
  }));
  app.delete('/api/paketindex/archive', archiveRoute(async (req, res) => {
    if (typeof req.body?.key !== 'string') { res.status(400).json({ error: 'Nyckel krävs.' }); return; }
    if (!await store.deletePaketindexObservation(req.body.key)) { res.status(404).json({ error: 'Posten hittades inte.' }); return; }
    res.json({ deleted: true });
  }));

  app.put('/api/paketindex', route(async (req, res) => {
    const updated = await store.updatePaketindex(req.body);
    res.json(updated);
  }));

  app.put('/api/intelligence/:id', route(async (req, res) => {
    const updated = await store.updateIntelligenceSource(req.params.id, req.body);
    if (!updated) {
      res.status(404).json({ error: 'Marknadskälla hittades inte.' });
      return;
    }
    res.json(updated);
  }));

  app.put('/api/techstack/:id', route(async (req, res) => {
    const updated = await store.updateTechStackShare(req.params.id, req.body);
    if (!updated) {
      res.status(404).json({ error: 'Tech-stackrad hittades inte.' });
      return;
    }
    res.json(updated);
  }));

  app.post('/api/timeline', route(async (req, res) => {
    if (!req.body?.title) {
      res.status(400).json({ error: 'Titel krävs för tidslinje-händelse.' });
      return;
    }
    const created = await store.upsertTimelineMilestone(req.body);
    res.status(201).json(created);
  }));

  app.put('/api/timeline/:id', route(async (req, res) => {
    const updated = await store.upsertTimelineMilestone({ ...req.body, id: req.params.id });
    res.json(updated);
  }));

  app.delete('/api/timeline/:id', route(async (req, res) => {
    const ok = await store.deleteTimelineMilestone(req.params.id);
    if (!ok) {
      res.status(404).json({ error: 'Tidslinje-händelse hittades inte.' });
      return;
    }
    res.json({ deleted: true });
  }));

  app.put('/api/pages', route(async (req, res) => {
    const updated = await store.updatePageContent(req.body);
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

  // --- CONTACT FORMS (CMS CONFIGURABLE FORMS & INTRO ROUTING) ---
  app.post('/api/forms', route(async (req, res) => {
    if (!req.body?.name || typeof req.body.name !== 'string') {
      res.status(400).json({ error: 'Formulärnamn krävs.' });
      return;
    }
    const created = await store.upsertContactForm(req.body);
    res.status(201).json(created);
  }));

  app.put('/api/forms/:id', route(async (req, res) => {
    if (!req.body?.name || typeof req.body.name !== 'string') {
      res.status(400).json({ error: 'Formulärnamn krävs.' });
      return;
    }
    const updated = await store.upsertContactForm({ ...req.body, id: req.params.id });
    res.json(updated);
  }));

  app.delete('/api/forms/:id', route(async (req, res) => {
    const ok = await store.deleteContactForm(req.params.id);
    if (!ok) {
      res.status(404).json({ error: 'Formulär hittades inte.' });
      return;
    }
    res.json({ deleted: true });
  }));

  // --- CONTACT MESSAGES (hej@sverigesehandel.se & INTRO ROUTING) ---
  app.post('/api/contact', route(async (req, res) => {
    if (!req.body?.name || !req.body?.email || !req.body?.message) {
      res.status(400).json({ error: 'Namn, e-post och meddelande krävs.' });
      return;
    }
    let created = await store.addContactMessage({ ...req.body, authorUid: res.locals.cmsIdentity.uid });

    const resendKey = process.env.RESEND_API_KEY?.trim();
    if (resendKey && created.routedToEmail && created.routedToEmail.includes('@')) {
      try {
        const fromAddress = process.env.RESEND_FROM_EMAIL?.trim() || 'sverigesehandel.se <onboarding@resend.dev>';
        const subjectParts = [
          created.submissionType === 'intro' ? 'Intro-förfrågan' : 'Kontakt',
          created.targetEntityName || created.topic,
          created.company || created.name,
        ].filter(Boolean);
        const lines = [
          `Ämne: ${created.topic}`,
          created.targetEntityName ? `Målaktör: ${created.targetEntityName}` : null,
          `Avsändare: ${created.name} (${created.email})`,
          created.company ? `Företag: ${created.company}` : null,
          created.phone ? `Telefon: ${created.phone}` : null,
          created.needSummary ? `Behov: ${created.needSummary}` : null,
          created.monthlyVolume ? `Volym: ${created.monthlyVolume}` : null,
          created.currentPlatform ? `Plattform: ${created.currentPlatform}` : null,
          created.timeline ? `Tidsplan: ${created.timeline}` : null,
          created.adSlot ? `Annonsplats: ${created.adSlot}` : null,
          '',
          created.message,
        ].filter((line) => line !== null);

        const mailResp = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${resendKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: fromAddress,
            to: [created.routedToEmail],
            reply_to: created.email,
            subject: subjectParts.join(' · '),
            text: lines.join('\n'),
          }),
        });
        if (mailResp.ok) {
          const updated = await store.updateContactMessageStatus(
            created.id,
            created.routingMode === 'direct-partner' ? 'forwarded' : (created.status || 'handled-self'),
            true
          );
          if (updated) created = updated;
        }
      } catch (err) {
        console.error('Resend dispatch skipped:', err instanceof Error ? err.message : err);
      }
    }

    res.status(201).json(created);
  }));

  app.put('/api/contact/:id/status', route(async (req, res) => {
    const status = req.body?.status;
    if (!['new', 'handled-self', 'forwarded', 'resolved'].includes(status)) {
      res.status(400).json({ error: 'Ogiltig status.' });
      return;
    }
    const updated = await store.updateContactMessageStatus(
      req.params.id,
      status,
      typeof req.body?.emailDispatched === 'boolean' ? req.body.emailDispatched : undefined
    );
    if (!updated) {
      res.status(404).json({ error: 'Meddelande hittades inte.' });
      return;
    }
    res.json(updated);
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
