// contexts/UserContext.tsx
'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getUserSession } from '@/app/login/actions';
import type { UserLevel } from '@/utils/permissions';
import { hasPermissionSync, type PermissionKey } from '@/utils/permissions';

interface UserData {
  id: string;
  username: string;
  level: UserLevel;
  name?: string;
  email?: string;
}

interface UserContextType {
  user: UserData | null;
  hasPermission: (permission: string) => boolean;
  loading: boolean;
  refreshUser: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    try {
      setLoading(true);
      const userData = await getUserSession();

      if (userData) {
        setUser({
          id: userData.id,
          username: userData.username,
          level: userData.level || 'kasir',
          name: userData.name,
          email: userData.email,
        });
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error('Failed to fetch user:', error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const userHasPermission = (permission: string): boolean => {
    if (!user) return false;
    return hasPermissionSync(user.level, permission as any);
  };

  useEffect(() => {
    refreshUser();
  }, []);

  return (
    <UserContext.Provider
      value={{
        user,
        hasPermission: userHasPermission,
        loading,
        refreshUser,
      }}
    >
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
