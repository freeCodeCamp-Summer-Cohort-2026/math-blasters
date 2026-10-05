import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { feedbackContent } from "../src/components/Feedback/content";
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

  it("submits a text answer without the whitespace around it", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<AnswerStep step={{ type: "answer", prompt: "Half of $x$?", input: "text" }} onSubmit={onSubmit} />);

    await user.type(screen.getByRole("textbox", { name: /your answer/i }), "  x/2  {Enter}");

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

  describe("a blank submit (Issue #144)", () => {
    it("says an answer is needed, beside the input and in the live region", async () => {
      const user = userEvent.setup();
      render(<AnswerStep step={step} onSubmit={vi.fn()} />);

      await user.click(screen.getByRole("button", { name: /submit/i }));

      const input = screen.getByRole("spinbutton", { name: /your answer/i });
      const card = screen.getByRole("region", { name: "idle feedback" });
      expect(card).toHaveTextContent("An answer is needed first");
      expect(card).toHaveTextContent(feedbackContent.idle.detail);
      expect(input).toHaveAccessibleDescription(/^An answer is needed first/);
      // A prompt, not a result: nothing marks the field invalid.
      expect(input).not.toHaveAttribute("aria-invalid");
      expect(screen.getByRole("status")).toHaveTextContent("An answer is needed first.");
    });

    it("treats a whitespace-only answer as blank and never submits it", async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();
      render(<AnswerStep step={{ ...step, input: "text" }} onSubmit={onSubmit} />);

      await user.type(screen.getByRole("textbox", { name: /your answer/i }), "   {Enter}");

      expect(onSubmit).not.toHaveBeenCalled();
      expect(screen.getByRole("status")).toHaveTextContent("An answer is needed first.");
    });

    it("shows the neutral idle card, never a result state", async () => {
      const user = userEvent.setup();
      render(<AnswerStep step={step} onSubmit={vi.fn()} />);

      await user.click(screen.getByRole("button", { name: /submit/i }));

      expect(screen.getAllByRole("region", { name: /feedback/i })).toHaveLength(1);
      expect(screen.getByRole("region", { name: /feedback/i })).toHaveAttribute("data-state", "idle");
    });

    it("takes the place of a not-yet card until the learner types, then gives it back", async () => {
      const user = userEvent.setup();
      render(
        <AnswerStep
          step={{ ...step, checking: "the sum of the two numbers" }}
          status="not_yet"
          entered="5"
          reasonCode="wrong_total"
          onSubmit={vi.fn()}
        />,
      );
      expect(screen.getByRole("region", { name: "not-yet feedback" })).toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: /submit/i }));

      const input = screen.getByRole("spinbutton", { name: /your answer/i });
      expect(screen.queryByRole("region", { name: "not-yet feedback" })).not.toBeInTheDocument();
      expect(screen.getByRole("region", { name: "idle feedback" })).toHaveTextContent("An answer is needed first");
      // Described only by what is on screen, not the hidden checking statement.
      expect(input).toHaveAccessibleDescription(/^An answer is needed first/);

      await user.type(input, "6");

      expect(screen.queryByRole("region", { name: "idle feedback" })).not.toBeInTheDocument();
      expect(screen.getByRole("region", { name: "not-yet feedback" })).toHaveTextContent("You entered 5");
    });

    it("clears the message once the learner types", async () => {
      const user = userEvent.setup();
      render(<AnswerStep step={step} onSubmit={vi.fn()} />);
      await user.click(screen.getByRole("button", { name: /submit/i }));

      await user.type(screen.getByRole("spinbutton", { name: /your answer/i }), "4");

      expect(screen.queryByText("An answer is needed first")).not.toBeInTheDocument();
      expect(screen.queryByRole("region", { name: /feedback/i })).not.toBeInTheDocument();
      expect(screen.getByRole("status")).toBeEmptyDOMElement();
    });

    it("keeps the idle card out of the not-yet palette and --danger", () => {
      const css = readFileSync("src/components/Feedback/Feedback.module.css", "utf8");
      const idleRule = css.match(/\.idle\s*{[^}]*}/)?.[0];
      expect(idleRule).toBeDefined();
      expect(idleRule).not.toMatch(/--danger|--coral|--warning|--mango/);
    });

    it("has no accessibility violations while shown", async () => {
      const user = userEvent.setup();
      const { container } = render(<AnswerStep step={step} onSubmit={vi.fn()} />);

      await user.click(screen.getByRole("button", { name: /submit/i }));

      await expectNoA11yViolations(container);
    });
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

  it("shows the held feedback state it is given, and keeps the answer locked while that is checking", () => {
    render(<AnswerStep step={step} status="passed" feedbackState="checking" onSubmit={vi.fn()} />);

    expect(screen.getByRole("region", { name: "checking feedback" })).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(feedbackContent.checking.announcement);
    expect(screen.getByRole("button", { name: /submit/i })).toBeDisabled();
  });

  describe("checking statement", () => {
    const checking = "the total number of marbles in the jar";
    const checked: PageAnswerStep = { type: "answer", prompt: "How many marbles?", checking };

    const notYet = (
      <AnswerStep step={checked} status="not_yet" entered="10" reasonCode="wrong_total" onSubmit={vi.fn()} />
    );

    it.each(["untried", "checking", "passed", "error"] as const)("is hidden while the step is %s", (status) => {
      render(<AnswerStep step={checked} status={status} onSubmit={vi.fn()} />);

      expect(screen.queryByText(checking)).not.toBeInTheDocument();
      expect(screen.getByRole("spinbutton", { name: /your answer/i })).not.toHaveAttribute("aria-describedby");
    });

    it("shows the statement inside the not-yet feedback", () => {
      render(notYet);

      const region = within(screen.getByRole("region", { name: "not-yet feedback" }));
      expect(region.getByText("Checking")).toBeInTheDocument();
      expect(region.getByText(checking)).toBeInTheDocument();
    });

    it("follows the held feedback, so it waits while checking is still on screen", () => {
      render(<AnswerStep step={checked} status="not_yet" feedbackState="checking" onSubmit={vi.fn()} />);

      expect(screen.queryByText(checking)).not.toBeInTheDocument();
    });

    it("renders nothing for a step without one", () => {
      const { container } = render(<AnswerStep step={step} status="not_yet" onSubmit={vi.fn()} />);

      expect(screen.queryByText("Checking")).not.toBeInTheDocument();
      expect(container.querySelectorAll("article")).toHaveLength(1);
      expect(screen.getByRole("spinbutton", { name: /your answer/i })).not.toHaveAttribute("aria-describedby");
    });

    it("is the input's accessible description", () => {
      render(notYet);

      const input = screen.getByRole("spinbutton", { name: /your answer/i });
      const statement = screen.getByText(checking).closest("[id]");
      expect(statement).not.toBeNull();
      expect(input).toHaveAttribute("aria-describedby", statement!.id);
      expect(input).toHaveAccessibleDescription(`Checking ${checking}`);
    });

    it("renders only the authored prose", () => {
      render(notYet);

      const statement = screen.getByText(checking).closest("[id]");
      expect(statement).toHaveTextContent(new RegExp(`^Checking${checking}$`));
    });

    it("has no accessibility violations before and after a not-yet result", async () => {
      const { container, rerender } = render(<AnswerStep step={checked} onSubmit={vi.fn()} />);
      await expectNoA11yViolations(container);

      rerender(notYet);
      expect(screen.getByText(checking)).toBeInTheDocument();
      await expectNoA11yViolations(container);
    });
  });

  it("has no accessibility violations", async () => {
    const { container } = render(
      <AnswerStep step={{ type: "answer", prompt: "What is 2 + 2?" }} onSubmit={vi.fn()} />,
    );
    await expectNoA11yViolations(container);
  });
});
