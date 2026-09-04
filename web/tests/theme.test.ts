import { describe, it, expect, beforeEach } from "vitest";
import { Theme } from "../src/types";
import { applyTheme, nextTheme, readLocallyStoredTheme } from "../src/theme";

describe("theme cycle and persistence check", () => {
    beforeEach(() => {
        localStorage.clear();
        document.documentElement.removeAttribute('data-theme');
    })

    it("cycles from light to dark to system", () => {
        const sequence: Theme[] = [];

        let currentTheme: Theme = 'light';
        for (let i = 0; i < 3; i++) {
            const next = nextTheme(currentTheme);
            sequence.push(next);
            currentTheme = next;
        }

        expect(sequence).toEqual(['dark', 'system', 'light']);
    })

    it("applyTheme sets correct data-theme attribute and stores theme in localStorage", () => {
        applyTheme('light');
        expect(document.documentElement.getAttribute('data-theme')).toBe('light');
        expect(localStorage.getItem('theme')).toBe('light');

        applyTheme('dark');
        expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
        expect(localStorage.getItem('theme')).toBe('dark');

        applyTheme('system');
        expect(document.documentElement.getAttribute('data-theme')).toBeNull();
        expect(localStorage.getItem('theme')).toBe('system');
    })

    it("readLocallyStoredTheme returns the stored theme or defaults to system", () => {
        applyTheme('light');
        expect(readLocallyStoredTheme()).toBe('light');

        applyTheme('dark');
        expect(readLocallyStoredTheme()).toBe('dark');
    })

    it("readLocallyStoredTheme defaults to system if theme is not found in localStorage", () => {
        expect(readLocallyStoredTheme()).toBe('system');
    })
})