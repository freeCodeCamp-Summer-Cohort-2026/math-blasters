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
});
