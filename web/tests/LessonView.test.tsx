import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { SettledAppRoutes } from "./helpers/app";
import { expectNoA11yViolations } from "./helpers/a11y";

describe("LessonView Route (/lessons/:slug)", () => {
  it("renders the lesson player for a known lesson slug", () => {
    render(
      <MemoryRouter initialEntries={["/lessons/adding-two-numbers"]}>
        <SettledAppRoutes />
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
        <SettledAppRoutes />
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

  it("renders feedback from the real checker for a tutorial's answer step", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={["/lessons/adding-two-numbers"]}>
        <SettledAppRoutes />
      </MemoryRouter>,
    );
    await user.click(screen.getByRole("button", { name: /next/i }));

    await user.type(screen.getByRole("spinbutton", { name: /your answer/i }), "7{Enter}");

    expect(await screen.findByRole("region", { name: "correct feedback" })).toBeInTheDocument();
  });

  it("leads a passed tutorial on to the next lesson in its module", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={["/lessons/adding-two-numbers"]}>
        <SettledAppRoutes />
      </MemoryRouter>,
    );
    await user.click(screen.getByRole("button", { name: /next/i }));

    await user.type(screen.getByRole("spinbutton", { name: /your answer/i }), "7{Enter}");

    const link = await screen.findByRole("link", { name: "Next lesson: Counting On" });
    expect(link).toHaveAttribute("href", "/lessons/counting-on");
    await user.click(link);

    expect(await screen.findByRole("heading", { name: "Counting On" })).toBeInTheDocument();
    // The new lesson starts from its first step, not the old lesson's progress.
    expect(screen.getByRole("heading", { name: /step 1 of/i })).toBeInTheDocument();
  });

  it("leads the module's last tutorial on to its lab", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={["/lessons/adding-two-digit-numbers"]}>
        <SettledAppRoutes />
      </MemoryRouter>,
    );
    await user.click(screen.getByRole("button", { name: /next/i }));
    await user.type(screen.getByRole("spinbutton", { name: /your answer/i }), "57{Enter}");
    await user.click(await screen.findByRole("button", { name: /^next$/i }));
    await user.click(screen.getByRole("button", { name: /^next$/i }));
    await user.type(screen.getByRole("spinbutton", { name: /your answer/i }), "83{Enter}");

    const link = await screen.findByRole("link", { name: "On to the lab: Marbles in Total" });
    expect(link).toHaveAttribute("href", "/lessons/marbles-in-total");
  });

  it("renders the not-found route for an unknown lesson slug", () => {
    render(
      <MemoryRouter initialEntries={["/lessons/non-existent-lesson"]}>
        <SettledAppRoutes />
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
        <SettledAppRoutes />
      </MemoryRouter>,
    );

    await expectNoA11yViolations(container);
  });
});
