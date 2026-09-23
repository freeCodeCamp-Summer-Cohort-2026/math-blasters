import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import type { PageLesson } from "../../content/types";
import { Button } from "../Button";
import { Step } from "../Step";
import styles from "./LessonStepper.module.css";

export interface LessonStepperProps {
  lesson: PageLesson;
  /** Where "Back" goes once there's no previous step to step back to: the module page this lesson opened from. Omitted, Back stays disabled on the first step. */
  backHref?: string;
  // h3 under a tutorial's h2 title, h2 under a lab's h1 outcome.
  headingLevel?: "h2" | "h3";
}

export function LessonStepper({
  lesson,
  backHref,
  headingLevel = "h3",
}: LessonStepperProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const totalSteps = lesson.steps.length;
  const currentStep = lesson.steps[currentStepIndex];
  const isFirstStep = currentStepIndex === 0;

  const headingRef = useRef<HTMLHeadingElement | null>(null);
  const isInitialMount = useRef(true);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    headingRef.current?.focus();
  }, [currentStepIndex]);

  const handleBack = () => {
    setCurrentStepIndex((prev) => Math.max(0, prev - 1));
  };

  const handleNext = () => {
    setCurrentStepIndex((prev) => Math.min(totalSteps - 1, prev + 1));
  };

  const currentStepNumber = currentStepIndex + 1;
  const progressPercent = totalSteps > 0 ? (currentStepNumber / totalSteps) * 100 : 0;
  const progressText = `Step ${currentStepNumber} of ${totalSteps}`;
  const Heading = headingLevel;

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
        {/* Keyed on the step index so each step gets a fresh Step instance: submission state must not leak between steps. */}
        {currentStep && <Step key={currentStepIndex} step={currentStep} />}
      </div>

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
        <Button
          variant="primary"
          onClick={handleNext}
          disabled={totalSteps === 0 || currentStepIndex >= totalSteps - 1}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
