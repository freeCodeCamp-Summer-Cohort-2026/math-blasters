import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";

import { AppRoutes } from "../src/App";

describe("Router & Layout", () => {
  it("renders the root layout landmarks: header, main outlet, and footer", async () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <AppRoutes />
      </MemoryRouter>,
    );

    expect(screen.getByRole("contentinfo")).toBeInTheDocument();
  });

  it("renders the home page at route '/'", async () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <AppRoutes />
      </MemoryRouter>,
    );

    expect(await screen.findByText("Modules")).toBeInTheDocument();
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

    expect(await screen.findByText("Modules")).toBeInTheDocument();
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

    const homeHeading = screen.getByRole("heading", { name: /modules/i });
    expect(homeHeading).toBeInTheDocument();

    expect(homeHeading).toHaveFocus();
  });
});
