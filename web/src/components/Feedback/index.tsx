import { feedbackContent } from "./content";
import { FeedbackProps } from "./types";
import styles from "./Feedback.module.css";
import { FeedbackIcon } from "./Icons";

function cx(...classNames: Array<string | undefined>) {
    return classNames.filter(Boolean).join(" ");
}

/** Visual feedback only; the caller owns the live region so an announcement survives this remounting. */
export const Feedback = ({ state, title, children }: FeedbackProps) => {
    const content = feedbackContent[state];

    return (
        <section
            className={cx(styles.feedback, styles[state])}
            aria-label={`${state} feedback`}
            data-state={state}
        >
            <span className={styles.badge} aria-hidden={true}>
                <FeedbackIcon state={state} />
            </span>
            <div className={styles.body}>
                <p className={styles.title}>{title ?? content.title}</p>
                {/* Callers pass `false` when they have nothing to add, so fall back on any empty value. */}
                {children || <p className={styles.detail}>{content.detail}</p>}
            </div>
        </section>
    )
}
