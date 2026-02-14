'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Activity, Duration, Temperature } from '@/lib/types';
import {
  temperatureLabels,
  durationLabels,
  activityLabels,
  activityIcons,
  temperatureIcons,
} from '@/lib/constants';
import { ArrowLeft, Check, CalendarDays, UsersRound } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import type { DateRange } from 'react-day-picker';
import { useAuth } from '@/lib/auth-context';

function calculateNights(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
}

function calculateDuration(from: Date, to: Date): Duration {
  const nights = calculateNights(from, to);
  if (nights <= 3) return 'weekend';
  if (nights <= 7) return 'week';
  return 'extended';
}

export default function NewTripPage() {
  const router = useRouter();
  const { user } = useAuth();
  const createTrip = useAppStore((s) => s.createTrip);
  const currentGroup = useAppStore((s) => s.currentGroup);

  const [name, setName] = useState('');
  const [destination, setDestination] = useState('');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [temperature, setTemperature] = useState<Temperature>('mixed');
  const [peopleCount, setPeopleCount] = useState(2);
  const [activities, setActivities] = useState<Activity[]>(['relaxation']);
  const [shareWithGroup, setShareWithGroup] = useState(true);

  const allActivities = Object.keys(activityLabels) as Activity[];

  // Derived values from date range
  const nights = dateRange?.from && dateRange?.to
    ? calculateNights(dateRange.from, dateRange.to)
    : null;
  const duration: Duration = dateRange?.from && dateRange?.to
    ? calculateDuration(dateRange.from, dateRange.to)
    : 'week';

  const toggleActivity = (activity: Activity) => {
    setActivities((prev) =>
      prev.includes(activity)
        ? prev.filter((a) => a !== activity)
        : [...prev, activity]
    );
  };

  const handleDateSelect = (range: DateRange | undefined) => {
    setDateRange(range);
    // Auto-close popover when both dates are selected
    if (range?.from && range?.to) {
      setTimeout(() => setCalendarOpen(false), 300);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const today = new Date().toISOString().split('T')[0];

    const tripId = createTrip({
      name: name.trim(),
      destination: destination.trim(),
      startDate: dateRange?.from
        ? format(dateRange.from, 'yyyy-MM-dd')
        : today,
      endDate: dateRange?.to
        ? format(dateRange.to, 'yyyy-MM-dd')
        : today,
      temperature,
      duration,
      peopleCount,
      activities,
      creatorId: user?.uid,
      shareWithGroup: currentGroup ? shareWithGroup : false,
    });

    router.push(`/trip/${tripId}`);
  };

  const formatDateRange = () => {
    if (!dateRange?.from) return null;
    if (!dateRange.to) return format(dateRange.from, 'd MMM yyyy', { locale: nl });
    // Same month and year
    if (
      dateRange.from.getMonth() === dateRange.to.getMonth() &&
      dateRange.from.getFullYear() === dateRange.to.getFullYear()
    ) {
      return `${format(dateRange.from, 'd', { locale: nl })} – ${format(dateRange.to, 'd MMM yyyy', { locale: nl })}`;
    }
    // Same year
    if (dateRange.from.getFullYear() === dateRange.to.getFullYear()) {
      return `${format(dateRange.from, 'd MMM', { locale: nl })} – ${format(dateRange.to, 'd MMM yyyy', { locale: nl })}`;
    }
    return `${format(dateRange.from, 'd MMM yyyy', { locale: nl })} – ${format(dateRange.to, 'd MMM yyyy', { locale: nl })}`;
  };

  return (
    <div className="mx-auto max-w-lg px-4 pt-6">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">Nieuwe Trip</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Basisgegevens</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Naam *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="bv. Voorjaarstrip Frankrijk"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="destination">Bestemming</Label>
              <Input
                id="destination"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                placeholder="bv. Côte d'Azur"
              />
            </div>
            <div className="space-y-2">
              <Label>Reisperiode</Label>
              <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !dateRange?.from && 'text-muted-foreground'
                    )}
                  >
                    <CalendarDays className="mr-2 h-4 w-4" />
                    {formatDateRange() || 'Selecteer datums'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="range"
                    selected={dateRange}
                    onSelect={handleDateSelect}
                    numberOfMonths={1}
                    locale={nl}
                    defaultMonth={dateRange?.from || new Date()}
                  />
                </PopoverContent>
              </Popover>
              {nights !== null && (
                <p className="text-sm text-muted-foreground">
                  {durationLabels[duration].split(' ')[0]} — {nights} {nights === 1 ? 'nacht' : 'nachten'}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Temperatuur</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(temperatureLabels) as Temperature[]).map((temp) => (
                <button
                  key={temp}
                  type="button"
                  onClick={() => setTemperature(temp)}
                  className={cn(
                    'rounded-lg border p-3 text-center text-sm transition-colors',
                    temperature === temp
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border hover:border-primary/50'
                  )}
                >
                  <div className="text-xl mb-1">{temperatureIcons[temp]}</div>
                  <div className="font-medium">{temperatureLabels[temp].split(' ')[0]}</div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Aantal personen</Label>
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setPeopleCount(Math.max(1, peopleCount - 1))}
                >
                  -
                </Button>
                <span className="w-8 text-center text-lg font-medium">
                  {peopleCount}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setPeopleCount(Math.min(10, peopleCount + 1))}
                >
                  +
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Activiteiten</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2">
              {allActivities.map((activity) => {
                const isSelected = activities.includes(activity);
                return (
                  <button
                    key={activity}
                    type="button"
                    onClick={() => toggleActivity(activity)}
                    className={cn(
                      'flex items-center gap-2 rounded-lg border p-3 text-sm transition-colors',
                      isSelected
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border hover:border-primary/50'
                    )}
                  >
                    <span>{activityIcons[activity]}</span>
                    <span className="font-medium">{activityLabels[activity]}</span>
                    {isSelected && <Check className="ml-auto h-4 w-4" />}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {currentGroup && (
          <Card>
            <CardContent className="pt-6">
              <button
                type="button"
                onClick={() => setShareWithGroup(!shareWithGroup)}
                className={cn(
                  'flex items-center gap-3 rounded-lg border p-4 w-full text-left transition-colors',
                  shareWithGroup
                    ? 'border-blue-400 bg-blue-50 dark:bg-blue-950/30'
                    : 'border-border'
                )}
              >
                <UsersRound className={cn(
                  'h-5 w-5 shrink-0',
                  shareWithGroup ? 'text-blue-600' : 'text-muted-foreground'
                )} />
                <div className="flex-1">
                  <p className={cn(
                    'text-sm font-medium',
                    shareWithGroup ? 'text-blue-700 dark:text-blue-300' : ''
                  )}>
                    Deel met groep
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {shareWithGroup
                      ? `Zichtbaar voor ${currentGroup.name}`
                      : 'Alleen voor jou zichtbaar'}
                  </p>
                </div>
                {shareWithGroup && <Check className="h-5 w-5 text-blue-600 shrink-0" />}
              </button>
            </CardContent>
          </Card>
        )}

        <Button type="submit" className="w-full" size="lg" disabled={!name.trim()}>
          Trip Aanmaken
        </Button>
        <div className="h-4" />
      </form>
    </div>
  );
}
