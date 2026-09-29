import { useEffect, useRef, useState } from "react";
import type { SubmissionStatus } from "../../content";
import type { FeedbackState } from "./types";

/** How long "checking" stays on screen, so a same-frame result doesn't skip it. */
export const MIN_CHECKING_MS = 400;

const FEEDBACK_FOR_STATUS: Record<SubmissionStatus, FeedbackState | null> = {
  untried: null,
  checking: "checking",
  passed: "correct",
  not_yet: "not-yet",
  error: "error",
};

/** The feedback state for a status as it stands, with no minimum hold. */
export function feedbackStateFor(status: SubmissionStatus): FeedbackState | null {
  return FEEDBACK_FOR_STATUS[status];
}

function prefersReducedMotion(): boolean {
  return typeof window.matchMedia === "function"
    && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** The feedback state to show for a step's status, or null before the first submission; holds "checking" for MIN_CHECKING_MS unless motion is reduced. A new `stepKey` starts fresh, never mid-hold from the last step. */
export function useFeedbackState(status: SubmissionStatus, stepKey?: unknown): FeedbackState | null {
  const target = FEEDBACK_FOR_STATUS[status];
  const [held, setHeld] = useState({ stepKey, shown: target });
  const checkingSince = useRef<number | null>(target === "checking" ? Date.now() : null);
  const lastStepKey = useRef(stepKey);

  useEffect(() => {
    const sameStep = lastStepKey.current === stepKey;
    lastStepKey.current = stepKey;
    if (target === "checking") {
      checkingSince.current = Date.now();
      setHeld({ stepKey, shown: target });
      return;
    }
    const since = sameStep ? checkingSince.current : null;
    checkingSince.current = null;
    const remaining = since === null || prefersReducedMotion()
      ? 0
      : MIN_CHECKING_MS - (Date.now() - since);
    if (remaining <= 0) {
      setHeld({ stepKey, shown: target });
      return;
    }
    const timer = setTimeout(() => setHeld({ stepKey, shown: target }), remaining);
    return () => clearTimeout(timer);
  }, [target, stepKey]);

  // Until the effect catches up, a new step shows its own state rather than the last step's.
  return held.stepKey === stepKey ? held.shown : target;
}
