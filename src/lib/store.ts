import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuid } from 'uuid';
import {
  Category,
  CustomActivity,
  MasterItem,
  Trip,
  TripItem,
  TripPermission,
  Temperature,
  Duration,
  Activity,
  Group,
} from './types';
import { defaultCategories, defaultMasterItems } from './seed-data';

interface AppState {
  categories: Category[];
  masterItems: MasterItem[];
  trips: Trip[];
  tripItems: TripItem[];
  customActivities: CustomActivity[];
  initialized: boolean;

  // Shared trips notification tracking (persisted)
  seenSharedTripIds: string[];

  // Group state (not persisted to localStorage)
  currentGroup: Group | null;
  sharedTrips: Trip[];
  sharedTripItems: TripItem[];
  personalBackupItems: MasterItem[];
  newMemberUids: string[]; // UIDs of recently joined members (for "Nieuw" badge)

  // Init
  initialize: () => void;

  // Categories
  addCategory: (name: string, icon: string) => void;
  updateCategory: (id: string, name: string, icon: string) => void;
  deleteCategory: (id: string) => void;
  reorderCategories: (categories: Category[]) => void;

  // Master items
  addMasterItem: (item: Omit<MasterItem, 'id'>) => void;
  updateMasterItem: (id: string, item: Partial<MasterItem>) => void;
  deleteMasterItem: (id: string) => void;
  reorderMasterItems: (categoryId: string, orderedIds: string[]) => void;

  // Custom Activities
  addCustomActivity: (name: string, icon: string) => void;
  updateCustomActivity: (id: string, name: string, icon: string) => void;
  deleteCustomActivity: (id: string) => void;

  // Trips
  createTrip: (params: {
    name: string;
    destination: string;
    startDate: string;
    endDate: string;
    temperature: Temperature;
    duration: Duration;
    peopleCount: number;
    activities: Activity[];
    creatorId?: string;
    shareWithGroup?: boolean;
    permissions?: Record<string, TripPermission>;
  }) => string;
  updateTrip: (id: string, updates: Partial<Trip>) => void;
  deleteTrip: (id: string) => void;
  copyTrip: (tripId: string, newName: string) => string;
  regenerateTripItems: (
    tripId: string,
    newParams: { temperature: Temperature; duration: Duration; peopleCount: number; activities: Activity[] }
  ) => { added: number; removed: number };

  // Groups
  setCurrentGroup: (group: Group | null) => void;
  setSharedTrips: (trips: Trip[], tripItems: TripItem[]) => void;
  setPersonalBackupItems: (items: MasterItem[]) => void;
  addPersonalItemToGroup: (itemId: string) => void;
  markSharedTripsSeen: () => void;
  setNewMemberUids: (uids: string[]) => void;
  clearNewMemberUids: () => void;

  // Trip items
  toggleTripItem: (itemId: string) => void;
  togglePurchased: (itemId: string) => void;
  addTripItem: (tripId: string, name: string, categoryId: string, quantity?: number) => void;
  updateTripItem: (itemId: string, updates: Partial<TripItem>) => void;
  deleteTripItem: (itemId: string) => void;
  saveTripItemToMaster: (itemId: string) => void;
  uncheckAllTripItems: (tripId: string) => void;
  reorderTripItems: (tripId: string, categoryId: string, orderedIds: string[]) => void;
  copyItemToShopping: (itemId: string) => void;
}

export function shouldIncludeItem(
  item: MasterItem,
  temperature: Temperature,
  duration: Duration,
  peopleCount: number,
  activities: Activity[]
): boolean {
  const { conditions } = item;

  if (conditions.weather && conditions.weather.length > 0) {
    if (!conditions.weather.includes(temperature)) return false;
  }

  if (conditions.activities && conditions.activities.length > 0) {
    if (!conditions.activities.some((a) => activities.includes(a))) return false;
  }

  if (conditions.minPeople && peopleCount < conditions.minPeople) return false;

  if (conditions.minDuration) {
    const durationOrder: Record<Duration, number> = {
      weekend: 0,
      week: 1,
      extended: 2,
    };
    if (durationOrder[duration] < durationOrder[conditions.minDuration])
      return false;
  }

  return true;
}

export function calculateQuantity(
  masterItem: MasterItem,
  peopleCount: number
): number {
  const base = masterItem.quantity ?? 1;
  return masterItem.perPerson ? base * peopleCount : base;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      categories: [],
      masterItems: [],
      trips: [],
      tripItems: [],
      customActivities: [],
      initialized: false,
      seenSharedTripIds: [],
      currentGroup: null,
      sharedTrips: [],
      sharedTripItems: [],
      personalBackupItems: [],
      newMemberUids: [],

      initialize: () => {
        const state = get();
        if (state.initialized) return;
        set({
          categories: defaultCategories,
          masterItems: defaultMasterItems,
          initialized: true,
        });
      },

      // Categories
      addCategory: (name, icon) => {
        const state = get();
        const maxOrder = Math.max(
          ...state.categories.map((c) => c.sortOrder),
          -1
        );
        set({
          categories: [
            ...state.categories,
            { id: uuid(), name, icon, sortOrder: maxOrder + 1 },
          ],
        });
      },

      updateCategory: (id, name, icon) => {
        set({
          categories: get().categories.map((c) =>
            c.id === id ? { ...c, name, icon } : c
          ),
        });
      },

      deleteCategory: (id) => {
        set({
          categories: get().categories.filter((c) => c.id !== id),
          masterItems: get().masterItems.filter((i) => i.categoryId !== id),
        });
      },

      reorderCategories: (categories) => {
        set({ categories });
      },

      // Master items
      addMasterItem: (item) => {
        const state = get();
        const catItems = state.masterItems.filter(
          (i) => i.categoryId === item.categoryId
        );
        const maxOrder = Math.max(
          ...catItems.map((i) => i.sortOrder ?? 0),
          -1
        );
        set({
          masterItems: [
            ...state.masterItems,
            { ...item, id: uuid(), sortOrder: maxOrder + 1 },
          ],
        });
      },

      updateMasterItem: (id, updates) => {
        set({
          masterItems: get().masterItems.map((i) =>
            i.id === id ? { ...i, ...updates } : i
          ),
        });
      },

      deleteMasterItem: (id) => {
        set({
          masterItems: get().masterItems.filter((i) => i.id !== id),
        });
      },

      reorderMasterItems: (categoryId, orderedIds) => {
        set({
          masterItems: get().masterItems.map((item) => {
            if (item.categoryId !== categoryId) return item;
            const index = orderedIds.indexOf(item.id);
            return index >= 0 ? { ...item, sortOrder: index } : item;
          }),
        });
      },

      // Custom Activities
      addCustomActivity: (name, icon) => {
        set({
          customActivities: [
            ...get().customActivities,
            { id: `custom_${uuid()}`, name, icon },
          ],
        });
      },

      updateCustomActivity: (id, name, icon) => {
        set({
          customActivities: get().customActivities.map((ca) =>
            ca.id === id ? { ...ca, name, icon } : ca
          ),
        });
      },

      deleteCustomActivity: (id) => {
        // Also remove from all master item conditions
        set({
          customActivities: get().customActivities.filter((ca) => ca.id !== id),
          masterItems: get().masterItems.map((mi) => {
            if (!mi.conditions.activities?.includes(id)) return mi;
            return {
              ...mi,
              conditions: {
                ...mi.conditions,
                activities: mi.conditions.activities.filter((a) => a !== id),
              },
            };
          }),
        });
      },

      // Trips
      createTrip: (params) => {
        const state = get();
        const tripId = uuid();
        const group = state.currentGroup;
        const { creatorId, shareWithGroup, permissions: paramPermissions, ...tripParams } = params;
        const trip: Trip = {
          id: tripId,
          ...tripParams,
          status: 'planning',
          createdAt: new Date().toISOString(),
          ...(group && shareWithGroup !== false
            ? {
                groupId: group.id,
                creatorId: creatorId,
                sharedWith: Object.keys(group.members),
                permissions: paramPermissions ?? Object.fromEntries(
                  Object.keys(group.members).map(uid => [uid, 'view' as const])
                ),
              }
            : {}),
        };

        let sortCounter = 0;
        const items: TripItem[] = state.masterItems
          .filter((mi) =>
            shouldIncludeItem(
              mi,
              params.temperature,
              params.duration,
              params.peopleCount,
              params.activities
            )
          )
          .map((mi) => ({
            id: uuid(),
            tripId,
            masterItemId: mi.id,
            name: mi.name,
            categoryId: mi.categoryId,
            checked: false,
            isCustom: false,
            quantity: calculateQuantity(mi, params.peopleCount),
            sortOrder: sortCounter++,
          }));

        set({
          trips: [...state.trips, trip],
          tripItems: [...state.tripItems, ...items],
        });

        return tripId;
      },

      updateTrip: (id, updates) => {
        set({
          trips: get().trips.map((t) =>
            t.id === id ? { ...t, ...updates } : t
          ),
        });
      },

      deleteTrip: (id) => {
        set({
          trips: get().trips.filter((t) => t.id !== id),
          tripItems: get().tripItems.filter((ti) => ti.tripId !== id),
        });
      },

      copyTrip: (tripId, newName) => {
        const state = get();
        const original = state.trips.find((t) => t.id === tripId);
        if (!original) return '';

        const newTripId = uuid();
        const newTrip: Trip = {
          ...original,
          id: newTripId,
          name: newName,
          status: 'planning',
          copiedFromTripId: tripId,
          createdAt: new Date().toISOString(),
        };

        const originalItems = state.tripItems.filter(
          (ti) => ti.tripId === tripId
        );
        const newItems: TripItem[] = originalItems.map((ti) => ({
          ...ti,
          id: uuid(),
          tripId: newTripId,
          checked: false,
        }));

        set({
          trips: [...state.trips, newTrip],
          tripItems: [...state.tripItems, ...newItems],
        });

        return newTripId;
      },

      regenerateTripItems: (tripId, newParams) => {
        const state = get();
        const currentTripItems = state.tripItems.filter((ti) => ti.tripId === tripId);

        // Determine which master items should be included with the new params
        const newMatchingMasterIds = new Set(
          state.masterItems
            .filter((mi) =>
              shouldIncludeItem(mi, newParams.temperature, newParams.duration, newParams.peopleCount, newParams.activities)
            )
            .map((mi) => mi.id)
        );

        // Existing master-derived items in this trip (keyed by masterItemId)
        const existingMasterItemIds = new Set(
          currentTripItems
            .filter((ti) => ti.masterItemId && !ti.isCustom)
            .map((ti) => ti.masterItemId!)
        );

        // Items to ADD: master items that match new params but aren't in the trip yet
        const masterItemsToAdd = state.masterItems.filter(
          (mi) => newMatchingMasterIds.has(mi.id) && !existingMasterItemIds.has(mi.id)
        );

        // Items to REMOVE: unchecked master-derived items that no longer match
        const itemIdsToRemove = new Set(
          currentTripItems
            .filter(
              (ti) =>
                ti.masterItemId &&
                !ti.isCustom &&
                !ti.checked &&
                !newMatchingMasterIds.has(ti.masterItemId)
            )
            .map((ti) => ti.id)
        );

        // Find max sortOrder per category for new items
        const maxSortOrders = new Map<string, number>();
        for (const ti of currentTripItems) {
          if (itemIdsToRemove.has(ti.id)) continue;
          const current = maxSortOrders.get(ti.categoryId) ?? -1;
          maxSortOrders.set(ti.categoryId, Math.max(current, ti.sortOrder ?? 0));
        }

        const newTripItems: TripItem[] = masterItemsToAdd.map((mi) => {
          const currentMax = maxSortOrders.get(mi.categoryId) ?? -1;
          const newOrder = currentMax + 1;
          maxSortOrders.set(mi.categoryId, newOrder);
          return {
            id: uuid(),
            tripId,
            masterItemId: mi.id,
            name: mi.name,
            categoryId: mi.categoryId,
            checked: false,
            isCustom: false,
            quantity: calculateQuantity(mi, newParams.peopleCount),
            sortOrder: newOrder,
          };
        });

        // Apply changes
        const updatedTripItems = [
          ...state.tripItems.filter((ti) => !itemIdsToRemove.has(ti.id)),
          ...newTripItems,
        ];

        set({ tripItems: updatedTripItems });

        return { added: newTripItems.length, removed: itemIdsToRemove.size };
      },

      // Groups
      setCurrentGroup: (group) => {
        set({ currentGroup: group });
      },

      setSharedTrips: (trips, tripItems) => {
        set({ sharedTrips: trips, sharedTripItems: tripItems });
      },

      setPersonalBackupItems: (items) => {
        set({ personalBackupItems: items });
      },

      addPersonalItemToGroup: (itemId) => {
        const state = get();
        const item = state.personalBackupItems.find((i) => i.id === itemId);
        if (!item) return;
        const catItems = state.masterItems.filter(
          (i) => i.categoryId === item.categoryId
        );
        const maxOrder = Math.max(
          ...catItems.map((i) => i.sortOrder ?? 0),
          -1
        );
        set({
          masterItems: [
            ...state.masterItems,
            { ...item, id: uuid(), sortOrder: maxOrder + 1 },
          ],
          personalBackupItems: state.personalBackupItems.filter(
            (i) => i.id !== itemId
          ),
        });
      },

      markSharedTripsSeen: () => {
        const state = get();
        set({
          seenSharedTripIds: state.sharedTrips.map((t) => t.id),
        });
      },

      setNewMemberUids: (uids) => {
        set({ newMemberUids: uids });
      },

      clearNewMemberUids: () => {
        set({ newMemberUids: [] });
      },

      // Trip items
      toggleTripItem: (itemId) => {
        const state = get();
        const item = state.tripItems.find((ti) => ti.id === itemId);
        if (!item) return;
        const newChecked = !item.checked;

        set({
          tripItems: state.tripItems.map((ti) => {
            if (ti.id === itemId) return { ...ti, checked: newChecked };
            // Sync linked items: source → shopping copy or shopping copy → source
            if (ti.sourceItemId === itemId || (item.sourceItemId && ti.id === item.sourceItemId)) {
              return { ...ti, checked: newChecked };
            }
            return ti;
          }),
        });
      },

      togglePurchased: (itemId) => {
        const state = get();
        const item = state.tripItems.find((ti) => ti.id === itemId);
        if (!item) return;
        const newPurchased = !item.purchased;

        set({
          tripItems: state.tripItems.map((ti) => {
            if (ti.id === itemId) return { ...ti, purchased: newPurchased };
            // Sync linked items
            if (ti.sourceItemId === itemId || (item.sourceItemId && ti.id === item.sourceItemId)) {
              return { ...ti, purchased: newPurchased };
            }
            return ti;
          }),
        });
      },

      addTripItem: (tripId, name, categoryId, quantity) => {
        const state = get();
        const catItems = state.tripItems.filter(
          (ti) => ti.tripId === tripId && ti.categoryId === categoryId
        );
        const maxOrder = Math.max(
          ...catItems.map((ti) => ti.sortOrder ?? 0),
          -1
        );
        set({
          tripItems: [
            ...state.tripItems,
            {
              id: uuid(),
              tripId,
              name,
              categoryId,
              checked: false,
              isCustom: true,
              quantity: quantity ?? 1,
              sortOrder: maxOrder + 1,
            },
          ],
        });
      },

      updateTripItem: (itemId, updates) => {
        const state = get();
        const item = state.tripItems.find((ti) => ti.id === itemId);
        // Pick only the fields that should sync to linked items
        const syncFields: Partial<TripItem> = {};
        if ('checked' in updates) syncFields.checked = updates.checked;
        if ('quantity' in updates) syncFields.quantity = updates.quantity;
        if ('notes' in updates) syncFields.notes = updates.notes;
        if ('purchased' in updates) syncFields.purchased = updates.purchased;
        const hasSyncFields = Object.keys(syncFields).length > 0;

        set({
          tripItems: state.tripItems.map((ti) => {
            if (ti.id === itemId) return { ...ti, ...updates };
            // Sync linked items
            if (hasSyncFields && item && (ti.sourceItemId === itemId || (item.sourceItemId && ti.id === item.sourceItemId))) {
              return { ...ti, ...syncFields };
            }
            return ti;
          }),
        });
      },

      deleteTripItem: (itemId) => {
        set({
          tripItems: get().tripItems
            .filter((ti) => ti.id !== itemId)
            // Clear broken sourceItemId links
            .map((ti) => ti.sourceItemId === itemId ? { ...ti, sourceItemId: undefined } : ti),
        });
      },

      uncheckAllTripItems: (tripId) => {
        set({
          tripItems: get().tripItems.map((ti) =>
            ti.tripId === tripId ? { ...ti, checked: false } : ti
          ),
        });
      },

      reorderTripItems: (tripId, categoryId, orderedIds) => {
        set({
          tripItems: get().tripItems.map((ti) => {
            if (ti.tripId !== tripId || ti.categoryId !== categoryId) return ti;
            const index = orderedIds.indexOf(ti.id);
            return index >= 0 ? { ...ti, sortOrder: index } : ti;
          }),
        });
      },

      copyItemToShopping: (itemId) => {
        const state = get();
        const item = state.tripItems.find((ti) => ti.id === itemId);
        if (!item) return;

        // Find the shopping category
        const shoppingCat = state.categories.find(
          (c) => c.id === 'cat-shopping' || c.name.toLowerCase().includes('shopping')
        );
        if (!shoppingCat) return;

        // Don't copy if item is already in the shopping category
        if (item.categoryId === shoppingCat.id) return;

        // Don't copy if an item with the same name already exists in shopping for this trip
        const alreadyExists = state.tripItems.some(
          (ti) =>
            ti.tripId === item.tripId &&
            ti.categoryId === shoppingCat.id &&
            ti.name.toLowerCase() === item.name.toLowerCase()
        );
        if (alreadyExists) return;

        const shopItems = state.tripItems.filter(
          (ti) => ti.tripId === item.tripId && ti.categoryId === shoppingCat.id
        );
        const maxOrder = Math.max(
          ...shopItems.map((ti) => ti.sortOrder ?? 0),
          -1
        );

        set({
          tripItems: [
            ...state.tripItems,
            {
              id: uuid(),
              tripId: item.tripId,
              sourceItemId: item.id,
              name: item.name,
              categoryId: shoppingCat.id,
              checked: item.checked,
              purchased: item.purchased,
              isCustom: true,
              quantity: item.quantity ?? 1,
              notes: item.notes,
              sortOrder: maxOrder + 1,
            },
          ],
        });
      },

      saveTripItemToMaster: (itemId) => {
        const item = get().tripItems.find((ti) => ti.id === itemId);
        if (!item || !item.isCustom) return;
        const masterId = uuid();
        set({
          masterItems: [
            ...get().masterItems,
            {
              id: masterId,
              name: item.name,
              categoryId: item.categoryId,
              conditions: {},
              quantity: item.quantity,
            },
          ],
          tripItems: get().tripItems.map((ti) =>
            ti.id === itemId
              ? { ...ti, masterItemId: masterId, isCustom: false }
              : ti
          ),
        });
      },
    }),
    {
      name: 'camperpack-storage',
      version: 2,
      migrate: (persistedState: unknown, version: number) => {
        const state = persistedState as Record<string, unknown>;
        if (version === 0) {
          // Rename "Shopping / Voorbereiding" → "Shopping"
          const categories = state.categories as Category[] | undefined;
          if (categories) {
            state.categories = categories.map((c) =>
              c.id === 'cat-shopping' || c.name.toLowerCase().includes('voorbereiding')
                ? { ...c, name: 'Shopping' }
                : c
            );
          }
        }
        if (version < 2) {
          // Add customActivities if missing
          if (!state.customActivities) {
            state.customActivities = [];
          }
          // Remove 'surfing' from master item conditions
          const masterItems = state.masterItems as MasterItem[] | undefined;
          if (masterItems) {
            state.masterItems = masterItems.map((mi) => {
              if (!mi.conditions.activities?.includes('surfing')) return mi;
              return {
                ...mi,
                conditions: {
                  ...mi.conditions,
                  activities: mi.conditions.activities.filter((a) => a !== 'surfing'),
                },
              };
            });
          }
          // Remove 'surfing' from trip activities
          const trips = state.trips as Trip[] | undefined;
          if (trips) {
            state.trips = trips.map((t) => ({
              ...t,
              activities: t.activities.filter((a) => a !== 'surfing'),
            }));
          }
        }
        return state;
      },
      partialize: (state) => ({
        categories: state.categories,
        masterItems: state.masterItems,
        trips: state.trips,
        tripItems: state.tripItems,
        customActivities: state.customActivities,
        initialized: state.initialized,
        seenSharedTripIds: state.seenSharedTripIds,
        // Excluded from localStorage (fetched from Firestore):
        // currentGroup, sharedTrips, sharedTripItems, personalBackupItems
      }),
    }
  )
);
