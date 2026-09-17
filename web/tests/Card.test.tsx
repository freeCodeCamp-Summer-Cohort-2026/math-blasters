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

  it("renders as the requested root element and labels it via the title", () => {
    render(
      <Card as="section" title="Setup check">
        Body
      </Card>,
    );

    const region = screen.getByRole("region", { name: "Setup check" });
    expect(region.tagName).toBe("SECTION");
  });

  it("styles the title as an eyebrow by default", () => {
    render(<Card title="Setup check">Body</Card>);

    expect(screen.getByRole("heading", { name: "Setup check" })).toHaveClass(
      "card-title",
      "card-title--eyebrow",
    );
  });

  it("styles the title as a headline when asked", () => {
    render(
      <Card title="Adding Two Numbers" titleVariant="heading">
        Body
      </Card>,
    );

    expect(
      screen.getByRole("heading", { name: "Adding Two Numbers" }),
    ).toHaveClass("card-title", "card-title--heading");
  });

  it("keeps the heading level and the type scale independent", () => {
    // An h3 can be the loudest thing on a card; an h2 can be a quiet label.
    render(
      <Card title="Loud but low" titleLevel="h3" titleVariant="heading">
        Body
      </Card>,
    );

    const heading = screen.getByRole("heading", { level: 3 });
    expect(heading).toHaveClass("card-title--heading");
  });
});
