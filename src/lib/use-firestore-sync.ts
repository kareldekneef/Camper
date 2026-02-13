'use client';

import { useEffect, useRef, useCallback } from 'react';
import { User } from 'firebase/auth';
import { useAppStore } from './store';
import {
  uploadAllToFirestore,
  downloadFromFirestore,
  syncCollectionToFirestore,
} from './firestore-sync';

export function useFirestoreSync(user: User | null) {
  const isSyncingRef = useRef(false);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevHashRef = useRef('');

  // Stable sync function for writing changes to Firestore
  const syncToFirestore = useCallback(
    async (uid: string) => {
      try {
        const state = useAppStore.getState();
        await Promise.all([
          syncCollectionToFirestore(uid, 'categories', state.categories),
          syncCollectionToFirestore(uid, 'masterItems', state.masterItems),
          syncCollectionToFirestore(uid, 'trips', state.trips),
          syncCollectionToFirestore(uid, 'tripItems', state.tripItems),
        ]);
      } catch (error) {
        console.error('Firestore sync write failed:', error);
        // Silently fail — data is still in localStorage
      }
    },
    []
  );

  // On sign-in: download or migrate
  useEffect(() => {
    if (!user) {
      // Reset hash when user signs out so next sign-in gets a clean start
      prevHashRef.current = '';
      return;
    }

    let cancelled = false;

    async function initSync() {
      isSyncingRef.current = true;
      try {
        const firestoreData = await downloadFromFirestore(user!.uid);

        if (cancelled) return;

        if (firestoreData === null) {
          // First sign-in: Firestore is empty → upload localStorage data
          await uploadAllToFirestore(user!.uid);
        } else {
          // Firestore has data → load it into Zustand (replaces localStorage state)
          useAppStore.setState({
            categories: firestoreData.categories,
            masterItems: firestoreData.masterItems,
            trips: firestoreData.trips,
            tripItems: firestoreData.tripItems,
          });
        }
      } catch (error) {
        console.error('Firestore sync init failed:', error);
        // App continues working with localStorage data
      } finally {
        if (!cancelled) {
          // Set initial hash to prevent immediate re-sync
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
      // Don't sync while initial download is in progress
      if (isSyncingRef.current) return;

      // Change detection via lightweight hash
      const currentHash = hashState(state);
      if (currentHash === prevHashRef.current) return;
      prevHashRef.current = currentHash;

      // Debounce: wait 2 seconds after last change before syncing
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
}

function hashState(state: {
  categories: { id: string; sortOrder: number }[];
  masterItems: { id: string; name: string }[];
  trips: { id: string; status: string }[];
  tripItems: { id: string; checked: boolean; quantity?: number; sortOrder?: number }[];
}): string {
  // Lightweight hash: captures additions, deletions, and common mutations
  const c = state.categories.map((x) => `${x.id}:${x.sortOrder}`).join(',');
  const m = state.masterItems.map((x) => `${x.id}:${x.name}`).join(',');
  const t = state.trips.map((x) => `${x.id}:${x.status}`).join(',');
  const ti = state.tripItems
    .map((x) => `${x.id}:${x.checked ? 1 : 0}:${x.quantity ?? 1}:${x.sortOrder ?? 0}`)
    .join(',');
  return `${c}|${m}|${t}|${ti}`;
}
