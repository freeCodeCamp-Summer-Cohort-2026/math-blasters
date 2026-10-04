import { useId, useState } from "react";
import type { PageAnswerStep, SubmissionStatus } from "../../content";
import { reasonSentence } from "../../content/reasons";
import { AnswerInput } from "../AnswerInput";
import { Button } from "../Button";
import { Feedback } from "../Feedback";
import { feedbackContent } from "../Feedback/content";
import type { FeedbackState } from "../Feedback/types";
import { feedbackStateFor } from "../Feedback/useFeedbackState";
import { RenderMarkdown } from "../Markdown";
import { NotYetExplanation } from "../NotYetExplanation";
import styles from "./AnswerStep.module.css";

/** The per-step submission state is owned by `useLesson`; re-exported so existing imports keep working. */
export { SUBMISSION_STATUSES } from "../../content";
export type { SubmissionStatus } from "../../content";

export interface AnswerStepProps {
  step: PageAnswerStep;
  /** Defaults to "untried" so the component is easy to render in isolation. */
  status?: SubmissionStatus;
  /** From the step's not-yet state: what the learner submitted. */
  entered?: string;
  /** From the step's not-yet state; picks the explanation sentence. */
  reasonCode?: string;
  /** An author-written reason from the not-yet state; wins over the generic sentence. */
  reason?: string;
  /** The feedback to show, held by the caller so its Next gate agrees; omitted, it follows `status` with no hold. */
  feedbackState?: FeedbackState | null;
  onSubmit: (value: string) => void;
}

/** The live region's sentence for a state; the not-yet one also says what was entered and why. */
function announcementFor(state: FeedbackState, entered: string, reasonCode?: string, reason?: string) {
  const base = feedbackContent[state].announcement;
  if (state !== "not-yet") return base;
  const enteredSentence = entered.trim() ? ` You entered ${entered}.` : "";
  return `${base}${enteredSentence} ${reasonSentence(reasonCode, reason)}`;
}

/** Renders an answer step's prompt and takes the answer; driven entirely by props, so the lab route can reuse it and the feedback states can be tested in isolation. */
export function AnswerStep({
  step,
  status = "untried",
  entered = "",
  reasonCode,
  reason,
  feedbackState: heldFeedbackState,
  onSubmit,
}: AnswerStepProps) {
  const [value, setValue] = useState("");
  const inputId = useId();
  const checkingId = `${inputId}-checking`;
  const feedbackState = heldFeedbackState === undefined ? feedbackStateFor(status) : heldFeedbackState;
  const isChecking = status === "checking" || feedbackState === "checking";
  // Shown with the not-yet feedback, so it explains the goal at the moment the answer missed it.
  const checkingStatement = feedbackState === "not-yet" ? step.checking : undefined;

  const handleSubmit = () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    // Trimmed once here, so the checker, the "You entered" chip and the announcement all see the same value.
    onSubmit(trimmed);
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
          kind={step.input}
          describedBy={checkingStatement ? checkingId : undefined}
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
      {feedbackState && (
        <div className={styles.feedback}>
          {/* Keyed so each state change replays the entrance motion. */}
          <Feedback key={feedbackState} state={feedbackState}>
            {feedbackState === "not-yet" && (
              <>
                <NotYetExplanation entered={entered} reasonCode={reasonCode} reason={reason} />
                {/* Author prose only, never built from criteria. */}
                {checkingStatement && (
                  <div id={checkingId} className={styles.checking}>
                    <p className={styles.checkingLabel}>Checking</p>
                    <RenderMarkdown content={checkingStatement} />
                  </div>
                )}
              </>
            )}
          </Feedback>
        </div>
      )}
      {/* Always mounted, so screen readers hear each change rather than a region appearing. */}
      <p className="sr-only" role="status">
        {feedbackState ? announcementFor(feedbackState, entered, reasonCode, reason) : ""}
      </p>
    </div>
  );
}
