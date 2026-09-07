import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ErrorState } from "../src/components/ErrorState";
import { ApiError } from "../src/api/client";

describe("ErrorState", () => {
  it("renders with assertive alert role and live region", () => {
    render(<ErrorState message="Something went wrong" />);
    const alert = screen.getByRole("alert");
    expect(alert).toHaveAttribute("aria-live", "assertive");
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
  });

  it("renders ApiError message without raw JSON body", () => {
    const apiError = new ApiError('{"detail": "Item not found"}', 404);
    render(<ErrorState message={apiError} />);
    expect(screen.getByText("Item not found")).toBeInTheDocument();
    expect(screen.queryByText(/\{"detail"/)).not.toBeInTheDocument();
  });

  it("extracts message from JSON string directly", () => {
    render(<ErrorState message='{"detail": "Invalid credentials"}' />);
    expect(screen.getByText("Invalid credentials")).toBeInTheDocument();

    render(<ErrorState message='{"message": "Custom error msg"}' />);
    expect(screen.getByText("Custom error msg")).toBeInTheDocument();
  });

  it("extracts validation errors if detail is an array", () => {
    const validationError = JSON.stringify({
      detail: [{ msg: "Value must be positive" }, { msg: "Required field" }],
    });
    render(<ErrorState message={validationError} />);
    expect(screen.getByText("Value must be positive, Required field")).toBeInTheDocument();
  });

  it("renders standard Error object message", () => {
    render(<ErrorState message={new Error("Network timeout")} />);
    expect(screen.getByText("Network timeout")).toBeInTheDocument();
  });

  it("falls back to default message when message is empty or null", () => {
    render(<ErrorState message={null} />);
    expect(screen.getByText("An unexpected error occurred.")).toBeInTheDocument();

    render(<ErrorState message="" />);
    expect(screen.getAllByText("An unexpected error occurred.")).toHaveLength(2);
  });

  it("renders plain string and ApiError simple message", () => {
    render(<ErrorState message="Plain error" />);
    expect(screen.getByText("Plain error")).toBeInTheDocument();

    const err = new ApiError("Can't reach the API.", 0);
    render(<ErrorState message={err} />);
    expect(screen.getByText("Can't reach the API.")).toBeInTheDocument();
  });

  it("calls retry handler when retry button is clicked", async () => {
    const user = userEvent.setup();
    const handleRetry = vi.fn();

    render(
      <ErrorState
        message="Failed to connect"
        retry={handleRetry}
        retryLabel="Retry connection"
      />
    );

    const retryButton = screen.getByRole("button", { name: "Retry connection" });
    expect(retryButton).toBeInTheDocument();

    await user.click(retryButton);
    expect(handleRetry).toHaveBeenCalledTimes(1);
  });

  it("does not render retry button when retry prop is omitted", () => {
    render(<ErrorState message="Failed to connect" />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("renders supplementary children content", () => {
    render(
      <ErrorState message="Server error">
        <span>Check your server logs</span>
      </ErrorState>
    );
    expect(screen.getByText("Check your server logs")).toBeInTheDocument();
  });
});
