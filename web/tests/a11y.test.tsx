import { act, render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, it } from "vitest";

import { App, AppRoutes } from "../src/App";
import { expectNoA11yViolations } from "./helpers/a11y";

describe("Accessibility checks (vitest-axe)", () => {
  it("home page and root layout should have no accessibility violations", async () => {
    let container: HTMLElement;

    // act ensures any useEffect state updates settle before testing
    await act(async () => {
      const rendered = render(<App />);
      container = rendered.container;
    });

    await expectNoA11yViolations(container!);
  });

  it("not-found page and root layout should have no accessibility violations", async () => {
    let container: HTMLElement;

    await act(async () => {
      const rendered = render(
        <MemoryRouter initialEntries={["/unknown-route"]}>
          <AppRoutes />
        </MemoryRouter>,
      );
      container = rendered.container;
    });

    await expectNoA11yViolations(container!);
  });
});
