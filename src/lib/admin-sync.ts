import {
  collection,
  doc,
  getDocs,
  deleteDoc,
  writeBatch,
} from 'firebase/firestore';
import { db } from './firebase';
import { clearFirestoreData } from './firestore-sync';
import { Trip, TripItem } from './types';

// --- Admin-only types ---

export interface AdminTripRecord {
  id: string;
  name: string;
  status: string;
  startDate: string;
  destination: string;
  itemCount: number;
}

export interface AdminGroupInfo {
  id: string;
  name: string;
  memberCount: number;
}

export interface AdminUserRecord {
  uid: string;
  displayName: string;
  email: string;
  groups: AdminGroupInfo[];
  tripCount: number;
  trips: AdminTripRecord[];
}

export interface AdminStats {
  totalUsers: number;
  totalTrips: number;
  totalItems: number;
}

// --- Fetch all users with their trips and stats ---

export async function fetchAllUsers(): Promise<{
  users: AdminUserRecord[];
  stats: AdminStats;
}> {
  // 1. Fetch all user root docs (contain groupId)
  const usersSnap = await getDocs(collection(db, 'users'));

  // 2. Fetch all groups to extract member display info and group names
  const groupsSnap = await getDocs(collection(db, 'groups'));

  const memberInfoMap = new Map<string, { displayName: string; email: string }>();
  const groupInfoMap = new Map<string, { name: string; memberCount: number }>();

  for (const groupDoc of groupsSnap.docs) {
    const data = groupDoc.data();
    const members = data.members as Record<string, { uid: string; displayName: string; email: string }> | undefined;
    groupInfoMap.set(groupDoc.id, {
      name: data.name as string ?? 'Onbekend',
      memberCount: Object.keys(members ?? {}).length,
    });
    if (members) {
      for (const [uid, member] of Object.entries(members)) {
        if (!memberInfoMap.has(uid)) {
          memberInfoMap.set(uid, {
            displayName: member.displayName,
            email: member.email,
          });
        }
      }
    }
  }

  // 3. For each user, fetch trips + tripItems in parallel
  let totalTrips = 0;
  let totalItems = 0;

  const userRecords: AdminUserRecord[] = await Promise.all(
    usersSnap.docs.map(async (userDoc) => {
      const uid = userDoc.id;
      const userData = userDoc.data();
      const groupIds: string[] =
        (userData.groupIds as string[] | undefined) ??
        (userData.groupId ? [userData.groupId as string] : []);

      const [tripsSnap, tripItemsSnap] = await Promise.all([
        getDocs(collection(db, 'users', uid, 'trips')),
        getDocs(collection(db, 'users', uid, 'tripItems')),
      ]);

      // Count items per trip
      const itemCountByTripId = new Map<string, number>();
      for (const itemDoc of tripItemsSnap.docs) {
        const tid = (itemDoc.data() as TripItem).tripId;
        itemCountByTripId.set(tid, (itemCountByTripId.get(tid) ?? 0) + 1);
      }

      const trips: AdminTripRecord[] = tripsSnap.docs.map((tripDoc) => {
        const t = tripDoc.data() as Trip;
        return {
          id: t.id,
          name: t.name,
          status: t.status,
          startDate: t.startDate,
          destination: t.destination,
          itemCount: itemCountByTripId.get(t.id) ?? 0,
        };
      });

      totalTrips += trips.length;
      totalItems += tripItemsSnap.size;

      const memberInfo = memberInfoMap.get(uid);
      const userGroups: AdminGroupInfo[] = groupIds
        .map((gid) => {
          const info = groupInfoMap.get(gid);
          return info ? { id: gid, name: info.name, memberCount: info.memberCount } : null;
        })
        .filter((g): g is AdminGroupInfo => g !== null);

      return {
        uid,
        displayName: memberInfo?.displayName ?? uid,
        email: memberInfo?.email ?? '(geen email)',
        groups: userGroups,
        tripCount: trips.length,
        trips,
      };
    })
  );

  return {
    users: userRecords.sort((a, b) => a.displayName.localeCompare(b.displayName, 'nl')),
    stats: {
      totalUsers: userRecords.length,
      totalTrips,
      totalItems,
    },
  };
}

// --- Delete all data for a user (reuses existing clearFirestoreData) ---

export async function deleteUserData(uid: string): Promise<void> {
  await clearFirestoreData(uid);
}

// --- Delete a single trip and all its items ---

export async function deleteTripAdmin(uid: string, tripId: string): Promise<void> {
  // Delete the trip document
  await deleteDoc(doc(db, 'users', uid, 'trips', tripId));

  // Fetch and delete all related tripItems
  const tripItemsSnap = await getDocs(collection(db, 'users', uid, 'tripItems'));
  const toDelete = tripItemsSnap.docs.filter(
    (d) => (d.data() as TripItem).tripId === tripId
  );

  for (let i = 0; i < toDelete.length; i += 499) {
    const chunk = toDelete.slice(i, i + 499);
    const batch = writeBatch(db);
    for (const d of chunk) {
      batch.delete(d.ref);
    }
    await batch.commit();
  }
}
