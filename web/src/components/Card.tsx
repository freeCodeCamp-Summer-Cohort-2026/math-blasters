import React from "react";

export type HeadingLevel = "h1" | "h2" | "h3" | "h4" | "h5" | "h6";

export interface CardProps {
  title?: string;
  titleLevel?: HeadingLevel;
  children: React.ReactNode;
  className?: string;
}

export const Card: React.FC<CardProps> = ({
  title,
  titleLevel = "h2",
  children,
  className = "",
}: CardProps) => {
    const HeadingTag = titleLevel;
  return React.createElement(
    "div",
    { className: `card ${className}`.trim() },
    title && React.createElement(HeadingTag, { className: "card-title" }, title),
    children,
  );
};
