'use client';

import { useState } from 'react';
import { useAppStore } from '@/lib/store';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Users, Copy, RefreshCw, UserMinus, Trash2, Plus, LogIn, Star, Share2 } from 'lucide-react';
import {
  createGroup,
  joinGroup,
  leaveGroup,
  deleteGroup,
  regenerateInviteCode,
  removeMember,
  switchActiveGroup,
  fetchSharedTrips,
} from '@/lib/group-sync';
import { Group } from '@/lib/types';
import { cn } from '@/lib/utils';

export function GroupCard() {
  const { user } = useAuth();
  const groups = useAppStore((s) => s.groups);
  const currentGroup = useAppStore((s) => s.currentGroup);
  const setCurrentGroup = useAppStore((s) => s.setCurrentGroup);
  const setGroups = useAppStore((s) => s.setGroups);
  const newMemberUids = useAppStore((s) => s.newMemberUids);

  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [inviteInput, setInviteInput] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [switchingGroupId, setSwitchingGroupId] = useState<string | null>(null);
  const [showLeaveConfirmFor, setShowLeaveConfirmFor] = useState<string | null>(null);
  const [showDeleteConfirmFor, setShowDeleteConfirmFor] = useState<string | null>(null);
  const [removingMember, setRemovingMember] = useState<{ groupId: string; uid: string } | null>(null);
  const [copiedGroupId, setCopiedGroupId] = useState<string | null>(null);

  if (!user) return null;

  const upsertGroup = (updated: Group) => {
    setGroups(groups.map((g) => (g.id === updated.id ? updated : g)));
    if (currentGroup?.id === updated.id) setCurrentGroup(updated);
  };

  const removeGroupLocally = (groupId: string) => {
    const remaining = groups.filter((g) => g.id !== groupId);
    setGroups(remaining);
    if (currentGroup?.id === groupId) {
      setCurrentGroup(remaining[0] ?? null);
    }
  };

  const handleCreate = async () => {
    if (!groupName.trim()) return;
    setLoading(true);
    setError('');
    try {
      const group = await createGroup(user.uid, groupName.trim(), user);
      setGroups([...groups, group]);
      setCurrentGroup(group);
      setCreating(false);
      setGroupName('');
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!inviteInput.trim()) return;
    setLoading(true);
    setError('');
    try {
      const group = await joinGroup(user.uid, inviteInput.trim(), user);
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

      setJoining(false);
      setInviteInput('');
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleSwitchActive = async (groupId: string) => {
    if (currentGroup?.id === groupId) return;
    setSwitchingGroupId(groupId);
    setError('');
    try {
      const result = await switchActiveGroup(user.uid, groupId);
      if (!result) throw new Error('Groep niet gevonden');
      upsertGroup(result.group);
      setCurrentGroup(result.group);
      useAppStore.setState({
        categories: result.categories,
        masterItems: result.masterItems,
        customActivities: result.customActivities,
      });
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setSwitchingGroupId(null);
    }
  };

  const handleLeave = async (groupId: string) => {
    setLoading(true);
    try {
      await leaveGroup(user.uid, groupId);
      removeGroupLocally(groupId);
      setShowLeaveConfirmFor(null);
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (groupId: string) => {
    setLoading(true);
    try {
      await deleteGroup(user.uid, groupId);
      removeGroupLocally(groupId);
      setShowDeleteConfirmFor(null);
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerateCode = async (group: Group) => {
    try {
      const newCode = await regenerateInviteCode(group.id);
      upsertGroup({ ...group, inviteCode: newCode });
    } catch (e: unknown) {
      setError((e as Error).message);
    }
  };

  const handleRemoveMember = async () => {
    if (!removingMember) return;
    const group = groups.find((g) => g.id === removingMember.groupId);
    if (!group) return;
    setLoading(true);
    try {
      await removeMember(user.uid, group.id, removingMember.uid);
      const updatedMembers = { ...group.members };
      delete updatedMembers[removingMember.uid];
      upsertGroup({ ...group, members: updatedMembers });
      setRemovingMember(null);
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCode = async (group: Group) => {
    try {
      await navigator.clipboard.writeText(group.inviteCode);
      setCopiedGroupId(group.id);
      setTimeout(() => setCopiedGroupId(null), 2000);
    } catch {
      // Fallback for iOS
      const input = document.createElement('input');
      input.value = group.inviteCode;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopiedGroupId(group.id);
      setTimeout(() => setCopiedGroupId(null), 2000);
    }
  };

  const handleShareLink = async (group: Group) => {
    const link = `${window.location.origin}/join/${group.inviteCode}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: `Deelnemen aan ${group.name} — CamperPack`, url: link });
        return;
      } catch {
        // User cancelled or share failed, fall through to clipboard
      }
    }
    try {
      await navigator.clipboard.writeText(link);
      setCopiedGroupId(group.id);
      setTimeout(() => setCopiedGroupId(null), 2000);
    } catch {
      // ignore — link is at least visible via the code above
    }
  };

  return (
    <div className="space-y-4">
      {groups.map((group) => {
        const isOwner = group.ownerId === user.uid;
        const isActive = currentGroup?.id === group.id;
        const members = Object.values(group.members);

        return (
          <Card key={group.id} className={cn(isActive && 'ring-1 ring-primary/40')}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-base flex items-center gap-2 min-w-0">
                  <Users className="h-4 w-4 shrink-0" />
                  <span className="truncate">{group.name}</span>
                </CardTitle>
                <div className="flex items-center gap-1.5 shrink-0">
                  {isActive && (
                    <Badge className="text-xs gap-1 bg-primary/10 text-primary hover:bg-primary/10">
                      <Star className="h-3 w-3" />
                      Actief
                    </Badge>
                  )}
                  <Badge variant="secondary" className="text-xs">
                    {isOwner ? 'Eigenaar' : 'Lid'}
                  </Badge>
                </div>
              </div>
              {!isActive && (
                <p className="text-xs text-muted-foreground">
                  Standaardlijst en nieuwe trips gebruiken de <strong>actieve</strong> groep.
                </p>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              {!isActive && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full gap-2"
                  disabled={switchingGroupId === group.id}
                  onClick={() => handleSwitchActive(group.id)}
                >
                  <Star className="h-3.5 w-3.5" />
                  {switchingGroupId === group.id ? 'Bezig...' : 'Actief maken'}
                </Button>
              )}

              {/* Members */}
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                  Leden ({members.length})
                </p>
                <div className="space-y-1.5">
                  {members.map((member) => {
                    const isNew = newMemberUids.includes(member.uid);
                    return (
                      <div
                        key={member.uid}
                        className={`flex items-center gap-2 rounded-md px-1.5 py-1 transition-colors duration-500 ${isNew ? 'bg-blue-50 ring-1 ring-blue-200' : ''}`}
                      >
                        {member.photoURL ? (
                          <img
                            src={member.photoURL}
                            alt=""
                            className="h-6 w-6 rounded-full"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center text-xs">
                            {member.displayName.charAt(0)}
                          </div>
                        )}
                        <span className="text-sm flex-1 truncate">{member.displayName}</span>
                        {isNew && (
                          <Badge className="text-[10px] bg-blue-500 text-white animate-pulse px-1.5 py-0">
                            Nieuw
                          </Badge>
                        )}
                        {member.role === 'owner' && (
                          <Badge variant="outline" className="text-xs">Eigenaar</Badge>
                        )}
                        {isOwner && member.uid !== user.uid && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => setRemovingMember({ groupId: group.id, uid: member.uid })}
                          >
                            <UserMinus className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Invite code */}
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                  Uitnodigingscode
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 rounded bg-muted px-3 py-2 text-center font-mono text-lg tracking-widest">
                    {group.inviteCode}
                  </code>
                  <Button variant="outline" size="icon" onClick={() => handleCopyCode(group)}>
                    <Copy className="h-4 w-4" />
                  </Button>
                  {isOwner && (
                    <Button variant="outline" size="icon" onClick={() => handleRegenerateCode(group)}>
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full gap-2"
                  onClick={() => handleShareLink(group)}
                >
                  <Share2 className="h-3.5 w-3.5" />
                  Deel uitnodigingslink
                </Button>
                {copiedGroupId === group.id && <p className="text-xs text-muted-foreground">Gekopieerd!</p>}
              </div>

              {/* Leave / Delete */}
              <div className="space-y-2 pt-2 border-t">
                <Dialog
                  open={showLeaveConfirmFor === group.id}
                  onOpenChange={(open) => setShowLeaveConfirmFor(open ? group.id : null)}
                >
                  <DialogTrigger asChild>
                    <Button variant="outline" className="w-full justify-start gap-2 text-destructive">
                      <LogIn className="h-4 w-4 rotate-180" />
                      Groep verlaten
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Groep verlaten?</DialogTitle>
                    </DialogHeader>
                    <p className="text-sm text-muted-foreground">
                      {groups.length > 1
                        ? 'Je blijft lid van je andere groepen.'
                        : 'Je standaardlijst wordt teruggezet naar een kopie van de groepslijst.'}
                      {isOwner && members.length > 1 && ' Het eigenaarschap wordt overgedragen.'}
                    </p>
                    <div className="flex gap-2 justify-end">
                      <Button variant="outline" onClick={() => setShowLeaveConfirmFor(null)}>Annuleren</Button>
                      <Button variant="destructive" onClick={() => handleLeave(group.id)} disabled={loading}>
                        {loading ? 'Bezig...' : 'Verlaten'}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>

                {isOwner && (
                  <Dialog
                    open={showDeleteConfirmFor === group.id}
                    onOpenChange={(open) => setShowDeleteConfirmFor(open ? group.id : null)}
                  >
                    <DialogTrigger asChild>
                      <Button variant="destructive" className="w-full justify-start gap-2">
                        <Trash2 className="h-4 w-4" />
                        Groep verwijderen
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Groep verwijderen?</DialogTitle>
                      </DialogHeader>
                      <p className="text-sm text-muted-foreground">
                        Dit verwijdert de groep permanent. Alle leden worden losgekoppeld.
                      </p>
                      <div className="flex gap-2 justify-end">
                        <Button variant="outline" onClick={() => setShowDeleteConfirmFor(null)}>Annuleren</Button>
                        <Button variant="destructive" onClick={() => handleDelete(group.id)} disabled={loading}>
                          {loading ? 'Bezig...' : 'Verwijderen'}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}

      {/* Remove member confirmation (shared across groups) */}
      <Dialog open={!!removingMember} onOpenChange={(open) => !open && setRemovingMember(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Lid verwijderen?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Weet je zeker dat je{' '}
            <strong>
              {removingMember &&
                groups.find((g) => g.id === removingMember.groupId)?.members[removingMember.uid]?.displayName}
            </strong>{' '}
            uit de groep wilt verwijderen?
          </p>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setRemovingMember(null)}>Annuleren</Button>
            <Button variant="destructive" onClick={handleRemoveMember} disabled={loading}>
              {loading ? 'Bezig...' : 'Verwijderen'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create / join another group */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" />
            {groups.length > 0 ? 'Nog een groep' : 'Gezin / Groep'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {groups.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Deel je standaardlijst met je gezinsleden.
            </p>
          )}

          {!creating && !joining && (
            <div className="space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start gap-2"
                onClick={() => { setCreating(true); setError(''); }}
              >
                <Plus className="h-4 w-4" />
                Groep aanmaken
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start gap-2"
                onClick={() => { setJoining(true); setError(''); }}
              >
                <LogIn className="h-4 w-4" />
                Deelnemen met code
              </Button>
            </div>
          )}

          {creating && (
            <div className="space-y-2">
              <Input
                placeholder="Groepsnaam (bv. Familie De Vries)"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              />
              <div className="flex gap-2">
                <Button onClick={handleCreate} disabled={loading || !groupName.trim()} className="flex-1">
                  {loading ? 'Bezig...' : 'Aanmaken'}
                </Button>
                <Button variant="outline" onClick={() => { setCreating(false); setError(''); }}>
                  Annuleren
                </Button>
              </div>
            </div>
          )}

          {joining && (
            <div className="space-y-2">
              <Input
                placeholder="Uitnodigingscode (6 tekens)"
                value={inviteInput}
                onChange={(e) => setInviteInput(e.target.value.toUpperCase())}
                maxLength={6}
                className="tracking-widest text-center font-mono text-lg"
                onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
              />
              <div className="flex gap-2">
                <Button onClick={handleJoin} disabled={loading || inviteInput.length !== 6} className="flex-1">
                  {loading ? 'Bezig...' : 'Deelnemen'}
                </Button>
                <Button variant="outline" onClick={() => { setJoining(false); setError(''); }}>
                  Annuleren
                </Button>
              </div>
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}
        </CardContent>
      </Card>
    </div>
  );
}
