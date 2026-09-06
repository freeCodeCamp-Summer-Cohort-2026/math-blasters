import { useEffect, useState } from "react";

import { api } from "../api/client";
import { Button } from "../components/Button";
import type { DemoProblem } from "../types";

/**
 * Setup check / Homepage
 */

export function Homepage() {
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
    <section className="card">
      <h2 className="card__title">Setup check</h2>
      {error && (
        <>
          <p className="error">{error}</p>
          <p className="muted">
            Start the stack <code>docker compose up</code>, then seed it with{" "}
            <code>docker compose exec api python -m app.seed</code>
          </p>
        </>
      )}

      {!error && !problem && <p className="muted">Loading...</p>}

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

          <Button
            variant="primary"
            isLoading={checking}
            disabled={value.trim() === "" || checking}
            onClick={check}
          >
            Check answer
          </Button>

          {result !== null && (
            <p role="status">{result ? "Correct." : "Not quite."}</p>
          )}
        </>
      )}
    </section>
  );
}
