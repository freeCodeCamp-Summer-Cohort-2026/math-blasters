import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { Layout } from "../src/components/Layout";
import { AuthContext } from "../src/context/AuthContext";
import type { Account } from "../src/types";

describe("Layout Header Three-State Integration", () => {
  it("renders loading skeleton during auth initialization and never flashes 'Sign in'", () => {
    render(
      <AuthContext.Provider
        value={{ account: null, loading: true, logout: vi.fn() }}
      >
        <MemoryRouter>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<div>Test page</div>} />
            </Route>
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>,
    );

    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.getByText("Loading account details")).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Sign in" }),
    ).not.toBeInTheDocument();
  });

  it("renders 'Sign in' link when user is signed out", () => {
    render(
      <AuthContext.Provider
        value={{ account: null, loading: false, logout: vi.fn() }}
      >
        <MemoryRouter>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<div>Test page</div>} />
            </Route>
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>,
    );

    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute(
      "href",
      "/login",
    );
  });

  it("renders AccountMenu when user is signed in", () => {
    const mockAccount: Account = {
      id: "usr_77",
      displayName: "Sam",
    };

    render(
      <AuthContext.Provider
        value={{ account: mockAccount, loading: false, logout: vi.fn() }}
      >
        <MemoryRouter>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<div>Test page</div>} />
            </Route>
          </Routes>
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
