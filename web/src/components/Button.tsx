import { forwardRef } from "react";
import type { ButtonHTMLAttributes } from "react";
import { Spinner } from "./Spinner";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      children,
      variant = "primary",
      size = "md",
      isLoading = false,
      disabled,
      className,
      ...rest
    },
    ref,
  ) {
    const isDisabled = disabled || isLoading;

    return (
      <button
        type="button"
        ref={ref}
        className={`btn btn--${variant} btn--${size} ${className ?? ""}`.trim()}
        disabled={isDisabled}
        aria-busy={isLoading || undefined}
        {...rest}>
        {isLoading && <Spinner size={size} isDecorative />}
        <span className={isLoading ? "btn__label--dimmed" : undefined}>
          {children}
        </span>
      </button>
    );
  },
);
