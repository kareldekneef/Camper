import { Activity, Duration, Temperature } from './types';

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

export const activityLabels: Record<Activity, string> = {
  hiking: 'Wandelen',
  cycling: 'Fietsen',
  fishing: 'Vissen',
  swimming: 'Zwemmen',
  photography: 'Fotografie',
  relaxation: 'Ontspanning',
  winter_sports: 'Wintersport',
  surfing: 'Surfen',
};

export const activityIcons: Record<Activity, string> = {
  hiking: '🥾',
  cycling: '🚴',
  fishing: '🎣',
  swimming: '🏊',
  photography: '📷',
  relaxation: '😎',
  winter_sports: '⛷️',
  surfing: '🏄',
};

export const temperatureIcons: Record<Temperature, string> = {
  hot: '☀️',
  mixed: '⛅',
  cold: '❄️',
};
