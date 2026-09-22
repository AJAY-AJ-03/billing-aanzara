import React, { createContext, useContext, useState } from 'react';
import type { LoginResponseDto } from '../../../shared/types/ipc';

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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(() => {
    const saved = localStorage.getItem('aanzara_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return null;
      }
    }
    return null;
  });

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
    import('../services/ipcApi').then(m => m.default.auth.logout()).catch(() => {});
    setUser(null);
    localStorage.removeItem('aanzara_user');
  };

  const isAuthenticated = !!user;
  const isAdmin = user?.role === 'Admin';

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated, isAdmin }}>
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
