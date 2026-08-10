import {
  collection,
  doc,
  setDoc,
  getDocs,
  writeBatch,
  deleteDoc,
} from 'firebase/firestore';
import { db } from './firebase';
import { useAppStore } from './store';
import { Category, CustomActivity, MasterItem, Trip, TripItem } from './types';

// --- Surgical status update: only write checked/purchased/quantity/notes for specific items ---
// Uses set+merge so it won't overwrite structural fields (name, categoryId, etc.)
// and won't clobber changes made by other group members on different items.

export async function syncTripItemsStatus(
  uid: string,
  items: TripItem[],
  itemIds: Set<string>
): Promise<void> {
  if (itemIds.size === 0) return;
  const itemIdArray = Array.from(itemIds);
  for (let i = 0; i < itemIdArray.length; i += 499) {
    const chunk = itemIdArray.slice(i, i + 499);
    const batch = writeBatch(db);
    for (const itemId of chunk) {
      const item = items.find((it) => it.id === itemId);
      if (!item) continue;
      batch.set(
        doc(db, 'users', uid, 'tripItems', itemId),
        stripUndefined({ checked: item.checked, purchased: item.purchased, skipped: item.skipped, quantity: item.quantity, notes: item.notes, weight: item.weight }),
        { merge: true }
      );
    }
    await batch.commit();
  }
}

type CollectionName = 'categories' | 'masterItems' | 'trips' | 'tripItems' | 'customActivities';

// Firestore rejects `undefined` values in documents. Strip them before writing.
function stripUndefined(obj: Record<string, unknown>): Record<string, unknown> {
  const clean: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      clean[key] = value;
    }
  }
  return clean;
}

// --- Upload all local data to Firestore (initial migration) ---

export async function uploadAllToFirestore(uid: string): Promise<void> {
  const state = useAppStore.getState();

  // Firestore batches support max 500 ops — chunk if needed
  const allOps: Array<{ ref: ReturnType<typeof doc>; data: Record<string, unknown> }> = [];

  const addItems = <T extends { id: string }>(collectionName: CollectionName, items: T[]) => {
    for (const item of items) {
      allOps.push({
        ref: doc(db, 'users', uid, collectionName, item.id),
        data: stripUndefined(item as unknown as Record<string, unknown>),
      });
    }
  };

  addItems('categories', state.categories);
  addItems('masterItems', state.masterItems);
  addItems('trips', state.trips);
  addItems('tripItems', state.tripItems);
  addItems('customActivities', state.customActivities);

  // Write in chunks of 499 (leave room for safety)
  for (let i = 0; i < allOps.length; i += 499) {
    const chunk = allOps.slice(i, i + 499);
    const batch = writeBatch(db);
    for (const op of chunk) {
      batch.set(op.ref, op.data);
    }
    await batch.commit();
  }
}

// --- Download all data from Firestore ---

export async function downloadFromFirestore(uid: string): Promise<{
  categories: Category[];
  masterItems: MasterItem[];
  trips: Trip[];
  tripItems: TripItem[];
  customActivities: CustomActivity[];
} | null> {
  const [categoriesSnap, masterItemsSnap, tripsSnap, tripItemsSnap, customActivitiesSnap] = await Promise.all([
    getDocs(collection(db, 'users', uid, 'categories')),
    getDocs(collection(db, 'users', uid, 'masterItems')),
    getDocs(collection(db, 'users', uid, 'trips')),
    getDocs(collection(db, 'users', uid, 'tripItems')),
    getDocs(collection(db, 'users', uid, 'customActivities')),
  ]);

  // If Firestore is completely empty for this user, return null (trigger migration)
  if (
    categoriesSnap.empty &&
    masterItemsSnap.empty &&
    tripsSnap.empty &&
    tripItemsSnap.empty
  ) {
    return null;
  }

  return {
    categories: categoriesSnap.docs.map((d) => d.data() as Category),
    masterItems: masterItemsSnap.docs.map((d) => d.data() as MasterItem),
    trips: tripsSnap.docs.map((d) => d.data() as Trip),
    tripItems: tripItemsSnap.docs.map((d) => d.data() as TripItem),
    customActivities: customActivitiesSnap.docs.map((d) => d.data() as CustomActivity),
  };
}

// --- Sync a full collection to Firestore (upsert + delete removed) ---

export async function syncCollectionToFirestore<T extends { id: string }>(
  uid: string,
  collectionName: CollectionName,
  items: T[]
): Promise<void> {
  // Get existing doc IDs in Firestore
  const snap = await getDocs(collection(db, 'users', uid, collectionName));
  const existingIds = new Set(snap.docs.map((d) => d.id));
  const newIds = new Set(items.map((i) => i.id));

  const allOps: Array<{ type: 'set' | 'delete'; ref: ReturnType<typeof doc>; data?: Record<string, unknown> }> = [];

  // Upsert all current items
  for (const item of items) {
    allOps.push({
      type: 'set',
      ref: doc(db, 'users', uid, collectionName, item.id),
      data: stripUndefined(item as unknown as Record<string, unknown>),
    });
  }

  // Delete items that no longer exist locally
  for (const existingId of existingIds) {
    if (!newIds.has(existingId)) {
      allOps.push({
        type: 'delete',
        ref: doc(db, 'users', uid, collectionName, existingId),
      });
    }
  }

  // Write in chunks of 499
  for (let i = 0; i < allOps.length; i += 499) {
    const chunk = allOps.slice(i, i + 499);
    const batch = writeBatch(db);
    for (const op of chunk) {
      if (op.type === 'set' && op.data) {
        batch.set(op.ref, op.data);
      } else {
        batch.delete(op.ref);
      }
    }
    await batch.commit();
  }
}

// --- Sync a collection under a group path ---

export async function syncGroupCollection<T extends { id: string }>(
  groupId: string,
  collectionName: 'categories' | 'masterItems' | 'customActivities',
  items: T[]
): Promise<void> {
  const snap = await getDocs(collection(db, 'groups', groupId, collectionName));
  const existingIds = new Set(snap.docs.map((d) => d.id));
  const newIds = new Set(items.map((i) => i.id));

  const allOps: Array<{ type: 'set' | 'delete'; ref: ReturnType<typeof doc>; data?: Record<string, unknown> }> = [];

  for (const item of items) {
    allOps.push({
      type: 'set',
      ref: doc(db, 'groups', groupId, collectionName, item.id),
      data: stripUndefined(item as unknown as Record<string, unknown>),
    });
  }

  for (const existingId of existingIds) {
    if (!newIds.has(existingId)) {
      allOps.push({
        type: 'delete',
        ref: doc(db, 'groups', groupId, collectionName, existingId),
      });
    }
  }

  for (let i = 0; i < allOps.length; i += 499) {
    const chunk = allOps.slice(i, i + 499);
    const batch = writeBatch(db);
    for (const op of chunk) {
      if (op.type === 'set' && op.data) {
        batch.set(op.ref, op.data);
      } else {
        batch.delete(op.ref);
      }
    }
    await batch.commit();
  }
}

// A single Firestore write/read can hang indefinitely (never resolve or reject)
// rather than erroring out promptly, e.g. on a connectivity hiccup — this app
// uses offline persistence, which is known to do exactly that. Race each step
// against a timeout so one stuck step doesn't block everything after it.
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${label}: duurde te lang (timeout)`)), ms)
    ),
  ]);
}

// --- Clear all Firestore data for a user (subcollections + the root profile doc) ---
// Times out per step rather than as one big operation, so a single stuck step
// doesn't block the rest — collects failures and reports them together at the
// end instead of leaving the caller with no idea what actually happened.

export async function clearFirestoreData(uid: string): Promise<void> {
  const collections: CollectionName[] = ['categories', 'masterItems', 'trips', 'tripItems', 'customActivities'];
  const failures: string[] = [];

  for (const collectionName of collections) {
    try {
      const snap = await withTimeout(
        getDocs(collection(db, 'users', uid, collectionName)),
        8000,
        `${collectionName} ophalen`
      );
      if (snap.empty) continue;

      // Delete in chunks of 499
      const docs = snap.docs;
      for (let i = 0; i < docs.length; i += 499) {
        const chunk = docs.slice(i, i + 499);
        const batch = writeBatch(db);
        for (const d of chunk) {
          batch.delete(d.ref);
        }
        await withTimeout(batch.commit(), 8000, `${collectionName} verwijderen`);
      }
    } catch (error) {
      console.error(`clearFirestoreData: ${collectionName} failed:`, error);
      failures.push(collectionName);
    }
  }

  // Also remove the root profile doc (displayName/email/groupIds/...) — without
  // this, a "deleted" user still shows up in the admin panel's user list.
  try {
    await withTimeout(deleteDoc(doc(db, 'users', uid)), 8000, 'profiel verwijderen');
  } catch (error) {
    console.error('clearFirestoreData: root profile doc failed:', error);
    failures.push('profiel');
  }

  if (failures.length > 0) {
    throw new Error(`Niet alles kon verwijderd worden (timeout): ${failures.join(', ')}`);
  }
}
