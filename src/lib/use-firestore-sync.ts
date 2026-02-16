'use client';

import { useEffect, useRef, useCallback } from 'react';
import { User } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';
import { useAppStore } from './store';
import { Group } from './types';
import {
  uploadAllToFirestore,
  downloadFromFirestore,
  syncCollectionToFirestore,
  syncGroupCollection,
} from './firestore-sync';
import {
  fetchUserGroupId,
  fetchGroup,
  downloadGroupMasterData,
  downloadPersonalMasterData,
  fetchSharedTrips,
} from './group-sync';
import { Category } from './types';

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

  // Stable sync function for writing changes to Firestore
  const syncToFirestore = useCallback(
    async (uid: string) => {
      try {
        const state = useAppStore.getState();
        const group = state.currentGroup;

        if (group) {
          // Group mode: master data → group path, trips → user path
          await Promise.all([
            syncGroupCollection(group.id, 'categories', state.categories),
            syncGroupCollection(group.id, 'masterItems', state.masterItems),
            syncGroupCollection(group.id, 'customActivities', state.customActivities),
            syncCollectionToFirestore(uid, 'trips', state.trips),
            syncCollectionToFirestore(uid, 'tripItems', state.tripItems),
          ]);
        } else {
          // Personal mode: everything → user path
          await Promise.all([
            syncCollectionToFirestore(uid, 'categories', state.categories),
            syncCollectionToFirestore(uid, 'masterItems', state.masterItems),
            syncCollectionToFirestore(uid, 'customActivities', state.customActivities),
            syncCollectionToFirestore(uid, 'trips', state.trips),
            syncCollectionToFirestore(uid, 'tripItems', state.tripItems),
          ]);
        }
      } catch (error) {
        console.error('Firestore sync write failed:', error);
      }
    },
    []
  );

  // Refresh all data when app becomes visible — downloads fresh data from
  // Firestore to pick up changes made in other browsers/devices/group members.
  // CRITICAL: We cancel (not flush) any pending stale writes to avoid
  // overwriting Firestore with outdated local state.
  // NOTE: We always check group membership from Firestore (not local state)
  // because currentGroup is not persisted in localStorage and may be null
  // even when the user belongs to a group.
  const refreshOnVisibility = useCallback(
    async (uid: string) => {
      if (isSyncingRef.current) return;

      // Cancel any pending stale writes — do NOT flush them.
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
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
        // Step 1: Check if user belongs to a group
        const groupId = await fetchUserGroupId(user!.uid);

        if (cancelled) return;

        if (groupId) {
          // Group mode
          const [group, groupMasterData, personalData, personalMasterItems] = await Promise.all([
            fetchGroup(groupId),
            downloadGroupMasterData(groupId),
            downloadFromFirestore(user!.uid),
            downloadPersonalMasterData(user!.uid),
          ]);

          if (cancelled) return;

          if (group) {
            // Find personal items not in the group (by name, case-insensitive)
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
          // Personal mode (existing logic)
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
          prevHashRef.current = hashState(useAppStore.getState());
          isSyncingRef.current = false;
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
      if (isSyncingRef.current) return;

      const currentHash = hashState(state);
      if (currentHash === prevHashRef.current) return;
      prevHashRef.current = currentHash;

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = setTimeout(() => {
        syncToFirestore(user.uid);
      }, 2000);
    });

    return () => {
      unsubscribe();
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [user, syncToFirestore]);

  // Re-download from Firestore when app becomes visible (tab/PWA focus)
  // This ensures changes from other browsers/devices/group members are picked up
  useEffect(() => {
    if (!user) return;

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        refreshOnVisibility(user.uid);
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [user, refreshOnVisibility]);

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
  masterItems: { id: string; name: string; categoryId: string }[];
  customActivities: { id: string; name: string }[];
  trips: { id: string; name: string; status: string; destination: string; startDate: string; endDate: string; temperature: string; duration: string; peopleCount: number; activities: string[]; notes?: string; groupId?: string; sharedWith?: string[]; permissions?: Record<string, string> }[];
  tripItems: { id: string; name: string; checked: boolean; purchased?: boolean; quantity?: number; sortOrder?: number; notes?: string; categoryId: string }[];
}): string {
  const c = state.categories.map((x) => `${x.id}:${x.name}:${x.sortOrder}`).join(',');
  const m = state.masterItems.map((x) => `${x.id}:${x.name}:${x.categoryId}`).join(',');
  const ca = state.customActivities.map((x) => `${x.id}:${x.name}`).join(',');
  const t = state.trips
    .map((x) => `${x.id}:${x.name}:${x.status}:${x.destination}:${x.startDate}:${x.endDate}:${x.temperature}:${x.duration}:${x.peopleCount}:${x.activities.join('+')}:${x.notes ?? ''}:${x.groupId ?? ''}:${(x.sharedWith ?? []).join('+')}:${JSON.stringify(x.permissions ?? {})}`)
    .join(',');
  const ti = state.tripItems
    .map((x) => `${x.id}:${x.name}:${x.checked ? 1 : 0}:${x.purchased ? 1 : 0}:${x.quantity ?? 1}:${x.sortOrder ?? 0}:${x.notes ?? ''}:${x.categoryId}`)
    .join(',');
  return `${c}|${m}|${ca}|${t}|${ti}`;
}
