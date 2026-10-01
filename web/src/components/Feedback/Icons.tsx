import { FeedbackIconProps } from "./types";
import styles from "./Feedback.module.css";

/** Stroke icons drawn in currentColor, so each badge colours its own glyph. */
export const FeedbackIcon = ({ state }: FeedbackIconProps) => {
    const common = {
        viewBox: "0 0 24 24",
        fill: "none",
        stroke: "currentColor",
        strokeWidth: 2.75,
        strokeLinecap: "round" as const,
        strokeLinejoin: "round" as const,
        className: styles.glyph,
        focusable: false,
    };

    switch (state) {
        case "checking":
            return (
                <svg {...common}>
                    <circle cx="12" cy="12" r="8" opacity="0.3" />
                    <path className={styles.spinnerArc} d="M12 4a8 8 0 0 1 8 8" />
                </svg>
            );
        case "correct":
            return (
                <svg {...common}>
                    <path className={styles.checkPath} pathLength={1} d="M5.5 12.5l4.25 4.25L18.5 8" />
                </svg>
            );
        case "not-yet":
            return (
                <svg {...common} className={`${styles.glyph} ${styles.retry}`}>
                    <path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3" />
                    <path d="M4.5 4.5v4h4" />
                </svg>
            );
        case "error":
            return (
                <svg {...common}>
                    <path d="M12 6.5v7" />
                    <path d="M12 17.5h.01" strokeWidth={3.25} />
                </svg>
            );
        case "idle":
        default:
            return (
                <svg {...common}>
                    <path d="M14.5 5.5l4 4" />
                    <path d="M5 19l1-4.5L16 4.5a1.4 1.4 0 0 1 2 0l1.5 1.5a1.4 1.4 0 0 1 0 2L9.5 18z" />
                </svg>
            );
    }
}
