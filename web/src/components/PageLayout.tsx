import type { ElementType, ReactNode } from "react";

export interface PageLayoutProps {
  // The element the content region renders as, `section` by default.
  // Only the root `Layout` passes `as="main"`: the document gets one `main`.
  as?: ElementType;
  heading?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function PageLayout({
  as: Content = "section",
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
