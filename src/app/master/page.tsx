'use client';

import { useState } from 'react';
import { useAppStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import {
  Plus,
  Minus,
  Trash2,
  Edit2,
  ChevronDown,
  ChevronRight,
  Search,
  X,
  FolderPlus,
  Users,
  UsersRound,
  Zap,
} from 'lucide-react';
import { SortableList, SortableItem, DragHandle } from '@/components/sortable-list';
import { cn } from '@/lib/utils';
import { MasterItem, Temperature, Activity } from '@/lib/types';
import { temperatureLabels, getAllActivities, getActivityLabel } from '@/lib/constants';
import { toast } from 'sonner';

export default function MasterListPage() {
  const categories = useAppStore((s) => s.categories);
  const masterItems = useAppStore((s) => s.masterItems);
  const customActivities = useAppStore((s) => s.customActivities);
  const addMasterItem = useAppStore((s) => s.addMasterItem);
  const updateMasterItem = useAppStore((s) => s.updateMasterItem);
  const deleteMasterItem = useAppStore((s) => s.deleteMasterItem);
  const reorderMasterItems = useAppStore((s) => s.reorderMasterItems);
  const addCategory = useAppStore((s) => s.addCategory);
  const updateCategory = useAppStore((s) => s.updateCategory);
  const deleteCategory = useAppStore((s) => s.deleteCategory);
  const reorderCategories = useAppStore((s) => s.reorderCategories);
  const currentGroup = useAppStore((s) => s.currentGroup);
  const personalBackupItems = useAppStore((s) => s.personalBackupItems);
  const addPersonalItemToGroup = useAppStore((s) => s.addPersonalItemToGroup);
  const addCustomActivity = useAppStore((s) => s.addCustomActivity);
  const updateCustomActivity = useAppStore((s) => s.updateCustomActivity);
  const deleteCustomActivity = useAppStore((s) => s.deleteCustomActivity);

  const [searchQuery, setSearchQuery] = useState('');
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
  const [showAddItem, setShowAddItem] = useState(false);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [showActivityManager, setShowActivityManager] = useState(false);
  const [editingItem, setEditingItem] = useState<MasterItem | null>(null);
  const [editingCategory, setEditingCategory] = useState<{ id: string; name: string; icon: string } | null>(null);
  const [editingActivity, setEditingActivity] = useState<{ id: string; name: string; icon: string } | null>(null);

  // Add item form state
  const [newItemName, setNewItemName] = useState('');
  const [newItemCategory, setNewItemCategory] = useState('');
  const [newItemWeather, setNewItemWeather] = useState<Temperature[]>([]);
  const [newItemActivities, setNewItemActivities] = useState<Activity[]>([]);
  const [newItemMinPeople, setNewItemMinPeople] = useState<number>(0);
  const [newItemQuantity, setNewItemQuantity] = useState(1);
  const [newItemPerPerson, setNewItemPerPerson] = useState(false);

  // Add category form state
  const [newCatName, setNewCatName] = useState('');
  const [newCatIcon, setNewCatIcon] = useState('📦');

  // Add custom activity form state
  const [newActivityName, setNewActivityName] = useState('');
  const [newActivityIcon, setNewActivityIcon] = useState('🎯');

  const allActivities = getAllActivities(customActivities);

  const handleDeleteMasterItem = (item: MasterItem) => {
    const deletedItem = { ...item };
    deleteMasterItem(item.id);
    toast('Item verwijderd', {
      description: `"${deletedItem.name}" is verwijderd.`,
      action: {
        label: 'Ongedaan maken',
        onClick: () => {
          useAppStore.setState((state) => ({
            masterItems: [...state.masterItems, deletedItem],
          }));
        },
      },
    });
  };

  const handleDeleteCategory = (catId: string) => {
    const deletedCategory = categories.find((c) => c.id === catId);
    if (!deletedCategory) return;
    const deletedItems = masterItems.filter((i) => i.categoryId === catId);
    deleteCategory(catId);
    toast('Categorie verwijderd', {
      description: `"${deletedCategory.name}" en ${deletedItems.length} items verwijderd.`,
      action: {
        label: 'Ongedaan maken',
        onClick: () => {
          useAppStore.setState((state) => ({
            categories: [...state.categories, deletedCategory],
            masterItems: [...state.masterItems, ...deletedItems],
          }));
        },
      },
    });
  };

  const handleDeleteCustomActivity = (activityId: string) => {
    const deletedActivity = customActivities.find((ca) => ca.id === activityId);
    if (!deletedActivity) return;
    // Snapshot master items before deletion (to restore activity references)
    const itemsBefore = masterItems.map((mi) => ({ ...mi }));
    deleteCustomActivity(activityId);
    toast('Activiteit verwijderd', {
      description: `"${deletedActivity.name}" is verwijderd.`,
      action: {
        label: 'Ongedaan maken',
        onClick: () => {
          useAppStore.setState((state) => ({
            customActivities: [...state.customActivities, deletedActivity],
            masterItems: itemsBefore,
          }));
        },
      },
    });
  };

  const toggleCategory = (categoryId: string) => {
    setCollapsedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) next.delete(categoryId);
      else next.add(categoryId);
      return next;
    });
  };

  const filteredItems = searchQuery
    ? masterItems.filter((mi) =>
        mi.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : masterItems;

  const groupedItems = new Map<string, MasterItem[]>();
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

  const emptyCategories = categories.filter((c) => !groupedItems.has(c.id));

  const resetItemForm = () => {
    setNewItemName('');
    setNewItemCategory('');
    setNewItemWeather([]);
    setNewItemActivities([]);
    setNewItemMinPeople(0);
    setNewItemQuantity(1);
    setNewItemPerPerson(false);
  };

  const handleAddItem = () => {
    if (!newItemName.trim() || !newItemCategory) return;
    addMasterItem({
      name: newItemName.trim(),
      categoryId: newItemCategory,
      conditions: {
        ...(newItemWeather.length > 0 ? { weather: newItemWeather } : {}),
        ...(newItemActivities.length > 0 ? { activities: newItemActivities } : {}),
        ...(newItemMinPeople > 0 ? { minPeople: newItemMinPeople } : {}),
      },
      quantity: newItemQuantity > 1 ? newItemQuantity : undefined,
      perPerson: newItemPerPerson || undefined,
    });
    resetItemForm();
    setShowAddItem(false);
  };

  const handleUpdateItem = () => {
    if (!editingItem) return;
    updateMasterItem(editingItem.id, {
      name: editingItem.name,
      categoryId: editingItem.categoryId,
      conditions: editingItem.conditions,
      quantity: editingItem.quantity,
      perPerson: editingItem.perPerson,
    });
    setEditingItem(null);
  };

  const handleAddCategory = () => {
    if (!newCatName.trim()) return;
    addCategory(newCatName.trim(), newCatIcon);
    setNewCatName('');
    setNewCatIcon('📦');
    setShowAddCategory(false);
  };

  const handleAddCustomActivity = () => {
    if (!newActivityName.trim()) return;
    addCustomActivity(newActivityName.trim(), newActivityIcon);
    setNewActivityName('');
    setNewActivityIcon('🎯');
  };

  // Handle category reordering
  const categoryIds = sortedCategories.map((c) => c.id);
  const handleReorderCategories = (orderedIds: string[]) => {
    const reordered = orderedIds.map((id, index) => {
      const cat = categories.find((c) => c.id === id)!;
      return { ...cat, sortOrder: index };
    });
    // Include categories that weren't in the sortable list (empty ones)
    const otherCats = categories.filter((c) => !orderedIds.includes(c.id));
    reorderCategories([...reordered, ...otherCats]);
  };

  return (
    <div className="mx-auto max-w-lg px-4 pt-6">
      <div className="mb-4">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold">Standaardlijst</h1>
          {currentGroup && (
            <Badge className="bg-blue-100 text-blue-800 gap-1">
              <UsersRound className="h-3 w-3" />
              {currentGroup.name}
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          {currentGroup
            ? 'Gedeelde lijst van je groep. Wijzigingen zijn zichtbaar voor alle leden.'
            : 'Beheer je standaard paklijst. Sleep items om te herordenen.'}
        </p>
      </div>

      <div className="mb-4 flex gap-2 flex-wrap">
        <Dialog open={showAddItem} onOpenChange={(open) => { setShowAddItem(open); if (!open) resetItemForm(); }}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1">
              <Plus className="h-4 w-4" />
              Item
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Item toevoegen</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Naam</Label>
                <Input
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  placeholder="Item naam"
                />
              </div>
              <div className="space-y-2">
                <Label>Categorie</Label>
                <Select value={newItemCategory} onValueChange={setNewItemCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Kies categorie" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.sort((a, b) => a.sortOrder - b.sortOrder).map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.icon} {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Standaard aantal</Label>
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
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => setNewItemPerPerson(!newItemPerPerson)}
                  className={cn(
                    'flex items-center gap-2 rounded-lg border px-3 py-2 text-sm w-full transition-colors',
                    newItemPerPerson
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border text-muted-foreground'
                  )}
                >
                  <Users className="h-4 w-4" />
                  <span className="font-medium">Per persoon</span>
                  <span className="text-xs ml-auto">
                    {newItemPerPerson ? 'Ja — vermenigvuldigt met aantal personen' : 'Nee — vast aantal'}
                  </span>
                </button>
              </div>
              <div className="space-y-2">
                <Label>Weer (optioneel)</Label>
                <div className="flex flex-wrap gap-2">
                  {(Object.keys(temperatureLabels) as Temperature[]).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() =>
                        setNewItemWeather((prev) =>
                          prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]
                        )
                      }
                      className={cn(
                        'rounded-md border px-3 py-1 text-xs transition-colors',
                        newItemWeather.includes(t)
                          ? 'border-primary bg-primary/10'
                          : 'border-border'
                      )}
                    >
                      {temperatureLabels[t]}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Activiteiten (optioneel)</Label>
                <div className="flex flex-wrap gap-2">
                  {allActivities.map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() =>
                        setNewItemActivities((prev) =>
                          prev.includes(a.id) ? prev.filter((x) => x !== a.id) : [...prev, a.id]
                        )
                      }
                      className={cn(
                        'rounded-md border px-3 py-1 text-xs transition-colors',
                        newItemActivities.includes(a.id)
                          ? 'border-primary bg-primary/10'
                          : 'border-border'
                      )}
                    >
                      {a.icon} {a.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Minimum personen (0 = altijd)</Label>
                <Input
                  type="number"
                  min={0}
                  max={10}
                  value={newItemMinPeople}
                  onChange={(e) => setNewItemMinPeople(Number(e.target.value))}
                />
              </div>
              <Button onClick={handleAddItem} className="w-full" disabled={!newItemName.trim() || !newItemCategory}>
                Toevoegen
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={showAddCategory} onOpenChange={setShowAddCategory}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline" className="gap-1">
              <FolderPlus className="h-4 w-4" />
              Categorie
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Categorie toevoegen</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Naam</Label>
                <Input
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  placeholder="Categorie naam"
                />
              </div>
              <div className="space-y-2">
                <Label>Icoon (emoji)</Label>
                <Input
                  value={newCatIcon}
                  onChange={(e) => setNewCatIcon(e.target.value)}
                  placeholder="📦"
                  className="text-center text-2xl w-20"
                />
              </div>
              <Button onClick={handleAddCategory} className="w-full" disabled={!newCatName.trim()}>
                Toevoegen
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={showActivityManager} onOpenChange={setShowActivityManager}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline" className="gap-1">
              <Zap className="h-4 w-4" />
              Activiteit
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Activiteiten beheren</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {/* Built-in activities (read-only) */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Standaard activiteiten</Label>
                <div className="flex flex-wrap gap-2">
                  {allActivities
                    .filter((a) => !a.id.startsWith('custom_'))
                    .map((a) => (
                      <Badge key={a.id} variant="secondary" className="text-xs gap-1">
                        {a.icon} {a.label}
                      </Badge>
                    ))}
                </div>
              </div>

              {/* Custom activities (editable) */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Eigen activiteiten</Label>
                {customActivities.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nog geen eigen activiteiten.</p>
                ) : (
                  <div className="space-y-2">
                    {customActivities.map((ca) => (
                      <div key={ca.id} className="flex items-center gap-2 rounded-lg border p-2">
                        <span className="text-lg">{ca.icon}</span>
                        <span className="flex-1 text-sm font-medium">{ca.name}</span>
                        <button
                          onClick={() => setEditingActivity({ id: ca.id, name: ca.name, icon: ca.icon })}
                          className="p-1 text-muted-foreground hover:text-foreground"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteCustomActivity(ca.id)}
                          className="p-1 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Add new custom activity */}
              <div className="border-t pt-4 space-y-3">
                <Label>Nieuwe activiteit</Label>
                <div className="flex gap-2">
                  <Input
                    value={newActivityIcon}
                    onChange={(e) => setNewActivityIcon(e.target.value)}
                    placeholder="🎯"
                    className="text-center text-2xl w-16 shrink-0"
                  />
                  <Input
                    value={newActivityName}
                    onChange={(e) => setNewActivityName(e.target.value)}
                    placeholder="Naam activiteit"
                    className="flex-1"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAddCustomActivity();
                    }}
                  />
                </div>
                <Button
                  onClick={handleAddCustomActivity}
                  className="w-full"
                  disabled={!newActivityName.trim()}
                  size="sm"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Toevoegen
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="mb-4 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Zoeken in standaardlijst..."
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
        <SortableList items={categoryIds} onReorder={handleReorderCategories}>
          {sortedCategories.map((category) => {
            const items = groupedItems.get(category.id) || [];
            const isCollapsed = collapsedCategories.has(category.id);
            const itemIds = items.map((i) => i.id);

            return (
              <SortableItem key={category.id} id={category.id}>
                <div className="rounded-lg border mb-2">
                  <div className="flex items-center">
                    <DragHandle className="shrink-0 pl-2" />
                    <button
                      onClick={() => toggleCategory(category.id)}
                      className="flex flex-1 items-center gap-2 p-3 text-left"
                    >
                      {isCollapsed ? (
                        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                      )}
                      <span className="text-base">{category.icon}</span>
                      <span className="flex-1 font-medium text-sm">{category.name}</span>
                      <Badge variant="secondary" className="text-xs">
                        {items.length}
                      </Badge>
                    </button>
                    <button
                      onClick={() =>
                        setEditingCategory({ id: category.id, name: category.name, icon: category.icon })
                      }
                      className="p-2 text-muted-foreground hover:text-foreground"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {!isCollapsed && (
                    <div className="border-t">
                      <SortableList
                        items={itemIds}
                        onReorder={(orderedIds) =>
                          reorderMasterItems(category.id, orderedIds)
                        }
                      >
                        {items.map((item) => {
                          const qty = item.quantity ?? 1;
                          return (
                            <SortableItem key={item.id} id={item.id}>
                              <div className="flex items-center gap-1 px-2 py-2.5 border-b last:border-b-0">
                                <DragHandle className="shrink-0 p-1" />
                                <span className="flex-1 text-sm min-w-0 truncate">{item.name}</span>
                                <div className="flex items-center gap-1 shrink-0">
                                  {(qty > 1 || item.perPerson) && (
                                    <Badge variant="secondary" className="text-[10px] px-1.5">
                                      {item.perPerson ? `${qty} p.p.` : `×${qty}`}
                                    </Badge>
                                  )}
                                  {item.conditions.weather && item.conditions.weather.length > 0 && (
                                    <Badge variant="outline" className="text-[10px]">
                                      {item.conditions.weather.join(', ')}
                                    </Badge>
                                  )}
                                  {item.conditions.activities && item.conditions.activities.length > 0 && (
                                    <Badge variant="outline" className="text-[10px]">
                                      {item.conditions.activities.map((a) => getActivityLabel(a, customActivities)).join(', ')}
                                    </Badge>
                                  )}
                                  {item.conditions.minPeople && (
                                    <Badge variant="outline" className="text-[10px]">
                                      {item.conditions.minPeople}+ pers.
                                    </Badge>
                                  )}
                                  <button
                                    onClick={() => setEditingItem({ ...item })}
                                    className="p-1 text-muted-foreground hover:text-foreground"
                                  >
                                    <Edit2 className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteMasterItem(item)}
                                    className="p-1 text-muted-foreground hover:text-destructive"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </div>
                            </SortableItem>
                          );
                        })}
                      </SortableList>

                      {/* Personal backup items suggestion for this category */}
                      {currentGroup && (() => {
                        const catBackupItems = personalBackupItems.filter(
                          (bi) => bi.categoryId === category.id
                        );
                        if (catBackupItems.length === 0) return null;
                        return (
                          <div className="border-t bg-amber-50 dark:bg-amber-950/30">
                            <div className="px-3 py-1.5 flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-400 font-medium">
                              <Users className="h-3 w-3" />
                              Jouw persoonlijke items
                            </div>
                            {catBackupItems.map((bi) => (
                              <div
                                key={bi.id}
                                className="flex items-center gap-2 px-3 py-2 border-t border-amber-200 dark:border-amber-800"
                              >
                                <span className="flex-1 text-sm text-amber-800 dark:text-amber-300 truncate">
                                  {bi.name}
                                </span>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-xs gap-1 border-amber-300 text-amber-700 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-400 dark:hover:bg-amber-900"
                                  onClick={() => addPersonalItemToGroup(bi.id)}
                                >
                                  <Plus className="h-3 w-3" />
                                  Toevoegen
                                </Button>
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
              </SortableItem>
            );
          })}
        </SortableList>

        {emptyCategories.length > 0 && !searchQuery && (
          <div className="mt-4">
            <h3 className="text-sm font-medium text-muted-foreground mb-2">Lege categorieën</h3>
            {emptyCategories.map((cat) => (
              <div key={cat.id} className="flex items-center gap-2 rounded-lg border p-3 mb-2">
                <span>{cat.icon}</span>
                <span className="flex-1 text-sm text-muted-foreground">{cat.name}</span>
                <button
                  onClick={() =>
                    setEditingCategory({ id: cat.id, name: cat.name, icon: cat.icon })
                  }
                  className="p-1 text-muted-foreground hover:text-foreground"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => handleDeleteCategory(cat.id)}
                  className="p-1 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Personal backup items in categories not shown above */}
        {currentGroup && !searchQuery && (() => {
          const shownCategoryIds = new Set([
            ...sortedCategories.map((c) => c.id),
            ...emptyCategories.map((c) => c.id),
          ]);
          const orphanBackupItems = personalBackupItems.filter(
            (bi) => !shownCategoryIds.has(bi.categoryId)
          );
          if (orphanBackupItems.length === 0) return null;
          return (
            <div className="mt-4">
              <h3 className="text-sm font-medium text-amber-700 dark:text-amber-400 mb-2 flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5" />
                Overige persoonlijke items
              </h3>
              <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 overflow-hidden">
                {orphanBackupItems.map((bi) => (
                  <div
                    key={bi.id}
                    className="flex items-center gap-2 px-3 py-2 border-b border-amber-200 dark:border-amber-800 last:border-b-0"
                  >
                    <span className="flex-1 text-sm text-amber-800 dark:text-amber-300 truncate">
                      {bi.name}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs gap-1 border-amber-300 text-amber-700 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-400 dark:hover:bg-amber-900"
                      onClick={() => addPersonalItemToGroup(bi.id)}
                    >
                      <Plus className="h-3 w-3" />
                      Toevoegen
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}
      </div>

      {/* Edit item dialog */}
      <Dialog open={!!editingItem} onOpenChange={(open) => !open && setEditingItem(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Item bewerken</DialogTitle>
          </DialogHeader>
          {editingItem && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Naam</Label>
                <Input
                  value={editingItem.name}
                  onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Categorie</Label>
                <Select
                  value={editingItem.categoryId}
                  onValueChange={(v) => setEditingItem({ ...editingItem, categoryId: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.sort((a, b) => a.sortOrder - b.sortOrder).map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.icon} {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Standaard aantal</Label>
                <div className="flex items-center gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setEditingItem({ ...editingItem, quantity: Math.max(1, (editingItem.quantity ?? 1) - 1) })}
                  >
                    <Minus className="h-3 w-3" />
                  </Button>
                  <span className="w-8 text-center font-medium">{editingItem.quantity ?? 1}</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setEditingItem({ ...editingItem, quantity: Math.min(99, (editingItem.quantity ?? 1) + 1) })}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingItem({ ...editingItem, perPerson: !editingItem.perPerson })}
                className={cn(
                  'flex items-center gap-2 rounded-lg border px-3 py-2 text-sm w-full transition-colors',
                  editingItem.perPerson
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border text-muted-foreground'
                )}
              >
                <Users className="h-4 w-4" />
                <span className="font-medium">Per persoon</span>
                <span className="text-xs ml-auto">
                  {editingItem.perPerson ? 'Ja — vermenigvuldigt' : 'Nee — vast aantal'}
                </span>
              </button>
              <div className="space-y-2">
                <Label>Weer</Label>
                <div className="flex flex-wrap gap-2">
                  {(Object.keys(temperatureLabels) as Temperature[]).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() =>
                        setEditingItem({
                          ...editingItem,
                          conditions: {
                            ...editingItem.conditions,
                            weather: editingItem.conditions.weather?.includes(t)
                              ? editingItem.conditions.weather.filter((x) => x !== t)
                              : [...(editingItem.conditions.weather || []), t],
                          },
                        })
                      }
                      className={cn(
                        'rounded-md border px-3 py-1 text-xs transition-colors',
                        editingItem.conditions.weather?.includes(t)
                          ? 'border-primary bg-primary/10'
                          : 'border-border'
                      )}
                    >
                      {temperatureLabels[t]}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Activiteiten</Label>
                <div className="flex flex-wrap gap-2">
                  {allActivities.map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() =>
                        setEditingItem({
                          ...editingItem,
                          conditions: {
                            ...editingItem.conditions,
                            activities: editingItem.conditions.activities?.includes(a.id)
                              ? editingItem.conditions.activities.filter((x) => x !== a.id)
                              : [...(editingItem.conditions.activities || []), a.id],
                          },
                        })
                      }
                      className={cn(
                        'rounded-md border px-3 py-1 text-xs transition-colors',
                        editingItem.conditions.activities?.includes(a.id)
                          ? 'border-primary bg-primary/10'
                          : 'border-border'
                      )}
                    >
                      {a.icon} {a.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleUpdateItem} className="flex-1">
                  Opslaan
                </Button>
                <Button variant="destructive" onClick={() => { handleDeleteMasterItem(editingItem); setEditingItem(null); }}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit category dialog */}
      <Dialog open={!!editingCategory} onOpenChange={(open) => !open && setEditingCategory(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Categorie bewerken</DialogTitle>
          </DialogHeader>
          {editingCategory && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Naam</Label>
                <Input
                  value={editingCategory.name}
                  onChange={(e) => setEditingCategory({ ...editingCategory, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Icoon (emoji)</Label>
                <Input
                  value={editingCategory.icon}
                  onChange={(e) => setEditingCategory({ ...editingCategory, icon: e.target.value })}
                  className="text-center text-2xl w-20"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    updateCategory(editingCategory.id, editingCategory.name, editingCategory.icon);
                    setEditingCategory(null);
                  }}
                  className="flex-1"
                >
                  Opslaan
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    handleDeleteCategory(editingCategory.id);
                    setEditingCategory(null);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit custom activity dialog */}
      <Dialog open={!!editingActivity} onOpenChange={(open) => !open && setEditingActivity(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Activiteit bewerken</DialogTitle>
          </DialogHeader>
          {editingActivity && (
            <div className="space-y-4">
              <div className="flex gap-2">
                <div className="space-y-2">
                  <Label>Icoon</Label>
                  <Input
                    value={editingActivity.icon}
                    onChange={(e) => setEditingActivity({ ...editingActivity, icon: e.target.value })}
                    className="text-center text-2xl w-16"
                  />
                </div>
                <div className="space-y-2 flex-1">
                  <Label>Naam</Label>
                  <Input
                    value={editingActivity.name}
                    onChange={(e) => setEditingActivity({ ...editingActivity, name: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    updateCustomActivity(editingActivity.id, editingActivity.name, editingActivity.icon);
                    setEditingActivity(null);
                  }}
                  className="flex-1"
                >
                  Opslaan
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    handleDeleteCustomActivity(editingActivity.id);
                    setEditingActivity(null);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
