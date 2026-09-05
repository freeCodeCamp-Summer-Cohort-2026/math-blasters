import { FeedbackIconProps } from "./types";

export const FeedbackIcon = ({ state }: FeedbackIconProps) => {
    switch (state) {
        case "idle":
            return <span>🕒</span>;
        case "checking":
            return <span>⏳</span>;
        case "correct":
            return <span>✅</span>;
        case "not-yet":
            return <span>➡️</span>;
        case "error":
            return <span>❌</span>;
    }
}