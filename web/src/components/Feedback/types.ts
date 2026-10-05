import type { ReactNode } from "react";

export const FEEDBACKSTATES = [
    "idle",
    "checking",
    "correct",
    "not-yet",
    "error"
] as const;

export type FeedbackState = (typeof FEEDBACKSTATES)[number];

export interface FeedbackProps {
    state: FeedbackState;
    /** Replaces the state's own title, such as the blank-submit prompt in the idle state. */
    title?: string;
    /** Extra detail under the title, such as the not-yet explanation. */
    children?: ReactNode;
}

export type FeedbackContent = {
    title: string
    /** The visible line under the title, unless the caller passes its own detail. */
    detail: string
    announcement: string
}

export type FeedbackIconProps = {
    state: FeedbackState;
}
