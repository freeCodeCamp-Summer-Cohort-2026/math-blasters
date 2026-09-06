import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { api } from "../src/api/client";
import { AppRoutes } from "../src/App";

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

describe("Router & Layout", () => {
  it("renders the root layout landmarks: header, main outlet, and footer", async () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <AppRoutes />
      </MemoryRouter>,
    );

    expect(screen.getByRole("banner")).toBeInTheDocument();
    expect(screen.getByRole("main")).toBeInTheDocument();
    expect(screen.getByRole("contentinfo")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText(mockProblem.prompt)).toBeInTheDocument();
    });
  });

  it("renders the home page at route '/'", async () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <AppRoutes />
      </MemoryRouter>,
    );

    expect(await screen.findByText("What is 3 + 4?")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /setup check/i }),
    ).toBeInTheDocument();
  });

  it("renders the not-found page for an unknown path", () => {
    render(
      <MemoryRouter initialEntries={["/some/non-existent/path"]}>
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

  it("navigates from not-found page back to home when clicking 'Back to home'", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={["/not-found"]}>
        <AppRoutes />
      </MemoryRouter>,
    );

    const backHomeLink = screen.getByRole("link", { name: /back to home/i });
    await user.click(backHomeLink);

    expect(await screen.findByText("What is 3 + 4?")).toBeInTheDocument();
  });

  it("shifts focus to the main heading when the route changes", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={["/invalid-route"]}>
        <AppRoutes />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole("heading", { name: /page not found/i }),
    ).toBeInTheDocument();

    expect(document.body).toHaveFocus();

    const backHomeLink = screen.getByRole("link", { name: /back to home/i });
    await user.click(backHomeLink);

    const homeHeading = await screen.findByRole("heading", {
      name: /setup check/i,
    });
    expect(homeHeading).toHaveFocus();
  });
});
