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
  addTripItem: (tripId: string, name: string, categoryId: string) => void;
  updateTripItem: (itemId: string, updates: Partial<TripItem>) => void;
  deleteTripItem: (itemId: string) => void;
  saveTripItemToMaster: (itemId: string) => void;
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
        set({
          masterItems: [...get().masterItems, { ...item, id: uuid() }],
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

      addTripItem: (tripId, name, categoryId) => {
        set({
          tripItems: [
            ...get().tripItems,
            {
              id: uuid(),
              tripId,
              name,
              categoryId,
              checked: false,
              isCustom: true,
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
