import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuid } from 'uuid';
import {
  Category,
  MasterItem,
  Trip,
  TripItem,
  Temperature,
  Duration,
  Activity,
} from './types';
import { defaultCategories, defaultMasterItems } from './seed-data';

interface AppState {
  categories: Category[];
  masterItems: MasterItem[];
  trips: Trip[];
  tripItems: TripItem[];
  initialized: boolean;

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
  }) => string;
  updateTrip: (id: string, updates: Partial<Trip>) => void;
  deleteTrip: (id: string) => void;
  copyTrip: (tripId: string, newName: string) => string;

  // Trip items
  toggleTripItem: (itemId: string) => void;
  addTripItem: (tripId: string, name: string, categoryId: string, quantity?: number) => void;
  updateTripItem: (itemId: string, updates: Partial<TripItem>) => void;
  deleteTripItem: (itemId: string) => void;
  saveTripItemToMaster: (itemId: string) => void;
  uncheckAllTripItems: (tripId: string) => void;
  reorderTripItems: (tripId: string, categoryId: string, orderedIds: string[]) => void;
}

function shouldIncludeItem(
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

function calculateQuantity(
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
      initialized: false,

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

      // Trips
      createTrip: (params) => {
        const state = get();
        const tripId = uuid();
        const trip: Trip = {
          id: tripId,
          ...params,
          status: 'planning',
          createdAt: new Date().toISOString(),
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

      // Trip items
      toggleTripItem: (itemId) => {
        set({
          tripItems: get().tripItems.map((ti) =>
            ti.id === itemId ? { ...ti, checked: !ti.checked } : ti
          ),
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
        set({
          tripItems: get().tripItems.map((ti) =>
            ti.id === itemId ? { ...ti, ...updates } : ti
          ),
        });
      },

      deleteTripItem: (itemId) => {
        set({
          tripItems: get().tripItems.filter((ti) => ti.id !== itemId),
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
    }
  )
);
