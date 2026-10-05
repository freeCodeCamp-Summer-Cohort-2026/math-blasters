import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LessonStepper } from "../src/components/LessonStepper/LessonStepper";
import { feedbackContent } from "../src/components/Feedback/content";
import { checkStep } from "../src/content/check";
import type { StepChecker } from "../src/content";
import { REASON_SENTENCES } from "../src/content/reasons";
import type { Lesson, PageLesson } from "../src/content/types";
import { expectNoA11yViolations } from "./helpers/a11y";

const mockLesson: PageLesson = {
  slug: "addition-basics",
  title: "Addition Basics",
  type: "tutorial",
  steps: [
    { type: "explain", content: "Introduction to adding" },
    { type: "answer", prompt: "Calculate 1 + 1" },
    { type: "explain", content: "Great job completing the lesson!" },
  ],
};

// The step's own live region; the completion moment's region follows it in the DOM.
const stepStatus = () => screen.getAllByRole("status")[0];

describe("LessonStepper Component", () => {
  it("renders the first step initially with Back disabled and Next enabled", () => {
    render(<LessonStepper lesson={mockLesson} />);

    expect(screen.getByRole("heading", { name: /step 1 of 3/i })).toBeInTheDocument();
    expect(screen.getByText("Introduction to adding")).toBeInTheDocument();

    const progressBar = screen.getByRole("progressbar");
    expect(progressBar).toHaveAttribute("aria-valuenow", "1");
    expect(progressBar).toHaveAttribute("aria-valuemin", "0");
    expect(progressBar).toHaveAttribute("aria-valuemax", "3");
    expect(progressBar).toHaveAttribute("aria-valuetext", "Step 1 of 3");

    const backBtn = screen.getByRole("button", { name: /back/i });
    const nextBtn = screen.getByRole("button", { name: /next/i });
    expect(backBtn).toBeDisabled();
    expect(nextBtn).toBeEnabled();
  });

  it("advances to the next step when Next is clicked and moves focus to step heading", async () => {
    const user = userEvent.setup();
    render(<LessonStepper lesson={mockLesson} />);

    const nextBtn = screen.getByRole("button", { name: /next/i });
    await user.click(nextBtn);

    expect(screen.getByRole("heading", { name: /step 2 of 3/i })).toBeInTheDocument();
    expect(screen.getByText("Calculate 1 + 1")).toBeInTheDocument();

    const progressBar = screen.getByRole("progressbar");
    expect(progressBar).toHaveAttribute("aria-valuenow", "2");

    const stepHeading = screen.getByRole("heading", { name: /step 2 of 3/i });
    expect(stepHeading).toHaveFocus();

    const backBtn = screen.getByRole("button", { name: /back/i });
    expect(backBtn).toBeEnabled();
    // Step 2 is an unsolved answer step, so Next is gated with the reason
    expect(nextBtn).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByText("An answer is needed first")).toBeInTheDocument();
    expect(nextBtn).toHaveAttribute("aria-label", "Next: An answer is needed first");
  });

  it("disables Next on the final step and allows stepping back", async () => {
    const user = userEvent.setup();
    render(
      <LessonStepper
        lesson={{
          ...mockLesson,
          steps: mockLesson.steps.map(() => ({ type: "explain", content: "" })),
        }}
      />,
    );

    const nextBtn = screen.getByRole("button", { name: /next/i });
    await user.click(nextBtn); // Step 2
    await user.click(nextBtn); // Step 3 (final)

    expect(screen.getByRole("heading", { name: /step 3 of 3/i })).toBeInTheDocument();
    expect(nextBtn).toBeDisabled();

    const backBtn = screen.getByRole("button", { name: /back/i });
    expect(backBtn).toBeEnabled();

    await user.click(backBtn); // Step 2
    expect(screen.getByRole("heading", { name: /step 2 of 3/i })).toBeInTheDocument();
    expect(nextBtn).toBeEnabled();
  });

  it("announces a step change by moving focus, without a duplicate live region", async () => {
    const user = userEvent.setup();
    render(<LessonStepper lesson={mockLesson} />);

    // Focus is not stolen on first paint.
    expect(screen.getByRole("heading", { name: /step 1 of 3/i })).not.toHaveFocus();
    for (const region of screen.getAllByRole("status")) expect(region).toBeEmptyDOMElement();

    await user.click(screen.getByRole("button", { name: /next/i }));

    // The focused heading is what a screen reader announces, and it is
    // announced once because nothing else repeats its text. The answer
    // step's feedback region stays silent until something is submitted.
    expect(screen.getByRole("heading", { name: /step 2 of 3/i })).toHaveFocus();
    for (const region of screen.getAllByRole("status")) expect(region).toBeEmptyDOMElement();
  });

  it("sits the step heading below the lesson title in the heading order", () => {
    render(<LessonStepper lesson={mockLesson} />);

    // Card renders the lesson title as an h2, so the step heading is an h3.
    expect(screen.getByRole("heading", { level: 3, name: /step 1 of 3/i })).toBeInTheDocument();
  });

  it("drops to an h2 when the caller's title is an h1", () => {
    render(<LessonStepper lesson={mockLesson} headingLevel="h2" />);

    expect(screen.getByRole("heading", { level: 2, name: /step 1 of 3/i })).toBeInTheDocument();
  });

  it("can be driven through a whole lesson with the keyboard alone", async () => {
    const user = userEvent.setup();
    render(<LessonStepper lesson={mockLesson} checker={() => ({ passed: true })} />);

    // Back is disabled on step 1, so the first tab stop is Next.
    await user.tab();
    expect(screen.getByRole("button", { name: /next/i })).toHaveFocus();

    await user.keyboard("{Enter}");
    expect(screen.getByRole("heading", { name: /step 2 of 3/i })).toHaveFocus();

    // Step 2 is an answer step: answer and submit to unlock Next
    await user.tab();
    expect(screen.getByRole("spinbutton", { name: /your answer/i })).toHaveFocus();
    await user.keyboard("2");

    await user.tab();
    expect(screen.getByRole("button", { name: /submit/i })).toHaveFocus();
    await user.keyboard("{Enter}");

    // Wait for step to pass and Next to enable
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /^next$/i })).toBeEnabled();
    });

    await user.tab();
    expect(screen.getByRole("button", { name: /back/i })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole("button", { name: /^next$/i })).toHaveFocus();

    await user.keyboard("{Enter}");
    expect(screen.getByRole("heading", { name: /step 3 of 3/i })).toHaveFocus();
    expect(screen.getByRole("button", { name: /next/i })).toBeDisabled();
  });

  it("keeps a revisited not-yet answer step open to retry, with an empty input", async () => {
    const user = userEvent.setup();
    render(<LessonStepper lesson={mockLesson} checker={() => ({ passed: false })} />);

    await user.click(screen.getByRole("button", { name: /next/i })); // step 2, answer

    await user.type(screen.getByRole("spinbutton", { name: /your answer/i }), "2");
    await user.click(screen.getByRole("button", { name: /submit/i }));
    // Submitting must not leave the step stuck: it recovers once the check settles.
    await waitFor(() => expect(screen.getByRole("spinbutton", { name: /your answer/i })).toBeEnabled());

    // Back is always available: return to step 1 explanation, then step back to step 2
    await user.click(screen.getByRole("button", { name: /back/i })); // back to step 1 (explain)
    expect(screen.getByRole("heading", { name: /step 1 of 3/i })).toHaveFocus();

    await user.click(screen.getByRole("button", { name: /next/i })); // step 2 again
    expect(screen.getByRole("heading", { name: /step 2 of 3/i })).toHaveFocus();

    const revisitedInput = screen.getByRole("spinbutton", { name: /your answer/i });
    expect(revisitedInput).toBeEnabled();
    expect(revisitedInput).toHaveValue(null);
    expect(screen.getByRole("button", { name: /submit/i })).toBeEnabled();
  });

  describe("gating advancing past unsolved answer steps (Issue #98)", () => {
    it("blocks Next on an unsolved answer step and displays 'An answer is needed first' visibly and in accessible name", async () => {
      const user = userEvent.setup();
      render(<LessonStepper lesson={mockLesson} />);

      await user.click(screen.getByRole("button", { name: /next/i })); // go to step 2 (answer)

      const nextBtn = screen.getByRole("button", { name: /an answer is needed first/i });
      expect(nextBtn).toHaveAttribute("aria-disabled", "true");
      expect(screen.getByText("An answer is needed first")).toBeInTheDocument();
      expect(nextBtn).toHaveAttribute("aria-label", "Next: An answer is needed first");

      // Neither a click nor Enter moves past the unsolved step.
      await user.click(nextBtn);
      nextBtn.focus();
      await user.keyboard("{Enter}");
      expect(screen.getByRole("heading", { name: /step 2 of 3/i })).toBeInTheDocument();
    });

    it("keeps the gated Next reachable by keyboard so its reason can be heard", async () => {
      const user = userEvent.setup();
      render(<LessonStepper lesson={mockLesson} />);

      await user.click(screen.getByRole("button", { name: /next/i })); // step 2 (answer)

      await user.tab(); // answer input
      await user.tab(); // submit
      await user.tab(); // back
      await user.tab();
      expect(screen.getByRole("button", { name: "Next: An answer is needed first" })).toHaveFocus();
    });

    it("hides the visible reason from assistive tech so it isn't read twice", async () => {
      const user = userEvent.setup();
      render(<LessonStepper lesson={mockLesson} />);

      await user.click(screen.getByRole("button", { name: /next/i })); // step 2 (answer)

      expect(screen.getByText("An answer is needed first")).toHaveAttribute("aria-hidden", "true");
    });

    it("unblocks Next once the answer step passes", async () => {
      const user = userEvent.setup();
      render(<LessonStepper lesson={mockLesson} checker={() => ({ passed: true })} />);

      await user.click(screen.getByRole("button", { name: /next/i })); // go to step 2 (answer)

      const nextBtn = screen.getByRole("button", { name: /next/i });
      expect(nextBtn).toHaveAttribute("aria-disabled", "true");
      expect(screen.getByText("An answer is needed first")).toBeInTheDocument();

      await user.type(screen.getByRole("spinbutton", { name: /your answer/i }), "2");
      await user.click(screen.getByRole("button", { name: /submit/i }));

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /^next$/i })).toBeEnabled();
      });
      expect(screen.queryByText("An answer is needed first")).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: /^next$/i })).not.toHaveAttribute("aria-label");
      expect(screen.getByRole("button", { name: /^next$/i })).not.toHaveAttribute("aria-disabled");

      // Verify it can advance to step 3 now
      await user.click(screen.getByRole("button", { name: /^next$/i }));
      expect(screen.getByRole("heading", { name: /step 3 of 3/i })).toBeInTheDocument();
    });

    it("leaves Next unaffected on an explain step", () => {
      render(<LessonStepper lesson={mockLesson} />);

      // Step 1 is an explain step
      const nextBtn = screen.getByRole("button", { name: /^next$/i });
      expect(nextBtn).toBeEnabled();
      expect(screen.queryByText("An answer is needed first")).not.toBeInTheDocument();
      expect(nextBtn).not.toHaveAttribute("aria-label");
    });

    it("never gates the Back button on an unsolved answer step", async () => {
      const user = userEvent.setup();
      render(<LessonStepper lesson={mockLesson} />);

      await user.click(screen.getByRole("button", { name: /next/i })); // step 2 (answer)

      const backBtn = screen.getByRole("button", { name: /back/i });
      expect(backBtn).toBeEnabled();

      await user.click(backBtn);
      expect(screen.getByRole("heading", { name: /step 1 of 3/i })).toBeInTheDocument();
    });

    it("applies the exact same gating rule to a lab", async () => {
      const user = userEvent.setup();
      const mockLab: PageLesson = { ...mockLesson, type: "lab" };

      render(<LessonStepper lesson={mockLab} headingLevel="h2" />);

      await user.click(screen.getByRole("button", { name: /next/i })); // Step 2 (answer)

      const nextBtn = screen.getByRole("button", { name: /an answer is needed first/i });
      expect(nextBtn).toHaveAttribute("aria-disabled", "true");
      expect(screen.getByText("An answer is needed first")).toBeInTheDocument();
      expect(nextBtn).toHaveAttribute("aria-label", "Next: An answer is needed first");

      const backBtn = screen.getByRole("button", { name: /back/i });
      expect(backBtn).toBeEnabled();
    });

    it("does not show the gate reason on the final step", () => {
      const singleStepLesson: PageLesson = {
        slug: "single-step",
        title: "Single Step",
        type: "tutorial",
        steps: [{ type: "answer", prompt: "Sole question" }],
      };

      render(<LessonStepper lesson={singleStepLesson} />);

      const nextBtn = screen.getByRole("button", { name: /^next$/i });
      expect(nextBtn).toBeDisabled();
      expect(screen.queryByText("An answer is needed first")).not.toBeInTheDocument();
      expect(nextBtn).not.toHaveAttribute("aria-label");
    });
  });

  it("renders Back as a link to backHref on the first step instead of a disabled button", () => {
    render(
      <MemoryRouter>
        <LessonStepper lesson={mockLesson} backHref="/modules/arithmetic-addition" />
      </MemoryRouter>,
    );

    expect(screen.queryByRole("button", { name: /back/i })).not.toBeInTheDocument();

    const backLink = screen.getByRole("link", { name: /back/i });
    expect(backLink).toHaveAttribute("href", "/modules/arithmetic-addition");
  });

  it("reverts Back to the normal step-back button once past the first step, even with backHref set", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <LessonStepper lesson={mockLesson} backHref="/modules/arithmetic-addition" />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole("button", { name: /next/i })); // step 2

    expect(screen.queryByRole("link", { name: /back/i })).not.toBeInTheDocument();
    const backBtn = screen.getByRole("button", { name: /back/i });
    expect(backBtn).toBeEnabled();

    await user.click(backBtn); // back to step 1
    expect(screen.getByRole("heading", { name: /step 1 of 3/i })).toHaveFocus();
    expect(screen.getByRole("link", { name: /back/i })).toHaveAttribute(
      "href",
      "/modules/arithmetic-addition",
    );
  });

  it("keeps Back a disabled button on the first step when no backHref is given", () => {
    render(<LessonStepper lesson={mockLesson} />);

    expect(screen.queryByRole("link", { name: /back/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /back/i })).toBeDisabled();
  });

  describe("feedback", () => {
    afterEach(() => vi.restoreAllMocks());

    // A distinctive expected value, so finding it anywhere in the DOM is unambiguous.
    const EXPECTED = 48173;
    const gradedLesson: Lesson = {
      slug: "graded-lesson",
      title: "Graded Lesson",
      type: "tutorial",
      steps: [
        {
          type: "answer",
          prompt: "How many marbles are there?",
          criteria: [{ check: "equals", expected: EXPECTED, reason_code: "wrong_total" }],
        },
        { type: "explain", content: "Well done." },
      ],
    };
    // The real checker over this lesson's criteria, as checkAnswer does for a bundled lesson.
    const realChecker: StepChecker = (_slug, index, submission) =>
      checkStep(gradedLesson.steps[index], submission);

    async function submit(answer: string) {
      const user = userEvent.setup();
      await user.type(screen.getByRole("spinbutton", { name: /your answer/i }), answer);
      await user.click(screen.getByRole("button", { name: /submit/i }));
    }

    it("explains a wrong answer without the expected value appearing anywhere in the DOM", async () => {
      render(<LessonStepper lesson={gradedLesson} checker={realChecker} />);

      await submit("12");

      const region = await screen.findByRole("region", { name: "not-yet feedback" });
      expect(region).toHaveTextContent("You entered 12");
      expect(region).toHaveTextContent(REASON_SENTENCES.wrong_total);
      expect(stepStatus()).toHaveTextContent(REASON_SENTENCES.wrong_total);
      expect(document.documentElement.outerHTML).not.toContain(String(EXPECTED));
    });

    it("shows the correct state and unlocks Next for a right answer", async () => {
      render(<LessonStepper lesson={gradedLesson} checker={realChecker} />);

      await submit(String(EXPECTED));

      expect(await screen.findByRole("region", { name: "correct feedback" })).toBeInTheDocument();
      expect(stepStatus()).toHaveTextContent(feedbackContent.correct.announcement);
      expect(screen.getByRole("button", { name: /next/i })).not.toHaveAttribute("aria-disabled");
    });

    it("keeps Next gated while checking is still held on screen after a right answer", async () => {
      const checker = vi.fn(realChecker);
      render(<LessonStepper lesson={gradedLesson} checker={checker} />);

      await submit(String(EXPECTED));

      // The answer has passed, but "checking" is still held on screen.
      await waitFor(() => expect(checker.mock.results[0]?.value).toMatchObject({ passed: true }));
      expect(screen.getByRole("region", { name: "checking feedback" })).toBeInTheDocument();
      const next = screen.getByRole("button", { name: /next/i });
      expect(next).toHaveAttribute("aria-disabled", "true");
      await userEvent.setup().click(next);
      expect(screen.getByRole("heading", { name: /step 1 of 2/i })).toBeInTheDocument();

      expect(await screen.findByRole("region", { name: "correct feedback" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /next/i })).not.toHaveAttribute("aria-disabled");
    });

    it("shows the error state when the checker breaks, and keeps Next gated", async () => {
      vi.spyOn(console, "error").mockImplementation(() => {});
      const broken: StepChecker = () => {
        throw new Error("boom");
      };
      render(<LessonStepper lesson={gradedLesson} checker={broken} />);

      await submit("12");

      expect(await screen.findByRole("region", { name: "error feedback" })).toBeInTheDocument();
      expect(stepStatus()).toHaveTextContent(feedbackContent.error.announcement);
      expect(screen.getByRole("button", { name: /next/i })).toHaveAttribute("aria-disabled", "true");
    });

    it("still says what was entered after leaving a not-yet step and coming back", async () => {
      const user = userEvent.setup();
      const lesson: Lesson = {
        ...gradedLesson,
        steps: [{ type: "explain", content: "Intro" }, ...gradedLesson.steps],
      };
      const checker: StepChecker = (_slug, index, submission) => checkStep(lesson.steps[index], submission);
      render(<LessonStepper lesson={lesson} checker={checker} />);
      await user.click(screen.getByRole("button", { name: /next/i }));
      await submit("12");
      await screen.findByRole("region", { name: "not-yet feedback" });

      await user.click(screen.getByRole("button", { name: /back/i }));
      await user.click(screen.getByRole("button", { name: /next/i }));

      expect(screen.getByRole("region", { name: "not-yet feedback" })).toHaveTextContent("You entered 12");
      expect(stepStatus()).toHaveTextContent("You entered 12.");
      expect(screen.getByRole("spinbutton", { name: /your answer/i })).toHaveValue(null);
    });

    it("walks the live region through checking to the result", async () => {
      render(<LessonStepper lesson={gradedLesson} checker={realChecker} />);
      const status = stepStatus();
      expect(status).toBeEmptyDOMElement();

      await submit("12");

      expect(status).toHaveTextContent(feedbackContent.checking.announcement);
      await waitFor(() => expect(status).toHaveTextContent(feedbackContent["not-yet"].announcement));
    });
  });

  it("has no accessibility violations across steps (axe check)", async () => {
    const { container } = render(<LessonStepper lesson={mockLesson} />);
    await expectNoA11yViolations(container);

    const user = userEvent.setup();
    const nextBtn = screen.getByRole("button", { name: /next/i });
    await user.click(nextBtn);
    await expectNoA11yViolations(container);
  });

  it("calls onPassed once when the lesson passes, not per step or per render", async () => {
    const user = userEvent.setup();
    const twoAnswers: PageLesson = {
      ...mockLesson,
      steps: [
        { type: "answer", prompt: "Calculate 1 + 1" },
        { type: "answer", prompt: "Calculate 2 + 2" },
      ],
    };
    const onPassed = vi.fn();
    const { rerender } = render(
      <LessonStepper lesson={twoAnswers} checker={() => ({ passed: true })} onPassed={onPassed} />,
    );

    await user.type(screen.getByRole("spinbutton", { name: /your answer/i }), "2");
    await user.click(screen.getByRole("button", { name: /submit/i }));
    await waitFor(() => expect(screen.getByRole("button", { name: /^next$/i })).toBeEnabled());
    expect(onPassed).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: /^next$/i }));
    await user.type(screen.getByRole("spinbutton", { name: /your answer/i }), "4");
    await user.click(screen.getByRole("button", { name: /submit/i }));
    await waitFor(() => expect(onPassed).toHaveBeenCalledTimes(1));

    // A new callback identity and further navigation never re-fire it.
    rerender(
      <LessonStepper lesson={twoAnswers} checker={() => ({ passed: true })} onPassed={() => onPassed()} />,
    );
    await user.click(screen.getByRole("button", { name: /back/i }));
    expect(onPassed).toHaveBeenCalledTimes(1);
  });

  describe("a blank submit (Issue #144)", () => {
    it("shows and announces the prompt, never calls the checker, and leaves the step untried", async () => {
      const user = userEvent.setup();
      const checker = vi.fn<StepChecker>(() => ({ passed: true }));
      render(<LessonStepper lesson={mockLesson} checker={checker} />);
      await user.click(screen.getByRole("button", { name: /next/i }));

      await user.click(screen.getByRole("button", { name: /submit/i }));

      expect(stepStatus()).toHaveTextContent("An answer is needed first.");
      expect(screen.getByRole("spinbutton", { name: /your answer/i })).toHaveAccessibleDescription(
        /^An answer is needed first/,
      );
      expect(checker).not.toHaveBeenCalled();
      // Still untried: only the neutral prompt card, no result state, Next still gated.
      expect(screen.getAllByRole("region", { name: /feedback/i })).toHaveLength(1);
      expect(screen.getByRole("region", { name: "idle feedback" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /next/i })).toHaveAttribute("aria-disabled", "true");
    });
  });

  describe("the completion moment (Issue #144)", () => {
    const twoAnswerLesson: PageLesson = {
      ...mockLesson,
      steps: [
        { type: "explain", content: "Introduction to adding" },
        { type: "answer", prompt: "Calculate 1 + 1" },
        { type: "answer", prompt: "Calculate 2 + 2" },
      ],
    };
    const continueTo = {
      href: "/lessons/counting-on",
      label: "Next lesson",
      accessibleName: "Next lesson: Counting On",
    };
    const completeStatus = () => screen.getAllByRole("status").at(-1)!;

    async function answer(user: ReturnType<typeof userEvent.setup>, value: string) {
      await user.type(screen.getByRole("spinbutton", { name: /your answer/i }), value);
      await user.click(screen.getByRole("button", { name: /submit/i }));
    }

    function renderLesson(checker: StepChecker) {
      return render(
        <MemoryRouter>
          <LessonStepper lesson={twoAnswerLesson} checker={checker} continueTo={continueTo} />
        </MemoryRouter>,
      );
    }

    async function passAll(user: ReturnType<typeof userEvent.setup>) {
      await user.click(screen.getByRole("button", { name: /next/i }));
      await answer(user, "2");
      await user.click(await screen.findByRole("button", { name: /^next$/i }));
      await answer(user, "4");
    }

    it("swaps the last step's Next for the continue link when the last answer step passes, and not before", async () => {
      const user = userEvent.setup();
      // Step 2 passes on "2"; step 3 passes only on "4".
      const checker: StepChecker = (_slug, index, submission) => ({
        passed: submission === (index === 1 ? "2" : "4"),
      });
      renderLesson(checker);

      await user.click(screen.getByRole("button", { name: /next/i }));
      await answer(user, "2");
      await screen.findByRole("region", { name: "correct feedback" });
      // One answer step passed, one to go.
      expect(screen.queryByRole("link", { name: /next lesson/i })).not.toBeInTheDocument();
      expect(completeStatus()).toBeEmptyDOMElement();

      await user.click(screen.getByRole("button", { name: /^next$/i }));
      await answer(user, "5");
      await screen.findByRole("region", { name: "not-yet feedback" });
      // #58's rule until then: the last step's Next is disabled.
      expect(screen.getByRole("button", { name: /next/i })).toBeDisabled();
      expect(screen.queryByRole("link", { name: /next lesson/i })).not.toBeInTheDocument();

      await user.clear(screen.getByRole("spinbutton", { name: /your answer/i }));
      await answer(user, "4");

      const link = await screen.findByRole("link", { name: "Next lesson: Counting On" });
      expect(link).toHaveTextContent(/^Next lesson$/);
      expect(link).toHaveAttribute("href", "/lessons/counting-on");
      expect(screen.queryByRole("button", { name: /next/i })).not.toBeInTheDocument();
      expect(completeStatus()).toHaveTextContent("Lesson complete. Nice work!");
    });

    it("is held back while checking is still on screen", async () => {
      const user = userEvent.setup();
      renderLesson(() => ({ passed: true }));

      await passAll(user);

      expect(screen.getByRole("region", { name: "checking feedback" })).toBeInTheDocument();
      expect(screen.queryByRole("link", { name: /next lesson/i })).not.toBeInTheDocument();
      expect(completeStatus()).toBeEmptyDOMElement();
      expect(await screen.findByRole("link", { name: /next lesson/i })).toBeInTheDocument();
    });

    it("keeps plain Next on earlier steps once the lesson has passed", async () => {
      const user = userEvent.setup();
      renderLesson(() => ({ passed: true }));
      await passAll(user);
      await screen.findByRole("link", { name: /next lesson/i });

      await user.click(screen.getByRole("button", { name: /back/i }));

      expect(screen.getByRole("button", { name: /^next$/i })).toBeEnabled();
      expect(screen.queryByRole("link", { name: /next lesson/i })).not.toBeInTheDocument();
    });

    it("puts the continue link in the keyboard order", async () => {
      const user = userEvent.setup();
      renderLesson(() => ({ passed: true }));
      await passAll(user);
      const link = await screen.findByRole("link", { name: /next lesson/i });

      screen.getByRole("button", { name: /back/i }).focus();
      await user.tab();

      expect(link).toHaveFocus();
    });

    it("keeps the last step's Next disabled when no continue target is given", async () => {
      const user = userEvent.setup();
      render(<LessonStepper lesson={twoAnswerLesson} checker={() => ({ passed: true })} />);
      await passAll(user);

      await waitFor(() => expect(completeStatus()).toHaveTextContent("Lesson complete."));
      expect(screen.getByRole("button", { name: /next/i })).toBeDisabled();
    });

    it("has no accessibility violations once complete", async () => {
      const user = userEvent.setup();
      const { container } = renderLesson(() => ({ passed: true }));
      await passAll(user);
      await screen.findByRole("link", { name: /next lesson/i });

      await expectNoA11yViolations(container);
    });
  });
});
