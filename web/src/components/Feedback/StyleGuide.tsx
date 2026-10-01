import { Feedback } from "."
import { NotYetExplanation } from "../NotYetExplanation"
import { FEEDBACKSTATES } from "./types"
import styles from "./StyleGuide.module.css"

export const FeedbackStyleGuide = () => {
    return (
        <section className={styles.page}>
            <h2 className={styles.label}>Feedback style guide</h2>
            <div className={styles.grid}>
                {FEEDBACKSTATES.map((state) => (
                    <div key={state} className={styles.gridItem}>
                        <h3>{state}</h3>
                        <Feedback state={state}>
                            {state === "not-yet" && <NotYetExplanation entered="12" reasonCode="wrong_total" />}
                        </Feedback>
                    </div>
                ))}
            </div>
        </section>
    )
}
