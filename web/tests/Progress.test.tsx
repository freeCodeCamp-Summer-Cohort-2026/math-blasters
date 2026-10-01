import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import { api } from "../src/api/client";
import type { Account } from "../src/types";
import { SettledAppRoutes } from "./helpers/app";
import { expectNoA11yViolations } from "./helpers/a11y";

const account: Account = { id: "1", displayName: "Ada" };
const modulePath = "/modules/arithmetic-addition";

function renderAt(path: string, signedIn: Account | null = account) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <SettledAppRoutes account={signedIn} />
    </MemoryRouter>,
  );
}

function lessonLink(title: string) {
  return screen.getByRole("heading", { level: 3, name: title }).closest("a")!;
}

async function passAddingTwoNumbers() {
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: /^next$/i }));
  await user.type(screen.getByRole("spinbutton", { name: /your answer/i }), "7");
  await user.click(screen.getByRole("button", { name: /submit/i }));
  return user;
}

describe("progress", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("marks completed lessons on the module page, and only those", async () => {
    vi.spyOn(api, "getProgress").mockResolvedValue(["adding-two-numbers"]);
    renderAt(modulePath);

    const done = lessonLink("Adding Two Numbers");
    await waitFor(() => expect(within(done).getByText("Completed")).toBeInTheDocument());
    expect(done).toHaveAccessibleName("Tutorial: Adding Two Numbers, completed");

    const notDone = lessonLink("Counting On");
    expect(within(notDone).queryByText("Completed")).not.toBeInTheDocument();
    expect(notDone).toHaveAccessibleName("Tutorial: Counting On");
  });

  it("counts completed lessons on the module list", async () => {
    vi.spyOn(api, "getProgress").mockResolvedValue(["adding-two-numbers", "counting-on"]);
    renderAt("/");

    const card = (await screen.findByText("2 of 6 completed")).closest("a")!;
    expect(card).toHaveAccessibleName(/arithmetic addition.*2 of 6 completed/i);
  });

  it("shows a skeleton while progress loads", () => {
    vi.spyOn(api, "getProgress").mockReturnValue(new Promise(() => {}));
    renderAt(modulePath);

    expect(screen.getAllByText("Loading progress").length).toBeGreaterThan(0);
  });

  it("degrades to no ticks, never a broken page, when progress fails", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(api, "getProgress").mockRejectedValue(new Error("offline"));
    renderAt(modulePath);

    await waitFor(() => expect(screen.queryByText("Loading progress")).not.toBeInTheDocument());
    expect(screen.queryByText("Completed")).not.toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(6);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("neither fetches nor posts progress when signed out", async () => {
    const getProgress = vi.spyOn(api, "getProgress");
    const postCompletion = vi.spyOn(api, "postCompletion");
    renderAt("/lessons/adding-two-numbers", null);

    await passAddingTwoNumbers();
    await waitFor(() => expect(screen.getByRole("button", { name: /^next$/i })).toBeDisabled());

    expect(getProgress).not.toHaveBeenCalled();
    expect(postCompletion).not.toHaveBeenCalled();
  });

  it("posts once on passing and updates the marking without a refresh", async () => {
    vi.spyOn(api, "getProgress").mockResolvedValue([]);
    const postCompletion = vi.spyOn(api, "postCompletion").mockResolvedValue({
      lessonSlug: "adding-two-numbers",
      completedAt: "2026-09-30T12:00:00Z",
    });
    renderAt("/lessons/adding-two-numbers");

    const user = await passAddingTwoNumbers();
    await waitFor(() => expect(postCompletion).toHaveBeenCalledTimes(1));
    expect(postCompletion).toHaveBeenCalledWith("adding-two-numbers");

    // Same app, no reload: the module list and page already show it.
    await user.click(screen.getByRole("link", { name: "Math Blasters" }));
    expect(await screen.findByText("1 of 6 completed")).toBeInTheDocument();

    await user.click(screen.getByRole("link", { name: /arithmetic addition/i }));
    expect(lessonLink("Adding Two Numbers")).toHaveAccessibleName(
      "Tutorial: Adding Two Numbers, completed",
    );
    expect(postCompletion).toHaveBeenCalledTimes(1);
  });

  it("leaves the learner in the lesson with no error when the post fails", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(api, "getProgress").mockResolvedValue([]);
    const postCompletion = vi
      .spyOn(api, "postCompletion")
      .mockRejectedValue(new Error("offline"));
    renderAt("/lessons/adding-two-numbers");

    await passAddingTwoNumbers();
    await waitFor(() => expect(postCompletion).toHaveBeenCalledTimes(1));

    expect(screen.getByRole("heading", { name: /step 2 of 2/i })).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("has no accessibility violations with completed lessons marked", async () => {
    vi.spyOn(api, "getProgress").mockResolvedValue(["adding-two-numbers"]);
    const { container } = renderAt(modulePath);

    await waitFor(() => expect(screen.getByText("Completed")).toBeInTheDocument());
    await expectNoA11yViolations(container);
  });
});
