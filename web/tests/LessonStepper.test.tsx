import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
    expect(screen.getByText("Step kind: explain")).toBeInTheDocument();

    const progressBar = screen.getByRole("progressbar");
    expect(progressBar).toHaveAttribute("aria-valuenow", "1");
    expect(progressBar).toHaveAttribute("aria-valuemin", "1");
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
    expect(screen.getByText("Step kind: answer")).toBeInTheDocument();

    const progressBar = screen.getByRole("progressbar");
    expect(progressBar).toHaveAttribute("aria-valuenow", "2");

    const stepHeading = screen.getByRole("heading", { name: /step 2 of 3/i });
    expect(stepHeading).toHaveFocus();

    const backBtn = screen.getByRole("button", { name: /back/i });
    expect(backBtn).toBeEnabled();
    expect(nextBtn).toBeEnabled();
  });

  it("disables Next on the final step and allows stepping back", async () => {
    const user = userEvent.setup();
    render(<LessonStepper lesson={mockLesson} />);

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

  it("announces step changes in an aria-live polite region", async () => {
    const user = userEvent.setup();
    render(<LessonStepper lesson={mockLesson} />);

    const liveRegion = screen.getByRole("status");
    expect(liveRegion).toHaveTextContent("Step 1 of 3: explain step");

    const nextBtn = screen.getByRole("button", { name: /next/i });
    await user.click(nextBtn);

    expect(liveRegion).toHaveTextContent("Step 2 of 3: answer step");
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
