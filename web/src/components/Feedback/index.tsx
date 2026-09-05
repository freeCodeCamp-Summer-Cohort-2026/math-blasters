import { feedbackContent } from "./content";
import { FeedbackProps } from "./types";
import styles from "./Feedback.module.css";
import { FeedbackIcon } from "./Icons";

function cx(...classNames: Array<string | undefined>) {
    return classNames.filter(Boolean).join(" ");
}

export const Feedback = ({ state }: FeedbackProps) => {
    const content = feedbackContent[state];

    return (
        <section
            className={cx(styles.feedback, styles[state])}
            aria-label={`${state} feedback`}
            data-state={state}
        >
            <div
                className={styles.icon}
                aria-hidden={true}
            >
                <FeedbackIcon state={state} />
            </div>
            <div
                className={styles.content}
            >
                <h2 className={styles.title}>{content.title}</h2>
                <p className={styles.announcement} role="status" aria-live="polite">
                    {content.announcement}
                </p>
            </div>
        </section>
    )
}