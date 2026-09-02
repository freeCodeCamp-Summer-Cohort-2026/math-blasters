import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { App } from "../src/App";
import { api, ApiError } from "../src/api/client";

const problem = { slug: "addition-demo", prompt: "What is 3 + 4?", expression: "3 + 4 = ?" };

afterEach(() => {
  vi.restoreAllMocks();
});

describe("App (setup check)", () => {
  it("renders the problem fetched from the API", async () => {
    vi.spyOn(api, "getDemoProblem").mockResolvedValue(problem);

    render(<App />);

    expect(await screen.findByText("What is 3 + 4?")).toBeInTheDocument();
    expect(screen.getByText("3 + 4 = ?")).toBeInTheDocument();
  });

  it("keeps Check disabled until an answer is entered", async () => {
    vi.spyOn(api, "getDemoProblem").mockResolvedValue(problem);

    render(<App />);
    await screen.findByRole("spinbutton");

    expect(screen.getByRole("button", { name: /check answer/i })).toBeDisabled();
  });

  it("reports a correct answer", async () => {
    const user = userEvent.setup();
    vi.spyOn(api, "getDemoProblem").mockResolvedValue(problem);
    vi.spyOn(api, "checkDemoAnswer").mockResolvedValue({ correct: true });

    render(<App />);
    await user.type(await screen.findByRole("spinbutton"), "7");
    await user.click(screen.getByRole("button", { name: /check answer/i }));

    expect(await screen.findByText("Correct.")).toBeInTheDocument();
  });

  it("reports a wrong answer", async () => {
    const user = userEvent.setup();
    vi.spyOn(api, "getDemoProblem").mockResolvedValue(problem);
    vi.spyOn(api, "checkDemoAnswer").mockResolvedValue({ correct: false });

    render(<App />);
    await user.type(await screen.findByRole("spinbutton"), "8");
    await user.click(screen.getByRole("button", { name: /check answer/i }));

    expect(await screen.findByText("Not quite.")).toBeInTheDocument();
  });

  it("sends the typed answer to the API as a number", async () => {
    const user = userEvent.setup();
    vi.spyOn(api, "getDemoProblem").mockResolvedValue(problem);
    const check = vi.spyOn(api, "checkDemoAnswer").mockResolvedValue({ correct: true });

    render(<App />);
    await user.type(await screen.findByRole("spinbutton"), "7");
    await user.click(screen.getByRole("button", { name: /check answer/i }));

    expect(check).toHaveBeenCalledWith(7);
  });

  it("clears the previous result when the answer changes", async () => {
    const user = userEvent.setup();
    vi.spyOn(api, "getDemoProblem").mockResolvedValue(problem);
    vi.spyOn(api, "checkDemoAnswer").mockResolvedValue({ correct: false });

    render(<App />);
    const input = await screen.findByRole("spinbutton");
    await user.type(input, "8");
    await user.click(screen.getByRole("button", { name: /check answer/i }));
    await screen.findByText("Not quite.");

    await user.type(input, "9");

    expect(screen.queryByText("Not quite.")).not.toBeInTheDocument();
  });

  it("explains how to fix an unreachable API", async () => {
    vi.spyOn(api, "getDemoProblem").mockRejectedValue(
      new ApiError("Can't reach the API. Is it running on port 8000?", 0),
    );

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/can't reach the api/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/docker compose up/)).toBeInTheDocument();
  });
});
