import { useContext, useId, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";
import styles from "./SignInPrompt.module.css";

/** Where the prompt sits; each surface is dismissed on its own. */
export type SignInPromptSurface = "modules" | "module" | "lesson";

export interface SignInPromptProps {
  surface: SignInPromptSurface;
  /** Lesson surface only: renders an empty live region until the lesson passes, so the invitation is announced when it lands. */
  show?: boolean;
}

const COPY: Record<SignInPromptSurface, { title: string; body: string }> = {
  modules: {
    title: "Progress isn't saved while you're signed out",
    body: "Every lesson is open to you. Sign in and we'll keep track of the ones you finish.",
  },
  module: {
    title: "Progress isn't saved while you're signed out",
    body: "Sign in and we'll keep track of the lessons you finish here.",
  },
  lesson: {
    title: "Lesson complete, nice work!",
    body: "You're signed out, so this one isn't saved yet. Sign in to keep track of it.",
  },
};

const dismissKey = (surface: SignInPromptSurface) => `mb:signin-prompt-dismissed:${surface}`;

function readDismissed(surface: SignInPromptSurface): boolean {
  try {
    return sessionStorage.getItem(dismissKey(surface)) === "1";
  } catch {
    return false;
  }
}

/** A quiet invitation to sign in; never a failure, never shown signed in or while auth is loading. */
export function SignInPrompt({ surface, show = true }: SignInPromptProps) {
  // Read directly so a stepper rendered without an AuthProvider simply shows nothing.
  const auth = useContext(AuthContext);
  const [dismissed, setDismissed] = useState(() => readDismissed(surface));

  if (!auth || auth.loading || auth.account || dismissed) return null;

  const dismiss = () => {
    try {
      sessionStorage.setItem(dismissKey(surface), "1");
    } catch {
      // Storage blocked: hidden until this page unmounts, which is the best available.
    }
    setDismissed(true);
    // The focused button is about to unmount; keep focus in the page, not on <body>.
    document.getElementById("main-content")?.focus();
  };

  const prompt = show && <PromptCard surface={surface} onDismiss={dismiss} />;

  return surface === "lesson" ? <div role="status">{prompt}</div> : prompt;
}

// Split out so the router is only needed once there is something to link from.
function PromptCard({ surface, onDismiss }: { surface: SignInPromptSurface; onDismiss: () => void }) {
  const location = useLocation();
  const titleId = useId();
  const { title, body } = COPY[surface];

  return (
    <section
      className={surface === "lesson" ? styles.prompt : `${styles.prompt} ${styles.spaced}`}
      aria-labelledby={titleId}
    >
      <SaveGlyph />
      <div className={styles.text}>
        <p id={titleId} className={styles.title}>
          {title}
        </p>
        <p className={styles.body}>{body}</p>
      </div>
      <div className={styles.actions}>
        <Link
          to="/login"
          state={{ from: location.pathname + location.search }}
          className="btn btn--secondary btn--sm"
        >
          Sign in to save your progress
        </Link>
        <button type="button" className={styles.dismiss} onClick={onDismiss}>
          Not now
        </button>
      </div>
    </section>
  );
}

// Decorative bookmark: the text carries the meaning, this just marks the prompt apart without colour.
function SaveGlyph() {
  return (
    <svg
      className={styles.glyph}
      viewBox="0 0 24 24"
      width="24"
      height="24"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M6 3.5h12a1 1 0 0 1 1 1V21l-7-4.5L5 21V4.5a1 1 0 0 1 1-1Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}
