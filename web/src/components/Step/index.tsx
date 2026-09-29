import type { StepState } from "../../content";
import type { PageStep } from "../../content/types";
import type { FeedbackState } from "../Feedback/types";
import { AnswerStep, ExplainStep } from "../steps";

export interface StepProps {
  step: PageStep;
  /** The step's state from useLesson; omitted, an answer step starts untried. */
  state?: StepState;
  /** The held feedback for an answer step; see AnswerStep. */
  feedbackState?: FeedbackState | null;
  onSubmit?: (submission: string) => void;
}

/** Dispatches to the renderer for the step's kind. State is owned by useLesson and passed down. */
export function Step({ step, state, feedbackState, onSubmit = () => {} }: StepProps) {
  if (step.type === "explain") {
    return <ExplainStep step={step} />;
  }

  return (
    <AnswerStep
      step={step}
      status={state?.status}
      entered={state?.entered}
      reasonCode={state?.reason_code}
      reason={state?.reason}
      feedbackState={feedbackState}
      onSubmit={onSubmit}
    />
  );
}
