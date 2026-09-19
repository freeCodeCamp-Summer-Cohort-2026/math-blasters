import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ExplainStep } from "../src/components/steps/ExplainStep";
import { expectNoA11yViolations } from "./helpers/a11y";

describe("ExplainStep", () => {
  it("renders the step's prose through the markdown renderer", () => {
    render(
      <ExplainStep
        step={{ type: "explain", content: "## Adding two numbers\n\nStart here." }}
      />,
    );

    expect(screen.getByRole("heading", { level: 2, name: "Adding two numbers" })).toBeInTheDocument();
    expect(screen.getByText("Start here.")).toBeInTheDocument();
  });

  it("has no accessibility violations", async () => {
    const { container } = render(
      <ExplainStep step={{ type: "explain", content: "Some prose." }} />,
    );
    await expectNoA11yViolations(container);
  });
});
