import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { readFileSync } from "node:fs";
import { api } from "../src/api/client";
import { LessonStepper } from "../src/components/LessonStepper/LessonStepper";
import { AuthContext } from "../src/context/AuthContext";
import type { AuthContextValue } from "../src/context/AuthContext";
import { ProgressProvider } from "../src/context/ProgressContext";
import { getModule } from "../src/content";
import type { PageLesson } from "../src/content/types";
import { Homepage } from "../src/pages/Homepage";
import { LoginPage } from "../src/pages/LoginPage";
import type { Account } from "../src/types";
import { expectNoA11yViolations } from "./helpers/a11y";
import { SettledAppRoutes } from "./helpers/app";

const account: Account = { id: "usr_1", displayName: "Sam" };
const modulePath = "/modules/arithmetic-addition";
const moduleTitle = getModule("arithmetic-addition")!.title;
const PROMPT_NAME = /progress isn't saved/i;

const lesson: PageLesson = {
  slug: "addition-basics",
  title: "Addition Basics",
  type: "tutorial",
  steps: [
    { type: "explain", content: "Introduction to adding" },
    { type: "answer", prompt: "Calculate 1 + 1" },
  ],
};

function renderAt(path: string, signedInAs: Account | null = null) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <SettledAppRoutes account={signedInAs} />
    </MemoryRouter>,
  );
}

function authValue(overrides: Partial<AuthContextValue>): AuthContextValue {
  return { account: null, loading: false, logout: vi.fn(), ...overrides };
}

function renderLesson(auth: AuthContextValue) {
  return render(
    <AuthContext.Provider value={auth}>
      <MemoryRouter initialEntries={["/lessons/addition-basics"]}>
        <LessonStepper lesson={lesson} checker={() => ({ passed: true })} />
      </MemoryRouter>
    </AuthContext.Provider>,
  );
}

async function passLesson(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: /next/i }));
  await user.type(screen.getByRole("spinbutton", { name: /your answer/i }), "2");
  await user.click(screen.getByRole("button", { name: /submit/i }));
}

// Stops jsdom following the provider link off to the API; React's handler has already run.
function blockNavigation(event: MouseEvent) {
  event.preventDefault();
}

beforeEach(() => {
  sessionStorage.clear();
  window.addEventListener("click", blockNavigation);
  // Signed in, the routes ask for progress; left pending so no test reaches the network or updates late.
  vi.spyOn(api, "getProgress").mockReturnValue(new Promise(() => {}));
});

afterEach(() => {
  window.removeEventListener("click", blockNavigation);
});

describe("SignInPrompt on the module list and module page", () => {
  it.each(["/", modulePath])("renders signed out at %s, linking to /login", (path) => {
    renderAt(path);

    const prompt = screen.getByRole("region", { name: PROMPT_NAME });
    const link = within(prompt).getByRole("link", { name: "Sign in to save your progress" });
    expect(link).toHaveAttribute("href", "/login");
  });

  it.each(["/", modulePath])("is absent signed in at %s", (path) => {
    renderAt(path, account);

    expect(screen.queryByRole("region", { name: PROMPT_NAME })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /save your progress/i })).not.toBeInTheDocument();
  });

  it("is never rendered while auth is still loading", () => {
    render(
      <AuthContext.Provider value={authValue({ loading: true })}>
        <MemoryRouter>
          <ProgressProvider>
            <Homepage />
          </ProgressProvider>
        </MemoryRouter>
      </AuthContext.Provider>,
    );

    expect(screen.queryByRole("region", { name: PROMPT_NAME })).not.toBeInTheDocument();
  });

  it("shows one prompt per surface", () => {
    renderAt(modulePath);

    expect(screen.getAllByRole("link", { name: /save your progress/i })).toHaveLength(1);
  });

  it("dismisses for the session, per surface, and keeps focus in the page", async () => {
    const user = userEvent.setup();
    const { unmount } = renderAt(modulePath);

    await user.click(screen.getByRole("button", { name: "Not now" }));
    expect(screen.queryByRole("region", { name: PROMPT_NAME })).not.toBeInTheDocument();
    expect(document.getElementById("main-content")).toHaveFocus();
    unmount();

    // Coming back in the same session, it stays dismissed.
    const again = renderAt(modulePath);
    expect(screen.queryByRole("region", { name: PROMPT_NAME })).not.toBeInTheDocument();
    again.unmount();

    // The module list is its own surface.
    renderAt("/");
    expect(screen.getByRole("region", { name: PROMPT_NAME })).toBeInTheDocument();
  });

  it("is reachable by keyboard", async () => {
    const user = userEvent.setup();
    renderAt(modulePath);

    screen.getByRole("link", { name: /all modules/i }).focus();
    await user.tab();
    expect(screen.getByRole("link", { name: /save your progress/i })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole("button", { name: "Not now" })).toHaveFocus();
  });

  it("has no accessibility violations signed out", async () => {
    const { container } = renderAt(modulePath);

    expect(screen.getByRole("region", { name: PROMPT_NAME })).toBeInTheDocument();
    await expectNoA11yViolations(container);
  });

  it("is never coloured as an error", () => {
    const css = readFileSync("src/components/SignInPrompt/SignInPrompt.module.css", "utf8");
    // Comments stripped: the stylesheet names these tokens only to rule them out.
    expect(css.replace(/\/\*[\s\S]*?\*\//g, "")).not.toMatch(/--coral|--danger/);
  });
});

describe("SignInPrompt at the lesson's completion moment", () => {
  it("appears in a live region when the lesson passes signed out, without blocking the lesson", async () => {
    const user = userEvent.setup();
    renderLesson(authValue({}));

    const live = screen.getByRole("status");
    expect(live).toBeEmptyDOMElement();

    await passLesson(user);

    // Held back while "checking" is still on screen, so it never lands ahead of "Correct!".
    expect(screen.getByRole("region", { name: "checking feedback" })).toBeInTheDocument();
    expect(live).toBeEmptyDOMElement();

    await waitFor(() => {
      expect(within(live).getByRole("region", { name: /lesson complete/i })).toBeInTheDocument();
    });
    expect(within(live).getByText(/isn't saved yet/i)).toBeInTheDocument();
    expect(within(live).getByRole("link", { name: /save your progress/i })).toHaveAttribute("href", "/login");
    // Not a modal: nothing is trapped and the stepper's own controls stay usable.
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /back/i })).toBeEnabled();
  });

  it("is absent signed in, even once the lesson passes", async () => {
    const user = userEvent.setup();
    renderLesson(authValue({ account }));

    await passLesson(user);

    await waitFor(() => {
      expect(screen.queryByText("Calculate 1 + 1")).toBeInTheDocument();
    });
    // The answer step keeps its own live region; only the prompt's must be missing.
    expect(await screen.findByRole("region", { name: "correct feedback" })).toBeInTheDocument();
    expect(screen.getAllByRole("status")).toHaveLength(1);
    expect(screen.queryByRole("region", { name: /lesson complete/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /save your progress/i })).not.toBeInTheDocument();
  });

  it("is absent while auth is loading", async () => {
    const user = userEvent.setup();
    renderLesson(authValue({ loading: true }));

    await passLesson(user);

    expect(screen.queryByRole("link", { name: /save your progress/i })).not.toBeInTheDocument();
  });

  it("has no accessibility violations once shown", async () => {
    const user = userEvent.setup();
    const { container } = renderLesson(authValue({}));

    await passLesson(user);
    await screen.findByRole("region", { name: /lesson complete/i });
    await expectNoA11yViolations(container);
  });
});

describe("Returning after sign-in", () => {
  it("lands on the page the prompt was used from", async () => {
    const user = userEvent.setup();
    const signedOut = renderAt(modulePath);

    await user.click(screen.getByRole("link", { name: /save your progress/i }));
    await user.click(await screen.findByRole("link", { name: "Continue with GitHub" }));
    signedOut.unmount();

    // The OAuth callback reloads the app wherever the API redirects, here the homepage, now signed in.
    renderAt("/", account);

    expect(
      await screen.findByRole("heading", { level: 2, name: moduleTitle }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 1, name: "Modules" })).not.toBeInTheDocument();
  });

  it("returns to a lesson the prompt was used from", async () => {
    const user = userEvent.setup();
    render(
      <AuthContext.Provider value={authValue({})}>
        <MemoryRouter initialEntries={["/lessons/addition-basics"]}>
          <Routes>
            <Route path="/lessons/:slug" element={<LessonStepper lesson={lesson} checker={() => ({ passed: true })} />} />
            <Route path="/login" element={<LoginPage />} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>,
    );

    await passLesson(user);
    const link = await screen.findByRole("link", { name: /save your progress/i });
    await user.click(link);
    await user.click(await screen.findByRole("link", { name: "Continue with Google" }));

    expect(sessionStorage.getItem("mb:return-to")).toBe("/lessons/addition-basics");
  });

  it("uses the remembered page once, then forgets it", async () => {
    sessionStorage.setItem("mb:return-to", modulePath);
    const first = renderAt("/", account);
    await screen.findByRole("heading", { level: 2, name: moduleTitle });
    first.unmount();

    renderAt("/", account);
    expect(screen.getByRole("heading", { level: 1, name: "Modules" })).toBeInTheDocument();
  });

  it("drops the remembered page if sign-in was abandoned", () => {
    sessionStorage.setItem("mb:return-to", modulePath);
    renderAt("/");

    expect(screen.getByRole("heading", { level: 1, name: "Modules" })).toBeInTheDocument();
    expect(sessionStorage.getItem("mb:return-to")).toBeNull();
  });

  it.each([
    "//evil.example",
    "https://evil.example/",
    "/login",
    // The URL parser strips tabs and newlines and reads a backslash as a slash, so these mean //evil.example.
    "/\t/evil.example",
    "/\n/evil.example",
    "/\\evil.example",
    // Route matching ignores case and a trailing slash.
    "/LOGIN",
    "/login/",
  ])(
    "refuses to return to %s",
    (target) => {
      sessionStorage.setItem("mb:return-to", target);
      renderAt("/", account);

      expect(screen.getByRole("heading", { level: 1, name: "Modules" })).toBeInTheDocument();
    },
  );

  it("forgets a stale page when sign-in starts from the header instead", async () => {
    const user = userEvent.setup();
    renderAt("/login");
    sessionStorage.setItem("mb:return-to", modulePath);

    await user.click(screen.getByRole("link", { name: "Continue with GitHub" }));
    expect(sessionStorage.getItem("mb:return-to")).toBeNull();
  });
});
