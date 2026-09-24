import { apiUrl } from "../api/client";
import { Card } from "../components/Card";
import styles from "./LoginPage.module.css";

// Full navigations, not fetches: the API redirects on to the provider (MB-51).
const PROVIDERS = [
  { id: "github", label: "Continue with GitHub" },
  { id: "google", label: "Continue with Google" },
];

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
          {PROVIDERS.map(({ id, label }) => (
            <a
              key={id}
              href={apiUrl(`/auth/${id}/start`)}
              className="btn btn--secondary btn--lg"
            >
              {label}
            </a>
          ))}
        </div>
      </Card>
    </div>
  );
}
