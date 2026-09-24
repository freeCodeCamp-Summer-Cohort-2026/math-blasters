import { fireEvent, render, screen } from "@testing-library/react";
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

  const signOut = () => screen.queryByRole("button", { name: "Sign out" });

  it("renders trigger button with avatar alt='' and adjacent display name", () => {
    render(<AccountMenu account={mockAccount} onLogout={vi.fn()} />);

    const trigger = screen.getByRole("button", {
      name: "Katherine Johnson",
    });
    expect(trigger).not.toHaveAttribute("aria-haspopup");
    expect(trigger).toHaveAttribute("aria-expanded", "false");

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

  it("renders initials fallback when avatar image fails to load", () => {
    render(<AccountMenu account={mockAccount} onLogout={vi.fn()} />);

    const trigger = screen.getByRole("button", {
      name: "Katherine Johnson",
    });
    const img = trigger.querySelector("img");
    expect(img).toBeInTheDocument();

    fireEvent.error(img!);

    expect(trigger.querySelector("img")).toBeNull();
    const fallback = screen.getByText("KJ");
    expect(fallback).toBeInTheDocument();
    expect(fallback).toHaveAttribute("aria-hidden", "true");
  });

  it("opens the panel on click, sets aria-expanded and aria-controls, and exposes Sign out", async () => {
    const user = userEvent.setup();
    render(<AccountMenu account={mockAccount} onLogout={vi.fn()} />);

    const trigger = screen.getByRole("button", {
      name: "Katherine Johnson",
    });

    expect(signOut()).not.toBeInTheDocument();
    expect(trigger).not.toHaveAttribute("aria-controls");

    await user.click(trigger);

    expect(trigger).toHaveAttribute("aria-expanded", "true");
    const panelId = trigger.getAttribute("aria-controls");
    expect(panelId).toBeTruthy();
    expect(document.getElementById(panelId!)).toContainElement(signOut());
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("closes dropdown and restores focus to trigger on Escape key", async () => {
    const user = userEvent.setup();
    render(<AccountMenu account={mockAccount} onLogout={vi.fn()} />);

    const trigger = screen.getByRole("button", {
      name: "Katherine Johnson",
    });

    await user.click(trigger);
    expect(signOut()).toBeInTheDocument();

    await user.keyboard("{Escape}");

    expect(signOut()).not.toBeInTheDocument();
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
    expect(signOut()).toBeInTheDocument();

    await user.click(screen.getByTestId("outside"));
    expect(signOut()).not.toBeInTheDocument();
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });

  it("closes dropdown when focus moves outside the menu container", async () => {
    const user = userEvent.setup();
    render(
      <div>
        <AccountMenu account={mockAccount} onLogout={vi.fn()} />
        <button type="button">Outside focusable</button>
      </div>,
    );

    const trigger = screen.getByRole("button", {
      name: "Katherine Johnson",
    });

    await user.click(trigger);
    expect(signOut()).toBeInTheDocument();

    await user.tab();
    expect(signOut()).toHaveFocus();

    await user.tab();
    expect(
      screen.getByRole("button", { name: "Outside focusable" }),
    ).toHaveFocus();

    expect(signOut()).not.toBeInTheDocument();
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });

  it("invokes onLogout and closes when clicking Sign out", async () => {
    const user = userEvent.setup();
    const onLogout = vi.fn();
    render(<AccountMenu account={mockAccount} onLogout={onLogout} />);

    await user.click(
      screen.getByRole("button", { name: "Katherine Johnson" }),
    );

    await user.click(screen.getByRole("button", { name: "Sign out" }));

    expect(onLogout).toHaveBeenCalledTimes(1);
    expect(signOut()).not.toBeInTheDocument();
  });

  it("stays open and says so when sign-out fails", async () => {
    const user = userEvent.setup();
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const onLogout = vi.fn().mockRejectedValueOnce(new Error("offline"));
    render(<AccountMenu account={mockAccount} onLogout={onLogout} />);

    await user.click(
      screen.getByRole("button", { name: "Katherine Johnson" }),
    );
    await user.click(screen.getByRole("button", { name: "Sign out" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Couldn't sign out. Please try again.",
    );
    expect(signOut()).toBeInTheDocument();
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});
