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
  Trash2,
  Edit2,
  ChevronDown,
  ChevronRight,
  Search,
  X,
  FolderPlus,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { MasterItem, Temperature, Activity } from '@/lib/types';
import { temperatureLabels, activityLabels } from '@/lib/constants';

export default function MasterListPage() {
  const categories = useAppStore((s) => s.categories);
  const masterItems = useAppStore((s) => s.masterItems);
  const addMasterItem = useAppStore((s) => s.addMasterItem);
  const updateMasterItem = useAppStore((s) => s.updateMasterItem);
  const deleteMasterItem = useAppStore((s) => s.deleteMasterItem);
  const addCategory = useAppStore((s) => s.addCategory);
  const updateCategory = useAppStore((s) => s.updateCategory);
  const deleteCategory = useAppStore((s) => s.deleteCategory);

  const [searchQuery, setSearchQuery] = useState('');
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
  const [showAddItem, setShowAddItem] = useState(false);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [editingItem, setEditingItem] = useState<MasterItem | null>(null);
  const [editingCategory, setEditingCategory] = useState<{ id: string; name: string; icon: string } | null>(null);

  // Add item form state
  const [newItemName, setNewItemName] = useState('');
  const [newItemCategory, setNewItemCategory] = useState('');
  const [newItemWeather, setNewItemWeather] = useState<Temperature[]>([]);
  const [newItemActivities, setNewItemActivities] = useState<Activity[]>([]);
  const [newItemMinPeople, setNewItemMinPeople] = useState<number>(0);

  // Add category form state
  const [newCatName, setNewCatName] = useState('');
  const [newCatIcon, setNewCatIcon] = useState('📦');

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

  return (
    <div className="mx-auto max-w-lg px-4 pt-6">
      <div className="mb-4">
        <h1 className="text-2xl font-bold">Standaardlijst</h1>
        <p className="text-sm text-muted-foreground">
          Beheer je standaard paklijst. Items worden gebruikt bij het aanmaken van nieuwe trips.
        </p>
      </div>

      <div className="mb-4 flex gap-2">
        <Dialog open={showAddItem} onOpenChange={(open) => { setShowAddItem(open); if (!open) resetItemForm(); }}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1">
              <Plus className="h-4 w-4" />
              Item
            </Button>
          </DialogTrigger>
          <DialogContent>
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
                  {(Object.keys(activityLabels) as Activity[]).map((a) => (
                    <button
                      key={a}
                      type="button"
                      onClick={() =>
                        setNewItemActivities((prev) =>
                          prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]
                        )
                      }
                      className={cn(
                        'rounded-md border px-3 py-1 text-xs transition-colors',
                        newItemActivities.includes(a)
                          ? 'border-primary bg-primary/10'
                          : 'border-border'
                      )}
                    >
                      {activityLabels[a]}
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
        {sortedCategories.map((category) => {
          const items = groupedItems.get(category.id) || [];
          const isCollapsed = collapsedCategories.has(category.id);

          return (
            <div key={category.id} className="rounded-lg border">
              <div className="flex items-center">
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
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-2 px-3 py-2.5 border-b last:border-b-0"
                    >
                      <span className="flex-1 text-sm">{item.name}</span>
                      <div className="flex items-center gap-1">
                        {item.conditions.weather && item.conditions.weather.length > 0 && (
                          <Badge variant="outline" className="text-[10px]">
                            {item.conditions.weather.join(', ')}
                          </Badge>
                        )}
                        {item.conditions.activities && item.conditions.activities.length > 0 && (
                          <Badge variant="outline" className="text-[10px]">
                            {item.conditions.activities.map((a) => activityLabels[a]).join(', ')}
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
                          onClick={() => deleteMasterItem(item.id)}
                          className="p-1 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}

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
                  onClick={() => deleteCategory(cat.id)}
                  className="p-1 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit item dialog */}
      <Dialog open={!!editingItem} onOpenChange={(open) => !open && setEditingItem(null)}>
        <DialogContent>
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
              <div className="flex gap-2">
                <Button onClick={handleUpdateItem} className="flex-1">
                  Opslaan
                </Button>
                <Button variant="destructive" onClick={() => { deleteMasterItem(editingItem.id); setEditingItem(null); }}>
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
                    deleteCategory(editingCategory.id);
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
    </div>
  );
}
