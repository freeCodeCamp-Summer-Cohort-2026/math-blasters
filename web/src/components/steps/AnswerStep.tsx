import { useId, useState } from "react";
import type { ReactNode } from "react";
import type { PageAnswerStep } from "../../content/types";
import { AnswerInput } from "../AnswerInput";
import { Button } from "../Button";
import { RenderMarkdown } from "../Markdown";
import type { SubmissionStatus } from "../../content/useLesson";
import styles from "./AnswerStep.module.css";

/** The per-step submission state is owned by `useLesson`; re-exported so existing imports keep working. */
export { SUBMISSION_STATUSES } from "../../content/useLesson";
export type { SubmissionStatus } from "../../content/useLesson";

export interface AnswerStepProps {
  step: PageAnswerStep;
  /** Defaults to "untried" so the component is easy to render in isolation. */
  status?: SubmissionStatus;
  onSubmit: (value: string) => void;
  /** The designed feedback states are a phase-3 item (MB-31/MB-13's `Feedback` component); this slot just renders whatever it's given. */
  feedback?: ReactNode;
}

/** Renders an answer step's prompt and takes the answer; driven entirely by props, so the lab route can reuse it and the feedback states can be tested in isolation. */
export function AnswerStep({ step, status = "untried", onSubmit, feedback }: AnswerStepProps) {
  const [value, setValue] = useState("");
  const inputId = useId();
  const isChecking = status === "checking";

  const handleSubmit = () => {
    if (!value.trim()) return;
    onSubmit(value);
  };

  return (
    <div className={styles.answerStep}>
      <RenderMarkdown content={step.prompt} />
      <div className={styles.controls}>
        <AnswerInput
          id={inputId}
          label="Your answer"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onSubmit={handleSubmit}
          onReset={() => setValue("")}
          disabled={isChecking}
        />
        <Button
          variant="ghost"
          className={styles.submit}
          onClick={handleSubmit}
          isLoading={isChecking}
          disabled={isChecking}
        >
          Submit
        </Button>
      </div>
      {feedback && (
        <div className={styles.feedback} data-testid="answer-step-feedback">
          {feedback}
        </div>
      )}
    </div>
  );
}
