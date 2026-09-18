import { useState } from "react";
import type { PageStep } from "../../content/types";
import { AnswerStep, ExplainStep } from "../steps";
import type { SubmissionStatus } from "../steps";

export interface StepProps {
  step: PageStep;
}

/** Dispatches to the renderer for the step's kind (MB-45); submission status is local state until `useLesson` (MB-18) merges and takes over, unchanged in shape. */
export function Step({ step }: StepProps) {
  const [status, setStatus] = useState<SubmissionStatus>("untried");

  if (step.type === "explain") {
    return <ExplainStep step={step} />;
  }

  return (
    <AnswerStep
      step={step}
      status={status}
      onSubmit={() => {
        setStatus("checking");
        // No real checker until useLesson (MB-18) merges; unlock the step
        // instead of leaving it stuck on "checking" with no way to retry.
        setTimeout(() => setStatus("not_yet"), 0);
      }}
    />
  );
}
