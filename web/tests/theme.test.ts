import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { applyTheme, currentTheme, nextTheme, readLocallyStoredTheme } from "../src/theme";

function mockSystemDark(dark: boolean) {
    vi.stubGlobal("matchMedia", (query: string) => ({
        matches: dark && query.includes("dark"),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
    }));
}

describe("theme toggle and persistence check", () => {
    beforeEach(() => {
        localStorage.clear();
        document.documentElement.removeAttribute('data-theme');
    })

    afterEach(() => {
        vi.unstubAllGlobals();
    })

    it("toggles between light and dark only", () => {
        expect(nextTheme('light')).toBe('dark');
        expect(nextTheme('dark')).toBe('light');
    })

    it("applyTheme sets correct data-theme attribute and stores theme in localStorage", () => {
        applyTheme('light');
        expect(document.documentElement.getAttribute('data-theme')).toBe('light');
        expect(localStorage.getItem('theme')).toBe('light');

        applyTheme('dark');
        expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
        expect(localStorage.getItem('theme')).toBe('dark');
    })

    it("readLocallyStoredTheme returns the stored theme", () => {
        applyTheme('light');
        expect(readLocallyStoredTheme()).toBe('light');

        applyTheme('dark');
        expect(readLocallyStoredTheme()).toBe('dark');
    })

    it("readLocallyStoredTheme returns null when nothing, or an old 'system' value, is stored", () => {
        expect(readLocallyStoredTheme()).toBeNull();

        localStorage.setItem('theme', 'system');
        expect(readLocallyStoredTheme()).toBeNull();
    })

    it("currentTheme falls back to the OS preference until a theme is saved", () => {
        mockSystemDark(true);
        expect(currentTheme()).toBe('dark');

        applyTheme('light');
        expect(currentTheme()).toBe('light');
    })

    it("currentTheme is light where matchMedia is unavailable", () => {
        expect(currentTheme()).toBe('light');
    })
})
