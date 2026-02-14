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
import { Users, Copy, RefreshCw, UserMinus, Trash2, Plus, LogIn } from 'lucide-react';
import {
  createGroup,
  joinGroup,
  leaveGroup,
  deleteGroup,
  regenerateInviteCode,
  removeMember,
} from '@/lib/group-sync';

export function GroupCard() {
  const { user } = useAuth();
  const currentGroup = useAppStore((s) => s.currentGroup);
  const setCurrentGroup = useAppStore((s) => s.setCurrentGroup);
  const newMemberUids = useAppStore((s) => s.newMemberUids);

  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [inviteInput, setInviteInput] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!user) return null;

  const isOwner = currentGroup?.ownerId === user.uid;

  const handleCreate = async () => {
    if (!groupName.trim()) return;
    setLoading(true);
    setError('');
    try {
      const group = await createGroup(user.uid, groupName.trim(), user);
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
      setCurrentGroup(group);
      setJoining(false);
      setInviteInput('');
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleLeave = async () => {
    if (!currentGroup) return;
    setLoading(true);
    try {
      await leaveGroup(user.uid, currentGroup.id);
      setCurrentGroup(null);
      setShowLeaveConfirm(false);
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!currentGroup) return;
    setLoading(true);
    try {
      await deleteGroup(user.uid, currentGroup.id);
      setCurrentGroup(null);
      setShowDeleteConfirm(false);
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerateCode = async () => {
    if (!currentGroup) return;
    try {
      const newCode = await regenerateInviteCode(currentGroup.id);
      setCurrentGroup({ ...currentGroup, inviteCode: newCode });
    } catch (e: unknown) {
      setError((e as Error).message);
    }
  };

  const handleRemoveMember = async (memberUid: string) => {
    if (!currentGroup) return;
    try {
      await removeMember(user.uid, currentGroup.id, memberUid);
      const updatedMembers = { ...currentGroup.members };
      delete updatedMembers[memberUid];
      setCurrentGroup({ ...currentGroup, members: updatedMembers });
    } catch (e: unknown) {
      setError((e as Error).message);
    }
  };

  const handleCopyCode = async () => {
    if (!currentGroup) return;
    try {
      await navigator.clipboard.writeText(currentGroup.inviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for iOS
      const input = document.createElement('input');
      input.value = currentGroup.inviteCode;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // No group — show create/join UI
  if (!currentGroup) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" />
            Gezin / Groep
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Deel je standaardlijst met je gezinsleden.
          </p>

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
    );
  }

  // In a group — show group info
  const members = Object.values(currentGroup.members);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" />
            {currentGroup.name}
          </CardTitle>
          <Badge variant="secondary" className="text-xs">
            {isOwner ? 'Eigenaar' : 'Lid'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
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
                      onClick={() => handleRemoveMember(member.uid)}
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
              {currentGroup.inviteCode}
            </code>
            <Button variant="outline" size="icon" onClick={handleCopyCode}>
              <Copy className="h-4 w-4" />
            </Button>
            {isOwner && (
              <Button variant="outline" size="icon" onClick={handleRegenerateCode}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            )}
          </div>
          {copied && <p className="text-xs text-muted-foreground">Gekopieerd!</p>}
        </div>

        {/* Leave / Delete */}
        <div className="space-y-2 pt-2 border-t">
          <Dialog open={showLeaveConfirm} onOpenChange={setShowLeaveConfirm}>
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
                Je standaardlijst wordt teruggezet naar een kopie van de groepslijst.
                {isOwner && members.length > 1 && ' Het eigenaarschap wordt overgedragen.'}
              </p>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setShowLeaveConfirm(false)}>Annuleren</Button>
                <Button variant="destructive" onClick={handleLeave} disabled={loading}>
                  {loading ? 'Bezig...' : 'Verlaten'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {isOwner && (
            <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
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
                  <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>Annuleren</Button>
                  <Button variant="destructive" onClick={handleDelete} disabled={loading}>
                    {loading ? 'Bezig...' : 'Verwijderen'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}
      </CardContent>
    </Card>
  );
}
