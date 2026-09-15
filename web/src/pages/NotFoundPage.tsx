import { Link } from "react-router-dom";
import { Card } from "../components/Card";

export function NotFoundPage() {
  return (
    <Card as="section" title="Page not found">
      <p className="expression">404</p>
      <p className="muted">
        The page you're looking for doesn't exist or has moved.
      </p>
      <Link to={"/"} className="btn btn--primary">
        Back to home
      </Link>
    </Card>
  );
}
