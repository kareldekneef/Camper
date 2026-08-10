'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { useAppStore } from '@/lib/store';
import { fetchGroupByInviteCode, fetchSharedTrips, joinGroup } from '@/lib/group-sync';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Users } from 'lucide-react';

export default function JoinGroupPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code: rawCode } = use(params);
  const code = rawCode.toUpperCase();

  const { user, loading: authLoading, signInWithGoogle } = useAuth();
  const groups = useAppStore((s) => s.groups);
  const setGroups = useAppStore((s) => s.setGroups);
  const setCurrentGroup = useAppStore((s) => s.setCurrentGroup);

  const [preview, setPreview] = useState<{ groupId: string; groupName: string } | null | undefined>(undefined);
  const [joining, setJoining] = useState(false);
  const [joined, setJoined] = useState(false);
  const [joinedGroupName, setJoinedGroupName] = useState('');
  const [error, setError] = useState('');
  const [signingIn, setSigningIn] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    fetchGroupByInviteCode(code)
      .then((result) => {
        if (!cancelled) setPreview(result);
      })
      .catch(() => {
        if (!cancelled) setPreview(null);
      });
    return () => {
      cancelled = true;
    };
  }, [user, code]);

  const handleSignIn = async () => {
    setSigningIn(true);
    setError('');
    try {
      await signInWithGoogle();
    } catch {
      setError('Inloggen mislukt. Probeer opnieuw.');
    } finally {
      setSigningIn(false);
    }
  };

  const handleJoin = async () => {
    if (!user) return;
    setJoining(true);
    setError('');
    try {
      const group = await joinGroup(user.uid, code, user);
      setGroups([...groups, group]);
      setCurrentGroup(group);

      // Immediately pull in this group's shared trips — otherwise they only
      // show up after the next full app reopen/visibility refresh.
      const otherUids = Object.keys(group.members).filter((uid) => uid !== user.uid);
      if (otherUids.length > 0) {
        const shared = await fetchSharedTrips(group.id, user.uid, otherUids);
        const state = useAppStore.getState();
        useAppStore.setState({
          sharedTrips: [...state.sharedTrips, ...shared.trips],
          sharedTripItems: [...state.sharedTripItems, ...shared.tripItems],
        });
      }

      setJoinedGroupName(group.name);
      setJoined(true);
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setJoining(false);
    }
  };

  const alreadyMember = preview ? groups.some((g) => g.id === preview.groupId) : false;

  return (
    <div className="mx-auto max-w-lg px-4 pt-6">
      <div className="mb-6 flex items-center gap-3">
        <span className="text-3xl">🚐</span>
        <h1 className="text-2xl font-bold">CamperPack</h1>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-4 text-center">
          {authLoading ? (
            <p className="text-muted-foreground">Laden...</p>
          ) : !user ? (
            <>
              <Users className="h-10 w-10 mx-auto text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Je bent uitgenodigd om deel te nemen aan een groep in CamperPack. Log in om verder te gaan.
              </p>
              <Button onClick={handleSignIn} disabled={signingIn} className="w-full">
                {signingIn ? 'Bezig...' : 'Inloggen met Google'}
              </Button>
            </>
          ) : joined ? (
            <>
              <Users className="h-10 w-10 mx-auto text-green-600" />
              <p className="text-sm font-medium">
                Je bent nu lid van <strong>{joinedGroupName}</strong>!
              </p>
              <Link href="/settings">
                <Button className="w-full">Naar Instellingen</Button>
              </Link>
            </>
          ) : preview === undefined ? (
            <p className="text-muted-foreground">Uitnodiging controleren...</p>
          ) : preview === null ? (
            <>
              <p className="text-sm text-destructive">Ongeldige of verlopen uitnodigingscode.</p>
              <Link href="/">
                <Button variant="outline" className="w-full">Terug naar home</Button>
              </Link>
            </>
          ) : alreadyMember ? (
            <>
              <Users className="h-10 w-10 mx-auto text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Je bent al lid van <strong>{preview.groupName}</strong>.
              </p>
              <Link href="/settings">
                <Button variant="outline" className="w-full">Naar Instellingen</Button>
              </Link>
            </>
          ) : (
            <>
              <Users className="h-10 w-10 mx-auto text-blue-600" />
              <p className="text-sm text-muted-foreground">Je bent uitgenodigd voor</p>
              <p className="text-lg font-semibold">{preview.groupName}</p>
              <Button onClick={handleJoin} disabled={joining} className="w-full">
                {joining ? 'Bezig...' : 'Deelnemen'}
              </Button>
            </>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}
        </CardContent>
      </Card>
    </div>
  );
}
