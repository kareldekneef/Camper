'use client';

import { useEffect } from 'react';
import { useAppStore } from '@/lib/store';

export function StoreInitializer({ children }: { children: React.ReactNode }) {
  const initialize = useAppStore((s) => s.initialize);
  const initialized = useAppStore((s) => s.initialized);

  useEffect(() => {
    initialize();
  }, [initialize]);

  if (!initialized) {
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
