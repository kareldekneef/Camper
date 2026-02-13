'use client';

import { useEffect } from 'react';

export function ServiceWorkerRegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          // Check for updates
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            newWorker?.addEventListener('statechange', () => {
              if (
                newWorker.state === 'activated' &&
                navigator.serviceWorker.controller
              ) {
                // New version available — will be active on next reload
                console.log('CamperPack: nieuwe versie beschikbaar');
              }
            });
          });
        })
        .catch(() => {
          // Service worker registration failed, app still works
        });
    }
  }, []);

  return null;
}
