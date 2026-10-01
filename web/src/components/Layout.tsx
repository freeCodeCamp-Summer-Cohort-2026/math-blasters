import { useEffect, useRef } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { useReturnAfterSignIn } from "../auth/returnTo";
import { NavHeader } from "./NavHeader/NavHeader";
import { PageLayout } from "./PageLayout";

/**
 * Root Layout route component
 * Provides top NavHeader, hero, <main> outlet, and footer.
 */

export function Layout() {
  const location = useLocation();
  const mainRef = useRef<HTMLDivElement | null>(null);
  const isFirstRender = useRef(true);
  useReturnAfterSignIn();

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
      {/* Not an h1: it is the same on every route, so the page owns its own. */}
      <p className="hero__title">
        Learn math by <em>doing</em> it.
      </p>
      <p className="hero__subtitle">
        Short, hands-on lessons that build real understanding, one step at a
        time. Try each idea yourself and see why it works.
      </p>
    </div>
  );

  const footer = (
    <footer className="footer">
      <p className="muted">Math Blasters - Learn math by doing it.</p>
    </footer>
  );

  return (
    <>
      <NavHeader />
      <PageLayout as="main" footer={footer}>
        <div className="page-header">{heroHeading}</div>
        <div id="main-content" ref={mainRef} tabIndex={-1}>
          <Outlet />
        </div>
      </PageLayout>
    </>
  );
}
