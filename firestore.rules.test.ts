/**
 * Phase 0 Payload-First Security Test Suite for sverigesehandel.se
 * Documents and verifies all "Dirty Dozen" adversarial payloads against firestore.rules.
 */

export interface DirtyDozenCase {
  id: number;
  name: string;
  collectionPath: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  auth: { uid: string; email: string; email_verified: boolean } | null;
  payload?: Record<string, unknown>;
  expected: 'PERMISSION_DENIED';
}

export const DIRTY_DOZEN_CASES: DirtyDozenCase[] = [
  {
    id: 1,
    name: 'Unverified Email Spoof Admin',
    collectionPath: '/merchants/m-spoof',
    operation: 'create',
    auth: { uid: 'spoof-uid', email: 'wigrund81@gmail.com', email_verified: false },
    payload: { id: 'm-spoof', name: 'Spoof Shop', status: 'published' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 2,
    name: 'Self-Assigned Admin Escalation',
    collectionPath: '/admins/attacker-uid',
    operation: 'create',
    auth: { uid: 'attacker-uid', email: 'attacker@example.se', email_verified: true },
    payload: { uid: 'attacker-uid', email: 'attacker@example.se' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 3,
    name: 'Shadow Field Injection on CommunityThread',
    collectionPath: '/communityThreads/t-shadow',
    operation: 'create',
    auth: { uid: 'user-1', email: 'user1@example.se', email_verified: true },
    payload: {
      channel: '#ai-och-data',
      author: 'User 1',
      authorUid: 'user-1',
      title: 'Test',
      votes: 1,
      replies: 0,
      time: 'Just nu',
      isOfficial: true,
    },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 4,
    name: 'ID Poisoning (>128 chars / invalid chars)',
    collectionPath: `/communityThreads/${'a'.repeat(140)}$invalid`,
    operation: 'create',
    auth: { uid: 'user-1', email: 'user1@example.se', email_verified: true },
    payload: {
      channel: '#ai-och-data',
      author: 'User 1',
      authorUid: 'user-1',
      title: 'Poison ID',
      votes: 1,
      replies: 0,
      time: 'Just nu',
    },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 5,
    name: 'Identity Spoofing on Thread Create',
    collectionPath: '/communityThreads/t-spoof-uid',
    operation: 'create',
    auth: { uid: 'user-1', email: 'user1@example.se', email_verified: true },
    payload: {
      channel: '#ai-och-data',
      author: 'Fake User',
      authorUid: 'user-2',
      title: 'Spoofed authorUid',
      votes: 1,
      replies: 0,
      time: 'Just nu',
    },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 6,
    name: 'Client-Forged Timestamp',
    collectionPath: '/communityThreads/t-forged-time',
    operation: 'create',
    auth: { uid: 'user-1', email: 'user1@example.se', email_verified: true },
    payload: {
      channel: '#ai-och-data',
      author: 'User 1',
      authorUid: 'user-1',
      title: 'Backdated post',
      votes: 1,
      replies: 0,
      time: 'Just nu',
      createdAt: '2020-01-01T00:00:00Z',
    },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 7,
    name: 'Vote Hijacking (+9999 jump)',
    collectionPath: '/communityThreads/t-1',
    operation: 'update',
    auth: { uid: 'user-2', email: 'user2@example.se', email_verified: true },
    payload: { votes: 9999 },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 8,
    name: 'Title Hijacking via Upvote',
    collectionPath: '/communityThreads/t-1',
    operation: 'update',
    auth: { uid: 'user-2', email: 'user2@example.se', email_verified: true },
    payload: { votes: 2, title: 'Hacked title' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 9,
    name: 'PII Blanket Read on User Private Info',
    collectionPath: '/users/user-1/private/info',
    operation: 'get',
    auth: { uid: 'user-2', email: 'user2@example.se', email_verified: true },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 10,
    name: 'Unfiltered List Query on Contact Messages',
    collectionPath: '/contactMessages',
    operation: 'list',
    auth: { uid: 'user-2', email: 'user2@example.se', email_verified: true },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 11,
    name: 'Terminal State Tampering on Resolved Contact Message',
    collectionPath: '/contactMessages/msg-resolved',
    operation: 'update',
    auth: { uid: 'user-1', email: 'user1@example.se', email_verified: true },
    payload: { message: 'Altered after resolution' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 12,
    name: 'Orphaned SavedSession Write without Parent User',
    collectionPath: '/users/user-no-parent/savedSessions/dc-1',
    operation: 'create',
    auth: { uid: 'user-no-parent', email: 'orphan@example.se', email_verified: true },
    payload: {
      uid: 'user-no-parent',
      sessionId: 'dc-1',
      title: 'Keynote',
      time: '09:00',
      stage: 'Main',
      track: 'AI & Data',
    },
    expected: 'PERMISSION_DENIED',
  },
];
