import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import { AppRoutes } from "../src/App";
import { NavHeader } from "../src/components/NavHeader/NavHeader";
import { AuthContext } from "../src/context/AuthContext";
import { expectNoA11yViolations } from "./helpers/a11y";
import type { Account } from "../src/types";

// Rendered through AppRoutes, shell included. Checking a page component on its
// own hides exactly the faults that come from nesting one inside the root
// Layout, which is how a duplicate `main` landmark survived on the home page.
const ROUTES = [
  "/",
  "/login",
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
      <AppRoutes initialLoading={false} />
    </MemoryRouter>,
  );
}

describe("Accessibility checks (vitest-axe)", () => {
  it.each(ROUTES)("has no accessibility violations at %s", async (route) => {
    const { container } = renderRoute(route);

    await waitFor(() => {
      expect(
        screen.queryByLabelText("Loading account details"),
      ).not.toBeInTheDocument();
    });
    await expectNoA11yViolations(container);
  });

  it.each(ROUTES)("keeps exactly one main landmark at %s", async (route) => {
    renderRoute(route);

    await waitFor(() => {
      expect(
        screen.queryByLabelText("Loading account details"),
      ).not.toBeInTheDocument();
      expect(screen.getAllByRole("main")).toHaveLength(1);
    });
  });

  it("NavHeader in loading state should have no accessibility violations", async () => {
    const { container } = render(
      <AuthContext.Provider
        value={{ account: null, loading: true, logout: vi.fn() }}
      >
        <MemoryRouter>
          <NavHeader />
        </MemoryRouter>
      </AuthContext.Provider>,
    );

    expect(screen.getByRole("status")).toBeInTheDocument();
    await expectNoA11yViolations(container);
  });

  it("NavHeader in signed-out state should have no accessibility violations", async () => {
    const { container } = render(
      <AuthContext.Provider
        value={{ account: null, loading: false, logout: vi.fn() }}
      >
        <MemoryRouter>
          <NavHeader />
        </MemoryRouter>
      </AuthContext.Provider>,
    );

    expect(screen.getByRole("link", { name: "Sign in" })).toBeInTheDocument();
    await expectNoA11yViolations(container);
  });

  it("NavHeader in signed-in state (closed and open dropdown) should have no accessibility violations", async () => {
    const user = userEvent.setup();
    const mockAccount: Account = {
      id: "usr_99",
      displayName: "Sam",
      avatarUrl: "https://example.com/sam.png",
    };

    const { container } = render(
      <AuthContext.Provider
        value={{ account: mockAccount, loading: false, logout: vi.fn() }}
      >
        <MemoryRouter>
          <NavHeader />
        </MemoryRouter>
      </AuthContext.Provider>,
    );

    // Closed state check
    const trigger = screen.getByRole("button", { name: "Sam" });
    expect(trigger).toBeInTheDocument();
    await expectNoA11yViolations(container);

    // Open state check
    await user.click(trigger);
    expect(screen.getByRole("menu")).toBeInTheDocument();
    await expectNoA11yViolations(container);
  });
});
