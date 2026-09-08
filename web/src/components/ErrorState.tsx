import type { ReactNode } from "react";
import { ApiError, parseApiErrorMessage } from "../api/client";
import { Button } from "./Button";

export interface ErrorStateProps {
  message?: string | Error | ApiError | null;
  retry?: () => void;
  retryLabel?: string;
  children?: ReactNode;
  className?: string;
}

function getErrorMessage(error?: string | Error | ApiError | null): string {
  if (!error) return "An unexpected error occurred.";
  const raw = typeof error === "string" ? error : error.message;
  return parseApiErrorMessage(raw, "An unexpected error occurred.");
}

/**
 * Error state display component.
 *
 * - Announces errors assertively to screen readers (`role="alert"`, `aria-live="assertive"`).
 * - Renders formatted error messages (delegating to client.ts parseApiErrorMessage).
 * - Optionally renders a retry button when `retry` is provided.
 */
export function ErrorState({
  message,
  retry,
  retryLabel = "Try again",
  children,
  className = "",
}: ErrorStateProps) {
  const displayMessage = getErrorMessage(message);

  return (
    <div
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
      className={`error-state ${className}`.trim()}>
      <p className="error-state__message">{displayMessage}</p>

      {children && <div className="error-state__details">{children}</div>}

      {retry && (
        <div className="error-state__actions">
          <Button variant="secondary" size="sm" onClick={retry}>
            {retryLabel}
          </Button>
        </div>
      )}
    </div>
  );
}
