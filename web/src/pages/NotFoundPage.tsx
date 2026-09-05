import { Link } from "react-router-dom";

export function NotFoundPage() {
  return (
    <section className="card" aria-labelledby="not-found-title">
      <h2 id="not-found-title" className="card__title">
        Page not found
      </h2>
      <p className="expression">404</p>
      <p className="muted">
        The page you're looking for doesn't exist or has moved.
      </p>
      <Link to={"/"} className="btn btn--primary">
        Back to home
      </Link>
    </section>
  );
}
