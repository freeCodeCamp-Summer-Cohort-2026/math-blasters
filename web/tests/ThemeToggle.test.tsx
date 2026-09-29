import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ThemeToggle } from "../src/components/ThemeToggle/ThemeToggle";
import { expectNoA11yViolations } from "./helpers/a11y";

describe("ThemeToggle", () => {
    beforeEach(() => {
        localStorage.clear();
        document.documentElement.removeAttribute('data-theme');
    })

    afterEach(() => {
        vi.unstubAllGlobals();
    })

    it("is an icon button named for the mode it switches to, with no visible text", () => {
        render(<ThemeToggle />);

        const button = screen.getByRole("button", { name: "Switch to dark theme" });
        expect(button).toHaveTextContent("");
        expect(button.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
    })

    it("flips between light and dark, and never offers a third mode", async () => {
        const user = userEvent.setup();
        render(<ThemeToggle />);

        await user.click(screen.getByRole("button", { name: "Switch to dark theme" }));
        expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
        expect(localStorage.getItem('theme')).toBe('dark');

        await user.click(screen.getByRole("button", { name: "Switch to light theme" }));
        expect(document.documentElement.getAttribute('data-theme')).toBe('light');

        await user.click(screen.getByRole("button", { name: "Switch to dark theme" }));
        expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    })

    it("starts from the saved theme", () => {
        localStorage.setItem('theme', 'dark');
        render(<ThemeToggle />);

        expect(screen.getByRole("button", { name: "Switch to light theme" })).toBeInTheDocument();
    })

    it("starts from the OS preference when nothing is saved", () => {
        vi.stubGlobal("matchMedia", () => ({
            matches: true,
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
        }));
        render(<ThemeToggle />);

        expect(screen.getByRole("button", { name: "Switch to light theme" })).toBeInTheDocument();
        // Following the OS, not pinned: nothing is written until the learner clicks.
        expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
    })

    it("has no accessibility violations", async () => {
        const { container } = render(<ThemeToggle />);
        await expectNoA11yViolations(container);
    })
})
