# Sveriges E-handel

React/Vite frontend with the existing Express CMS API deployed as one Vercel
Function. `/api/*` is routed to it; the local dev server uses the same API.

## Firebase integration

This branch preserves the Firebase setup from `main`:

- `firebase-applet-config.json` selects the same project **and named Firestore
  database** for both browser and Admin SDK. No separate default database,
  `VITE_FIREBASE_*` variables, or second Firebase Auth app is used.
- Google sign-in, the Firebase provider, user profiles and saved sessions remain.
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
