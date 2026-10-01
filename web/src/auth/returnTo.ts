import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// Survives the OAuth round trip: same tab, so sessionStorage outlives the provider's pages.
const RETURN_TO_KEY = "mb:return-to";

/** An in-app path worth returning to; anything else (other origins, `//host`, `/login`) is refused. */
export function safeReturnPath(value: unknown): string | null {
  if (typeof value !== "string" || !value.startsWith("/")) return null;
  // Parsed, not prefix-checked: the parser strips tabs and newlines, so "/\t/host" is "//host".
  let url: URL;
  try {
    url = new URL(value, window.location.origin);
  } catch {
    return null;
  }
  if (url.origin !== window.location.origin) return null;
  // Route matching ignores case and a trailing slash, so /LOGIN and /login/ are the login page too.
  if (url.pathname.replace(/\/+$/, "").toLowerCase() === "/login") return null;
  return url.pathname + url.search + url.hash;
}

/** Remembers where to land after sign-in, or forgets a stale one when `path` is null. */
export function rememberReturnTo(path: string | null): void {
  try {
    if (path) sessionStorage.setItem(RETURN_TO_KEY, path);
    else sessionStorage.removeItem(RETURN_TO_KEY);
  } catch {
    // Storage blocked: sign-in still works, it just lands on the default page.
  }
}

/** Reads and clears the remembered path, so it is used at most once. */
export function takeReturnTo(): string | null {
  try {
    const path = sessionStorage.getItem(RETURN_TO_KEY);
    sessionStorage.removeItem(RETURN_TO_KEY);
    return safeReturnPath(path);
  } catch {
    return null;
  }
}

/** Once auth settles after the OAuth redirect, sends a signed-in learner back to the page they signed in from. */
export function useReturnAfterSignIn(): void {
  const { account, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    // Taken either way: a signed-out landing means sign-in was abandoned, and the path goes stale.
    const path = takeReturnTo();
    if (account && path) navigate(path, { replace: true });
  }, [account, loading, navigate]);
}
