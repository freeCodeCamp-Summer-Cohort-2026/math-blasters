import { useEffect, useRef, useState } from "react";
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

export function AccountMenu({ account, onLogout }: AccountMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(event: MouseEvent) {
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

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const handleLogout = async () => {
    setIsOpen(false);
    await onLogout();
  };

  return (
    <div ref={containerRef} className={styles.container}>
      <button
        ref={triggerRef}
        type="button"
        className={styles.trigger}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-controls="account-menu-dropdown"
        onClick={() => setIsOpen((prev) => !prev)}
      >
        {account.avatarUrl ? (
          <img src={account.avatarUrl} alt="" className={styles.avatar} />
        ) : (
          <span className={styles.avatarFallback} aria-hidden="true">
            {getInitials(account.displayName)}
          </span>
        )}
        <span className={styles.displayName}>{account.displayName}</span>
      </button>

      {isOpen && (
        <div
          role="menu"
          id="account-menu-dropdown"
          className={styles.dropdown}
        >
          <div className={styles.userInfo} role="none">
            <span className={styles.userLabel}>{account.displayName}</span>
          </div>
          <button
            type="button"
            role="menuitem"
            className={styles.menuItem}
            onClick={handleLogout}
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
