'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Activity, Duration, Temperature } from '@/lib/types';
import {
  temperatureLabels,
  durationLabels,
  activityLabels,
  activityIcons,
  temperatureIcons,
} from '@/lib/constants';
import { ArrowLeft, Check } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export default function NewTripPage() {
  const router = useRouter();
  const createTrip = useAppStore((s) => s.createTrip);

  const [name, setName] = useState('');
  const [destination, setDestination] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [temperature, setTemperature] = useState<Temperature>('mixed');
  const [duration, setDuration] = useState<Duration>('week');
  const [peopleCount, setPeopleCount] = useState(2);
  const [activities, setActivities] = useState<Activity[]>(['relaxation']);

  const allActivities = Object.keys(activityLabels) as Activity[];

  const toggleActivity = (activity: Activity) => {
    setActivities((prev) =>
      prev.includes(activity)
        ? prev.filter((a) => a !== activity)
        : [...prev, activity]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const tripId = createTrip({
      name: name.trim(),
      destination: destination.trim(),
      startDate: startDate || new Date().toISOString().split('T')[0],
      endDate: endDate || new Date().toISOString().split('T')[0],
      temperature,
      duration,
      peopleCount,
      activities,
    });

    router.push(`/trip/${tripId}`);
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
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="startDate">Vertrekdatum</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">Terugkomst</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
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
              <Label>Duur</Label>
              <Select
                value={duration}
                onValueChange={(v) => setDuration(v as Duration)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(durationLabels) as Duration[]).map((d) => (
                    <SelectItem key={d} value={d}>
                      {durationLabels[d]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

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

        <Button type="submit" className="w-full" size="lg" disabled={!name.trim()}>
          Trip Aanmaken
        </Button>
        <div className="h-4" />
      </form>
    </div>
  );
}
