import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { authApi } from '../api/authApi';
import { setStoredToken, clearStoredToken, setUnauthorizedHandler } from '../api/client';
import type { User, UserRole } from '../types/api';
import { mapBackendRolesToFrontend } from '../utils/roleMap';

const USER_KEY = 'greenslot_user';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  register: (username: string, name: string, email: string, password: string, phone?: string) => Promise<string | true>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const logout = useCallback(async () => {
    await clearStoredToken();
    await AsyncStorage.removeItem(USER_KEY);
    setUser(null);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      logout();
    });

    (async () => {
      try {
        const storedUser = await AsyncStorage.getItem(USER_KEY);
        if (storedUser) {
          setUser(JSON.parse(storedUser));
        }
      } finally {
        setIsLoading(false);
      }
    })();
  }, [logout]);

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      const data = await authApi.login({ username, password });
      if (data?.token) {
        await setStoredToken(data.token);

        const role = mapBackendRolesToFrontend(data.roles) as UserRole;
        const loggedUser: User = {
          id: data.id?.toString(),
          name: data.fullName || data.username,
          email: data.email,
          role,
          createdAt: new Date().toISOString(),
        };

        await AsyncStorage.setItem(USER_KEY, JSON.stringify(loggedUser));
        setUser(loggedUser);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const register = async (
    username: string,
    name: string,
    email: string,
    password: string,
    phone?: string
  ): Promise<string | true> => {
    try {
      await authApi.register({
        username,
        email,
        password,
        fullName: name,
        phone: phone || undefined,
      });
      return true;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } | string } };
      const msg = err?.response?.data;
      if (typeof msg === 'string') return msg;
      if (msg && typeof msg === 'object' && 'message' in msg && typeof msg.message === 'string') {
        return msg.message;
      }
      return 'Đăng ký thất bại. Vui lòng thử lại.';
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        logout,
        register,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
