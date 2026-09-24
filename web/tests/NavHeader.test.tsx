import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { api } from "../src/api/client";
import { NavHeader } from "../src/components/NavHeader/NavHeader";
import { AuthContext, AuthProvider } from "../src/context/AuthContext";
import type { Account } from "../src/types";

describe("NavHeader", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders brand link pointing to '/'", () => {
    render(
      <AuthContext.Provider
        value={{ account: null, loading: false, logout: vi.fn() }}
      >
        <MemoryRouter>
          <NavHeader />
        </MemoryRouter>
      </AuthContext.Provider>,
    );

    const brandLink = screen.getByRole("link", { name: "Math Blasters" });
    expect(brandLink).toHaveAttribute("href", "/");
  });

  it("renders ThemeToggle button", () => {
    render(
      <AuthContext.Provider
        value={{ account: null, loading: false, logout: vi.fn() }}
      >
        <MemoryRouter>
          <NavHeader />
        </MemoryRouter>
      </AuthContext.Provider>,
    );

    expect(
      screen.getByRole("button", { name: /toggle theme/i }),
    ).toBeInTheDocument();
  });

  it("renders Skeleton loading state when loading is true", () => {
    render(
      <AuthContext.Provider
        value={{ account: null, loading: true, logout: vi.fn() }}
      >
        <MemoryRouter>
          <NavHeader />
        </MemoryRouter>
      </AuthContext.Provider>,
    );

    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.getByText("Loading account details")).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Sign in" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Sign out" }),
    ).not.toBeInTheDocument();
  });

  it("renders 'Sign in' link to /login when signed out", () => {
    render(
      <AuthContext.Provider
        value={{ account: null, loading: false, logout: vi.fn() }}
      >
        <MemoryRouter>
          <NavHeader />
        </MemoryRouter>
      </AuthContext.Provider>,
    );

    const signInLink = screen.getByRole("link", { name: "Sign in" });
    expect(signInLink).toHaveAttribute("href", "/login");
    expect(signInLink).toHaveClass("btn", "btn--secondary", "btn--sm");
  });

  it("renders AccountMenu when signed in", () => {
    const mockAccount: Account = {
      id: "usr_42",
      displayName: "Sam",
    };

    render(
      <AuthContext.Provider
        value={{ account: mockAccount, loading: false, logout: vi.fn() }}
      >
        <MemoryRouter>
          <NavHeader />
        </MemoryRouter>
      </AuthContext.Provider>,
    );

    expect(
      screen.getByRole("button", { name: "Sam" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Sign in" }),
    ).not.toBeInTheDocument();
  });

  describe("sign-out through the real AuthProvider", () => {
    const sam: Account = { id: "usr_7", displayName: "Sam" };

    function renderSignedIn() {
      render(
        <AuthProvider initialAccount={sam} initialLoading={false}>
          <MemoryRouter>
            <NavHeader />
          </MemoryRouter>
        </AuthProvider>,
      );
    }

    it("swaps the account menu for a focused Sign in link", async () => {
      const user = userEvent.setup();
      const logoutSpy = vi.spyOn(api.auth, "logout").mockResolvedValue();
      renderSignedIn();

      await user.click(screen.getByRole("button", { name: "Sam" }));
      await user.click(screen.getByRole("button", { name: "Sign out" }));

      const signIn = await screen.findByRole("link", { name: "Sign in" });
      expect(logoutSpy).toHaveBeenCalledTimes(1);
      expect(signIn).toHaveFocus();
      expect(
        screen.queryByRole("button", { name: "Sam" }),
      ).not.toBeInTheDocument();
    });

    it("keeps the account menu when the server sign-out fails", async () => {
      const user = userEvent.setup();
      vi.spyOn(console, "warn").mockImplementation(() => {});
      vi.spyOn(api.auth, "logout").mockRejectedValue(new Error("offline"));
      renderSignedIn();

      await user.click(screen.getByRole("button", { name: "Sam" }));
      await user.click(screen.getByRole("button", { name: "Sign out" }));

      expect(await screen.findByRole("alert")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Sam" })).toBeInTheDocument();
      expect(
        screen.queryByRole("link", { name: "Sign in" }),
      ).not.toBeInTheDocument();
    });
  });
});
