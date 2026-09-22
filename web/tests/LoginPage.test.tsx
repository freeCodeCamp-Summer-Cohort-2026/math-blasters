import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { AppRoutes } from "../src/App";
import { LoginPage } from "../src/pages/LoginPage";

describe("LoginPage", () => {
  it("renders page title and explanatory subtitle", () => {
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Sign in to Math Blasters",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Sign in to save your progress and access your lessons anywhere.",
      ),
    ).toBeInTheDocument();
  });

  it("renders accessible provider links with correct target URLs", () => {
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    );

    const githubLink = screen.getByRole("link", {
      name: "Continue with GitHub",
    });
    expect(githubLink).toHaveAttribute("href", "/api/auth/login/github");
    expect(githubLink).toHaveClass("btn", "btn--secondary", "btn--lg");

    const googleLink = screen.getByRole("link", {
      name: "Continue with Google",
    });
    expect(googleLink).toHaveAttribute("href", "/api/auth/login/google");
    expect(googleLink).toHaveClass("btn", "btn--secondary", "btn--lg");
  });

  it("renders LoginPage when navigating to /login in AppRoutes", async () => {
    render(
      <MemoryRouter initialEntries={["/login"]}>
        <AppRoutes />
      </MemoryRouter>,
    );

    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: "Sign in to Math Blasters",
      }),
    ).toBeInTheDocument();
  });
});
