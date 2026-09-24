import React, { createContext, useContext, useState, useEffect } from 'react';  // CHANGED (added useEffect)
import type { LoginResponseDto } from '../../../shared/types/ipc';
import api from '../services/ipcApi';  // ADDED — needed at module scope now, not just dynamic import in logout()

interface AuthUser {
  userId: number;
  id: number;
  name: string;
  role: 'Admin' | 'SalesWorker';
  email: string;
  phone?: string | null;
}

interface AuthContextType {
  user: AuthUser | null;
  login: (userData: LoginResponseDto) => void;
  logout: () => void;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isRestoring: boolean;   // ADDED
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);          // CHANGED — no longer read localStorage synchronously here
  const [isRestoring, setIsRestoring] = useState(true);              // ADDED

  // ADDED — on app start, re-establish the main-process session from the
  // cached userId instead of trusting localStorage alone. If the account
  // was deactivated/deleted since last launch, this logs the user out
  // cleanly instead of leaving the UI showing a session main.ts doesn't have.
  useEffect(() => {
    const restore = async () => {
      const saved = localStorage.getItem('aanzara_user');
      if (!saved) {
        setIsRestoring(false);
        return;
      }
      try {
        const cached: AuthUser = JSON.parse(saved);
        const res = await api.auth.restoreSession(cached.userId);
        if (res.success && res.data) {
          const authUser: AuthUser = {
            userId: res.data.userId,
            id: res.data.userId,
            name: res.data.name,
            role: res.data.role as 'Admin' | 'SalesWorker',
            email: res.data.email,
            phone: cached.phone || null
          };
          setUser(authUser);
          localStorage.setItem('aanzara_user', JSON.stringify(authUser)); // refresh cache with latest DB values
        } else {
          localStorage.removeItem('aanzara_user');
          setUser(null);
        }
      } catch (e) {
        localStorage.removeItem('aanzara_user');
        setUser(null);
      }
      setIsRestoring(false);
    };
    restore();
  }, []);

  const login = (data: LoginResponseDto) => {
    const authUser: AuthUser = {
      userId: data.userId,
      id: data.userId,
      name: data.name,
      role: data.role as 'Admin' | 'SalesWorker',
      email: data.email,
      phone: (data as any).phone || null
    };
    setUser(authUser);
    localStorage.setItem('aanzara_user', JSON.stringify(authUser));
  };

  const logout = () => {
    api.auth.logout().catch(() => {});   // CHANGED — reuse the module-level import instead of dynamic import
    setUser(null);
    localStorage.removeItem('aanzara_user');
  };

  const isAuthenticated = !!user;
  const isAdmin = user?.role === 'Admin';

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated, isAdmin, isRestoring }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};