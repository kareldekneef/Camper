'use client';

import { use, useState, useRef, useCallback } from 'react';
import { useAppStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  Minus,
  ChevronDown,
  ChevronRight,
  Search,
  MoreVertical,
  Save,
  Trash2,
  CheckCircle2,
  Circle,
  X,
  RotateCcw,
  Edit2,
  MessageSquare,
  ShoppingCart,
  AlertTriangle,
  Check,
  Share2,
} from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { SortableList, SortableItem, DragHandle } from '@/components/sortable-list';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import {
  temperatureLabels,
  temperatureIcons,
  durationLabels,
  activityLabels,
  activityIcons,
} from '@/lib/constants';
import { TripItem, Activity, Duration, Temperature } from '@/lib/types';

type FilterMode = 'all' | 'unchecked' | 'shopping' | 'forgotten';

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
  const updateTripItem = useAppStore((s) => s.updateTripItem);
  const uncheckAllTripItems = useAppStore((s) => s.uncheckAllTripItems);
  const reorderTripItems = useAppStore((s) => s.reorderTripItems);

  const [searchQuery, setSearchQuery] = useState('');
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
  const [showAddItem, setShowAddItem] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemCategory, setNewItemCategory] = useState('');
  const [newItemQuantity, setNewItemQuantity] = useState(1);
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [showEditTrip, setShowEditTrip] = useState(false);
  const [showUncheckConfirm, setShowUncheckConfirm] = useState(false);
  const [shareStatus, setShareStatus] = useState<string>('');

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

  // Shopping category ID
  const shoppingCategoryId = categories.find(
    (c) => c.name.toLowerCase().includes('shopping') || c.name.toLowerCase().includes('voorbereiding')
  )?.id;

  // Apply filter mode
  let displayItems = tripItems;
  if (filterMode === 'unchecked') {
    displayItems = tripItems.filter((ti) => !ti.checked);
  } else if (filterMode === 'shopping') {
    displayItems = tripItems.filter((ti) => ti.categoryId === shoppingCategoryId && !ti.checked);
  } else if (filterMode === 'forgotten') {
    displayItems = tripItems.filter((ti) => !ti.checked);
  }

  // Apply search
  const filteredItems = searchQuery
    ? displayItems.filter((ti) =>
        ti.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : displayItems;

  const groupedItems = new Map<string, TripItem[]>();
  for (const item of filteredItems) {
    const existing = groupedItems.get(item.categoryId) || [];
    existing.push(item);
    groupedItems.set(item.categoryId, existing);
  }

  // Sort items within each category by sortOrder
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
  const totalForgotten = tripItems.filter((ti) => !ti.checked).length;
  const progress = totalItems > 0 ? (totalChecked / totalItems) * 100 : 0;

  const handleAddItem = () => {
    if (!newItemName.trim() || !newItemCategory) return;
    addTripItem(id, newItemName.trim(), newItemCategory, newItemQuantity);
    setNewItemName('');
    setNewItemQuantity(1);
    setShowAddItem(false);
  };

  const handleShareTrip = async () => {
    const sortedCats = categories
      .filter((c) => tripItems.some((ti) => ti.categoryId === c.id))
      .sort((a, b) => a.sortOrder - b.sortOrder);

    let text = `📋 ${trip.name}`;
    if (trip.destination) text += ` — ${trip.destination}`;
    text += '\n';
    if (trip.startDate && trip.endDate) {
      text += `📅 ${trip.startDate} t/m ${trip.endDate}\n`;
    }
    text += `${temperatureIcons[trip.temperature]} ${temperatureLabels[trip.temperature]} • ${durationLabels[trip.duration]} • ${trip.peopleCount} pers.\n`;
    text += `✅ ${totalChecked}/${totalItems} ingepakt (${Math.round(progress)}%)\n\n`;

    for (const cat of sortedCats) {
      const items = tripItems
        .filter((ti) => ti.categoryId === cat.id)
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
      text += `${cat.icon} ${cat.name}\n`;
      for (const item of items) {
        const qty = item.quantity ?? 1;
        text += `  ${item.checked ? '✅' : '⬜'} ${item.name}`;
        if (qty > 1) text += ` ×${qty}`;
        if (item.notes) text += ` (${item.notes})`;
        text += '\n';
      }
      text += '\n';
    }

    if (trip.notes) {
      text += `📝 Notities: ${trip.notes}\n`;
    }

    text += '— CamperPack';

    // Try native share first (mobile), fallback to clipboard
    if (navigator.share) {
      try {
        await navigator.share({ title: trip.name, text });
        return;
      } catch {
        // User cancelled or share failed, try clipboard
      }
    }

    try {
      await navigator.clipboard.writeText(text);
      setShareStatus('Gekopieerd naar klembord! 📋');
      setTimeout(() => setShareStatus(''), 2500);
    } catch {
      setShareStatus('Kon niet kopiëren');
      setTimeout(() => setShareStatus(''), 2500);
    }
  };

  const statusActions = [
    { value: 'planning', label: 'Planning' },
    { value: 'active', label: 'Actief' },
    { value: 'completed', label: 'Voltooid' },
  ] as const;

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
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => setShowEditTrip(true)}
        >
          <Edit2 className="h-4 w-4" />
        </Button>
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

      {/* Forgotten warning when trip is completed */}
      {trip.status === 'completed' && totalForgotten > 0 && filterMode !== 'forgotten' && (
        <button
          onClick={() => setFilterMode('forgotten')}
          className="mb-4 w-full flex items-center gap-2 rounded-lg border border-orange-200 bg-orange-50 p-3 text-sm text-orange-800 dark:border-orange-800 dark:bg-orange-950 dark:text-orange-200"
        >
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>{totalForgotten} item{totalForgotten !== 1 ? 's' : ''} niet ingepakt — tik om te bekijken</span>
        </button>
      )}

      {/* Filter buttons */}
      <div className="mb-4 flex gap-2 overflow-x-auto">
        <FilterButton
          active={filterMode === 'all'}
          onClick={() => setFilterMode('all')}
          icon={<CheckCircle2 className="h-3.5 w-3.5" />}
          label="Alles"
        />
        <FilterButton
          active={filterMode === 'unchecked'}
          onClick={() => setFilterMode('unchecked')}
          icon={<Circle className="h-3.5 w-3.5" />}
          label="Nog in te pakken"
        />
        {shoppingCategoryId && (
          <FilterButton
            active={filterMode === 'shopping'}
            onClick={() => setFilterMode('shopping')}
            icon={<ShoppingCart className="h-3.5 w-3.5" />}
            label="Shopping"
          />
        )}
        {trip.status === 'completed' && (
          <FilterButton
            active={filterMode === 'forgotten'}
            onClick={() => setFilterMode('forgotten')}
            icon={<AlertTriangle className="h-3.5 w-3.5" />}
            label="Vergeten"
          />
        )}
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

      {/* Category groups */}
      <div className="space-y-2 pb-4">
        {sortedCategories.map((category) => {
          const items = groupedItems.get(category.id) || [];
          const catChecked = items.filter((i) => i.checked).length;
          const isCollapsed = collapsedCategories.has(category.id);
          const itemIds = items.map((i) => i.id);

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
                  <SortableList
                    items={itemIds}
                    onReorder={(orderedIds) =>
                      reorderTripItems(id, category.id, orderedIds)
                    }
                  >
                    {items.map((item) => (
                      <SortableItem key={item.id} id={item.id}>
                        <ItemRow
                          item={item}
                          onToggle={() => toggleTripItem(item.id)}
                          onDelete={() => deleteTripItem(item.id)}
                          onUpdateNotes={(notes) =>
                            updateTripItem(item.id, { notes })
                          }
                          onUpdateQuantity={(quantity) =>
                            updateTripItem(item.id, { quantity })
                          }
                          onSaveToMaster={
                            item.isCustom ? () => saveTripItemToMaster(item.id) : undefined
                          }
                        />
                      </SortableItem>
                    ))}
                  </SortableList>
                </div>
              )}
            </div>
          );
        })}

        {filteredItems.length === 0 && (
          <div className="rounded-lg border border-dashed p-6 text-center text-muted-foreground">
            {filterMode === 'forgotten'
              ? 'Alles was ingepakt! Goed gedaan! 🎉'
              : filterMode === 'shopping'
              ? 'Alle shopping items zijn afgevinkt! ✅'
              : filterMode === 'unchecked'
              ? 'Alles is ingepakt! 🎉'
              : 'Geen items gevonden'}
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="space-y-2 mb-6">
        <Dialog open={showAddItem} onOpenChange={setShowAddItem}>
          <DialogTrigger asChild>
            <Button variant="outline" className="w-full gap-2">
              <Plus className="h-4 w-4" />
              Item toevoegen
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Item toevoegen</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Input
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                placeholder="Naam van het item"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddItem();
                }}
              />
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
              <div className="space-y-2">
                <Label>Aantal</Label>
                <div className="flex items-center gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setNewItemQuantity(Math.max(1, newItemQuantity - 1))}
                  >
                    <Minus className="h-3 w-3" />
                  </Button>
                  <span className="w-8 text-center font-medium">{newItemQuantity}</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setNewItemQuantity(Math.min(99, newItemQuantity + 1))}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
              </div>
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

        <Button variant="outline" className="w-full gap-2" onClick={handleShareTrip}>
          <Share2 className="h-4 w-4" />
          Lijst delen
        </Button>
        {shareStatus && (
          <p className="text-sm text-center text-muted-foreground">{shareStatus}</p>
        )}

        <Dialog open={showUncheckConfirm} onOpenChange={setShowUncheckConfirm}>
          <DialogTrigger asChild>
            <Button variant="ghost" className="w-full gap-2 text-muted-foreground">
              <RotateCcw className="h-4 w-4" />
              Alles uitvinken
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Alles uitvinken?</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              Alle items worden weer als &quot;niet ingepakt&quot; gemarkeerd. Handig voor een retourtrip.
            </p>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowUncheckConfirm(false)}>
                Annuleren
              </Button>
              <Button
                onClick={() => {
                  uncheckAllTripItems(id);
                  setShowUncheckConfirm(false);
                }}
              >
                Uitvinken
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Edit trip dialog */}
      <EditTripDialog
        trip={trip}
        open={showEditTrip}
        onOpenChange={setShowEditTrip}
      />
    </div>
  );
}

// Filter button component
function FilterButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
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
    </button>
  );
}

// Item row with swipe-to-check, notes, quantity, and drag handle support
function ItemRow({
  item,
  onToggle,
  onDelete,
  onUpdateNotes,
  onUpdateQuantity,
  onSaveToMaster,
}: {
  item: TripItem;
  onToggle: () => void;
  onDelete: () => void;
  onUpdateNotes: (notes: string) => void;
  onUpdateQuantity: (quantity: number) => void;
  onSaveToMaster?: () => void;
}) {
  const [showActions, setShowActions] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [noteText, setNoteText] = useState(item.notes || '');
  const [swipeX, setSwipeX] = useState(0);
  const [swiping, setSwiping] = useState(false);
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const swipeThreshold = 70;

  const quantity = item.quantity ?? 1;

  const handleSaveNotes = () => {
    onUpdateNotes(noteText.trim());
    setShowNotes(false);
  };

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
      time: Date.now(),
    };
    setSwiping(false);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const dx = e.touches[0].clientX - touchStartRef.current.x;
    const dy = e.touches[0].clientY - touchStartRef.current.y;
    // Only swipe horizontally — if vertical movement is larger, ignore
    if (Math.abs(dy) > Math.abs(dx) && !swiping) {
      touchStartRef.current = null;
      return;
    }
    if (Math.abs(dx) > 10) setSwiping(true);
    // Only allow right swipe (positive dx), capped at 100px
    setSwipeX(Math.max(0, Math.min(100, dx)));
  }, [swiping]);

  const handleTouchEnd = useCallback(() => {
    if (swipeX >= swipeThreshold) {
      onToggle();
    }
    setSwipeX(0);
    setSwiping(false);
    touchStartRef.current = null;
  }, [swipeX, onToggle]);

  const swipeProgress = Math.min(swipeX / swipeThreshold, 1);

  return (
    <div className="border-b last:border-b-0 relative overflow-hidden">
      {/* Swipe reveal background */}
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

      <div
        className="flex items-center gap-1 px-2 py-2.5 bg-background relative"
        style={{
          transform: `translateX(${swipeX}px)`,
          transition: swiping ? 'none' : 'transform 200ms ease-out',
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <DragHandle className="shrink-0 p-1" />
        <button
          onClick={swiping ? undefined : onToggle}
          className="flex-1 flex items-center gap-3 min-h-[44px] text-left"
        >
          {item.checked ? (
            <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
          ) : (
            <Circle className="h-5 w-5 text-muted-foreground shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span
                className={cn(
                  'text-sm',
                  item.checked && 'line-through text-muted-foreground'
                )}
              >
                {item.name}
              </span>
              {quantity > 1 && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 shrink-0">
                  ×{quantity}
                </Badge>
              )}
            </div>
            {item.notes && (
              <p className="text-xs text-muted-foreground mt-0.5 truncate">
                💬 {item.notes}
              </p>
            )}
          </div>
          {item.isCustom && (
            <Badge variant="outline" className="text-[10px] shrink-0">
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
              <div className="absolute right-0 top-8 z-20 rounded-lg border bg-background shadow-lg py-1 min-w-[200px]">
                {/* Quantity adjuster */}
                <div className="flex items-center justify-between px-3 py-2 text-sm">
                  <span>Aantal</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onUpdateQuantity(Math.max(1, quantity - 1))}
                      className="h-6 w-6 rounded border flex items-center justify-center hover:bg-accent"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="w-5 text-center font-medium">{quantity}</span>
                    <button
                      onClick={() => onUpdateQuantity(Math.min(99, quantity + 1))}
                      className="h-6 w-6 rounded border flex items-center justify-center hover:bg-accent"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                </div>
                <div className="border-t my-1" />
                <button
                  onClick={() => {
                    setShowNotes(true);
                    setShowActions(false);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-accent"
                >
                  <MessageSquare className="h-4 w-4" />
                  {item.notes ? 'Notitie bewerken' : 'Notitie toevoegen'}
                </button>
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

      {/* Notes dialog */}
      <Dialog open={showNotes} onOpenChange={setShowNotes}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Notitie — {item.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="bv. Rode jas, niet de blauwe"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveNotes();
              }}
            />
            <div className="flex gap-2">
              <Button onClick={handleSaveNotes} className="flex-1">
                Opslaan
              </Button>
              {item.notes && (
                <Button
                  variant="outline"
                  onClick={() => {
                    onUpdateNotes('');
                    setNoteText('');
                    setShowNotes(false);
                  }}
                >
                  Wissen
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Edit trip dialog
function EditTripDialog({
  trip,
  open,
  onOpenChange,
}: {
  trip: NonNullable<ReturnType<typeof useAppStore.getState>['trips'][number]>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const updateTrip = useAppStore((s) => s.updateTrip);

  const [name, setName] = useState(trip.name);
  const [destination, setDestination] = useState(trip.destination);
  const [startDate, setStartDate] = useState(trip.startDate);
  const [endDate, setEndDate] = useState(trip.endDate);
  const [temperature, setTemperature] = useState<Temperature>(trip.temperature);
  const [duration, setDuration] = useState<Duration>(trip.duration);
  const [peopleCount, setPeopleCount] = useState(trip.peopleCount);
  const [activities, setActivities] = useState<Activity[]>(trip.activities);
  const [notes, setNotes] = useState(trip.notes || '');

  const allActivities = Object.keys(activityLabels) as Activity[];

  const toggleActivity = (activity: Activity) => {
    setActivities((prev) =>
      prev.includes(activity)
        ? prev.filter((a) => a !== activity)
        : [...prev, activity]
    );
  };

  const handleSave = () => {
    updateTrip(trip.id, {
      name: name.trim() || trip.name,
      destination: destination.trim(),
      startDate,
      endDate,
      temperature,
      duration,
      peopleCount,
      activities,
      notes: notes.trim() || undefined,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Trip bewerken</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Naam</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Bestemming</Label>
            <Input value={destination} onChange={(e) => setDestination(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Vertrekdatum</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Terugkomst</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Temperatuur</Label>
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(temperatureLabels) as Temperature[]).map((temp) => (
                <button
                  key={temp}
                  type="button"
                  onClick={() => setTemperature(temp)}
                  className={cn(
                    'rounded-lg border p-2 text-center text-xs transition-colors',
                    temperature === temp
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border hover:border-primary/50'
                  )}
                >
                  <div className="text-lg">{temperatureIcons[temp]}</div>
                  <div className="font-medium">{temperatureLabels[temp].split(' ')[0]}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Duur</Label>
            <Select value={duration} onValueChange={(v) => setDuration(v as Duration)}>
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
              <Button type="button" variant="outline" size="icon" onClick={() => setPeopleCount(Math.max(1, peopleCount - 1))}>-</Button>
              <span className="w-8 text-center text-lg font-medium">{peopleCount}</span>
              <Button type="button" variant="outline" size="icon" onClick={() => setPeopleCount(Math.min(10, peopleCount + 1))}>+</Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Activiteiten</Label>
            <div className="grid grid-cols-2 gap-2">
              {allActivities.map((activity) => {
                const isSelected = activities.includes(activity);
                return (
                  <button
                    key={activity}
                    type="button"
                    onClick={() => toggleActivity(activity)}
                    className={cn(
                      'flex items-center gap-2 rounded-lg border p-2 text-xs transition-colors',
                      isSelected
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border hover:border-primary/50'
                    )}
                  >
                    <span>{activityIcons[activity]}</span>
                    <span className="font-medium">{activityLabels[activity]}</span>
                    {isSelected && <Check className="ml-auto h-3 w-3" />}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Trip notities (lessen geleerd)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="bv. Volgende keer extra handdoeken meenemen, campingplek 23 was de beste..."
              rows={4}
            />
          </div>

          <Button onClick={handleSave} className="w-full">
            Opslaan
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
