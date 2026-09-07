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
    let message = response.statusText;

    try {
      const rawText = await response.text();

      if (rawText.trim()) {
        try {
          const body = JSON.parse(rawText) as { error?: { message?: string } };

          if (body?.error?.message && typeof body.error.message === "string") {
            message = body.error.message;
          }
        } catch {
          message = rawText.trim();
        }
      }
    } catch {
      message = response.statusText;
    }

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
