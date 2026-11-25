"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { clearTokens, getStoredAccessToken, storeTokens } from "@/lib/api";
import { authService } from "@/services/authService";
import { useThemeContext } from "@/components/providers/ThemeProvider";
import type { User } from "@/types";

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (name: string, email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<User | null>;
  updateLocalUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { setTheme } = useThemeContext();

  const refreshUser = useCallback(async (): Promise<User | null> => {
    const token = getStoredAccessToken();
    if (!token) {
      setUser(null);
      setIsLoading(false);
      return null;
    }

    try {
      const profile = await authService.me();
      setUser(profile);
      if (profile.theme_preference === "light" || profile.theme_preference === "dark") {
        setTheme(profile.theme_preference);
      }
      return profile;
    } catch {
      clearTokens();
      setUser(null);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [setTheme]);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = useCallback(
    async (email: string, password: string): Promise<User> => {
      const res = await authService.login({ email, password });
      storeTokens(res.access_token, res.refresh_token);
      setUser(res.user);
      if (res.user.theme_preference === "light" || res.user.theme_preference === "dark") {
        setTheme(res.user.theme_preference);
      }
      return res.user;
    },
    [setTheme]
  );

  const register = useCallback(
    async (name: string, email: string, password: string): Promise<User> => {
      const res = await authService.register({ name, email, password });
      storeTokens(res.access_token, res.refresh_token);
      setUser(res.user);
      if (res.user.theme_preference === "light" || res.user.theme_preference === "dark") {
        setTheme(res.user.theme_preference);
      }
      return res.user;
    },
    [setTheme]
  );

  const logout = useCallback(async () => {
    await authService.logout();
    clearTokens();
    setUser(null);
  }, []);

  const updateLocalUser = useCallback(
    (nextUser: User) => {
      setUser(nextUser);
      if (nextUser.theme_preference === "light" || nextUser.theme_preference === "dark") {
        setTheme(nextUser.theme_preference);
      }
    },
    [setTheme]
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: Boolean(user),
        login,
        register,
        logout,
        refreshUser,
        updateLocalUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
