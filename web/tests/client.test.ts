import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api, ApiError, parseApiErrorMessage } from "../src/api/client";

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

describe("api client error handling", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("extracts error.message from the standardized error envelope", async () => {
    expect.assertions(3);

    const mockErrorEnvelope = {
      error: {
        code: "validation_error",
        message: "Validation error",
        details: [{ type: "int_parsing", loc: ["body", "answer"] }],
      },
    };

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 422,
        statusText: "Unprocessable Entity",
        json: async () => mockErrorEnvelope,
        text: async () => JSON.stringify(mockErrorEnvelope),
      }),
    );

    try {
      await api.checkDemoAnswer("banana" as unknown as number);
    } catch (err) {
      const apiError = err as ApiError;
      expect(apiError).toBeInstanceOf(ApiError);
      expect(apiError.status).toBe(422);
      expect(apiError.message).toBe("Validation error");
    }
  });

  it("falls back to statusText if response body does not match the error envelope", async () => {
    expect.assertions(3);

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        json: async () => ({}),
        text: async () => "{}",
      }),
    );

    try {
      await api.getDemoProblem();
    } catch (err) {
      const apiError = err as ApiError;
      expect(apiError).toBeInstanceOf(ApiError);
      expect(apiError.status).toBe(500);
      expect(apiError.message).toBe("Internal Server Error");
    }
  });

  it("logs warning and falls back to statusText if reading response text throws", async () => {
    expect.assertions(4);
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 502,
        statusText: "Bad Gateway",
        text: async () => {
          throw new Error("Network stream aborted");
        },
      }),
    );

    try {
      await api.getDemoProblem();
    } catch (err) {
      const apiError = err as ApiError;
      expect(apiError).toBeInstanceOf(ApiError);
      expect(apiError.status).toBe(502);
      expect(apiError.message).toBe("Bad Gateway");
      expect(warnSpy).toHaveBeenCalledWith(
        "Api client: failed to read error response body",
        expect.any(Error),
      );
    }
  });
});
