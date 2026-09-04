import { useState } from "react";
import { applyTheme, nextTheme, readLocallyStoredTheme } from "../theme";
import { Theme } from "../types";

const LABEL: Record<Theme, string> = {
    'light': 'Light',
    'dark': 'Dark',
    'system': 'System'
}

export const ThemeToggle = () => {
    const [theme, setTheme] = useState<Theme>(readLocallyStoredTheme)

    const handleToggle = () => {
        const next = nextTheme(theme);
        applyTheme(next);
        setTheme(next);
    }

    return (
        <button 
            type="button"
            onClick={handleToggle} 
            aria-label={`Click to toggle theme, current theme is ${theme}`}
        >
            {LABEL[theme]}
        </button>
    )
}