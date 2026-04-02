'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import {
  fetchAllUsers,
  deleteUserData,
  deleteTripAdmin,
  AdminUserRecord,
  AdminStats,
} from '@/lib/admin-sync';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  ChevronDown,
  ChevronRight,
  Trash2,
  Users,
  MapPin,
  Calendar,
  Package,
  RotateCcw,
  ShieldAlert,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const ADMIN_EMAIL = 'karleef@dekneef.be';

type ConfirmAction =
  | { type: 'deleteTrip'; uid: string; tripId: string; tripName: string; userName: string }
  | { type: 'deleteUser'; uid: string; displayName: string }
  | null;

const statusLabels: Record<string, string> = {
  planning: 'Planning',
  active: 'Actief',
  completed: 'Voltooid',
};

const statusColors: Record<string, string> = {
  planning: 'border-blue-200 text-blue-700 bg-blue-50 dark:border-blue-800 dark:text-blue-300 dark:bg-blue-950',
  active: 'border-green-200 text-green-700 bg-green-50 dark:border-green-800 dark:text-green-300 dark:bg-green-950',
  completed: 'border-border text-muted-foreground',
};

export default function AdminPage() {
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<AdminUserRecord[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [expandedUids, setExpandedUids] = useState<Set<string>>(new Set());
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const isAdmin = user?.email === ADMIN_EMAIL;

  const loadData = async () => {
    setLoading(true);
    try {
      const result = await fetchAllUsers();
      setUsers(result.users);
      setStats(result.stats);
    } catch (err) {
      console.error('Admin fetch failed:', err);
      toast.error('Laden mislukt');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      loadData();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  const toggleExpand = (uid: string) => {
    setExpandedUids((prev) => {
      const next = new Set(prev);
      next.has(uid) ? next.delete(uid) : next.add(uid);
      return next;
    });
  };

  const handleConfirm = async () => {
    if (!confirmAction) return;
    setActionLoading(true);
    try {
      if (confirmAction.type === 'deleteTrip') {
        await deleteTripAdmin(confirmAction.uid, confirmAction.tripId);
        toast.success(`Trip "${confirmAction.tripName}" verwijderd`);
      } else {
        await deleteUserData(confirmAction.uid);
        toast.success(`Alle data voor ${confirmAction.displayName} verwijderd`);
      }
      setConfirmAction(null);
      await loadData();
    } catch (err) {
      console.error('Admin action failed:', err);
      toast.error('Actie mislukt');
    } finally {
      setActionLoading(false);
    }
  };

  // --- Auth guards ---

  if (authLoading) {
    return (
      <div className="mx-auto max-w-lg px-4 pt-20 text-center">
        <p className="text-muted-foreground">Laden...</p>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return (
      <div className="mx-auto max-w-lg px-4 pt-20 text-center">
        <ShieldAlert className="h-12 w-12 text-destructive mx-auto mb-4" />
        <p className="text-xl font-semibold mb-1">Toegang geweigerd</p>
        <p className="text-sm text-muted-foreground">
          Deze pagina is alleen toegankelijk voor beheerders.
        </p>
      </div>
    );
  }

  // --- Admin UI ---

  return (
    <div className="mx-auto max-w-lg px-4 pt-6 pb-10">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Admin Panel</h1>
          <p className="text-sm text-muted-foreground">CamperPack beheer</p>
        </div>
        <Button variant="ghost" size="icon" onClick={loadData} disabled={loading}>
          <RotateCcw className={cn('h-5 w-5', loading && 'animate-spin')} />
        </Button>
      </div>

      {/* Stats row */}
      {stats && (
        <div className="grid grid-cols-3 gap-3 mb-6">
          <Card>
            <CardContent className="pt-4 pb-3 text-center">
              <Users className="h-5 w-5 mx-auto mb-1 text-primary" />
              <p className="text-2xl font-bold">{stats.totalUsers}</p>
              <p className="text-xs text-muted-foreground">Gebruikers</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 text-center">
              <MapPin className="h-5 w-5 mx-auto mb-1 text-blue-600" />
              <p className="text-2xl font-bold">{stats.totalTrips}</p>
              <p className="text-xs text-muted-foreground">Trips</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 text-center">
              <Package className="h-5 w-5 mx-auto mb-1 text-orange-500" />
              <p className="text-2xl font-bold">{stats.totalItems}</p>
              <p className="text-xs text-muted-foreground">Items</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="text-center py-12 text-muted-foreground">
          Gebruikers laden...
        </div>
      )}

      {/* User list */}
      {!loading && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Gebruikers ({users.length})</h2>

          {users.map((u) => {
            const isExpanded = expandedUids.has(u.uid);
            return (
              <Card key={u.uid}>
                <CardHeader className="pb-2 pt-3 px-3">
                  <div className="flex items-start gap-2">
                    {/* Expand toggle */}
                    <button
                      onClick={() => toggleExpand(u.uid)}
                      className="mt-0.5 shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {isExpanded
                        ? <ChevronDown className="h-4 w-4" />
                        : <ChevronRight className="h-4 w-4" />}
                    </button>

                    {/* User info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{u.displayName}</p>
                      <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                      <div className="flex flex-wrap gap-1.5 mt-1.5">
                        <Badge variant="secondary" className="text-xs">
                          {u.tripCount} trip{u.tripCount !== 1 ? 's' : ''}
                        </Badge>
                        {u.groupId && u.groupName && (
                          <Badge variant="outline" className="text-xs">
                            {u.groupName} ({u.groupMemberCount} leden)
                          </Badge>
                        )}
                        {u.groupId && !u.groupName && (
                          <Badge variant="outline" className="text-xs">Groep</Badge>
                        )}
                      </div>
                    </div>

                    {/* Delete user button */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
                      onClick={() =>
                        setConfirmAction({
                          type: 'deleteUser',
                          uid: u.uid,
                          displayName: u.displayName,
                        })
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>

                {/* Expanded trips */}
                {isExpanded && (
                  <CardContent className="pt-0 pb-3 px-3">
                    <div className="border-t pt-3">
                      {u.trips.length === 0 ? (
                        <p className="text-xs text-muted-foreground">Geen trips</p>
                      ) : (
                        <div className="space-y-1.5">
                          {u.trips
                            .sort((a, b) =>
                              new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
                            )
                            .map((trip) => (
                              <div
                                key={trip.id}
                                className="flex items-center gap-2 rounded-md bg-muted/50 px-3 py-2"
                              >
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate">{trip.name}</p>
                                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5 text-xs text-muted-foreground">
                                    {trip.destination && (
                                      <span className="flex items-center gap-1 truncate">
                                        <MapPin className="h-3 w-3 shrink-0" />
                                        {trip.destination}
                                      </span>
                                    )}
                                    <span className="flex items-center gap-1">
                                      <Calendar className="h-3 w-3 shrink-0" />
                                      {new Date(trip.startDate).toLocaleDateString('nl-BE')}
                                    </span>
                                    <span className="flex items-center gap-1">
                                      <Package className="h-3 w-3 shrink-0" />
                                      {trip.itemCount} items
                                    </span>
                                  </div>
                                </div>
                                <Badge
                                  variant="outline"
                                  className={cn('text-xs shrink-0', statusColors[trip.status])}
                                >
                                  {statusLabels[trip.status] ?? trip.status}
                                </Badge>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
                                  onClick={() =>
                                    setConfirmAction({
                                      type: 'deleteTrip',
                                      uid: u.uid,
                                      tripId: trip.id,
                                      tripName: trip.name,
                                      userName: u.displayName,
                                    })
                                  }
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            ))}
                        </div>
                      )}
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Confirmation Dialog */}
      <Dialog
        open={confirmAction !== null}
        onOpenChange={(open) => { if (!open && !actionLoading) setConfirmAction(null); }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirmAction?.type === 'deleteTrip'
                ? 'Trip verwijderen?'
                : 'Alle data verwijderen?'}
            </DialogTitle>
          </DialogHeader>

          {confirmAction?.type === 'deleteTrip' && (
            <p className="text-sm text-muted-foreground">
              Trip <strong>{confirmAction.tripName}</strong> van{' '}
              <strong>{confirmAction.userName}</strong> en alle bijbehorende
              items worden permanent verwijderd.
            </p>
          )}

          {confirmAction?.type === 'deleteUser' && (
            <p className="text-sm text-muted-foreground">
              Alle Firestore-data van{' '}
              <strong>{confirmAction.displayName}</strong> wordt permanent
              verwijderd. Dit omvat alle trips, items, categorieën en
              activiteiten. De gebruiker blijft bestaan in Firebase Auth.
            </p>
          )}

          <div className="flex gap-2 justify-end pt-2">
            <Button
              variant="outline"
              onClick={() => setConfirmAction(null)}
              disabled={actionLoading}
            >
              Annuleren
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirm}
              disabled={actionLoading}
            >
              {actionLoading ? 'Bezig...' : 'Verwijderen'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
