import { Theme } from "./types";

const STORAGE_KEY = 'theme';

const ORDER: Theme[] = ['light', 'dark', 'system'];

export const readLocallyStoredTheme = (): Theme => {
    try {
        const storedValue = localStorage.getItem(STORAGE_KEY);

        return storedValue == ORDER[0] || storedValue == ORDER[1] ? storedValue : ORDER[2];
    } catch (error) {
        console.log('local storage access blocked', error);
        // default to system
        return ORDER[2];
    }
}

const setThemeLocally = (theme: Theme): void => {
    try {
        localStorage.setItem(STORAGE_KEY, theme);
    } catch (error) {
        console.log('local storage access blocked', error);
    }
}

export const applyTheme = (theme: Theme): void => {
    /**
     * If theme is 'system', we remove data-theme attribute from document element, which allows system preference to take over. 
     * If theme is 'light' or 'dark', we set data-theme attribute accordingly to apply correct styles based on theme.
     */
    if (theme === 'system') {
        document.documentElement.removeAttribute('data-theme');
    } else {
        document.documentElement.setAttribute('data-theme', theme);
    }
    
    // regardless of whether theme is system or not, we want to store the user's preference locally
    setThemeLocally(theme);
}


export const nextTheme = (currentTheme: Theme): Theme => {
    const currentIndex = ORDER.indexOf(currentTheme);
    const nextIndex = (currentIndex + 1) % ORDER.length;
    const nextTheme = ORDER[nextIndex];

    return nextTheme;
}