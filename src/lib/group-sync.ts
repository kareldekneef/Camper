import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  query,
  where,
  writeBatch,
  deleteField,
} from 'firebase/firestore';
import { db } from './firebase';
import { User } from 'firebase/auth';
import { Category, CustomActivity, Group, GroupMember, MasterItem, Trip, TripItem } from './types';
import { useAppStore } from './store';

// --- Helpers ---

function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No I/O/0/1 to avoid confusion
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function memberFromUser(user: User, role: 'owner' | 'member'): GroupMember {
  return {
    uid: user.uid,
    displayName: user.displayName || 'Onbekend',
    email: user.email || '',
    photoURL: user.photoURL,
    role,
    joinedAt: new Date().toISOString(),
  };
}

// --- Fetch user's groupId ---

export async function fetchUserGroupId(uid: string): Promise<string | null> {
  const userDoc = await getDoc(doc(db, 'users', uid));
  if (!userDoc.exists()) return null;
  return userDoc.data()?.groupId || null;
}

// --- Fetch group document ---

export async function fetchGroup(groupId: string): Promise<Group | null> {
  const groupDoc = await getDoc(doc(db, 'groups', groupId));
  if (!groupDoc.exists()) return null;
  return { id: groupDoc.id, ...groupDoc.data() } as Group;
}

// --- Download group's master data ---

export async function downloadGroupMasterData(groupId: string): Promise<{
  categories: Category[];
  masterItems: MasterItem[];
  customActivities: CustomActivity[];
}> {
  const [categoriesSnap, masterItemsSnap, customActivitiesSnap] = await Promise.all([
    getDocs(collection(db, 'groups', groupId, 'categories')),
    getDocs(collection(db, 'groups', groupId, 'masterItems')),
    getDocs(collection(db, 'groups', groupId, 'customActivities')),
  ]);

  return {
    categories: categoriesSnap.docs.map((d) => d.data() as Category),
    masterItems: masterItemsSnap.docs.map((d) => d.data() as MasterItem),
    customActivities: customActivitiesSnap.docs.map((d) => d.data() as CustomActivity),
  };
}

// --- Download personal master data (for backup comparison) ---

export async function downloadPersonalMasterData(uid: string): Promise<MasterItem[]> {
  const snap = await getDocs(collection(db, 'users', uid, 'masterItems'));
  return snap.docs.map((d) => d.data() as MasterItem);
}

// --- Fetch shared trips from other group members ---

export async function fetchSharedTrips(
  groupId: string,
  currentUid: string,
  memberUids: string[]
): Promise<{ trips: Trip[]; tripItems: TripItem[] }> {
  const allTrips: Trip[] = [];
  const allTripItems: TripItem[] = [];

  for (const memberUid of memberUids) {
    if (memberUid === currentUid) continue;

    try {
      // Fetch trips that belong to this group
      const tripsSnap = await getDocs(
        query(
          collection(db, 'users', memberUid, 'trips'),
          where('groupId', '==', groupId)
        )
      );

      const memberTrips = tripsSnap.docs
        .map((d) => d.data() as Trip)
        .filter((t) => t.sharedWith?.includes(currentUid));

      if (memberTrips.length === 0) continue;

      allTrips.push(...memberTrips);

      // Fetch trip items for shared trips
      const tripIds = new Set(memberTrips.map((t) => t.id));
      const tripItemsSnap = await getDocs(
        collection(db, 'users', memberUid, 'tripItems')
      );
      const memberTripItems = tripItemsSnap.docs
        .map((d) => d.data() as TripItem)
        .filter((ti) => tripIds.has(ti.tripId));

      allTripItems.push(...memberTripItems);
    } catch (error) {
      console.error(`Failed to fetch shared trips from ${memberUid}:`, error);
    }
  }

  return { trips: allTrips, tripItems: allTripItems };
}

// --- Create a new group ---

export async function createGroup(
  uid: string,
  name: string,
  user: User
): Promise<Group> {
  const state = useAppStore.getState();
  const groupId = doc(collection(db, 'groups')).id;
  const inviteCode = generateInviteCode();
  const member = memberFromUser(user, 'owner');

  const group: Group = {
    id: groupId,
    name,
    ownerId: uid,
    inviteCode,
    members: { [uid]: member },
    createdAt: new Date().toISOString(),
  };

  // Create group document
  await setDoc(doc(db, 'groups', groupId), group);

  // Copy personal master list to group
  const allOps: Array<{ ref: ReturnType<typeof doc>; data: Record<string, unknown> }> = [];
  for (const cat of state.categories) {
    allOps.push({
      ref: doc(db, 'groups', groupId, 'categories', cat.id),
      data: cat as unknown as Record<string, unknown>,
    });
  }
  for (const item of state.masterItems) {
    allOps.push({
      ref: doc(db, 'groups', groupId, 'masterItems', item.id),
      data: item as unknown as Record<string, unknown>,
    });
  }
  for (const ca of state.customActivities) {
    allOps.push({
      ref: doc(db, 'groups', groupId, 'customActivities', ca.id),
      data: ca as unknown as Record<string, unknown>,
    });
  }

  for (let i = 0; i < allOps.length; i += 499) {
    const chunk = allOps.slice(i, i + 499);
    const batch = writeBatch(db);
    for (const op of chunk) {
      batch.set(op.ref, op.data);
    }
    await batch.commit();
  }

  // Set user's groupId
  await setDoc(doc(db, 'users', uid), { groupId }, { merge: true });

  return group;
}

// --- Join a group via invite code ---

export async function joinGroup(
  uid: string,
  inviteCode: string,
  user: User
): Promise<Group> {
  // Find group by invite code
  const groupsSnap = await getDocs(
    query(collection(db, 'groups'), where('inviteCode', '==', inviteCode.toUpperCase()))
  );

  if (groupsSnap.empty) {
    throw new Error('Ongeldige uitnodigingscode');
  }

  const groupDoc = groupsSnap.docs[0];
  const group = { id: groupDoc.id, ...groupDoc.data() } as Group;

  // Check if already a member
  if (group.members[uid]) {
    throw new Error('Je bent al lid van deze groep');
  }

  // Add user as member
  const member = memberFromUser(user, 'member');
  await updateDoc(doc(db, 'groups', group.id), {
    [`members.${uid}`]: member,
  });

  // Set user's groupId
  await setDoc(doc(db, 'users', uid), { groupId: group.id }, { merge: true });

  // Return updated group
  group.members[uid] = member;
  return group;
}

// --- Leave a group ---

export async function leaveGroup(uid: string, groupId: string): Promise<void> {
  const group = await fetchGroup(groupId);
  if (!group) return;

  const memberUids = Object.keys(group.members);
  const isOwner = group.ownerId === uid;
  const otherMembers = memberUids.filter((id) => id !== uid);

  if (otherMembers.length > 0) {
    // Remove this member from the group
    await updateDoc(doc(db, 'groups', groupId), {
      [`members.${uid}`]: deleteField(),
      // Transfer ownership if owner is leaving
      ...(isOwner
        ? {
            ownerId: otherMembers[0],
            [`members.${otherMembers[0]}.role`]: 'owner',
          }
        : {}),
    });
  } else {
    // Last member — delete the group and its sub-collections
    await deleteGroupData(groupId);
  }

  // Copy group master list back to personal
  const groupData = await downloadGroupMasterData(groupId).catch(() => null);
  if (groupData) {
    const allOps: Array<{ ref: ReturnType<typeof doc>; data: Record<string, unknown> }> = [];
    for (const cat of groupData.categories) {
      allOps.push({
        ref: doc(db, 'users', uid, 'categories', cat.id),
        data: cat as unknown as Record<string, unknown>,
      });
    }
    for (const item of groupData.masterItems) {
      allOps.push({
        ref: doc(db, 'users', uid, 'masterItems', item.id),
        data: item as unknown as Record<string, unknown>,
      });
    }
    for (const ca of groupData.customActivities) {
      allOps.push({
        ref: doc(db, 'users', uid, 'customActivities', ca.id),
        data: ca as unknown as Record<string, unknown>,
      });
    }
    for (let i = 0; i < allOps.length; i += 499) {
      const chunk = allOps.slice(i, i + 499);
      const batch = writeBatch(db);
      for (const op of chunk) {
        batch.set(op.ref, op.data);
      }
      await batch.commit();
    }
  }

  // Clear user's groupId
  await updateDoc(doc(db, 'users', uid), { groupId: deleteField() });
}

// --- Delete a group (owner only) ---

export async function deleteGroup(uid: string, groupId: string): Promise<void> {
  const group = await fetchGroup(groupId);
  if (!group || group.ownerId !== uid) {
    throw new Error('Alleen de eigenaar kan de groep verwijderen');
  }

  // Clear groupId for all members
  for (const memberUid of Object.keys(group.members)) {
    await updateDoc(doc(db, 'users', memberUid), { groupId: deleteField() }).catch(() => {});
  }

  // Delete group and sub-collections
  await deleteGroupData(groupId);
}

// --- Delete group document and sub-collections ---

async function deleteGroupData(groupId: string): Promise<void> {
  const subCollections = ['categories', 'masterItems', 'customActivities'] as const;

  for (const collectionName of subCollections) {
    const snap = await getDocs(collection(db, 'groups', groupId, collectionName));
    if (!snap.empty) {
      for (let i = 0; i < snap.docs.length; i += 499) {
        const chunk = snap.docs.slice(i, i + 499);
        const batch = writeBatch(db);
        for (const d of chunk) {
          batch.delete(d.ref);
        }
        await batch.commit();
      }
    }
  }

  await deleteDoc(doc(db, 'groups', groupId));
}

// --- Regenerate invite code ---

export async function regenerateInviteCode(groupId: string): Promise<string> {
  const newCode = generateInviteCode();
  await updateDoc(doc(db, 'groups', groupId), { inviteCode: newCode });
  return newCode;
}

// --- Remove a member (owner action) ---

export async function removeMember(
  ownerUid: string,
  groupId: string,
  memberUid: string
): Promise<void> {
  const group = await fetchGroup(groupId);
  if (!group || group.ownerId !== ownerUid) {
    throw new Error('Alleen de eigenaar kan leden verwijderen');
  }
  if (memberUid === ownerUid) {
    throw new Error('Je kunt jezelf niet verwijderen');
  }

  await updateDoc(doc(db, 'groups', groupId), {
    [`members.${memberUid}`]: deleteField(),
  });

  await updateDoc(doc(db, 'users', memberUid), { groupId: deleteField() }).catch(() => {});
}
