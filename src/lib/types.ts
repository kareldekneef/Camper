export type Temperature = 'hot' | 'mixed' | 'cold';
export type Duration = 'weekend' | 'week' | 'extended';
export type Activity = 'hiking' | 'cycling' | 'fishing' | 'swimming' | 'photography' | 'relaxation' | 'winter_sports' | 'surfing';
export type TripStatus = 'planning' | 'active' | 'completed';

export interface MasterItem {
  id: string;
  name: string;
  categoryId: string;
  conditions: {
    weather?: Temperature[];
    activities?: Activity[];
    minPeople?: number;
    minDuration?: Duration;
  };
  quantity?: number;    // default quantity (defaults to 1)
  perPerson?: boolean;  // if true, multiply by peopleCount
  sortOrder?: number;   // order within category
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  sortOrder: number;
}

export interface Trip {
  id: string;
  name: string;
  destination: string;
  startDate: string;
  endDate: string;
  temperature: Temperature;
  duration: Duration;
  peopleCount: number;
  activities: Activity[];
  status: TripStatus;
  copiedFromTripId?: string;
  createdAt: string;
  notes?: string;
}

export interface TripItem {
  id: string;
  tripId: string;
  masterItemId?: string;
  name: string;
  categoryId: string;
  checked: boolean;
  notes?: string;
  isCustom: boolean;
  quantity?: number;    // calculated or manually adjusted (defaults to 1)
  sortOrder?: number;   // order within category
}
