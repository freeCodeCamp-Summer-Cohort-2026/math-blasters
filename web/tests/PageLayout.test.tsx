import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PageLayout } from "../src/components/PageLayout";

describe("PageLayout Component", () => {
  it("renders page heading slot and content", () => {
    render(
      <PageLayout heading={<h1>Dashboard Title</h1>}>
        <p>Main page content</p>
      </PageLayout>,
    );

    expect(
      screen.getByRole("heading", { level: 1, name: "Dashboard Title" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Main page content")).toBeInTheDocument();
  });

  it("renders the footer slot as a sibling of main, not nested inside it", () => {
    render(
      <PageLayout as="main" footer={<footer>Footer content</footer>}>
        <p>Main page content</p>
      </PageLayout>,
    );

    const footer = screen.getByText("Footer content");
    const main = screen.getByRole("main");

    expect(main).not.toContainElement(footer);
    expect(screen.getByRole("contentinfo")).toBe(footer.closest("footer"));
  });

  it("renders the content region as a section by default", () => {
    // The default has to be the safe one: every page sits inside the root
    // Layout, which already owns the document's main landmark.
    const { container } = render(
      <PageLayout>
        <p>Main page content</p>
      </PageLayout>,
    );

    expect(screen.queryByRole("main")).not.toBeInTheDocument();
    expect(container.querySelector("section.page-content")).toBeInTheDocument();
  });

  it("renders the content region as the given element instead", () => {
    render(
      <PageLayout as="main">
        <p>Main page content</p>
      </PageLayout>,
    );

    expect(screen.getByRole("main")).toBeInTheDocument();
  });
});
