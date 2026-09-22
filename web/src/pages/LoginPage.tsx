import { Card } from "../components/Card";
import styles from "./LoginPage.module.css";

export function LoginPage() {
  return (
    <div className={styles.container}>
      <Card
        as="section"
        aria-labelledby="login-heading"
        className={styles.card}
      >
        <h1 id="login-heading" className={styles.title}>
          Sign in to Math Blasters
        </h1>
        <p className={styles.subtitle}>
          Sign in to save your progress and access your lessons anywhere.
        </p>
        <div className={styles.providers}>
          <a
            href="/api/auth/login/github"
            className="btn btn--secondary btn--lg"
          >
            Continue with GitHub
          </a>
          <a
            href="/api/auth/login/google"
            className="btn btn--secondary btn--lg"
          >
            Continue with Google
          </a>
        </div>
      </Card>
    </div>
  );
}
