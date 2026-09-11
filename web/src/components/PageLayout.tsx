import React from "react";

export interface PageLayoutProps {
  heading?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export const PageLayout: React.FC<PageLayoutProps> = ({
  heading,
  children,
  className = "",
}: PageLayoutProps) => {
  return React.createElement(
    "div",
    { className: `page-layout ${className}`.trim() },
    heading && React.createElement("header", { className: "page-header" }, heading),
    React.createElement("main", { className: "page-content" }, children)
  );
};