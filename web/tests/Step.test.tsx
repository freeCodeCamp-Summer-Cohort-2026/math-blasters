import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Step } from "../src/components/Step";
import type { PageStep } from "../src/content/types";

describe("Step Component Boundary", () => {
  it("renders a placeholder with the step kind for an explain step", () => {
    const step: PageStep = {
      type: "explain",
      content: "Here is an explanation of addition.",
    };

    render(<Step step={step} />);

    const placeholder = screen.getByTestId("step-placeholder");
    expect(placeholder).toBeInTheDocument();
    expect(screen.getByText("Step kind: explain")).toBeInTheDocument();
  });

  it("renders a placeholder with the step kind for an answer step", () => {
    const step: PageStep = {
      type: "answer",
      prompt: "What is 2 + 2?",
    };

    render(<Step step={step} />);

    const placeholder = screen.getByTestId("step-placeholder");
    expect(placeholder).toBeInTheDocument();
    expect(screen.getByText("Step kind: answer")).toBeInTheDocument();
  });
});
