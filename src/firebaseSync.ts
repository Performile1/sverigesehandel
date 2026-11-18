import type { User } from 'firebase/auth';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type Unsubscribe,
} from 'firebase/firestore';
import {
  ADMIN_EMAIL,
  BLUEPRINT_LIMITS,
  OperationType,
  db,
  handleFirestoreError,
  sanitizeBoundedString,
  sanitizeFirestoreId,
} from './firebase';
import type { AdBanner, DCSession, Merchant, TechPartner } from './types';

export function isVerifiedAdmin(user: User | null): boolean {
  return Boolean(user && user.emailVerified && user.email === ADMIN_EMAIL);
}

export async function ensureUserProfile(user: User): Promise<void> {
  if (!user.emailVerified) return;
  const uid = sanitizeFirestoreId(user.uid);
  const userPath = `users/${uid}`;
  const privatePath = `users/${uid}/private/info`;

  try {
    const userRef = doc(db, 'users', uid);
    const snap = await getDoc(userRef);
    const displayName = sanitizeBoundedString(
      user.displayName || user.email?.split('@')[0],
      BLUEPRINT_LIMITS.userDisplayNameMax,
      'Medlem'
    );

    if (!snap.exists()) {
      await setDoc(userRef, {
        uid,
        displayName,
        role: 'E-handlare / Besökare',
        city: 'Sverige',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(userRef, {
        displayName,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, userPath);
  }

  try {
    const privateRef = doc(db, 'users', uid, 'private', 'info');
    await setDoc(privateRef, {
      uid,
      email: sanitizeBoundedString(user.email, BLUEPRINT_LIMITS.emailMax, 'user@example.se'),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, privatePath);
  }
}

export function subscribeSavedSessions(
  uid: string,
  onSessions: (sessionIds: string[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const safeUid = sanitizeFirestoreId(uid);
  const path = `users/${safeUid}/savedSessions`;
  const q = query(collection(db, 'users', safeUid, 'savedSessions'));

  return onSnapshot(
    q,
    (snapshot) => {
      onSessions(snapshot.docs.map((d) => d.id));
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        if (onError) onError(wrapped as Error);
      }
    }
  );
}

export async function toggleSavedSessionInFirestore(
  uid: string,
  session: DCSession,
  isAdding: boolean
): Promise<void> {
  const safeUid = sanitizeFirestoreId(uid);
  const safeSessionId = sanitizeFirestoreId(session.id);
  const path = `users/${safeUid}/savedSessions/${safeSessionId}`;

  try {
    const ref = doc(db, 'users', safeUid, 'savedSessions', safeSessionId);
    if (isAdding) {
      await setDoc(ref, {
        uid: safeUid,
        sessionId: safeSessionId,
        title: sanitizeBoundedString(session.title, BLUEPRINT_LIMITS.sessionTitleMax, 'Session'),
        time: sanitizeBoundedString(session.time, BLUEPRINT_LIMITS.sessionTimeMax, 'Dag 1'),
        stage: sanitizeBoundedString(session.stage, BLUEPRINT_LIMITS.sessionStageMax, 'Main Stage'),
        track: sanitizeBoundedString(session.track, BLUEPRINT_LIMITS.sessionTrackMax, 'AI & Data'),
        createdAt: serverTimestamp(),
      });
    } else {
      await deleteDoc(ref);
    }
  } catch (error) {
    handleFirestoreError(error, isAdding ? OperationType.CREATE : OperationType.DELETE, path);
  }
}

export async function saveCommunityThreadToFirestore(
  user: User,
  payload: { channel: string; author: string; title: string }
): Promise<void> {
  if (!user.emailVerified) return;
  const path = 'communityThreads';
  try {
    await addDoc(collection(db, path), {
      channel: sanitizeBoundedString(payload.channel, BLUEPRINT_LIMITS.threadChannelMax, '#ai-och-data'),
      author: sanitizeBoundedString(
        user.displayName || payload.author,
        BLUEPRINT_LIMITS.threadAuthorMax,
        'Verifierad medlem'
      ),
      authorUid: sanitizeFirestoreId(user.uid),
      title: sanitizeBoundedString(payload.title, BLUEPRINT_LIMITS.threadTitleMax, 'Diskussion'),
      votes: 1,
      replies: 0,
      time: 'Just nu',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function saveContactMessageToFirestore(
  user: User,
  payload: {
    name: string;
    email: string;
    company?: string;
    topic: string;
    adSlot?: string;
    message: string;
  }
): Promise<void> {
  if (!user.emailVerified) return;
  const path = 'contactMessages';
  try {
    const docData: Record<string, unknown> = {
      authorUid: sanitizeFirestoreId(user.uid),
      name: sanitizeBoundedString(payload.name, BLUEPRINT_LIMITS.contactNameMax, 'Kontakt'),
      email: sanitizeBoundedString(payload.email, BLUEPRINT_LIMITS.emailMax, user.email || 'hej@sverigesehandel.se'),
      topic: sanitizeBoundedString(payload.topic, BLUEPRINT_LIMITS.contactTopicMax, 'Allmän fråga'),
      message: sanitizeBoundedString(payload.message, BLUEPRINT_LIMITS.contactMessageMax, 'Meddelande'),
      status: 'new',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    if (payload.company?.trim()) {
      docData.company = sanitizeBoundedString(payload.company, BLUEPRINT_LIMITS.contactCompanyMax);
    }
    if (payload.adSlot?.trim()) {
      docData.adSlot = sanitizeBoundedString(payload.adSlot, BLUEPRINT_LIMITS.contactAdSlotMax);
    }
    await addDoc(collection(db, path), docData);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function syncMerchantToFirestore(user: User, merchant: Merchant): Promise<void> {
  if (!isVerifiedAdmin(user)) return;
  const id = sanitizeFirestoreId(merchant.id);
  const path = `merchants/${id}`;
  try {
    const payload: Record<string, unknown> = {
      id,
      name: sanitizeBoundedString(merchant.name, BLUEPRINT_LIMITS.merchantNameMax, 'Butik'),
      domain: sanitizeBoundedString(merchant.domain, BLUEPRINT_LIMITS.merchantDomainMax, 'ehandel.se'),
      city: sanitizeBoundedString(merchant.city, BLUEPRINT_LIMITS.merchantCityMax, 'Stockholm'),
      region: sanitizeBoundedString(merchant.region, BLUEPRINT_LIMITS.merchantRegionMax, 'svealand'),
      category: sanitizeBoundedString(merchant.category, BLUEPRINT_LIMITS.merchantCategoryMax, 'Övrigt'),
      revenue: sanitizeBoundedString(merchant.revenue, BLUEPRINT_LIMITS.merchantRevenueMax, '100M SEK'),
      platform: sanitizeBoundedString(merchant.platform, BLUEPRINT_LIMITS.merchantStackFieldMax, 'Shopify'),
      paymentProvider: sanitizeBoundedString(
        merchant.paymentProvider,
        BLUEPRINT_LIMITS.merchantStackFieldMax,
        'Klarna & Swish'
      ),
      carrier: sanitizeBoundedString(merchant.carrier, BLUEPRINT_LIMITS.merchantStackFieldMax, 'PostNord'),
      desc: sanitizeBoundedString(merchant.desc, BLUEPRINT_LIMITS.merchantDescMax, 'Svensk e-handlare.'),
      status: merchant.status === 'draft' ? 'draft' : 'published',
      updatedBy: sanitizeFirestoreId(user.uid),
      updatedAt: serverTimestamp(),
    };
    if (merchant.yoyGrowth?.trim()) {
      payload.yoyGrowth = sanitizeBoundedString(merchant.yoyGrowth, BLUEPRINT_LIMITS.merchantYoyMax);
    }
    await setDoc(doc(db, 'merchants', id), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function syncPartnerToFirestore(user: User, partner: TechPartner): Promise<void> {
  if (!isVerifiedAdmin(user)) return;
  const id = sanitizeFirestoreId(partner.id);
  const path = `partners/${id}`;
  try {
    const payload: Record<string, unknown> = {
      id,
      name: sanitizeBoundedString(partner.name, BLUEPRINT_LIMITS.partnerNameMax, 'Partner'),
      domain: sanitizeBoundedString(partner.domain, BLUEPRINT_LIMITS.partnerDomainMax, 'partner.se'),
      cat: sanitizeBoundedString(partner.cat, BLUEPRINT_LIMITS.partnerCatMax, 'E-handelsplattform'),
      origin: sanitizeBoundedString(partner.origin, BLUEPRINT_LIMITS.partnerOriginMax, 'Stockholm'),
      stack: sanitizeBoundedString(partner.stack, BLUEPRINT_LIMITS.partnerStackMax, 'SaaS · API'),
      desc: sanitizeBoundedString(partner.desc, BLUEPRINT_LIMITS.partnerDescMax, 'Teknisk partner.'),
      status: partner.status === 'draft' ? 'draft' : 'published',
      updatedBy: sanitizeFirestoreId(user.uid),
      updatedAt: serverTimestamp(),
    };
    if (partner.customerCount?.trim()) {
      payload.customerCount = sanitizeBoundedString(
        partner.customerCount,
        BLUEPRINT_LIMITS.partnerCustomerCountMax
      );
    }
    await setDoc(doc(db, 'partners', id), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function syncAdBannerToFirestore(user: User, banner: AdBanner): Promise<void> {
  if (!isVerifiedAdmin(user)) return;
  const id = sanitizeFirestoreId(banner.id);
  const path = `adBanners/${id}`;
  try {
    await setDoc(doc(db, 'adBanners', id), {
      id,
      placement: banner.placement,
      placementLabel: sanitizeBoundedString(
        banner.placementLabel,
        BLUEPRINT_LIMITS.bannerLabelMax,
        'Annonsplats'
      ),
      dimensions: sanitizeBoundedString(banner.dimensions, BLUEPRINT_LIMITS.bannerDimensionsMax, '980 × 120 px'),
      mode: banner.mode === 'placeholder' ? 'placeholder' : 'active',
      sponsorName: sanitizeBoundedString(banner.sponsorName, BLUEPRINT_LIMITS.bannerSponsorMax, 'Sponsor'),
      kicker: sanitizeBoundedString(banner.kicker, BLUEPRINT_LIMITS.bannerKickerMax, 'Annons'),
      headline: sanitizeBoundedString(banner.headline, BLUEPRINT_LIMITS.bannerHeadlineMax, 'Annonsbanner'),
      body: sanitizeBoundedString(banner.body, BLUEPRINT_LIMITS.bannerBodyMax, ''),
      ctaLabel: sanitizeBoundedString(banner.ctaLabel, BLUEPRINT_LIMITS.bannerCtaMax, 'Läs mer'),
      targetUrl: sanitizeBoundedString(banner.targetUrl, BLUEPRINT_LIMITS.bannerUrlMax, 'https://sverigesehandel.se'),
      theme: banner.theme,
      active: Boolean(banner.active),
      updatedBy: sanitizeFirestoreId(user.uid),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteCatalogDocFromFirestore(
  user: User,
  collectionName: 'merchants' | 'partners' | 'adBanners',
  id: string
): Promise<void> {
  if (!isVerifiedAdmin(user)) return;
  const safeId = sanitizeFirestoreId(id);
  const path = `${collectionName}/${safeId}`;
  try {
    await deleteDoc(doc(db, collectionName, safeId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export function subscribeOwnContactMessages(
  user: User,
  onMessages: (count: number) => void
): Unsubscribe {
  const safeUid = sanitizeFirestoreId(user.uid);
  const path = 'contactMessages';
  const q = isVerifiedAdmin(user)
    ? query(collection(db, path))
    : query(collection(db, path), where('authorUid', '==', safeUid));

  return onSnapshot(
    q,
    (snapshot) => {
      onMessages(snapshot.size);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}
