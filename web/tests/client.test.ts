import { afterEach, describe, expect, it, vi } from "vitest";
import { api, apiFetch, parseApiErrorMessage } from "../src/api/client";

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

  it("includes credentials: 'include' by default", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => ({ status: "ok" }),
    } as Response);

    await apiFetch("/api/test");

    expect(fetchSpy).toHaveBeenCalledWith(
      "/api/test",
      expect.objectContaining({
        credentials: "include",
        headers: expect.objectContaining({
          "Content-Type": "application/json",
        }),
      }),
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

    const result = await apiFetch("/api/no-content");
    expect(result).toBeUndefined();
  });
});

describe("api.auth", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("getMe", () => {
    it("returns Account object on 200 OK", async () => {
      const mockAccount = {
        id: "usr_123",
        displayName: "Ada Lovelace",
        avatarUrl: "https://example.com/avatar.png",
      };

      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
        ok: true,
        json: async () => mockAccount,
      } as Response);

      const result = await api.auth.getMe();
      expect(result).toEqual(mockAccount);
    });

    it("returns null quietly when endpoint returns 401 Unauthorized", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: "Unauthorized",
        text: async () => JSON.stringify({ detail: "Not authenticated" }),
      } as Response);

      const result = await api.auth.getMe();
      expect(result).toBeNull();
    });

    it("returns null quietly when fetch throws network error", async () => {
      vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(
        new Error("Network connection lost"),
      );

      const result = await api.auth.getMe();
      expect(result).toBeNull();
    });
  });

  describe("logout", () => {
    it("calls POST /api/auth/logout with credentials: 'include'", async () => {
      const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      } as Response);

      await api.auth.logout();

      expect(fetchSpy).toHaveBeenCalledWith(
        "/api/auth/logout",
        expect.objectContaining({
          method: "POST",
          credentials: "include",
        }),
      );
    });

    it("handles logout network failure gracefully without throwing", async () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(
        new Error("Network failure"),
      );

      await expect(api.auth.logout()).resolves.toBeUndefined();
      expect(warnSpy).toHaveBeenCalledWith(
        "api.auth.logout: failed to log out on server",
        expect.any(Error),
      );
      warnSpy.mockRestore();
    });
  });
});
