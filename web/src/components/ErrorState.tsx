import type { ReactNode } from "react";
import { ApiError } from "../api/client";
import { Button } from "./Button";

export interface ErrorStateProps {
  message?: string | Error | ApiError | null;
  retry?: () => void;
  retryLabel?: string;
  children?: ReactNode;
  className?: string;
}

function formatErrorMessage(
  error?: string | Error | ApiError | null,
): string {
  if (!error) return "An unexpected error occurred.";

  const raw = typeof error === "string" ? error : error.message;
  if (!raw) return "An unexpected error occurred.";

  const trimmed = raw.trim();

  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed);

      if (typeof parsed === "object" && parsed !== null) {
        if (typeof parsed.detail === "string") {
          return parsed.detail;
        }
        if (Array.isArray(parsed.detail)) {
          return parsed.detail
            .map((item: { msg?: string }) => item.msg || JSON.stringify(item))
            .join(", ");
        }
        if (typeof parsed.message === "string") {
          return parsed.message;
        }
        if (typeof parsed.error === "string") {
          return parsed.error;
        }
      }
    } catch {
      // Not valid JSON, fallback to raw string
    }
  }

  return raw;
}

/**
 * Error state display component.
 */
export function ErrorState({
  message,
  retry,
  retryLabel = "Try again",
  children,
  className = "",
}: ErrorStateProps) {
  const displayMessage = formatErrorMessage(message);

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
