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
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      headers: { "Content-Type": "application/json" },
      ...init,
    });
  } catch {
    // Almost always the API not running -- say so plainly rather than
    // surfacing a bare "Failed to fetch".
    throw new ApiError("Can't reach the API. Is it running on port 8000?", 0);
  }

  if (!response.ok) {
    throw new ApiError((await response.text()) || response.statusText, response.status);
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
