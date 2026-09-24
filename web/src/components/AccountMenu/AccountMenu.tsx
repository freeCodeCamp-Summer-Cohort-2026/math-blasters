import { useEffect, useId, useRef, useState } from "react";
import type { FocusEvent as ReactFocusEvent } from "react";
import type { Account } from "../../types";
import styles from "./AccountMenu.module.css";

export interface AccountMenuProps {
  account: Account;
  onLogout: () => Promise<void> | void;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0 || !parts[0]) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// A disclosure, not an ARIA menu: one plain button inside, reached with Tab.
export function AccountMenu({ account, onLogout }: AccountMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [logoutFailed, setLogoutFailed] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  useEffect(() => {
    setImageError(false);
  }, [account.avatarUrl]);

  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(event: PointerEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    }

    document.addEventListener("pointerdown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const handleBlur = (event: ReactFocusEvent<HTMLDivElement>) => {
    if (
      containerRef.current &&
      !containerRef.current.contains(event.relatedTarget as Node)
    ) {
      setIsOpen(false);
    }
  };

  const toggle = () => {
    setLogoutFailed(false);
    setIsOpen((prev) => !prev);
  };

  const handleLogout = async () => {
    setLogoutFailed(false);
    try {
      await onLogout();
      setIsOpen(false);
    } catch (err) {
      console.warn("AccountMenu: sign-out failed", err);
      setLogoutFailed(true);
    }
  };

  return (
    <div
      ref={containerRef}
      className={styles.container}
      onBlur={handleBlur}
    >
      <button
        ref={triggerRef}
        type="button"
        className={styles.trigger}
        aria-expanded={isOpen}
        aria-controls={isOpen ? panelId : undefined}
        onClick={toggle}
      >
        {account.avatarUrl && !imageError ? (
          <img
            src={account.avatarUrl}
            alt=""
            className={styles.avatar}
            onError={() => setImageError(true)}
          />
        ) : (
          <span className={styles.avatarFallback} aria-hidden="true">
            {getInitials(account.displayName)}
          </span>
        )}
        <span className={styles.displayName}>{account.displayName}</span>
      </button>

      {isOpen && (
        <div id={panelId} className={styles.dropdown}>
          <p className={styles.userInfo}>
            <span className={styles.userLabel}>{account.displayName}</span>
          </p>
          <button
            type="button"
            className={styles.menuItem}
            onClick={handleLogout}
          >
            Sign out
          </button>
          {logoutFailed && (
            <p role="alert" className={styles.error}>
              Couldn't sign out. Please try again.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
