"use client"

import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { getCurrentUser, setCurrentUser as saveCurrentUser } from '@/lib/api';
import { APP_CONFIG } from '@/lib/config';
import { STORAGE_KEYS } from '@/lib/constants';

export interface User {
  id: number;
  email: string;
  name: string;
  role: string;
  department?: string;
  position?: string;
  avatar?: string;
  phone?: string;
  bio?: string;
  birthday?: string;
  hireDate?: string;
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

  // Logout - clear user data
  const logout = useCallback(() => {
    setUser(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEYS.USER);
      localStorage.removeItem('accessToken');
    }
  }, []);

  // Fetch user from localStorage or API
  const refreshUser = useCallback(async () => {
    try {
      setError(null);
      const storedUser = getCurrentUser();

      if (storedUser) {
        // Safety check: if we just had an auth error, don't try again immediately to avoid loops
        if (typeof window !== 'undefined' && sessionStorage.getItem('auth_error')) {
          console.warn('[UserContext] Detected previous auth error loop. Clearing session.');
          logout();
          sessionStorage.removeItem('auth_error'); // Clear flag so they can try logging in again manually
          setIsLoading(false);
          return;
        }

        // Optimistically set user from storage
        setUser(storedUser);

        // Verify with backend
        try {
          const res = await fetch(`${APP_CONFIG.apiUrl}/auth/me`, {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
            }
          });

          if (res.ok) {
            const data = await res.json();
            if (data.user) {
              console.log('[UserContext] Verified user:', data.user.email);
              // Only update if data changed to avoid re-renders
              setUser(prev => {
                if (prev?.id === data.user.id && prev?.email === data.user.email) return prev;
                return data.user;
              });
              saveCurrentUser(data.user);
            }
          } else if (res.status === 401) {
            // Token invalid
            console.warn('[UserContext] Session expired or invalid token -> Logging out');
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

  // Update user in state and localStorage
  const updateUser = useCallback((userData: Partial<User>) => {
    setUser(prev => {
      if (!prev) return null;
      const updatedUser = { ...prev, ...userData };
      saveCurrentUser(updatedUser);
      return updatedUser;
    });
  }, []);

  // Initial load
  useEffect(() => {
    void refreshUser();
  }, [refreshUser]);

  // Polling to keep user data fresh
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(() => {
      refreshUser();
    }, APP_CONFIG.userPollInterval);

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

// Custom hook to use the UserContext
export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}
