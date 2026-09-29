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

function prefersReducedMotion(): boolean {
  return typeof window.matchMedia === "function"
    && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** The feedback state to show for a step's status, or null before the first submission; holds "checking" for MIN_CHECKING_MS unless motion is reduced. */
export function useFeedbackState(status: SubmissionStatus): FeedbackState | null {
  const target = FEEDBACK_FOR_STATUS[status];
  const [shown, setShown] = useState(target);
  const checkingSince = useRef<number | null>(target === "checking" ? Date.now() : null);

  useEffect(() => {
    if (target === "checking") {
      checkingSince.current = Date.now();
      setShown(target);
      return;
    }
    const since = checkingSince.current;
    checkingSince.current = null;
    const remaining = since === null || prefersReducedMotion()
      ? 0
      : MIN_CHECKING_MS - (Date.now() - since);
    if (remaining <= 0) {
      setShown(target);
      return;
    }
    const timer = setTimeout(() => setShown(target), remaining);
    return () => clearTimeout(timer);
  }, [target]);

  return shown;
}
