'use client';

import { useEffect, useRef, useCallback } from 'react';
import { User } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';
import { useAppStore } from './store';
import { Group, TripItem } from './types';
import {
  uploadAllToFirestore,
  downloadFromFirestore,
  syncCollectionToFirestore,
  syncGroupCollection,
  syncTripItemsStatus,
} from './firestore-sync';
import {
  fetchUserGroupId,
  fetchGroup,
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

export function useFirestoreSync(user: User | null) {
  const isSyncingRef = useRef(false);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevHashRef = useRef('');
  const currentGroupId = useAppStore((s) => s.currentGroup?.id ?? null);

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
        const groupId = await fetchUserGroupId(uid);

        if (groupId) {
          // Group mode: refresh group + master data + own trips + shared trips
          const [freshGroup, groupData, personalData] = await Promise.all([
            fetchGroup(groupId),
            downloadGroupMasterData(groupId),
            downloadFromFirestore(uid),
          ]);

          if (!freshGroup) return;

          const otherUids = Object.keys(freshGroup.members).filter((id) => id !== uid);
          const shared = otherUids.length > 0
            ? await fetchSharedTrips(groupId, uid, otherUids)
            : { trips: [], tripItems: [] };

          useAppStore.setState({
            currentGroup: freshGroup,
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
        // Upload-first when there are unconfirmed local changes (Scenario A: iOS PWA killed
        // before debounce fired; flag survived the page reload via localStorage).
        const hasPendingSync = localStorage.getItem(PENDING_SYNC_KEY) === '1';

        // Step 1: Determine group membership (needed before any upload,
        // since upload path depends on whether user is in a group).
        const groupId = await fetchUserGroupId(user!.uid);
        if (cancelled) return;

        if (groupId) {
          // Group mode
          let preloadedGroup: Group | null = null;

          if (hasPendingSync) {
            preloadedGroup = await fetchGroup(groupId);
            if (cancelled) return;
            if (preloadedGroup) {
              // Temporarily set currentGroup so syncToFirestore writes to the right path.
              // isSyncingRef is true here, so the subscriber sees this setState but only
              // marks dirty (no spurious debounce queued).
              useAppStore.setState({ currentGroup: preloadedGroup });
              isSyncingRef.current = false; // release so syncToFirestore can proceed
              await syncToFirestore(user!.uid);
              isSyncingRef.current = true;  // re-acquire for download phase
              if (cancelled) return;
            }
          }

          const [group, groupMasterData, personalData, personalMasterItems] = await Promise.all([
            preloadedGroup ? Promise.resolve(preloadedGroup) : fetchGroup(groupId),
            downloadGroupMasterData(groupId),
            downloadFromFirestore(user!.uid),
            downloadPersonalMasterData(user!.uid),
          ]);

          if (cancelled) return;

          if (group) {
            const groupItemNames = new Set(
              groupMasterData.masterItems.map((i) => i.name.toLowerCase())
            );
            const backupItems = personalMasterItems.filter(
              (i) => !groupItemNames.has(i.name.toLowerCase())
            );

            useAppStore.setState({
              currentGroup: group,
              categories: migrateCategories(groupMasterData.categories),
              masterItems: groupMasterData.masterItems,
              customActivities: groupMasterData.customActivities,
              trips: personalData?.trips ?? [],
              tripItems: personalData?.tripItems ?? [],
              personalBackupItems: backupItems,
            });

            // Fetch shared trips from other group members
            const otherUids = Object.keys(group.members).filter(
              (uid) => uid !== user!.uid
            );
            if (otherUids.length > 0) {
              const shared = await fetchSharedTrips(group.id, user!.uid, otherUids);
              if (!cancelled) {
                useAppStore.setState({
                  sharedTrips: shared.trips,
                  sharedTripItems: shared.tripItems,
                });
              }
            }
          }
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

  // Real-time listener on group document — detect new members instantly
  useEffect(() => {
    if (!user || !currentGroupId) return;

    const groupRef = doc(db, 'groups', currentGroupId);

    const unsubscribe = onSnapshot(
      groupRef,
      (snapshot) => {
        if (!snapshot.exists()) return;

        const freshGroup = { id: snapshot.id, ...snapshot.data() } as Group;
        const currentGroup = useAppStore.getState().currentGroup;
        if (!currentGroup) return;

        // Compare old and new member UIDs to find who just joined
        const oldUids = new Set(Object.keys(currentGroup.members));
        const newUids = Object.keys(freshGroup.members);
        const justJoined = newUids.filter((uid) => !oldUids.has(uid));

        // Update the group in the store
        isSyncingRef.current = true;
        useAppStore.setState({ currentGroup: freshGroup });

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
      }
    );

    return () => unsubscribe();
  }, [user, currentGroupId]);
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
