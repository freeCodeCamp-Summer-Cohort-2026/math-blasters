import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { AccountMenu } from "../AccountMenu/AccountMenu";
import { Skeleton } from "../Skeleton";
import { ThemeToggle } from "../ThemeToggle";
import styles from "./NavHeader.module.css";

export function NavHeader() {
  const { account, loading, logout } = useAuth();
  const signInRef = useRef<HTMLAnchorElement>(null);
  const focusSignIn = useRef(false);

  // Sign-out unmounts the focused menu, so hand focus to the link that replaces it.
  useEffect(() => {
    if (!account && focusSignIn.current) {
      focusSignIn.current = false;
      signInRef.current?.focus();
    }
  }, [account]);

  const handleLogout = async () => {
    focusSignIn.current = true;
    try {
      await logout();
    } catch (err) {
      focusSignIn.current = false;
      throw err;
    }
  };

  return (
    <header className={styles.navHeader}>
      <Link to="/" className={styles.brand}>
        Math Blasters
      </Link>
      <div className={styles.actions}>
        <ThemeToggle />
        {loading ? (
          // Matches the Sign in link and account trigger height, so nothing shifts.
          <Skeleton
            variant="rectangular"
            width={110}
            height={42}
            label="Loading account details"
          />
        ) : account ? (
          <AccountMenu account={account} onLogout={handleLogout} />
        ) : (
          <Link
            ref={signInRef}
            to="/login"
            className="btn btn--secondary btn--sm"
          >
            Sign in
          </Link>
        )}
      </div>
    </header>
  );
}
