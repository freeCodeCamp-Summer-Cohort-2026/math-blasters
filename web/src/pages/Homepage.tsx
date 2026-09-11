import { useEffect, useRef, useState } from "react";
import type { DemoProblem } from "../types";
import { Link } from "react-router-dom";
import { AnswerInput } from "../components/AnswerInput";
import { api, type ApiError } from "../api/client";

import { Button } from "../components/Button";
import { Skeleton } from "../components/Skeleton";
import { ErrorState } from "../components/ErrorState";

/**
 * Setup check / Homepage
 */

export function Homepage() {
  const [problem, setProblem] = useState<DemoProblem | null>(null);
  const [error, setError] = useState<ApiError | Error | string | null>(null);
  const [value, setValue] = useState("");
  const [result, setResult] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(false);
  const isMounted = useRef(true);

  function loadProblem() {
    setError(null);
    setProblem(null);
    api
      .getDemoProblem()
      .then((found) => {
        if (isMounted.current) {
          setProblem(found);
        }
      })
      .catch((err) => {
        if (isMounted.current) {
          setError(err);
        }
      });
  }

  useEffect(() => {
    isMounted.current = true;
    loadProblem();

    return () => {
      isMounted.current = false;
    };
  }, []);

  async function check() {
    setChecking(true);
    try {
      const response = await api.checkDemoAnswer(Number(value));
      if (isMounted.current) {
        setResult(response.correct);
      }
    } catch (err) {
      if (isMounted.current) {
        setError(err instanceof Error ? err : "Couldn't check that answer.");
      }
    } finally {
      if (isMounted.current) {
        setChecking(false);
      }
    }
  }

  return (
    <section className="card">
      {import.meta.env.DEV && (
        <Link to="/dev-only-feedback-styleguide" className="card__link">
          Styleguide
        </Link>
      )}
      <h2 className="card__title">Setup check</h2>
      {error && (
        <ErrorState message={error} retry={loadProblem}>
          <p className="muted">
            Start the stack <code>docker compose up</code>, then seed it with{" "}
            <code>docker compose exec api python -m app.seed</code>
          </p>
        </ErrorState>
      )}

      {!error && !problem && (
        <div
          style={{
            width: "100%",
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-4)",
            alignItems: "center",
          }}>
          <Skeleton variant="text" width="60%" height="1.5rem" />
          <Skeleton variant="rectangular" width="12rem" height="3.5rem" />
          <Skeleton variant="rectangular" width="8rem" height="3rem" />
        </div>
      )}

      {problem && (
        <>
          <p>{problem.prompt}</p>
          <p className="expression">{problem.expression}</p>

          <AnswerInput
            id="answer"
            label="Your answer"
            value={value}
            onChange={(event) => {
              setValue(event.target.value);
              setResult(null);
            }}
            onSubmit={check}
            onReset={() => {
              setValue("");
              setResult(null);
            }}
          />

          <Button
            variant="primary"
            isLoading={checking}
            disabled={value.trim() === "" || checking}
            onClick={check}>
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
