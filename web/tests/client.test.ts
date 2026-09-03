import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api, ApiError } from "../src/api/client";

describe("api client error handling", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("extracts error.message from the standardized error envelope", async () => {
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
      }),
    );

    await expect(api.checkDemoAnswer("banana" as unknown as number)).rejects.toThrow(ApiError);

    try {
      await api.checkDemoAnswer("banana" as unknown as number);
    } catch (err) {
      const apiError = err as ApiError;
      expect(apiError.status).toBe(422);
      // Asserts ApiError.message is the extracted message, NOT the raw JSON body
      expect(apiError.message).toBe("Validation error");
    }
  });

  it("falls back to statusText if response body does not match the error envelope", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        json: async () => ({}),
      }),
    );

    try {
      await api.getDemoProblem();
    } catch (err) {
      const apiError = err as ApiError;
      expect(apiError.status).toBe(500);
      expect(apiError.message).toBe("Internal Server Error");
    }
  });
});
