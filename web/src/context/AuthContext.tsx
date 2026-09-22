/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import type { ReactNode } from "react";
import { api } from "../api/client";
import type { Account } from "../types";

export interface AuthContextValue {
  account: Account | null;
  loading: boolean;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | undefined>(
  undefined,
);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [account, setAccount] = useState<Account | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    api.auth.getMe().then((res) => {
      if (active) {
        setAccount(res);
        setLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  const logout = useCallback(async () => {
    await api.auth.logout();
    setAccount(null);
  }, []);

  return (
    <AuthContext.Provider value={{ account, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
