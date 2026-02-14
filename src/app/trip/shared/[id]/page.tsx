'use client';

import { use } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAppStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Circle,
  UsersRound,
} from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { TripItem } from '@/lib/types';
import {
  temperatureLabels,
  temperatureIcons,
  durationLabels,
} from '@/lib/constants';

export default function SharedTripDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const searchParams = useSearchParams();
  const creatorId = searchParams.get('creator');

  const sharedTrips = useAppStore((s) => s.sharedTrips);
  const sharedTripItems = useAppStore((s) => s.sharedTripItems);
  const categories = useAppStore((s) => s.categories);
  const currentGroup = useAppStore((s) => s.currentGroup);

  const trip = sharedTrips.find((t) => t.id === id);
  const tripItems = sharedTripItems.filter((ti) => ti.tripId === id);

  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());

  if (!trip) {
    return (
      <div className="mx-auto max-w-lg px-4 pt-6 text-center">
        <p className="text-muted-foreground">Gedeelde trip niet gevonden</p>
        <Link href="/">
          <Button variant="link">Terug naar home</Button>
        </Link>
      </div>
    );
  }

  const toggleCategory = (categoryId: string) => {
    setCollapsedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) next.delete(categoryId);
      else next.add(categoryId);
      return next;
    });
  };

  const creator = creatorId && currentGroup
    ? currentGroup.members[creatorId]
    : null;

  const groupedItems = new Map<string, TripItem[]>();
  for (const item of tripItems) {
    const existing = groupedItems.get(item.categoryId) || [];
    existing.push(item);
    groupedItems.set(item.categoryId, existing);
  }

  for (const [catId, items] of groupedItems) {
    groupedItems.set(
      catId,
      items.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    );
  }

  const sortedCategories = categories
    .filter((c) => groupedItems.has(c.id))
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const totalChecked = tripItems.filter((ti) => ti.checked).length;
  const totalItems = tripItems.length;
  const progress = totalItems > 0 ? (totalChecked / totalItems) * 100 : 0;

  const statusLabels: Record<string, string> = {
    planning: 'Planning',
    active: 'Actief',
    completed: 'Voltooid',
  };

  return (
    <div className="mx-auto max-w-lg px-4 pt-6">
      {/* Header */}
      <div className="mb-4 flex items-center gap-3">
        <Link href="/">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold truncate">{trip.name}</h1>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {trip.destination && <span>{trip.destination}</span>}
            <span>{temperatureIcons[trip.temperature]}</span>
          </div>
        </div>
        <Badge variant="secondary">{statusLabels[trip.status]}</Badge>
      </div>

      {/* Creator badge */}
      <div className="mb-4 flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30 p-3">
        <UsersRound className="h-4 w-4 text-blue-600 shrink-0" />
        <span className="text-sm text-blue-700 dark:text-blue-300">
          Gedeelde trip van <strong>{creator?.displayName || 'Onbekend'}</strong>
        </span>
        <Badge variant="outline" className="ml-auto text-xs">
          Alleen lezen
        </Badge>
      </div>

      {/* Trip info */}
      <div className="mb-4 text-sm text-muted-foreground flex flex-wrap gap-x-4 gap-y-1">
        <span>{temperatureIcons[trip.temperature]} {temperatureLabels[trip.temperature]}</span>
        <span>{durationLabels[trip.duration]}</span>
        <span>{trip.peopleCount} {trip.peopleCount === 1 ? 'persoon' : 'personen'}</span>
        {trip.startDate && (
          <span>{new Date(trip.startDate).toLocaleDateString('nl-BE')} — {new Date(trip.endDate).toLocaleDateString('nl-BE')}</span>
        )}
      </div>

      {/* Progress */}
      <div className="mb-4 space-y-1">
        <div className="flex justify-between text-sm">
          <span className="font-medium">{totalChecked} / {totalItems} ingepakt</span>
          <span className="text-muted-foreground">{Math.round(progress)}%</span>
        </div>
        <Progress value={progress} className="h-3" />
      </div>

      {/* Trip notes */}
      {trip.notes && (
        <div className="mb-4 rounded-lg border bg-muted/50 p-3">
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">📝 {trip.notes}</p>
        </div>
      )}

      {/* Category groups (read-only) */}
      <div className="space-y-2 pb-4">
        {sortedCategories.map((category) => {
          const items = groupedItems.get(category.id) || [];
          const catChecked = items.filter((i) => i.checked).length;
          const isCollapsed = collapsedCategories.has(category.id);

          return (
            <div key={category.id} className="rounded-lg border">
              <button
                onClick={() => toggleCategory(category.id)}
                className="flex w-full items-center gap-2 p-3 text-left"
              >
                {isCollapsed ? (
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                )}
                <span className="text-base">{category.icon}</span>
                <span className="flex-1 font-medium text-sm">{category.name}</span>
                <Badge variant="secondary" className="text-xs">
                  {catChecked}/{items.length}
                </Badge>
              </button>

              {!isCollapsed && (
                <div className="border-t">
                  {items.map((item) => {
                    const quantity = item.quantity ?? 1;
                    return (
                      <div
                        key={item.id}
                        className="flex items-center gap-3 px-4 py-2.5 border-b last:border-b-0"
                      >
                        {item.checked ? (
                          <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
                        ) : (
                          <Circle className="h-5 w-5 text-muted-foreground shrink-0" />
                        )}
                        <span
                          className={`flex-1 text-sm ${
                            item.checked ? 'line-through text-muted-foreground' : ''
                          }`}
                        >
                          {item.name}
                        </span>
                        {quantity > 1 && (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                            ×{quantity}
                          </Badge>
                        )}
                        {item.notes && (
                          <span className="text-xs text-muted-foreground">💬</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {tripItems.length === 0 && (
          <div className="rounded-lg border border-dashed p-6 text-center text-muted-foreground">
            Geen items in deze trip
          </div>
        )}
      </div>
    </div>
  );
}
