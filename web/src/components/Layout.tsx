import { useEffect, useRef } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { PageLayout } from "./PageLayout";
import { ThemeToggle } from "./ThemeToggle";

/**
 * Root Layout route component
 * Provides global <header>, <main> outlet and <footer> using the PageLayout primitive.
 */

export function Layout() {
  const location = useLocation();
  const mainRef = useRef<HTMLDivElement | null>(null);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    const heading = mainRef.current?.querySelector<HTMLElement>(
      "h1, h2, [role='heading']",
    );

    if (heading) {
      if (!heading.hasAttribute("tabindex")) {
        heading.setAttribute("tabindex", "-1");
      }
      heading.focus();
    } else if (mainRef.current) {
      mainRef.current.focus();
    }
  }, [location.pathname]);

  const heroHeading = (
    <div className="hero">
      <p className="hero__eyebrow">Math Blasters</p>
      {/* Not an h1: it is the same on every route, so the page owns its own. */}
      <p className="hero__title">
        Learn math by <em>doing</em> it.
      </p>
      <p className="hero__subtitle">
        Base template. Nothing here is the real product yet -- pick up an
        issue and build it.
      </p>
      <ThemeToggle />
    </div>
  );

  const footer = (
    <footer className="footer">
      <p className="muted">Math Blasters - Learn math by doing it.</p>
    </footer>
  );

  return (
    <PageLayout as="main" heading={heroHeading} footer={footer}>
      <div id="main-content" ref={mainRef} tabIndex={-1}>
        <Outlet />
      </div>
    </PageLayout>
  );
}
