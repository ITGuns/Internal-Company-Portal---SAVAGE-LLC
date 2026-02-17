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

  // Fetch user from localStorage or API
  const refreshUser = useCallback(async () => {
    try {
      setError(null);
      const currentUser = getCurrentUser();
      
      if (currentUser) {
        setUser(currentUser);
        setIsLoading(false);
      } else {
        // If no user in localStorage, could trigger auth flow
        setUser(null);
        setIsLoading(false);
      }
    } catch (err) {
      console.error('Error refreshing user:', err);
      setError('Failed to load user data');
      setIsLoading(false);
    }
  }, []);

  // Update user in state and localStorage
  const updateUser = useCallback((userData: Partial<User>) => {
    setUser(prev => {
      if (!prev) return null;
      const updatedUser = { ...prev, ...userData };
      saveCurrentUser(updatedUser);
      return updatedUser;
    });
  }, []);

  // Logout - clear user data
  const logout = useCallback(() => {
    setUser(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEYS.USER);
      localStorage.removeItem('accessToken');
    }
  }, []);

  // Initial load
  useEffect(() => {
    void refreshUser();
  }, []);

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
