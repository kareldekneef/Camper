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
  Pencil,
  Eye,
} from 'lucide-react';
import Link from 'next/link';
import { useState, useCallback, useRef } from 'react';
import { TripItem, getTripPermission } from '@/lib/types';
import {
  temperatureLabels,
  temperatureIcons,
  durationLabels,
} from '@/lib/constants';
import { useAuth } from '@/lib/auth-context';
import { updateSharedTripItem } from '@/lib/group-sync';
import { cn } from '@/lib/utils';

export default function SharedTripDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const searchParams = useSearchParams();
  const creatorId = searchParams.get('creator');
  const { user } = useAuth();

  const sharedTrips = useAppStore((s) => s.sharedTrips);
  const sharedTripItems = useAppStore((s) => s.sharedTripItems);
  const setSharedTrips = useAppStore((s) => s.setSharedTrips);
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

  // Determine user's permission level
  const userPermission = user ? getTripPermission(trip, user.uid) : 'view';
  const canEdit = userPermission === 'edit';

  const toggleCategory = (categoryId: string) => {
    setCollapsedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) next.delete(categoryId);
      else next.add(categoryId);
      return next;
    });
  };

  // Toggle an item's checked state (for editors)
  const handleToggleItem = async (item: TripItem) => {
    if (!canEdit || !creatorId) return;

    const newChecked = !item.checked;

    // Optimistic update: update local sharedTripItems state
    const updatedItems = sharedTripItems.map((ti) =>
      ti.id === item.id ? { ...ti, checked: newChecked } : ti
    );
    setSharedTrips(sharedTrips, updatedItems);

    // Write to Firestore
    try {
      await updateSharedTripItem(creatorId, item.id, { checked: newChecked });
    } catch (error) {
      // Revert on failure
      console.error('Failed to update shared trip item:', error);
      const revertedItems = sharedTripItems.map((ti) =>
        ti.id === item.id ? { ...ti, checked: !newChecked } : ti
      );
      setSharedTrips(sharedTrips, revertedItems);
    }
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

      {/* Creator badge + permission */}
      <div className={cn(
        'mb-4 flex items-center gap-2 rounded-lg border p-3',
        canEdit
          ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/30'
          : 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30'
      )}>
        <UsersRound className={cn(
          'h-4 w-4 shrink-0',
          canEdit ? 'text-green-600' : 'text-blue-600'
        )} />
        <span className={cn(
          'text-sm',
          canEdit ? 'text-green-700 dark:text-green-300' : 'text-blue-700 dark:text-blue-300'
        )}>
          Gedeelde trip van <strong>{creator?.displayName || 'Onbekend'}</strong>
        </span>
        {canEdit ? (
          <Badge variant="outline" className="ml-auto text-xs border-green-400 text-green-700 bg-green-50 dark:bg-green-950/30 dark:text-green-300 dark:border-green-700">
            <Pencil className="h-3 w-3 mr-1" />
            Bewerken
          </Badge>
        ) : (
          <Badge variant="outline" className="ml-auto text-xs">
            <Eye className="h-3 w-3 mr-1" />
            Alleen lezen
          </Badge>
        )}
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

      {/* Category groups */}
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
                  {items.map((item) => (
                    <SharedItemRow
                      key={item.id}
                      item={item}
                      canEdit={canEdit}
                      onToggle={() => handleToggleItem(item)}
                    />
                  ))}
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

function SharedItemRow({
  item,
  canEdit,
  onToggle,
}: {
  item: TripItem;
  canEdit: boolean;
  onToggle: () => void;
}) {
  const quantity = item.quantity ?? 1;
  const [swipeX, setSwipeX] = useState(0);
  const [swiping, setSwiping] = useState(false);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const swipeThreshold = 70;

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!canEdit) return;
    touchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    };
    setSwiping(false);
  }, [canEdit]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!canEdit || !touchStartRef.current) return;
    const dx = e.touches[0].clientX - touchStartRef.current.x;
    const dy = e.touches[0].clientY - touchStartRef.current.y;
    if (Math.abs(dy) > Math.abs(dx) && !swiping) {
      touchStartRef.current = null;
      return;
    }
    if (Math.abs(dx) > 10) setSwiping(true);
    setSwipeX(Math.max(0, Math.min(100, dx)));
  }, [canEdit, swiping]);

  const handleTouchEnd = useCallback(() => {
    if (!canEdit) return;
    if (swipeX >= swipeThreshold) {
      onToggle();
    }
    setSwipeX(0);
    setSwiping(false);
    touchStartRef.current = null;
  }, [canEdit, swipeX, onToggle]);

  const swipeProgress = Math.min(swipeX / swipeThreshold, 1);

  return (
    <div className={cn("border-b last:border-b-0 relative", canEdit && "overflow-hidden")}>
      {/* Swipe reveal background (editors only) */}
      {canEdit && (
        <div
          className={cn(
            'absolute inset-y-0 left-0 flex items-center pl-4 transition-opacity',
            item.checked
              ? 'bg-orange-100 dark:bg-orange-950/50'
              : 'bg-green-100 dark:bg-green-950/50'
          )}
          style={{ width: `${swipeX}px`, opacity: swipeProgress }}
        >
          {swipeProgress >= 1 && (
            item.checked ? (
              <Circle className="h-5 w-5 text-orange-600" />
            ) : (
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            )
          )}
        </div>
      )}

      <div
        className={cn(
          "flex items-center gap-3 px-4 py-2.5 bg-background relative",
          canEdit && "cursor-pointer"
        )}
        style={{
          transform: swipeX > 0 ? `translateX(${swipeX}px)` : undefined,
          transition: swipeX > 0 || swiping ? (swiping ? 'none' : 'transform 200ms ease-out') : undefined,
        }}
        onClick={canEdit && !swiping ? onToggle : undefined}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {item.checked ? (
          <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
        ) : (
          <Circle className="h-5 w-5 text-muted-foreground shrink-0" />
        )}
        <span
          className={cn(
            'flex-1 text-sm',
            item.checked && 'line-through text-muted-foreground'
          )}
        >
          {item.name}
        </span>
        {quantity > 1 && (
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
            ×{quantity}
          </Badge>
        )}
        {item.purchased && (
          <Badge
            variant="outline"
            className="text-[10px] border-blue-200 text-blue-700 bg-blue-50 dark:border-blue-800 dark:text-blue-300 dark:bg-blue-950"
          >
            Gekocht
          </Badge>
        )}
        {item.notes && (
          <span className="text-xs text-muted-foreground">💬</span>
        )}
      </div>
    </div>
  );
}
