import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { AccountMenu } from "../AccountMenu/AccountMenu";
import { Skeleton } from "../Skeleton";
import { ThemeToggle } from "../ThemeToggle";
import styles from "./NavHeader.module.css";

export function NavHeader() {
  const { account, loading, logout } = useAuth();

  return (
    <header role="banner" className={styles.navHeader}>
      <Link to="/" className={styles.brand}>
        Math Blasters
      </Link>
      <div className={styles.actions}>
        <ThemeToggle />
        {loading ? (
          <Skeleton
            variant="rectangular"
            width={110}
            height={38}
            label="Loading account details"
          />
        ) : account ? (
          <AccountMenu account={account} onLogout={logout} />
        ) : (
          <Link to="/login" className="btn btn--secondary btn--sm">
            Sign in
          </Link>
        )}
      </div>
    </header>
  );
}
