import { FeedbackContent, FeedbackState } from "./types";

export const feedbackContent: Record<FeedbackState, FeedbackContent> = {
    "idle": {
        title: "Ready to check your answer?",
        announcement: "You can check your answer by clicking the button below."
    },
    "checking": {
        title: "Checking your answer...",
        announcement: "Please wait while we check your answer."
    },
    "correct": {
        title: "Correct!",
        announcement: "Congratulations! Your answer is correct."
    },
    "not-yet": {
        title: "Not quite right.",
        announcement: "Your answer is not correct yet. Please try again."
    },
    "error": {
        title: "Error",
        announcement: "There was an error checking your answer. Please try again."
    }
};