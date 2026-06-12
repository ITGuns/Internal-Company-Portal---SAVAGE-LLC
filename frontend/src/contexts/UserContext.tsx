"use client"

import React, { createContext, useContext, useEffect, useRef, useState, useCallback, ReactNode } from 'react';
import {
  getAuthToken,
  getCurrentUser,
  logout as endAuthSession,
  refreshAccessToken,
  setCurrentUser as saveCurrentUser,
} from '@/lib/api';
import { AUTH_SESSION_CLEARED_EVENT } from '@/lib/auth-session';

export interface User {
  id: string | number;
  email: string;
  name: string;
  role: string;
  roles?: string[];
  department?: string;
  position?: string;
  avatar?: string;
  phone?: string;
  address?: string;
  city?: string;
  citizenship?: string;
  bio?: string;
  birthday?: string;
  hireDate?: string;
  isApproved?: boolean;
  status?: string;
}

interface UserContextType {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  refreshUser: () => Promise<void>;
  updateUser: (userData: Partial<User>) => void;
  logout: () => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);
const USER_SESSION_REFRESH_INTERVAL_MS = 5 * 60 * 1000;

async function fetchCurrentAuthUser(accessToken: string): Promise<{ status: number; user?: User }> {
  const res = await fetch(`/backend-auth/me`, {
    credentials: 'include',
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });

  if (!res.ok) {
    return { status: res.status };
  }

  const data = await res.json();
  return { status: res.status, user: data.user };
}

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const refreshInFlightRef = useRef<Promise<void> | null>(null);

  const logout = useCallback(() => {
    setUser(null);
    setError(null);
    setIsLoading(false);
    endAuthSession();
  }, []);

  useEffect(() => {
    const handleAuthCleared = () => {
      setUser(null);
      setError(null);
      setIsLoading(false);
    };

    window.addEventListener(AUTH_SESSION_CLEARED_EVENT, handleAuthCleared);
    return () => window.removeEventListener(AUTH_SESSION_CLEARED_EVENT, handleAuthCleared);
  }, []);

  const refreshUser = useCallback(async () => {
    if (refreshInFlightRef.current) {
      return refreshInFlightRef.current;
    }

    const refreshPromise = (async () => {
      setError(null);

      if (typeof window !== 'undefined' && sessionStorage.getItem('auth_error')) {
        sessionStorage.removeItem('auth_error');
        logout();
        return;
      }

      const storedUser = getCurrentUser();

      if (storedUser) {
        setUser(storedUser);
      }

      let accessToken = getAuthToken();
      if (!accessToken) {
        accessToken = await refreshAccessToken();
      }

      if (!accessToken) {
        setUser(null);
        return;
      }

      let currentUserResponse = await fetchCurrentAuthUser(accessToken);
      if (currentUserResponse.status === 401 || currentUserResponse.status === 403) {
        try {
          const newAccessToken = await refreshAccessToken();
          if (newAccessToken) {
            currentUserResponse = await fetchCurrentAuthUser(newAccessToken);
          }
        } catch (refreshErr) {
          console.error('[UserContext] Token refresh failed:', refreshErr);
        }
      }

      if (currentUserResponse.user) {
        setUser(prev => {
          const hasChanged = JSON.stringify(prev) !== JSON.stringify(currentUserResponse.user);
          if (!hasChanged) return prev;
          return currentUserResponse.user || null;
        });
        saveCurrentUser(currentUserResponse.user);
        return;
      }

      if (currentUserResponse.status === 401 || currentUserResponse.status === 403) {
        if (typeof window !== 'undefined') sessionStorage.setItem('auth_error', 'true');
        logout();
      } else if (!storedUser) {
        setUser(null);
      }
    })()
      .catch((err) => {
        console.error('Error refreshing user:', err);
        setError('Failed to load user data');
      })
      .finally(() => {
        setIsLoading(false);
        refreshInFlightRef.current = null;
      });

    refreshInFlightRef.current = refreshPromise;
    return refreshPromise;
  }, [logout]);

  const updateUser = useCallback((userData: Partial<User>) => {
    setUser(prev => {
      if (!prev) return null;
      const updatedUser = { ...prev, ...userData };
      saveCurrentUser(updatedUser);
      return updatedUser;
    });
  }, []);

  useEffect(() => {
    void refreshUser();
  }, [refreshUser]);

  useEffect(() => {
    if (!user) return;

    const interval = setInterval(() => {
      refreshUser();
    }, USER_SESSION_REFRESH_INTERVAL_MS);

    const handleFocus = () => {
      void refreshUser();
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void refreshUser();
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user, refreshUser]);

  const value: UserContextType = {
    user,
    isLoading,
    error,
    refreshUser,
    updateUser,
    logout,
  };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}
