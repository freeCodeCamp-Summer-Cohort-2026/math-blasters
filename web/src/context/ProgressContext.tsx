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
import { useAuth } from "./AuthContext";

export interface ProgressContextValue {
  /** Completed lesson slugs from the server; empty when signed out or when progress could not load. */
  completedSlugs: string[];
  /** True only while a signed-in account's progress is being fetched. */
  loading: boolean;
  /** Posts a passed lesson for a signed-in account; never throws, and is a no-op when signed out. */
  recordCompletion: (slug: string) => void;
}

export const ProgressContext = createContext<ProgressContextValue | undefined>(
  undefined,
);

// Progress is only recorded for a signed-in account, so signed out it is empty without a request.
export function ProgressProvider({ children }: { children: ReactNode }) {
  const { account, loading: authLoading } = useAuth();
  const accountId = authLoading ? null : (account?.id ?? null);

  const [completedSlugs, setCompletedSlugs] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const completedRef = useRef(completedSlugs);
  completedRef.current = completedSlugs;
  const accountRef = useRef(accountId);
  accountRef.current = accountId;
  const posting = useRef(new Set<string>());
  // Lessons passed before auth settled, posted once it is known who is signed in.
  const held = useRef(new Set<string>());

  useEffect(() => {
    setCompletedSlugs([]);
    if (!accountId) {
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    api
      .getProgress()
      .then((slugs) => {
        // Keeps anything recorded while the fetch was in flight.
        if (active) setCompletedSlugs((prev) => [...new Set([...slugs, ...prev])]);
      })
      // An unreachable API means no ticks yet, never a broken page.
      .catch((err) => {
        if (active) console.warn("ProgressProvider: failed to fetch progress", err);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [accountId]);

  const recordCompletion = useCallback(
    (slug: string) => {
      if (authLoading) {
        held.current.add(slug);
        return;
      }
      if (!accountId) return;
      if (completedRef.current.includes(slug) || posting.current.has(slug)) return;
      posting.current.add(slug);
      api
        .postCompletion(slug)
        .then(() => {
          // A post that lands after sign-out or an account switch must not tick the new state.
          if (accountRef.current !== accountId) return;
          setCompletedSlugs((prev) => (prev.includes(slug) ? prev : [...prev, slug]));
        })
        // A failed post never blocks the learner; it just leaves no tick.
        .catch((err) => console.warn("ProgressProvider: failed to record completion", err))
        .finally(() => posting.current.delete(slug));
    },
    [accountId, authLoading],
  );

  // Signed out, the held lessons are dropped: recordCompletion is a no-op without an account.
  useEffect(() => {
    if (authLoading) return;
    const slugs = [...held.current];
    held.current.clear();
    slugs.forEach(recordCompletion);
  }, [authLoading, recordCompletion]);

  const value = useMemo(
    () => ({ completedSlugs, loading, recordCompletion }),
    [completedSlugs, loading, recordCompletion],
  );

  return (
    <ProgressContext.Provider value={value}>
      {children}
    </ProgressContext.Provider>
  );
}

export function useProgress(): ProgressContextValue {
  const ctx = useContext(ProgressContext);
  if (!ctx) {
    throw new Error("useProgress must be used within a ProgressProvider");
  }
  return ctx;
}
