import { readFileSync } from "node:fs";
import { join } from "node:path";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { NotYetExplanation } from "../src/components/NotYetExplanation";
import { checkCriterion } from "../src/content/check";
import { GENERIC_REASON_SENTENCE, REASON_SENTENCES } from "../src/content/reasons";
import type { Criterion } from "../src/content/types";

// A distinctive expected value, so finding it anywhere in the output is unambiguous.
const criterion: Criterion = { check: "equals", expected: 48173, reason_code: "wrong_total" };

describe("NotYetExplanation", () => {
  it("shows what the learner entered, in bold", () => {
    render(<NotYetExplanation entered="12" reasonCode="wrong_total" />);

    expect(screen.getByText(/You entered/)).toHaveTextContent("You entered 12");
    expect(screen.getByText("12").tagName).toBe("STRONG");
  });

  it("shows the sentence for the reason code", () => {
    render(<NotYetExplanation entered="12" reasonCode="wrong_total" />);

    expect(screen.getByText(REASON_SENTENCES.wrong_total)).toBeInTheDocument();
  });

  it("falls back for an unknown code without showing the code", () => {
    const { container } = render(<NotYetExplanation entered="12" reasonCode="mystery_code_42" />);

    expect(screen.getByText(GENERIC_REASON_SENTENCE)).toBeInTheDocument();
    expect(container.innerHTML).not.toContain("mystery_code_42");
  });

  it("prefers an author-written reason", () => {
    const authored = "Count the red marbles, then count on the blue ones.";
    render(<NotYetExplanation entered="12" reasonCode="wrong_total" reason={authored} />);

    expect(screen.getByText(authored)).toBeInTheDocument();
    expect(screen.queryByText(REASON_SENTENCES.wrong_total)).not.toBeInTheDocument();
  });

  it("leaves out the entered line when nothing was entered", () => {
    render(<NotYetExplanation entered="   " reasonCode="wrong_total" />);

    expect(screen.queryByText(/You entered/)).not.toBeInTheDocument();
    expect(screen.getByText(REASON_SENTENCES.wrong_total)).toBeInTheDocument();
  });

  it("falls back when there is no reason code", () => {
    render(<NotYetExplanation entered="12" />);

    expect(screen.getByText(GENERIC_REASON_SENTENCE)).toBeInTheDocument();
  });

  it("never renders the expected value, in text or any attribute", () => {
    const result = checkCriterion(criterion, "12");
    expect(result.passed).toBe(false);

    const { container } = render(
      <NotYetExplanation entered="12" reasonCode={result.reason_code} />,
    );

    // innerHTML covers text, attributes and any title.
    expect(container.innerHTML).not.toContain("48173");
    expect(container.textContent).not.toContain("48173");
  });

  it("uses the not-yet palette, never coral or danger", () => {
    const css = readFileSync(
      join(__dirname, "../src/components/NotYetExplanation/NotYetExplanation.module.css"),
      "utf-8",
    );

    expect(css).toContain("var(--mango-500)");
    expect(css).toContain("var(--warning-soft)");
    expect(css).not.toMatch(/var\(--(coral|danger)/);
  });
});
