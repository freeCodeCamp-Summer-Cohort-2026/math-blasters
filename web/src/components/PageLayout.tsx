import type { ReactNode } from "react";

export interface PageLayoutProps {
  heading?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function PageLayout({
  heading,
  footer,
  children,
  className = "",
}: PageLayoutProps) {
  return (
    <div className={`page-layout ${className}`.trim()}>
      {heading && <header className="page-header">{heading}</header>}
      <main className="page-content">{children}</main>
      {footer}
    </div>
  );
}
