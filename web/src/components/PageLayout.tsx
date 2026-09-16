import type { ElementType, ReactNode } from "react";

export interface PageLayoutProps {
  // The element the content region renders as, `main` by default.
  // Pages nested inside the root `Layout` pass `as="section"` to keep one `main`.
  as?: ElementType;
  heading?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function PageLayout({
  as: Content = "main",
  heading,
  footer,
  children,
  className = "",
}: PageLayoutProps) {
  return (
    <div className={`page-layout ${className}`.trim()}>
      {heading && <header className="page-header">{heading}</header>}
      <Content className="page-content">{children}</Content>
      {footer}
    </div>
  );
}
