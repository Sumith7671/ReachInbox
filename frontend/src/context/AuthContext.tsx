import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { apiService } from '../services/api';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  loginWithDev: (email?: string, name?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const refreshAuth = async () => {
    try {
      setLoading(true);
      const data = await apiService.getMe();
      setUser(data.user);
    } catch (error) {
      setUser(null);
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
      setUser(data.user);
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
