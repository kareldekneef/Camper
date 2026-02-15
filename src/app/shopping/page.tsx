'use client';

import { useState, useMemo } from 'react';
import { useAppStore } from '@/lib/store';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  ShoppingCart,
  Search,
  X,
  Circle,
  ShoppingBag,
  PackageCheck,
  Package,
  List,
  FolderOpen,
  ChevronDown,
  ChevronRight,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { TripItem, Trip } from '@/lib/types';

// Shopping category detection
function isShoppingCategory(name: string): boolean {
  return name.toLowerCase().includes('shopping');
}

type ShoppingFilter = 'todo' | 'purchased' | 'all';
type ViewMode = 'aggregated' | 'per-trip';

// Aggregated item across trips
interface AggregatedItem {
  name: string;
  totalQuantity: number;
  items: TripItem[];
  tripNames: string[];
  allPurchased: boolean;
  allPacked: boolean;
  anyPurchased: boolean;
}

// Per-trip group
interface TripGroup {
  trip: Trip;
  items: TripItem[];
  todoCount: number;
  purchasedCount: number;
  packedCount: number;
}

export default function ShoppingPage() {
  const trips = useAppStore((s) => s.trips);
  const tripItems = useAppStore((s) => s.tripItems);
  const categories = useAppStore((s) => s.categories);
  const togglePurchased = useAppStore((s) => s.togglePurchased);
  const toggleTripItem = useAppStore((s) => s.toggleTripItem);

  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<ShoppingFilter>('todo');
  const [activeOnly, setActiveOnly] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('aggregated');
  const [collapsedTrips, setCollapsedTrips] = useState<Set<string>>(new Set());

  // Filter trips based on active toggle
  const visibleTrips = useMemo(
    () => activeOnly ? trips.filter((t) => t.status !== 'completed') : trips,
    [trips, activeOnly]
  );
  const visibleTripIds = useMemo(
    () => new Set(visibleTrips.map((t) => t.id)),
    [visibleTrips]
  );
  const tripNameMap = useMemo(
    () => Object.fromEntries(trips.map((t) => [t.id, t.name])),
    [trips]
  );

  const activeCount = useMemo(
    () => trips.filter((t) => t.status !== 'completed').length,
    [trips]
  );

  // Get shopping category IDs
  const shoppingCategoryIds = useMemo(
    () => new Set(categories.filter((c) => isShoppingCategory(c.name)).map((c) => c.id)),
    [categories]
  );

  // All shopping items from visible trips
  const shoppingItems = useMemo(
    () => tripItems.filter(
      (ti) => visibleTripIds.has(ti.tripId) && shoppingCategoryIds.has(ti.categoryId)
    ),
    [tripItems, visibleTripIds, shoppingCategoryIds]
  );

  // Aggregate shopping items across trips (group by name)
  const aggregatedItems = useMemo(() => {
    const groupMap = new Map<string, AggregatedItem>();

    for (const item of shoppingItems) {
      const key = item.name.toLowerCase().trim();
      const existing = groupMap.get(key);

      if (existing) {
        existing.totalQuantity += item.quantity ?? 1;
        existing.items.push(item);
        const tripName = tripNameMap[item.tripId];
        if (tripName && !existing.tripNames.includes(tripName)) {
          existing.tripNames.push(tripName);
        }
        existing.allPurchased = existing.allPurchased && !!item.purchased;
        existing.allPacked = existing.allPacked && item.checked;
        existing.anyPurchased = existing.anyPurchased || !!item.purchased;
      } else {
        groupMap.set(key, {
          name: item.name,
          totalQuantity: item.quantity ?? 1,
          items: [item],
          tripNames: [tripNameMap[item.tripId] || '?'],
          allPurchased: !!item.purchased,
          allPacked: item.checked,
          anyPurchased: !!item.purchased,
        });
      }
    }

    return Array.from(groupMap.values());
  }, [shoppingItems, tripNameMap]);

  // Per-trip groups
  const tripGroups = useMemo(() => {
    const groupMap = new Map<string, TripItem[]>();

    for (const item of shoppingItems) {
      const existing = groupMap.get(item.tripId);
      if (existing) {
        existing.push(item);
      } else {
        groupMap.set(item.tripId, [item]);
      }
    }

    const groups: TripGroup[] = [];
    for (const trip of visibleTrips) {
      const items = groupMap.get(trip.id);
      if (items && items.length > 0) {
        groups.push({
          trip,
          items,
          todoCount: items.filter((i) => !i.purchased && !i.checked).length,
          purchasedCount: items.filter((i) => i.purchased && !i.checked).length,
          packedCount: items.filter((i) => i.checked).length,
        });
      }
    }

    return groups;
  }, [shoppingItems, visibleTrips]);

  // Filter aggregated items
  const filteredItems = useMemo(() => {
    let items = aggregatedItems;

    if (filter === 'todo') {
      items = items.filter((item) => !item.allPacked);
    } else if (filter === 'purchased') {
      items = items.filter((item) => item.anyPurchased && !item.allPacked);
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      items = items.filter((item) => item.name.toLowerCase().includes(q));
    }

    // Sort: unpurchased first, then purchased, then packed
    return items.sort((a, b) => {
      const aOrder = a.allPacked ? 2 : a.allPurchased ? 1 : 0;
      const bOrder = b.allPacked ? 2 : b.allPurchased ? 1 : 0;
      if (aOrder !== bOrder) return aOrder - bOrder;
      return a.name.localeCompare(b.name, 'nl');
    });
  }, [aggregatedItems, filter, searchQuery]);

  // Filter per-trip groups
  const filteredTripGroups = useMemo(() => {
    return tripGroups.map((group) => {
      let items = group.items;

      if (filter === 'todo') {
        items = items.filter((i) => !i.checked);
      } else if (filter === 'purchased') {
        items = items.filter((i) => i.purchased && !i.checked);
      }

      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        items = items.filter((i) => i.name.toLowerCase().includes(q));
      }

      // Sort: unpurchased first, then purchased, then packed
      items = [...items].sort((a, b) => {
        const aOrder = a.checked ? 2 : a.purchased ? 1 : 0;
        const bOrder = b.checked ? 2 : b.purchased ? 1 : 0;
        if (aOrder !== bOrder) return aOrder - bOrder;
        return a.name.localeCompare(b.name, 'nl');
      });

      return { ...group, items };
    }).filter((group) => group.items.length > 0);
  }, [tripGroups, filter, searchQuery]);

  // Toggle purchased on all sub-items
  const handleTogglePurchased = (agg: AggregatedItem) => {
    for (const item of agg.items) {
      if (agg.allPurchased) {
        if (item.purchased) togglePurchased(item.id);
      } else {
        if (!item.purchased) togglePurchased(item.id);
      }
    }
  };

  // Toggle packed on all sub-items
  const handleTogglePacked = (agg: AggregatedItem) => {
    for (const item of agg.items) {
      if (agg.allPacked) {
        if (item.checked) toggleTripItem(item.id);
      } else {
        if (!item.checked) toggleTripItem(item.id);
      }
    }
  };

  const toggleCollapsedTrip = (tripId: string) => {
    setCollapsedTrips((prev) => {
      const next = new Set(prev);
      if (next.has(tripId)) {
        next.delete(tripId);
      } else {
        next.add(tripId);
      }
      return next;
    });
  };

  // Stats
  const totalTodo = aggregatedItems.filter((i) => !i.allPurchased && !i.allPacked).length;
  const totalPurchased = aggregatedItems.filter((i) => i.allPurchased && !i.allPacked).length;
  const totalPacked = aggregatedItems.filter((i) => i.allPacked).length;

  if (trips.length === 0) {
    return (
      <div className="mx-auto max-w-lg px-4 pt-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShoppingCart className="h-6 w-6" />
            Shopping
          </h1>
        </div>
        <div className="rounded-lg border border-dashed p-8 text-center">
          <ShoppingBag className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">Geen trips gevonden.</p>
          <Link href="/trip/new">
            <Button variant="link">Maak een nieuwe trip</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (shoppingItems.length === 0) {
    return (
      <div className="mx-auto max-w-lg px-4 pt-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShoppingCart className="h-6 w-6" />
            Shopping
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {visibleTrips.length} trip{visibleTrips.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Active toggle */}
        <div className="mb-4">
          <button
            onClick={() => setActiveOnly(!activeOnly)}
            className={cn(
              'flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
              activeOnly
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border text-muted-foreground hover:border-primary/50'
            )}
          >
            {activeOnly ? (
              <ToggleRight className="h-3.5 w-3.5" />
            ) : (
              <ToggleLeft className="h-3.5 w-3.5" />
            )}
            {activeOnly ? 'Alleen actieve trips' : 'Alle trips'}
          </button>
        </div>

        <div className="rounded-lg border border-dashed p-8 text-center">
          <ShoppingBag className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">
            {activeOnly
              ? 'Geen shopping items in je actieve trips.'
              : 'Geen shopping items gevonden.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 pt-6">
      {/* Header */}
      <div className="mb-4">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ShoppingCart className="h-6 w-6" />
          Shopping
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {visibleTrips.length} trip{visibleTrips.length !== 1 ? 's' : ''}
          {activeOnly && ` (${activeCount} actief)`}
        </p>
      </div>

      {/* Stats */}
      <div className="mb-4 grid grid-cols-3 gap-2">
        <div className="rounded-lg border p-3 text-center">
          <p className="text-2xl font-bold">{totalTodo}</p>
          <p className="text-xs text-muted-foreground">Te kopen</p>
        </div>
        <div className="rounded-lg border p-3 text-center">
          <p className="text-2xl font-bold text-blue-600">{totalPurchased}</p>
          <p className="text-xs text-muted-foreground">Gekocht</p>
        </div>
        <div className="rounded-lg border p-3 text-center">
          <p className="text-2xl font-bold text-green-600">{totalPacked}</p>
          <p className="text-xs text-muted-foreground">Ingepakt</p>
        </div>
      </div>

      {/* View toggles row */}
      <div className="mb-4 flex items-center gap-2 flex-wrap">
        {/* Active/All toggle */}
        <button
          onClick={() => setActiveOnly(!activeOnly)}
          className={cn(
            'flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
            activeOnly
              ? 'border-primary bg-primary/10 text-primary'
              : 'border-border text-muted-foreground hover:border-primary/50'
          )}
        >
          {activeOnly ? (
            <ToggleRight className="h-3.5 w-3.5" />
          ) : (
            <ToggleLeft className="h-3.5 w-3.5" />
          )}
          {activeOnly ? 'Actieve trips' : 'Alle trips'}
        </button>

        <div className="flex-1" />

        {/* View mode toggle */}
        <div className="flex rounded-full border overflow-hidden">
          <button
            onClick={() => setViewMode('aggregated')}
            className={cn(
              'flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium transition-colors',
              viewMode === 'aggregated'
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-muted'
            )}
            title="Alle items"
          >
            <List className="h-3.5 w-3.5" />
            Lijst
          </button>
          <button
            onClick={() => setViewMode('per-trip')}
            className={cn(
              'flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium transition-colors border-l',
              viewMode === 'per-trip'
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-muted'
            )}
            title="Per trip"
          >
            <FolderOpen className="h-3.5 w-3.5" />
            Per trip
          </button>
        </div>
      </div>

      {/* Filter */}
      <div className="mb-4 flex gap-2 overflow-x-auto">
        <FilterButton
          active={filter === 'todo'}
          onClick={() => setFilter('todo')}
          icon={<Circle className="h-3.5 w-3.5" />}
          label="Te doen"
          count={totalTodo + totalPurchased}
        />
        <FilterButton
          active={filter === 'purchased'}
          onClick={() => setFilter('purchased')}
          icon={<ShoppingBag className="h-3.5 w-3.5" />}
          label="Gekocht"
          count={totalPurchased}
        />
        <FilterButton
          active={filter === 'all'}
          onClick={() => setFilter('all')}
          icon={<Package className="h-3.5 w-3.5" />}
          label="Alles"
        />
      </div>

      {/* Search */}
      <div className="mb-4 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Zoeken..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        )}
      </div>

      {/* Aggregated view */}
      {viewMode === 'aggregated' && (
        <>
          <div className="rounded-lg border divide-y mb-4">
            {filteredItems.map((agg) => (
              <ShoppingItemRow
                key={agg.name.toLowerCase().trim()}
                item={agg}
                onTogglePurchased={() => handleTogglePurchased(agg)}
                onTogglePacked={() => handleTogglePacked(agg)}
              />
            ))}
          </div>

          {filteredItems.length === 0 && (
            <div className="rounded-lg border border-dashed p-6 text-center text-muted-foreground">
              {filter === 'todo'
                ? 'Alles is gedaan! 🎉'
                : filter === 'purchased'
                ? 'Nog niets gekocht'
                : 'Geen items gevonden'}
            </div>
          )}
        </>
      )}

      {/* Per-trip view */}
      {viewMode === 'per-trip' && (
        <>
          <div className="space-y-2 mb-4">
            {filteredTripGroups.map((group) => {
              const isCollapsed = collapsedTrips.has(group.trip.id);
              const statusBadge = group.trip.status === 'completed' ? ' (afgerond)' : '';

              return (
                <div key={group.trip.id} className="rounded-lg border">
                  <button
                    onClick={() => toggleCollapsedTrip(group.trip.id)}
                    className="flex w-full items-center gap-2 p-3 text-left"
                  >
                    {isCollapsed ? (
                      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                    )}
                    <span className="flex-1 font-medium text-sm truncate">
                      {group.trip.name}
                      {statusBadge && (
                        <span className="text-muted-foreground font-normal">{statusBadge}</span>
                      )}
                    </span>
                    <Badge variant="secondary" className="text-xs shrink-0">
                      {group.items.filter((i) => i.checked).length}/{group.items.length}
                    </Badge>
                  </button>

                  {!isCollapsed && (
                    <div className="border-t divide-y">
                      {group.items.map((item) => (
                        <SingleItemRow
                          key={item.id}
                          item={item}
                          onTogglePurchased={() => togglePurchased(item.id)}
                          onTogglePacked={() => toggleTripItem(item.id)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {filteredTripGroups.length === 0 && (
            <div className="rounded-lg border border-dashed p-6 text-center text-muted-foreground">
              {filter === 'todo'
                ? 'Alles is gedaan! 🎉'
                : filter === 'purchased'
                ? 'Nog niets gekocht'
                : 'Geen items gevonden'}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function FilterButton({
  active,
  onClick,
  icon,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  count?: number;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors',
        active
          ? 'border-primary bg-primary/10 text-primary'
          : 'border-border text-muted-foreground hover:border-primary/50'
      )}
    >
      {icon}
      {label}
      {count !== undefined && count > 0 && (
        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 ml-0.5">
          {count}
        </Badge>
      )}
    </button>
  );
}

function ShoppingItemRow({
  item,
  onTogglePurchased,
  onTogglePacked,
}: {
  item: AggregatedItem;
  onTogglePurchased: () => void;
  onTogglePacked: () => void;
}) {
  const qty = item.totalQuantity;

  // Three-level status: not done → purchased → packed
  return (
    <div className="px-3 py-2.5">
      <div className="flex items-center gap-2">
        {/* Step 1: Purchase toggle */}
        <button
          onClick={onTogglePurchased}
          className="shrink-0"
          title={item.allPurchased ? 'Markeer als niet gekocht' : 'Markeer als gekocht'}
        >
          {item.allPurchased ? (
            <ShoppingBag className="h-5 w-5 text-blue-600" />
          ) : (
            <Circle className="h-5 w-5 text-muted-foreground" />
          )}
        </button>

        {/* Item info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span
              className={cn(
                'text-sm',
                item.allPacked && 'line-through text-muted-foreground'
              )}
            >
              {item.name}
            </span>
            {qty > 1 && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 shrink-0">
                ×{qty}
              </Badge>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground truncate">
            {item.tripNames.join(', ')}
          </p>
        </div>

        {/* Step 2: Pack toggle (only visible if purchased) */}
        {item.allPurchased && (
          <button
            onClick={onTogglePacked}
            className="shrink-0"
            title={item.allPacked ? 'Markeer als niet ingepakt' : 'Markeer als ingepakt'}
          >
            {item.allPacked ? (
              <PackageCheck className="h-5 w-5 text-green-600" />
            ) : (
              <Package className="h-5 w-5 text-blue-400" />
            )}
          </button>
        )}

        {/* Status badge */}
        <Badge
          variant="outline"
          className={cn(
            'text-[10px] shrink-0',
            item.allPacked
              ? 'border-green-200 text-green-700 bg-green-50 dark:border-green-800 dark:text-green-300 dark:bg-green-950'
              : item.allPurchased
              ? 'border-blue-200 text-blue-700 bg-blue-50 dark:border-blue-800 dark:text-blue-300 dark:bg-blue-950'
              : ''
          )}
        >
          {item.allPacked ? 'Ingepakt' : item.allPurchased ? 'Gekocht' : 'Te kopen'}
        </Badge>
      </div>
    </div>
  );
}

function SingleItemRow({
  item,
  onTogglePurchased,
  onTogglePacked,
}: {
  item: TripItem;
  onTogglePurchased: () => void;
  onTogglePacked: () => void;
}) {
  const qty = item.quantity ?? 1;
  const isPurchased = !!item.purchased;
  const isPacked = item.checked;

  return (
    <div className="px-3 py-2.5">
      <div className="flex items-center gap-2">
        {/* Step 1: Purchase toggle */}
        <button
          onClick={onTogglePurchased}
          className="shrink-0"
          title={isPurchased ? 'Markeer als niet gekocht' : 'Markeer als gekocht'}
        >
          {isPurchased ? (
            <ShoppingBag className="h-5 w-5 text-blue-600" />
          ) : (
            <Circle className="h-5 w-5 text-muted-foreground" />
          )}
        </button>

        {/* Item info */}
        <div className="flex-1 min-w-0">
          <span
            className={cn(
              'text-sm',
              isPacked && 'line-through text-muted-foreground'
            )}
          >
            {item.name}
          </span>
          {qty > 1 && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 ml-1.5 shrink-0">
              ×{qty}
            </Badge>
          )}
        </div>

        {/* Step 2: Pack toggle (only visible if purchased) */}
        {isPurchased && (
          <button
            onClick={onTogglePacked}
            className="shrink-0"
            title={isPacked ? 'Markeer als niet ingepakt' : 'Markeer als ingepakt'}
          >
            {isPacked ? (
              <PackageCheck className="h-5 w-5 text-green-600" />
            ) : (
              <Package className="h-5 w-5 text-blue-400" />
            )}
          </button>
        )}

        {/* Status badge */}
        <Badge
          variant="outline"
          className={cn(
            'text-[10px] shrink-0',
            isPacked
              ? 'border-green-200 text-green-700 bg-green-50 dark:border-green-800 dark:text-green-300 dark:bg-green-950'
              : isPurchased
              ? 'border-blue-200 text-blue-700 bg-blue-50 dark:border-blue-800 dark:text-blue-300 dark:bg-blue-950'
              : ''
          )}
        >
          {isPacked ? 'Ingepakt' : isPurchased ? 'Gekocht' : 'Te kopen'}
        </Badge>
      </div>
    </div>
  );
}
