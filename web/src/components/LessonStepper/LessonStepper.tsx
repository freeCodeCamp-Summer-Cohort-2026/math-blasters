import { useEffect, useRef, useState } from "react";
import type { PageLesson } from "../../content/types";
import { Button } from "../Button";
import { Step } from "../Step";
import styles from "./LessonStepper.module.css";

export interface LessonStepperProps {
  lesson: PageLesson;
}

export function LessonStepper({ lesson }: LessonStepperProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const totalSteps = lesson.steps.length;
  const currentStep = lesson.steps[currentStepIndex];

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

  return (
    <div className={styles.stepper}>
      {/* Polite screen reader live region */}
      <div role="status" aria-live="polite" className="sr-only">
        {`${progressText}: ${currentStep?.type ?? "step"} step`}
      </div>

      <div className={styles.header}>
        <div className={styles.meta}>
          <h2 ref={headingRef} tabIndex={-1} className={styles.counter}>
            {progressText}
          </h2>
        </div>

        <div
          role="progressbar"
          aria-valuenow={currentStepNumber}
          aria-valuemin={1}
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
      </div>

      <div className={styles.stepContainer}>
        {currentStep && <Step step={currentStep} />}
      </div>

      <div className={styles.controls}>
        <Button
          variant="secondary"
          onClick={handleBack}
          disabled={currentStepIndex === 0}
        >
          Back
        </Button>
        <Button
          variant="primary"
          onClick={handleNext}
          disabled={currentStepIndex === totalSteps - 1}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
