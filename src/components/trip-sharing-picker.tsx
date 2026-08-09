'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, UsersRound, Eye, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Group, TripPermission } from '@/lib/types';

interface TripSharingPickerProps {
  groups: Group[];
  selectedGroupId: string | null;
  onSelectGroup: (groupId: string | null) => void;
  getMemberPermission: (uid: string) => TripPermission;
  onTogglePermission: (uid: string) => void;
  currentUserUid?: string;
}

/**
 * "Delen" card — pick which group (if any) a trip is shared with, plus
 * per-member view/edit permissions for the selected group. Shared between
 * trip/new/page.tsx (trip creation) and EditTripDialog (trip/[id]/page.tsx).
 */
export function TripSharingPicker({
  groups,
  selectedGroupId,
  onSelectGroup,
  getMemberPermission,
  onTogglePermission,
  currentUserUid,
}: TripSharingPickerProps) {
  if (groups.length === 0) return null;

  const selectedGroup = groups.find((g) => g.id === selectedGroupId) ?? null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Delen</CardTitle>
      </CardHeader>
      <CardContent className="pt-0 space-y-2">
        <button
          type="button"
          onClick={() => onSelectGroup(null)}
          className={cn(
            'flex items-center gap-3 rounded-lg border p-4 w-full text-left transition-colors',
            !selectedGroup ? 'border-blue-400 bg-blue-50 dark:bg-blue-950/30' : 'border-border'
          )}
        >
          <UsersRound className={cn(
            'h-5 w-5 shrink-0',
            !selectedGroup ? 'text-blue-600' : 'text-muted-foreground'
          )} />
          <div className="flex-1">
            <p className={cn('text-sm font-medium', !selectedGroup ? 'text-blue-700 dark:text-blue-300' : '')}>
              Niet delen
            </p>
            <p className="text-xs text-muted-foreground">Alleen voor jou zichtbaar</p>
          </div>
          {!selectedGroup && <Check className="h-5 w-5 text-blue-600 shrink-0" />}
        </button>

        {groups.map((group) => {
          const isSelected = selectedGroup?.id === group.id;
          return (
            <button
              key={group.id}
              type="button"
              onClick={() => onSelectGroup(group.id)}
              className={cn(
                'flex items-center gap-3 rounded-lg border p-4 w-full text-left transition-colors',
                isSelected ? 'border-blue-400 bg-blue-50 dark:bg-blue-950/30' : 'border-border'
              )}
            >
              <UsersRound className={cn(
                'h-5 w-5 shrink-0',
                isSelected ? 'text-blue-600' : 'text-muted-foreground'
              )} />
              <div className="flex-1">
                <p className={cn('text-sm font-medium', isSelected ? 'text-blue-700 dark:text-blue-300' : '')}>
                  {group.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  Zichtbaar voor {Object.keys(group.members).length} leden
                </p>
              </div>
              {isSelected && <Check className="h-5 w-5 text-blue-600 shrink-0" />}
            </button>
          );
        })}

        {/* Per-member permission picker */}
        {selectedGroup && (
          <div className="mt-3 space-y-2">
            <p className="text-xs text-muted-foreground font-medium">Rechten per lid</p>
            {Object.entries(selectedGroup.members).map(([uid, member]) => {
              const isCreator = uid === currentUserUid;
              const permission = isCreator ? 'owner' : getMemberPermission(uid);

              return (
                <div key={uid} className="flex items-center justify-between py-1.5">
                  <div className="flex items-center gap-2 min-w-0">
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
                    <span className="text-sm truncate">{member.displayName}</span>
                  </div>
                  {isCreator ? (
                    <span className="text-xs text-muted-foreground font-medium">Eigenaar</span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onTogglePermission(uid)}
                      className={cn(
                        'flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
                        permission === 'edit'
                          ? 'border-green-400 bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-300 dark:border-green-700'
                          : 'border-border text-muted-foreground'
                      )}
                    >
                      {permission === 'edit' ? (
                        <><Pencil className="h-3 w-3" /> Bewerken</>
                      ) : (
                        <><Eye className="h-3 w-3" /> Bekijken</>
                      )}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
