import { completeTotpChallenge } from '../shared/totpChallenge.ts';
import { requireTotp } from '../server/mfaPolicy.ts';
import { normalizedCompanyDomain, emailMatchesCompanyDomain, validCompanyVerification } from '../shared/companyVerification.ts';
import { CompanyVerificationPanel } from '../src/components/CompanyVerificationPanel.tsx';
import { createAndVerifyCompanyPages } from '../src/components/companyPageCreation.ts';
import { CompanyPagesPanel, companyPagePreview } from '../src/components/CompanyPagesPanel.tsx';
import { CompanyPagesContext, CompanyPageLink } from '../src/components/CompanyDirectoryLinks.tsx';
import { emptyCollaboration, validCollaboration, validCompanyContent, validSlug, companySlugFromHash } from '../shared/collaboration.ts';
import { CompanyPageView } from '../src/components/CompanyPageView.tsx';
import { toggleSavedSessionInFirestore } from '../src/firebaseSync.ts';
import { PAGE_WIDGETS, defaultPageLayout, validPageLayout, validPageLayouts } from '../shared/pageLayouts.ts';
import { setLayoutPreviewReadOnly, api as layoutPreviewApi } from '../src/api.ts';
import { ContentText } from '../src/components/ContentText.tsx';
import { ContentEditor } from '../src/components/ContentEditor.tsx';
import { contentUrl, inlineParts, validContentMetadata, cleanContentMetadata } from '../shared/contentFormat.ts';
import { DEFAULT_HOME_WIDGETS, validHomeWidgets, homeWidgetLayout, widgetsInZone } from '../shared/homeWidgets.ts';
import { HomeWidgetZone } from '../src/components/HomeWidgetZone.tsx';
import { BlogView } from '../src/components/BlogView.tsx';
import { CmsNavigation, CMS_GROUPS } from '../src/components/CmsNavigation.tsx';
import { publiclyVisible, validLifecycle } from '../shared/editorialLifecycle.ts';
import { CreateCmsSaleForm } from '../src/components/CommerceEditor.tsx';
import { INITIAL_START_GUIDE } from '../shared/startGuide.ts';
import { validGuide, validChapter, validSaleListings, publicSaleListing } from '../shared/commerce.ts';
import { StartGuideView } from '../src/components/StartGuideView.tsx';
import { MarketplaceView } from '../src/components/MarketplaceView.tsx';
import { latestQuarter, latestPaketindex, REVIEWED_PAKETINDEX } from '../shared/latestPaketindex.ts';
import { GroupedNavigation, NAV_GROUPS } from '../src/components/Navbar.tsx';
import { AboutView } from '../src/components/AboutView.tsx';
import { LatestPaketindex } from '../src/components/LatestPaketindex.tsx';
import { authProviderOptions, normalizeLoginEmail, emailLinkReturnUrl, loginErrorMessage } from '../shared/authOptions.ts';
import { requestEmailLogin, completeEmailLogin, emailCallbackLocation } from '../shared/emailAuthFlow.ts';
import { SignInDialog } from '../src/components/SignInDialog.tsx';
import { invitationPayload } from '../server/userInvitation.ts';
import { parseCmsUserInput, resolveCmsUser } from '../server/cmsUsers.ts';
import { CreateCmsUser } from '../src/components/CreateCmsUser.tsx';
import type { cmsFirebaseAuth } from '../server/firebaseAdmin.ts';
import { FirebaseProvider } from '../src/contexts/FirebaseContext.tsx';
import { validStaffProfiles, validEmploymentDate, employmentDuration, validProfilePhoto } from '../shared/staffProfiles.ts';
import { MemberGovernancePanel } from '../src/components/MemberGovernancePanel.tsx';
import { CommunityReportButton } from '../src/components/CommunityReportButton.tsx';
import { emptyGovernance, DEFAULT_COMMUNITY_SETTINGS, validGovernance, visibleCommunityThreads } from '../shared/memberGovernance.ts';
import { INITIAL_INSIGHT_POSTS, validInsightPosts } from '../shared/insightPosts.ts';
import { InsightPosts } from '../src/components/InsightPosts.tsx';
import fs from 'node:fs';
import { parseArchiveCsv, comparison, observationKey, validArchive, csvCells, validObservation } from '../shared/paketindexArchive.ts';
import { PaketindexArchive } from '../src/components/PaketindexArchive.tsx';
import { SalaryDisplay } from '../src/components/SalaryEstimateEditor.tsx';
import { validSalaryEstimate } from '../shared/salary.ts';
import { AdBannerSlot } from '../src/components/AdBannerSlot.tsx';
import sharp from 'sharp';
import { prepareImage, reportDays, parseAnalyticsReport } from '../server/firebaseFeatures.ts';
import { CmsPublicImage } from '../src/components/CmsPublicImage.tsx';
import { NewsReviewPanel } from '../src/components/EditorialPanels.tsx';
import { MARKET_TITLE, LEGACY_MARKET_TITLE, matchesJob, neutralPlaceholder } from '../shared/portalContent.ts';
import { JobsView } from '../src/components/JobsView.tsx';
import { articleUrl, jobSummary } from '../shared/editorial.ts';
import { JobDescription, PlainTextDescription } from '../src/components/JobDescription.tsx';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { MarknadView } from '../src/components/MarknadView.tsx';
import { NewsView } from '../src/components/NewsView.tsx';
import { PartnersView } from '../src/components/PartnersView.tsx';
import { ThreePlView } from '../src/components/ThreePlView.tsx';
import { CommunityView } from '../src/components/CommunityView.tsx';
import { publicStore } from '../server/publicStore.ts';
import type { AddressInfo } from 'node:net';
import { createCmsApp } from '../server/app.ts';
import { createFirestoreStore, encodeStore } from '../server/firestoreStore.ts';
import { INITIAL_CMS_DATA } from '../server/seedData.ts';
import * as operations from '../server/store.ts';
import { resolveCmsIdentity } from '../server/authPolicy.ts';
import { ADMIN_EMAIL } from '../shared/firebaseSettings.ts';
import { upgradeSnapshot, validateSnapshot } from '../server/snapshot.ts';
import type { cmsFirestore } from '../server/firebaseAdmin.ts';

// Synthetic identities only: no Firebase access or real credentials in this check.
let snapshot = structuredClone(INITIAL_CMS_DATA);
snapshot.contactMessages = [{ id: 'private-contact', name: 'Private', email: 'private@example.invalid',
  topic: 'Test', message: 'Not public', createdAt: '2026-01-01' }];
snapshot.communityMembers = [{ id: 'private-member', name: 'Private', email: 'private@example.invalid',
  role: 'Test', city: 'Test', createdAt: '2026-01-01' }];
snapshot.merchants[0].status = 'draft';
const draftId = snapshot.merchants[0].id;
let exists = true;
let calls = 0;
let transactions = 0;
const ref = { get: async () => {
  calls++;
  return { exists, get: () => JSON.stringify(snapshot) };
} };
const database = {
  doc: (path: string) => { assert.equal(path, 'cmsSnapshots/main'); return ref; },
  runTransaction: async (operation: (transaction: unknown) => Promise<unknown>) => {
    transactions++;
    let pending: string | undefined;
    const value = await operation({
      get: () => ref.get(),
      set: (_ref: unknown, data: { payload: string }) => { pending = data.payload; },
    });
    if (pending) { snapshot = JSON.parse(pending); exists = true; }
    return value;
  },
};
const service = createFirestoreStore(() => database as unknown as ReturnType<typeof cmsFirestore>);
let featureMedia = false;
let featureReports = false;
let uploads = 0;
let reportCalls = 0;
let providerFails = false;
let userResolveCalls=0;
let userResolveFails=false;
let claimantLookupFails=false;let claimantDisabled=false;let claimantTotp=true;let claimantEmail='staff@verified.example';
let inviteEnabled=false;let inviteSuccess=true;let inviteCalls=0;
const fixtureImage = { path: 'cms-public/fixture.webp', url: 'https://firebasestorage.googleapis.com/v0/b/fixture/o/cms-public%2Ffixture.webp?alt=media',
  alt: 'Fixture logo', width: 2, height: 2 };
const app = createCmsApp(service, async (identity) => {
  if(identity.startsWith('security-'))return {uid:identity==='security-admin'?'security-admin':'security-member',email:identity==='security-admin'?'security-admin@example.invalid':identity==='security-email-change'?'changed@verified.example':'staff@verified.example',verified:true,admin:identity==='security-admin',mfaFactor:identity==='security-no-mfa'?undefined:'totp',authTime:identity==='security-stale'?1:Math.floor(Date.now()/1000)};
  if(['role-editor','role-moderator','role-delegate','role-other'].includes(identity))return {uid:identity,email:`${identity}@example.invalid`,verified:true,admin:false};
  if (identity === 'invalid-fixture') throw new Error('Invalid fixture identity');
  if (identity === 'governance-admin') return { uid: 'fixture-admin', email: 'admin@example.invalid', verified: true, admin: true };
  if (identity === 'member-two') {
    return { uid: 'fixture-user-two', email: 'two@example.invalid', verified: true, admin: false };
  }
  return { uid: 'fixture-user', email: 'fixture@example.invalid', verified: identity !== 'unverified-fixture', admin: identity === 'admin-fixture' };
}, {
  status: () => ({ mediaEnabled: featureMedia, reportsEnabled: featureReports,
    collectionEnabled: false, rawIpEnabled: false, heatmapsEnabled: false }),
  upload: async (image) => { uploads++; if (providerFails) throw new Error('provider-detail-not-for-client'); assert.ok(image.bytes.length); return fixtureImage; },
  report: async (days) => { reportCalls++; if (providerFails) throw new Error('provider-detail-not-for-client'); return { days, timeZone: 'Europe/Stockholm', rows: [
    { page: '/jobb', views: 10, activeUsers: 5, engagementSeconds: 60 },
  ], truncated: false, dataLossFromOtherRow: false, subjectToThresholding: false }; },
}, {resolve:async(input)=>{userResolveCalls++;if(userResolveFails)throw new Error('private-provider-detail');return {uid:'cms-new-fixture',email:input.email,emailVerified:false,created:userResolveCalls===1};}}, {configured:()=>inviteEnabled,sender:()=> 'Fixture <welcome@example.invalid>',send:async(invite)=>{inviteCalls++;assert.equal(invite.email,'new-user@example.invalid');return inviteSuccess;}},async(uid)=>uid==='fixture-user',async(uid)=>{if(claimantLookupFails)throw new Error('Private provider fault');return {uid,email:claimantEmail,verified:true,disabled:claimantDisabled,totpEnrolled:claimantTotp};});
// Ensures the API middleware doesn't intercept local Vite/static routes.
app.get('/portal-fixture', (_req, res) => { res.send('portal'); });
const server = app.listen(0, '127.0.0.1');
await new Promise<void>((resolve) => server.once('listening', resolve));
const origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
async function request(path: string, method = 'GET', body?: unknown, identity?: string) {
  if(method==='DELETE'&&path.startsWith('/api/insights/')&&body===undefined)body={};
  // Existing tests model a freshly loaded editor; explicit revisions bypass this helper.
  if(body&&typeof body==='object'&&!Object.hasOwn(body,'revision')) {
    let row:{revision?:number}|undefined;
    const id=path.split('/').at(-1);
    if(path.startsWith('/api/insights/'))row=snapshot.insightPosts?.find(p=>p.id===id);
    if(path.startsWith('/api/start-guide/'))row=snapshot.startGuide?.find(p=>p.id===id);
    if(method==='PUT'&&/^\/api\/sales\/[^/]+$/.test(path))row=snapshot.saleListings?.find(p=>p.id===id);
    if(path==='/api/media/image'&&['insight','sale'].includes((body as any).targetType))row=((body as any).targetType==='sale'?snapshot.saleListings:snapshot.insightPosts)?.find(p=>p.id===(body as any).targetId);
    if(row)body={...body,revision:row.revision??0};
  }
  return fetch(`${origin}${path}`, { method, headers: {
    'Content-Type': 'application/json', ...(identity ? { Authorization: `Bearer ${identity}` } : {}),
  }, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) });
}
try {
  const beforeTeam=structuredClone(await service.getStore());const rawBeforeTeam=structuredClone(snapshot);
  snapshot.collaboration=emptyCollaboration();
  const teamMembers=[{uid:'fixture-user-two',role:'writer'},{uid:'role-editor',role:'editor'},{uid:'role-moderator',role:'community-admin'},{uid:'role-delegate',role:'admin'},{uid:'role-other',role:''}];
  for(const u of teamMembers)snapshot.communityMembers.push({id:`member-${u.uid}`,authorUid:u.uid,name:u.uid,email:`${u.uid}@example.invalid`,role:'test',city:'Test',createdAt:new Date().toISOString(),verificationStatus:'verified'});
  assert.equal((await request('/api/teamspace','GET')).status,401);
  assert.equal((await request('/api/teamspace','GET',undefined,'unverified-fixture')).status,403);
  assert.equal((await request('/api/teamspace/roles','POST',{uid:'role-editor',roles:['admin'],revision:0},'member-two')).status,403);
  for(const u of teamMembers.filter(u=>u.role)){const rev=(await service.getStore()).collaboration!.revision;
    assert.equal((await request('/api/teamspace/roles','POST',{uid:u.uid,roles:[u.role],revision:rev},'admin-fixture')).status,200);
  }
  const writerSpace=await(await request('/api/teamspace','GET',undefined,'member-two')).json();assert.deepEqual(writerSpace.roles,['writer']);assert.equal(writerSpace.editorial,null);assert.deepEqual(writerSpace.grants,[]);
  assert.equal((await request('/api/cms/status','GET',undefined,'role-editor')).status,403);
  assert.equal((await request('/api/cms/status','GET',undefined,'role-moderator')).status,403);
  assert.equal((await request('/api/cms/status','GET',undefined,'role-delegate')).status,200);
  const rawMemberStore=await(await request('/api/cms/store','GET',undefined,'role-editor')).json();assert.equal(rawMemberStore.collaboration,undefined);assert.equal(rawMemberStore.contactMessages.length,0);
  const draftInput={revision:0,kind:'insight',title:'Writer article fixture',summary:'Intro',body:'## Heading\n\n**Body**',category:'Guide',sourceUrl:'',sourceName:'',date:new Date().toISOString().slice(0,10),state:'review',uid:'forged',status:'published'};
  const writerDraftResp=await request('/api/teamspace/editorial-save','POST',draftInput,'member-two');assert.equal(writerDraftResp.status,200);const writerDraftId=(await writerDraftResp.json()).id;
  let teamDraft=(await service.getStore()).collaboration!.drafts.find(d=>d.id===writerDraftId)!;assert.equal(teamDraft.uid,'fixture-user-two');assert.equal(teamDraft.state,'review');
  assert.ok(!(await service.getStore()).insightPosts!.some(p=>p.id===teamDraft.targetId));
  assert.equal((await request('/api/teamspace/editorial-publish','POST',{id:teamDraft.id,revision:teamDraft.revision,confirm:true},'member-two')).status,403);
  assert.equal((await request('/api/teamspace/editorial-save','POST',{...draftInput,id:teamDraft.id,revision:teamDraft.revision},'role-other')).status,403);
  assert.equal((await request('/api/teamspace/editorial-publish','POST',{id:teamDraft.id,revision:teamDraft.revision,confirm:true},'role-editor')).status,200);
  const publishedWriter=(await service.getStore()).insightPosts!.find(p=>p.id===teamDraft.targetId)!;assert.equal(publishedWriter.status,'published');assert.equal(publishedWriter.body,draftInput.body);
  assert.equal((await request('/api/teamspace/editorial-publish','POST',{id:teamDraft.id,revision:teamDraft.revision,confirm:true},'role-editor')).status,409);
  const editorSpace=await(await request('/api/teamspace','GET',undefined,'role-editor')).json();const editable=editorSpace.editorial.insights.find((p:any)=>p.id===publishedWriter.id);
  assert.equal((await request('/api/teamspace/editorial-save','POST',{...draftInput,targetId:editable.id,targetHash:'wrong'},'role-editor')).status,409);
  assert.equal((await request('/api/teamspace/editorial-save','POST',{...draftInput,targetId:editable.id,targetHash:editable.editHash},'role-editor')).status,200);
  assert.equal((await request('/api/teamspace/editorial-unpublish','POST',{kind:'insight',id:editable.id,hash:editable.editHash},'role-editor')).status,200);
  const changedDraft=(await service.getStore()).collaboration!.drafts.find(d=>d.targetId===editable.id&&d.state==='review')!;
  assert.equal((await request('/api/teamspace/editorial-publish','POST',{id:changedDraft.id,revision:changedDraft.revision,confirm:true},'role-editor')).status,409);
  // Original article-link review policy is still enforced for editors.
  assert.equal((await request('/api/teamspace/editorial-save','POST',{...draftInput,kind:'news',sourceUrl:'https://publisher.invalid/',sourceName:'Publisher'},'role-editor')).status,200);
  const newsDraft=(await service.getStore()).collaboration!.drafts.at(-1)!;const beforeNewsFail=structuredClone(snapshot);
  assert.equal((await request('/api/teamspace/editorial-publish','POST',{id:newsDraft.id,revision:newsDraft.revision,confirm:true,confirmArticleLink:true},'role-editor')).status,400);
  assert.deepEqual(snapshot,beforeNewsFail,'Failed publication cannot mark draft published or save partial data');
  const fixedNews={...newsDraft,sourceUrl:'https://publisher.invalid/news/exact-fixture-story',state:'review'};
  assert.equal((await request('/api/teamspace/editorial-save','POST',fixedNews,'role-editor')).status,200);
  const publishableNews=(await service.getStore()).collaboration!.drafts.find(d=>d.id===newsDraft.id)!;
  assert.equal((await request('/api/teamspace/editorial-publish','POST',{id:publishableNews.id,revision:publishableNews.revision,confirm:true,confirmArticleLink:true},'role-editor')).status,200);
  assert.ok((await service.getStore()).news.find(n=>n.id===publishableNews.targetId)?.linkReviewedAt);
  const newGuide=await request('/api/teamspace/editorial-save','POST',{...draftInput,kind:'guide',title:'Editor guide fixture'},'role-editor');assert.equal(newGuide.status,200);
  const newGuideId=(await newGuide.json()).id;const guideDraft=(await service.getStore()).collaboration!.drafts.find(d=>d.id===newGuideId)!;
  assert.equal((await request('/api/teamspace/editorial-publish','POST',{id:newGuideId,revision:guideDraft.revision,confirm:true},'role-editor')).status,200);
  assert.equal((await service.getStore()).startGuide!.find(g=>g.id===guideDraft.targetId)!.status,'published');

  // Admin reserves addresses; companies cannot claim slugs or create pages themselves.
  const company=(await service.getStore()).partners.find(p=>p.status==='published')!;
  const otherCompany=(await service.getStore()).partners.find(p=>p.status==='published'&&p.id!==company.id)!;
  assert.ok(!validSlug('partners')&&!validSlug('cms'));assert.equal(companySlugFromHash('#DHL'),'dhl');assert.equal(companySlugFromHash('#blogg/insight-test'),null);
  let regRev=(await service.getStore()).collaboration!.revision;
  assert.equal((await request('/api/teamspace/reserve-page','POST',{entityType:'partner',entityId:company.id,slug:'fixture-company',revision:regRev},'member-two')).status,403);
  assert.equal((await request('/api/teamspace/reserve-page','POST',{entityType:'partner',entityId:company.id,slug:'partners',revision:regRev},'admin-fixture')).status,400);
  const reserve=await request('/api/teamspace/reserve-page','POST',{entityType:'partner',entityId:company.id,slug:'fixture-company',revision:regRev},'admin-fixture');assert.equal(reserve.status,200);const pageId=(await reserve.json()).id;
  regRev=(await service.getStore()).collaboration!.revision;
  assert.equal((await request('/api/teamspace/reserve-page','POST',{entityType:'partner',entityId:otherCompany.id,slug:'fixture-company',revision:regRev},'admin-fixture')).status,409);
  const linkAt='2020-01-01T00:00:00.000Z';snapshot.memberGovernance={...emptyGovernance(),links:[{id:'page-link',uid:'fixture-user-two',entityType:'partner',entityId:company.id,status:'active',canPropose:true,receiveIntros:true,receiveMessages:true,includeHistory:true,createdAt:linkAt,updatedAt:linkAt}]};
  const pageContent={title:'Fixture company page',summary:'Our services',widgets:[{id:'widget-text',type:'text',title:'About',body:'## Hello',url:'',alt:'',formId:'',enabled:true},{id:'widget-form',type:'form',title:'Contact us',body:'',url:'',alt:'',formId:'form-lead',enabled:true}],forms:[{id:'form-lead',title:'Become a customer',purpose:'lead',recipientUids:['fixture-user-two'],fields:[{id:'question',label:'Your question',type:'textarea',required:true,options:[]}]}]};
  assert.ok(validCompanyContent(pageContent));
  assert.equal((await request('/api/teamspace/page-draft','POST',{id:pageId,revision:0,content:{...pageContent,forms:[{...pageContent.forms[0],recipientUids:['role-other']}]},state:'review'},'member-two')).status,403);
  assert.ok(!validCompanyContent({...pageContent,widgets:[{...pageContent.widgets[0],type:'private-inbox'}]}));
  assert.ok(!validCompanyContent({...pageContent,widgets:[{...pageContent.widgets[0],type:'image',url:'https://tracking.invalid/image.png',alt:'Image'}]}));

  assert.equal((await request('/api/teamspace/page-draft','POST',{id:pageId,revision:0,content:pageContent,state:'published'},'member-two')).status,400);
  assert.equal((await request('/api/teamspace/page-draft','POST',{id:pageId,revision:0,content:pageContent,state:'review'},'role-other')).status,403);
  assert.equal((await request('/api/teamspace/page-draft','POST',{id:pageId,revision:0,content:pageContent,state:'review'},'member-two')).status,200);
  assert.ok(!publicStore(await service.getStore()).publicCompanyPages!.some(p=>p.id===pageId));
  assert.equal((await request('/api/teamspace/page-decision','POST',{id:pageId,revision:1,decision:'publish',confirm:true},'member-two')).status,403);
  assert.equal((await request('/api/teamspace/page-decision','POST',{id:pageId,revision:1,decision:'publish',confirm:true},'role-editor')).status,403);
  assert.equal((await request('/api/teamspace/page-decision','POST',{id:pageId,revision:1,decision:'publish',confirm:true},'admin-fixture')).status,200);
  let companyPublic=publicStore(await service.getStore()).publicCompanyPages!.find(p=>p.id===pageId)!;assert.equal(companyPublic.slug,'fixture-company');assert.ok(!JSON.stringify(companyPublic).includes('recipientUids'));assert.ok(!JSON.stringify(companyPublic).includes('fixture-user-two'));
  const companyHtml=renderToString(createElement(FirebaseProvider,null,createElement(CompanyPageView,{page:companyPublic})));assert.ok(companyHtml.includes('Fixture company page')&&companyHtml.includes('Logga in'));assert.ok(!companyHtml.includes('fixture-user-two'));
  assert.equal((await request('/api/teamspace/page-draft','POST',{id:pageId,revision:2,content:{...pageContent,title:'Pending new headline'},state:'review'},'member-two')).status,200);
  assert.equal(publicStore(await service.getStore()).publicCompanyPages!.find(p=>p.id===pageId)!.content.title,'Fixture company page');
  assert.equal((await request('/api/teamspace/page-draft','POST',{id:pageId,revision:2,content:pageContent,state:'review'},'member-two')).status,409);
  const formMessage={id:'request-fixture',pageId,formId:'form-lead',answers:{question:'Private support detail'},confirm:true,email:'forged@example.invalid',uid:'forged'};
  assert.equal((await request('/api/teamspace/message','POST',formMessage)).status,401);
  assert.equal((await request('/api/teamspace/message','POST',formMessage,'unverified-fixture')).status,403);
  assert.equal((await request('/api/teamspace/message','POST',{...formMessage,answers:{unknown:'bad'}},'role-other')).status,400);
  assert.equal((await request('/api/teamspace/message','POST',formMessage,'role-other')).status,200);
  assert.equal((await request('/api/teamspace/message','POST',formMessage,'role-other')).status,200);
  assert.equal((await service.getStore()).collaboration!.messages.length,1);
  assert.equal((await service.getStore()).collaboration!.messages[0].email,'role-other@example.invalid');
  const beforeFormPause=structuredClone(snapshot);snapshot.memberGovernance!.settings.messagesEnabled=false;
  assert.equal((await request('/api/teamspace/message','POST',{...formMessage,id:'request-paused'},'role-other')).status,403);
  snapshot=beforeFormPause;
  const privateProjection=publicStore(await service.getStore());assert.equal(privateProjection.collaboration,undefined);
  assert.ok(!JSON.stringify(privateProjection.publicCompanyPages).includes('baseHash'));

  assert.equal((await(await request('/api/teamspace','GET',undefined,'member-two')).json()).messages.length,1);
  assert.equal((await(await request('/api/teamspace','GET',undefined,'role-editor')).json()).messages.length,0);
  assert.equal((await(await request('/api/teamspace','GET',undefined,'role-other')).json()).messages.length,0);
  const beforeHistoryGate=structuredClone(snapshot);snapshot.memberGovernance!.links[0].includeHistory=false;snapshot.memberGovernance!.links[0].createdAt='2099-01-01T00:00:00.000Z';
  assert.equal((await(await request('/api/teamspace','GET',undefined,'member-two')).json()).messages.length,0,'New recipient must not see earlier messages without history permission');snapshot=beforeHistoryGate;

  assert.ok(!JSON.stringify(await(await request('/api/cms/store')).json()).includes('Private support detail'));
  snapshot.memberGovernance!.links[0].status='revoked';
  assert.equal((await(await request('/api/teamspace','GET',undefined,'member-two')).json()).messages.length,0);
  assert.equal((await request('/api/teamspace/page-draft','POST',{id:pageId,revision:3,content:pageContent,state:'review'},'member-two')).status,403);
  assert.equal((await request('/api/teamspace/page-decision','POST',{id:pageId,revision:3,decision:'publish',confirm:true},'admin-fixture')).status,403);
  snapshot.memberGovernance!.links[0].status='active';
  assert.equal((await request('/api/teamspace/message-status','POST',{id:'request-fixture',revision:0,state:'working',assignedUid:'role-editor'},'member-two')).status,403);
  assert.equal((await request('/api/teamspace/message-status','POST',{id:'request-fixture',revision:0,state:'working',assignedUid:'fixture-user-two'},'member-two')).status,200);
  assert.equal((await request('/api/teamspace/message-status','POST',{id:'request-fixture',revision:0,state:'resolved',assignedUid:''},'member-two')).status,409);
  assert.equal((await request('/api/teamspace/page-decision','POST',{id:pageId,revision:3,decision:'unpublish'},'admin-fixture')).status,200);
  assert.equal((await request('/api/teamspace/message','POST',{...formMessage,id:'request-after-unpublish'},'role-other')).status,404);
  const moderatorSpace=await(await request('/api/teamspace','GET',undefined,'role-moderator')).json();assert.ok(moderatorSpace.moderation);assert.equal(moderatorSpace.editorial,null);assert.deepEqual(moderatorSpace.grants,[]);assert.deepEqual(moderatorSpace.messages,[]);
  assert.equal((await request('/api/teamspace/moderate','POST',{operation:'link',payload:{}},'role-moderator')).status,403);
  assert.equal((await request('/api/teamspace/community-block','POST',{uid:'fixture-user',reason:'Not allowed',blocked:true},'role-moderator')).status,403);
  assert.equal((await request('/api/teamspace/community-block','POST',{uid:'role-other',reason:'Fixture moderation',blocked:true},'role-moderator')).status,200);
  assert.equal((await request('/api/community/directory','GET',undefined,'role-other')).status,403);
  assert.equal((await request('/api/teamspace','GET',undefined,'role-other')).status,200,'Community block is not a platform-wide ban');
  const beforeRejectedMembership=structuredClone(snapshot);snapshot.communityMembers.find(m=>m.authorUid==='role-editor')!.verificationStatus='rejected';
  assert.equal((await request('/api/teamspace/editorial-save','POST',draftInput,'role-editor')).status,403);
  snapshot=beforeRejectedMembership;
  const revokeRevision=(await service.getStore()).collaboration!.revision;
  assert.equal((await request('/api/teamspace/roles','POST',{uid:'role-editor',roles:[],revision:revokeRevision},'admin-fixture')).status,200);
  assert.equal((await request('/api/teamspace/editorial-save','POST',draftInput,'role-editor')).status,403);
  assert.deepEqual((await(await request('/api/teamspace','GET',undefined,'role-editor')).json()).drafts,[]);

  const revokeAdminRevision=(await service.getStore()).collaboration!.revision;
  assert.equal((await request('/api/teamspace/roles','POST',{uid:'role-delegate',roles:[],revision:revokeAdminRevision},'admin-fixture')).status,200);
  assert.equal((await request('/api/cms/status','GET',undefined,'role-delegate')).status,403);
  await assert.rejects(service.executeCollaboration({uid:'role-delegate',email:'role-delegate@example.invalid',verified:true,admin:true,baseAdmin:false},'reserve-page',{entityType:'partner',entityId:otherCompany.id,slug:'revoked-race',revision:(await service.getStore()).collaboration!.revision}),/Admin krävs/);

  assert.equal((await request('/api/cms/status','GET',undefined,'admin-fixture')).status,200,'Original admin policy survives role changes');
  assert.ok(validCollaboration((await service.getStore()).collaboration));assert.ok(validateSnapshot(await service.getStore()));
  assert.ok(!validCollaboration({...emptyCollaboration(),pages:[null]}));assert.ok(!validCompanyContent({...pageContent,widgets:[null]}));
  assert.ok(!validateSnapshot({...snapshot,collaboration:{...snapshot.collaboration!,roles:[{uid:'forged',roles:['superuser'],updatedBy:'fixture',updatedAt:new Date().toISOString()}]}}));
  const fullAuditSnapshot=structuredClone(snapshot);snapshot.collaboration!.audit=Array.from({length:300},(_,n)=>({id:`audit-${n}`,uid:'fixture-user',action:'test',target:'fixture',at:new Date().toISOString()}));
  const beforeFullTeamWrite=structuredClone(snapshot);
  assert.equal((await request('/api/teamspace/reserve-page','POST',{entityType:'partner',entityId:otherCompany.id,slug:'full-audit-fixture',revision:snapshot.collaboration!.revision},'admin-fixture')).status,413);
  assert.deepEqual(snapshot,beforeFullTeamWrite,'Full audit must not erase history or create a partial company page');snapshot=fullAuditSnapshot;

  assert.deepEqual((await service.getStore()).regions,beforeTeam.regions);assert.deepEqual((await service.getStore()).paketindexArchive,beforeTeam.paketindexArchive);
  const beforeStarters=structuredClone(snapshot);
  assert.equal((await request('/api/teamspace/starter-pages','POST',{confirm:true,revision:snapshot.collaboration!.revision},'member-two')).status,403);
  assert.equal((await request('/api/teamspace/starter-pages','POST',{confirm:true,revision:snapshot.collaboration!.revision},'admin-fixture')).status,200);
  const seeded=await service.getStore();
  for(const slug of ['dhl','klarna','qliro','bring','postnord','wetail','synkka','alignr']){
    const page=seeded.collaboration!.pages.find(p=>p.slug===slug);if(!page){const entity=seeded.partners.find(p=>p.id===`p-${slug}`)!;const original=beforeStarters.collaboration!.pages.find(p=>p.entityId===entity.id)!;assert.ok(original);assert.deepEqual(seeded.collaboration!.pages.find(p=>p.id===original.id),original);continue;}assert.equal(page.state,'draft');assert.equal(page.published,undefined);
    assert.equal(page.responsibleUid,'fixture-user');assert.equal(page.managedByPlatform,true);assert.deepEqual(page.draft.forms,[]);
  }
  const once=structuredClone(snapshot);
  assert.equal((await request('/api/teamspace/starter-pages','POST',{confirm:true,revision:snapshot.collaboration!.revision},'admin-fixture')).status,200);
  assert.deepEqual({...snapshot,updatedAt:once.updatedAt},once,'Repeating starter package must not overwrite any existing page or company');
  assert.deepEqual(publicStore(snapshot).publicCompanyPages,publicStore(beforeStarters).publicCompanyPages);
  const locked=seeded.collaboration!.pages.find(p=>p.slug==='dhl')!;
  snapshot.memberGovernance!.links.push({id:'starter-company-link',updatedAt:new Date().toISOString(),uid:'fixture-user-two',entityType:'partner',entityId:locked.entityId,status:'active',canPropose:true,receiveIntros:true,receiveMessages:true,includeHistory:true,createdAt:new Date().toISOString()} as any);
  assert.ok(!(await(await request('/api/teamspace','GET',undefined,'member-two')).json()).pages.some((p:any)=>p.id===locked.id));
  assert.equal((await request('/api/teamspace/page-draft','POST',{id:locked.id,revision:locked.revision,content:locked.draft,state:'draft'},'member-two')).status,403);
  snapshot=structuredClone(beforeStarters);snapshot.collaboration!.pages.push({...locked,slug:'wetail',entityId:'wrong-company',id:'page-conflict'});
  const beforeConflict=structuredClone(snapshot);
  assert.equal((await request('/api/teamspace/starter-pages','POST',{confirm:true,revision:snapshot.collaboration!.revision},'admin-fixture')).status,409);
  assert.deepEqual(snapshot,beforeConflict,'Conflict in package must roll back earlier additions');
  // Reproduce the real button's POST → separate GET → CMS list flow from no collaboration field.
  snapshot=structuredClone(rawBeforeTeam);delete snapshot.collaboration;
  const freshCreation=await createAndVerifyCompanyPages(0,async revision=>{
    const response=await request('/api/teamspace/starter-pages','POST',{confirm:true,revision},'admin-fixture');
    assert.equal(response.status,200);return response.json();
  },async()=>{
    const response=await request('/api/teamspace','GET',undefined,'admin-fixture');assert.equal(response.status,200);return response.json();
  });
  assert.equal(freshCreation.summary.created,8);assert.equal(freshCreation.summary.existing,0);
  assert.equal(freshCreation.workspace.pages.length,8);
  assert.equal((await service.getStore()).collaboration!.pages.length,8,'Separate persisted read must return all eight pages');
  const savedSummary=freshCreation.summary;
  const listMarkup=renderToString(createElement(CompanyPagesPanel,{data:freshCreation.workspace,admin:true,reload:async()=>{}})).replace(/<!--.*?-->/g,'');
  for(const slug of ['dhl','klarna','qliro','bring','postnord','wetail','synkka','alignr'])assert.ok(listMarkup.includes('#'+slug));
  assert.ok(listMarkup.includes('Företagssidor (8)')&&listMarkup.includes('Inte publicerad'));
  assert.ok(!listMarkup.includes('Öppna publik sida'),'Drafts must preview privately, not link to public missing-state');
  const sample=freshCreation.workspace.pages[0];
  const previewSource={...sample,draft:{...sample.draft,forms:[{id:'private-form',title:'Contact',purpose:'lead' as const,recipientUids:['secret-recipient'],fields:[]}]}};
  assert.ok(!JSON.stringify(companyPagePreview(previewSource,'draft')).includes('secret-recipient'));
  assert.equal(companyPagePreview(sample,'published'),undefined);
  const formPreview={...sample,draft:{...sample.draft,widgets:[{id:'preview-form-widget',type:'form' as const,title:'Förhandsvisningsformulär',body:'',url:'',alt:'',formId:'preview-form',enabled:true}],forms:[{id:'preview-form',title:'Offert',purpose:'quote' as const,recipientUids:['private-uid'],fields:[{id:'question',label:'Fråga',type:'text' as const,required:true,options:[]}]}]}};
  const formPreviewHtml=renderToString(createElement(FirebaseProvider,null,createElement(CompanyPageView,{page:companyPagePreview(formPreview,'draft'),preview:true,previewLabel:'Sparad adminförhandsvisning'})));
  assert.ok(formPreviewHtml.includes('fieldset disabled')&&formPreviewHtml.includes('Förhandsvisning – inget skickas')&&formPreviewHtml.includes('Sparad adminförhandsvisning'));
  assert.ok(!formPreviewHtml.includes('private-uid'));

  assert.ok(renderToString(createElement(CompanyPageView,{page:companyPagePreview(sample,'draft'),preview:true})).includes('Osparad förhandsvisning'));
  const savedAgain=await request('/api/teamspace/starter-pages','POST',{confirm:true,revision:freshCreation.workspace.revision},'admin-fixture');
  assert.equal(savedAgain.status,200);const againSummary=(await savedAgain.json()).starterPages;
  assert.equal(againSummary.created,0);assert.equal(againSummary.existing,8);assert.deepEqual(againSummary.pages.map((p:any)=>p.id),savedSummary.pages.map(p=>p.id));
  await assert.rejects(createAndVerifyCompanyPages(0,async()=>({ok:true}),async()=>freshCreation.workspace),/kunde inte bekräftas/);
  await assert.rejects(createAndVerifyCompanyPages(0,async()=>({ok:true,starterPages:savedSummary}),async()=>({...freshCreation.workspace,pages:[]})),/kunde inte läsas tillbaka/);
  await assert.rejects(createAndVerifyCompanyPages(0,async()=>{throw new Error('Skrivning nekad');},async()=>freshCreation.workspace),/Skrivning nekad/);
  await assert.rejects(createAndVerifyCompanyPages(0,async()=>({ok:true,starterPages:savedSummary}),async()=>{throw new Error('Återläsning misslyckades');}),/Återläsning misslyckades/);
  const emptyList=renderToString(createElement(CompanyPagesPanel,{data:{...freshCreation.workspace,pages:[]},admin:true,reload:async()=>{}}));assert.ok(emptyList.includes('Inga företagssidor sparade ännu'));
  const beforeVerificationTests=structuredClone(snapshot);
  const oldTotpFlag=process.env.FIREBASE_TOTP_ENABLED,oldMfaFlag=process.env.REQUIRE_PRIVILEGED_MFA;
  delete process.env.REQUIRE_PRIVILEGED_MFA;
  assert.equal(normalizedCompanyDomain(' Klarna.com '),'klarna.com');
  for(const bad of ['https://klarna.com','klarna.com/','*.klarna.com','klarna.com@evil.test','klarna.com:443','-bad.example'])assert.equal(normalizedCompanyDomain(bad),null);
  assert.ok(emailMatchesCompanyDomain('STAFF@Klarna.com',['klarna.com']));assert.ok(!emailMatchesCompanyDomain('staff@evil-klarna.com',['klarna.com']));assert.ok(!emailMatchesCompanyDomain('staff@sub.klarna.com',['klarna.com']));
  const mfaActor={uid:'security-member',email:'staff@verified.example',verified:true,admin:false,mfaFactor:'totp',authTime:Math.floor(Date.now()/1000)};
  assert.doesNotThrow(()=>requireTotp(mfaActor,true));assert.throws(()=>requireTotp({...mfaActor,mfaFactor:undefined}));assert.throws(()=>requireTotp({...mfaActor,authTime:1},true));assert.throws(()=>requireTotp({...mfaActor,mfaFactor:'sms'},true));
  const identityMfa=await resolveCmsIdentity({uid:'safe',email:'staff@verified.example',email_verified:true,auth_time:mfaActor.authTime,firebase:{sign_in_second_factor:'totp'}},async()=>false);assert.equal(identityMfa.mfaFactor,'totp');
  snapshot.communityMembers.push({id:'security-member',authorUid:'security-member',name:'Test employee',email:'staff@verified.example',role:'Test',city:'Test',verificationStatus:'verified',createdAt:new Date().toISOString()});
  const targetPage=snapshot.collaboration!.pages.find(p=>p.slug==='dhl')!;
  const claimBody={entityType:'partner',entityId:targetPage.entityId,name:'Employee',position:'Manager',registrationNumber:'TEST-123',address:'Test Address',reason:'Manual company authorisation must be checked',confirm:true,email:'attacker@another.example',mfaFactor:'totp'};
  delete process.env.FIREBASE_TOTP_ENABLED;
  assert.equal((await request('/api/teamspace/claim-submit','POST',claimBody,'security-member')).status,403);
  process.env.FIREBASE_TOTP_ENABLED='true';
  assert.equal((await request('/api/teamspace/claim-submit','POST',claimBody,'security-no-mfa')).status,403);
  assert.equal((await request('/api/teamspace/claim-submit','POST',claimBody,'security-stale')).status,403);
  assert.equal((await request('/api/teamspace/claim-submit','POST',claimBody,'security-member')).status,200);
  let claim=snapshot.collaboration!.verification!.claims.at(-1)!;const claimId=claim.id;
  assert.equal(claim.email,'staff@verified.example');assert.equal(claim.uid,'security-member');assert.equal(claim.state,'pending');
  assert.ok(!snapshot.memberGovernance?.links.some(l=>l.verificationClaimId===claim.id));
  assert.equal((await request('/api/teamspace/claim-submit','POST',claimBody,'security-member')).status,409);
  assert.equal((await request('/api/teamspace/claim-decision','POST',{id:claim.id,revision:0,decision:'approve',confirm:true,note:'Review',confirmAuthority:true,confirmHandover:true},'security-member')).status,403);
  const policyBody={revision:snapshot.collaboration!.revision,entityType:'partner',entityId:targetPage.entityId,domains:['verified.example'],registrationNumber:'TEST-123',address:'Test Address',confirm:true};
  assert.equal((await request('/api/teamspace/verification-policy','POST',policyBody,'admin-fixture')).status,403);
  assert.equal((await request('/api/teamspace/verification-policy','POST',policyBody,'security-admin')).status,200);
  const claimDecision={id:claimId,revision:0,decision:'approve',confirm:true,confirmAuthority:true,confirmHandover:true,note:'Independent authority check completed'};
  const beforeSelfApproval=structuredClone(snapshot);snapshot.collaboration!.verification!.claims.find(c=>c.id===claimId)!.uid='security-admin';
  assert.equal((await request('/api/teamspace/claim-decision','POST',claimDecision,'security-admin')).status,403);snapshot=beforeSelfApproval;
  const beforeProviderError=structuredClone(snapshot);claimantLookupFails=true;
  assert.equal((await request('/api/teamspace/claim-decision','POST',claimDecision,'security-admin')).status,503);assert.deepEqual(snapshot,beforeProviderError);claimantLookupFails=false;
  claimantTotp=false;assert.equal((await request('/api/teamspace/claim-decision','POST',claimDecision,'security-admin')).status,403);claimantTotp=true;
  claimantDisabled=true;assert.equal((await request('/api/teamspace/claim-decision','POST',claimDecision,'security-admin')).status,403);claimantDisabled=false;
  claimantEmail='different@verified.example';assert.equal((await request('/api/teamspace/claim-decision','POST',claimDecision,'security-admin')).status,403);claimantEmail='staff@verified.example';
  assert.equal((await request('/api/teamspace/claim-decision','POST',{...claimDecision,confirmAuthority:false},'security-admin')).status,400);
  assert.equal((await request('/api/teamspace/claim-decision','POST',claimDecision,'security-admin')).status,200);
  claim=snapshot.collaboration!.verification!.claims.find(c=>c.id===claimId)!;assert.equal(claim.state,'approved');
  const verifiedLink=snapshot.memberGovernance!.links.find(l=>l.id===claim.linkId)!;
  assert.ok(verifiedLink.canPropose);assert.equal(verifiedLink.receiveIntros,false);assert.equal(verifiedLink.receiveMessages,false);assert.equal(verifiedLink.includeHistory,false);
  assert.equal(snapshot.collaboration!.pages.find(p=>p.id===targetPage.id)!.responsibleUid,'security-member');assert.equal(snapshot.collaboration!.pages.find(p=>p.id===targetPage.id)!.managedByPlatform,false);
  assert.equal((await request('/api/teamspace','GET',undefined,'security-member')).status,200);
  assert.equal((await request('/api/teamspace','GET',undefined,'security-no-mfa')).status,403);
  assert.equal((await request('/api/company/workspace','GET',undefined,'security-email-change')).status,403);
  const claimsWorkspace=await(await request('/api/teamspace','GET',undefined,'security-admin')).json();
  const claimsHtml=renderToString(createElement(FirebaseProvider,null,createElement(CompanyVerificationPanel,{data:claimsWorkspace,reload:async()=>{}})));
  assert.ok(claimsHtml.includes('Återkalla och återta förvaltning')&&claimsHtml.includes('företrädarrätt'));
  const disabledClaimsHtml=renderToString(createElement(FirebaseProvider,null,createElement(CompanyVerificationPanel,{data:{...claimsWorkspace,mfa:{enabled:false,required:false,verified:false}},reload:async()=>{}})));
  assert.ok(disabledClaimsHtml.includes('Förberett men avstängt')&&disabledClaimsHtml.includes('fieldset disabled'));
  const ordinaryView=await(await request('/api/teamspace','GET',undefined,'role-other')).json();assert.deepEqual(ordinaryView.verification.claims,[]);assert.deepEqual(ordinaryView.verification.policies,[]);
  assert.ok(!JSON.stringify(publicStore(snapshot)).includes('mfaVerifiedAt'));assert.ok(!JSON.stringify(publicStore(snapshot)).includes('verificationClaimId'));
  assert.ok(validCompanyVerification(snapshot.collaboration!.verification));assert.ok(validateSnapshot(snapshot));
  const legacyLinkInput={memberId:'security-member',entityType:'partner',entityId:targetPage.entityId,status:'active',canPropose:true,receiveIntros:false,receiveMessages:false,includeHistory:false};
  assert.equal((await request('/api/governance/link','POST',legacyLinkInput,'security-admin')).status,200);
  assert.equal(snapshot.memberGovernance!.links.find(l=>l.id===verifiedLink.id)!.verifiedEmail,'staff@verified.example');assert.equal(snapshot.memberGovernance!.links.find(l=>l.id===verifiedLink.id)!.verificationClaimId,claimId);
  const beforeRevoke=structuredClone(snapshot);
  assert.equal((await request('/api/teamspace/claim-decision','POST',{id:claimId,revision:1,decision:'revoke',confirm:true,note:'Authorisation ended'},'security-admin')).status,200);
  assert.equal(snapshot.memberGovernance!.links.find(l=>l.id===verifiedLink.id)!.status,'revoked');assert.equal(snapshot.collaboration!.pages.find(p=>p.id===targetPage.id)!.managedByPlatform,true);
  assert.equal((await(await request('/api/teamspace','GET',undefined,'security-member')).json()).pages.some((p:any)=>p.id===targetPage.id),false);
  assert.equal((await request('/api/governance/link','POST',legacyLinkInput,'security-admin')).status,403);
  // Domain mismatch stays manual; changing a submitted value never auto-grants access.
  snapshot=beforeRevoke;snapshot.collaboration!.verification!.claims[0].state='pending';snapshot.collaboration!.verification!.claims[0].revision=0;snapshot.collaboration!.verification!.claims[0].registrationNumber='DIFFERENT';snapshot.memberGovernance!.links=snapshot.memberGovernance!.links.filter(l=>l.id!==verifiedLink.id);snapshot.collaboration!.pages.find(p=>p.id===targetPage.id)!.managedByPlatform=true;
  assert.equal((await request('/api/teamspace/claim-decision','POST',claimDecision,'security-admin')).status,400);
  assert.equal((await request('/api/teamspace/claim-decision','POST',{...claimDecision,confirmException:true},'security-admin')).status,200);
  process.env.REQUIRE_PRIVILEGED_MFA='true';
  assert.equal((await request('/api/cms/store','GET',undefined,'admin-fixture')).status,403);assert.equal((await request('/api/cms/status','GET',undefined,'admin-fixture')).status,403);
  assert.equal((await request('/api/cms/store','GET',undefined,'security-admin')).status,200);assert.equal((await request('/api/access/me','GET',undefined,'admin-fixture')).status,200);
  if(oldTotpFlag===undefined)delete process.env.FIREBASE_TOTP_ENABLED;else process.env.FIREBASE_TOTP_ENABLED=oldTotpFlag;
  if(oldMfaFlag===undefined)delete process.env.REQUIRE_PRIVILEGED_MFA;else process.env.REQUIRE_PRIVILEGED_MFA=oldMfaFlag;
  snapshot=beforeVerificationTests;
  snapshot=rawBeforeTeam;
  const rawBeforePages=structuredClone(snapshot);const beforePages=structuredClone(await service.getStore());
  assert.equal((await request('/api/page-layouts/om','PUT',defaultPageLayout('om'))).status,401);
  assert.equal((await request('/api/page-layouts/om','PUT',defaultPageLayout('om'),'member-two')).status,403);
  assert.equal((await request('/api/page-layouts/cms','PUT',defaultPageLayout('om'),'admin-fixture')).status,400);
  assert.equal((await request('/api/page-layouts/community','PUT',{...defaultPageLayout('community'),items:defaultPageLayout('community').items.map((i,n)=>n===0?{...i,id:'messages'}:i)},'admin-fixture')).status,400);
  for(const page of Object.keys(PAGE_WIDGETS) as Array<keyof typeof PAGE_WIDGETS>){
    const initial=defaultPageLayout(page);
    const hidden={...initial,items:initial.items.map(i=>({...i,enabled:PAGE_WIDGETS[page].find(d=>d.id===i.id)!.locked?true:false}))};
    assert.ok(validPageLayout(page,hidden));
    const response=await request(`/api/page-layouts/${page}`,'PUT',{...hidden,...(page==='marknad'?{legacyHomeRevision:beforePages.homeWidgets?.revision??0}:{})},'admin-fixture');
    assert.equal(response.status,200,`Save ${page}`);assert.equal((await response.json()).revision,1);
    assert.equal((await request(`/api/page-layouts/${page}`,'PUT',hidden,'admin-fixture')).status,409,`Stale ${page}`);
    const locked=PAGE_WIDGETS[page].find(d=>d.locked)!;
    assert.equal((await request(`/api/page-layouts/${page}`,'PUT',{...hidden,revision:1,items:hidden.items.map(i=>i.id===locked.id?{...i,enabled:false}:i)},'admin-fixture')).status,400);
  }
  const pagesStored=await service.getStore();assert.equal(Object.keys(pagesStored.pageLayouts!).length,14);assert.ok(validPageLayouts(pagesStored.pageLayouts));assert.ok(validateSnapshot(pagesStored));
  for(const key of ['merchants','partners','jobs','news','startGuide','saleListings','regions','paketindexArchive','homeWidgets','contactMessages','memberGovernance'] as const)assert.deepEqual(pagesStored[key],beforePages[key],`Layout cannot change ${key}`);
  assert.equal((await request('/api/home-widgets','PUT',DEFAULT_HOME_WIDGETS,'admin-fixture')).status,409,'Old homepage UI cannot override unified layout');
  assert.ok(!validateSnapshot({...pagesStored,pageLayouts:{cms:defaultPageLayout('om')}}));
  assert.ok(!validateSnapshot({...pagesStored,pageLayouts:{om:{...defaultPageLayout('om'),items:[]}}}));
  snapshot=structuredClone(rawBeforePages);snapshot.homeWidgets={...structuredClone(DEFAULT_HOME_WIDGETS),revision:5};
  assert.equal((await request('/api/page-layouts/marknad','PUT',defaultPageLayout('marknad'),'admin-fixture')).status,409,'Migration must detect concurrent legacy-home changes');
  assert.equal((await request('/api/page-layouts/marknad','PUT',{...defaultPageLayout('marknad'),legacyHomeRevision:5},'admin-fixture')).status,200);
  snapshot=structuredClone(rawBeforePages);snapshot.memberGovernance={...emptyGovernance(),blocks:[{uid:'fixture-user',reason:'fixture',createdAt:new Date().toISOString()}]};
  assert.equal((await request('/api/page-layouts/om','PUT',defaultPageLayout('om'),'admin-fixture')).status,403);
  setLayoutPreviewReadOnly(true);
  await assert.rejects(layoutPreviewApi.savePublicPageLayout('om',defaultPageLayout('om')),/skrivskyddad/);
  await assert.rejects(layoutPreviewApi.submitSaleListing({} as any),/skrivskyddad/);
  await assert.rejects(toggleSavedSessionInFirestore('fixture-user',{} as any,true),/skrivskyddad/);
  setLayoutPreviewReadOnly(false);snapshot=rawBeforePages;
  const richText='# This becomes H2\n\n## Heading\n\nA **bold** and *italic* [safe](https://example.org/page) text.\n\n- First\n- Second\n\n1. One\n2. Two\n\n---\n\n![Product](https://firebasestorage.googleapis.com/v0/b/fixture/o/image.webp?alt=media)\n\n<script>alert(1)</script>\n\n[bad](javascript:alert)';
  const richHtml=renderToString(createElement(ContentText,{text:richText,format:'markdown'}));
  for(const marker of ['<h2','<strong>bold</strong>','<em>italic</em>','<ul','<ol','<hr','alt="Product"','href="https://example.org/page"'])assert.ok(richHtml.includes(marker));
  assert.ok(!richHtml.includes('<h1'));assert.ok(!richHtml.includes('<script>'));assert.ok(!richHtml.includes('href="javascript:'));
  assert.equal(contentUrl('javascript:alert(1)'),null);assert.equal(contentUrl('data:text/html,bad'),null);assert.equal(contentUrl('https://user:pass@example.org'),null);
  assert.equal(contentUrl('https://tracking.example/image.png',true),null);assert.equal(contentUrl('//example.org'),null);
  const legacyRich=renderToString(createElement(ContentText,{text:'## Literal **text**'}));
  assert.ok(!legacyRich.includes('<h2')&&!legacyRich.includes('<strong>'));
  assert.ok(inlineParts('[x](https://example.org)').some(p=>p.kind==='link'));
  assert.ok(!validContentMetadata({tags:Array.from({length:16},(_,n)=>String(n))}));
  assert.ok(!validContentMetadata({seoDescription:'x'.repeat(181)}));
  assert.deepEqual(cleanContentMetadata({tags:['one','','one',' two ']}).tags,['one','two']);
  const editorHtml=renderToString(createElement(ContentEditor,{label:'Text',value:'',onChange:()=>{},maxLength:15000}));
  assert.ok(editorHtml.includes('H2')&&editorHtml.includes('Kursiv')&&editorHtml.includes('Bildreferens')&&editorHtml.includes('Visa'));
  const priorRich=structuredClone(await service.getStore());const rawPriorRich=structuredClone(snapshot);
  const richPost={...INITIAL_INSIGHT_POSTS[0],id:'insight-rich-test',contentFormat:'markdown' as const,body:richText,seoTitle:'SEO title',seoDescription:'SEO summary',tags:['guide','checkout']};
  assert.equal((await request(`/api/insights/${richPost.id}`,'PUT',richPost,'admin-fixture')).status,200);
  const richSaved=(await service.getStore()).insightPosts!.find(p=>p.id===richPost.id)!;
  assert.equal(richSaved.contentFormat,'markdown');assert.equal(richSaved.seoTitle,'SEO title');assert.deepEqual(richSaved.tags,['guide','checkout']);
  assert.equal((await request(`/api/insights/${richPost.id}`,'PUT',{...richSaved,seoTitle:'x'.repeat(81)},'admin-fixture')).status,400);
  const richGuide={...INITIAL_START_GUIDE[0],body:richText,contentFormat:'markdown' as const,seoTitle:'Guide title',tags:['start']};
  assert.equal((await request(`/api/start-guide/${richGuide.id}`,'PUT',richGuide,'admin-fixture')).status,200);
  assert.equal((await service.getStore()).startGuide!.find(c=>c.id===richGuide.id)!.contentFormat,'markdown');
  const richSale={title:'Rich listing',intent:'sell',category:'stock',description:richText,included:'**Products**, no private data',location:'Fixture',priceLabel:'100 SEK',quantity:'10',condition:'New',requestId:'sale-rich-metadata',sellerName:'Fixture editor',sellerEmail:'fixture@example.invalid',status:'draft',internalNotes:'',reviewConfirmed:false,authorityConfirmed:true,publicContentConfirmed:true,contentFormat:'markdown',seoTitle:'Sale title',seoDescription:'Sale description',tags:['stock']};
  assert.equal((await request('/api/sales','POST',richSale,'admin-fixture')).status,201);
  const richSaleSaved=(await service.getStore()).saleListings!.find(s=>s.id==='sale-rich-metadata')!;
  assert.equal(richSaleSaved.contentFormat,'markdown');assert.equal(richSaleSaved.seoTitle,'Sale title');assert.deepEqual(richSaleSaved.tags,['stock']);
  assert.equal((await request('/api/sales','POST',{...richSale,requestId:'sale-bad-tags',tags:['x'.repeat(41)]},'admin-fixture')).status,400);
  assert.deepEqual((await service.getStore()).merchants,priorRich.merchants);
  assert.ok(validateSnapshot(await service.getStore()));snapshot=rawPriorRich;
  const legacyWidgets={version:1 as const,revision:4,items:[{id:'audience' as const,enabled:false,order:2},{id:'latest-index' as const,enabled:true,order:1},{id:'index-archive' as const,enabled:false,order:0},{id:'insights' as const,enabled:false,order:3}]};
  assert.ok(validHomeWidgets(legacyWidgets));const expandedWidgets=homeWidgetLayout(legacyWidgets);
  assert.equal(expandedWidgets.version,3);assert.equal(expandedWidgets.items.length,12);assert.equal(expandedWidgets.revision,4);
  assert.equal(expandedWidgets.items.find(i=>i.id==='audience')!.enabled,false);assert.equal(expandedWidgets.items.find(i=>i.id==='insights')!.enabled,false);
  assert.equal(expandedWidgets.items.find(i=>i.id==='top-ad')!.enabled,true);
  assert.deepEqual(widgetsInZone(legacyWidgets,'top').map(i=>i.id),['latest-index']);
  assert.deepEqual(widgetsInZone(undefined,'support').map(i=>i.id),['top-ad','top-form']);
  assert.deepEqual(widgetsInZone(undefined,'editorial').map(i=>i.id),['checkout-cta','mid-ad','insights']);
  assert.deepEqual(widgetsInZone(undefined,'footer').map(i=>i.id),['bottom-form']);
  const marketWidgetIds=['regions-map','industry-trends','consumer-insights'];
  assert.deepEqual(widgetsInZone(undefined,'market').map(i=>i.id),marketWidgetIds);
  const previousV2={version:2 as const,revision:7,items:DEFAULT_HOME_WIDGETS.items.filter(i=>!marketWidgetIds.includes(i.id)).map((i,order)=>({...i,order,enabled:i.id==='top-form'?false:i.enabled}))};
  const previousV2Copy=structuredClone(previousV2);
  assert.ok(validHomeWidgets(previousV2));const migratedV3=homeWidgetLayout(previousV2);
  assert.equal(migratedV3.version,3);assert.equal(migratedV3.items.length,12);assert.equal(migratedV3.revision,7);
  assert.equal(migratedV3.items.find(i=>i.id==='top-form')!.enabled,false);
  assert.deepEqual(widgetsInZone(previousV2,'market').map(i=>i.id),marketWidgetIds);
  for(const zone of ['top','support','editorial','footer'] as const)assert.deepEqual(widgetsInZone(previousV2,zone),widgetsInZone(migratedV3,zone));
  assert.deepEqual(previousV2,previousV2Copy,'Render upgrade must never mutate stored layout');
  const customV2={...previousV2,items:previousV2.items.map(i=>({...i,order:20-i.order}))};
  const customV3=homeWidgetLayout(customV2);
  for(const zone of ['top','support','editorial','footer'] as const){
    const expected=customV2.items.filter(i=>widgetsInZone(previousV2,zone).some(old=>old.id===i.id)).filter(i=>i.enabled).sort((a,b)=>a.order-b.order).map(i=>i.id);
    assert.deepEqual(widgetsInZone(customV3,zone).map(i=>i.id),expected,`Preserve customized v2 order: ${zone}`);
  }

  const marketNodes={'regions-map':createElement('section',null,'Map fixture'),'industry-trends':createElement('section',null,'Trend fixture'),'consumer-insights':createElement('section',null,'Consumer fixture')};
  const marketDefault=renderToString(createElement(HomeWidgetZone,{layout:undefined,zone:'market',widgets:marketNodes}));
  assert.equal(marketDefault,renderToString(createElement(HomeWidgetZone,{layout:previousV2,zone:'market',widgets:marketNodes})));
  const movedMarket={...structuredClone(DEFAULT_HOME_WIDGETS),items:DEFAULT_HOME_WIDGETS.items.map(i=>i.id==='regions-map'?{...i,order:7}:i.id==='consumer-insights'?{...i,order:5}:i)};
  assert.ok(validHomeWidgets(movedMarket));assert.deepEqual(widgetsInZone(movedMarket,'market').map(i=>i.id),['consumer-insights','industry-trends','regions-map']);
  const hiddenMarketConfig={...structuredClone(DEFAULT_HOME_WIDGETS),items:DEFAULT_HOME_WIDGETS.items.map(i=>({...i,enabled:!marketWidgetIds.includes(i.id)}))};
  assert.equal(renderToString(createElement(HomeWidgetZone,{layout:hiddenMarketConfig,zone:'market',widgets:marketNodes})),'');

  const beforeLegacyLayout=structuredClone(snapshot);snapshot.homeWidgets=legacyWidgets;
  assert.equal((await request('/api/home-widgets','PUT',legacyWidgets,'admin-fixture')).status,200);
  assert.equal((await service.getStore()).homeWidgets!.version,3);
  assert.equal((await service.getStore()).homeWidgets!.items.find(i=>i.id==='audience')!.enabled,false);
  snapshot=structuredClone(beforeLegacyLayout);snapshot.homeWidgets=previousV2;
  assert.equal((await request('/api/home-widgets','PUT',previousV2,'admin-fixture')).status,200);
  assert.equal((await service.getStore()).homeWidgets!.version,3);
  assert.equal((await service.getStore()).homeWidgets!.items.find(i=>i.id==='top-form')!.enabled,false);
  assert.deepEqual((await service.getStore()).merchants,(upgradeSnapshot(beforeLegacyLayout) as typeof snapshot).merchants);
  assert.deepEqual((await service.getStore()).regions,(upgradeSnapshot(beforeLegacyLayout) as typeof snapshot).regions);
  snapshot=beforeLegacyLayout;
  const beforeWidgets=structuredClone(await service.getStore());const rawBeforeWidgets=structuredClone(snapshot);
  assert.ok(validHomeWidgets(DEFAULT_HOME_WIDGETS));
  assert.deepEqual(homeWidgetLayout(undefined),DEFAULT_HOME_WIDGETS);
  assert.deepEqual(homeWidgetLayout({version:99,items:[]}),DEFAULT_HOME_WIDGETS);
  assert.ok(!validHomeWidgets({...DEFAULT_HOME_WIDGETS,items:[...DEFAULT_HOME_WIDGETS.items.slice(1),DEFAULT_HOME_WIDGETS.items[1]]}));
  assert.ok(!validHomeWidgets({...DEFAULT_HOME_WIDGETS,items:DEFAULT_HOME_WIDGETS.items.map((i,n)=>n===0?{...i,id:'private-inbox'}:i)}));
  assert.ok(!validHomeWidgets({...DEFAULT_HOME_WIDGETS,items:DEFAULT_HOME_WIDGETS.items.map(i=>({...i,order:1}))}));
  assert.equal((await request('/api/home-widgets','PUT',DEFAULT_HOME_WIDGETS)).status,401);
  assert.equal((await request('/api/home-widgets','PUT',DEFAULT_HOME_WIDGETS,'member-two')).status,403);
  assert.equal((await request('/api/home-widgets','PUT',{version:1,revision:0,items:[]},'admin-fixture')).status,400);
  const hiddenLayout={...structuredClone(DEFAULT_HOME_WIDGETS),items:DEFAULT_HOME_WIDGETS.items.map(i=>i.id==='latest-index'?{...i,enabled:false}:i)};
  assert.equal((await request('/api/home-widgets','PUT',hiddenLayout,'admin-fixture')).status,200);
  assert.equal((await service.getStore()).homeWidgets!.revision,1);
  assert.equal(publicStore(await service.getStore()).homeWidgets!.items.find(i=>i.id==='latest-index')!.enabled,false);
  assert.equal((await request('/api/home-widgets','PUT',hiddenLayout,'admin-fixture')).status,409);
  assert.deepEqual((await service.getStore()).insightPosts,beforeWidgets.insightPosts);
  assert.deepEqual((await service.getStore()).paketindexArchive,beforeWidgets.paketindexArchive);
  assert.deepEqual((await service.getStore()).merchants,beforeWidgets.merchants);
  assert.ok(validateSnapshot(await service.getStore()));
  assert.ok(!validateSnapshot({...beforeWidgets,homeWidgets:{version:55}}));
  assert.equal((await request('/api/home-widgets','PUT',{...DEFAULT_HOME_WIDGETS,revision:1},'admin-fixture')).status,200);
  const fakeWidgetNodes={audience:createElement('span',null,'Audience fixture'),'latest-index':createElement('span',null,'Latest fixture'),'index-archive':createElement('span',null,'Archive fixture')};
  const defaultZone=renderToString(createElement(HomeWidgetZone,{layout:undefined,zone:'top',widgets:fakeWidgetNodes}));
  assert.equal(defaultZone,renderToString(createElement(HomeWidgetZone,{layout:DEFAULT_HOME_WIDGETS,zone:'top',widgets:fakeWidgetNodes})));
  assert.ok(defaultZone.indexOf('Audience fixture')<defaultZone.indexOf('Latest fixture')&&defaultZone.indexOf('Latest fixture')<defaultZone.indexOf('Archive fixture'));
  const hiddenZone=renderToString(createElement(HomeWidgetZone,{layout:hiddenLayout,zone:'top',widgets:fakeWidgetNodes}));
  assert.ok(!hiddenZone.includes('Latest fixture')&&hiddenZone.includes('Archive fixture'));
  assert.equal(widgetsInZone({version:'bad'},'top').length,3);
  const reversed={...structuredClone(DEFAULT_HOME_WIDGETS),items:DEFAULT_HOME_WIDGETS.items.map(i=>({...i,order:DEFAULT_HOME_WIDGETS.items.length-1-i.order}))};
  assert.ok(widgetsInZone(reversed,'top')[0].id==='index-archive');
  const widgetBlogPosts=[{...INITIAL_INSIGHT_POSTS[0],id:'insight-blog-visible',title:'Visible blog fixture'},
    {...INITIAL_INSIGHT_POSTS[0],id:'insight-blog-draft',status:'draft' as const,title:'Secret draft title'},
    {...INITIAL_INSIGHT_POSTS[0],id:'insight-blog-scheduled',publishAt:'2099-01-01T00:00:00.000Z',title:'Secret scheduled title'},
    {...INITIAL_INSIGHT_POSTS[0],id:'insight-blog-trash',trashedAt:new Date().toISOString(),title:'Secret trash title'}];
  const blogHtml=renderToString(createElement(BlogView,{posts:widgetBlogPosts,onNavigate:()=>{}}));
  assert.ok(blogHtml.includes('Visible blog fixture')&&blogHtml.includes('#blogg/insight-blog-visible'));
  for(const t of ['Secret draft title','Secret scheduled title','Secret trash title'])assert.ok(!blogHtml.includes(t));
  assert.deepEqual(widgetBlogPosts[0].title,'Visible blog fixture');
  snapshot=rawBeforeWidgets;
  const beforeCommerce=structuredClone(await service.getStore());
  const restoreCommerce=structuredClone(snapshot);
  assert.ok(validGuide(INITIAL_START_GUIDE));
  assert.equal(INITIAL_START_GUIDE.length,10);
  assert.deepEqual((upgradeSnapshot({...beforeCommerce,startGuide:[],saleListings:[]}) as typeof snapshot).startGuide,[],'Empty guide must not resurrect seed chapters');
  const chapter={...INITIAL_START_GUIDE[0],title:'Fixture guide',body:'First\n\n- Item <script>bad</script>'};
  assert.equal((await request(`/api/start-guide/${chapter.id}`,'PUT',chapter)).status,401);
  assert.equal((await request(`/api/start-guide/${chapter.id}`,'PUT',chapter,'member-two')).status,403);
  assert.equal((await request(`/api/start-guide/${chapter.id}`,'PUT',{...chapter,sourceUrl:'javascript:bad'},'admin-fixture')).status,400);
  assert.equal((await request(`/api/start-guide/${chapter.id}`,'PUT',chapter,'admin-fixture')).status,200);
  assert.equal((await service.getStore()).startGuide?.find(c=>c.id===chapter.id)?.title,'Fixture guide');
  assert.equal((await request(`/api/start-guide/${chapter.id}`,'PUT',{...chapter,status:'draft'},'admin-fixture')).status,200);
  assert.ok(!publicStore(await service.getStore()).startGuide?.some(c=>c.id===chapter.id));
  const guideHtml=renderToString(createElement(StartGuideView,{chapters:INITIAL_START_GUIDE,onNavigate:()=>{}}));
  assert.ok(guideHtml.includes('guide-plattform')&&guideHtml.includes('guide-checkout')&&guideHtml.includes('guide-returer'));
  assert.ok(!validChapter({...chapter,reviewedDate:'2026-02-30'}));
  const saleInput={requestId:'sale-fixture',title:'Fixture butik',category:'webshop',description:'Säljarens beskrivning',included:'Domän och sortiment, inga kundregister',location:'Göteborg',priceLabel:'Pris på förfrågan',quantity:'',condition:'',sellerName:'Private seller',authorityConfirmed:true,publicContentConfirmed:true,
    status:'published',sellerUid:'forged',sellerEmail:'forged@example.invalid',reviewedBy:'forged',internalNotes:'forged'};
  assert.equal((await request('/api/sales/submissions','POST',saleInput)).status,401);
  assert.equal((await request('/api/sales/submissions','POST',saleInput,'unverified-fixture')).status,403);
  assert.equal((await request('/api/sales/submissions','POST',{...saleInput,authorityConfirmed:false},'member-two')).status,400);
  assert.equal((await request('/api/sales/submissions','POST',{...saleInput,category:'stock'},'member-two')).status,400);
  const saleSubmit=await request('/api/sales/submissions','POST',saleInput,'member-two');assert.equal(saleSubmit.status,201);
  const saleResult=await saleSubmit.json();assert.equal(saleResult.status,'pending');
  assert.ok(!publicStore(await service.getStore()).publicSaleListings?.some(r=>r.id===saleResult.id));
  let savedSale=(await service.getStore()).saleListings!.find(r=>r.id===saleResult.id)!;
  assert.equal(savedSale.sellerUid,'fixture-user-two');assert.equal(savedSale.sellerEmail,'two@example.invalid');assert.equal(savedSale.internalNotes,'');
  assert.equal(savedSale.reviewedBy,'');assert.ok(validSaleListings([savedSale]));
  await request('/api/sales/submissions','POST',saleInput,'member-two');
  assert.equal((await service.getStore()).saleListings!.filter(r=>r.id===saleResult.id).length,1,'Retry must not create a duplicate');
  assert.equal((await request('/api/sales/submissions','POST',saleInput,'admin-fixture')).status,409);
  const decision={...saleInput,status:'published',availability:'available',internalNotes:'Private moderation',reviewConfirmed:true};
  assert.equal((await request(`/api/sales/${saleResult.id}`,'PUT',decision,'member-two')).status,403);
  assert.equal((await request(`/api/sales/${saleResult.id}`,'PUT',{...decision,reviewConfirmed:false},'admin-fixture')).status,400);
  assert.equal((await request(`/api/sales/${saleResult.id}`,'PUT',decision,'admin-fixture')).status,200);
  savedSale=(await service.getStore()).saleListings![0];
  const salePublic=publicStore(await service.getStore());
  assert.equal(salePublic.saleListings,undefined);assert.equal(salePublic.publicSaleListings?.length,1);
  const publicJson=JSON.stringify(salePublic.publicSaleListings);
  for(const secret of ['two@example.invalid','fixture-user-two','Private seller','Private moderation','reviewedBy','sellerUid'])assert.ok(!publicJson.includes(secret));
  const saleBootstrap=await (await request('/api/cms/store')).json();
  assert.equal(saleBootstrap.saleListings,undefined);assert.equal(saleBootstrap.publicSaleListings.length,1);
  assert.ok(!JSON.stringify(saleBootstrap).includes('Private moderation'));
  assert.equal(savedSale.reviewedBy,'fixture-user');assert.equal(savedSale.sellerEmail,'two@example.invalid','Reviewer cannot overwrite seller identity');
  const saleHtml=renderToString(createElement(FirebaseProvider,null,createElement(MarketplaceView,{listings:salePublic.publicSaleListings!})));
  assert.ok(saleHtml.includes('Fixture butik')&&!saleHtml.includes('Private moderation'));
  const inquiry={name:'Buyer',message:'Private buyer message',requestId:'inq-fixture',email:'forged@example.invalid',preferredRouting:'direct-partner'};
  assert.equal((await request(`/api/sales/${saleResult.id}/inquiries`,'POST',inquiry)).status,401);
  assert.equal((await request(`/api/sales/${saleResult.id}/inquiries`,'POST',inquiry,'unverified-fixture')).status,403);
  assert.equal((await request(`/api/sales/${saleResult.id}/inquiries`,'POST',inquiry,'admin-fixture')).status,200);
  assert.equal((await request(`/api/sales/${saleResult.id}/inquiries`,'POST',inquiry,'admin-fixture')).status,200);
  const contacts=(await service.getStore()).contactMessages.filter(m=>m.id==='inq-fixture');assert.equal(contacts.length,1);
  assert.equal(contacts[0].email,'fixture@example.invalid');assert.equal(contacts[0].routingMode,'self');assert.equal(contacts[0].status,'new');
  assert.ok(!JSON.stringify(publicStore(await service.getStore())).includes('Private buyer message'));
  assert.equal((await request(`/api/sales/${saleResult.id}/inquiries`,'POST',inquiry,'member-two')).status,409);
  assert.equal((await request(`/api/sales/${saleResult.id}`,'PUT',{...decision,availability:'sold'},'admin-fixture')).status,200);
  assert.equal((await request(`/api/sales/${saleResult.id}/inquiries`,'POST',{...inquiry,requestId:'inq-sold'},'admin-fixture')).status,404);
  assert.equal((await request(`/api/sales/${saleResult.id}`,'PUT',{...decision,status:'draft'},'admin-fixture')).status,200);
  assert.equal(publicStore(await service.getStore()).publicSaleListings!.length,0);
  assert.equal((await request(`/api/sales/${saleResult.id}/inquiries`,'POST',{...inquiry,requestId:'inq-draft'},'admin-fixture')).status,404);
  const currentCommerce=await service.getStore();
  assert.deepEqual(currentCommerce.merchants,beforeCommerce.merchants);assert.deepEqual(currentCommerce.paketindexArchive,beforeCommerce.paketindexArchive);
  assert.ok(validateSnapshot(currentCommerce));
  assert.ok(!validateSnapshot({...currentCommerce,saleListings:[savedSale,savedSale]}));
  const priorGovernance=currentCommerce.memberGovernance;
  snapshot.memberGovernance={...(priorGovernance||emptyGovernance()),blocks:[{uid:'fixture-user-two',reason:'test',createdAt:new Date().toISOString()}]};
  assert.equal((await request('/api/sales/submissions','POST',{...saleInput,requestId:'sale-blocked'},'member-two')).status,403);
  snapshot=structuredClone(currentCommerce);
  for(let n=1;n<=3;n++)assert.equal((await request('/api/sales/submissions','POST',{...saleInput,requestId:`sale-pending-${n}`},'member-two')).status,201);
  const beforeLimit=structuredClone(snapshot);
  assert.equal((await request('/api/sales/submissions','POST',{...saleInput,requestId:'sale-pending-four'},'member-two')).status,429);
  assert.deepEqual(snapshot,beforeLimit,'Rejected submission cannot write partial changes');
  snapshot=structuredClone(currentCommerce);
  snapshot.saleListings=Array.from({length:80},(_,n)=>({...savedSale,id:`sale-full-${n}`,status:'rejected' as const}));
  const beforeFull=structuredClone(snapshot);
  assert.equal((await request('/api/sales/submissions','POST',{...saleInput,requestId:'sale-over-full'},'member-two')).status,413);
  assert.deepEqual(snapshot,beforeFull,'Full register must not evict historical listings');
  snapshot=structuredClone(currentCommerce);snapshot.saleListings=[savedSale];
  snapshot.contactMessages=Array.from({length:300},(_,n)=>({...contacts[0],id:`msg-full-${n}`,authorUid:'other-user'}));
  const beforeInboxFull=structuredClone(snapshot);
  assert.equal((await request(`/api/sales/${savedSale.id}/inquiries`,'POST',{...inquiry,requestId:'inq-full'},'admin-fixture')).status,413);
  assert.deepEqual(snapshot,beforeInboxFull,'New inquiry must not evict existing contacts');
  snapshot=structuredClone(currentCommerce);snapshot.saleListings=[savedSale];
  snapshot.contactMessages=Array.from({length:10},(_,n)=>({...contacts[0],id:`inq-rate-${n}`}));
  assert.equal((await request(`/api/sales/${savedSale.id}/inquiries`,'POST',{...inquiry,requestId:'inq-rate-over'},'admin-fixture')).status,429);
  snapshot=structuredClone(currentCommerce);
  const cmsDraft={...saleInput,requestId:'sale-cms-draft',intent:'buy',sellerName:'Private representative',sellerEmail:' Contact@Business.SE ',status:'draft',internalNotes:'CMS-private note',reviewConfirmed:false,origin:'forged',createdByUid:'forged'};
  assert.equal((await request('/api/sales','POST',cmsDraft)).status,401);
  assert.equal((await request('/api/sales','POST',cmsDraft,'member-two')).status,403);
  assert.equal((await request('/api/sales','POST',cmsDraft,'unverified-fixture')).status,403);
  assert.equal((await request('/api/sales','POST',{...cmsDraft,sellerEmail:'bad'},'admin-fixture')).status,400);
  assert.equal((await request('/api/sales','POST',{...cmsDraft,authorityConfirmed:false},'admin-fixture')).status,400);
  assert.equal((await request('/api/sales','POST',{...cmsDraft,status:'published'},'admin-fixture')).status,400);
  const createdCmsDraft=await request('/api/sales','POST',cmsDraft,'admin-fixture');assert.equal(createdCmsDraft.status,201);
  assert.equal((await createdCmsDraft.json()).status,'draft');
  let cmsRow=(await service.getStore()).saleListings!.find(r=>r.id==='sale-cms-draft')!;
  assert.equal(cmsRow.intent,'buy');assert.equal(cmsRow.sellerUid,'');assert.equal(cmsRow.origin,'cms');assert.equal(cmsRow.createdByUid,'fixture-user');
  assert.equal(cmsRow.sellerEmail,'contact@business.se');assert.equal(cmsRow.reviewedBy,'');
  assert.ok(validSaleListings([cmsRow]));assert.ok(validateSnapshot(await service.getStore()));
  assert.ok(!publicStore(await service.getStore()).publicSaleListings!.some(r=>r.id===cmsRow.id));
  assert.equal((await request('/api/sales','POST',{...cmsDraft,status:'published',reviewConfirmed:true},'admin-fixture')).status,201);
  assert.equal((await service.getStore()).saleListings!.find(r=>r.id===cmsRow.id)!.status,'draft','Retry cannot turn the saved draft into published');
  assert.equal((await service.getStore()).saleListings!.filter(r=>r.id===cmsRow.id).length,1);
  assert.equal((await request('/api/sales','POST',cmsDraft,'governance-admin')).status,409);
  assert.equal((await request('/api/sales/submissions','POST',cmsDraft,'admin-fixture')).status,409,'Member route cannot claim CMS-created record');
  assert.equal((await request('/api/sales','POST',{...cmsDraft,requestId:saleResult.id},'admin-fixture')).status,409,'CMS creation cannot overwrite an existing seller proposal');
  assert.equal((await request(`/api/sales/${cmsRow.id}`,'PUT',{...decision,intent:'buy'},'admin-fixture')).status,200);
  cmsRow=(await service.getStore()).saleListings!.find(r=>r.id===cmsRow.id)!;
  assert.equal(cmsRow.sellerUid,'');assert.equal(cmsRow.createdByUid,'fixture-user');assert.equal(cmsRow.sellerEmail,'contact@business.se');
  const cmsPublic=publicStore(await service.getStore()).publicSaleListings!.find(r=>r.id===cmsRow.id)!;
  assert.equal(cmsPublic.intent,'buy');
  for(const privateField of ['sellerEmail','sellerUid','sellerName','createdByUid','origin','internalNotes'])assert.ok(!(privateField in cmsPublic));
  assert.equal(publicSaleListing({...savedSale,intent:undefined}).intent,'sell','Old ads remain selling listings');
  assert.equal((await request('/api/sales','POST',{...cmsDraft,requestId:'sale-cms-published',status:'published',reviewConfirmed:true,intent:'sell'},'admin-fixture')).status,201);
  const publishedCms=(await service.getStore()).saleListings!.find(r=>r.id==='sale-cms-published')!;
  assert.equal(publishedCms.status,'published');assert.equal(publishedCms.reviewedBy,'fixture-user');assert.ok(publishedCms.reviewedAt);
  const cmsFormHtml=renderToString(createElement(CreateCmsSaleForm,{onCreated:async()=>{}}));
  assert.ok(cmsFormHtml.includes('Skapa köp- eller säljannons i CMS')&&cmsFormHtml.includes('Annonsörens e-post'));
  assert.ok(cmsFormHtml.includes('Utkast – inte offentligt')&&cmsFormHtml.includes('Köpes'));
  const beforeCmsFull=structuredClone(snapshot);
  snapshot.saleListings=Array.from({length:80},(_,n)=>({...savedSale,id:`sale-admin-full-${n}`}));
  const fullCmsSnapshot=structuredClone(snapshot);
  assert.equal((await request('/api/sales','POST',{...cmsDraft,requestId:'sale-cms-full'},'admin-fixture')).status,413);
  assert.deepEqual(snapshot,fullCmsSnapshot);
  snapshot=beforeCmsFull;
  snapshot.memberGovernance={...emptyGovernance(),blocks:[{uid:'fixture-user',reason:'test',createdAt:new Date().toISOString()}]};
  assert.equal((await request('/api/sales','POST',{...cmsDraft,requestId:'sale-admin-blocked'},'admin-fixture')).status,403);
  snapshot=structuredClone(currentCommerce);snapshot.saleListings=[{...savedSale,revision:0}];snapshot.editorialHistory=[];
  const lifeNow='2026-11-22T20:00:00.000Z';
  assert.ok(publiclyVisible({...savedSale,status:'published'},lifeNow));
  assert.ok(!publiclyVisible({...savedSale,status:'published',publishAt:'2026-11-23T00:00:00.000Z'},lifeNow));
  assert.ok(!publiclyVisible({...savedSale,status:'published',expiresAt:lifeNow},lifeNow));
  assert.ok(!publiclyVisible({...savedSale,status:'published',trashedAt:lifeNow},lifeNow));
  assert.ok(!validLifecycle({publishAt:'bad'}));assert.ok(!validLifecycle({publishAt:lifeNow,expiresAt:lifeNow}));
  const edit={...decision,revision:0,title:'New revision title'};
  assert.equal((await request(`/api/sales/${savedSale.id}`,'PUT',edit,'admin-fixture')).status,200);
  const firstHistory=(await service.getStore()).editorialHistory![0];assert.equal(firstHistory.before.title,savedSale.title);
  assert.equal((await request(`/api/sales/${savedSale.id}`,'PUT',edit,'admin-fixture')).status,409);
  assert.equal((await service.getStore()).saleListings![0].title,'New revision title');
  const stateUrl=`/api/editorial/sale/${savedSale.id}`;
  assert.equal((await request(stateUrl,'POST',{revision:1,action:'trash'},'member-two')).status,403);
  assert.equal((await request(stateUrl,'POST',{revision:1,action:'trash'},'admin-fixture')).status,200);
  assert.ok((await service.getStore()).saleListings![0].trashedAt);
  assert.equal(publicStore(await service.getStore()).publicSaleListings!.length,0);
  assert.equal((await request(stateUrl,'POST',{revision:1,action:'untrash'},'admin-fixture')).status,409);
  assert.equal((await request(stateUrl,'POST',{revision:2,action:'untrash'},'admin-fixture')).status,200);
  assert.equal((await service.getStore()).saleListings![0].status,'draft');
  assert.equal((await request(stateUrl,'POST',{revision:3,action:'restore',versionId:firstHistory.id},'admin-fixture')).status,200);
  const restoredSale=(await service.getStore()).saleListings![0];assert.equal(restoredSale.title,savedSale.title);assert.equal(restoredSale.status,'draft');assert.equal(restoredSale.revision,4);assert.equal(restoredSale.sellerUid,savedSale.sellerUid);
  assert.equal(restoredSale.publishAt,'');assert.equal(restoredSale.expiresAt,'');
  const privateVersionJson=JSON.stringify(publicStore(await service.getStore()));assert.ok(!privateVersionJson.includes(firstHistory.id));
  assert.equal(publicStore(await service.getStore()).editorialHistory,undefined);
  const future={...decision,revision:4,publishAt:'2099-01-01T00:00:00.000Z',expiresAt:'2099-02-01T00:00:00.000Z'};
  assert.equal((await request(`/api/sales/${savedSale.id}`,'PUT',future,'admin-fixture')).status,200);
  assert.equal(publicStore(await service.getStore()).publicSaleListings!.length,0);
  assert.equal((await request(`/api/sales/${savedSale.id}/inquiries`,'POST',{...inquiry,requestId:'inq-future'},'member-two')).status,404);
  const nowRow=(await service.getStore()).saleListings![0];
  assert.equal((await request(`/api/sales/${savedSale.id}`,'PUT',{...decision,revision:nowRow.revision,expiresAt:'2020-01-01T00:00:00.000Z'},'admin-fixture')).status,200);
  assert.equal(publicStore(await service.getStore()).publicSaleListings!.length,0);
  // Gallery uses existing server-validated upload; tests never contact Storage.
  featureMedia=true;
  const tinyImage=(await sharp({create:{width:2,height:2,channels:3,background:'white'}}).png().toBuffer()).toString('base64');
  const galleryRev=(await service.getStore()).saleListings![0].revision!;
  assert.equal((await request('/api/media/image','POST',{targetType:'sale',targetId:savedSale.id,data:tinyImage,alt:'Product',revision:galleryRev},'admin-fixture')).status,200);
  const galleryRow=(await service.getStore()).saleListings![0];assert.deepEqual(galleryRow.images,[fixtureImage]);
  assert.equal((await request(`/api/sales/${savedSale.id}/gallery`,'PUT',{revision:galleryRow.revision,paths:['not-owned']},'admin-fixture')).status,400);
  assert.equal((await request(`/api/sales/${savedSale.id}/gallery`,'PUT',{revision:galleryRow.revision,paths:[]},'admin-fixture')).status,200);
  assert.equal((await service.getStore()).saleListings![0].images!.length,0);
  assert.equal((await request(`/api/sales/${savedSale.id}/gallery`,'PUT',{revision:galleryRow.revision,paths:[]},'admin-fixture')).status,409);
  featureMedia=false;uploads=0;
  // Case assignment grants no access. Only CMS-admin may read/write the workflow.
  snapshot.contactMessages=[contacts[0]];snapshot.saleCases=[];
  snapshot.staffProfiles=[{uid:'fixture-staff',email:'staff@example.invalid',name:'Staff',phone:'',position:'Support',company:'Fixture',employmentSince:'',expertise:'',photoUrl:'',updatedAt:new Date().toISOString()}];
  const caseInput={revision:0,assignedUid:'fixture-staff',state:'working',dueDate:'2026-12-01',note:'Private followup'};
  assert.equal((await request('/api/sale-cases/inq-fixture','PUT',caseInput,'member-two')).status,403);
  assert.equal((await request('/api/sale-cases/inq-fixture','PUT',{...caseInput,assignedUid:'not-registered'},'admin-fixture')).status,400);
  assert.equal((await request('/api/sale-cases/inq-fixture','PUT',caseInput,'admin-fixture')).status,200);
  assert.equal((await request('/api/sale-cases/inq-fixture','PUT',caseInput,'admin-fixture')).status,409);
  assert.equal(publicStore(await service.getStore()).saleCases,undefined);
  assert.ok(!JSON.stringify(publicStore(await service.getStore())).includes('Private followup'));
  assert.ok(validateSnapshot(await service.getStore()));
  // Guide and insight use the same scheduling/conflict/history contract, not just sale rows.
  const lifeGuide={...INITIAL_START_GUIDE[0],publishAt:'2099-01-01T00:00:00.000Z',revision:snapshot.startGuide?.find(c=>c.id===INITIAL_START_GUIDE[0].id)?.revision??0};
  assert.equal((await request(`/api/start-guide/${lifeGuide.id}`,'PUT',lifeGuide,'admin-fixture')).status,200);
  assert.equal((await request(`/api/start-guide/${lifeGuide.id}`,'PUT',lifeGuide,'admin-fixture')).status,409);
  assert.ok(!publicStore(await service.getStore()).startGuide!.some(c=>c.id===lifeGuide.id));
  const lifePost={...INITIAL_INSIGHT_POSTS[0],publishAt:'2099-01-01T00:00:00.000Z',revision:snapshot.insightPosts?.find(c=>c.id===INITIAL_INSIGHT_POSTS[0].id)?.revision??0};
  assert.equal((await request(`/api/insights/${lifePost.id}`,'PUT',lifePost,'admin-fixture')).status,200);
  assert.equal((await request(`/api/insights/${lifePost.id}`,'PUT',lifePost,'admin-fixture')).status,409);
  assert.ok(!publicStore(await service.getStore()).insightPosts!.some(c=>c.id===lifePost.id));
  assert.ok(validateSnapshot(await service.getStore()));
  assert.ok(!validateSnapshot({...snapshot,editorialHistory:[{...firstHistory,kind:'unknown'}]}));
  assert.ok(!validSaleListings([{...savedSale,images:[fixtureImage,fixtureImage]}]));
  // Full history rejects rather than truncating previously saved versions.
  snapshot.editorialHistory=Array.from({length:120},(_,n)=>({...firstHistory,id:`history-${n}`}));
  const beforeHistoryFull=structuredClone(snapshot);
  assert.equal((await request(stateUrl,'POST',{action:'trash',revision:snapshot.saleListings![0].revision},'admin-fixture')).status,413);
  assert.deepEqual(snapshot,beforeHistoryFull);
  const groupIds=CMS_GROUPS.flatMap(g=>g.sections);assert.equal(new Set(groupIds).size,21);
  assert.equal(groupIds.length,21);
  const cmsNavHtml=renderToString(createElement(CmsNavigation,{items:groupIds.map(id=>({id,label:id})),active:'commerce',onSelect:()=>{}}));
  assert.ok(cmsNavHtml.includes('Affärer &amp; möjligheter')&&cmsNavHtml.includes('aria-current="page"'));
  assert.ok(cmsNavHtml.includes('Snabbval i CMS')&&cmsNavHtml.includes('company-pages')&&cmsNavHtml.includes('members')&&cmsNavHtml.includes('widgets'));
  const companyMenu=renderToString(createElement(CmsNavigation,{items:[{id:'company-pages',label:'Företagssidor'},{id:'members',label:'Medlemmar & Community'},{id:'collaboration',label:'Roller & redaktion'}],active:'company-pages',onSelect:()=>{}}));
  assert.ok(companyMenu.includes('Företagssidor')&&companyMenu.includes('Medlemmar &amp; Community')&&companyMenu.includes('aria-current="page"'));

  snapshot=restoreCommerce;
  const rawBeforeAbout=structuredClone(snapshot);
  const beforeAbout=structuredClone(await service.getStore());
  const aboutPatch={kicker:'Om oss',title:'Vår mötesplats',subtitle:'En testad text',body:'Första stycket\n\nAndra stycket'};
  assert.equal((await request('/api/pages','PUT',{om:aboutPatch})).status,401);
  assert.equal((await request('/api/pages','PUT',{om:aboutPatch},'member-two')).status,403);
  const aboutSave=await request('/api/pages','PUT',{om:aboutPatch},'admin-fixture');
  assert.equal(aboutSave.status,200);
  assert.deepEqual((await service.getStore()).pageContent.om,aboutPatch);
  assert.deepEqual(publicStore(await service.getStore()).pageContent.om,aboutPatch);
  assert.deepEqual(snapshot.merchants,beforeAbout.merchants);
  assert.deepEqual(snapshot.paketindexArchive,beforeAbout.paketindexArchive);
  assert.deepEqual(snapshot.pageContent.marknad,beforeAbout.pageContent.marknad);
  snapshot=rawBeforeAbout;
  const sourceRows=structuredClone(REVIEWED_PAKETINDEX);
  assert.ok(validArchive(sourceRows));
  assert.equal(latestQuarter(sourceRows)?.period,'2026-Q3');
  assert.ok(Math.abs(latestPaketindex([]).result!.growthPct!-7.8)<0.02);
  const futurePublished={...sourceRows[1],edition:'non-sortable-edition',period:'2026-Q4',value:80_000_000,publishedDate:'2027-02-01'};
  assert.equal(latestQuarter([...sourceRows,{...futurePublished,status:'draft'}])?.period,'2026-Q3');
  assert.equal(latestQuarter([...sourceRows,{...futurePublished,period:'2026-YTD-Q3'}])?.period,'2026-Q3');
  assert.equal(latestQuarter([...sourceRows,{...futurePublished,period:'2026'}])?.period,'2026-Q3');
  assert.equal(latestQuarter([...sourceRows,{...futurePublished,basis:'survey',sampleSize:829}])?.period,'2026-Q3');
  assert.equal(latestQuarter([...sourceRows,{...futurePublished,basis:'legacy'}])?.period,'2026-Q3');
  assert.equal(latestPaketindex([futurePublished]).row.period,'2026-Q4');
  assert.equal(latestPaketindex([futurePublished]).reference,false);
  assert.equal(latestPaketindex([futurePublished]).result,null,'Never mix report editions');
  const revised={...sourceRows[1],edition:'aaa-revision',publishedDate:'2026-11-11',value:67_555_000};
  assert.equal(latestQuarter([...sourceRows,revised])?.edition,'aaa-revision');
  assert.equal(latestPaketindex([revised]).row.value,67_555_000);
  assert.deepEqual(sourceRows,REVIEWED_PAKETINDEX,'Selection never mutates or deletes saved rows');
  assert.equal(latestQuarter([]),undefined);
  const navIds=NAV_GROUPS.flatMap(g=>g.items.map(i=>i.id));
  assert.equal(new Set(navIds).size,14);
  assert.deepEqual([...navIds].sort(),['marknad','nyheter','event','historia','ehandlare','partners','3pl','jobb','community','kontakt','om','starta','kop-salj','blogg'].sort());
  const navHtml=renderToString(createElement(GroupedNavigation,{activeTab:'om',onSelect:()=>{}}));
  assert.equal((navHtml.match(/<summary/g)||[]).length,4);
  assert.ok(navHtml.includes('href="#om" aria-current="page"'));
  const aboutHtml=renderToString(createElement(AboutView,{copy:{kicker:'Om',title:'Egen rubrik',subtitle:'Ingress',body:'Stycke ett\n\nStycke två <script>bad</script>'},onNavigate:()=>{}}));
  assert.ok(aboutHtml.includes('Egen rubrik')&&aboutHtml.includes('Stycke ett'));
  assert.ok(!aboutHtml.includes('<script>'));
  const latestHtml=renderToString(createElement(LatestPaketindex,{rows:[]}));
  assert.ok(latestHtml.includes('2026-Q3')&&latestHtml.includes('67')&&latestHtml.includes('Källgranskad läsreferens'));
  assert.equal(normalizeLoginEmail(' Person@Company.SE '),'person@company.se');
  assert.throws(()=>normalizeLoginEmail('bad-address'));assert.throws(()=>normalizeLoginEmail('x'.repeat(170)+'@mail.se'));
  assert.equal(emailLinkReturnUrl('https://sverigesehandel.se/?email=private@example.invalid&returnTo=https://evil.invalid'),'https://sverigesehandel.se/');
  assert.throws(()=>emailLinkReturnUrl('http://sverigesehandel.se'));
  assert.throws(()=>emailLinkReturnUrl('https://user:pass@sverigesehandel.se'));
  assert.deepEqual(authProviderOptions({}),{email:true,facebook:false,linkedin:''});
  assert.deepEqual(authProviderOptions({VITE_FIREBASE_EMAIL_LINK_ENABLED:'false',VITE_FIREBASE_FACEBOOK_ENABLED:'true',VITE_FIREBASE_LINKEDIN_PROVIDER_ID:'oidc.linkedin'}),{email:false,facebook:true,linkedin:'oidc.linkedin'});
  assert.equal(authProviderOptions({VITE_FIREBASE_LINKEDIN_PROVIDER_ID:'google.com'}).linkedin,'');
  const emailRequests:Array<{email:string;settings:{url:string;handleCodeInApp:true}}>=[];
  await requestEmailLogin(' staff@company.se ','https://sverigesehandel.se/path?returnTo=https://evil.invalid',async(email,settings)=>{emailRequests.push({email,settings});});
  assert.deepEqual(emailRequests,[{email:'staff@company.se',settings:{url:'https://sverigesehandel.se/',handleCodeInApp:true}}]);
  await assert.rejects(requestEmailLogin('bad','https://sverigesehandel.se',async()=>{throw Error('Must not call');}));
  let emailCompletions=0;
  const emailResult=await completeEmailLogin(' staff@company.se ','https://sverigesehandel.se/?mode=signIn&oobCode=fixture',async(email,link)=>{
    emailCompletions++;assert.equal(email,'staff@company.se');assert.ok(link.includes('oobCode=fixture'));return {uid:'existing-mail-fixture',emailVerified:true};
  });
  assert.equal(emailResult.uid,'existing-mail-fixture');assert.equal(emailCompletions,1);
  await assert.rejects(completeEmailLogin('staff@company.se',null,async()=>{emailCompletions++;}));assert.equal(emailCompletions,1);
  await assert.rejects(completeEmailLogin('wrong@company.se','fixture',async()=>{throw {code:'auth/invalid-action-code'};}));
  const callbackHref='https://sverigesehandel.se/?mode=signIn&oobCode=fixture&apiKey=public#community';
  assert.deepEqual(emailCallbackLocation(callbackHref,()=>true),{link:callbackHref,cleanPath:'/#community'});
  assert.equal(emailCallbackLocation(callbackHref,()=>false),null);
  assert.ok(!loginErrorMessage({code:'auth/invalid-action-code',message:'private-action-url'}).includes('private-action-url'));
  assert.ok(loginErrorMessage({code:'auth/account-exists-with-different-credential'}).includes('slås inte ihop automatiskt'));
  assert.ok(loginErrorMessage({code:'auth/operation-not-allowed'}).includes('inte aktiverat'));
  const dialogProps={busy:false,error:null,user:null,emailEnabled:true,facebookEnabled:false,linkedinEnabled:false,pendingEmailLink:false,
    onClose:()=>{},onGoogle:()=>{},onGoogleRedirect:()=>{},onSocial:()=>{},onEmail:async()=>true,onVerify:async()=>true,onReload:async()=>{},onDiscardLink:()=>{}};
  const loginDialogHtml=renderToString(createElement(SignInDialog,dialogProps));
  assert.ok(loginDialogHtml.includes('Fortsätt med Google')&&loginDialogHtml.includes('Registrera / logga in med e-postlänk'));
  assert.ok(!loginDialogHtml.includes('Fortsätt med Facebook')&&!loginDialogHtml.includes('Fortsätt med LinkedIn'));
  const socialDialogHtml=renderToString(createElement(SignInDialog,{...dialogProps,facebookEnabled:true,linkedinEnabled:true}));
  assert.ok(socialDialogHtml.includes('Fortsätt med Facebook')&&socialDialogHtml.includes('Fortsätt med LinkedIn'));
  const callbackDialogHtml=renderToString(createElement(SignInDialog,{...dialogProps,pendingEmailLink:true}));
  assert.ok(callbackDialogHtml.includes('Slutför e-postinloggning')&&callbackDialogHtml.includes('Verifiera adress och logga in'));
  assert.ok(!callbackDialogHtml.includes('Fortsätt med Google'));
  let totpResolves=0;const resolveTotp=async(uid:string,code:string)=>{totpResolves++;assert.equal(uid,'totp-id');assert.equal(code,'123456');return 'sdk-verified';};
  assert.equal(await completeTotpChallenge([{uid:'totp-id',factorId:'totp'}],'totp-id','123456',resolveTotp),'sdk-verified');
  await assert.rejects(completeTotpChallenge([{uid:'totp-id',factorId:'sms'}],'totp-id','123456',resolveTotp));
  await assert.rejects(completeTotpChallenge([{uid:'totp-id',factorId:'totp'}],'forged-id','123456',resolveTotp));
  await assert.rejects(completeTotpChallenge([{uid:'totp-id',factorId:'totp'}],'totp-id','abc',resolveTotp));assert.equal(totpResolves,1);
  await assert.rejects(completeTotpChallenge([{uid:'totp-id',factorId:'totp'}],'totp-id','123456',async()=>{throw new Error('SDK rejected code');}),/SDK rejected/);
  const mfaDialogHtml=renderToString(createElement(SignInDialog,{...dialogProps,mfa:{factors:[{uid:'totp-id',name:'My authenticator'}],onCancel:()=>{},onComplete:async()=>{}}}));
  assert.ok(mfaDialogHtml.includes('2FA-kod')&&mfaDialogHtml.includes('My authenticator'));assert.ok(!mfaDialogHtml.includes('Fortsätt med Google')&&!mfaDialogHtml.includes('Registrera / logga in med e-postlänk'));

  // Editorial regression checks: real API routes + transactional readback, no external fetches.
  const editorialSnapshot = structuredClone(snapshot);
  const validArticle = 'https://publisher.invalid/news/one-story';
  for (const value of ['', 'https://publisher.invalid', 'https://publisher.invalid/news',
    'https://publisher.invalid/category/retail', 'javascript:alert(1)',
    'https://user:password@publisher.invalid/news/story', 'http://127.0.0.1/article',
    'https://publisher.invalid/%zz']) assert.equal(articleUrl(value), null, value);
  assert.equal(articleUrl(validArticle + '#section'), validArticle);
  const newsInput = { title: 'Editorial fixture', summary: 'One actual story', sourceName: 'Publisher',
    sourceUrl: validArticle, publishedDate: '2026-01-01' };
  assert.equal((await request('/api/news', 'POST', { ...newsInput, status: 'published',
    linkReviewedAt: 'forged' }, 'admin-fixture')).status, 400, 'Client cannot forge approval metadata');
  assert.equal((await request('/api/news', 'POST', { ...newsInput, sourceUrl: 'https://publisher.invalid',
    status: 'published', confirmArticleLink: true }, 'admin-fixture')).status, 400);
  const approvedResponse = await request('/api/news', 'POST', { ...newsInput,
    status: 'published', confirmArticleLink: true }, 'admin-fixture');
  assert.equal(approvedResponse.status, 201);
  const approved = (await approvedResponse.json()).item;
  assert.ok(approved.linkReviewedAt);
  assert.equal(approved.sourceUrl, validArticle);
  assert.equal('confirmArticleLink' in approved, false);
  const publicNews = await (await request('/api/news')).json();
  assert.ok(publicNews.some((item: { id: string }) => item.id === approved.id));
  for (const patch of [{ title: 'Different story' }, { summary: 'Different content' },
    { sourceUrl: 'https://publisher.invalid/news/other-story' }, { publishedDate: '2026-02-01' }]) {
    assert.equal((await request(`/api/news/${approved.id}`, 'PUT', { ...newsInput,
      ...patch, status: 'published' }, 'admin-fixture')).status, 400, 'Changed story needs a new review');
  }
  const draftResponse = await request(`/api/news/${approved.id}`, 'PUT', { ...newsInput,
    sourceUrl: '', status: 'draft' }, 'admin-fixture');
  assert.equal(draftResponse.status, 200);
  assert.equal((await draftResponse.json()).item.linkReviewedAt, undefined);
  const batchResponse = await request('/api/news/batch', 'POST', { items: [
    { ...newsInput, title: 'No URL', sourceUrl: '', status: 'published', confirmArticleLink: true, linkReviewedAt: 'forged' },
    { ...newsInput, title: 'Has URL', status: 'published', confirmArticleLink: true },
  ] }, 'admin-fixture');
  assert.equal(batchResponse.status, 201);
  const importedNews = (await batchResponse.json()).added;
  assert.equal(importedNews.length, 2);
  assert.ok(importedNews.every((item: { status: string; linkReviewedAt?: string }) => item.status === 'draft' && !item.linkReviewedAt));
  assert.equal(importedNews[0].sourceUrl, '', 'Missing URL is not replaced by another story or homepage');
  assert.ok(!(await (await request('/api/news')).json()).some((item: { title: string }) => item.title === 'No URL'));
  const renderNews = (item: typeof approved) => renderToString(createElement(NewsView, {
    news: [item], adBanners: [], onNavigate: () => {}, onBookAdSlot: () => {},
    onRefresh: async () => {}, onNotify: () => {},
  }));
  for (const isAdmin of [false, true]) {
    const portalHtml = renderToString(createElement(NewsView, {
      news: [approved], adBanners: [], isAdmin, onNavigate: () => {}, onBookAdSlot: () => {},
      onRefresh: async () => {}, onNotify: () => {},
    }));
    assert.ok(!portalHtml.includes('Granska nyhetens direktlänk'), 'Portal must never render CMS review panel, even for admin');
    assert.ok(!portalHtml.includes('Godkänn direktlänk och publicera'));
    assert.ok(!portalHtml.includes('Originalartikelns direktlänk'));
  }
  const cmsReviewHtml = renderToString(createElement(NewsReviewPanel, {
    news: [approved], onRefresh: async () => {}, onNotify: () => {},
  }));
  assert.ok(cmsReviewHtml.includes('Granska nyhetens direktlänk'));
  assert.ok(cmsReviewHtml.includes('Godkänn direktlänk och publicera'));
  const approvedHtml = renderNews(approved);
  assert.equal(approvedHtml.split(`href="${validArticle}"`).length - 1, 2, 'Title and read-link share one approved URL');
  assert.ok(!renderNews({ ...approved, linkReviewedAt: undefined }).includes(`href="${validArticle}"`));
  assert.ok(!renderNews({ ...approved, sourceUrl: 'javascript:alert(1)' }).includes('href="javascript:'));

  const fullText = 'Första stycket.\n\nAndra stycket.\n- Analys\n- Samarbete\n\n<script>alert(1)</script>';
  const jobResponse = await request('/api/jobs', 'POST', { title: 'Job text fixture', company: 'Fixture',
    desc: fullText, summary: 'Kort ingress', applyUrl: 'https://publisher.invalid/jobs/one',
    expiresAt: '2099-01-01' }, 'admin-fixture');
  assert.equal(jobResponse.status, 201);
  const savedJob = await jobResponse.json();
  assert.equal(savedJob.desc, fullText);
  assert.equal(savedJob.summary, 'Kort ingress');
  const updatedJob = await request(`/api/jobs/${savedJob.id}`, 'PUT', { title: savedJob.title,
    company: savedJob.company, summary: 'Ny ingress', desc: fullText + '\nSista raden.' }, 'admin-fixture');
  assert.equal(updatedJob.status, 200);
  assert.equal((await updatedJob.json()).summary, 'Ny ingress');
  assert.equal((await request('/api/jobs', 'POST', { title: 'Too long', company: 'Fixture',
    summary: 'x'.repeat(241) }, 'admin-fixture')).status, 400);
  const jobHtml = renderToString(createElement(JobDescription, { job: savedJob }));
  assert.ok(jobHtml.includes('<details') && jobHtml.includes('<summary'));
  assert.ok(jobHtml.includes('Kort ingress') && jobHtml.includes('Läs hela tjänsten'));
  const descriptionHtml = renderToString(createElement(PlainTextDescription, { text: fullText }));
  assert.ok(descriptionHtml.includes('<li>Analys</li>') && descriptionHtml.includes('<li>Samarbete</li>'));
  assert.ok(descriptionHtml.includes('<p') && descriptionHtml.includes('&lt;script&gt;'));
  assert.ok(!descriptionHtml.includes('<script>'));
  assert.ok(jobSummary({ desc: 'ord '.repeat(100) }).length <= 240);
  assert.equal(jobSummary({ desc: 'Legacy text without summary' }), 'Legacy text without summary');
  assert.equal((await service.getStore()).jobs.find((item) => item.id === savedJob.id)?.desc, fullText + '\nSista raden.');
  const filterJob = { ...savedJob, city: 'Göteborg', workModel: 'Hybrid', roleCategory: 'Tech & Utveckling' };
  const filters = { search: '', city: '', role: 'all', workModel: 'all' };
  assert.ok(matchesJob(filterJob, { ...filters, city: '  göte ', workModel: 'Hybrid', role: 'Tech & Utveckling' }));
  assert.ok(!matchesJob(filterJob, { ...filters, city: 'Malmö' }));
  assert.ok(!matchesJob(filterJob, { ...filters, workModel: 'Remote' }));
  assert.ok(!matchesJob(filterJob, { ...filters, role: 'Growth & MarTech' }));
  assert.ok(matchesJob(filterJob, { ...filters, search: 'kort ingress' }));
  assert.ok(matchesJob({ ...filterJob, workModel: 'Remote' }, { ...filters, workModel: 'Remote' }));
  const jobsHtml = renderToString(createElement(JobsView, {
    jobs: [filterJob], recruitmentSites: [], adBanners: [], onNavigate: () => {}, onBookAdSlot: () => {},
    onOpenDiscoverJobs: () => {}, onOpenDiscoverRecruiters: () => {}, onOpenJobModal: () => {}, onApplyJob: () => {},
  }));
  assert.ok(jobsHtml.includes('aria-label="Ort"') && jobsHtml.includes('aria-label="Arbetsmodell"'));
  assert.ok(jobsHtml.includes('Distans / Remote') && jobsHtml.includes('Rensa jobbfilter'));
  const point = { id: 'point-test', label: 'Testpunkt', latitude: 59.2, longitude: 18.1,
    regionKey: 'svealand', description: 'Nytt logistiknav', status: 'draft' };
  assert.equal((await request('/api/map-points/point-test', 'PUT', point)).status, 401);
  assert.equal((await request('/api/map-points/point-test', 'PUT', point, 'member-fixture')).status, 403);
  assert.equal((await request('/api/map-points/point-test', 'PUT', { ...point, latitude: 500 }, 'admin-fixture')).status, 400);
  assert.equal((await request('/api/map-points/point-test', 'PUT', point, 'admin-fixture')).status, 200);
  assert.equal((await service.getStore()).mapPoints?.length, 1);
  assert.equal(publicStore(await service.getStore()).mapPoints?.length, 0);
  assert.equal((await request('/api/map-points/point-test', 'PUT', { ...point, status: 'published' }, 'admin-fixture')).status, 200);
  const pointStore = await service.getStore();
  assert.equal(publicStore(pointStore).mapPoints?.[0].label, 'Testpunkt');
  const mapPointHtml = renderToString(createElement(MarknadView, {
    ...publicStore(pointStore), merchantCount: 1, partnerCount: 1, onNavigate: () => {}, onBookAdSlot: () => {},
  }));
  assert.ok(mapPointHtml.includes('Visa kartpunkt: Testpunkt'));
  assert.ok(mapPointHtml.includes('Tillagda kartpunkter'));
  assert.equal((await request('/api/map-points/point-test', 'DELETE', undefined, 'admin-fixture')).status, 200);
  assert.equal((await service.getStore()).mapPoints?.length, 0);
  assert.equal((await request('/api/map-points/point-test', 'DELETE', undefined, 'admin-fixture')).status, 404);
  assert.ok(validateSnapshot({ ...editorialSnapshot, mapPoints: [] }));
  assert.ok(!validateSnapshot({ ...editorialSnapshot, mapPoints: [{ ...point, latitude: null }] }));
  assert.ok(!validateSnapshot({ ...editorialSnapshot, mapPoints: [point, point] }));
  const oldCopy = { ...editorialSnapshot, pageContent: { ...editorialSnapshot.pageContent,
    marknad: { ...editorialSnapshot.pageContent.marknad, title: LEGACY_MARKET_TITLE } } };
  const migratedCopy = upgradeSnapshot(oldCopy) as typeof editorialSnapshot;
  assert.equal(migratedCopy.pageContent.marknad.title, MARKET_TITLE);
  assert.equal(oldCopy.pageContent.marknad.title, LEGACY_MARKET_TITLE, 'Read migration does not mutate input');
  const customCopy = { ...oldCopy, pageContent: { ...oldCopy.pageContent, marknad: { ...oldCopy.pageContent.marknad, title: 'Egen rubrik' } } };
  assert.equal((upgradeSnapshot(customCopy) as typeof editorialSnapshot).pageContent.marknad.title, 'Egen rubrik');
  assert.equal(neutralPlaceholder('Rickard Wigrund'), 'Ditt namn');
  assert.equal(neutralPlaceholder('wigrund81@gmail.com'), 'namn@foretag.se');
  assert.equal(neutralPlaceholder('Ditt företagsnamn'), 'Ditt företagsnamn');
  const personalForm = structuredClone(editorialSnapshot.contactForms[0]);
  personalForm.fields[0].placeholder = 'Rickard Wigrund';
  const neutralized = upgradeSnapshot({ ...editorialSnapshot, contactForms: [personalForm] }) as typeof editorialSnapshot;
  assert.equal(neutralized.contactForms[0].fields[0].placeholder, 'Ditt namn');
  assert.equal(personalForm.fields[0].placeholder, 'Rickard Wigrund');
  snapshot = editorialSnapshot;

  const featuresSnapshot = structuredClone(snapshot);
  for (const [path, method] of [['/api/firebase-features', 'GET'], ['/api/analytics/report', 'GET'], ['/api/media/image', 'POST'], ['/api/media/image', 'DELETE']]) {
    assert.equal((await request(path, method)).status, 401);
    assert.equal((await request(path, method, method === 'GET' ? undefined : {}, 'member-fixture')).status, 403);
  }
  const disabledStatus = await (await request('/api/firebase-features', 'GET', undefined, 'admin-fixture')).json();
  assert.equal(disabledStatus.mediaEnabled, false);
  assert.equal(disabledStatus.collectionEnabled, false);
  assert.equal(disabledStatus.rawIpEnabled, false);
  assert.equal(disabledStatus.heatmapsEnabled, false);
  assert.equal((await request('/api/media/image', 'POST', {}, 'admin-fixture')).status, 409);
  assert.deepEqual(await (await request('/api/analytics/report', 'GET', undefined, 'admin-fixture')).json(), { enabled: false });
  assert.equal(uploads, 0); assert.equal(reportCalls, 0);
  const png = await sharp({ create: { width: 2, height: 2, channels: 4, background: '#006aa7' } }).png().toBuffer();
  const prepared = await prepareImage(png.toString('base64'), ' Example logo ');
  assert.equal(prepared.alt, 'Example logo');
  const preparedMetadata = await sharp(prepared.bytes).metadata();
  assert.equal(preparedMetadata.format, 'webp'); assert.equal(preparedMetadata.exif, undefined);
  await assert.rejects(prepareImage(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="2" height="2"/>').toString('base64'), 'SVG'));
  await assert.rejects(prepareImage('invalid data', 'Bad'));
  await assert.rejects(prepareImage(Buffer.alloc(350001).toString('base64'), 'Large'));
  await assert.rejects(prepareImage(png.toString('base64'), ''));
  const tooWide = await sharp({ create: { width: 6001, height: 1, channels: 3, background: '#000000' } }).png().toBuffer();
  await assert.rejects(prepareImage(tooWide.toString('base64'), 'Too wide'));

  featureMedia = true;
  const target = snapshot.partners[0];
  const uploadBody = { targetType: 'partner', targetId: target.id, data: png.toString('base64'), alt: 'Fixture logo' };
  assert.equal((await request('/api/media/image', 'POST', { ...uploadBody, targetId: 'not-found' }, 'admin-fixture')).status, 404);
  assert.equal((await request('/api/media/image', 'POST', { ...uploadBody, data: 'not-an-image' }, 'admin-fixture')).status, 400);
  assert.equal(uploads, 0);
  assert.equal((await request('/api/media/image', 'POST', uploadBody, 'admin-fixture')).status, 200);
  assert.equal(uploads, 1);
  const withImage = await service.getStore();
  assert.deepEqual(withImage.partners.find((item) => item.id === target.id)?.image, fixtureImage);
  assert.equal(withImage.partners.find((item) => item.id === target.id)?.desc, target.desc);
  assert.equal((await request('/api/media/image', 'DELETE', { targetType: 'partner', targetId: target.id }, 'admin-fixture')).status, 200);
  assert.equal((await service.getStore()).partners.find((item) => item.id === target.id)?.image, undefined);
  const adTarget = snapshot.adBanners[0];
  assert.equal((await request('/api/media/image', 'POST', { ...uploadBody, targetType: 'ad', targetId: adTarget.id }, 'admin-fixture')).status, 200);
  assert.deepEqual((await service.getStore()).adBanners.find((item) => item.id === adTarget.id)?.image, fixtureImage);
  assert.equal((await service.getStore()).adBanners.find((item) => item.id === adTarget.id)?.targetUrl, adTarget.targetUrl);
  featureReports = true;
  assert.equal((await request('/api/analytics/report?days=999', 'GET', undefined, 'admin-fixture')).status, 400);
  assert.equal(reportCalls, 0);
  const report = await (await request('/api/analytics/report?days=30', 'GET', undefined, 'admin-fixture')).json();
  assert.equal(report.report.days, 30); assert.equal(report.report.rows[0].views, 10); assert.equal(reportCalls, 1);
  assert.throws(() => reportDays('7 OR 1=1')); assert.equal(reportDays(undefined), 7);
  const parsedReport = parseAnalyticsReport({ metadata: { timeZone: 'Europe/Stockholm', subjectToThresholding: true }, rowCount: 2, rows: [
    { dimensionValues: [{ value: '/jobb' }], metricValues: [{ value: '12' }, { value: '3' }, { value: '90' }] },
    { dimensionValues: [{ value: '/private/user@example.invalid' }], metricValues: [{ value: '1' }] },
  ] }, 7);
  assert.equal(parsedReport.rows.length, 1); assert.equal(parsedReport.rows[0].engagementSeconds, 90);
  assert.equal(parsedReport.subjectToThresholding, true);
  assert.throws(() => parseAnalyticsReport({ rows: [{ dimensionValues: [{ value: '/jobb' }], metricValues: [{ value: 'NaN' }] }] }, 7));
  const imageHtml = renderToString(createElement(CmsPublicImage, { image: fixtureImage, kind: 'logo' }));
  assert.ok(imageHtml.includes('object-contain') && imageHtml.includes('Fixture logo'));
  const partnerImageHtml = renderToString(createElement(PartnersView, {
    partners: [{ ...snapshot.partners[0], image: fixtureImage, status: 'published' }], adBanners: [],
    onNavigate: () => {}, onBookAdSlot: () => {}, onOpenDiscover: () => {}, onOpenEditor: () => {}, onRequestIntro: () => {},
  }));
  assert.ok(partnerImageHtml.includes('Fixture logo'));
  assert.ok(!partnerImageHtml.includes('aria-label="Besök $&lt;'));
  const bannerImageHtml = renderToString(createElement(AdBannerSlot, {
    banners: [{ ...snapshot.adBanners[0], image: fixtureImage, mode: 'active', active: true }],
    placement: snapshot.adBanners[0].placement, onNavigate: () => {},
  }));
  assert.ok(bannerImageHtml.includes('Fixture logo'));
  const placeholderHtml = renderToString(createElement(AdBannerSlot, {
    banners: [{ ...snapshot.adBanners[0], image: fixtureImage, mode: 'placeholder', active: true }],
    placement: snapshot.adBanners[0].placement, onNavigate: () => {},
  }));
  assert.ok(!placeholderHtml.includes('Fixture logo'));

  assert.equal(renderToString(createElement(CmsPublicImage, { image: { ...fixtureImage, url: 'javascript:alert(1)' }, kind: 'banner' })), '');
  assert.equal(renderToString(createElement(CmsPublicImage, { kind: 'logo' })), '');
  providerFails = true;
  const failingReport = await request('/api/analytics/report?days=7', 'GET', undefined, 'admin-fixture');
  assert.equal(failingReport.status, 503); assert.ok(!(await failingReport.text()).includes('provider-detail-not-for-client'));
  const failingUpload = await request('/api/media/image', 'POST', uploadBody, 'admin-fixture');
  assert.equal(failingUpload.status, 503); assert.ok(!(await failingUpload.text()).includes('provider-detail-not-for-client'));
  providerFails = false;
  featureMedia = false; featureReports = false; snapshot = featuresSnapshot;

  const beforeArchiveTests = structuredClone(snapshot);
  const qCsv = fs.readFileSync(new URL('../docs/underlag/paketindex-kvartal.csv', import.meta.url), 'utf8');
  const aCsv = fs.readFileSync(new URL('../docs/underlag/paketindex-ar.csv', import.meta.url), 'utf8');
  const qRows = parseArchiveCsv(qCsv); const aRows = parseArchiveCsv(aCsv);
  assert.equal(qRows.length, 73); assert.equal(aRows.length, 19);
  assert.equal(qRows.find((r) => r.edition === '2026-Q3' && r.period === '2026-Q3')?.value, 67554000);
  assert.equal(aRows.find((r) => r.edition === '2026-Q3' && r.period === '2026-YTD-Q3')?.value, 201757120);
  assert.ok(qRows.every((r) => r.status === 'draft'));
  assert.throws(() => parseArchiveCsv(qCsv + qCsv.split('\n')[1] + '\n'));
  assert.deepEqual(csvCells('a;b\n"one;two";"line1\nline2"\n'), [['a','b'], ['one;two','line1\nline2']]);
  assert.throws(() => csvCells('a,b\n"unterminated'));
  const genericCsv = 'edition;period;metric;basis;value;unit;sourceName;sourceUrl;publishedDate;precision;sampleSize;note\n2026-Q3;2026-Q3;lockerShare;survey;26,5;percent;Transportföretagen;;;exact;829;Undersökning september\n';
  const decimalRows = parseArchiveCsv(genericCsv);
  assert.equal(decimalRows[0].value, 26.5);
  assert.equal(decimalRows[0].sampleSize, 829);
  assert.throws(() => parseArchiveCsv(genericCsv.replace('26,5', '101')));
  assert.throws(() => parseArchiveCsv(genericCsv.replace('829', '')));

  const migratedArchive = upgradeSnapshot(beforeArchiveTests) as typeof snapshot;
  assert.equal(migratedArchive.paketindexArchive?.[0].status, 'draft');
  assert.deepEqual(migratedArchive.paketindex, beforeArchiveTests.paketindex);
  assert.deepEqual((upgradeSnapshot({ ...beforeArchiveTests, paketindexArchive: [] }) as typeof snapshot).paketindexArchive, []);
  for (const [path, method] of [['/api/paketindex/archive', 'POST'], ['/api/paketindex/archive', 'DELETE'], ['/api/paketindex/archive/import', 'POST']]) {
    assert.equal((await request(path, method, {})).status, 401);
    assert.equal((await request(path, method, {}, 'member-fixture')).status, 403);
  }
  const archivePreview = await request('/api/paketindex/archive/import', 'POST', { csv: qCsv, policy: 'reject', commit: false }, 'admin-fixture');
  assert.equal(archivePreview.status, 200); assert.equal((await archivePreview.json()).added, 73);
  assert.deepEqual(snapshot, beforeArchiveTests, 'Preview does not write');
  assert.equal((await request('/api/paketindex/archive/import', 'POST', { csv: qCsv, policy: 'reject', commit: true }, 'admin-fixture')).status, 200);
  const afterFirstImport = structuredClone(snapshot);
  assert.equal((await request('/api/paketindex/archive/import', 'POST', { csv: qCsv, policy: 'reject', commit: true }, 'admin-fixture')).status, 400);
  assert.deepEqual(snapshot, afterFirstImport, 'Rejected duplicate import is atomic');
  const skipResult = await (await request('/api/paketindex/archive/import', 'POST', { csv: qCsv, policy: 'skip', commit: true }, 'admin-fixture')).json();
  assert.equal(skipResult.skipped, 73);
  assert.equal((await request('/api/paketindex/archive/import', 'POST', { csv: aCsv, policy: 'reject', commit: true }, 'admin-fixture')).status, 200);
  const archived = await service.getStore();
  assert.ok((archived.paketindexArchive?.length || 0) >= 92);
  assert.equal(publicStore(archived).paketindexArchive?.length, 0);
  const publishRow = { ...qRows[0], status: 'published', sourceUrl: 'https://reports.invalid/paketindex', publishedDate: '2026-01-01' };
  assert.equal((await request('/api/paketindex/archive', 'POST', { ...publishRow, sourceUrl: '' }, 'admin-fixture')).status, 400);
  assert.equal((await request('/api/paketindex/archive', 'POST', { ...publishRow, publishedDate: '2026-02-30' }, 'admin-fixture')).status, 400);
  assert.equal((await request('/api/paketindex/archive', 'POST', publishRow, 'admin-fixture')).status, 200);
  assert.equal(publicStore(await service.getStore()).paketindexArchive?.length, 1);
  const beforeBadImport = structuredClone(snapshot);
  assert.equal((await request('/api/paketindex/archive/import', 'POST', { csv: qCsv + 'bad,row\n', policy: 'replace', commit: true }, 'admin-fixture')).status, 400);
  assert.deepEqual(snapshot, beforeBadImport);
  const replaceResult = await (await request('/api/paketindex/archive/import', 'POST', { csv: qCsv, policy: 'replace', commit: true }, 'admin-fixture')).json();
  assert.equal(replaceResult.replaced, 73);
  assert.equal(publicStore(await service.getStore()).paketindexArchive?.length, 0, 'Replace imports revert published rows to draft');
  assert.equal((await request('/api/paketindex/archive', 'DELETE', { key: observationKey(qRows[0]) }, 'admin-fixture')).status, 200);
  assert.ok(!(await service.getStore()).paketindexArchive?.some((r) => observationKey(r) === observationKey(qRows[0])));
  const current = { ...qRows[0], edition: 'test', period: '2026-Q1', value: 80 };
  const previous = { ...current, period: '2025-Q1', value: 100 };
  assert.equal(comparison(current, [previous])?.growthPct, -20);
  assert.equal(comparison(current, [{ ...previous, edition: 'other' }]), null);
  assert.equal(comparison(current, [{ ...previous, value: 0 }])?.growthPct, null);
  assert.ok(!validObservation({ ...current, metric: 'lockerShare', unit: 'percent', value: 101 }));
  assert.ok(!validObservation({ ...current, metric: 'homeShare', unit: 'percent', value: 30, basis: 'survey' }));
  assert.ok(!validArchive([current, current]));
  assert.ok(!validArchive(Array.from({ length: 501 }, (_, i) => ({ ...current, edition: `edition-${i}` }))));
  assert.ok(!validObservation({ ...current, period: '2026-Q5' }));
  assert.ok(!validObservation({ ...current, value: -1 }));

  assert.ok(!validateSnapshot({ ...archived, paketindexArchive: [current, current] }));
  const publishedArchiveHtml = renderToString(createElement(PaketindexArchive, { rows: [
    { ...current, status: 'published' }, { ...previous, status: 'published' },
  ] }));
  assert.ok(publishedArchiveHtml.includes('periodarkiv') && publishedArchiveHtml.includes('-20'));
  assert.ok(!renderToString(createElement(PaketindexArchive, { rows: qRows })).includes('67554000'));
  const salary = { min: 40000, max: 55000, currency: 'SEK' as const, period: 'month' as const, fullTime: true as const,
    occupation: 'Testyrke', geography: 'Sverige', geographicLevel: 'national' as const, sourceName: 'Testkälla',
    sourceUrl: 'https://salary.invalid/report', year: 2025, method: 'Granskat intervall ur källunderlaget; inte ett min/max härlett ur ett medelvärde.' };
  assert.ok(validSalaryEstimate(salary)); assert.ok(!validSalaryEstimate({ ...salary, max: 1 }));
  assert.ok(!validateSnapshot({ ...archived, jobs: [{ ...archived.jobs[0], salaryEstimate: { ...salary, max: 1 } }] }));

  const jobForSalary = snapshot.jobs[0];
  assert.equal((await request(`/api/jobs/${jobForSalary.id}`, 'PUT', { title: jobForSalary.title, company: jobForSalary.company, salaryEstimate: { ...salary, sourceUrl: '' } }, 'admin-fixture')).status, 400);
  assert.equal((await request(`/api/jobs/${jobForSalary.id}`, 'PUT', { title: jobForSalary.title, company: jobForSalary.company, salaryEstimate: salary }, 'admin-fixture')).status, 200);
  assert.deepEqual((await service.getStore()).jobs.find((r) => r.id === jobForSalary.id)?.salaryEstimate, salary);
  const salaryHtml = renderToString(createElement(SalaryDisplay, { job: { ...jobForSalary, salaryEstimate: salary } }));
  assert.ok(salaryHtml.includes('Uppskattat lönespann') && salaryHtml.includes('riksunderlag') && salaryHtml.includes('2025'));
  assert.ok(renderToString(createElement(SalaryDisplay, { job: { ...jobForSalary, salaryEstimate: null } })).includes('underlag saknas'));
  snapshot = beforeArchiveTests;

  const beforeInsightTests = structuredClone(snapshot);
  const missingInsights = structuredClone(snapshot) as Partial<typeof snapshot>;
  delete missingInsights.insightPosts;
  const upgradedInsights = upgradeSnapshot(missingInsights) as typeof snapshot;
  assert.deepEqual(upgradedInsights.insightPosts, INITIAL_INSIGHT_POSTS);
  assert.equal(missingInsights.insightPosts, undefined, 'Read migration must not mutate input');
  assert.deepEqual((upgradeSnapshot({ ...snapshot, insightPosts: [] }) as typeof snapshot).insightPosts, []);
  const post = { ...INITIAL_INSIGHT_POSTS[0], id: 'insight-fixture', title: 'Editorial fixture',
    body: 'Stycke ett.\n\nStycke två.\n- Punkt ett\n- Punkt två\n<script>window.fixture=1</script>', status: 'draft' as const };
  for (const method of ['PUT', 'DELETE']) {
    assert.equal((await request('/api/insights/insight-fixture', method, post)).status, 401);
    assert.equal((await request('/api/insights/insight-fixture', method, post, 'member-fixture')).status, 403);
  }
  assert.equal((await request('/api/insights/insight-fixture', 'PUT', post, 'admin-fixture')).status, 200);
  assert.equal((await service.getStore()).insightPosts?.find((p) => p.id === post.id)?.body, post.body);
  assert.ok(!publicStore(await service.getStore()).insightPosts?.some((p) => p.id === post.id));
  assert.equal((await request('/api/insights/insight-fixture', 'PUT', { ...post, status: 'published', targetUrl: 'javascript:alert(1)', targetTab: '' }, 'admin-fixture')).status, 400);
  assert.equal((await request('/api/insights/insight-fixture', 'PUT', { ...post, status: 'published', imageAlt: '' }, 'admin-fixture')).status, 400);
  assert.equal((await request('/api/insights/insight-fixture', 'PUT', { ...post, status: 'published', order: 1 }, 'admin-fixture')).status, 200);
  const savedPost = (await service.getStore()).insightPosts!.find((p) => p.id === post.id)!;
  assert.ok(publicStore(await service.getStore()).insightPosts?.some((p) => p.id === post.id));
  const publishedInsightHtml = renderToString(createElement(InsightPosts, { posts: [savedPost], onNavigate: () => {} }));
  assert.ok(publishedInsightHtml.includes('Editorial fixture') && publishedInsightHtml.includes('Läs hela artikeln'));
  assert.ok(!publishedInsightHtml.includes('<script>'));
  assert.equal(renderToString(createElement(InsightPosts, { posts: [post], onNavigate: () => {} })), '');
  assert.ok(renderToString(createElement(InsightPosts, { posts: [post], onNavigate: () => {}, preview: true })).includes('CMS-förhandsvisning'));
  assert.ok(!validInsightPosts([savedPost, savedPost]));
  assert.ok(!validInsightPosts(Array.from({ length: 51 }, (_, index) => ({ ...savedPost, id: `insight-count-${index}` }))));
  const orderedHtml = renderToString(createElement(InsightPosts, { posts: [
    { ...savedPost, id: 'insight-later', title: 'Later fixture', order: 5 },
    { ...savedPost, id: 'insight-first', title: 'First fixture', order: 0 },
  ], onNavigate: () => {} }));
  assert.ok(orderedHtml.indexOf('First fixture') < orderedHtml.indexOf('Later fixture'));

  assert.ok(!validateSnapshot({ ...snapshot, insightPosts: [savedPost, savedPost] }));
  assert.ok(!validateSnapshot({ ...snapshot, insightPosts: [{ ...savedPost, body: 'x'.repeat(15001) }] }));
  featureMedia = true;
  const insightImageUpload = await request('/api/media/image', 'POST', { targetType: 'insight', targetId: post.id,
    data: png.toString('base64'), alt: 'Inläggsbild' }, 'admin-fixture');
  assert.equal(insightImageUpload.status, 200);
  assert.deepEqual((await service.getStore()).insightPosts?.find((p) => p.id === post.id)?.image, fixtureImage);
  assert.equal((await service.getStore()).insightPosts?.find((p) => p.id === post.id)?.body, post.body);
  assert.equal((await request('/api/insights/insight-fixture', 'PUT', { ...savedPost, title: 'Edited after upload' }, 'admin-fixture')).status,409,'Stale editor cannot overwrite a newer image revision');
  assert.deepEqual((await service.getStore()).insightPosts?.find((p) => p.id === post.id)?.image, fixtureImage, 'Text edits preserve newer image reference');
  assert.ok(!validateSnapshot({ ...snapshot, insightPosts: [{ ...savedPost, image: null }] }));

  assert.equal((await request('/api/media/image', 'DELETE', { targetType: 'insight', targetId: post.id }, 'admin-fixture')).status, 200);
  assert.equal((await service.getStore()).insightPosts?.find((p) => p.id === post.id)?.image, undefined);
  featureMedia = false;
  assert.equal((await request('/api/insights/insight-fixture', 'DELETE', undefined, 'admin-fixture')).status, 200);
  assert.ok((await service.getStore()).insightPosts?.find((p)=>p.id===post.id)?.trashedAt);
  assert.ok(!publicStore(await service.getStore()).insightPosts?.some(p=>p.id===post.id));
  // Deletions are not resurrected by migration or later edits.
  snapshot.insightPosts = [];
  await service.upsertMerchant({ name: 'Insight preservation fixture' });
  assert.deepEqual((await service.getStore()).insightPosts, []);
  snapshot = beforeInsightTests;

  const governanceSnapshot = structuredClone(snapshot);
  snapshot.memberGovernance = emptyGovernance();
  snapshot.communityMembers.push({ id: 'gov-member', name: 'Company editor', email: 'fixture@example.invalid', role: 'Editor', city: 'Stockholm', authorUid: 'fixture-user', verificationStatus: 'verified', createdAt: '2026-01-01' });
  snapshot.communityMembers.push({ id: 'gov-other', name: 'Other editor', email: 'two@example.invalid', role: 'Editor', city: 'Stockholm', authorUid: 'fixture-user-two', verificationStatus: 'verified', createdAt: '2026-01-01' });
  const govAdmin = 'governance-admin';
  assert.equal((await request('/api/staff/me')).status,401);
  const beforeProfileGet=JSON.stringify(snapshot);
  await request('/api/staff/me','GET',undefined,'member-fixture');
  assert.equal(JSON.stringify(snapshot),beforeProfileGet,'Profile GET creates no personal/member records');
  assert.equal((await request('/api/staff/me','GET',undefined,'unverified-fixture')).status,403);
  const staffData={name:'Staff fixture',phone:'+46 70 000 00 00',position:'Logistikansvarig',company:'Example',employmentSince:'2024-01-01',expertise:'Frakt, returfrågor',photoUrl:''};
  assert.equal((await request('/api/staff/me','PUT',{...staffData,uid:'fixture-user-two',email:'other@example.invalid',admin:true},'member-fixture')).status,200);
  const myProfile=await (await request('/api/staff/me','GET',undefined,'member-fixture')).json();
  assert.equal(myProfile.profile.uid,'fixture-user'); assert.equal(myProfile.profile.email,'fixture@example.invalid'); assert.equal(myProfile.identity.admin,false);
  assert.equal((await request('/api/staff/fixture-user-two','PUT',staffData,'member-fixture')).status,403);
  const otherProfile=await (await request('/api/staff/me','GET',undefined,'member-two')).json();
  assert.equal(otherProfile.profile,null);
  assert.equal((await request('/api/staff/fixture-user-two','PUT',{...staffData,name:'Other staff'},govAdmin)).status,200);
  assert.equal((await request('/api/staff/me','PUT',{...staffData,employmentSince:'2099-01-01'},'member-fixture')).status,400);
  assert.equal((await request('/api/staff/me','PUT',{...staffData,photoUrl:'https://evil.invalid/track.jpg'},'member-fixture')).status,400);
  assert.equal((await request('/api/staff/me','PUT',{...staffData,phone:'<script>'},'member-fixture')).status,400);
  assert.equal(publicStore(snapshot).staffProfiles,undefined);
  assert.ok(snapshot.memberGovernance!.audit.some((a)=>a.action==='staff-profile-saved'));
  assert.ok(!JSON.stringify(publicStore(snapshot)).includes('+46 70 000 00 00'));
  assert.ok(!validStaffProfiles([{...myProfile.profile}, {...myProfile.profile}]));
  assert.ok(!validateSnapshot({...snapshot,staffProfiles:[{...myProfile.profile,photoUrl:'javascript:alert(1)'}]}));
  assert.equal(employmentDuration('2024-01-01',new Date('2026-11-21T00:00:00Z')),'2 år och 10 månader');
  assert.equal(validEmploymentDate('2026-02-30'),false);
  assert.equal(validProfilePhoto('https://lh3.googleusercontent.com/a/fixture-photo'),true);
  assert.equal(validProfilePhoto('https://lh3.googleusercontent.com.evil.invalid/photo'),false);
  assert.equal(validProfilePhoto('https://user:pass@lh3.googleusercontent.com/photo'),false);
  assert.equal((await request('/api/staff/me','PUT',{...staffData,name:'Fixture administrator'},govAdmin)).status,200);
  const adminStaff=await (await request('/api/staff/me','GET',undefined,govAdmin)).json();
  assert.equal(adminStaff.identity.admin,true);
  assert.ok(snapshot.communityMembers.some((m)=>m.authorUid==='fixture-admin' && m.verificationStatus==='verified'));
  assert.ok(!(await (await request('/api/community/directory','GET',undefined,'member-fixture')).json()).members.some((m:any)=>m.id==='staff-fixture-admin'));

  assert.equal((await request('/api/community/members/no-member/status','PUT',{verificationStatus:'verified'},govAdmin)).status,404);
  assert.equal((await request('/api/community/members/no-member','DELETE',undefined,govAdmin)).status,404);
  const govPartner = snapshot.partners[1]; const govOtherPartner = snapshot.partners[2];
  const linkInput = { memberId:'gov-member', entityType:'partner', entityId:govPartner.id, status:'active', canPropose:true, receiveIntros:true, receiveMessages:false, includeHistory:false };
  const actGov = (op:string, data:unknown, identity=govAdmin) => request(`/api/governance/${op}`, 'POST', data, identity);
  assert.equal((await request('/api/company/workspace')).status,401);
  assert.equal((await request('/api/company/proposals','POST',{},'unverified-fixture')).status,403);
  assert.equal((await actGov('link',linkInput,'member-fixture')).status,403);
  assert.equal((await actGov('link',linkInput)).status,200);
  assert.equal(publicStore(snapshot).partners.find((p)=>p.id===govPartner.id)?.hasCompanyIntroInbox,true);
  const workspace = await (await request('/api/company/workspace','GET',undefined,'member-fixture')).json();
  assert.equal(workspace.companies.length,1); assert.equal(workspace.companies[0].link.entityId,govPartner.id);
  assert.equal((await (await request('/api/company/workspace','GET',undefined,'member-two')).json()).companies.length,0);
  assert.equal((await request(`/api/partners/${govPartner.id}`,'PUT',{...govPartner,name:'Direct edit'},'member-fixture')).status,403);
  assert.equal((await request(`/api/partners/${govPartner.id}`,'DELETE',undefined,'member-fixture')).status,403);
  const propose=(data:unknown,identity='member-fixture') => request('/api/company/proposals','POST',data,identity);
  const proposalInput={entityType:'partner',entityId:govPartner.id,kind:'edit',patch:{desc:'Approved new description'},reason:'Update company profile'};
  assert.equal((await propose({...proposalInput,entityId:govOtherPartner.id})).status,403);
  assert.equal((await propose({...proposalInput,patch:{status:'published'}})).status,403);
  assert.equal((await propose(proposalInput)).status,200);
  assert.equal((await propose(proposalInput)).status,409,'Identical pending proposal must not duplicate after retry');
  assert.equal(snapshot.partners.find((p)=>p.id===govPartner.id)?.desc,govPartner.desc,'Proposal cannot publish directly');
  const proposalId=snapshot.memberGovernance!.proposals[0].id;
  assert.equal((await actGov('decide',{id:proposalId,decision:'approved',comment:'ok'},'member-fixture')).status,403);
  assert.equal((await actGov('decide',{id:proposalId,decision:'approved',comment:'Reviewed'})).status,200);
  assert.equal(snapshot.partners.find((p)=>p.id===govPartner.id)?.desc,'Approved new description');
  assert.equal((await propose({...proposalInput,patch:{desc:'Conflicting change'}})).status,200);
  const conflictId=snapshot.memberGovernance!.proposals[0].id;
  await service.upsertPartner({id:govPartner.id,name:govPartner.name,desc:'Intervening admin edit'});
  assert.equal((await actGov('decide',{id:conflictId,decision:'approved',comment:'attempt'})).status,409);
  assert.equal(snapshot.partners.find((p)=>p.id===govPartner.id)?.desc,'Intervening admin edit');
  assert.equal((await actGov('decide',{id:conflictId,decision:'rejected',comment:'Please resubmit'})).status,200);
  assert.equal((await propose({...proposalInput,kind:'delete',patch:{},reason:'No longer active'})).status,200);
  const deleteId=snapshot.memberGovernance!.proposals[0].id;
  assert.ok(snapshot.partners.some((p)=>p.id===govPartner.id));
  assert.equal((await actGov('decide',{id:deleteId,decision:'approved',comment:'Unpublish, retain records'})).status,200);
  assert.equal(snapshot.partners.find((p)=>p.id===govPartner.id)?.status,'draft');
  assert.ok(snapshot.partners.some((p)=>p.id===govPartner.id),'Deletion request only unpublishes on admin approval');
  const contactFixture={id:'gov-intro',name:'Buyer',email:'buyer@example.invalid',topic:'Intro',message:'Scoped intro',createdAt:new Date(Date.now()+1000).toISOString(),targetEntityType:'partner' as const,targetEntityId:govPartner.id,targetEntityName:govPartner.name,routingMode:'direct-partner' as const,submissionType:'intro' as const};
  snapshot.contactMessages.push(contactFixture,{...contactFixture,id:'gov-other-message',targetEntityId:govOtherPartner.id},{...contactFixture,id:'gov-editorial',routingMode:'self'},{...contactFixture,id:'gov-old',createdAt:'2020-01-01'},{...contactFixture,id:'gov-contact',submissionType:'contact'});
  const scopedInbox=await (await request('/api/company/workspace','GET',undefined,'member-fixture')).json();
  assert.deepEqual(scopedInbox.messages.map((m:any)=>m.id),['gov-intro']);
  assert.equal((await request('/api/company/inbox/read','POST',{id:'gov-other-message'},'member-fixture')).status,403);
  assert.equal((await request('/api/company/inbox/read','POST',{id:'gov-intro'},'member-fixture')).status,200);
  assert.equal((await (await request('/api/company/workspace','GET',undefined,'member-fixture')).json()).messages[0].read,true);
  assert.equal((await actGov('link',{...linkInput,status:'revoked'})).status,200);
  assert.equal((await (await request('/api/company/workspace','GET',undefined,'member-fixture')).json()).messages.length,0);
  assert.equal((await propose(proposalInput)).status,403);
  await actGov('link',{...linkInput,receiveMessages:true,includeHistory:true});
  assert.equal((await (await request('/api/company/workspace','GET',undefined,'member-fixture')).json()).messages.length,3);
  await actGov('link',{...linkInput,memberId:'gov-other',receiveMessages:true,includeHistory:true});
  assert.ok((await (await request('/api/company/workspace','GET',undefined,'member-two')).json()).messages.some((m:any)=>m.id==='gov-intro'));
  assert.equal((await actGov('assign-message',{id:'gov-intro',uid:'fixture-user-two'},'member-fixture')).status,403);
  assert.equal((await actGov('assign-message',{id:'gov-intro',uid:'unknown-user'})).status,403);
  assert.equal((await actGov('assign-message',{id:'gov-editorial',uid:'fixture-user-two'})).status,400);
  assert.equal((await actGov('assign-message',{id:'gov-intro',uid:'fixture-user-two'})).status,200);
  assert.ok(!(await (await request('/api/company/workspace','GET',undefined,'member-fixture')).json()).messages.some((m:any)=>m.id==='gov-intro'));
  assert.ok((await (await request('/api/company/workspace','GET',undefined,'member-two')).json()).messages.some((m:any)=>m.id==='gov-intro'));
  assert.equal((await request('/api/company/inbox/read','POST',{id:'gov-intro'},'member-fixture')).status,403);
  assert.ok(snapshot.memberGovernance!.audit.some((a)=>a.action==='company-message-assigned'));
  assert.equal((await actGov('assign-message',{id:'gov-intro',uid:''})).status,200);
  assert.ok((await (await request('/api/company/workspace','GET',undefined,'member-fixture')).json()).messages.some((m:any)=>m.id==='gov-intro'));
  await actGov('revoke-link',{id:snapshot.memberGovernance!.links.find((l)=>l.uid==='fixture-user-two')!.id});
  assert.equal((await actGov('assign-message',{id:'gov-intro',uid:'fixture-user-two'})).status,403);

  // A real direct-intro submission can use the company inbox without a guessed recipient email.
  await service.upsertPartner({id:govPartner.id,name:govPartner.name,introRoutingMode:'direct',introEmail:''});
  const directToCompany = await request('/api/contact','POST',{name:'Buyer',email:'buyer@example.invalid',topic:'Company intro',message:'Please contact us',submissionType:'intro',targetEntityType:'partner',targetEntityId:govPartner.id,assignedStaffUid:'attacker-uid'},'member-two');
  assert.equal(directToCompany.status,201);
  const directToCompanyMessage=await directToCompany.json();
  assert.equal(directToCompanyMessage.routingMode,'direct-partner');
  assert.equal(directToCompanyMessage.assignedStaffUid,undefined,'Sender cannot select an arbitrary staff recipient');
  const afterContactWorkspace=await (await request('/api/company/workspace','GET',undefined,'member-fixture')).json();
  assert.ok(afterContactWorkspace.messages.some((m:any)=>m.id===directToCompanyMessage.id));
  assert.ok(!JSON.stringify(afterContactWorkspace).includes('routedToEmail'));
  await actGov('member-status',{id:'gov-member',status:'rejected'});
  assert.equal((await (await request('/api/company/workspace','GET',undefined,'member-fixture')).json()).companies.length,0);
  assert.equal((await propose(proposalInput)).status,403);
  await actGov('member-status',{id:'gov-member',status:'verified'});
  const currentLinkId=snapshot.memberGovernance!.links.find((l)=>l.uid==='fixture-user')!.id;
  await actGov('revoke-link',{id:currentLinkId});
  assert.equal((await (await request('/api/company/workspace','GET',undefined,'member-fixture')).json()).companies.length,0);
  await actGov('link',{...linkInput,receiveMessages:true,includeHistory:true});
  const reportThread = await service.addCommunityThread({channel:'#test',author:'Author',title:'Reportable fixture',body:'Incorrect information',authorUid:'fixture-user-two'});
  await service.addCommunityComment(reportThread.id,{author:'Author',body:'Offensive comment',authorUid:'fixture-user-two'});
  const reportComment = snapshot.communityThreads.find((t)=>t.id===reportThread.id)!.comments![0];
  const reportPayload={threadId:reportThread.id,commentId:'',reason:'incorrect',detail:'Source contradicts this claim'};
  assert.equal((await request('/api/community/reports','POST',reportPayload)).status,401);
  assert.equal((await request('/api/community/reports','POST',reportPayload,'member-fixture')).status,200);
  assert.equal((await request('/api/community/reports','POST',reportPayload,'member-fixture')).status,409);
  assert.ok(publicStore(snapshot).communityThreads.some((t)=>t.id===reportThread.id),'Report does not auto-hide');
  const reportId=snapshot.memberGovernance!.reports[0].id;
  assert.equal((await actGov('moderate',{threadId:reportThread.id,commentId:'',hidden:true,reason:'Reviewed misinformation',reportId})).status,200);
  assert.ok(!publicStore(snapshot).communityThreads.some((t)=>t.id===reportThread.id));
  assert.equal((await request(`/api/community/threads/${reportThread.id}/comments`,'POST',{author:'x',body:'comment'},'member-fixture')).status,403);
  assert.equal((await actGov('moderate',{threadId:reportThread.id,commentId:'',hidden:false,reason:'Restored after review'})).status,200);
  await actGov('moderate',{threadId:reportThread.id,commentId:reportComment.id,hidden:true,reason:'Offensive comment'});
  assert.equal(publicStore(snapshot).communityThreads.find((t)=>t.id===reportThread.id)?.comments?.length,0);
  assert.equal(visibleCommunityThreads(snapshot.communityThreads,snapshot.memberGovernance).find((t)=>t.id===reportThread.id)?.comments?.length,0,'Admin portal also filters hidden content');
  const noLeak=publicStore(snapshot); assert.equal(noLeak.memberGovernance,undefined);
  assert.ok(!JSON.stringify(noLeak).includes('Source contradicts this claim'));
  const hiddenUpdate=await request(`/api/community/threads/${reportThread.id}/upvote`,'POST',{},'member-fixture');
  assert.equal((await hiddenUpdate.json()).comments.length,0,'Mutation responses cannot leak hidden comments');
  await actGov('settings',{...DEFAULT_COMMUNITY_SETTINGS,postingEnabled:false,commentsEnabled:false,messagesEnabled:false,directoryEnabled:false,registrationEnabled:false});
  assert.equal((await request('/api/community/threads','POST',{channel:'#test',author:'x',title:'blocked'},'member-fixture')).status,403);
  assert.equal((await request('/api/community/directory','GET',undefined,'member-fixture')).status,403);
  assert.equal((await request('/api/community/messages','GET',undefined,'member-fixture')).status,403);
  assert.equal((await (await request('/api/company/workspace','GET',undefined,'member-fixture')).json()).messages.length,0);
  assert.equal((await request('/api/community/members','POST',{name:'x',email:'two@example.invalid',role:'x',city:'x'},'member-two')).status,403);
  await actGov('settings',{...DEFAULT_COMMUNITY_SETTINGS,enabled:false});
  assert.equal(publicStore(snapshot).communityThreads.length,0);
  await actGov('settings',{...DEFAULT_COMMUNITY_SETTINGS});
  assert.equal((await actGov('block',{uid:'fixture-user',reason:'Repeated abuse',blocked:true})).status,200);
  assert.equal((await request('/api/staff/me','GET',undefined,'member-fixture')).status,403);
  assert.equal((await request('/api/staff/me','PUT',staffData,'member-fixture')).status,403);
  assert.equal((await request('/api/company/workspace','GET',undefined,'member-fixture')).status,403);
  assert.equal((await request('/api/cms/store','GET',undefined,'member-fixture')).status,403);
  assert.equal((await request('/api/community/reports','POST',{...reportPayload,commentId:reportComment.id},'member-fixture')).status,403);
  assert.equal((await request('/api/community/messages','POST',{recipientMemberId:'gov-other',subject:'blocked',body:'test'},'member-fixture')).status,403);
  assert.equal((await request('/api/community/members','POST',{name:'New',email:'other@example.invalid',role:'x',city:'x'},'member-fixture')).status,403);
  assert.equal((await actGov('block',{uid:'fixture-admin',reason:'self',blocked:true})).status,400);
  await actGov('block',{uid:'fixture-user',reason:'Appeal reviewed',blocked:false});
  assert.equal((await request('/api/company/workspace','GET',undefined,'member-fixture')).status,200);
  assert.ok(snapshot.memberGovernance!.audit.some((a)=>a.action==='user-blocked'));
  assert.equal((await request('/api/community/members','POST',{name:'Verified requester',email:'spoofed@example.invalid',role:'Editor',city:'Stockholm'},'member-two')).status,201);
  const pinnedMember=snapshot.communityMembers.find((m)=>m.authorUid==='fixture-user-two');
  assert.equal(pinnedMember?.email,'two@example.invalid','Membership email comes from the verified token, not body');

  assert.ok(validGovernance(snapshot.memberGovernance));
  assert.ok(snapshot.memberGovernance!.audit.some((a)=>a.detail==='Repeated abuse'));
  const moderationHtml=renderToString(createElement(FirebaseProvider,null,createElement(MemberGovernancePanel,{store:snapshot,onRefresh:async()=>{}})));
  assert.ok(moderationHtml.includes('Communityinställningar') && moderationHtml.includes('Ändringsförslag och borttagningsbegäranden'));
  assert.ok(moderationHtml.includes(ADMIN_EMAIL) && moderationHtml.includes('Konfigurerad ägaradministratör'));
  assert.ok(moderationHtml.includes('Tilldela företagsärende till specifik personal'));
  assert.ok(moderationHtml.includes('Anmälningar av innehåll') && moderationHtml.includes('Blockera konto'));
  const reportButtonHtml=renderToString(createElement(CommunityReportButton,{threadId:reportThread.id,signedIn:false,onSignIn:()=>{}}));
  assert.ok(reportButtonHtml.replace(/<!-- -->/g,'').includes('Anmäl inlägg'));

  assert.ok(!validGovernance({...emptyGovernance(),links:[null]}));
  assert.ok(!validateSnapshot({...snapshot,memberGovernance:{...snapshot.memberGovernance,settings:{enabled:'yes'}}}));
  snapshot=governanceSnapshot;


  const beforeCmsUsers=structuredClone(snapshot);
  const newUserInput={email:'new-user@example.invalid',name:'New staff',phone:'+46 700000000',position:'Sales',company:'Fixture',employmentSince:'2025-01-01',expertise:'Payments'};
  assert.equal((await request('/api/cms/users','POST',newUserInput)).status,401);
  assert.equal((await request('/api/cms/users','POST',newUserInput,'member-fixture')).status,403);
  assert.equal((await request('/api/cms/users','POST',newUserInput,'unverified-fixture')).status,403);
  assert.equal(userResolveCalls,0);
  assert.equal((await request('/api/cms/users','POST',{...newUserInput,email:'invalid'},'governance-admin')).status,400);
  assert.equal(userResolveCalls,0);
  userResolveFails=true;
  const beforeAuthFailure=JSON.stringify(snapshot);
  const authFailureResponse=await request('/api/cms/users','POST',newUserInput,'governance-admin');
  assert.equal(authFailureResponse.status,503);assert.ok(!(await authFailureResponse.text()).includes('private-provider-detail'));
  assert.equal(JSON.stringify(snapshot),beforeAuthFailure);
  userResolveFails=false;userResolveCalls=0;
  const addedUserResponse=await request('/api/cms/users','POST',{...newUserInput,admin:true,uid:'forged',emailVerified:true,verificationStatus:'verified'},'governance-admin');
  assert.equal(addedUserResponse.status,200);
  const addedUser=await addedUserResponse.json();
  assert.equal(addedUser.uid,'cms-new-fixture');
  const addedMember=snapshot.communityMembers.find((m)=>m.authorUid===addedUser.uid)!;
  assert.equal(addedMember.email,newUserInput.email);assert.equal(addedMember.verificationStatus,'pending');assert.equal(addedMember.directoryHidden,true);
  assert.equal(snapshot.staffProfiles?.find((p)=>p.uid===addedUser.uid)?.position,'Sales');
  assert.ok(!snapshot.memberGovernance?.links.some((l)=>l.uid===addedUser.uid));
  assert.equal(addedUser.invitationStatus,'not-configured');assert.equal(inviteCalls,0);
  const beforeRetry=structuredClone(snapshot);
  const retried=await (await request('/api/cms/users','POST',{...newUserInput,name:'Must not overwrite'},'governance-admin')).json();
  assert.equal(retried.alreadyRegistered,true);assert.deepEqual(snapshot,beforeRetry,'Retry must preserve profiles and status');
  inviteEnabled=true;inviteSuccess=false;
  const failedInvite=await (await request('/api/cms/users','POST',newUserInput,'governance-admin')).json();
  assert.equal(failedInvite.invitationStatus,'failed');assert.equal(inviteCalls,1);
  assert.equal(snapshot.communityMembers.filter((m)=>m.authorUid===addedUser.uid).length,1);
  const frozenInvitation=structuredClone(snapshot.communityMembers.find((m)=>m.authorUid===addedUser.uid)!.invitation!);
  inviteSuccess=true;
  const sentInvite=await (await request('/api/cms/users','POST',{...newUserInput,name:'Changed retry name'},'governance-admin')).json();
  assert.equal(sentInvite.invitationStatus,'accepted');assert.equal(inviteCalls,2);
  const repeatInvite=await (await request('/api/cms/users','POST',newUserInput,'governance-admin')).json();
  assert.equal(repeatInvite.invitationStatus,'already-accepted');assert.equal(inviteCalls,2);
  const payload=invitationPayload(frozenInvitation);
  assert.ok(payload.text.includes('https://sverigesehandel.se/')&&payload.text.includes(newUserInput.email)&&payload.text.includes('Google-konto'));
  assert.equal(frozenInvitation.templateVersion,2);
  assert.ok(payload.text.includes('begär en e-postlänk'));
  assert.ok(invitationPayload({...frozenInvitation,templateVersion:undefined}).text.includes('använd ditt Google-konto'));
  const memberInvite=snapshot.communityMembers.find((m)=>m.authorUid===addedUser.uid)!.invitation!;
  delete memberInvite.acceptedAt;memberInvite.startedAt='2020-01-01T00:00:00Z';
  const oldInvite=await (await request('/api/cms/users','POST',newUserInput,'governance-admin')).json();
  assert.equal(oldInvite.invitationStatus,'needs-review');assert.equal(inviteCalls,2);
  inviteEnabled=false;

  snapshot.memberGovernance!.blocks.push({uid:addedUser.uid,reason:'Fixture blocked',createdAt:new Date().toISOString()});
  const callsBeforeBlocked=userResolveCalls;
  assert.equal((await request('/api/cms/users','POST',newUserInput,'governance-admin')).status,409);
  assert.equal(userResolveCalls,callsBeforeBlocked,'Blocked account must not resolve/create again');
  snapshot.communityMembers.push({id:'legacy-user',email:'legacy-user@example.invalid',name:'Legacy',role:'Staff',city:'',createdAt:'2026-01-01'});
  assert.equal((await request('/api/cms/users','POST',{...newUserInput,email:'legacy-user@example.invalid'},'governance-admin')).status,409);
  assert.equal(userResolveCalls,callsBeforeBlocked);
  let createdAuthCalls=0;
  const fixtureAuth={getUserByEmail:async()=>{throw {code:'auth/user-not-found'};},createUser:async(values:any)=>{
    createdAuthCalls++;assert.equal(values.emailVerified,false);assert.equal(values.password,undefined);assert.equal(values.customClaims,undefined);
    return {uid:'real-generated-fixture',email:values.email,emailVerified:false,disabled:false};
  }} as unknown as ReturnType<typeof cmsFirebaseAuth>;
  const parsedNewUser=parseCmsUserInput(newUserInput);
  const resolvedUser=await resolveCmsUser(parsedNewUser,fixtureAuth);
  assert.equal(resolvedUser.created,true);assert.equal(createdAuthCalls,1);
  const existingAuth={getUserByEmail:async()=>({uid:'existing-fixture',email:newUserInput.email,emailVerified:true,disabled:false}),createUser:async()=>{throw Error('Must not create');}} as unknown as ReturnType<typeof cmsFirebaseAuth>;
  assert.equal((await resolveCmsUser(parsedNewUser,existingAuth)).created,false);
  const disabledAuth={getUserByEmail:async()=>({uid:'disabled-fixture',email:newUserInput.email,emailVerified:true,disabled:true})} as unknown as ReturnType<typeof cmsFirebaseAuth>;
  await assert.rejects(resolveCmsUser(parsedNewUser,disabledAuth));
  const raceAuth={getUserByEmail:(()=>{let lookup=0;return async()=>{if(!lookup++)throw {code:'auth/user-not-found'};return {uid:'race-fixture',email:newUserInput.email,emailVerified:false,disabled:false};};})(),createUser:async()=>{throw {code:'auth/email-already-exists'};}} as unknown as ReturnType<typeof cmsFirebaseAuth>;
  assert.equal((await resolveCmsUser(parsedNewUser,raceAuth)).uid,'race-fixture');
  const userFormHtml=renderToString(createElement(CreateCmsUser,{onRefresh:async()=>{}}));
  assert.ok(userFormHtml.includes('Lägg till användare')&&userFormHtml.includes('Ingen global adminroll'));
  assert.ok(!JSON.stringify(publicStore(snapshot)).includes('new-user@example.invalid'));
  snapshot=beforeCmsUsers;

  const currentSnapshot = upgradeSnapshot(structuredClone(snapshot)) as typeof snapshot;
  const legacy = structuredClone(snapshot) as Partial<typeof snapshot>;
  delete legacy.logisticsProviders;
  delete legacy.news;
  delete legacy.schemaVersion;
  legacy.partners = (legacy.partners || []).filter((p) => p.id !== 'p-iboxen').map((p) => {
    const copy = { ...p };
    delete copy.carrierMetrics;
    return copy;
  });
  snapshot = legacy as typeof snapshot;
  const legacyJson = JSON.stringify(snapshot);
  const writesBeforeUpgrade = transactions;
  const upgraded = await service.getStore();
  assert.deepEqual(upgraded.logisticsProviders, INITIAL_CMS_DATA.logisticsProviders);
  assert.deepEqual(upgraded.news, INITIAL_CMS_DATA.news);
  assert.equal(upgraded.schemaVersion, 4);
  assert.ok(Array.isArray(upgraded.contactForms) && upgraded.contactForms.length >= 4);
  assert.ok(upgraded.paketindex && upgraded.paketindex.totalParcelsMillions === 64.2);
  assert.ok(upgraded.pageContent && upgraded.pageContent.marknad.title.length > 5);
  assert.ok(upgraded.partners.some((p) => p.id === 'p-iboxen'), 'Legacy pre-v2 snapshot receives iBoxen');
  assert.ok(
    upgraded.partners.find((p) => p.id === 'p-postnord')?.carrierMetrics?.serviceCount,
    'Legacy pre-v2 snapshot enriches carriers with carrierMetrics'
  );
  assert.equal(
    upgraded.partners.find((p) => p.id === 'p-iboxen')?.carrierMetrics?.homeDeliveryPct,
    0,
    'iBoxen homeDeliveryPct is corrected to 0'
  );
  assert.equal(
    upgraded.partners.find((p) => p.id === 'p-dhl')?.carrierMetrics?.parcelLockers,
    750,
    'DHL own lockers synced to 750'
  );
  assert.ok(
    upgraded.partners
      .filter((p) => p.subType === 'Transportör')
      .every((p) => p.customerCount === undefined),
    'Transportör partners must not have customerCount'
  );
  // The same migrated public payload must render the market/map, news & partners cleanly in SSR.
  const visible = publicStore(upgraded);
  const marketHtml = renderToString(createElement(MarknadView, {
    ...visible, merchantCount: visible.merchants.length, partnerCount: visible.partners.length,
    onNavigate: () => {}, onBookAdSlot: () => {},
  }));
  assert.ok(marketHtml.includes('Sveriges'));
  assert.ok(marketHtml.includes('Svensk e-handelstillväxt'));
  assert.ok(marketHtml.includes('64,2') || marketHtml.includes('64.2'));
  assert.ok(marketHtml.includes('32,8') || marketHtml.includes('32.8'));
  const hiddenMarketHtml=renderToString(createElement(MarknadView,{
    regions:visible.regions,orderBenchmarks:visible.orderBenchmarks,shippingTiers:visible.shippingTiers,deliveryStats:visible.deliveryStats,
    paketindex:visible.paketindex,laws:visible.laws,intelligenceSources:visible.intelligenceSources,techStackShares:visible.techStackShares,
    merchants:visible.merchants,logisticsProviders:visible.logisticsProviders,adBanners:visible.adBanners,merchantCount:1,partnerCount:1,
    homeWidgets:{...structuredClone(DEFAULT_HOME_WIDGETS),items:DEFAULT_HOME_WIDGETS.items.map(i=>({...i,enabled:false}))},
    onNavigate:()=>{},onBookAdSlot:()=>{},
  }));
  assert.ok(!hiddenMarketHtml.includes('Jag vill starta e-handel'));
  assert.ok(!hiddenMarketHtml.includes('Senaste tillgängliga Paketindex'));
  assert.ok(!hiddenMarketHtml.includes('Paketindex – periodarkiv'));
  assert.ok(!hiddenMarketHtml.includes('Vem handlar vad – och hur vill svensken betala?'));
  assert.ok(!hiddenMarketHtml.includes('Sveriges e-handelsregioner &amp; 3PL-logistiknav'));
  assert.ok(!hiddenMarketHtml.includes('Svensk e-handelstillväxt'));
  assert.ok(marketHtml.indexOf('Sveriges e-handelsregioner')<marketHtml.indexOf('Svensk e-handelstillväxt'));
  assert.ok(marketHtml.indexOf('Svensk e-handelstillväxt')<marketHtml.indexOf('Vem handlar vad'));

  for(const label of ['Marginalkalkylator','Jobb &amp; Karriär'])assert.ok(hiddenMarketHtml.includes(label),`Non-widget area preserved: ${label}`);

  const newsHtml = renderToString(createElement(NewsView, {
    news: visible.news,
    adBanners: visible.adBanners,
    onNavigate: () => {},
    onBookAdSlot: () => {},
    onRefresh: async () => {},
    onNotify: () => {},
  }));
  assert.ok(newsHtml.includes('Temu'));
  const partnersHtml = renderToString(createElement(PartnersView, {
    partners: visible.partners,
    adBanners: visible.adBanners,
    onNavigate: () => {},
    onBookAdSlot: () => {},
    onOpenDiscover: () => {},
    onOpenEditor: () => {},
    onRequestIntro: () => {},
  }));
  const linkedPartner=visible.partners[0];
  const linkPage={id:'page-link-test',entityType:'partner' as const,entityId:linkedPartner.id,slug:'chosen-slug',entityName:linkedPartner.name,content:{title:linkedPartner.name,summary:'',widgets:[],forms:[]}};
  const linkedCard=renderToString(createElement(CompanyPagesContext.Provider,{value:[linkPage]},createElement(PartnersView,{partners:[linkedPartner],adBanners:[],onNavigate:()=>{},onBookAdSlot:()=>{},onOpenDiscover:()=>{},onOpenEditor:()=>{},onRequestIntro:()=>{}})));
  assert.ok(linkedCard.includes('href="#chosen-slug"')&&linkedCard.includes('Visa företagssida →'));
  assert.ok(!partnersHtml.includes('Visa företagssida →'),'No published pages means no broken card links');
  const wrongEntityLink=renderToString(createElement(CompanyPagesContext.Provider,{value:[{...linkPage,entityId:'different-id'}]},createElement(CompanyPageLink,{type:'partner',entityId:linkedPartner.id})));
  assert.equal(wrongEntityLink,'','Identical company name must not substitute a different entity ID');
  assert.equal(renderToString(createElement(CompanyPagesContext.Provider,{value:[{...linkPage,entityType:'logistics'}]},createElement(CompanyPageLink,{type:'partner',entityId:linkedPartner.id}))), '');
  assert.ok(partnersHtml.includes('iBoxen'));
  assert.ok(partnersHtml.includes('Leveranstjänster'));
  assert.ok(partnersHtml.includes('Paketskåp'));
  assert.ok(partnersHtml.includes('Postombud'));
  assert.ok(partnersHtml.includes('Integrationer:'));
  const threePlHtml = renderToString(createElement(ThreePlView, {
    logisticsProviders: visible.logisticsProviders,
    adBanners: visible.adBanners,
    onNavigate: () => {},
    onBookAdSlot: () => {},
    onRefresh: async () => {},
    onNotify: () => {},
    onRequestIntro: () => {},
  }));
  assert.ok(threePlHtml.includes('Bring Shelfless'));
  const communityHtml = renderToString(createElement(CommunityView, {
    threads: visible.communityThreads,
    memberCount: visible.communityMemberCount,
    memberCities: visible.communityMemberCities,
    onAddThread: async () => {},
    onUpvote: async () => {},
    onJoinMember: async () => {},
  }));
  assert.ok(!communityHtml.includes('1 640+'));
  const cleanCommunityHtml = communityHtml.replace(/<!-- -->/g, '');
  assert.ok(cleanCommunityHtml.includes(`${visible.communityMemberCount} registrerade i nätverket`));
  assert.ok(cleanCommunityHtml.includes('Transportör / Logistik / 3PL'));
  assert.ok(cleanCommunityHtml.includes('Medlemskatalog &amp; Direktmeddelanden') || cleanCommunityHtml.includes('Medlemskatalog'));
  assert.deepEqual(upgraded.merchants, legacy.merchants);
  assert.deepEqual(upgraded.contactMessages, legacy.contactMessages);
  assert.equal(JSON.stringify(snapshot), legacyJson, 'Read migration must not mutate or persist stored data');
  assert.equal(transactions, writesBeforeUpgrade);
  await service.upsertMerchant({ name: 'Migration fixture' });
  assert.deepEqual(snapshot.logisticsProviders, INITIAL_CMS_DATA.logisticsProviders);
  const empty = { ...currentSnapshot, logisticsProviders: [], paketindexArchive: [], schemaVersion: 4 };
  assert.deepEqual(upgradeSnapshot(empty), empty, 'An intentionally empty list stays empty');
  const v3WithoutIboxen = {
    ...currentSnapshot,
    schemaVersion: 3,
    partners: currentSnapshot.partners.filter((p) => p.id !== 'p-iboxen'),
  };
  const upgradedV3 = upgradeSnapshot(v3WithoutIboxen) as typeof currentSnapshot;
  assert.equal(upgradedV3.schemaVersion, 4);
  assert.ok(
    !upgradedV3.partners.some((p) => p.id === 'p-iboxen'),
    'Do not restore deleted iBoxen once snapshot is at schemaVersion >= 3'
  );
  const custom = { ...currentSnapshot, logisticsProviders: [{ ...currentSnapshot.logisticsProviders[0], name: 'Edited provider' }] };
  assert.deepEqual(upgradeSnapshot(custom), custom, 'Do not restore deleted providers or overwrite edits');
  assert.ok(!validateSnapshot({ ...currentSnapshot, logisticsProviders: null }));
  assert.ok(!validateSnapshot({ ...currentSnapshot, logisticsProviders: {} }));
  assert.ok(!validateSnapshot({ ...currentSnapshot, news: null }));
  assert.ok(!validateSnapshot({ ...currentSnapshot, contactForms: null }));
  snapshot = currentSnapshot;
  snapshot.logisticsProviders[0].status = 'draft';
  snapshot.news[0].status = 'draft';
  const draftNewsId = snapshot.news[0].id;
  const noRegistry = async () => false;
  assert.equal((await resolveCmsIdentity({ uid: 'owner', email: ADMIN_EMAIL, email_verified: false }, async () => true)).admin, false);
  assert.equal((await resolveCmsIdentity({ uid: 'owner', email: ADMIN_EMAIL, email_verified: true }, noRegistry)).admin, true);
  assert.equal((await resolveCmsIdentity({ uid: 'member', email_verified: true }, noRegistry)).admin, false);
  assert.equal((await resolveCmsIdentity({ uid: 'registered', email_verified: true }, async () => true)).admin, true);
  assert.equal(await (await request('/portal-fixture')).text(), 'portal');
  const response = await request('/api/cms/store');
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type')!, /application\/json/);
  assert.equal(response.headers.get('cache-control'), 'private, no-store');
  const publicData = await response.json();
  assert.ok(publicData.logisticsProviders.every((item: { status: string }) => item.status === 'published'));
  assert.equal(publicData.logisticsProviders.length, snapshot.logisticsProviders.length - 1);
  assert.deepEqual(publicData.contactMessages, []);
  assert.deepEqual(publicData.communityMembers, []);
  assert.equal(publicData.communityMemberCount, 1);
  assert.deepEqual(publicData.communityMemberCities, ['Test']);
  assert.ok(!publicData.merchants.some((item: { id: string }) => item.id === draftId));
  assert.ok(!publicData.news.some((item: { id: string }) => item.id === draftNewsId));
  assert.equal(snapshot.contactMessages.length, 1, 'Public filtering must not mutate stored data');
  const beforeDenied = calls;const deniedTransactions=transactions;const deniedSnapshot=structuredClone(snapshot);
  for (const [path, method] of [
    ['/api/merchants', 'POST'], ['/api/merchants/item', 'PUT'], ['/api/partners/item', 'DELETE'],
    ['/api/cms/import', 'POST'], ['/api/cms/reset', 'POST'], ['/api/ai/discover', 'POST'],
    ['/api/ai/enrich', 'POST'], ['/api/ai/news', 'POST'], ['/api/news', 'POST'],
    ['/api/news/item', 'DELETE'], ['/api/cms/status', 'GET'],
    ['/api/jobs/validate', 'POST'], ['/api/contact/item', 'DELETE'],
    ['/api/contact/item/status', 'PUT'], ['/api/forms', 'POST'], ['/api/forms/item', 'DELETE'],
    ['/api/community/members/item/status', 'PUT'], ['/api/community/members/item', 'DELETE'],
    ['/api/paketindex', 'PUT'], ['/api/pages', 'PUT'], ['/api/timeline', 'POST'],
  ]) {
    assert.equal((await request(path, method, method === 'GET' ? undefined : {})).status, 401, `${method} ${path}`);
    assert.equal((await request(path, method, method === 'GET' ? undefined : {}, 'member-fixture')).status, 403);
  }
  assert.equal(calls,beforeDenied+21,'Verified non-admin requests read current role grants once per protected request');
  assert.equal(transactions,deniedTransactions,'Denied requests must not enter write transactions');assert.deepEqual(snapshot,deniedSnapshot);
  assert.equal((await request('/api/cms/status', 'GET', undefined, 'admin-fixture')).status, 200);
  assert.equal((await request('/api/cms/store', 'GET', undefined, 'invalid-fixture')).status, 401);
  const fullData = await (await request('/api/cms/store', 'GET', undefined, 'admin-fixture')).json();
  assert.equal(fullData.contactMessages.length, 1);
  assert.ok(fullData.merchants.some((item: { id: string }) => item.id === draftId));
  assert.equal((await request('/api/cms/import', 'POST', { merchants: [], partners: [] }, 'admin-fixture')).status, 400);
  const createdResponse = await request('/api/merchants', 'POST', { name: 'Fixture Merchant', domain: 'fixture.invalid' }, 'admin-fixture');
  assert.equal(createdResponse.status, 201);
  const created = await createdResponse.json();
  assert.equal(created.created, true);
  const reloaded = await (await request('/api/cms/store', 'GET', undefined, 'admin-fixture')).json();
  assert.ok(reloaded.merchants.some((item: { id: string }) => item.id === created.merchant.id));
  assert.equal((await request(`/api/merchants/${created.merchant.id}`, 'DELETE', undefined, 'admin-fixture')).status, 200);
  assert.ok(!snapshot.merchants.some((item) => item.id === created.merchant.id));
  // Verify carrier partners strip customerCount and new CMS routes work
  const carrierResp = await request(
    '/api/partners',
    'POST',
    { name: 'Test Carrier', subType: 'Transportör', customerCount: '10 000+' },
    'admin-fixture'
  );
  assert.equal(carrierResp.status, 201);
  const carrierJson = await carrierResp.json();
  assert.equal(carrierJson.partner.customerCount, undefined);
  assert.equal((await request(`/api/partners/${carrierJson.partner.id}`, 'DELETE', undefined, 'admin-fixture')).status, 200);

  const piResp = await request('/api/paketindex', 'PUT', { totalParcelsMillions: 64.5 }, 'admin-fixture');
  assert.equal(piResp.status, 200);
  assert.equal((await piResp.json()).totalParcelsMillions, 64.5);

  const pagesResp = await request('/api/pages', 'PUT', {
    kontakt: { ...snapshot.pageContent.kontakt, contactEmail: 'redaktion@sverigesehandel.se' },
  }, 'admin-fixture');
  assert.equal(pagesResp.status, 200);
  assert.equal((await pagesResp.json()).kontakt.contactEmail, 'redaktion@sverigesehandel.se');

  const tlResp = await request('/api/timeline', 'POST', { era: '20s', year: '2027', badge: 'Test', title: 'Test Milestone', desc: 'Test', stack: 'AI' }, 'admin-fixture');
  assert.equal(tlResp.status, 201);
  const tlItem = await tlResp.json();
  assert.equal((await request(`/api/timeline/${tlItem.id}`, 'DELETE', undefined, 'admin-fixture')).status, 200);

  const partnerDirectResp = await request(
    '/api/partners',
    'POST',
    {
      name: 'Direct Intro Partner',
      subType: 'Betalning (PSP)',
      introEmail: 'partner-secret@example.invalid',
      introRoutingMode: 'direct',
    },
    'admin-fixture'
  );
  assert.equal(partnerDirectResp.status, 201);
  const partnerDirectJson = await partnerDirectResp.json();
  const publicAfterPartner = await (await request('/api/cms/store')).json();
  const publicPartner = publicAfterPartner.partners.find(
    (p: { id: string }) => p.id === partnerDirectJson.partner.id
  );
  assert.equal(publicPartner.hasDirectIntroEmail, true);
  assert.equal(publicPartner.introEmail, undefined, 'introEmail must not leak in public store');

  const formCreateResp = await request(
    '/api/forms',
    'POST',
    {
      name: 'Marknad Mid Form',
      purpose: 'intro',
      page: 'marknad',
      position: 'mid',
      active: true,
      theme: 'navy',
      kicker: 'Test',
      title: 'Testformulär',
      subtitle: 'Beskrivning',
      submitLabel: 'Skicka',
      successMessage: 'Klar',
      routingMode: 'custom-email',
      recipientEmail: 'secret-form-recipient@example.invalid',
      fields: [],
    },
    'admin-fixture'
  );
  assert.equal(formCreateResp.status, 201);
  const createdForm = await formCreateResp.json();
  const publicFormsResp = await (await request('/api/cms/store')).json();
  const publicForm = publicFormsResp.contactForms.find(
    (f: { id: string }) => f.id === createdForm.id
  );
  assert.ok(publicForm);
  assert.equal(publicForm.recipientEmail, '', 'recipientEmail must be stripped in public store');
  assert.equal(
    (await request(`/api/forms/${createdForm.id}`, 'PUT', { ...createdForm, active: false }, 'admin-fixture')).status,
    200
  );
  const publicFormsAfterPause = await (await request('/api/cms/store')).json();
  assert.ok(
    !publicFormsAfterPause.contactForms.some((f: { id: string }) => f.id === createdForm.id),
    'Paused forms must not be returned publicly'
  );
  assert.equal((await request(`/api/forms/${createdForm.id}`, 'DELETE', undefined, 'admin-fixture')).status, 200);

  assert.equal((await request('/api/contact', 'POST', {})).status, 401);
  assert.equal((await request('/api/contact', 'POST', {}, 'unverified-fixture')).status, 403);
  assert.equal((await request('/api/contact', 'POST', { name: {}, email: 'x', topic: 'x', message: 'x' }, 'member-fixture')).status, 400);
  const directContactResp = await request('/api/contact', 'POST', {
    name: 'Visitor',
    email: 'visitor@example.invalid',
    topic: 'Test',
    message: 'Hello',
    formId: 'form-intro-default',
    submissionType: 'intro',
    targetEntityType: 'partner',
    targetEntityId: partnerDirectJson.partner.id,
    targetEntityName: 'Direct Intro Partner',
    needSummary: 'Byta kassa',
    monthlyVolume: '2 500 – 10 000 paket/mån',
  }, 'member-fixture');
  assert.equal(directContactResp.status, 201);
  const savedDirectContact = await directContactResp.json();
  assert.equal(savedDirectContact.routingMode, 'direct-partner');
  assert.equal(savedDirectContact.routedToEmail, 'partner-secret@example.invalid');
  assert.equal(savedDirectContact.status, 'new');
  assert.equal(
    (await request(`/api/contact/${savedDirectContact.id}/status`, 'PUT', { status: 'forwarded' }, 'admin-fixture')).status,
    200
  );
  assert.equal(snapshot.contactMessages[0].status, 'forwarded');
  assert.equal((snapshot.contactMessages[0] as unknown as { authorUid: string }).authorUid, 'fixture-user');
  assert.equal((await request(`/api/partners/${partnerDirectJson.partner.id}`, 'DELETE', undefined, 'admin-fixture')).status, 200);
  assert.deepEqual((await (await request('/api/cms/store')).json()).contactMessages, []);
  assert.equal((await request('/api/contact', 'POST', { name: 'Visitor', email: 'visitor@example.invalid', topic: 'Test', message: 'x'.repeat(2001) }, 'member-fixture')).status, 400);
  const threadCreateResp = await request('/api/community/threads', 'POST', {
    channel: '#test',
    author: 'Visitor',
    title: 'Fixture thread',
    body: 'Fördjupande kontext i tråden.',
  }, 'member-fixture');
  assert.equal(threadCreateResp.status, 201);
  const createdThread = await threadCreateResp.json();
  assert.equal(createdThread.body, 'Fördjupande kontext i tråden.');

  assert.equal((await request(`/api/community/threads/${createdThread.id}/comments`, 'POST', {
    author: 'Kommentator',
    body: 'Bra inspel kring fraktpriser.',
  })).status, 401);
  const commentResp = await request(`/api/community/threads/${createdThread.id}/comments`, 'POST', {
    author: 'Kommentator',
    body: 'Bra inspel kring fraktpriser.',
  }, 'member-two');
  assert.equal(commentResp.status, 201);
  const commentedThread = await commentResp.json();
  assert.equal(commentedThread.replies, 1);
  assert.equal(commentedThread.comments.length, 1);

  const memberResp = await request('/api/community/members', 'POST', {
    name: 'Maja',
    email: 'maja@example.invalid',
    memberType: 'E-handlare / Butik',
    role: 'E-handlare / Grundare',
    city: 'Göteborg / Borås',
    company: 'Majas E-handel AB',
    website: 'majashandel.se',
    annualOrders: '25 000 – 100 000 paket/år',
    platform: 'Shopify',
    interests: ['Benchmark-rapporter', 'Frakt & 3PL'],
  }, 'member-fixture');
  assert.equal(memberResp.status, 201);
  const createdMember = await memberResp.json();
  assert.equal(createdMember.company, 'Majas E-handel AB');
  assert.equal(createdMember.memberType, 'E-handlare / Butik');
  assert.equal(createdMember.verificationStatus, 'pending');

  const carrierMemberResp = await request('/api/community/members', 'POST', {
    name: 'Kalle',
    email: 'two@example.invalid',
    memberType: 'Transportör / Logistik / 3PL',
    role: 'Logistikchef / 3PL-ansvarig',
    city: 'Stockholm / Uppsala',
    company: 'Nordic Parcel AB',
    website: 'nordicparcel.se',
    serviceFocus: '3PL / Lagerhotell & AutoStore',
    platform: 'Flera plattformar (Plattformsoberoende)',
  }, 'member-two');
  assert.equal(carrierMemberResp.status, 201);
  const createdCarrierMember = await carrierMemberResp.json();
  assert.equal(createdCarrierMember.memberType, 'Transportör / Logistik / 3PL');
  assert.equal(createdCarrierMember.serviceFocus, '3PL / Lagerhotell & AutoStore');

  assert.equal(
    (await request(`/api/community/members/${createdMember.id}/status`, 'PUT', { verificationStatus: 'verified' }, 'admin-fixture')).status,
    200
  );

  // Member directory & DM endpoints require verified login and never leak private emails
  assert.equal((await request('/api/community/directory')).status, 401);
  assert.equal((await request('/api/community/directory', 'GET', undefined, 'unverified-fixture')).status, 403);
  const dirResp = await request('/api/community/directory', 'GET', undefined, 'member-fixture');
  assert.equal(dirResp.status, 200);
  const dirData = await dirResp.json();
  assert.ok(dirData.members.some((m: { id: string }) => m.id === createdCarrierMember.id));
  assert.ok(dirData.members.every((m: Record<string, unknown>) => m.email === undefined && m.linkedinUrl === undefined), 'Directory must never expose email or linkedinUrl');

  assert.equal((await request('/api/community/messages')).status, 401);
  const dmSendResp = await request('/api/community/messages', 'POST', {
    recipientMemberId: createdCarrierMember.id,
    subject: 'Fråga om 3PL-kapacitet',
    body: 'Hej Kalle, tar ni in nya Shopify-handlare i Q2?',
  }, 'member-fixture');
  assert.equal(dmSendResp.status, 201);
  const sentDm = await dmSendResp.json();
  assert.equal(sentDm.recipientMemberId, createdCarrierMember.id);

  // Sender cannot mark recipient's incoming message as read; recipient can
  assert.equal((await request(`/api/community/messages/${sentDm.id}/read`, 'PUT', {}, 'member-fixture')).status, 403);
  const twoInbox = await (await request('/api/community/messages', 'GET', undefined, 'member-two')).json();
  assert.equal(twoInbox.messages.length, 1);
  const readResp = await request(`/api/community/messages/${sentDm.id}/read`, 'PUT', {}, 'member-two');
  assert.equal(readResp.status, 200);
  assert.equal((await readResp.json()).read, true);

  const updatedPublic = await (await request('/api/cms/store')).json();
  assert.deepEqual(updatedPublic.communityMembers, []);
  assert.deepEqual(updatedPublic.directMessages, []);
  const publicCommentedThread = updatedPublic.communityThreads.find((t: { id: string }) => t.id === createdThread.id);
  assert.equal(publicCommentedThread.authorUid, undefined, 'Public threads must strip authorUid');
  assert.equal(publicCommentedThread.comments[0].authorUid, undefined, 'Public comments must strip authorUid');
  assert.equal(updatedPublic.communityMemberCount, 3);
  assert.equal(updatedPublic.communityVerifiedCount, 1);
  assert.deepEqual(updatedPublic.communityMemberCities, ['Stockholm / Uppsala', 'Göteborg / Borås', 'Test']);
  assert.ok(transactions >= 3, 'Writes must pass through Firestore transactions');
  const contactCount = snapshot.contactMessages.length;
  const isolated = operations.withStore(snapshot, () => operations.resetStore());
  assert.deepEqual(isolated.value.contactMessages, []);
  assert.equal(snapshot.contactMessages.length, contactCount, 'Transaction model must not mutate its input');
  const left = operations.withStore(snapshot, () => operations.upsertMerchant({ name: 'Left' }));
  const right = operations.withStore(snapshot, () => operations.upsertMerchant({ name: 'Right' }));
  assert.ok(!left.store.merchants.some((item) => item.name === 'Right'));
  assert.ok(!right.store.merchants.some((item) => item.name === 'Left'));
  assert.ok(validateSnapshot(snapshot));
  assert.ok(!validateSnapshot({ merchants: [], partners: [] }));
  assert.throws(() => encodeStore({ ...snapshot, updatedAt: 'x'.repeat(900_001) }), /safety limit/);
  // Legacy admin backups also use the same migration without discarding private data.
  const backup = structuredClone(snapshot) as Partial<typeof snapshot>;
  delete backup.logisticsProviders;
  const imported = await request('/api/cms/import', 'POST', backup, 'admin-fixture');
  assert.equal(imported.status, 200);
  const restored = await imported.json();
  assert.deepEqual(restored.logisticsProviders, INITIAL_CMS_DATA.logisticsProviders);
  assert.deepEqual(restored.contactMessages, backup.contactMessages);
  // A missing snapshot starts from editorial seed without persisting on read.
  exists = false;
  const writesBeforeSeedRead = transactions;
  const seed = await service.getStore();
  assert.deepEqual(seed.contactMessages, []);
  assert.deepEqual(seed.communityMembers, []);
  assert.equal(transactions, writesBeforeSeedRead);
  await service.upsertMerchant({ name: 'First persisted entry' });
  assert.ok(exists);
  assert.ok((await service.getStore()).merchants.some((item) => item.name === 'First persisted entry'));
  // Async Express failures must yield JSON rather than hang or crash the process.
  service.getStore = async () => { throw new Error('Fixture storage unavailable'); };
  const unavailable = await request('/api/cms/store');
  assert.equal(unavailable.status, 503);
  assert.match((await unavailable.json()).error, /Firebase/);
  console.log('CMS checks passed: JSON route, admin guards, private data, writes/reload/delete, isolated snapshots, size guard, async errors.');
} finally {
  server.closeAllConnections();
  await Promise.race([
    new Promise<void>((resolve) => server.close(() => resolve())),
    new Promise<void>((resolve) => setTimeout(resolve, 250)),
  ]);
}
process.exit(0);
