import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AccountMenu } from "../src/components/AccountMenu/AccountMenu";
import type { Account } from "../src/types";

describe("AccountMenu", () => {
  const mockAccount: Account = {
    id: "usr_100",
    displayName: "Katherine Johnson",
    avatarUrl: "https://example.com/katherine.png",
  };

  it("renders trigger button with avatar alt='' and adjacent display name", () => {
    render(<AccountMenu account={mockAccount} onLogout={vi.fn()} />);

    const trigger = screen.getByRole("button", {
      name: "Katherine Johnson",
    });
    expect(trigger).toHaveAttribute("aria-haspopup", "menu");
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(trigger).toHaveAttribute("aria-controls", "account-menu-dropdown");

    const img = trigger.querySelector("img");
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute("alt", "");
    expect(img).toHaveAttribute("src", "https://example.com/katherine.png");

    expect(screen.getByText("Katherine Johnson")).toBeInTheDocument();
  });

  it("renders initials fallback when avatarUrl is missing", () => {
    const accountNoAvatar: Account = {
      id: "usr_101",
      displayName: "Katherine Johnson",
    };

    render(<AccountMenu account={accountNoAvatar} onLogout={vi.fn()} />);

    const trigger = screen.getByRole("button", {
      name: "Katherine Johnson",
    });
    expect(trigger.querySelector("img")).toBeNull();
    const fallback = screen.getByText("KJ");
    expect(fallback).toHaveAttribute("aria-hidden", "true");
  });

  it("opens dropdown on click, sets aria-expanded='true', and exposes menu items", async () => {
    const user = userEvent.setup();
    render(<AccountMenu account={mockAccount} onLogout={vi.fn()} />);

    const trigger = screen.getByRole("button", {
      name: "Katherine Johnson",
    });

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();

    await user.click(trigger);

    expect(trigger).toHaveAttribute("aria-expanded", "true");
    const menu = screen.getByRole("menu");
    expect(menu).toHaveAttribute("id", "account-menu-dropdown");
    expect(screen.getByRole("menuitem", { name: "Sign out" })).toBeInTheDocument();
  });

  it("closes dropdown and restores focus to trigger on Escape key", async () => {
    const user = userEvent.setup();
    render(<AccountMenu account={mockAccount} onLogout={vi.fn()} />);

    const trigger = screen.getByRole("button", {
      name: "Katherine Johnson",
    });

    await user.click(trigger);
    expect(screen.getByRole("menu")).toBeInTheDocument();

    await user.keyboard("{Escape}");

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(trigger).toHaveFocus();
  });

  it("closes dropdown when clicking outside", async () => {
    const user = userEvent.setup();
    render(
      <div>
        <div data-testid="outside">Outside area</div>
        <AccountMenu account={mockAccount} onLogout={vi.fn()} />
      </div>,
    );

    const trigger = screen.getByRole("button", {
      name: "Katherine Johnson",
    });

    await user.click(trigger);
    expect(screen.getByRole("menu")).toBeInTheDocument();

    await user.click(screen.getByTestId("outside"));
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });

  it("invokes onLogout when clicking 'Sign out' menuitem", async () => {
    const user = userEvent.setup();
    const onLogout = vi.fn();
    render(<AccountMenu account={mockAccount} onLogout={onLogout} />);

    await user.click(
      screen.getByRole("button", { name: "Katherine Johnson" }),
    );

    const signOutItem = screen.getByRole("menuitem", { name: "Sign out" });
    await user.click(signOutItem);

    expect(onLogout).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });
});
