import { describe, it, expect } from "vitest";
import { parseApiErrorMessage } from "../src/api/client";

describe("parseApiErrorMessage", () => {
  it("extracts detail string from FastAPI error JSON", () => {
    const raw = JSON.stringify({ detail: "Problem not found" });
    expect(parseApiErrorMessage(raw, "Not Found")).toBe("Problem not found");
  });

  it("extracts validation error array from FastAPI/Pydantic error JSON", () => {
    const raw = JSON.stringify({
      detail: [{ msg: "Field required" }, { msg: "Must be a number" }],
    });
    expect(parseApiErrorMessage(raw, "Bad Request")).toBe("Field required, Must be a number");
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
    expect(parseApiErrorMessage("", "Internal Server Error")).toBe("Internal Server Error");
    expect(parseApiErrorMessage("   ", "Internal Server Error")).toBe("Internal Server Error");
  });

  it("returns raw string if not valid JSON", () => {
    expect(parseApiErrorMessage("Something went wrong on server", "Error")).toBe(
      "Something went wrong on server",
    );
  });
});
