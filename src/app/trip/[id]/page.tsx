'use client';

import { use, useState } from 'react';
import { useAppStore } from '@/lib/store';
import { useShallow } from 'zustand/react/shallow';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  ArrowLeft,
  Plus,
  ChevronDown,
  ChevronRight,
  Search,
  MoreVertical,
  Save,
  Trash2,
  CheckCircle2,
  Circle,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { temperatureIcons } from '@/lib/constants';
import { TripItem } from '@/lib/types';

export default function TripDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const trips = useAppStore((s) => s.trips);
  const allTripItems = useAppStore((s) => s.tripItems);
  const categories = useAppStore((s) => s.categories);
  const trip = trips.find((t) => t.id === id);
  const tripItems = allTripItems.filter((ti) => ti.tripId === id);
  const toggleTripItem = useAppStore((s) => s.toggleTripItem);
  const addTripItem = useAppStore((s) => s.addTripItem);
  const deleteTripItem = useAppStore((s) => s.deleteTripItem);
  const saveTripItemToMaster = useAppStore((s) => s.saveTripItemToMaster);
  const updateTrip = useAppStore((s) => s.updateTrip);

  const [searchQuery, setSearchQuery] = useState('');
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
  const [showAddItem, setShowAddItem] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemCategory, setNewItemCategory] = useState('');

  if (!trip) {
    return (
      <div className="mx-auto max-w-lg px-4 pt-6 text-center">
        <p className="text-muted-foreground">Trip niet gevonden</p>
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

  const filteredItems = searchQuery
    ? tripItems.filter((ti) =>
        ti.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : tripItems;

  const groupedItems = new Map<string, TripItem[]>();
  for (const item of filteredItems) {
    const existing = groupedItems.get(item.categoryId) || [];
    existing.push(item);
    groupedItems.set(item.categoryId, existing);
  }

  const sortedCategories = categories
    .filter((c) => groupedItems.has(c.id))
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const totalChecked = tripItems.filter((ti) => ti.checked).length;
  const totalItems = tripItems.length;
  const progress = totalItems > 0 ? (totalChecked / totalItems) * 100 : 0;

  const handleAddItem = () => {
    if (!newItemName.trim() || !newItemCategory) return;
    addTripItem(id, newItemName.trim(), newItemCategory);
    setNewItemName('');
    setShowAddItem(false);
  };

  const statusActions = [
    { value: 'planning', label: 'Planning' },
    { value: 'active', label: 'Actief' },
    { value: 'completed', label: 'Voltooid' },
  ] as const;

  return (
    <div className="mx-auto max-w-lg px-4 pt-6">
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
        <Select
          value={trip.status}
          onValueChange={(v) => updateTrip(trip.id, { status: v as typeof trip.status })}
        >
          <SelectTrigger className="w-[120px] h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {statusActions.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="mb-4 space-y-1">
        <div className="flex justify-between text-sm">
          <span className="font-medium">{totalChecked} / {totalItems} ingepakt</span>
          <span className="text-muted-foreground">{Math.round(progress)}%</span>
        </div>
        <Progress value={progress} className="h-3" />
      </div>

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
                    <ItemRow
                      key={item.id}
                      item={item}
                      onToggle={() => toggleTripItem(item.id)}
                      onDelete={() => deleteTripItem(item.id)}
                      onSaveToMaster={
                        item.isCustom ? () => saveTripItemToMaster(item.id) : undefined
                      }
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <Dialog open={showAddItem} onOpenChange={setShowAddItem}>
        <DialogTrigger asChild>
          <Button variant="outline" className="w-full mb-6 gap-2">
            <Plus className="h-4 w-4" />
            Item toevoegen
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Item toevoegen</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Input
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                placeholder="Naam van het item"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddItem();
                }}
              />
            </div>
            <Select value={newItemCategory} onValueChange={setNewItemCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Kies categorie" />
              </SelectTrigger>
              <SelectContent>
                {categories
                  .sort((a, b) => a.sortOrder - b.sortOrder)
                  .map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.icon} {c.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <Button
              onClick={handleAddItem}
              className="w-full"
              disabled={!newItemName.trim() || !newItemCategory}
            >
              Toevoegen
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ItemRow({
  item,
  onToggle,
  onDelete,
  onSaveToMaster,
}: {
  item: TripItem;
  onToggle: () => void;
  onDelete: () => void;
  onSaveToMaster?: () => void;
}) {
  const [showActions, setShowActions] = useState(false);

  return (
    <div className="flex items-center gap-2 px-3 py-2.5 border-b last:border-b-0">
      <button
        onClick={onToggle}
        className="flex-1 flex items-center gap-3 min-h-[44px] text-left"
      >
        {item.checked ? (
          <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
        ) : (
          <Circle className="h-5 w-5 text-muted-foreground shrink-0" />
        )}
        <span
          className={cn(
            'text-sm',
            item.checked && 'line-through text-muted-foreground'
          )}
        >
          {item.name}
        </span>
        {item.isCustom && (
          <Badge variant="outline" className="text-[10px] ml-auto shrink-0">
            custom
          </Badge>
        )}
      </button>
      <div className="relative">
        <button
          onClick={() => setShowActions(!showActions)}
          className="p-1 text-muted-foreground hover:text-foreground"
        >
          <MoreVertical className="h-4 w-4" />
        </button>
        {showActions && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setShowActions(false)}
            />
            <div className="absolute right-0 top-8 z-20 rounded-lg border bg-background shadow-lg py-1 min-w-[160px]">
              {onSaveToMaster && (
                <button
                  onClick={() => {
                    onSaveToMaster();
                    setShowActions(false);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-accent"
                >
                  <Save className="h-4 w-4" />
                  Opslaan in standaardlijst
                </button>
              )}
              <button
                onClick={() => {
                  onDelete();
                  setShowActions(false);
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-accent"
              >
                <Trash2 className="h-4 w-4" />
                Verwijderen
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
