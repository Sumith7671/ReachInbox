import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { apiService } from '../services/api';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  loginWithDev: (email?: string, name?: string) => Promise<User | void>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem('reachinbox_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState<boolean>(() => {
    return !localStorage.getItem('reachinbox_user');
  });

  const refreshAuth = async () => {
    const token = localStorage.getItem('reachinbox_token');
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const data = await apiService.getMe();
      if (data?.user) {
        setUser(data.user);
        localStorage.setItem('reachinbox_user', JSON.stringify(data.user));
      }
    } catch (error) {
      console.warn('Background profile refresh skipped:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Check URL parameters for token passed from Google OAuth redirect
    const urlParams = new URLSearchParams(window.location.search);
    const tokenFromUrl = urlParams.get('token');

    if (tokenFromUrl) {
      localStorage.setItem('reachinbox_token', tokenFromUrl);
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    refreshAuth();
  }, []);

  const loginWithDev = async (email?: string, name?: string) => {
    setLoading(true);
    try {
      const data = await apiService.devLogin(email, name);
      if (data.token) {
        localStorage.setItem('reachinbox_token', data.token);
      }
      if (data.user) {
        localStorage.setItem('reachinbox_user', JSON.stringify(data.user));
        setUser(data.user);
      }
      return data.user;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await apiService.logout();
    } catch (e) {
      // Ignore
    }
    setUser(null);
    localStorage.removeItem('reachinbox_token');
    localStorage.removeItem('reachinbox_user');
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{ user, loading, loginWithDev, logout, refreshAuth }}>
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
