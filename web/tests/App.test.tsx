import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/dom";

import { App } from "../src/App";
import { api } from "../src/api/client";

describe("App Layout Root", () => {
  it("renders the real homepage components on startup", async () => {
    vi.spyOn(api.auth, "getMe").mockResolvedValue(null);
    render(<App />);

    expect(screen.getByRole("contentinfo")).toBeInTheDocument();

    expect(await screen.findByText("Modules")).toBeInTheDocument();
    expect(
      await screen.findByRole("link", { name: "Sign in" }),
    ).toBeInTheDocument();
  });

  it("shows the loading skeleton while /me is pending", () => {
    vi.spyOn(api.auth, "getMe").mockReturnValue(new Promise(() => {}));

    render(<App />);

    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.getByText("Loading account details")).toBeInTheDocument();
  });
});
