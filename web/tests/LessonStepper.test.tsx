import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { LessonStepper } from "../src/components/LessonStepper/LessonStepper";
import type { PageLesson } from "../src/content/types";
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
    expect(screen.queryByRole("status")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /next/i }));

    // The focused heading is what a screen reader announces, and it is
    // announced once because nothing else repeats its text.
    expect(screen.getByRole("heading", { name: /step 2 of 3/i })).toHaveFocus();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
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

  it("has no accessibility violations across steps (axe check)", async () => {
    const { container } = render(<LessonStepper lesson={mockLesson} />);
    await expectNoA11yViolations(container);

    const user = userEvent.setup();
    const nextBtn = screen.getByRole("button", { name: /next/i });
    await user.click(nextBtn);
    await expectNoA11yViolations(container);
  });
});
