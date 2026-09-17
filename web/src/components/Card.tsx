import { useId } from "react";
import type { ElementType, HTMLAttributes, ReactNode } from "react";

export type HeadingLevel = "h1" | "h2" | "h3" | "h4" | "h5" | "h6";

// How the title looks, kept separate from `titleLevel`, which is the outline.
// `eyebrow` is a small label naming a panel; `heading` is the card's own headline.
export type CardTitleVariant = "eyebrow" | "heading";

export interface CardProps extends Omit<HTMLAttributes<HTMLElement>, "title"> {
  as?: ElementType;
  title?: ReactNode;
  titleLevel?: HeadingLevel;
  titleVariant?: CardTitleVariant;
  children: ReactNode;
  className?: string;
}

export function Card({
  as: Tag = "div",
  title,
  titleLevel = "h2",
  titleVariant = "eyebrow",
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
        <HeadingTag
          id={titleId}
          className={`card-title card-title--${titleVariant}`}
        >
          {title}
        </HeadingTag>
      )}
      {children}
    </Tag>
  );
}
