import type { CSSProperties, HTMLAttributes } from "react";

export type SkeletonVariant = "text" | "rectangular" | "circular" | "card";

export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  variant?: SkeletonVariant;
  width?: string | number;
  height?: string | number;
  lines?: number;
  label?: string;
}

/**
 * Page- and component-level loading placeholder.
 */
export function Skeleton({
  variant = "text",
  width,
  height,
  lines = 1,
  label = "Loading...",
  className = "",
  style,
  ...rest
}: SkeletonProps) {
  const customStyle: CSSProperties = {
    ...(width !== undefined && {
      width: typeof width === "number" ? `${width}px` : width,
    }),
    ...(height !== undefined && {
      height: typeof height === "number" ? `${height}px` : height,
    }),
    ...style,
  };

  if (variant === "text" && lines > 1) {
    return (
      <div
        role="status"
        aria-live="polite"
        aria-busy="true"
        className={`skeleton-group ${className}`.trim()}
        {...rest}>
        <span className="sr-only">{label}</span>
        {Array.from({ length: lines }).map((_, index) => (
          <span
            key={index}
            aria-hidden="true"
            className="skeleton skeleton--text"
            style={{
              ...customStyle,
              width: index === lines - 1 ? "75%" : "100%",
            }}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className={`skeleton skeleton--${variant} ${className}`.trim()}
      style={customStyle}
      {...rest}>
      <span className="sr-only">{label}</span>
    </div>
  );
}
