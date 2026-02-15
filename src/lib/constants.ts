import { CustomActivity, Duration, Temperature } from './types';

export const temperatureLabels: Record<Temperature, string> = {
  hot: 'Warm (>25°C)',
  mixed: 'Gemengd (10-25°C)',
  cold: 'Koud (<10°C)',
};

export const durationLabels: Record<Duration, string> = {
  weekend: 'Weekend (1-3 nachten)',
  week: 'Week (4-7 nachten)',
  extended: 'Verlengd (8+ nachten)',
};

export const activityLabels: Record<string, string> = {
  hiking: 'Wandelen',
  cycling: 'Fietsen',
  fishing: 'Vissen',
  swimming: 'Zwemmen',
  photography: 'Fotografie',
  relaxation: 'Ontspanning',
  winter_sports: 'Wintersport',
};

export const activityIcons: Record<string, string> = {
  hiking: '🥾',
  cycling: '🚴',
  fishing: '🎣',
  swimming: '🏊',
  photography: '📷',
  relaxation: '😎',
  winter_sports: '⛷️',
};

export const temperatureIcons: Record<Temperature, string> = {
  hot: '☀️',
  mixed: '⛅',
  cold: '❄️',
};

// --- Activity helpers ---

export interface ActivityInfo {
  id: string;
  label: string;
  icon: string;
}

/** Get all activities: built-in + custom, merged into a single list */
export function getAllActivities(customActivities: CustomActivity[] = []): ActivityInfo[] {
  const builtIn: ActivityInfo[] = Object.keys(activityLabels).map((id) => ({
    id,
    label: activityLabels[id],
    icon: activityIcons[id] || '🎯',
  }));

  const custom: ActivityInfo[] = customActivities.map((ca) => ({
    id: ca.id,
    label: ca.name,
    icon: ca.icon,
  }));

  return [...builtIn, ...custom];
}

/** Get the display label for an activity ID */
export function getActivityLabel(id: string, customActivities: CustomActivity[] = []): string {
  if (activityLabels[id]) return activityLabels[id];
  const custom = customActivities.find((ca) => ca.id === id);
  return custom?.name || id;
}

/** Get the icon for an activity ID */
export function getActivityIcon(id: string, customActivities: CustomActivity[] = []): string {
  if (activityIcons[id]) return activityIcons[id];
  const custom = customActivities.find((ca) => ca.id === id);
  return custom?.icon || '🎯';
}
