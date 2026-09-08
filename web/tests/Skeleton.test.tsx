import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Skeleton } from "../src/components/Skeleton";

describe("Skeleton", () => {
  it("renders with polite live region and status role", () => {
    render(<Skeleton label="Loading cards..." />);
    const status = screen.getByRole("status");
    expect(status).toHaveAttribute("aria-live", "polite");
    expect(status).toHaveAttribute("aria-busy", "true");
    expect(screen.getByText("Loading cards...")).toBeInTheDocument();
  });

  it("renders default text variant", () => {
    const { container } = render(<Skeleton />);
    expect(container.firstChild).toHaveClass("skeleton--text");
  });

  it("renders rectangular variant", () => {
    const { container } = render(<Skeleton variant="rectangular" />);
    expect(container.firstChild).toHaveClass("skeleton--rectangular");
  });

  it("renders circular variant", () => {
    const { container } = render(<Skeleton variant="circular" />);
    expect(container.firstChild).toHaveClass("skeleton--circular");
  });

  it("renders card variant", () => {
    const { container } = render(<Skeleton variant="card" />);
    expect(container.firstChild).toHaveClass("skeleton--card");
  });

  it("renders multiple lines when lines > 1 for text variant", () => {
    render(<Skeleton variant="text" lines={3} label="Loading paragraph..." height="20px" />);
    const status = screen.getByRole("status");
    expect(status).toHaveClass("skeleton-group");
    const lines = status.querySelectorAll(".skeleton--text");
    expect(lines).toHaveLength(3);
    expect((lines[0] as HTMLElement).style.width).toBe("100%");
    expect((lines[1] as HTMLElement).style.width).toBe("100%");
    expect((lines[2] as HTMLElement).style.width).toBe("75%");
    expect((lines[2] as HTMLElement).style.height).toBe("20px");
  });

  it("applies custom width, height, style, and className", () => {
    const { container } = render(
      <Skeleton
        width={200}
        height="50px"
        className="custom-skeleton"
        style={{ margin: 10 }}
      />
    );
    const element = container.firstChild as HTMLElement;
    expect(element).toHaveClass("custom-skeleton");
    expect(element.style.width).toBe("200px");
    expect(element.style.height).toBe("50px");
    expect(element.style.margin).toBe("10px");
  });
});
