import { reasonSentence } from "../../content/reasons";
import styles from "./NotYetExplanation.module.css";

export interface NotYetExplanationProps {
  entered: string;
  reasonCode?: string;
  /** An author-written reason; wins over the generic sentence for the code. */
  reason?: string;
}

/** Explains a not-yet answer: what the learner entered and why it didn't pass, never the expected value. */
export function NotYetExplanation({ entered, reasonCode, reason }: NotYetExplanationProps) {
  return (
    <div className={styles.explanation}>
      {entered.trim() !== "" && (
        <p className={styles.entered}>
          You entered <strong>{entered}</strong>
        </p>
      )}
      <p className={styles.reason}>{reasonSentence(reasonCode, reason)}</p>
    </div>
  );
}
