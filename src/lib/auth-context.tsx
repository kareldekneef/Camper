'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
  User,
} from 'firebase/auth';
import { auth, googleProvider } from './firebase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isIOSPWA: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isIOSPWA: false,
  signInWithGoogle: async () => {},
  signOut: async () => {},
});

function detectIOSPWA(): boolean {
  if (typeof window === 'undefined') return false;
  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    ('standalone' in window.navigator &&
      (window.navigator as unknown as { standalone: boolean }).standalone === true);
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  return isStandalone && isIOS;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isIOSPWA, setIsIOSPWA] = useState(false);

  useEffect(() => {
    setIsIOSPWA(detectIOSPWA());
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const signInWithGoogle = useCallback(async () => {
    // iOS PWA: popups don't work, open in Safari instead
    if (detectIOSPWA()) {
      window.open(window.location.href, '_blank');
      return;
    }

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
    <AuthContext.Provider value={{ user, loading, isIOSPWA, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
