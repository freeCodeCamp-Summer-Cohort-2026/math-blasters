import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { api } from "../src/api/client";
import { SettledAppRoutes } from "./helpers/app";
import { getModule } from "../src/content";
import { LessonCard } from "../src/pages/ModulePage";
import { expectNoA11yViolations } from "./helpers/a11y";
import type { Account } from "../src/types";

// The real module, not the fixture: the fixture holds only some of its lessons.
const module = getModule("arithmetic-addition")!;
const modulePath = `/modules/${module.slug}`;

function renderAt(path: string, account: Account | null = null) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <SettledAppRoutes account={account} />
    </MemoryRouter>,
  );
}

describe("ModulePage", () => {
  // Signed in, the page asks for progress; stubbed so no test reaches the network.
  beforeEach(() => {
    vi.spyOn(api, "getProgress").mockResolvedValue([]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the module's title, description and lesson count", () => {
    renderAt(modulePath);

    expect(
      screen.getByRole("heading", { level: 2, name: module.title }),
    ).toBeInTheDocument();
    expect(screen.getByText(module.description!)).toBeInTheDocument();
    expect(
      screen.getByText(`${module.lessons.length} lessons`),
    ).toBeInTheDocument();
  });

  it("lists every lesson in the module, each linking to its lesson route", () => {
    renderAt(modulePath);

    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(module.lessons.length);

    for (const lesson of module.lessons) {
      const heading = screen.getByRole("heading", {
        level: 3,
        name: lesson.title,
      });
      const card = heading.closest("a");

      expect(card).toHaveAttribute("href", `/lessons/${lesson.slug}`);
    }
  });

  it("renders the lessons in the module's authored order", () => {
    renderAt(modulePath);

    const titles = screen
      .getAllByRole("heading", { level: 3 })
      .map((heading) => heading.textContent);

    expect(titles).toEqual(module.lessons.map((lesson) => lesson.title));
  });

  it("shows each lesson's type in text, not by colour alone", () => {
    renderAt(modulePath);

    const tutorial = screen
      .getByRole("heading", { level: 3, name: "Adding Two Numbers" })
      .closest("a")!;
    const lab = screen
      .getByRole("heading", { level: 3, name: "Marbles in Total" })
      .closest("a")!;

    expect(within(tutorial).getByText("Tutorial")).toBeInTheDocument();
    expect(within(lab).getByText("Lab")).toBeInTheDocument();

    // The type has to survive greyscale: it is in the link's accessible name.
    expect(tutorial).toHaveAccessibleName(/tutorial/i);
    expect(lab).toHaveAccessibleName(/lab/i);
  });

  it("wraps each lesson in exactly one link, not a nested pile of them", () => {
    renderAt(modulePath);

    for (const item of screen.getAllByRole("listitem")) {
      expect(within(item).getAllByRole("link")).toHaveLength(1);
    }
  });

  it("renders the not-found route for an unknown module slug", () => {
    renderAt("/modules/no-such-module");

    expect(
      screen.getByRole("heading", { name: /page not found/i }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });

  it("links back to the module list", async () => {
    const user = userEvent.setup();
    renderAt(modulePath);

    const back = screen.getByRole("link", { name: /all modules/i });
    expect(back).toHaveAttribute("href", "/");

    await user.click(back);
    // The homepage has a list of its own now, so check for its heading instead.
    expect(
      screen.getByRole("heading", { level: 1, name: "Modules" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /all modules/i }),
    ).not.toBeInTheDocument();
  });

  it("keeps the lesson links keyboard reachable in document order", async () => {
    const user = userEvent.setup();
    // Signed in, so the sign-in prompt (covered in SignInPrompt.test.tsx) isn't in the tab order.
    renderAt(modulePath, { id: "usr_1", displayName: "Sam" });

    const lessonLinks = screen
      .getAllByRole("heading", { level: 3 })
      .map((heading) => heading.closest("a"));

    // Start from the back link, which sits immediately before the list.
    screen.getByRole("link", { name: /all modules/i }).focus();

    for (const link of lessonLinks) {
      await user.tab();
      expect(link).toHaveFocus();
    }
  });

  it("renders the shape of the module, never a lesson's step content", () => {
    const { container } = renderAt(modulePath);

    // Step prose and answer prompts belong to the lesson player, not here.
    for (const lesson of module.lessons) {
      for (const step of lesson.steps) {
        const text = step.type === "explain" ? step.content : step.prompt;
        expect(container.textContent).not.toContain(text);
      }
    }
  });

  it("has no accessibility violations inside the root layout", async () => {
    const { container } = renderAt(modulePath);

    expect(
      screen.getByRole("heading", { level: 2, name: module.title }),
    ).toBeInTheDocument();
    await expectNoA11yViolations(container);
  });
});

describe("LessonCard lock state", () => {
  const lab = module.lessons.find((lesson) => lesson.slug === "marbles-in-total")!;
  // Driven from a fixture: #119 computes the real value from progress.
  const lockReasonFixture = {
    tutorialSlug: "adding-two-numbers",
    title: "Adding Two Numbers",
  };

  function renderCard(
    lockReason: { tutorialSlug: string; title: string } | null,
    completed = false,
  ) {
    return render(
      <MemoryRouter>
        <ol className="lesson-list">
          <li>
            <LessonCard
              lesson={lab}
              position={6}
              completed={completed}
              progressLoading={false}
              lockReason={lockReason}
            />
          </li>
        </ol>
      </MemoryRouter>,
    );
  }

  it("renders a locked lab as a named group with a visible lock, not a link", () => {
    renderCard(lockReasonFixture);

    const group = screen.getByRole("group", {
      name: "Lab: Marbles in Total, locked",
    });
    expect(
      within(group).getByRole("heading", { level: 3, name: "Marbles in Total" }),
    ).toBeInTheDocument();
    expect(within(group).getByText("Locked")).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /marbles in total/i }),
    ).not.toBeInTheDocument();
    expect(document.querySelector('a[href="/lessons/marbles-in-total"]')).toBeNull();
  });

  it("names the tutorial from the reason and links to it", () => {
    renderCard(lockReasonFixture);

    const link = screen.getByRole("link", { name: "Adding Two Numbers" });
    expect(link).toHaveAttribute("href", "/lessons/adding-two-numbers");
    expect(link.closest("p")).toHaveTextContent("Finish Adding Two Numbers first.");
    expect(within(screen.getByRole("listitem")).getAllByRole("link")).toHaveLength(1);
  });

  it("renders whatever tutorial the prop names, without working it out itself", () => {
    renderCard({ tutorialSlug: "counting-on", title: "Counting On" });

    const link = screen.getByRole("link", { name: "Counting On" });
    expect(link).toHaveAttribute("href", "/lessons/counting-on");
    expect(link.closest("p")).toHaveTextContent("Finish Counting On first.");
    expect(screen.queryByText("Adding Two Numbers")).not.toBeInTheDocument();
  });

  it("keeps the locked card out of the tab order; only the reason's link takes focus", async () => {
    const user = userEvent.setup();
    renderCard(lockReasonFixture);

    const group = screen.getByRole("group", { name: /locked/i });
    expect(group).not.toHaveAttribute("tabindex");
    expect(group).not.toHaveAttribute("aria-disabled");

    await user.tab();
    expect(screen.getByRole("link", { name: "Adding Two Numbers" })).toHaveFocus();

    await user.tab();
    expect(document.body).toHaveFocus();
  });

  it("renders an unlocked lab as one link to the lab, with no lock", () => {
    renderCard(null);

    const link = screen.getByRole("link", { name: "Lab: Marbles in Total" });
    expect(link).toHaveAttribute("href", "/lessons/marbles-in-total");
    expect(screen.getAllByRole("heading", { level: 3 })).toHaveLength(1);
    expect(screen.queryByText("Locked")).not.toBeInTheDocument();
    expect(screen.queryByRole("group")).not.toBeInTheDocument();
    expect(screen.queryByText(/^Finish/)).not.toBeInTheDocument();
  });

  it("keeps completion in the name of a locked lab", () => {
    renderCard(lockReasonFixture, true);

    expect(
      screen.getByRole("group", {
        name: "Lab: Marbles in Total, completed, locked",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("Completed")).toBeInTheDocument();
  });

  it("has no accessibility violations locked", async () => {
    const { container } = renderCard(lockReasonFixture);

    await expectNoA11yViolations(container);
  });

  it("has no accessibility violations unlocked", async () => {
    const { container } = renderCard(null);

    await expectNoA11yViolations(container);
  });
});
