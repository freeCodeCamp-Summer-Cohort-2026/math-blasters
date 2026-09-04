import { useEffect, useRef } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { ThemeToggle } from "./ThemeToggle";

/**
 * Root Layout route component
 * Provides global <header>, <main> outlet and <footer>.
 */

export function Layout() {
  const location = useLocation();
  const mainRef = useRef<HTMLElement | null>(null);
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

  return (
    <div className="page">
      <header className="hero">
        <p className="hero__eyebrow">Math Blasters</p>
        <h1 className="hero__title">
          Learn math by <em>doing</em> it.
        </h1>
        <p className="hero__subtitle">
          Base template. Nothing here is the real product yet -- pick up an
          issue and build it.
        </p>
        <ThemeToggle />
      </header>

      <main id="main-content" ref={mainRef} tabIndex={-1}>
        <Outlet/>
      </main>

      <footer className="footer">
        <p className="muted">
            Math Blasters - Learn math by doing it.
        </p>
      </footer>
    </div>
  );
}
