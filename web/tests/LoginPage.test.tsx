import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { apiUrl } from "../src/api/client";
import { SettledAppRoutes } from "./helpers/app";
import { LoginPage } from "../src/pages/LoginPage";

describe("LoginPage", () => {
  it("renders page title and explanatory subtitle", () => {
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    );

    const heading = screen.getByRole("heading", {
      level: 1,
      name: "Sign in to Math Blasters",
    });
    expect(heading).toBeInTheDocument();
    expect(heading).toHaveAttribute("id", "login-heading");

    const section = screen.getByRole("region", {
      name: "Sign in to Math Blasters",
    });
    expect(section).toBeInTheDocument();
    expect(section).toHaveAttribute("aria-labelledby", "login-heading");

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
    expect(githubLink).toHaveAttribute("href", apiUrl("/auth/github/start"));
    expect(githubLink).toHaveClass("btn", "btn--secondary", "btn--lg");

    const googleLink = screen.getByRole("link", {
      name: "Continue with Google",
    });
    expect(googleLink).toHaveAttribute("href", apiUrl("/auth/google/start"));
    expect(googleLink).toHaveClass("btn", "btn--secondary", "btn--lg");
  });

  it("keeps provider links reachable in keyboard order", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    );

    const githubLink = screen.getByRole("link", { name: "Continue with GitHub" });
    const googleLink = screen.getByRole("link", { name: "Continue with Google" });

    githubLink.focus();
    expect(githubLink).toHaveFocus();

    await user.tab();
    expect(googleLink).toHaveFocus();

    await user.tab();
    expect(githubLink).not.toHaveFocus();
    expect(googleLink).not.toHaveFocus();
  });
  it("renders LoginPage when navigating to /login", async () => {
    render(
      <MemoryRouter initialEntries={["/login"]}>
        <SettledAppRoutes />
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
