'use client';

import { useAppStore } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, MapPin, Calendar, TrendingUp, AlertTriangle, CheckCircle2, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { temperatureIcons, activityLabels } from '@/lib/constants';
import { Trip, TripItem } from '@/lib/types';

interface TripStats {
  trip: Trip;
  items: TripItem[];
  total: number;
  checked: number;
  forgotten: number;
  progress: number;
  forgottenItems: string[];
}

export default function HistoryPage() {
  const trips = useAppStore((s) => s.trips);
  const tripItems = useAppStore((s) => s.tripItems);
  const categories = useAppStore((s) => s.categories);

  const completedTrips = trips
    .filter((t) => t.status === 'completed')
    .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());

  const allTripsStats: TripStats[] = completedTrips.map((trip) => {
    const items = tripItems.filter((ti) => ti.tripId === trip.id);
    const checked = items.filter((ti) => ti.checked).length;
    const forgotten = items.filter((ti) => !ti.checked).length;
    const total = items.length;
    const forgottenItems = items
      .filter((ti) => !ti.checked)
      .map((ti) => ti.name);
    return {
      trip,
      items,
      total,
      checked,
      forgotten,
      progress: total > 0 ? (checked / total) * 100 : 0,
      forgottenItems,
    };
  });

  // Overall stats
  const totalTrips = completedTrips.length;
  const avgProgress = totalTrips > 0
    ? allTripsStats.reduce((sum, s) => sum + s.progress, 0) / totalTrips
    : 0;
  const totalForgotten = allTripsStats.reduce((sum, s) => sum + s.forgotten, 0);

  // Most forgotten items (across all completed trips)
  const forgottenCounts = new Map<string, number>();
  for (const stat of allTripsStats) {
    for (const name of stat.forgottenItems) {
      forgottenCounts.set(name, (forgottenCounts.get(name) || 0) + 1);
    }
  }
  const topForgotten = [...forgottenCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  // Destinations visited
  const destinations = new Set(
    completedTrips.map((t) => t.destination).filter(Boolean)
  );

  return (
    <div className="mx-auto max-w-lg px-4 pt-6">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Geschiedenis</h1>
          <p className="text-sm text-muted-foreground">Overzicht van je voltooide trips</p>
        </div>
      </div>

      {totalTrips === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-4xl mb-2">📊</p>
          <p className="text-muted-foreground">
            Nog geen voltooide trips. Markeer een trip als voltooid om hier statistieken te zien.
          </p>
        </div>
      ) : (
        <div className="space-y-4 pb-6">
          {/* Summary stats */}
          <div className="grid grid-cols-3 gap-3">
            <Card>
              <CardContent className="pt-4 pb-3 text-center">
                <Package className="h-5 w-5 mx-auto mb-1 text-primary" />
                <p className="text-2xl font-bold">{totalTrips}</p>
                <p className="text-xs text-muted-foreground">Trips</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3 text-center">
                <CheckCircle2 className="h-5 w-5 mx-auto mb-1 text-green-600" />
                <p className="text-2xl font-bold">{Math.round(avgProgress)}%</p>
                <p className="text-xs text-muted-foreground">Gem. ingepakt</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3 text-center">
                <MapPin className="h-5 w-5 mx-auto mb-1 text-blue-600" />
                <p className="text-2xl font-bold">{destinations.size}</p>
                <p className="text-xs text-muted-foreground">Bestemmingen</p>
              </CardContent>
            </Card>
          </div>

          {/* Most forgotten items */}
          {topForgotten.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-orange-500" />
                  Meest vergeten items
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {topForgotten.map(([name, count]) => (
                    <div key={name} className="flex items-center justify-between">
                      <span className="text-sm">{name}</span>
                      <Badge variant="secondary" className="text-xs">
                        {count}× vergeten
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Trip history list */}
          <div className="space-y-3">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Alle voltooide trips
            </h2>
            {allTripsStats.map(({ trip, total, checked, forgotten, progress, forgottenItems }) => (
              <Link key={trip.id} href={`/trip/${trip.id}`}>
                <Card className="mb-3">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-base">{trip.name}</CardTitle>
                      <span className="text-lg">
                        {temperatureIcons[trip.temperature]}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      {trip.destination && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {trip.destination}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(trip.startDate).toLocaleDateString('nl-BE')}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span>{checked}/{total} ingepakt</span>
                        <span>{Math.round(progress)}%</span>
                      </div>
                      <Progress value={progress} className="h-2" />
                    </div>

                    {forgotten > 0 && (
                      <div className="rounded bg-orange-50 dark:bg-orange-950/30 p-2">
                        <p className="text-xs text-orange-700 dark:text-orange-400 font-medium mb-1">
                          {forgotten} item{forgotten !== 1 ? 's' : ''} vergeten:
                        </p>
                        <p className="text-xs text-orange-600 dark:text-orange-500 truncate">
                          {forgottenItems.slice(0, 3).join(', ')}
                          {forgottenItems.length > 3 && ` +${forgottenItems.length - 3} meer`}
                        </p>
                      </div>
                    )}

                    {forgotten === 0 && (
                      <p className="text-xs text-green-600 dark:text-green-400 font-medium">
                        Alles ingepakt! Goed gedaan!
                      </p>
                    )}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
