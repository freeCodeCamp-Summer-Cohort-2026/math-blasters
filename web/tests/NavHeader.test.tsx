import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { NavHeader } from "../src/components/NavHeader/NavHeader";
import { AuthContext } from "../src/context/AuthContext";
import type { Account } from "../src/types";

describe("NavHeader", () => {
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
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
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
});
