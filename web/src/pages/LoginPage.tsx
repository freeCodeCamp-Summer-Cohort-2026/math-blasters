import { useLocation } from "react-router-dom";
import { apiUrl } from "../api/client";
import { rememberReturnTo, safeReturnPath } from "../auth/returnTo";
import { Card } from "../components/Card";
import styles from "./LoginPage.module.css";

// Full navigations, not fetches: the API redirects on to the provider (MB-51).
const PROVIDERS = [
  { id: "github", label: "Continue with GitHub" },
  { id: "google", label: "Continue with Google" },
];

export function LoginPage() {
  // Set by a sign-in prompt; the provider round trip loses router state, so it is stashed on click.
  const location = useLocation();
  const from = safeReturnPath((location.state as { from?: unknown } | null)?.from);

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
              onClick={() => rememberReturnTo(from)}
            >
              {label}
            </a>
          ))}
        </div>
      </Card>
    </div>
  );
}
