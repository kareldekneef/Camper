export type Temperature = 'hot' | 'mixed' | 'cold';
export type Duration = 'weekend' | 'week' | 'extended';
export type Activity = string;
export type TripStatus = 'planning' | 'active' | 'completed';

export interface CustomActivity {
  id: string;
  name: string;
  icon: string;
}

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

export type GroupRole = 'owner' | 'member';

export interface GroupMember {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string | null;
  role: GroupRole;
  joinedAt: string;
}

export interface Group {
  id: string;
  name: string;
  ownerId: string;
  inviteCode: string;
  members: Record<string, GroupMember>;
  createdAt: string;
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
  // Group fields (optional — absent for personal trips)
  groupId?: string;
  sharedWith?: string[];    // UIDs who can view this trip
  creatorId?: string;       // UID of trip creator
}

export interface TripItem {
  id: string;
  tripId: string;
  masterItemId?: string;
  name: string;
  categoryId: string;
  checked: boolean;
  purchased?: boolean;  // for shopping items: not done → purchased → checked (packed)
  notes?: string;
  isCustom: boolean;
  quantity?: number;    // calculated or manually adjusted (defaults to 1)
  sortOrder?: number;   // order within category
}
