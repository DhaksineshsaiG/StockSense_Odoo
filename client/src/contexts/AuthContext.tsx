import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User } from '../types';
import { authApi, LoginPayload, RegisterPayload } from '../api/auth';
import { TOKEN_STORAGE_KEY, AUTH_USER_KEY } from '../api/client';

export interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (payload: LoginPayload) => Promise<User>;
  register: (payload: RegisterPayload) => Promise<User>;
  logout: () => void;
  refreshUser: () => Promise<User | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const savedUser = localStorage.getItem(AUTH_USER_KEY);
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  });

  const [loading, setLoading] = useState<boolean>(true);

  const clearAuth = useCallback(() => {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(AUTH_USER_KEY);
    setToken(null);
    setUser(null);
  }, []);

  const restoreAuth = useCallback(async () => {
    const savedToken = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (!savedToken) {
      clearAuth();
      setLoading(false);
      return;
    }

    try {
      const currentUser = await authApi.getMe();
      setUser(currentUser);
      localStorage.setItem(AUTH_USER_KEY, JSON.stringify(currentUser));
      setToken(savedToken);
    } catch (err) {
      console.warn('Authentication token invalid or expired. Session cleared.');
      clearAuth();
    } finally {
      setLoading(false);
    }
  }, [clearAuth]);

  useEffect(() => {
    restoreAuth();

    // Listen to unauthorized events from Axios interceptor
    const handleUnauthorized = () => {
      clearAuth();
    };

    window.addEventListener('stocksense:unauthorized', handleUnauthorized);
    return () => {
      window.removeEventListener('stocksense:unauthorized', handleUnauthorized);
    };
  }, [restoreAuth, clearAuth]);

  const login = async (payload: LoginPayload): Promise<User> => {
    const res = await authApi.login(payload);
    localStorage.setItem(TOKEN_STORAGE_KEY, res.token);
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(res.user));
    setToken(res.token);
    setUser(res.user);
    return res.user;
  };

  const register = async (payload: RegisterPayload): Promise<User> => {
    const res = await authApi.register(payload);
    localStorage.setItem(TOKEN_STORAGE_KEY, res.token);
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(res.user));
    setToken(res.token);
    setUser(res.user);
    return res.user;
  };

  const logout = () => {
    clearAuth();
    window.location.href = '/login';
  };

  const refreshUser = async (): Promise<User | null> => {
    try {
      const refreshed = await authApi.getMe();
      setUser(refreshed);
      localStorage.setItem(AUTH_USER_KEY, JSON.stringify(refreshed));
      return refreshed;
    } catch {
      clearAuth();
      return null;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isAuthenticated: !!user && !!token,
        login,
        register,
        logout,
        refreshUser,
      }}
    >
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
