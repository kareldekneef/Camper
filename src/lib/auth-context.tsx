'use client';

import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut as firebaseSignOut,
  User,
} from 'firebase/auth';
import { auth, googleProvider } from './firebase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signInWithGoogle: async () => {},
  signOut: async () => {},
});

function detectStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    ('standalone' in window.navigator &&
      (window.navigator as unknown as { standalone: boolean }).standalone === true)
  );
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const redirectCheckedRef = useRef(false);
  const authStateReadyRef = useRef(false);

  useEffect(() => {
    let resolved = false;

    // Step 1: Process redirect result first (for PWA returning from Google)
    // This must complete before we allow loading to become false
    const redirectPromise = detectStandalone()
      ? getRedirectResult(auth)
          .then((result) => {
            if (result?.user) {
              setUser(result.user);
            }
          })
          .catch((error) => {
            console.error('Redirect sign-in error:', error);
          })
      : Promise.resolve();

    redirectPromise.finally(() => {
      redirectCheckedRef.current = true;
      // If auth state already resolved while we were checking redirect, finish loading
      if (authStateReadyRef.current && !resolved) {
        resolved = true;
        setLoading(false);
      }
    });

    // Step 2: Listen for auth state changes (also restores persisted sessions)
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      authStateReadyRef.current = true;
      // Only stop loading if redirect check is also done
      if (redirectCheckedRef.current && !resolved) {
        resolved = true;
        setLoading(false);
      }
    });

    // Safety timeout: never stay loading forever (5 seconds max)
    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        setLoading(false);
      }
    }, 5000);

    return () => {
      unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  const signInWithGoogle = useCallback(async () => {
    // PWA standalone mode (iOS & Android): use redirect flow
    // Popups are blocked in standalone/PWA WebView context
    if (detectStandalone()) {
      await signInWithRedirect(auth, googleProvider);
      return;
    }

    // Normal browser: use popup
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error: unknown) {
      const firebaseError = error as { code?: string };
      if (
        firebaseError.code === 'auth/popup-closed-by-user' ||
        firebaseError.code === 'auth/cancelled-popup-request'
      ) {
        return;
      }
      console.error('Sign-in failed:', error);
      throw error;
    }
  }, []);

  const signOut = useCallback(async () => {
    await firebaseSignOut(auth);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
