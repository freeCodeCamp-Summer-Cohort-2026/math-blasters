import { afterEach, describe, expect, it, vi } from "vitest";
import {
  API_BASE_URL,
  api,
  apiFetch,
  apiUrl,
  parseApiErrorMessage,
} from "../src/api/client";

describe("parseApiErrorMessage", () => {
  it("extracts detail string from FastAPI error JSON", () => {
    const raw = JSON.stringify({ detail: "Problem not found" });
    expect(parseApiErrorMessage(raw, "Not Found")).toBe("Problem not found");
  });

  it("extracts validation error array from FastAPI/Pydantic error JSON", () => {
    const raw = JSON.stringify({
      detail: [{ msg: "Field required" }, { msg: "Must be a number" }],
    });
    expect(parseApiErrorMessage(raw, "Bad Request")).toBe(
      "Field required, Must be a number",
    );
  });

  it("extracts error.message from nested error object", () => {
    const raw = JSON.stringify({
      error: { message: "Validation error" },
    });
    expect(parseApiErrorMessage(raw, "Error")).toBe("Validation error");
  });

  it("extracts message string if message field is present", () => {
    const raw = JSON.stringify({ message: "Custom error message" });
    expect(parseApiErrorMessage(raw, "Error")).toBe("Custom error message");
  });

  it("extracts error string if error field is present", () => {
    const raw = JSON.stringify({ error: "Access denied" });
    expect(parseApiErrorMessage(raw, "Forbidden")).toBe("Access denied");
  });

  it("falls back to statusText when body is empty or whitespace", () => {
    expect(parseApiErrorMessage("", "Internal Server Error")).toBe(
      "Internal Server Error",
    );
    expect(parseApiErrorMessage("   ", "Internal Server Error")).toBe(
      "Internal Server Error",
    );
  });

  it("returns raw string if not valid JSON", () => {
    expect(
      parseApiErrorMessage("Something went wrong on server", "Error"),
    ).toBe("Something went wrong on server");
  });
});

describe("apiFetch", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("resolves paths against VITE_API_URL, falling back to the compose default", () => {
    expect(API_BASE_URL).toBe(
      (import.meta.env.VITE_API_URL ?? "http://localhost:8000/api").replace(/\/+$/, ""),
    );
    expect(apiUrl("/auth/me")).toBe(`${API_BASE_URL}/auth/me`);
  });

  it("sends credentials and no Content-Type on a bodiless GET", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => ({ status: "ok" }),
    } as Response);

    await apiFetch("/test");

    expect(fetchSpy).toHaveBeenCalledWith(
      apiUrl("/test"),
      expect.objectContaining({ credentials: "include" }),
    );
    const init = fetchSpy.mock.calls[0][1]!;
    expect(new Headers(init.headers).has("Content-Type")).toBe(false);
  });

  it("sets a JSON Content-Type when there is a body", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    } as Response);

    await apiFetch("/test", { method: "POST", body: "{}" });

    const init = fetchSpy.mock.calls[0][1]!;
    expect(new Headers(init.headers).get("Content-Type")).toBe(
      "application/json",
    );
  });

  it("handles HTTP 204 No Content without throwing and returns undefined", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      status: 204,
      json: async () => {
        throw new SyntaxError("Unexpected end of JSON input");
      },
    } as unknown as Response);

    const result = await apiFetch("/no-content");
    expect(result).toBeUndefined();
  });
});

describe("api.auth", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("getMe", () => {
    it("maps the snake_case /me payload (MB-50) to an Account", async () => {
      const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 123,
          display_name: "Ada Lovelace",
          avatar_url: "https://example.com/avatar.png",
          email: "ada@example.com",
        }),
      } as Response);

      const result = await api.auth.getMe();
      expect(fetchSpy).toHaveBeenCalledWith(
        apiUrl("/auth/me"),
        expect.anything(),
      );
      expect(result).toEqual({
        id: "123",
        displayName: "Ada Lovelace",
        avatarUrl: "https://example.com/avatar.png",
      });
    });

    it("leaves avatarUrl undefined when avatar_url is null", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 1, display_name: "Ada", avatar_url: null }),
      } as Response);

      expect(await api.auth.getMe()).toEqual({ id: "1", displayName: "Ada" });
    });

    it("returns null when /me returns null (signed out)", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
        ok: true,
        json: async () => null,
      } as Response);

      expect(await api.auth.getMe()).toBeNull();
    });

    it("returns null quietly when endpoint returns 401 Unauthorized", async () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: "Unauthorized",
        text: async () => JSON.stringify({ detail: "Not authenticated" }),
      } as Response);

      const result = await api.auth.getMe();
      expect(result).toBeNull();
      expect(warnSpy).not.toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it("returns null and logs warning when endpoint returns 500 Internal Server Error", async () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        text: async () => "Internal Server Error",
      } as Response);

      const result = await api.auth.getMe();
      expect(result).toBeNull();
      expect(warnSpy).toHaveBeenCalledWith(
        "api.auth.getMe: failed to fetch current user",
        expect.any(Error),
      );
      warnSpy.mockRestore();
    });

    it("returns null and logs warning when fetch throws network error", async () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      const networkError = new Error("Network connection lost");
      vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(networkError);

      const result = await api.auth.getMe();
      expect(result).toBeNull();
      expect(warnSpy).toHaveBeenCalledWith(
        "api.auth.getMe: failed to fetch current user",
        networkError,
      );
      warnSpy.mockRestore();
    });
  });

  describe("logout", () => {
    it("calls POST /auth/logout with credentials: 'include'", async () => {
      const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      } as Response);

      await api.auth.logout();

      expect(fetchSpy).toHaveBeenCalledWith(
        apiUrl("/auth/logout"),
        expect.objectContaining({
          method: "POST",
          credentials: "include",
        }),
      );
    });

    it("rejects when the server did not sign out", async () => {
      vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(
        new Error("Network failure"),
      );

      await expect(api.auth.logout()).rejects.toThrow("Network failure");
    });
  });
});
