'use client';

import { useAppStore } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import Link from 'next/link';
import { PlusCircle, Copy, Trash2, MapPin, Calendar, Users, Thermometer, UsersRound } from 'lucide-react';
import { temperatureLabels, temperatureIcons } from '@/lib/constants';
import { Trip, GroupMember } from '@/lib/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useState, useEffect, useMemo } from 'react';

function TripCard({ trip }: { trip: Trip }) {
  const allTripItems = useAppStore((s) => s.tripItems);
  const tripItems = allTripItems.filter((ti) => ti.tripId === trip.id);
  const deleteTrip = useAppStore((s) => s.deleteTrip);
  const copyTrip = useAppStore((s) => s.copyTrip);
  const [copyName, setCopyName] = useState(`${trip.name} (kopie)`);
  const [showCopyDialog, setShowCopyDialog] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const checked = tripItems.filter((ti) => ti.checked).length;
  const total = tripItems.length;
  const progress = total > 0 ? (checked / total) * 100 : 0;

  const statusColors: Record<string, string> = {
    planning: 'bg-blue-100 text-blue-800',
    active: 'bg-green-100 text-green-800',
    completed: 'bg-gray-100 text-gray-800',
  };

  const statusLabels: Record<string, string> = {
    planning: 'Planning',
    active: 'Actief',
    completed: 'Voltooid',
  };

  const handleCopy = () => {
    copyTrip(trip.id, copyName);
    setShowCopyDialog(false);
  };

  const handleDelete = () => {
    deleteTrip(trip.id);
    setShowDeleteConfirm(false);
  };

  return (
    <Card className="relative">
      <Link href={`/trip/${trip.id}`}>
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <CardTitle className="text-lg">{trip.name}</CardTitle>
            <Badge className={statusColors[trip.status]} variant="secondary">
              {statusLabels[trip.status]}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
            {trip.destination && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                {trip.destination}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              {new Date(trip.startDate).toLocaleDateString('nl-BE')}
            </span>
            <span className="flex items-center gap-1">
              <Thermometer className="h-3.5 w-3.5" />
              {temperatureIcons[trip.temperature]} {temperatureLabels[trip.temperature]}
            </span>
            <span className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              {trip.peopleCount} {trip.peopleCount === 1 ? 'persoon' : 'personen'}
            </span>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span>{checked} / {total} ingepakt</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </CardContent>
      </Link>
      <div className="absolute bottom-3 right-3 flex gap-1">
        <Dialog open={showCopyDialog} onOpenChange={setShowCopyDialog}>
          <DialogTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={(e) => e.stopPropagation()}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent onClick={(e) => e.stopPropagation()}>
            <DialogHeader>
              <DialogTitle>Trip kopiëren</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Input
                value={copyName}
                onChange={(e) => setCopyName(e.target.value)}
                placeholder="Naam voor de kopie"
              />
              <Button onClick={handleCopy} className="w-full">
                Kopiëren
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
          <DialogTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive"
              onClick={(e) => e.stopPropagation()}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent onClick={(e) => e.stopPropagation()}>
            <DialogHeader>
              <DialogTitle>Trip verwijderen?</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              Weet je zeker dat je &quot;{trip.name}&quot; wilt verwijderen? Dit kan niet ongedaan worden.
            </p>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
                Annuleren
              </Button>
              <Button variant="destructive" onClick={handleDelete}>
                Verwijderen
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Card>
  );
}

function SharedTripCard({ trip, creatorName }: { trip: Trip; creatorName: string }) {
  const sharedTripItems = useAppStore((s) => s.sharedTripItems);
  const tripItems = sharedTripItems.filter((ti) => ti.tripId === trip.id);

  const checked = tripItems.filter((ti) => ti.checked).length;
  const total = tripItems.length;
  const progress = total > 0 ? (checked / total) * 100 : 0;

  const statusColors: Record<string, string> = {
    planning: 'bg-blue-100 text-blue-800',
    active: 'bg-green-100 text-green-800',
    completed: 'bg-gray-100 text-gray-800',
  };

  const statusLabels: Record<string, string> = {
    planning: 'Planning',
    active: 'Actief',
    completed: 'Voltooid',
  };

  return (
    <Link href={`/trip/shared/${trip.id}?creator=${trip.creatorId}`}>
      <Card className="relative border-blue-200 dark:border-blue-800">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <CardTitle className="text-lg">{trip.name}</CardTitle>
            <Badge className={statusColors[trip.status]} variant="secondary">
              {statusLabels[trip.status]}
            </Badge>
          </div>
          <p className="text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1">
            <UsersRound className="h-3 w-3" />
            {creatorName}
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
            {trip.destination && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                {trip.destination}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              {new Date(trip.startDate).toLocaleDateString('nl-BE')}
            </span>
            <span className="flex items-center gap-1">
              <Thermometer className="h-3.5 w-3.5" />
              {temperatureIcons[trip.temperature]} {temperatureLabels[trip.temperature]}
            </span>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span>{checked} / {total} ingepakt</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export default function HomePage() {
  const trips = useAppStore((s) => s.trips);
  const currentGroup = useAppStore((s) => s.currentGroup);
  const sharedTrips = useAppStore((s) => s.sharedTrips);
  const seenSharedTripIds = useAppStore((s) => s.seenSharedTripIds);
  const markSharedTripsSeen = useAppStore((s) => s.markSharedTripsSeen);

  const activeTrips = trips.filter((t) => t.status !== 'completed');
  const completedTrips = trips.filter((t) => t.status === 'completed');

  const newSharedTripsCount = useMemo(() => {
    if (!currentGroup || sharedTrips.length === 0) return 0;
    return sharedTrips.filter((t) => !seenSharedTripIds.includes(t.id)).length;
  }, [currentGroup, sharedTrips, seenSharedTripIds]);

  // Mark as seen after 2 seconds on the page (user has viewed them)
  useEffect(() => {
    if (newSharedTripsCount === 0) return;
    const timer = setTimeout(() => {
      markSharedTripsSeen();
    }, 2000);
    return () => clearTimeout(timer);
  }, [newSharedTripsCount, markSharedTripsSeen]);

  return (
    <div className="mx-auto max-w-lg px-4 pt-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">CamperPack</h1>
          <p className="text-sm text-muted-foreground">Paklijst voor camperreizen</p>
        </div>
        <span className="text-3xl">🚐</span>
      </div>

      <Link href="/trip/new">
        <Button className="mb-6 w-full gap-2" size="lg">
          <PlusCircle className="h-5 w-5" />
          Nieuwe Trip
        </Button>
      </Link>

      {trips.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-4xl mb-2">🏕️</p>
          <p className="text-muted-foreground">
            Nog geen trips. Maak je eerste trip aan!
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {activeTrips.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-lg font-semibold">Actieve Trips</h2>
              {activeTrips
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                .map((trip) => (
                  <TripCard key={trip.id} trip={trip} />
                ))}
            </div>
          )}

          {completedTrips.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-muted-foreground">Voltooide Trips</h2>
              {completedTrips
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                .map((trip) => (
                  <TripCard key={trip.id} trip={trip} />
                ))}
            </div>
          )}

          {currentGroup && sharedTrips.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <UsersRound className="h-5 w-5 text-blue-600" />
                Gedeelde Trips
                {newSharedTripsCount > 0 && (
                  <Badge className="bg-red-500 text-white text-xs px-1.5 py-0 min-w-[20px] text-center">
                    {newSharedTripsCount}
                  </Badge>
                )}
              </h2>
              {sharedTrips
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                .map((trip) => {
                  const creator = trip.creatorId
                    ? currentGroup.members[trip.creatorId]
                    : null;
                  return (
                    <SharedTripCard
                      key={trip.id}
                      trip={trip}
                      creatorName={creator?.displayName || 'Onbekend'}
                    />
                  );
                })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
