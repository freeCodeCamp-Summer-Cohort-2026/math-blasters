import { Theme } from "./types";

const STORAGE_KEY = 'theme';

const DARK_QUERY = '(prefers-color-scheme: dark)';

/** The learner's saved choice, or null if they haven't picked one (older 'system' values count as none). */
export const readLocallyStoredTheme = (): Theme | null => {
    try {
        const storedValue = localStorage.getItem(STORAGE_KEY);

        return storedValue === 'light' || storedValue === 'dark' ? storedValue : null;
    } catch (error) {
        console.log('local storage access blocked', error);
        return null;
    }
}

/** The OS preference; light where matchMedia is unavailable. */
export const systemTheme = (): Theme =>
    typeof window !== 'undefined' && window.matchMedia?.(DARK_QUERY).matches ? 'dark' : 'light';

/** What the page shows now: the saved choice, else the OS preference. */
export const currentTheme = (): Theme => readLocallyStoredTheme() ?? systemTheme();

const setThemeLocally = (theme: Theme): void => {
    try {
        localStorage.setItem(STORAGE_KEY, theme);
    } catch (error) {
        console.log('local storage access blocked', error);
    }
}

/** Pins the page to `theme` and remembers it; index.html re-applies it before first paint. */
export const applyTheme = (theme: Theme): void => {
    document.documentElement.setAttribute('data-theme', theme);
    setThemeLocally(theme);
}

export const nextTheme = (theme: Theme): Theme => (theme === 'light' ? 'dark' : 'light');

/** Calls `onChange` when the OS preference flips; returns the unsubscribe. */
export const watchSystemTheme = (onChange: (theme: Theme) => void): (() => void) => {
    const query = typeof window !== 'undefined' ? window.matchMedia?.(DARK_QUERY) : undefined;
    if (!query) return () => {};

    const listener = (event: MediaQueryListEvent) => onChange(event.matches ? 'dark' : 'light');
    query.addEventListener('change', listener);
    return () => query.removeEventListener('change', listener);
}
