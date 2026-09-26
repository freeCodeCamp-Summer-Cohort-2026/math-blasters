import type { PageStep } from "../../content/types";
import { AnswerStep, ExplainStep } from "../steps";
import type { SubmissionStatus } from "../steps";

export interface StepProps {
  step: PageStep;
  status?: SubmissionStatus;
  onSubmit?: (submission: string) => void;
}

/** Dispatches to the renderer for the step's kind. State is owned by useLesson and passed down. */
export function Step({ step, status = "untried", onSubmit = () => {} }: StepProps) {
  if (step.type === "explain") {
    return <ExplainStep step={step} />;
  }

  return <AnswerStep step={step} status={status} onSubmit={onSubmit} />;
}
