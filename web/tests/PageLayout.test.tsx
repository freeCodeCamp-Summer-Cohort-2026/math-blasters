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
});
