import {
  collection,
  doc,
  setDoc,
  getDocs,
  writeBatch,
} from 'firebase/firestore';
import { db } from './firebase';
import { useAppStore } from './store';
import { Category, CustomActivity, MasterItem, Trip, TripItem } from './types';

type CollectionName = 'categories' | 'masterItems' | 'trips' | 'tripItems' | 'customActivities';

// --- Upload all local data to Firestore (initial migration) ---

export async function uploadAllToFirestore(uid: string): Promise<void> {
  const state = useAppStore.getState();

  // Firestore batches support max 500 ops — chunk if needed
  const allOps: Array<{ ref: ReturnType<typeof doc>; data: Record<string, unknown> }> = [];

  const addItems = <T extends { id: string }>(collectionName: CollectionName, items: T[]) => {
    for (const item of items) {
      allOps.push({
        ref: doc(db, 'users', uid, collectionName, item.id),
        data: item as unknown as Record<string, unknown>,
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
      data: item as unknown as Record<string, unknown>,
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
      data: item as unknown as Record<string, unknown>,
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

// --- Clear all Firestore data for a user ---

export async function clearFirestoreData(uid: string): Promise<void> {
  const collections: CollectionName[] = ['categories', 'masterItems', 'trips', 'tripItems', 'customActivities'];

  for (const collectionName of collections) {
    const snap = await getDocs(collection(db, 'users', uid, collectionName));
    if (snap.empty) continue;

    // Delete in chunks of 499
    const docs = snap.docs;
    for (let i = 0; i < docs.length; i += 499) {
      const chunk = docs.slice(i, i + 499);
      const batch = writeBatch(db);
      for (const d of chunk) {
        batch.delete(d.ref);
      }
      await batch.commit();
    }
  }
}
