'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
// Don't import Firebase modules at top level - use dynamic imports to avoid SSR issues
// import { User as FirebaseUser, onAuthStateChanged } from 'firebase/auth';
// import { auth } from '@/lib/firebase';
// import { getCurrentUser } from '@/lib/auth-service';
import type { User } from '@/types/user';

interface AuthContextType {
  user: User | null;
  firebaseUser: any | null; // FirebaseUser type, but using any to avoid importing firebase/auth at top level
  loading: boolean;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  firebaseUser: null,
  loading: true,
  refreshUser: async () => {},
});

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<any | null>(null); // Using any to avoid importing FirebaseUser at top level
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    try {
      const { getCurrentUser } = await import('@/lib/auth-service');
      const currentUser = await getCurrentUser();
      setUser(currentUser);
    } catch (error) {
      console.error('Error refreshing user:', error);
      setUser(null);
    }
  };

  useEffect(() => {
    // Dynamically import all Firebase modules to avoid SSR issues
    let unsubscribe: (() => void) | null = null;
    
    const initAuthListener = async () => {
      try {
        // Dynamically import Firebase Auth and auth instance
        const [{ onAuthStateChanged }, { auth }] = await Promise.all([
          import('firebase/auth'),
          import('@/lib/firebase')
        ]);
        
        unsubscribe = onAuthStateChanged(auth, async (firebaseAuthUser) => {
      setFirebaseUser(firebaseAuthUser);
      
      if (firebaseAuthUser) {
        // User is signed in, get their data from Firestore
        try {
          const { getCurrentUser } = await import('@/lib/auth-service');
          const userData = await getCurrentUser();
          setUser(userData);
        } catch (error) {
          console.error('Error getting user data:', error);
          setUser(null);
        }
      } else {
        // User is signed out
        setUser(null);
      }
      
      setLoading(false);
        });
      } catch (error) {
        console.warn('Firebase Auth not available, skipping auth state listener:', error);
        setLoading(false);
      }
    };

    initAuthListener();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  const value = {
    user,
    firebaseUser,
    loading,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}


