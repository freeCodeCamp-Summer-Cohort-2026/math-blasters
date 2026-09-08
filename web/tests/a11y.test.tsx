import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, it, vi } from "vitest";

import { App, AppRoutes } from "../src/App";
import { api } from "../src/api/client";
import { expectNoA11yViolations } from "./helpers/a11y";

const mockProblem = {
  slug: "addition-demo",
  prompt: "What is 3 + 4?",
  expression: "3 + 4 = ?",
};

beforeEach(() => {
  vi.spyOn(api, "getDemoProblem").mockResolvedValue(mockProblem);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Accessibility checks (vitest-axe)", () => {
  it("home page and root layout should have no accessibility violations", async () => {
    const { container } = render(<App />);
    await screen.findByText("What is 3 + 4?");
    await expectNoA11yViolations(container);
  });

  it("loading skeleton state should have no accessibility violations", async () => {
    vi.spyOn(api, "getDemoProblem").mockReturnValue(new Promise(() => {}));
    const { container } = render(<App />);
    expect(screen.getAllByRole("status")).not.toHaveLength(0);
    await expectNoA11yViolations(container);
  });

  it("error state should have no accessibility violations", async () => {
    vi.spyOn(api, "getDemoProblem").mockRejectedValue(new Error("API offline"));
    const { container } = render(<App />);
    expect(await screen.findByRole("alert")).toBeInTheDocument();
    await expectNoA11yViolations(container);
  });

  it("not-found page and root layout should have no accessibility violations", async () => {
    const { container } = render(
      <MemoryRouter initialEntries={["/unknown-route"]}>
        <AppRoutes />
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { name: /page not found/i })).toBeInTheDocument();
    await expectNoA11yViolations(container);
  });
});
