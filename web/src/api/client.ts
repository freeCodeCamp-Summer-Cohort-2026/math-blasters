import type { Account } from "../types";

/** Thin typed wrapper around fetch. */

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/**
 * Extracts and formats a user-friendly error message from API response text.
 */
export function parseApiErrorMessage(raw: string, fallback: string): string {
  const trimmed = (raw || "").trim();
  if (!trimmed) return fallback;

  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed);

      if (typeof parsed === "object" && parsed !== null) {
        if (typeof parsed.detail === "string") {
          return parsed.detail;
        }
        if (Array.isArray(parsed.detail)) {
          return parsed.detail
            .map((item: { msg?: string }) => item.msg || JSON.stringify(item))
            .join(", ");
        }
        if (
          typeof parsed.error === "object" &&
          parsed.error !== null &&
          typeof parsed.error.message === "string"
        ) {
          return parsed.error.message;
        }
        if (typeof parsed.message === "string") {
          return parsed.message;
        }
        if (typeof parsed.error === "string") {
          return parsed.error;
        }

        // Object has no recognizable error fields; fall back to statusText/fallback
        return fallback;
      }
    } catch (err) {
      console.warn("Api client: failed to parse JSON error body", err);
    }
  }

  return trimmed || fallback;
}

// Use a relative path when unset or empty so single-origin deployments need no configuration.
export const API_BASE_URL = (
  import.meta.env.VITE_API_URL || "/api"
).replace(/\/+$/, "");

/** Absolute URL for an API path such as "/auth/me". */
export function apiUrl(path: string): string {
  return `${API_BASE_URL}${path}`;
}

export async function apiFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  // Only declare a JSON body when there is one; a bare GET stays preflight-free.
  const headers = new Headers(init?.headers);
  if (init?.body !== undefined && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(apiUrl(path), {
    ...init,
    credentials: "include",
    headers,
  });
  if (!response.ok) {
    const text = await response.text();
    throw new ApiError(
      parseApiErrorMessage(text, response.statusText),
      response.status,
    );
  }
  if (response.status === 204) {
    return undefined as unknown as T;
  }
  return response.json();
}

/** Wire shape of `GET /api/auth/me` (MB-50). */
interface AccountResponse {
  id: string | number;
  display_name: string;
  avatar_url?: string | null;
}

function toAccount(raw: unknown): Account | null {
  if (typeof raw !== "object" || raw === null) return null;
  const body = raw as Partial<AccountResponse>;
  if (typeof body.display_name !== "string") return null;
  return {
    id: String(body.id),
    displayName: body.display_name,
    avatarUrl: body.avatar_url ?? undefined,
  };
}

/** Wire shape of `POST /api/completions` (MB-29). */
interface CompletionResponse {
  lesson_slug: string;
  completed_at: string;
}

export interface Completion {
  lessonSlug: string;
  completedAt: string;
}

export const api = {
  /** Completed lesson slugs for the signed-in account; rejects on failure so the caller picks the degraded state. */
  async getProgress(): Promise<string[]> {
    const body = await apiFetch<unknown>("/progress");
    if (!Array.isArray(body) || !body.every((slug) => typeof slug === "string")) {
      throw new Error("api.getProgress: expected an array of lesson slugs");
    }
    return body;
  },
  /** Records a passed lesson; a repeat returns the original row. */
  async postCompletion(slug: string): Promise<Completion> {
    const body = await apiFetch<CompletionResponse>("/completions", {
      method: "POST",
      body: JSON.stringify({ lesson_slug: slug }),
    });
    return { lessonSlug: body.lesson_slug, completedAt: body.completed_at };
  },
  auth: {
    async getMe(): Promise<Account | null> {
      try {
        return toAccount(await apiFetch<unknown>("/auth/me"));
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          return null;
        }
        console.warn("api.auth.getMe: failed to fetch current user", err);
        return null;
      }
    },
    /** Rejects when the server did not sign out, so the UI never claims it did. */
    async logout(): Promise<void> {
      await apiFetch<void>("/auth/logout", { method: "POST" });
    },
  },
};
