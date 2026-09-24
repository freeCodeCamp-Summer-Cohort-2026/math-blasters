import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { AppRoutes } from "../src/App";
import { expectNoA11yViolations } from "./helpers/a11y";

describe("LessonView Route (/lessons/:slug)", () => {
  it("renders the lesson player for a known lesson slug", () => {
    render(
      <MemoryRouter initialEntries={["/lessons/adding-two-numbers"]}>
        <AppRoutes />
      </MemoryRouter>,
    );

    // Section title matches lesson title
    expect(
      screen.getByRole("heading", { name: /adding two numbers/i }),
    ).toBeInTheDocument();

    // Stepper rendered
    expect(
      screen.getByRole("heading", { name: /step 1 of 2/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /next/i })).toBeInTheDocument();
  });

  it("links Back on the first step to the module the lesson belongs to", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={["/lessons/adding-two-numbers"]}>
        <AppRoutes />
      </MemoryRouter>,
    );

    const backLink = screen.getByRole("link", { name: /back/i });
    expect(backLink).toHaveAttribute("href", "/modules/arithmetic-addition");

    await user.click(backLink);

    expect(
      screen.getByRole("heading", { name: /arithmetic addition/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/adding two numbers/i)).toBeInTheDocument();
  });

  it("renders the not-found route for an unknown lesson slug", () => {
    render(
      <MemoryRouter initialEntries={["/lessons/non-existent-lesson"]}>
        <AppRoutes />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole("heading", { name: /page not found/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/the page you're looking for doesn't exist/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /back to home/i }),
    ).toBeInTheDocument();
  });

  it("has no accessibility violations on the lesson page", async () => {
    const { container } = render(
      <MemoryRouter initialEntries={["/lessons/adding-two-numbers"]}>
        <AppRoutes />
      </MemoryRouter>,
    );

    await expectNoA11yViolations(container);
  });
});
