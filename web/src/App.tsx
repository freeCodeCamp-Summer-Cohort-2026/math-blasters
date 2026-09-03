import { useEffect, useState } from "react";

import { api } from "./api/client";
import type { DemoProblem } from "./types";
import { ThemeToggle } from "./components/ThemeToggle";

/**
 * The whole app, for now.
 *
 * This is a **wiring check**, not the product: it proves React can reach the
 * API, which can reach Postgres, and that answers are graded server-side. It
 * deliberately does almost nothing else.
 *
 * In particular, the correct/incorrect result below is plain text on purpose.
 * Designing feedback that clearly distinguishes "you got it" from "not yet" is
 * issue #12 -- please build it there rather than extending this component.
 *
 * Everything real is still to be built. See the open issues.
 */
export function App() {
  const [problem, setProblem] = useState<DemoProblem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [value, setValue] = useState("");
  const [result, setResult] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api
      .getDemoProblem()
      .then((found) => !cancelled && setProblem(found))
      .catch((err) => !cancelled && setError(err.message));
    return () => {
      cancelled = true;
    };
  }, []);

  async function check() {
    setChecking(true);
    try {
      const response = await api.checkDemoAnswer(Number(value));
      setResult(response.correct);
    } catch {
      setError("Couldn't check that answer.");
    } finally {
      setChecking(false);
    }
  }

  return (
    <div className="page">
      <header className="hero">
        <p className="hero__eyebrow">Math Blasters</p>
        <h1 className="hero__title">
          Learn math by <em>doing</em> it.
        </h1>
        <p className="hero__subtitle">
          Base template. Nothing here is the real product yet -- pick up an issue and build it.
        </p>
        <ThemeToggle />
      </header>

      <section className="card">
        <h2 className="card__title">Setup check</h2>

        {error && (
          <>
            <p className="error">{error}</p>
            <p className="muted">
              Start the stack with <code>docker compose up</code>, then seed it with{" "}
              <code>docker compose exec api python -m app.seed</code>.
            </p>
          </>
        )}

        {!error && !problem && <p className="muted">Loading…</p>}

        {problem && (
          <>
            <p>{problem.prompt}</p>
            <p className="expression">{problem.expression}</p>

            <label className="answer-field">
              <span className="answer-field__label">Your answer</span>
              <input
                type="number"
                inputMode="numeric"
                className="answer-field__input"
                value={value}
                onChange={(event) => {
                  setValue(event.target.value);
                  setResult(null);
                }}
              />
            </label>

            <button
              type="button"
              className="btn btn--primary"
              onClick={check}
              disabled={value.trim() === "" || checking}
            >
              {checking ? "Checking…" : "Check answer"}
            </button>

            {/* Plain on purpose -- designing this is issue #12. */}
            {result !== null && <p role="status">{result ? "Correct." : "Not quite."}</p>}
          </>
        )}
      </section>
    </div>
  );
}
