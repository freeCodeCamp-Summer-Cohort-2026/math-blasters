import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AnswerStep } from "../src/components/steps/AnswerStep";
import { expectNoA11yViolations } from "./helpers/a11y";

describe("AnswerStep", () => {
  it("renders the step's prompt through the markdown renderer", () => {
    render(<AnswerStep step={{ type: "answer", prompt: "What is 2 + 2?" }} onSubmit={vi.fn()} />);

    expect(screen.getByText("What is 2 + 2?")).toBeInTheDocument();
  });

  it("accepts input and fires onSubmit by button", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<AnswerStep step={{ type: "answer", prompt: "What is 2 + 2?" }} onSubmit={onSubmit} />);

    await user.type(screen.getByRole("spinbutton", { name: /your answer/i }), "4");
    await user.click(screen.getByRole("button", { name: /submit/i }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith("4");
  });

  it("accepts input and fires onSubmit on Enter", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<AnswerStep step={{ type: "answer", prompt: "What is 2 + 2?" }} onSubmit={onSubmit} />);

    await user.type(screen.getByRole("spinbutton", { name: /your answer/i }), "4{Enter}");

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith("4");
  });

  it("does not fire onSubmit for an empty submission", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<AnswerStep step={{ type: "answer", prompt: "What is 2 + 2?" }} onSubmit={onSubmit} />);

    await user.click(screen.getByRole("button", { name: /submit/i }));

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("disables input and submit while checking", () => {
    render(
      <AnswerStep
        step={{ type: "answer", prompt: "What is 2 + 2?" }}
        status="checking"
        onSubmit={vi.fn()}
      />,
    );

    expect(screen.getByRole("spinbutton", { name: /your answer/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /submit/i })).toBeDisabled();
  });

  it("renders the feedback slot exactly as given, and omits it when absent", () => {
    const { rerender } = render(
      <AnswerStep step={{ type: "answer", prompt: "What is 2 + 2?" }} onSubmit={vi.fn()} />,
    );
    expect(screen.queryByTestId("answer-step-feedback")).not.toBeInTheDocument();

    rerender(
      <AnswerStep
        step={{ type: "answer", prompt: "What is 2 + 2?" }}
        onSubmit={vi.fn()}
        feedback={<p>Not quite - try again.</p>}
      />,
    );
    expect(screen.getByTestId("answer-step-feedback")).toHaveTextContent("Not quite - try again.");
  });

  it("has no accessibility violations", async () => {
    const { container } = render(
      <AnswerStep step={{ type: "answer", prompt: "What is 2 + 2?" }} onSubmit={vi.fn()} />,
    );
    await expectNoA11yViolations(container);
  });
});
