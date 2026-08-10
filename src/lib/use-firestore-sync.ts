'use client';

import { useEffect, useRef, useCallback } from 'react';
import { User } from 'firebase/auth';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { useAppStore } from './store';
import { Group, Trip, TripItem } from './types';
import {
  uploadAllToFirestore,
  downloadFromFirestore,
  syncCollectionToFirestore,
  syncGroupCollection,
  syncTripItemsStatus,
} from './firestore-sync';
import {
  fetchUserGroupIds,
  fetchUserActiveGroupId,
  fetchUserGroups,
  downloadGroupMasterData,
  downloadPersonalMasterData,
  fetchSharedTrips,
} from './group-sync';
import { Category } from './types';

const PENDING_SYNC_KEY = 'camperpack-pending-sync';

// Migrate category names from Firestore (e.g. "Shopping / Voorbereiding" → "Shopping")
function migrateCategories(categories: Category[]): Category[] {
  return categories.map((c) =>
    c.name.toLowerCase().includes('voorbereiding')
      ? { ...c, name: 'Shopping' }
      : c
  );
}

// Fetch every group a user belongs to, plus which one is "active" (the one
// whose master list is mirrored into local state). Falls back gracefully
// when the stored active group id no longer resolves to a real group.
async function loadUserGroups(uid: string): Promise<{ groups: Group[]; activeGroup: Group | null }> {
  const groupIds = await fetchUserGroupIds(uid);
  if (groupIds.length === 0) return { groups: [], activeGroup: null };

  const [groups, activeGroupId] = await Promise.all([
    fetchUserGroups(groupIds),
    fetchUserActiveGroupId(uid),
  ]);

  if (groups.length === 0) return { groups: [], activeGroup: null };

  const activeGroup = groups.find((g) => g.id === activeGroupId) ?? groups[0];
  return { groups, activeGroup };
}

// Fetch shared trips/tripItems from every member across every group the user is in.
async function loadAllSharedTrips(
  groups: Group[],
  uid: string
): Promise<{ trips: Trip[]; tripItems: TripItem[] }> {
  const results = await Promise.all(
    groups.map((group) => {
      const otherUids = Object.keys(group.members).filter((id) => id !== uid);
      return otherUids.length > 0
        ? fetchSharedTrips(group.id, uid, otherUids)
        : Promise.resolve({ trips: [], tripItems: [] });
    })
  );
  return {
    trips: results.flatMap((r) => r.trips),
    tripItems: results.flatMap((r) => r.tripItems),
  };
}

export function useFirestoreSync(user: User | null) {
  const isSyncingRef = useRef(false);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevHashRef = useRef('');
  const groupIdsKey = useAppStore((s) => s.groups.map((g) => g.id).join(','));

  // Dirty tracking for single-user reliability
  const dirtyRef = useRef(false);

  // Per-item dirty tracking for concurrent-safe surgical writes
  const dirtyItemIdsRef = useRef(new Set<string>());
  const needsFullTripItemSyncRef = useRef(false);
  const prevTripItemMapRef = useRef<Map<string, TripItem>>(
    new Map(useAppStore.getState().tripItems.map((i) => [i.id, i]))
  );

  // Classifies tripItem changes into surgical (status fields) vs structural (schema/add/delete).
  // Always called from subscriber context (not during downloads).
  function classifyTripItemChanges(newItems: TripItem[]) {
    const prevMap = prevTripItemMapRef.current;
    const newMap = new Map(newItems.map((i) => [i.id, i]));

    for (const [id, newItem] of newMap) {
      const prev = prevMap.get(id);
      if (!prev) {
        needsFullTripItemSyncRef.current = true;
      } else {
        if (
          prev.checked !== newItem.checked ||
          prev.purchased !== newItem.purchased ||
          prev.skipped !== newItem.skipped ||
          (prev.quantity ?? 1) !== (newItem.quantity ?? 1) ||
          (prev.notes ?? '') !== (newItem.notes ?? '') ||
          (prev.weight ?? 0) !== (newItem.weight ?? 0)
        ) {
          dirtyItemIdsRef.current.add(id);
        }
        if (
          prev.name !== newItem.name ||
          prev.categoryId !== newItem.categoryId ||
          (prev.sortOrder ?? 0) !== (newItem.sortOrder ?? 0) ||
          prev.tripId !== newItem.tripId ||
          prev.isCustom !== newItem.isCustom
        ) {
          needsFullTripItemSyncRef.current = true;
        }
      }
    }
    for (const id of prevMap.keys()) {
      if (!newMap.has(id)) needsFullTripItemSyncRef.current = true;
    }

    prevTripItemMapRef.current = newMap;
  }

  // Resets per-item classification baseline after a successful sync or download.
  function resetTripItemBaseline() {
    prevTripItemMapRef.current = new Map(
      useAppStore.getState().tripItems.map((i) => [i.id, i])
    );
    dirtyItemIdsRef.current = new Set();
    needsFullTripItemSyncRef.current = false;
  }

  // Stable sync function for writing changes to Firestore.
  // Uses surgical updates for pure status-field changes (packed/purchased/quantity/notes)
  // to avoid overwriting concurrent changes from other group members on different items.
  const syncToFirestore = useCallback(
    async (uid: string) => {
      if (isSyncingRef.current) return;
      isSyncingRef.current = true;

      // Snapshot classification state before acquiring any async locks
      const dirtyIds = new Set(dirtyItemIdsRef.current);
      const fullSyncNeeded = needsFullTripItemSyncRef.current;

      try {
        const state = useAppStore.getState();
        const writtenHash = hashState(state);
        const group = state.currentGroup;

        // Use surgical update when only status fields changed; full sync for structural changes
        const tripItemsSync =
          fullSyncNeeded || dirtyIds.size === 0
            ? syncCollectionToFirestore(uid, 'tripItems', state.tripItems)
            : syncTripItemsStatus(uid, state.tripItems, dirtyIds);

        if (group) {
          await Promise.all([
            syncGroupCollection(group.id, 'categories', state.categories),
            syncGroupCollection(group.id, 'masterItems', state.masterItems),
            syncGroupCollection(group.id, 'customActivities', state.customActivities),
            syncCollectionToFirestore(uid, 'trips', state.trips),
            tripItemsSync,
          ]);
        } else {
          await Promise.all([
            syncCollectionToFirestore(uid, 'categories', state.categories),
            syncCollectionToFirestore(uid, 'masterItems', state.masterItems),
            syncCollectionToFirestore(uid, 'customActivities', state.customActivities),
            syncCollectionToFirestore(uid, 'trips', state.trips),
            tripItemsSync,
          ]);
        }

        // Post-write: did state change while we were writing?
        const currentHash = hashState(useAppStore.getState());
        if (currentHash === writtenHash) {
          dirtyRef.current = false;
          localStorage.removeItem(PENDING_SYNC_KEY);
        } else {
          // Changes arrived during the write — queue a follow-up sync
          debounceTimerRef.current = setTimeout(() => syncToFirestore(uid), 300);
        }

        resetTripItemBaseline();
      } catch (error) {
        console.error('Firestore sync write failed:', error);
        // All dirty flags remain set — retried on next visibilitychange (Scenario C)
      } finally {
        isSyncingRef.current = false;
      }
    },
    []
  );

  // Refresh all data when app becomes visible — downloads fresh data from
  // Firestore to pick up changes made in other browsers/devices/group members.
  // NOTE: We always check group membership from Firestore (not local state)
  // because currentGroup is not persisted in localStorage and may be null
  // even when the user belongs to a group.
  const refreshOnVisibility = useCallback(
    async (uid: string) => {
      if (isSyncingRef.current) return;

      // Flush any pending local changes to Firestore BEFORE downloading fresh
      // data. Covers: pending debounce timer, changes missed during an in-flight
      // write, and previously failed writes (Scenarios A, B, C).
      const needsFlush = debounceTimerRef.current !== null || dirtyRef.current;
      if (needsFlush) {
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
          debounceTimerRef.current = null;
        }
        await syncToFirestore(uid);
      }

      isSyncingRef.current = true;
      try {
        // Always check group membership from Firestore — don't trust local state
        const { groups, activeGroup } = await loadUserGroups(uid);

        if (activeGroup) {
          // Group mode: refresh active group's master data + own trips + shared trips from all groups
          const [groupData, personalData, shared] = await Promise.all([
            downloadGroupMasterData(activeGroup.id),
            downloadFromFirestore(uid),
            loadAllSharedTrips(groups, uid),
          ]);

          useAppStore.setState({
            currentGroup: activeGroup,
            groups,
            categories: migrateCategories(groupData.categories),
            masterItems: groupData.masterItems,
            customActivities: groupData.customActivities,
            trips: personalData?.trips ?? [],
            tripItems: personalData?.tripItems ?? [],
            sharedTrips: shared.trips,
            sharedTripItems: shared.tripItems,
          });
        } else {
          // Personal mode: refresh everything from Firestore
          const firestoreData = await downloadFromFirestore(uid);
          if (firestoreData) {
            useAppStore.setState({
              categories: migrateCategories(firestoreData.categories),
              masterItems: firestoreData.masterItems,
              customActivities: firestoreData.customActivities ?? [],
              trips: firestoreData.trips,
              tripItems: firestoreData.tripItems,
              currentGroup: null,
              groups: [],
              sharedTrips: [],
              sharedTripItems: [],
            });
          }
        }

        resetTripItemBaseline();
        prevHashRef.current = hashState(useAppStore.getState());
      } catch (error) {
        console.error('Visibility refresh failed:', error);
      } finally {
        isSyncingRef.current = false;
      }
    },
    []
  );

  // On sign-in: download or migrate
  useEffect(() => {
    if (!user) {
      prevHashRef.current = '';
      useAppStore.setState({
        currentGroup: null,
        groups: [],
        sharedTrips: [],
        sharedTripItems: [],
        personalBackupItems: [],
      });
      return;
    }

    let cancelled = false;

    async function initSync() {
      isSyncingRef.current = true;
      try {
        // Ensure the root users/{uid} doc exists with basic profile info — needed so the
        // admin panel can discover and identify every signed-in user, not just group members
        // (group membership used to be the only thing that ever wrote this doc).
        setDoc(
          doc(db, 'users', user!.uid),
          {
            displayName: user!.displayName ?? null,
            email: user!.email ?? null,
            photoURL: user!.photoURL ?? null,
          },
          { merge: true }
        ).catch((error) => console.error('Failed to write user profile:', error));

        // Upload-first when there are unconfirmed local changes (Scenario A: iOS PWA killed
        // before debounce fired; flag survived the page reload via localStorage).
        const hasPendingSync = localStorage.getItem(PENDING_SYNC_KEY) === '1';

        // Step 1: Determine group membership (needed before any upload,
        // since upload path depends on whether user is in a group).
        let { groups, activeGroup } = await loadUserGroups(user!.uid);
        if (cancelled) return;

        if (activeGroup) {
          // Group mode
          if (hasPendingSync) {
            // Temporarily set currentGroup so syncToFirestore writes to the right path.
            // isSyncingRef is true here, so the subscriber sees this setState but only
            // marks dirty (no spurious debounce queued).
            useAppStore.setState({ currentGroup: activeGroup, groups });
            isSyncingRef.current = false; // release so syncToFirestore can proceed
            await syncToFirestore(user!.uid);
            isSyncingRef.current = true;  // re-acquire for download phase
            if (cancelled) return;
            // The write above may have touched group membership indirectly elsewhere —
            // re-resolve in case anything changed while we were writing.
            ({ groups, activeGroup } = await loadUserGroups(user!.uid));
            if (cancelled) return;

            if (!activeGroup) {
              // Left every group during the flush (e.g. from another device) —
              // fall back to personal mode.
              const firestoreData = await downloadFromFirestore(user!.uid);
              if (cancelled) return;
              if (firestoreData === null) {
                await uploadAllToFirestore(user!.uid);
              } else {
                useAppStore.setState({
                  categories: migrateCategories(firestoreData.categories),
                  masterItems: firestoreData.masterItems,
                  customActivities: firestoreData.customActivities ?? [],
                  trips: firestoreData.trips,
                  tripItems: firestoreData.tripItems,
                  currentGroup: null,
                  groups: [],
                  sharedTrips: [],
                  sharedTripItems: [],
                  personalBackupItems: [],
                });
              }
              return;
            }
          }

          const [groupMasterData, personalData, personalMasterItems, shared] = await Promise.all([
            downloadGroupMasterData(activeGroup.id),
            downloadFromFirestore(user!.uid),
            downloadPersonalMasterData(user!.uid),
            loadAllSharedTrips(groups, user!.uid),
          ]);

          if (cancelled) return;

          const groupItemNames = new Set(
            groupMasterData.masterItems.map((i) => i.name.toLowerCase())
          );
          const backupItems = personalMasterItems.filter(
            (i) => !groupItemNames.has(i.name.toLowerCase())
          );

          useAppStore.setState({
            currentGroup: activeGroup,
            groups,
            categories: migrateCategories(groupMasterData.categories),
            masterItems: groupMasterData.masterItems,
            customActivities: groupMasterData.customActivities,
            trips: personalData?.trips ?? [],
            tripItems: personalData?.tripItems ?? [],
            personalBackupItems: backupItems,
            sharedTrips: shared.trips,
            sharedTripItems: shared.tripItems,
          });
        } else {
          // Personal mode
          if (hasPendingSync) {
            isSyncingRef.current = false;
            await syncToFirestore(user!.uid);
            isSyncingRef.current = true;
            if (cancelled) return;
          }

          const firestoreData = await downloadFromFirestore(user!.uid);

          if (cancelled) return;

          if (firestoreData === null) {
            await uploadAllToFirestore(user!.uid);
          } else {
            useAppStore.setState({
              categories: migrateCategories(firestoreData.categories),
              masterItems: firestoreData.masterItems,
              customActivities: firestoreData.customActivities ?? [],
              trips: firestoreData.trips,
              tripItems: firestoreData.tripItems,
              currentGroup: null,
              groups: [],
              sharedTrips: [],
              sharedTripItems: [],
              personalBackupItems: [],
            });
          }
        }
      } catch (error) {
        console.error('Firestore sync init failed:', error);
      } finally {
        if (!cancelled) {
          resetTripItemBaseline();
          prevHashRef.current = hashState(useAppStore.getState());
          isSyncingRef.current = false;
          // Apply default weights to items missing them — triggers subscriber → queues sync
          useAppStore.getState().applyDefaultWeights();
        }
      }
    }

    initSync();

    return () => {
      cancelled = true;
    };
  }, [user]);

  // Subscribe to Zustand changes → debounced write to Firestore
  useEffect(() => {
    if (!user) return;

    const unsubscribe = useAppStore.subscribe((state) => {
      const currentHash = hashState(state);

      if (isSyncingRef.current) {
        // A write or download is in progress. Classify changes for the next write
        // but don't queue a debounce (syncToFirestore's post-write check handles it).
        if (currentHash !== prevHashRef.current) {
          dirtyRef.current = true;
          localStorage.setItem(PENDING_SYNC_KEY, '1');
          classifyTripItemChanges(state.tripItems);
        }
        return;
      }

      if (currentHash === prevHashRef.current) return;
      prevHashRef.current = currentHash;

      // Set dirty BEFORE queueing debounce so a page-kill during the 300ms window
      // (Scenario A) still has the flag set in localStorage.
      dirtyRef.current = true;
      localStorage.setItem(PENDING_SYNC_KEY, '1');
      classifyTripItemChanges(state.tripItems);

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = setTimeout(() => {
        syncToFirestore(user.uid);
      }, 300);
    });

    return () => {
      unsubscribe();
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [user, syncToFirestore]);

  // Re-download from Firestore when app becomes visible (tab/PWA focus).
  // Also flushes immediately on 'hidden' so the write can start before iOS suspends JS.
  useEffect(() => {
    if (!user) return;

    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        // App going to background — start write immediately (fire-and-forget).
        // This gives the Firestore write maximum time to complete before iOS
        // freezes JS execution. PENDING_SYNC_KEY in localStorage ensures a retry
        // on next initSync if iOS kills the page before the write finishes.
        if (debounceTimerRef.current || dirtyRef.current) {
          if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
            debounceTimerRef.current = null;
          }
          syncToFirestore(user.uid);
        }
      } else if (document.visibilityState === 'visible') {
        refreshOnVisibility(user.uid);
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [user, syncToFirestore, refreshOnVisibility]);

  // Real-time listeners on every group document the user belongs to —
  // detect new members (and other live changes) instantly, in any group.
  useEffect(() => {
    if (!user || !groupIdsKey) return;
    const groupIds = groupIdsKey.split(',').filter(Boolean);
    if (groupIds.length === 0) return;

    const unsubscribes = groupIds.map((groupId) =>
      onSnapshot(
        doc(db, 'groups', groupId),
        (snapshot) => {
          if (!snapshot.exists()) return;

          const freshGroup = { id: snapshot.id, ...snapshot.data() } as Group;
          const state = useAppStore.getState();
          const staleGroup = state.groups.find((g) => g.id === groupId);
          if (!staleGroup) return;

          // Compare old and new member UIDs to find who just joined
          const oldUids = new Set(Object.keys(staleGroup.members));
          const newUids = Object.keys(freshGroup.members);
          const justJoined = newUids.filter((uid) => !oldUids.has(uid));

          // Update the group in the store (and currentGroup, if it's the active one)
          isSyncingRef.current = true;
          useAppStore.setState({
            groups: state.groups.map((g) => (g.id === groupId ? freshGroup : g)),
            currentGroup: state.currentGroup?.id === groupId ? freshGroup : state.currentGroup,
          });

          // Flag new members (only if there are actually new ones)
          if (justJoined.length > 0) {
            useAppStore.setState({ newMemberUids: justJoined });

            // Auto-clear the "Nieuw" badge after 10 seconds
            setTimeout(() => {
              useAppStore.setState({ newMemberUids: [] });
            }, 10000);
          }

          prevHashRef.current = hashState(useAppStore.getState());
          isSyncingRef.current = false;
        },
        (error) => {
          console.error('Group snapshot listener error:', error);
          // We lose read access the moment we're removed from a group (or it's
          // deleted) — the listener errors instead of delivering an update, so
          // clean up locally ourselves rather than leaving stale membership.
          if ((error as { code?: string }).code === 'permission-denied') {
            const state = useAppStore.getState();
            const removedTripIds = new Set(
              state.sharedTrips.filter((t) => t.groupId === groupId).map((t) => t.id)
            );
            const remainingGroups = state.groups.filter((g) => g.id !== groupId);
            useAppStore.setState({
              groups: remainingGroups,
              currentGroup: state.currentGroup?.id === groupId ? remainingGroups[0] ?? null : state.currentGroup,
              sharedTrips: state.sharedTrips.filter((t) => t.groupId !== groupId),
              sharedTripItems: state.sharedTripItems.filter((ti) => !removedTripIds.has(ti.tripId)),
            });
          }
        }
      )
    );

    return () => unsubscribes.forEach((unsub) => unsub());
  }, [user, groupIdsKey]);
}

function hashState(state: {
  categories: { id: string; name: string; sortOrder: number }[];
  masterItems: { id: string; name: string; categoryId: string; weight?: number }[];
  customActivities: { id: string; name: string }[];
  trips: { id: string; name: string; status: string; destination: string; startDate: string; endDate: string; temperature: string; duration: string; peopleCount: number; activities: string[]; notes?: string; groupId?: string; sharedWith?: string[]; permissions?: Record<string, string> }[];
  tripItems: { id: string; name: string; checked: boolean; purchased?: boolean; skipped?: boolean; quantity?: number; sortOrder?: number; notes?: string; categoryId: string; weight?: number }[];
}): string {
  const c = state.categories.map((x) => `${x.id}:${x.name}:${x.sortOrder}`).join(',');
  const m = state.masterItems.map((x) => `${x.id}:${x.name}:${x.categoryId}:${x.weight ?? 0}`).join(',');
  const ca = state.customActivities.map((x) => `${x.id}:${x.name}`).join(',');
  const t = state.trips
    .map((x) => `${x.id}:${x.name}:${x.status}:${x.destination}:${x.startDate}:${x.endDate}:${x.temperature}:${x.duration}:${x.peopleCount}:${x.activities.join('+')}:${x.notes ?? ''}:${x.groupId ?? ''}:${(x.sharedWith ?? []).join('+')}:${JSON.stringify(x.permissions ?? {})}`)
    .join(',');
  const ti = state.tripItems
    .map((x) => `${x.id}:${x.name}:${x.checked ? 1 : 0}:${x.purchased ? 1 : 0}:${x.skipped ? 1 : 0}:${x.quantity ?? 1}:${x.sortOrder ?? 0}:${x.notes ?? ''}:${x.categoryId}:${x.weight ?? 0}`)
    .join(',');
  return `${c}|${m}|${ca}|${t}|${ti}`;
}
