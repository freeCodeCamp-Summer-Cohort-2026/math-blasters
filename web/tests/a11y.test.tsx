import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";

import { AppRoutes } from "../src/App";
import { expectNoA11yViolations } from "./helpers/a11y";

// Rendered through AppRoutes, shell included. Checking a page component on its
// own hides exactly the faults that come from nesting one inside the root
// Layout, which is how a duplicate `main` landmark survived on the home page.
const ROUTES = [
  "/",
  "/modules/arithmetic-addition",
  "/lessons/adding-two-numbers",
  "/lessons/marbles-in-total",
  "/unknown-route",
  // Dev-only, but `import.meta.env.DEV` is true under vitest, so they are
  // reachable here and worth the same check.
  "/dev-only-markdown-styleguide",
  "/dev-only-feedback-styleguide",
];

function renderRoute(route: string) {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <AppRoutes />
    </MemoryRouter>,
  );
}

describe("Accessibility checks (vitest-axe)", () => {
  it.each(ROUTES)("has no accessibility violations at %s", async (route) => {
    const { container } = renderRoute(route);

    await expectNoA11yViolations(container);
  });

  it.each(ROUTES)("keeps exactly one main landmark at %s", (route) => {
    renderRoute(route);

    expect(screen.getAllByRole("main")).toHaveLength(1);
  });
});
