import { FeedbackContent, FeedbackState } from "./types";

export const feedbackContent: Record<FeedbackState, FeedbackContent> = {
    "idle": {
        title: "Ready when you are",
        detail: "Type your answer, then press Submit.",
        announcement: "Enter your answer and press Submit to check it."
    },
    "checking": {
        title: "Checking your answer…",
        detail: "Hang tight, this only takes a moment.",
        announcement: "Checking your answer."
    },
    "correct": {
        title: "Correct!",
        detail: "Nice work. That's exactly right.",
        announcement: "Correct! Your answer passed this step."
    },
    "not-yet": {
        title: "Not yet",
        detail: "Have another go. You're closer than you think.",
        announcement: "Not yet. Have another go."
    },
    "error": {
        title: "Something went wrong",
        detail: "That one's on us, not you. Please submit your answer again.",
        announcement: "Something went wrong while checking your answer. Please submit it again."
    }
};
