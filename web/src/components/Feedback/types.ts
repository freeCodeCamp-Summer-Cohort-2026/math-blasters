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
}

export type FeedbackContent = {
    title: string
    announcement: string
}

export type FeedbackIconProps = {
    state: FeedbackState;
}