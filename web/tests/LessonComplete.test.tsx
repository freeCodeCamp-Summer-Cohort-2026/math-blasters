import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { LessonComplete } from "../src/components/LessonComplete";
import { expectNoA11yViolations } from "./helpers/a11y";

function renderComplete(show: boolean) {
  return render(
    <LessonComplete show={show}>
      <p>Sign-in invitation</p>
    </LessonComplete>,
  );
}

describe("LessonComplete", () => {
  it("keeps an empty live region mounted until shown, so the sentence is announced when it lands", () => {
    renderComplete(false);

    expect(screen.getByRole("status")).toBeEmptyDOMElement();
    expect(screen.queryByText("Sign-in invitation")).not.toBeInTheDocument();
  });

  it("announces one sentence and keeps its children out of the live region", () => {
    renderComplete(true);

    const status = screen.getByRole("status");
    expect(status).toHaveTextContent(/^Lesson complete\. Nice work!$/);
    expect(status).not.toContainElement(screen.getByText("Sign-in invitation"));
  });

  it("has no accessibility violations once shown", async () => {
    const { container } = renderComplete(true);

    await expectNoA11yViolations(container);
  });
});
