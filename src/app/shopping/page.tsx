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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { TripItem } from '@/lib/types';

// Shopping category detection
function isShoppingCategory(name: string): boolean {
  return name.toLowerCase().includes('shopping');
}

type ShoppingFilter = 'todo' | 'purchased' | 'all';

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

export default function ShoppingPage() {
  const trips = useAppStore((s) => s.trips);
  const tripItems = useAppStore((s) => s.tripItems);
  const categories = useAppStore((s) => s.categories);
  const togglePurchased = useAppStore((s) => s.togglePurchased);
  const toggleTripItem = useAppStore((s) => s.toggleTripItem);

  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<ShoppingFilter>('todo');

  // Only active/planning trips (not completed)
  const activeTrips = useMemo(
    () => trips.filter((t) => t.status !== 'completed'),
    [trips]
  );
  const activeTripIds = useMemo(
    () => new Set(activeTrips.map((t) => t.id)),
    [activeTrips]
  );
  const tripNameMap = useMemo(
    () => Object.fromEntries(activeTrips.map((t) => [t.id, t.name])),
    [activeTrips]
  );

  // Get shopping category IDs
  const shoppingCategoryIds = useMemo(
    () => new Set(categories.filter((c) => isShoppingCategory(c.name)).map((c) => c.id)),
    [categories]
  );

  // Aggregate shopping items across trips (group by name)
  const aggregatedItems = useMemo(() => {
    const activeItems = tripItems.filter(
      (ti) => activeTripIds.has(ti.tripId) && shoppingCategoryIds.has(ti.categoryId)
    );
    const groupMap = new Map<string, AggregatedItem>();

    for (const item of activeItems) {
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
  }, [tripItems, activeTripIds, tripNameMap, shoppingCategoryIds]);

  // Filter items
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

  // Stats
  const totalTodo = aggregatedItems.filter((i) => !i.allPurchased && !i.allPacked).length;
  const totalPurchased = aggregatedItems.filter((i) => i.allPurchased && !i.allPacked).length;
  const totalPacked = aggregatedItems.filter((i) => i.allPacked).length;

  if (activeTrips.length === 0) {
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
          <p className="text-muted-foreground">Geen actieve trips.</p>
          <Link href="/trip/new">
            <Button variant="link">Maak een nieuwe trip</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (aggregatedItems.length === 0) {
    return (
      <div className="mx-auto max-w-lg px-4 pt-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShoppingCart className="h-6 w-6" />
            Shopping
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {activeTrips.length} actieve trip{activeTrips.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="rounded-lg border border-dashed p-8 text-center">
          <ShoppingBag className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">Geen shopping items in je actieve trips.</p>
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
          {activeTrips.length} actieve trip{activeTrips.length !== 1 ? 's' : ''}
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

      {/* Items list */}
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
          {item.tripNames.length > 1 && (
            <p className="text-[11px] text-muted-foreground truncate">
              {item.tripNames.join(', ')}
            </p>
          )}
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
