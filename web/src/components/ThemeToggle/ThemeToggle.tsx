import { useEffect, useState } from "react";
import { applyTheme, currentTheme, nextTheme, readLocallyStoredTheme, watchSystemTheme } from "../../theme";
import { Theme } from "../../types";
import styles from "./ThemeToggle.module.css";

// One button, two modes. With nothing saved it starts from the OS preference.
export const ThemeToggle = () => {
    const [theme, setTheme] = useState<Theme>(currentTheme);

    // Until the learner picks, keep the icon in step with the OS.
    useEffect(() => watchSystemTheme((system) => {
        if (!readLocallyStoredTheme()) setTheme(system);
    }), []);

    const next = nextTheme(theme);

    const handleToggle = () => {
        applyTheme(next);
        setTheme(next);
    }

    // Named for what it does; the icon shows the mode it switches to.
    return (
        <button
            type="button"
            className={styles.toggle}
            onClick={handleToggle}
            aria-label={`Switch to ${next} theme`}
            title={`Switch to ${next} theme`}
        >
            {next === 'dark' ? <MoonIcon /> : <SunIcon />}
        </button>
    )
}

function MoonIcon() {
    return (
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
            <path
                d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinejoin="round"
            />
        </svg>
    )
}

function SunIcon() {
    return (
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
            <g fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" />
            </g>
        </svg>
    )
}
