import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { feedbackContent } from "../src/components/Feedback/content";
import { MIN_CHECKING_MS } from "../src/components/Feedback/useFeedbackState";
import { AnswerStep } from "../src/components/steps/AnswerStep";
import type { PageAnswerStep } from "../src/content";
import { REASON_SENTENCES } from "../src/content/reasons";
import { expectNoA11yViolations } from "./helpers/a11y";

const step: PageAnswerStep = { type: "answer", prompt: "What is 2 + 2?" };

describe("AnswerStep", () => {
  it("renders the step's prompt through the markdown renderer", () => {
    render(<AnswerStep step={{ type: "answer", prompt: "What is 2 + 2?" }} onSubmit={vi.fn()} />);

    expect(screen.getByText("What is 2 + 2?")).toBeInTheDocument();
  });

  it("accepts input and fires onSubmit by button", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<AnswerStep step={{ type: "answer", prompt: "What is 2 + 2?" }} onSubmit={onSubmit} />);

    await user.type(screen.getByRole("spinbutton", { name: /your answer/i }), "4");
    await user.click(screen.getByRole("button", { name: /submit/i }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith("4");
  });

  it("takes an expression in a text field when the step asks for text", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<AnswerStep step={{ type: "answer", prompt: "Half of $x$?", input: "text" }} onSubmit={onSubmit} />);

    await user.type(screen.getByRole("textbox", { name: /your answer/i }), "x/2{Enter}");

    expect(onSubmit).toHaveBeenCalledWith("x/2");
  });

  it("accepts input and fires onSubmit on Enter", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<AnswerStep step={{ type: "answer", prompt: "What is 2 + 2?" }} onSubmit={onSubmit} />);

    await user.type(screen.getByRole("spinbutton", { name: /your answer/i }), "4{Enter}");

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith("4");
  });

  it("does not fire onSubmit for an empty submission", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<AnswerStep step={{ type: "answer", prompt: "What is 2 + 2?" }} onSubmit={onSubmit} />);

    await user.click(screen.getByRole("button", { name: /submit/i }));

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("disables input and submit while checking", () => {
    render(
      <AnswerStep
        step={{ type: "answer", prompt: "What is 2 + 2?" }}
        status="checking"
        onSubmit={vi.fn()}
      />,
    );

    expect(screen.getByRole("spinbutton", { name: /your answer/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /submit/i })).toBeDisabled();
  });

  it("shows no feedback before the first submission, with a silent live region", () => {
    render(<AnswerStep step={step} onSubmit={vi.fn()} />);

    expect(screen.queryByRole("region", { name: /feedback/i })).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
  });

  it("renders the correct state and announces it as a sentence", () => {
    render(<AnswerStep step={step} status="passed" onSubmit={vi.fn()} />);

    expect(screen.getByRole("region", { name: "correct feedback" })).toHaveTextContent(
      feedbackContent.correct.title,
    );
    expect(screen.getByRole("status")).toHaveTextContent(feedbackContent.correct.announcement);
  });

  it("renders the not-yet state with what was entered and why", () => {
    render(<AnswerStep step={step} status="not_yet" entered="12" reasonCode="wrong_total" onSubmit={vi.fn()} />);

    const region = screen.getByRole("region", { name: "not-yet feedback" });
    expect(region).toHaveTextContent(feedbackContent["not-yet"].title);
    expect(region).toHaveTextContent("You entered 12");
    expect(region).toHaveTextContent(REASON_SENTENCES.wrong_total);
    expect(screen.getByRole("status")).toHaveTextContent(
      `Not yet. Have another go. You entered 12. ${REASON_SENTENCES.wrong_total}`,
    );
  });

  it("prefers an authored reason in the not-yet state", () => {
    const authored = "Count the red marbles, then count on the blue ones.";
    render(<AnswerStep step={step} status="not_yet" reasonCode="wrong_total" reason={authored} onSubmit={vi.fn()} />);

    expect(screen.getByRole("region", { name: "not-yet feedback" })).toHaveTextContent(authored);
    expect(screen.getByRole("status")).toHaveTextContent(authored);
  });

  it("renders the error state and announces it, leaving the answer open to resubmit", () => {
    render(<AnswerStep step={step} status="error" onSubmit={vi.fn()} />);

    expect(screen.getByRole("region", { name: "error feedback" })).toHaveTextContent(
      feedbackContent.error.title,
    );
    expect(screen.getByRole("status")).toHaveTextContent(feedbackContent.error.announcement);
    expect(screen.getByRole("button", { name: /submit/i })).toBeEnabled();
  });

  it("updates the live region as the state changes", () => {
    const { rerender } = render(<AnswerStep step={step} status="error" onSubmit={vi.fn()} />);
    const status = screen.getByRole("status");
    expect(status).toHaveTextContent(feedbackContent.error.announcement);

    rerender(<AnswerStep step={step} status="passed" onSubmit={vi.fn()} />);

    // Same element, new sentence: a region that stays mounted is what gets announced.
    expect(screen.getByRole("status")).toBe(status);
    expect(status).toHaveTextContent(feedbackContent.correct.announcement);
  });

  describe("checking", () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => {
      vi.useRealTimers();
      vi.unstubAllGlobals();
    });

    it("holds checking on screen for a minimum time when the result lands at once", () => {
      const { rerender } = render(<AnswerStep step={step} status="checking" onSubmit={vi.fn()} />);
      expect(screen.getByRole("region", { name: "checking feedback" })).toBeInTheDocument();
      expect(screen.getByRole("status")).toHaveTextContent(feedbackContent.checking.announcement);

      rerender(<AnswerStep step={step} status="passed" onSubmit={vi.fn()} />);
      expect(screen.getByRole("region", { name: "checking feedback" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /submit/i })).toBeDisabled();

      act(() => vi.advanceTimersByTime(MIN_CHECKING_MS));
      expect(screen.getByRole("region", { name: "correct feedback" })).toBeInTheDocument();
      expect(screen.getByRole("status")).toHaveTextContent(feedbackContent.correct.announcement);
    });

    it("drops the minimum under prefers-reduced-motion", () => {
      vi.stubGlobal("matchMedia", (query: string) => ({ matches: query.includes("reduce") }));
      const { rerender } = render(<AnswerStep step={step} status="checking" onSubmit={vi.fn()} />);

      rerender(<AnswerStep step={step} status="passed" onSubmit={vi.fn()} />);

      expect(screen.getByRole("region", { name: "correct feedback" })).toBeInTheDocument();
    });
  });

  it("has no accessibility violations", async () => {
    const { container } = render(
      <AnswerStep step={{ type: "answer", prompt: "What is 2 + 2?" }} onSubmit={vi.fn()} />,
    );
    await expectNoA11yViolations(container);
  });
});
