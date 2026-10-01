import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MIN_CHECKING_MS, useFeedbackState } from "../src/components/Feedback/useFeedbackState";
import type { SubmissionStatus } from "../src/content";

function setup(status: SubmissionStatus, stepKey = 0) {
  return renderHook(({ status, stepKey }) => useFeedbackState(status, stepKey), {
    initialProps: { status, stepKey },
  });
}

describe("useFeedbackState", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("shows nothing before the first submission", () => {
    expect(setup("untried").result.current).toBeNull();
  });

  it("holds checking for a minimum time when the result lands at once", () => {
    const { result, rerender } = setup("checking");
    rerender({ status: "passed", stepKey: 0 });
    expect(result.current).toBe("checking");

    act(() => vi.advanceTimersByTime(MIN_CHECKING_MS - 1));
    expect(result.current).toBe("checking");
    act(() => vi.advanceTimersByTime(1));
    expect(result.current).toBe("correct");
  });

  it("drops the minimum under prefers-reduced-motion", () => {
    vi.stubGlobal("matchMedia", (query: string) => ({ matches: query.includes("reduce") }));
    const { result, rerender } = setup("checking");
    rerender({ status: "passed", stepKey: 0 });
    expect(result.current).toBe("correct");
  });

  it("starts a new step from its own state, not mid-hold from the last one", () => {
    const { result, rerender } = setup("checking");
    rerender({ status: "passed", stepKey: 0 });
    expect(result.current).toBe("checking");

    rerender({ status: "untried", stepKey: 1 });
    expect(result.current).toBeNull();

    // Coming back after the hold would have ended shows the result, with no stale timer firing.
    act(() => vi.advanceTimersByTime(MIN_CHECKING_MS));
    rerender({ status: "passed", stepKey: 0 });
    expect(result.current).toBe("correct");
  });
});
