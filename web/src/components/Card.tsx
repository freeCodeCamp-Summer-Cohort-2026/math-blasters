import { useId } from "react";
import type { ElementType, HTMLAttributes, ReactNode } from "react";

export type HeadingLevel = "h1" | "h2" | "h3" | "h4" | "h5" | "h6";

export interface CardProps extends Omit<HTMLAttributes<HTMLElement>, "title"> {
  as?: ElementType;
  title?: ReactNode;
  titleLevel?: HeadingLevel;
  children: ReactNode;
  className?: string;
}

export function Card({
  as: Tag = "div",
  title,
  titleLevel = "h2",
  children,
  className = "",
  ...rest
}: CardProps) {
  const generatedId = useId();
  const titleId = title ? `card-title-${generatedId}` : undefined;
  const HeadingTag = titleLevel;

  return (
    <Tag
      className={`card ${className}`.trim()}
      aria-labelledby={titleId}
      {...rest}
    >
      {title && (
        <HeadingTag id={titleId} className="card-title">
          {title}
        </HeadingTag>
      )}
      {children}
    </Tag>
  );
}
