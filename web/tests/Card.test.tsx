import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Card, HeadingLevel } from "../src/components/Card";

describe("Card Component", () => {
  it("renders card content", () => {
    render(<Card>Test Content</Card>);
    expect(screen.getByText("Test Content")).toBeInTheDocument();
  });

  it.each([
    ["h1", 1],
    ["h2", 2],
    ["h3", 3],
    ["h4", 4],
    ["h5", 5],
    ["h6", 6],
  ])("renders the title at requested heading level %s", (level, numericLevel) => {
    render(
      <Card title="Card Title" titleLevel={level as HeadingLevel}>
        Body
      </Card>,
    );

    const heading = screen.getByRole("heading", { level: numericLevel });
    expect(heading).toBeInTheDocument();
    expect(heading.textContent).toBe("Card Title");
  });
});
