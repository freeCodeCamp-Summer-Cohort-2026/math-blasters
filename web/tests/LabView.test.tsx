import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";

import { AppRoutes } from "../src/App";
import { LabView } from "../src/pages/LabView";
import { makeLesson } from "../src/content/fixtures";
import { expectNoA11yViolations } from "./helpers/a11y";

const OUTCOME =
  "Combine groups of marbles to find total sums in applied scenarios.";

// Rendered through AppRoutes rather than the view alone: every claim below is
// about the heading order of the page a learner actually opens, shell included.
function renderLab(slug = "marbles-in-total") {
  return render(
    <MemoryRouter initialEntries={[`/lessons/${slug}`]}>
      <AppRoutes />
    </MemoryRouter>,
  );
}

describe("LabView (/lessons/:slug for a lab)", () => {
  it("leads with the outcome as the page's only h1", () => {
    renderLab();

    const headings = screen.getAllByRole("heading", { level: 1 });

    expect(headings).toHaveLength(1);
    expect(headings[0]).toHaveTextContent(OUTCOME);
  });

  it("puts the outcome above the step counter in the heading order", () => {
    renderLab();

    const headings = screen.getAllByRole("heading");

    expect(headings.map((heading) => heading.tagName)).toEqual(["H1", "H2"]);
    expect(headings[0]).toHaveTextContent(OUTCOME);
    expect(headings[1]).toHaveTextContent("Step 1 of 2");
  });

  it("names the lab and describes it without competing for a heading", () => {
    renderLab();

    expect(screen.getByText("Marbles in Total")).toBeInTheDocument();
    expect(
      screen.getByText(/practice combining collections of marbles/i),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Marbles in Total" }),
    ).not.toBeInTheDocument();
  });

  it("leaves the root layout owning the only main landmark", () => {
    renderLab();

    expect(screen.getAllByRole("main")).toHaveLength(1);
  });

  // `outcome` is optional on the type and only the parser enforces it, so a lab
  // built in code can reach the view without one.
  it("falls back to the lab's title when it has no outcome", () => {
    const lab = makeLesson({ type: "lab", title: "Nameless Lab" });

    render(<LabView lab={lab} />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Nameless Lab" }),
    ).toBeInTheDocument();
  });

  it("has no accessibility violations", async () => {
    const { container } = renderLab();

    await expectNoA11yViolations(container);
  });
});
