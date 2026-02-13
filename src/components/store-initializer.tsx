'use client';

import { useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import { useAuth } from '@/lib/auth-context';
import { useFirestoreSync } from '@/lib/use-firestore-sync';

export function StoreInitializer({ children }: { children: React.ReactNode }) {
  const initialize = useAppStore((s) => s.initialize);
  const initialized = useAppStore((s) => s.initialized);
  const { user, loading: authLoading } = useAuth();

  // Initialize localStorage data (seed data on first run)
  useEffect(() => {
    initialize();
  }, [initialize]);

  // Start Firestore sync when user is authenticated
  useFirestoreSync(user);

  // Wait for both localStorage hydration AND auth state resolution
  if (!initialized || authLoading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-2">🚐</div>
          <p className="text-muted-foreground">Laden...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
