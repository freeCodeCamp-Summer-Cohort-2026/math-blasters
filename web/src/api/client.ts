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

export async function apiFetch<T>(
  endpoint: string,
  init?: RequestInit,
): Promise<T> {
  const options: RequestInit = {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  };

  const response = await fetch(endpoint, options);
  if (!response.ok) {
    const text = await response.text();
    throw new ApiError(
      parseApiErrorMessage(text, response.statusText),
      response.status,
    );
  }
  return response.json();
}

export const api = {
  auth: {
    async getMe(): Promise<Account | null> {
      try {
        return await apiFetch<Account>("/api/auth/me");
      } catch {
        // Unreachable, 401, or error returns null quietly
        return null;
      }
    },
    async logout(): Promise<void> {
      try {
        await apiFetch<void>("/api/auth/logout", { method: "POST" });
      } catch (err) {
        console.warn("api.auth.logout: failed to log out on server", err);
      }
    },
  },
};

