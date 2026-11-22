# Sveriges E-handel

React/Vite frontend with the existing Express CMS API deployed as one Vercel
Function. `/api/*` is routed to it; the local dev server uses the same API.

## Development roadmap

See the [CMS development plan (Swedish)](docs/cms-utvecklingsplan.md) for the
proposed phases, acceptance criteria and decisions covering media uploads,
Paketindex history, analytics, job descriptions, salary estimates, regional maps
and direct links to the correct news articles. The plan does not implement or
activate these features.

## Email-link and optional social sign-in

All sign-in entry points open one dialog: existing Google (popup/redirect) and
Firebase passwordless email links. Email verification no longer requires a
Google account. The callback asks for the matching email explicitly, clears
one-time query parameters from browser history and never auto-merges accounts.
Unverified social users can request Firebase email verification and refresh
status; server-side verification and membership/company approval remain required.

Facebook and LinkedIn/OIDC buttons are hidden unless explicitly configured with
non-secret build flags. **No Firebase/Meta/LinkedIn provider, Identity Platform
upgrade, authorized domain or billing is changed by the PR.** Email link UI is
available by default, but Firebase's Email/Password + Email link providers and
safe HTTPS domains must be enabled before it can send working links. Google
remains available during rollout. See [setup, security and isolated test gates](docs/epost-social-inloggning.md).

## Add users from CMS

Global admins can use **Medlemmar & Community → Lägg till användare** to create
or resolve a Firebase Auth account by email and register a private staff/member
record. New CMS membership starts pending and directory-hidden. No password,
custom claim, global admin role or company grant is created. Existing Auth/CMS
users are not overwritten or reactivated. The person signs in with a configured email-link/social method and must be verified; admin approves membership/company rights
separately. **A welcome email with ordinary portal/email-or-social sign-in instructions is sent after registration when Resend API key and verified sender are configured.** CMS reports accepted/not configured/failed/review status; provider acceptance does not prove inbox delivery. Retries reuse a saved payload/key and accepted messages are not automatically re-sent.

See [workflow, retry handling and isolated Auth testing](docs/skapa-anvandare-cms.md).
Live service-account Auth permissions and email/social account linking must be verified
before real use. Code delivery creates no production accounts and changes no IAM.

## Private staff profiles and individual inbox assignment

CMS **Medlemmar & Community** and **Min företagsyta** now include private staff
profiles: verified account email/UID, name, phone, position, current company,
employment start/duration, expertise and optional Google/Firebase image URL.
Profiles do not grant roles/company rights and are not added to the public/member
directory. The already configured owner-admin address is displayed in CMS;
saving a real admin's own profile can create an internal directory-hidden registry
entry if missing. No Auth account or guessed UID is provisioned on deployment.

Admin may assign an existing direct company inquiry to one eligible staff UID.
This narrows the company inbox (including read receipts), never grants access or
changes already-sent mail routing. Clearing assignment returns it to the existing
shared company inbox. See [privacy, workflows and test gates](docs/personalprofiler-tilldelning.md).
No new upload service, notifications, MFA or production profiles are activated.

## Company editors and community moderation

CMS **Medlemmar & Community** manages approved-member company links, per-person
proposal/intro/contact permissions, proposals, deletion requests, community
switches, reports, hide/restore, administrative UID blocks and a bounded audit log.
A verified non-admin opens **Min företagsyta**, never the global CMS, and sees only
assigned fields/proposals and explicitly routed company inbox messages.

Company editors cannot publish, directly update/delete listings, alter routing,
or grant permissions. Sveriges E-handel approves/rejects field-level proposals;
conflicting intervening edits stop approval. Approved removal requests unpublish
rather than physically delete listings. Rights are rechecked server-side.

Community users can report offensive/incorrect/spam content. Reports never
remove content automatically. Hidden material is filtered from public reads and
mutation responses. UID blocks deny authenticated API operations, not anonymous
reading or global Firebase authentication. Membership email is pinned to the
verified token; company grants require an admin-approved UID-bound profile.

See [workflows, routing, security limits and test prerequisites](docs/medlemmar-foretag-community.md).
No existing user receives a company grant on startup. No Firebase roles, IAM,
MFA, billing, mail services, raw IP analytics or heatmaps are activated. 2FA,
real-account testing, privacy/retention and larger-scale storage remain separate
work before a production rollout to company editors.

## Editable Blogg & Insikter cards

CMS **Blogg & Insikter** now manages the former three static Market cards and
new editorial posts: title, label, excerpt, full plain text, image/alt text,
author/date, source, CTA, theme, order and draft/publication. Full text expands in
the card; drafts are filtered server-side. This is a small blog/article module,
not standalone article URLs, RSS, scheduled publishing or a complete SEO blog.
See [workflow and compatibility details](docs/blogg-insikter.md).

The previous three cards are preserved on missing-field migration only; deleted
posts and explicit empty lists are not restored. Existing factual claims and
event dates are not newly verified. Own images use the existing, disabled-by-default
Firebase image flow (choose **Inläggsbild**); bundled images work without activation.
No billing, storage resources, collection or production writes are activated.

## Versioned Paketindex archive and salary evidence

The CMS **Paketindex & Marknad** view now has a period/report-edition archive,
transactional CSV preview/import with explicit duplicate policy, and manual
source-reviewed publication. Supplied quarterly/annual extracts can be loaded as
**drafts**, never auto-published. Public Market shows only published observations,
with edition/method-isolated year-on-year comparisons. The older summary is
retained separately, not silently overwritten or made to follow archive selectors.

CMS job text editing also supports optional source-backed salary estimates,
separate from the legacy salary text. No salary amounts are invented or seeded.
See [workflow, CSV schema, limits and outstanding gates](docs/paketindex-och-loner.md).
The archive is capped at 500 observations inside the existing snapshot and must
move to separate collections before larger growth. No production import occurs
on merge; authenticated CMS and real-data verification remain required.

## Firebase media and report access (disabled by default)

The CMS **Firebase: Bilder & Statistik** panel prepares Firebase Storage uploads
for partner logos/ad images and server-side GA4 report access. See the
[configuration, privacy gates and verification checklist](docs/firebase-bilder-statistik.md).
Both features default to off; no resources, billing, client analytics SDK,
collection, raw IP analytics or heatmaps are activated by this code.

Uploads require explicit bucket + server flag, existing CMS-admin authorization,
and separately configured Google IAM/Blaze. PNG/JPEG/WebP up to 350 kB is decoded,
validated, stripped of EXIF/GPS and re-encoded as WebP. Public download links are
created even for draft posts: only intentionally public images belong here.
Detach/replace preserves old objects; file backup and safe garbage collection
remain a deployment prerequisite, not an implemented media library.

Reports require an explicit numeric GA4 property, a separate read flag, Data API
and property-level service-account access. They read existing aggregated data
only, for allowlisted public page paths; they do not start collection or rebuild
hash-tab history. Signed-in CMS verification and live provider/IAM tests remain
required before activation. Do not supply credentials in chat or commits.

## Portal refinements and supporting material

- Jobs combine free text, city autocomplete, role and work model (Hybrid,
  Distans / Remote, På plats), with result count and reset.
- In CMS content editing, **Kartpunkter** manages additional pins on the existing
  map: name, WGS84 latitude/longitude, region, description and draft/publication.
  Existing region polygons and built-in city pins are unchanged. Only published
  added points reach public data. Point edits require admin; snapshot import
  validates fields, viewport bounds and unique IDs. No production points are seeded.
- The default market heading is ”Sveriges e-handel – insikter, partners och
  möjligheter.” Only the exact old default is upgraded on read; custom headings
  remain. Known personal form placeholders are neutralized on read and rendering,
  without changing authentication identities, profile data or submitted messages.
- [Privacy and storage/analytics proposal](docs/integritet-och-drift.md): nothing
  activated; raw IP analytics and heatmaps remain disabled by explicit decision.
- [Paketindex source inventory and draft CSV extracts](docs/underlag/README.md):
  five supplied editions, preserved separately because historical figures differ.
  These are **not automatically imported into CMS**; the new archive UI supports preview and explicit draft import.

## Editorial links and job descriptions

News created manually or imported in batches/with AI is saved as draft. In the
CMS news view only (never on the public portal, including for admins), select a story
in the link-review panel, correct its headline/summary/source/date/URL, open the
original article, then explicitly confirm it matches before publishing. The
server records the review time; changing those fields requires another review.
Structural URL checks reject homepages, known category/search paths, unsafe
schemes and embedded credentials. They cannot determine whether two stories are
the same: editorial review is required. No external URL is fetched by the API.
Unreachable pages, redirects and paywalls must be assessed by the editor in their
browser; they are not automatically classified or bypassed.

Legacy published news remains in storage and visible, but its unreviewed links
are not clickable until an editor checks them. The review selector inventories
all legacy items and drafts. This is intentional: existing links have not been
claimed as correct or silently replaced. A trusted admin snapshot restore can
restore review metadata, so review backups before importing them.

Jobs retain `desc` as the full original text, with optional `summary` (max 240
characters). Old records without a summary get a short display excerpt without a
startup write. A normal job edit persists a summary. Both create forms and the
CMS text editor support the new fields; AI/batch import retains them. Native
`details` expands the full description, with blank lines as paragraphs and
`-`, `*` or `•` bullet lines as lists. Content is escaped plain text, not HTML.
Editing only the text does not reopen closed jobs or reset expiry verification.

The remaining roadmap stages are not implemented by this change: media storage,
Paketindex archives/import, analytics/IP/heatmaps, salary data and new map areas
still need their respective provider/data/privacy/geography decisions. No new
service, tracking or paid resource is enabled.

## Firebase integration

This branch preserves the Firebase setup from `main`:

- `firebase-applet-config.json` selects the same project **and named Firestore
  database** for both browser and Admin SDK. No separate default database,
  duplicated VITE project/credential configuration or second Firebase Auth app is used.
  Optional non-secret VITE auth UI/provider flags are documented separately.
- Google sign-in remains; configured email-link/social sign-in uses the same Firebase app, user profiles and saved sessions.
- CMS administration follows the existing Rules policy: verified email matching
  the configured owner, or a verified user present in `admins/{uid}` in that same
  database. The browser and API both check this; API verification checks revoked
  tokens/disabled users. No new custom-claim or password-login setup is required.
- CMS edits, contact messages and forum submissions use **only the CMS API**.
  Removed the subsequent duplicate writes to unrelated entity collections.
  Profiles and saved sessions still use their existing Firestore client paths.

## Required Vercel server configuration

The committed Firebase web config is public configuration, **not** a server
credential. The Admin SDK still needs server access. Enter these values yourself
as Vercel secrets for Preview and Production (never in chat or a commit):

- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY` (literal `\n` escapes are accepted)
- Optional `GEMINI_API_KEY` for admin-only AI discovery/enrichment.

From a checkout linked to the intended project, repeat this interactive command
for each variable name, replacing only `VARIABLE_NAME`:

```sh
vercel env add VARIABLE_NAME --environment preview,production
```

Use a least-privilege service account for the configured project, with Firestore
read/write access to the configured named database and Firebase Auth user-read
permission for revoked/disabled-token checking. Application Default Credentials
are also supported in trusted Google environments. Never expose credentials as
`VITE_*` variables. Missing credentials fail closed, without a local-file fallback.

The Google provider and the deployment domain must be enabled/authorized in
Firebase Authentication. This PR does not change Firebase configuration, IAM,
users, admin registry entries or deployed security rules.

For another administrator, use the existing approved owner/admin-registry process;
there is no automatic first-user admin. A registry entry must satisfy the existing
`firestore.rules` schema, and only the configured verified owner can grant it
through client Rules. Do not broaden Rules to make the integration work.

## Data model and migration boundary

The server owns `cmsSnapshots/main`, containing the complete CMS JSON payload.
Direct browser access to this path is explicitly denied; existing Rules for
profiles, sessions and other collections are preserved. Review and deploy the
Rules to the **named database**, not a different default database. Admin SDK
requests use IAM and bypass client Rules, so editorial API routes independently
verify admin authorization. Contact/community submissions require a verified
Firebase user; unverified/signed-out requests are denied before storage access.
Visitor reads contain only published content, no contact/member records or draft
catalog items; all API responses are `private, no-store`.

The first write initializes a missing snapshot from bundled editorial seed, with
empty contact/member lists. Existing snapshots are never overwritten at startup.
Each write uses a Firestore transaction, with isolated synchronous domain
operations, so concurrent retries do not overwrite intervening edits. Deletions
are not restored by seed hydration.

**Existing per-entity Firestore documents are not automatically imported into the
snapshot, deleted, or modified by this PR.** If those collections already contain
real CMS content, back it up and reconcile/export/import a complete CMS backup
before switching production to this branch. Imports/reset replace the snapshot;
verify them only on disposable preview data first. Private contacts should be
included only in an admin-controlled backup/import, never in bundled seed.
User profiles and saved-session documents remain in their original collections.

The snapshot is limited to 900 KB, below Firestore's document limit. Split it into
entity collections before exceeding that size or accepting high write volume.
Review abuse protection/rate limits before public launch; this design is a small
editorial CMS, not a high-volume forum. Use a separate Firebase project/database
and corresponding matching web config for Preview if test edits must not affect
production. This PR does not create backups or provision a separate database.

## Verification

```sh
bun install --frozen-lockfile
bun run check:cms
bun run check:startup
bun run lint
bun run build
```

`check:cms` exercises the actual Firestore adapter using an isolated in-memory
Firestore substitute and synthetic token identities. It checks JSON routing,
verified owner/registry authorization policy, denied writes, private-data
filtering, transaction/readback/deletion behavior, payload bounds and async errors.
It does not contact Firebase or prove live IAM, deployed Rules or Google OAuth.
The existing `firestore.rules.test.ts` is a payload catalogue, not an executable
emulator test suite.

Before merging, configure server credentials, rebuild Preview, then check:

1. Signed out: portal loads; `/api/cms/store` returns JSON 200 with no private data;
   CMS opens Google login, not an unprotected editor.
2. Ordinary/unverified users cannot edit or call AI endpoints. Verified users can
   submit contact/community forms; these writes use the API only.
3. Owner/registered admin: Google sign-in opens CMS; edit an item, reload and
   confirm persistence. Sign out and confirm private data/editors disappear.
4. Profiles and saved sessions still work with the existing named database Rules.
5. Concurrent edits preserve both changes; direct client reads/writes of snapshots
   are denied. Confirm any existing entity data has been reconciled before merge.

No test account or auth bypass is included. A READY build is not proof that the
live database or signed-in flows work.

References: [Firebase Admin setup](https://firebase.google.com/docs/admin/setup),
[Firestore IAM versus client Rules](https://firebase.google.com/docs/firestore/security/overview),
[Vercel Functions](https://vercel.com/docs/functions/quickstart).

### Firebase Admin runtime compatibility

Firebase Admin is pinned to `13.10.0` because the 14.5.1 dependency chain uses
`jwks-rsa@4` with a CommonJS `require()` of ESM-only `jose@6`. That throws
`ERR_REQUIRE_ESM` in the deployed runtime before the API handler starts. The
13.10.0 dependency chain uses `jwks-rsa@3` and CommonJS-compatible `jose@4`,
without overriding a transitive dependency outside its declared range.

`check:startup` runs the real API entrypoint in a fresh Node process with
`--no-experimental-require-module`, then checks an unauthenticated write returns
JSON 401 rather than crashing. It requires Node 22.18+ (native TypeScript
stripping), runs without Firebase credentials, and must pass before upgrading
Firebase Admin. This is not verification of live Google login or database access.

### Older snapshots and logistics

Snapshots/backups created before `logisticsProviders` existed are upgraded on
read and admin import: only the absent field is filled from the bundled logistics
seed. Existing lists (including empty lists), edits, deletions, private records
and other CMS fields are preserved. Reads do not write to Firestore; the next
normal transactional edit persists the upgraded snapshot. Malformed non-array
logistics fields are rejected rather than silently replaced. Public responses
exclude draft logistics providers, matching the other catalogs.

The focused CMS check includes legacy read/import, preservation, public filtering
and server-rendering the market/logistics map with the migrated payload.

## Portal navigation and latest Paketindex

Four menu groups preserve all previous destinations and add `#om`, editable via
CMS page texts. The home page now starts with audience entry points and the
latest Paketindex before existing archive/sponsored/deeper content. No CMS
snapshot or historical source CSV is rewritten by this code change.

The latest card uses a separately source-reviewed Q3 2026 read-only reference
(Transportföretagen/HUI, source page dated 2026-11-10), unless a newer published
CMS quarterly total is available. It is **not** a CMS archive import or external
feed monitor. Comparisons never mix report editions; annual/YTD, survey values
and drafts cannot become the latest quarterly total. Existing history remains
available. See [sources, selection rules and prioritized next steps](docs/portal-prioritering.md).

## Startguide and moderated sale listings

`#starta` adds ten CMS-editable planning chapters with checklists and shareable
hash chapter links. `#kop-salj` lists only admin-published brand/webshop/stock
listings. Verified users submit proposals; identity comes from server-verified
Firebase UID/email, not the submitted payload. Only global admin can review and
publish. Private seller data and notes never appear in public listing projections.

Buyer inquiries are stored privately in **CMS → Formulär & Intro**, not sent to
sellers by email and not exposed in company inboxes. Sold/unpublished listings
cannot accept new inquiries. Full registers fail without evicting old data.
Guide drafts and sale records are included in existing admin backup, with strict
import validation. No new providers, billing or tracking is activated. See
[workflow, privacy, limits and verification](docs/startguide-kop-salj.md).

### CMS-created buy/sell ads

Global admins can create an ad directly in **Startguide & Köp/sälj** with private
contact details, a draft default and explicit review before publication. Contacts
are not auto-verified, provisioned as Auth users or given company rights. CMS
creator UID and contact data stay private. Buy/sell intent is shown and filterable
in the portal; legacy ads remain selling listings. See
[workflow and remaining CMS gaps](docs/cms-annonskapande.md).

## Grouped CMS and editorial workflows

The CMS menu now groups all previous sections into five collapsible categories
with menu search. **Historik, papperskorg & ärenden** adds private version restore,
soft deletion and sale-inquiry assignment/follow-up. Sale ads, start-guide
chapters and insights enforce optimistic revision checks and publication windows
on the server; other older editorial forms are not versioned by this change.
Sale galleries support five existing Firebase-validated images, preserving files
and prior references. No Firebase service or MFA requirement is activated.
See [scope, limits, tests and remaining deployment gates](docs/cms-arbetsfloden.md).

## Blog page and safe home-widget foundation

`#blogg` reuses existing insightPosts with search/categories and stable hash article
links (`#blogg/<id>`), without copying stored content. Existing publishing windows,
trash and admin protection apply. Home shows at most three ordered published posts
and links to the blog. This is not SSR article routing or complete SEO metadata.

**Innehåll & marknad → Startsida – widgets** controls four allowlisted modules:
audience cards, latest Paketindex, archive and blog selection. The first three can
be reordered inside their existing top zone; the blog stays in its editorial zone.
Other diagrams, map, calculators, ad slots and forms remain untouched. Missing
settings use the existing order; render-time invalid config falls back safely,
but invalid database/backup config is rejected rather than silently rewritten.
Hiding never deletes source content. Admin writes use revision conflict checks.
See [scope, compatibility and verification gates](docs/blogg-widgets.md).
