import { useCallback, useEffect, useMemo, useReducer, useRef } from "react";
import { checkAnswer } from "./index";
import type { AnswerCheck, PageLesson } from "./types";

export const SUBMISSION_STATUSES = ["untried", "checking", "passed", "not_yet"] as const;
export type SubmissionStatus = (typeof SUBMISSION_STATUSES)[number];

/** Checks by lesson slug and step index, sync or async; a test fake can be as small as `() => ({ passed: true })`. */
export type StepChecker = (
  lessonSlug: string,
  stepIndex: number,
  submission: unknown,
) => CheckOutcome | PromiseLike<CheckOutcome>;

/** `undefined` means the checker had no result, as `checkAnswer` does for an unknown lesson or step. */
type CheckOutcome = AnswerCheck | undefined;

interface InFlightCheck {
  slug: string;
  cancel: () => void;
}

/** What the UI sees for one step: its status and, after a failed check, the reason code. Never the criterion. */
export interface StepState {
  status: SubmissionStatus;
  reason_code?: string;
}

interface LessonState {
  /** Which lesson this progress belongs to; compared by slug so a rebuilt lesson object keeps its progress. */
  slug: string;
  currentStep: number;
  steps: StepState[];
}

type LessonAction =
  | { type: "goTo"; index: number }
  | { type: "checking"; slug: string; index: number }
  | { type: "checked"; slug: string; index: number; passed: boolean; reason_code?: string }
  | { type: "reset"; lesson: PageLesson };

function initialState(lesson: PageLesson): LessonState {
  return {
    slug: lesson.slug,
    currentStep: 0,
    steps: lesson.steps.map(() => ({ status: "untried" })),
  };
}

function reducer(state: LessonState, action: LessonAction): LessonState {
  switch (action.type) {
    case "goTo": {
      if (state.steps.length === 0) return state;
      const index = Math.min(Math.max(action.index, 0), state.steps.length - 1);
      return index === state.currentStep ? state : { ...state, currentStep: index };
    }
    case "checking":
    case "checked": {
      // A result for another lesson is stale and never lands.
      if (action.slug !== state.slug) return state;
      const prev = state.steps[action.index];
      if (!prev) return state;
      // A check starts only from untried or not_yet, so a passed step stays passed and lessonPassed never flips back.
      if (action.type === "checking" && (prev.status === "passed" || prev.status === "checking")) {
        return state;
      }
      // A result lands only on the check that asked for it.
      if (action.type === "checked" && prev.status !== "checking") return state;
      const next: StepState =
        action.type === "checking"
          ? { status: "checking" }
          : action.passed
            ? { status: "passed" }
            : { status: "not_yet", reason_code: action.reason_code };
      const steps = state.steps.slice();
      steps[action.index] = next;
      return { ...state, steps };
    }
    case "reset":
      return initialState(action.lesson);
  }
}

/** Runs `run` after the next paint, so "checking" reaches the screen before a slow check blocks. Returns a cancel. */
function afterPaint(run: () => void): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const frame = requestAnimationFrame(() => {
    timer = setTimeout(run, 0);
  });
  return () => {
    cancelAnimationFrame(frame);
    if (timer !== undefined) clearTimeout(timer);
  };
}

function isPromiseLike<T>(value: T | PromiseLike<T>): value is PromiseLike<T> {
  return typeof (value as PromiseLike<T> | null)?.then === "function";
}

export interface UseLessonResult {
  currentStep: number;
  goToStep: (index: number) => void;
  next: () => void;
  previous: () => void;
  steps: StepState[];
  /** Submits an answer for an answer step; ignored for explain steps, steps already checking, and steps already passed. */
  submit: (index: number, submission: unknown) => void;
  /** True only when every answer step has passed. A lesson with no answer steps is never passed. */
  lessonPassed: boolean;
}

/** The one place that decides whether a lesson is passed: every answer step's criteria all pass, and nothing else marks it complete. */
export function useLesson(lesson: PageLesson, checker: StepChecker = checkAnswer): UseLessonResult {
  const [stored, dispatch] = useReducer(reducer, lesson, initialState);

  // A different lesson starts from scratch in this same render, so it never shows the old lesson's progress.
  const isStale = stored.slug !== lesson.slug;
  const state = isStale ? initialState(lesson) : stored;
  if (isStale) dispatch({ type: "reset", lesson });

  // Checks in flight, keyed by lesson and step; one per step, so a double submit can't run the checker twice.
  const pending = useRef(new Map<string, InFlightCheck>());
  useEffect(() => {
    const inFlight = pending.current;
    const slug = lesson.slug;
    // Cancels only this lesson's checks: this cleanup can run after the next lesson has already started one.
    return () => {
      inFlight.forEach((check, key) => {
        if (check.slug !== slug) return;
        check.cancel();
        inFlight.delete(key);
      });
    };
  }, [lesson.slug]);

  const stepsRef = useRef(state.steps);
  stepsRef.current = state.steps;

  const submit = useCallback(
    (index: number, submission: unknown) => {
      const step = lesson.steps[index];
      if (step?.type !== "answer") return;
      // Re-checking a passed step can't change it, and a second submit mid-check would race the first.
      const slug = lesson.slug;
      const key = `${slug}:${index}`;
      if (stepsRef.current[index]?.status === "passed" || pending.current.has(key)) return;

      let cancelled = false;
      // Never throws, so neither path below can leave an unhandled error or a step stuck on "checking".
      const land = (outcome: CheckOutcome, error?: unknown) => {
        if (cancelled) return;
        pending.current.delete(key);
        if (!outcome || typeof outcome.passed !== "boolean") {
          // A throw, a rejection or no result is a checker bug, not a wrong answer: log it, show a fail.
          console.error(`useLesson: no check result for lesson "${slug}" step ${index}`, error);
          dispatch({ type: "checked", slug, index, passed: false });
          return;
        }
        dispatch({ type: "checked", slug, index, passed: outcome.passed, reason_code: outcome.reason_code });
      };

      dispatch({ type: "checking", slug, index });
      const cancelPaint = afterPaint(() => {
        let outcome: CheckOutcome | PromiseLike<CheckOutcome>;
        try {
          outcome = checker(slug, index, submission);
        } catch (error) {
          land(undefined, error);
          return;
        }
        // Sync results land in this tick; async ones (MB-57) stay pending until they settle.
        if (isPromiseLike(outcome)) outcome.then((result) => land(result), (error) => land(undefined, error));
        else land(outcome);
      });
      pending.current.set(key, {
        slug,
        cancel: () => {
          cancelled = true;
          cancelPaint();
        },
      });
    },
    [lesson, checker],
  );

  const goToStep = useCallback((index: number) => dispatch({ type: "goTo", index }), []);
  const next = useCallback(
    () => dispatch({ type: "goTo", index: state.currentStep + 1 }),
    [state.currentStep],
  );
  const previous = useCallback(
    () => dispatch({ type: "goTo", index: state.currentStep - 1 }),
    [state.currentStep],
  );

  const lessonPassed = useMemo(() => {
    const answerIndexes = lesson.steps.flatMap((step, i) => (step.type === "answer" ? [i] : []));
    return (
      answerIndexes.length > 0 &&
      answerIndexes.every((i) => state.steps[i]?.status === "passed")
    );
  }, [lesson, state.steps]);

  return {
    currentStep: state.currentStep,
    goToStep,
    next,
    previous,
    steps: state.steps,
    submit,
    lessonPassed,
  };
}
