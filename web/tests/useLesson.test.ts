import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useLesson } from "../src/content/useLesson";
import type { StepChecker } from "../src/content/useLesson";
import { getLesson, makeLesson } from "../src/content";
import type { AnswerCheck, Lesson, PageLesson } from "../src/content/types";

// Two answer steps around an explain step, so "every answer step" means more than one.
const twoAnswerLesson: Lesson = makeLesson({
  steps: [
    { type: "explain", content: "Read this." },
    {
      type: "answer",
      prompt: "What is $1 + 1$?",
      criteria: [{ check: "equals", expected: 2, reason_code: "wrong_sum" }],
    },
    {
      type: "answer",
      prompt: "What is $2 + 2$?",
      criteria: [{ check: "equals", expected: 4, reason_code: "wrong_sum" }],
    },
  ],
});

// Passes when the submission is "right", fails with a fixed reason code otherwise.
const fakeChecker: StepChecker = (_slug, _index, submission) =>
  submission === "right" ? { passed: true } : { passed: false, reason_code: "nope" };

function setup(lesson: PageLesson = twoAnswerLesson, checker: StepChecker = fakeChecker) {
  return renderHook(({ l, c }) => useLesson(l, c), { initialProps: { l: lesson, c: checker } });
}

// The fixture tutorial as a page sees it: an explain step, then "What is $3 + 4$?" with no criteria attached.
const realLesson = getLesson("adding-two-numbers")!;

// A checker whose result the test settles by hand, standing in for the async checker MB-57 brings.
function deferredChecker() {
  const calls: { resolve: (r: AnswerCheck) => void; reject: (e: unknown) => void }[] = [];
  const checker = vi.fn<StepChecker>(
    () => new Promise<AnswerCheck>((resolve, reject) => calls.push({ resolve, reject })),
  );
  return { checker, calls };
}

function submitAndFlush(
  result: { current: ReturnType<typeof useLesson> },
  index: number,
  submission: unknown,
) {
  act(() => result.current.submit(index, submission));
  act(() => vi.runAllTimers());
}

describe("useLesson", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("starts on the first step with every step untried and the lesson not passed", () => {
    const { result } = setup();
    expect(result.current.currentStep).toBe(0);
    expect(result.current.steps.map((s) => s.status)).toEqual(["untried", "untried", "untried"]);
    expect(result.current.lessonPassed).toBe(false);
  });

  it("passes the lesson once every answer step has passed", () => {
    const { result } = setup();
    submitAndFlush(result, 1, "right");
    submitAndFlush(result, 2, "right");
    expect(result.current.steps[1].status).toBe("passed");
    expect(result.current.steps[2].status).toBe("passed");
    expect(result.current.lessonPassed).toBe(true);
  });

  it("does not pass the lesson when only some answer steps have passed", () => {
    const { result } = setup();
    submitAndFlush(result, 1, "right");
    submitAndFlush(result, 2, "wrong");
    expect(result.current.steps[1].status).toBe("passed");
    expect(result.current.steps[2]).toEqual({ status: "not_yet", reason_code: "nope" });
    expect(result.current.lessonPassed).toBe(false);
  });

  it("re-checks a failed step when it is submitted again", () => {
    const checker = vi.fn(fakeChecker);
    const { result } = setup(twoAnswerLesson, checker);
    submitAndFlush(result, 1, "wrong");
    expect(result.current.steps[1].status).toBe("not_yet");

    submitAndFlush(result, 1, "right");
    expect(checker).toHaveBeenCalledTimes(2);
    expect(result.current.steps[1]).toEqual({ status: "passed" });
  });

  it("keeps a passed step passed when it is submitted again", () => {
    const { result } = setup();
    submitAndFlush(result, 1, "right");
    submitAndFlush(result, 1, "wrong");
    expect(result.current.steps[1]).toEqual({ status: "passed" });
  });

  it("shows a checking state before the result lands", () => {
    const { result } = setup();
    act(() => result.current.submit(1, "right"));
    expect(result.current.steps[1].status).toBe("checking");
    act(() => vi.runAllTimers());
    expect(result.current.steps[1].status).toBe("passed");
  });

  it("ignores a second submit while the step is still checking", () => {
    const checker = vi.fn(fakeChecker);
    const { result } = setup(twoAnswerLesson, checker);
    act(() => result.current.submit(1, "wrong"));
    act(() => result.current.submit(1, "right"));
    act(() => vi.runAllTimers());
    expect(checker).toHaveBeenCalledTimes(1);
    expect(result.current.steps[1].status).toBe("not_yet");
  });

  it("flips lessonPassed exactly once, even across re-submits", () => {
    const { result } = setup();
    const history: boolean[] = [];
    const record = () => history.push(result.current.lessonPassed);

    record();
    submitAndFlush(result, 1, "wrong");
    record();
    submitAndFlush(result, 1, "right");
    record();
    submitAndFlush(result, 2, "right");
    record();
    // Re-submitting passed steps, right or wrong, must not flip it back.
    act(() => result.current.submit(1, "wrong"));
    record();
    act(() => vi.runAllTimers());
    record();
    submitAndFlush(result, 2, "right");
    record();

    const flips = history.filter((v, i) => i > 0 && v !== history[i - 1]).length;
    expect(flips).toBe(1);
    expect(history.at(-1)).toBe(true);
  });

  it("never passes a lesson with no answer steps", () => {
    const explainOnly = makeLesson({
      steps: [
        { type: "explain", content: "One." },
        { type: "explain", content: "Two." },
      ],
    });
    const { result } = setup(explainOnly);
    submitAndFlush(result, 0, "right");
    submitAndFlush(result, 1, "right");
    expect(result.current.lessonPassed).toBe(false);
  });

  it("ignores submissions to explain steps and out-of-range indexes", () => {
    const checker = vi.fn(fakeChecker);
    const { result } = setup(twoAnswerLesson, checker);
    submitAndFlush(result, 0, "right");
    submitAndFlush(result, 99, "right");
    expect(checker).not.toHaveBeenCalled();
    expect(result.current.steps[0].status).toBe("untried");
  });

  it("exposes the reason_code but never the criterion", () => {
    const { result } = renderHook(() => useLesson(realLesson));
    submitAndFlush(result, 1, "3");
    expect(result.current.steps[1]).toEqual({ status: "not_yet", reason_code: "wrong_total" });
    const exposed = JSON.stringify(result.current);
    expect(exposed).not.toContain("expected");
    expect(exposed).not.toContain("criteria");
  });

  it("hands the checker the lesson slug and step index, not the step", () => {
    const checker = vi.fn(fakeChecker);
    const { result } = setup(twoAnswerLesson, checker);
    submitAndFlush(result, 2, "right");
    expect(checker).toHaveBeenCalledWith(twoAnswerLesson.slug, 2, "right");
  });

  it("treats a throwing checker as a fail rather than leaving the step checking", () => {
    const { result } = setup(twoAnswerLesson, () => {
      throw new Error("boom");
    });
    submitAndFlush(result, 1, "right");
    expect(result.current.steps[1].status).toBe("not_yet");
  });

  it("defaults to the real checker, working from a page lesson with no criteria", () => {
    const { result } = renderHook(() => useLesson(realLesson));
    submitAndFlush(result, 1, "3");
    expect(result.current.steps[1]).toEqual({ status: "not_yet", reason_code: "wrong_total" });
    submitAndFlush(result, 1, "7");
    expect(result.current.lessonPassed).toBe(true);
  });

  it("moves between steps and clamps at both ends", () => {
    const { result } = setup();
    act(() => result.current.previous());
    expect(result.current.currentStep).toBe(0);
    act(() => result.current.next());
    act(() => result.current.next());
    act(() => result.current.next());
    expect(result.current.currentStep).toBe(2);
    act(() => result.current.goToStep(1));
    expect(result.current.currentStep).toBe(1);
  });

  it("starts fresh when given a different lesson", () => {
    const { result, rerender } = setup();
    submitAndFlush(result, 1, "right");
    submitAndFlush(result, 2, "right");
    expect(result.current.lessonPassed).toBe(true);

    rerender({ l: makeLesson({ slug: "another-lesson" }), c: fakeChecker });
    expect(result.current.lessonPassed).toBe(false);
    expect(result.current.steps.map((s) => s.status)).toEqual(["untried", "untried"]);
  });

  it("never renders the old lesson's progress for a new lesson, even for one render", () => {
    const seen: boolean[] = [];
    const { result, rerender } = renderHook(
      ({ l }) => {
        const lesson = useLesson(l, fakeChecker);
        seen.push(lesson.lessonPassed);
        return lesson;
      },
      { initialProps: { l: twoAnswerLesson } },
    );
    submitAndFlush(result, 1, "right");
    submitAndFlush(result, 2, "right");
    expect(result.current.lessonPassed).toBe(true);

    seen.length = 0;
    rerender({ l: { ...twoAnswerLesson, slug: "another-lesson" } });
    expect(seen).not.toContain(true);
  });

  it("keeps progress when handed a rebuilt copy of the same lesson every render", () => {
    let renders = 0;
    const { result } = renderHook(() => {
      renders += 1;
      return useLesson({ ...twoAnswerLesson }, fakeChecker);
    });
    submitAndFlush(result, 1, "right");
    expect(result.current.steps[1].status).toBe("passed");
    expect(renders).toBeLessThan(10);
  });

  it("drops a check still in flight when the lesson changes", () => {
    const checker = vi.fn(fakeChecker);
    const { result, rerender } = setup(twoAnswerLesson, checker);
    act(() => result.current.submit(1, "right"));
    rerender({ l: { ...twoAnswerLesson, slug: "another-lesson" }, c: checker });
    act(() => vi.runAllTimers());
    expect(checker).not.toHaveBeenCalled();
    expect(result.current.steps[1].status).toBe("untried");
  });

  it("runs the checker once for two submits in the same event", () => {
    const checker = vi.fn(fakeChecker);
    const { result } = setup(twoAnswerLesson, checker);
    act(() => {
      result.current.submit(1, "wrong");
      result.current.submit(1, "right");
    });
    act(() => vi.runAllTimers());
    expect(checker).toHaveBeenCalledTimes(1);
    expect(result.current.steps[1].status).toBe("not_yet");
  });

  it("keeps currentStep at 0 for a lesson with no steps", () => {
    const { result } = setup(makeLesson({ steps: [] }));
    act(() => result.current.next());
    act(() => result.current.previous());
    expect(result.current.currentStep).toBe(0);
  });

  it("waits for a paint before running the checker", () => {
    const checker = vi.fn(fakeChecker);
    const { result } = setup(twoAnswerLesson, checker);
    act(() => result.current.submit(1, "right"));
    act(() => vi.advanceTimersToNextTimer());
    expect(checker).not.toHaveBeenCalled();
    act(() => vi.runAllTimers());
    expect(checker).toHaveBeenCalledTimes(1);
  });

  describe("with an async checker", () => {
    it("stays checking until the result settles, then lands it", async () => {
      const { checker, calls } = deferredChecker();
      const { result } = setup(twoAnswerLesson, checker);
      submitAndFlush(result, 1, "right");
      expect(result.current.steps[1].status).toBe("checking");

      await act(async () => calls[0].resolve({ passed: false, reason_code: "nope" }));
      expect(result.current.steps[1]).toEqual({ status: "not_yet", reason_code: "nope" });
    });

    it("passes the lesson from async results", async () => {
      const { checker, calls } = deferredChecker();
      const { result } = setup(twoAnswerLesson, checker);
      submitAndFlush(result, 1, "right");
      submitAndFlush(result, 2, "right");
      await act(async () => calls.forEach((c) => c.resolve({ passed: true })));
      expect(result.current.lessonPassed).toBe(true);
    });

    it("treats a rejected check as a fail", async () => {
      const { checker, calls } = deferredChecker();
      const { result } = setup(twoAnswerLesson, checker);
      submitAndFlush(result, 1, "right");
      await act(async () => calls[0].reject(new Error("mathjs failed to load")));
      expect(result.current.steps[1].status).toBe("not_yet");
    });

    it("ignores a re-submit while an async check is still pending", async () => {
      const { checker, calls } = deferredChecker();
      const { result } = setup(twoAnswerLesson, checker);
      submitAndFlush(result, 1, "wrong");
      submitAndFlush(result, 1, "right");
      expect(checker).toHaveBeenCalledTimes(1);

      await act(async () => calls[0].resolve({ passed: false, reason_code: "nope" }));
      submitAndFlush(result, 1, "right");
      expect(checker).toHaveBeenCalledTimes(2);
    });

    it("drops an async result that settles after the lesson changed", async () => {
      const { checker, calls } = deferredChecker();
      const { result, rerender } = setup(twoAnswerLesson, checker);
      submitAndFlush(result, 1, "right");
      rerender({ l: { ...twoAnswerLesson, slug: "another-lesson" }, c: checker });

      await act(async () => calls[0].resolve({ passed: true }));
      expect(result.current.steps[1].status).toBe("untried");
      expect(result.current.lessonPassed).toBe(false);
    });
  });
});
