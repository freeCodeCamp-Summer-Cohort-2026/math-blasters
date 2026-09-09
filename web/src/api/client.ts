/** Thin typed wrapper around fetch. */

import type { CheckResponse, DemoProblem } from "../types";

const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000/api";

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

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  const headers = new Headers(init?.headers);

  if (init?.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  try {
    response = await fetch(`${BASE_URL}${path}`, {
      ...init,
      headers,
    });
  } catch {
    // Almost always the API not running -- say so plainly rather than
    // surfacing a bare "Failed to fetch".
    throw new ApiError("Can't reach the API. Is it running on port 8000?", 0);
  }

  if (!response.ok) {
    let raw = "";
    try {
      raw = await response.text();
    } catch (err) {
      console.warn("Api client: failed to read error response body", err);
    }
    const fallback = response.statusText || `HTTP ${response.status}`;
    const message = parseApiErrorMessage(raw, fallback);
    throw new ApiError(message || `HTTP ${response.status}`, response.status);
  }

  return (await response.json()) as T;
}

export const api = {
  getDemoProblem: () => request<DemoProblem>("/demo/problem"),

  checkDemoAnswer: (answer: number) =>
    request<CheckResponse>("/demo/check", {
      method: "POST",
      body: JSON.stringify({ answer }),
    }),
};
