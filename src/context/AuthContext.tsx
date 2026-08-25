import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { authApi } from '../api/authApi';
import { setStoredToken, clearStoredToken, setUnauthorizedHandler, getApiErrorMessage } from '../api/client';
import type { User, UserRole } from '../types/api';
import { mapBackendRolesToFrontend } from '../utils/roleMap';
import { registerForPushNotificationsAsync } from '../utils/notificationHelper';

const USER_KEY = 'greenslot_user';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  register: (username: string, name: string, email: string, password: string, phone?: string, address?: string) => Promise<string | true>;
  loginWithGoogle: (idToken: string) => Promise<boolean>;
  loginWithJwtData: (data: import('../types/api').JwtResponse) => Promise<void>;
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

  useEffect(() => {
    if (user) {
      // Register Firebase device token when user is logged in
      registerForPushNotificationsAsync().catch((err) => {
        console.warn('Failed to register device token automatically:', err);
      });
    }
  }, [user]);

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

  const loginWithGoogle = async (idToken: string): Promise<boolean> => {
    try {
      const data = await authApi.googleLogin({ idToken });
      if (data?.token) {
        await loginWithJwtData(data);
        return true;
      }
      return false;
    } catch (err) {
      console.warn('Google login request failed:', err);
      return false;
    }
  };

  const register = async (
    username: string,
    name: string,
    email: string,
    password: string,
    phone?: string,
    address?: string
  ): Promise<string | true> => {
    try {
      await authApi.register({
        username,
        email,
        password,
        fullName: name,
        phone: phone || undefined,
        address: address || undefined,
      });
      return true;
    } catch (error: unknown) {
      return getApiErrorMessage(error, 'Đăng ký thất bại. Vui lòng thử lại.');
    }
  };

  const loginWithJwtData = async (data: import('../types/api').JwtResponse): Promise<void> => {
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
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        logout,
        register,
        loginWithGoogle,
        loginWithJwtData,
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
