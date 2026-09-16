import type { PageStep } from "../../content/types";
import styles from "./Step.module.css";

export interface StepProps {
  step: PageStep;
}

/**
 * Isolated Step component boundary.
 * Renders a placeholder showing the step kind until full step renderers land.
 */
export function Step({ step }: StepProps) {
  return (
    <div data-testid="step-placeholder" className={styles.placeholder}>
      <p className={styles.kind}>Step kind: {step.type}</p>
    </div>
  );
}
