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
) => AnswerCheck | PromiseLike<AnswerCheck>;

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

  // Checks in flight, keyed by step index; one per step, so a double submit can't run the checker twice.
  const pending = useRef(new Map<number, () => void>());
  useEffect(() => {
    const inFlight = pending.current;
    return () => {
      inFlight.forEach((cancel) => cancel());
      inFlight.clear();
    };
  }, [lesson.slug]);

  const stepsRef = useRef(state.steps);
  stepsRef.current = state.steps;

  const submit = useCallback(
    (index: number, submission: unknown) => {
      const step = lesson.steps[index];
      if (step?.type !== "answer") return;
      // Re-checking a passed step can't change it, and a second submit mid-check would race the first.
      if (stepsRef.current[index]?.status === "passed" || pending.current.has(index)) return;

      const slug = lesson.slug;
      let cancelled = false;
      const land = ({ passed, reason_code }: AnswerCheck) => {
        if (cancelled) return;
        pending.current.delete(index);
        dispatch({ type: "checked", slug, index, passed, reason_code });
      };
      // A throwing or rejecting checker is a fail, never a step stuck on "checking".
      const fail = () => land({ passed: false });

      dispatch({ type: "checking", slug, index });
      const cancelPaint = afterPaint(() => {
        let outcome: AnswerCheck | PromiseLike<AnswerCheck>;
        try {
          outcome = checker(slug, index, submission);
        } catch {
          fail();
          return;
        }
        // Sync results land in this tick; async ones (MB-57) stay pending until they settle.
        if (isPromiseLike(outcome)) outcome.then(land, fail);
        else land(outcome);
      });
      pending.current.set(index, () => {
        cancelled = true;
        cancelPaint();
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
