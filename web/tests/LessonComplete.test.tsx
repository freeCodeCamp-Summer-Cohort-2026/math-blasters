import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { LessonComplete } from "../src/components/LessonComplete";

function renderComplete(show: boolean) {
  return render(
    <LessonComplete show={show}>
      <p>Sign-in invitation</p>
    </LessonComplete>,
  );
}

describe("LessonComplete", () => {
  it("renders nothing until shown", () => {
  renderComplete(false);

  expect(screen.queryByText("Sign-in invitation")).not.toBeInTheDocument();
  });

  it("renders its children once shown, with no live region of its own", () => {
    renderComplete(true);

    expect(screen.getByText("Sign-in invitation")).toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});
