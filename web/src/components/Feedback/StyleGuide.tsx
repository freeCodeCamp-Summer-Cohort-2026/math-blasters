import { Feedback } from "."
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
                        <Feedback state={state} />
                    </div>
                ))}
            </div>
        </section>
    )
}