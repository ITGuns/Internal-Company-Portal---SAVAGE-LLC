"use client"

import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import {
  getAuthToken,
  getCurrentUser,
  logout as endAuthSession,
  refreshAccessToken,
  setCurrentUser as saveCurrentUser,
} from '@/lib/api';
import { buildAuthUrl } from '@/lib/api-url';
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

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    async function verifySession(accessToken: string): Promise<Response> {
      return fetch(buildAuthUrl('/me'), {
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
    }

    async function applyVerifiedUser(response: Response): Promise<boolean> {
      if (!response.ok) return false;

      const data = await response.json();
      if (!data.user) return true;

      setUser(prev => {
        const hasChanged = prev?.id !== data.user.id ||
          prev?.email !== data.user.email ||
          prev?.name !== data.user.name ||
          prev?.avatar !== data.user.avatar ||
          prev?.role !== data.user.role ||
          prev?.isApproved !== data.user.isApproved ||
          prev?.status !== data.user.status;
        if (!hasChanged) return prev;
        return data.user;
      });
      saveCurrentUser(data.user);
      return true;
    }

    try {
      setError(null);
      const storedUser = getCurrentUser();

      if (!storedUser) {
        setUser(null);
        return;
      }

      if (typeof window !== 'undefined' && sessionStorage.getItem('auth_error')) {
        logout();
        sessionStorage.removeItem('auth_error');
        return;
      }

      setUser(storedUser);

      let accessToken = getAuthToken();
      if (!accessToken) {
        accessToken = await refreshAccessToken();
      }

      if (!accessToken) {
        logout();
        return;
      }

      try {
        let response = await verifySession(accessToken);

        if (!response.ok && (response.status === 401 || response.status === 403)) {
          try {
            const refreshedAccessToken = await refreshAccessToken();
            if (refreshedAccessToken) {
              response = await verifySession(refreshedAccessToken);
            }
          } catch (refreshErr) {
            console.error('[UserContext] Token refresh failed:', refreshErr);
          }
        }

        if (await applyVerifiedUser(response)) {
          return;
        }

        if (response.status === 401 || response.status === 403) {
          if (typeof window !== 'undefined') sessionStorage.setItem('auth_error', 'true');
          logout();
        }
      } catch (apiErr) {
        console.error('[UserContext] Failed to verify user session', apiErr);
      }
    } catch (err) {
      console.error('Error refreshing user:', err);
      setError('Failed to load user data');
    } finally {
      setIsLoading(false);
    }
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
    }, 30000);

    return () => clearInterval(interval);
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
