# Security Specification & Payload-First TDD (`sverigesehandel.se`)

## 1. Data Invariants
1. **Default Deny:** All unspecified Firestore paths MUST be denied (`match /{document=**} { allow read, write: if false; }`).
2. **PII Isolation:** User `email` is NEVER stored on `/users/{userId}` — it lives strictly in `/users/{userId}/private/{docId}` and `/contactMessages/{messageId}`, readable only by the document owner or verified admin (`wigrund81@gmail.com`).
3. **Master Gate on Subcollections:** `/users/{userId}/private/{docId}` and `/users/{userId}/savedSessions/{sessionId}` require parent `/users/{userId}` to exist and match the authenticated UID (or verified admin).
4. **Immutable Ownership & Server Timestamps:** `authorUid` / `uid` must equal `request.auth.uid` on create and remain unchanged on update. `createdAt == request.time` on create; `updatedAt == request.time` on update.
5. **Strict Key Allowlists & Boundary Checks:** Every `create` validates `hasAll(...) && hasOnly(...)`; every `update` runs `isValid[Entity](incoming())` AND `affectedKeys().hasOnly(...)`; every string checks `.size()` against the blueprint limits.
6. **Verified Email Gate & Admin Isolation:** Write operations require `request.auth.token.email_verified == true`. Non-admins cannot create/modify `/admins/*`, `/merchants/*`, `/partners/*`, or `/adBanners/*`.
7. **Terminal State Lock:** `contactMessages` with `status == 'resolved'` cannot be modified by non-admins.
8. **Zero DB Lookups in List Rules:** `allow list` never invokes `get()` or `exists()`.

## 2. The "Dirty Dozen" Payloads (Expected: `PERMISSION_DENIED`)
1. **Unverified Email Spoof Admin:** User with `email: "wigrund81@gmail.com"` and `email_verified: false` tries to create `/merchants/m1`.
2. **Self-Assigned Admin Escalation:** Standard user tries to write `/admins/{theirUid}`.
3. **Ghost Field Injection (Shadow Update):** Authenticated user creates `/communityThreads/t1` with extra `isOfficial: true` field.
4. **ID Poisoning:** Authenticated user attempts to write `/communityThreads/bad$id_with_1500_chars...` violating `^[a-zA-Z0-9_\-]+$` / `<= 128`.
5. **Identity Spoofing on Thread Create:** User A sets `authorUid: "userB"` on `/communityThreads/t2`.
6. **Client-Forged Timestamp:** User submits `createdAt` set to a past date instead of `request.time`.
7. **Vote Hijacking / Multi-Vote Jump:** User updates `/communityThreads/t1` setting `votes: 9999` (`!= existing().votes + 1`).
8. **Title Hijacking via Upvote Branch:** Non-author tries to update `title` along with `votes` on `/communityThreads/t1`.
9. **PII Blanket Read on Private Info:** User B attempts `get` on `/users/userA/private/info`.
10. **Unfiltered Query Scraping on Contact Messages:** User B attempts `list` on `/contactMessages` without `where('authorUid', '==', 'userB')`.
11. **Terminal State Tampering:** User A updates a `/contactMessages/msg1` whose `status` is already `'resolved'`.
12. **Orphaned Subcollection Write:** User creates `/users/{uid}/savedSessions/s1` when parent `/users/{uid}` does not exist.
