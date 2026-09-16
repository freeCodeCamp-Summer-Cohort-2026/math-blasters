import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, it } from "vitest";

import { expectNoA11yViolations } from "./helpers/a11y";
import { Homepage } from "../src/pages/Homepage";
import { NotFoundPage } from "../src/pages/NotFoundPage";

describe("Accessibility checks (vitest-axe)", () => {
  it("home page and root layout should have no accessibility violations", async () => {
    const { container } = render(
      <MemoryRouter initialEntries={["/"]}>
        <Homepage />
      </MemoryRouter>
    );
    expect(container).toBeInTheDocument();
    await expectNoA11yViolations(container);
  });

  it("not-found page and root layout should have no accessibility violations", async () => {
    const { container } = render(
      <MemoryRouter initialEntries={["/unknown-route"]}>
        <NotFoundPage />
      </MemoryRouter>
    );

    expect(screen.getByRole("heading", { name: /page not found/i })).toBeInTheDocument();
    await expectNoA11yViolations(container);
  });
});
