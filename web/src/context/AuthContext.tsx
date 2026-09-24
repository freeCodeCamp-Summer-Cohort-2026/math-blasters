/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";
import { api } from "../api/client";
import type { Account } from "../types";

export interface AuthContextValue {
  account: Account | null;
  loading: boolean;
  /** Rejects if the server did not sign out; the account is kept in that case. */
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | undefined>(
  undefined,
);

export interface AuthProviderProps {
  children: ReactNode;
  initialAccount?: Account | null;
  initialLoading?: boolean;
}

export function AuthProvider({
  children,
  initialAccount = null,
  initialLoading = true,
}: AuthProviderProps) {
  const [account, setAccount] = useState<Account | null>(initialAccount);
  const [loading, setLoading] = useState(initialLoading);
  const initialLoadingRef = useRef(initialLoading);

  useEffect(() => {
    if (!initialLoadingRef.current) {
      return;
    }
    let active = true;
    api.auth
      .getMe()
      .then((res) => {
        if (active) {
          setAccount(res);
          setLoading(false);
        }
      })
      // getMe resolves null on failure today; this keeps the header off the skeleton if that changes.
      .catch((err) => {
        if (active) {
          console.error("AuthProvider: failed to fetch current user", err);
          setAccount(null);
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  // Clear only once the server confirms, so a failed sign-out never looks like a real one.
  const logout = useCallback(async () => {
    await api.auth.logout();
    setAccount(null);
  }, []);

  const value = useMemo(
    () => ({ account, loading, logout }),
    [account, loading, logout],
  );

  return (
    <AuthContext.Provider value={value}>
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
