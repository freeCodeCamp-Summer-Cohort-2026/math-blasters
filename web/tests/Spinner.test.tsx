import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Spinner } from "../src/components/Spinner";

describe("Spinner", () => {
  it("renders with polite live region and status role when not decorative", () => {
    render(<Spinner label="Loading items..." />);
    const spinner = screen.getByRole("status");
    expect(spinner).toHaveAttribute("aria-live", "polite");
    expect(spinner).toHaveClass("spinner", "spinner--md");
    expect(screen.getByText("Loading items...")).toBeInTheDocument();
  });

  it("renders with aria-hidden when isDecorative is true", () => {
    const { container } = render(<Spinner isDecorative />);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    const span = container.querySelector("span");
    expect(span).toHaveAttribute("aria-hidden", "true");
    expect(span).toHaveClass("spinner", "spinner--md");
  });

  it("renders sm size class", () => {
    const { container } = render(<Spinner size="sm" isDecorative />);
    expect(container.querySelector("span")).toHaveClass("spinner--sm");
  });

  it("renders md size class by default", () => {
    const { container } = render(<Spinner isDecorative />);
    expect(container.querySelector("span")).toHaveClass("spinner--md");
  });

  it("renders lg size class", () => {
    const { container } = render(<Spinner size="lg" isDecorative />);
    expect(container.querySelector("span")).toHaveClass("spinner--lg");
  });

  it("applies custom className", () => {
    const { container } = render(<Spinner className="custom-spin" isDecorative />);
    expect(container.querySelector("span")).toHaveClass("custom-spin");
  });
});
