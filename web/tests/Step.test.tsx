import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Step } from "../src/components/Step";
import type { PageStep } from "../src/content/types";

describe("Step Component Boundary", () => {
  it("renders an ExplainStep for an explain step", () => {
    const step: PageStep = {
      type: "explain",
      content: "Here is an explanation of addition.",
    };

    render(<Step step={step} />);

    expect(screen.getByText("Here is an explanation of addition.")).toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("renders an AnswerStep for an answer step", () => {
    const step: PageStep = {
      type: "answer",
      prompt: "What is 2 + 2?",
    };

    render(<Step step={step} />);

    expect(screen.getByText("What is 2 + 2?")).toBeInTheDocument();
    expect(screen.getByRole("spinbutton", { name: /your answer/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /submit/i })).toBeInTheDocument();
  });
});
