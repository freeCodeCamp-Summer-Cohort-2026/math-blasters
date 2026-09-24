import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/dom";

import { App } from "../src/App";
import { api } from "../src/api/client";

describe("App Layout Root", () => {
  it("renders the real homepage components on startup", async () => {
    render(<App initialLoading={false} />);

    expect(screen.getByRole("contentinfo")).toBeInTheDocument();

    expect(await screen.findByText("Modules")).toBeInTheDocument();
  });

  it("defaults initialLoading to true and shows loading skeleton on startup", () => {
    vi.spyOn(api.auth, "getMe").mockReturnValue(new Promise(() => {}));

    render(<App />);

    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.getByText("Loading account details")).toBeInTheDocument();
  });
});
