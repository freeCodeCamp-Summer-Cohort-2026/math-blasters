import type { HTMLAttributes } from "react";

export interface SpinnerProps extends HTMLAttributes<HTMLSpanElement> {
  size?: "sm" | "md" | "lg";
  label?: string;
  isDecorative?: boolean;
}

/**
 * Inline loading spinner component.
 */

export function Spinner({
  size = "md",
  label = "Loading...",
  isDecorative = false,
  className = "",
  ...rest
}: SpinnerProps) {
  if (isDecorative) {
    return (
      <span
        aria-hidden="true"
        className={`spinner spinner--${size} ${className}`.trim()}
        {...rest}
      />
    );
  }

  return (
    <span
      role="status"
      aria-live="polite"
      className={`spinner spinner--${size} ${className}`.trim()}
      {...rest}
    >
      <span className="sr-only">{label}</span>
    </span>
  );
}
