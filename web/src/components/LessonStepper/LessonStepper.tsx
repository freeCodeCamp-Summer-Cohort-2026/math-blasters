import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useLesson } from "../../content";
import type { PageLesson, StepChecker } from "../../content";
import { Button } from "../Button";
import { useFeedbackState } from "../Feedback/useFeedbackState";
import { LessonComplete } from "../LessonComplete";
import { SignInPrompt } from "../SignInPrompt/SignInPrompt";
import { Step } from "../Step";
import styles from "./LessonStepper.module.css";

export const COMPLETE_ANNOUNCE_DELAY_MS = 1500;

/** Where the last step leads once the lesson passes: the next lesson, or back to the module. */
export interface ContinueTarget {
  href: string;
  label: string;
  /** Fuller name for assistive tech, starting with `label`, such as "Next lesson: Counting On". */
  accessibleName?: string;
}

export interface LessonStepperProps {
  lesson: PageLesson;
  /** Where "Back" goes once there's no previous step to step back to: the module page this lesson opened from. Omitted, Back stays disabled on the first step. */
  backHref?: string;
  /** Replaces the last step's Next once the lesson passes; omitted, Next stays disabled there. */
  continueTo?: ContinueTarget;
  // h3 under a tutorial's h2 title, h2 under a lab's h1 outcome.
  headingLevel?: "h2" | "h3";
  /** Optional custom checker for dependency injection (defaults to checkAnswer). */
  checker?: StepChecker;
  /** Called once when the lesson becomes passed, not per step or per render. */
  onPassed?: () => void;
}

export function LessonStepper({
  lesson,
  backHref,
  continueTo,
  headingLevel = "h3",
  checker,
  onPassed,
}: LessonStepperProps) {
  const {
    currentStep: currentStepIndex,
    next: handleNext,
    previous: handleBack,
    steps: stepStates,
    submit,
    lessonPassed,
  } = useLesson(lesson, checker);

  const totalSteps = lesson.steps.length;
  const currentStep = lesson.steps[currentStepIndex];
  const currentStepState = stepStates[currentStepIndex];
  const isFirstStep = currentStepIndex === 0;
  const hasNextStep = currentStepIndex < totalSteps - 1;
  // Held here, not in the step, so Next unlocks only once "Correct!" is actually showing.
  const feedbackState = useFeedbackState(currentStepState?.status ?? "untried", currentStepIndex);
  const isNextGated = hasNextStep && currentStep?.type === "answer" && feedbackState !== "correct";
  // Held until "Correct!" is showing, so the ending never lands ahead of it.
  const isComplete = lessonPassed && feedbackState !== "checking";
  const continueLink = !hasNextStep && isComplete ? continueTo : undefined;

  // Read through a ref so a new callback identity never re-fires it.
  const onPassedRef = useRef(onPassed);
  onPassedRef.current = onPassed;
  useEffect(() => {
    if (lessonPassed) onPassedRef.current?.();
  }, [lessonPassed]);

  const headingRef = useRef<HTMLHeadingElement | null>(null);
  const isInitialMount = useRef(true);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    headingRef.current?.focus();
  }, [currentStepIndex]);

  const currentStepNumber = currentStepIndex + 1;
  const progressPercent = totalSteps > 0 ? (currentStepNumber / totalSteps) * 100 : 0;
  const progressText = `Step ${currentStepNumber} of ${totalSteps}`;
  const Heading = headingLevel;

  const [announceComplete, setAnnounceComplete] = useState(false);

  useEffect(() => {
    if (!lessonPassed) {
      setAnnounceComplete(false);
      return;
    }
    if (!isComplete) return;
    const timer = setTimeout(() => setAnnounceComplete(true), COMPLETE_ANNOUNCE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [isComplete, lessonPassed]);

  return (
    <div className={styles.stepper}>
      <div className={styles.header}>
        <div
          role="progressbar"
          aria-valuenow={currentStepNumber}
          aria-valuemin={0}
          aria-valuemax={totalSteps}
          aria-valuetext={progressText}
          aria-label="Lesson progress"
          className={styles.progressTrack}
        >
          <div
            className={styles.progressFill}
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/*
          Sits under the page's own title, so the caller picks the level.
          Moving focus here is what announces a step change, so there is
          no live region duplicating this text.
        */}
        <Heading ref={headingRef} tabIndex={-1} className={styles.heading}>
          {progressText}
        </Heading>
      </div>

      <div className={styles.stepContainer}>
        {/* Keyed on the step index so each step starts with an empty input; submission state lives in useLesson. */}
        {currentStep && (
          <Step
            key={currentStepIndex}
            step={currentStep}
            state={currentStepState}
            feedbackState={feedbackState}
            onSubmit={(value) => submit(currentStepIndex, value)}
          />
        )}
      </div>

      {/* Signed out, the completion moment carries the sign-in invitation; it never blocks the controls below. */}
      <LessonComplete show={announceComplete}>
        <SignInPrompt surface="lesson" />
      </LessonComplete>

      <div className={styles.controls}>
        {isFirstStep && backHref ? (
          <Link to={backHref} className="btn btn--secondary btn--md" aria-label="Back to module">
            Back
          </Link>
        ) : (
          <Button variant="secondary" onClick={handleBack} disabled={isFirstStep}>
            Back
          </Button>
        )}
        <div className={styles.nextGroup}>
          {continueLink ? (
            <Link
              to={continueLink.href}
              className="btn btn--primary btn--md"
              aria-label={continueLink.accessibleName}
            >
              {continueLink.label}
            </Link>
          ) : (
            <>
              {/* Hidden from assistive tech: the button's name already carries the reason. */}
              {isNextGated && (
                <span className={styles.gateReason} aria-hidden="true">
                  An answer is needed first
                </span>
              )}
              {/* Gated with aria-disabled, not disabled, so keyboard users can still reach it and hear why. */}
              <Button
                variant="primary"
                onClick={isNextGated ? undefined : handleNext}
                disabled={!hasNextStep}
                aria-disabled={isNextGated || undefined}
                aria-label={isNextGated ? "Next: An answer is needed first" : undefined}
              >
                Next
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
