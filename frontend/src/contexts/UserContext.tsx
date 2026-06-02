"use client"

import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import {
  getAuthToken,
  getCurrentUser,
  logout as endAuthSession,
  refreshAccessToken,
  setCurrentUser as saveCurrentUser,
} from '@/lib/api';

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
    endAuthSession();
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      setError(null);
      const storedUser = getCurrentUser();

      if (storedUser) {
        if (typeof window !== 'undefined' && sessionStorage.getItem('auth_error')) {
          logout();
          sessionStorage.removeItem('auth_error');
          setIsLoading(false);
          return;
        }

        setUser(storedUser);

        let accessToken = getAuthToken();
        if (!accessToken) {
          accessToken = await refreshAccessToken();
        }

        if (!accessToken) {
          logout();
          setIsLoading(false);
          return;
        }

        try {
          const res = await fetch(`/backend-auth/me`, {
            credentials: 'include',
            headers: {
              'Authorization': `Bearer ${accessToken}`
            }
          });

          if (res.ok) {
            const data = await res.json();
            if (data.user) {
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
            }
          } else if (res.status === 401 || res.status === 403) {
            try {
              const newAccessToken = await refreshAccessToken();
              if (newAccessToken) {
                return;
              }
            } catch (refreshErr) {
              console.error('[UserContext] Token refresh failed:', refreshErr);
            }

            if (typeof window !== 'undefined') sessionStorage.setItem('auth_error', 'true');
            logout();
          }
        } catch (apiErr) {
          console.error('[UserContext] Failed to verify user session', apiErr);
        }

        setIsLoading(false);
      } else {
        setUser(null);
        setIsLoading(false);
      }
    } catch (err) {
      console.error('Error refreshing user:', err);
      setError('Failed to load user data');
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
