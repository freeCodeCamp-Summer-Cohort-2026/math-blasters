import type { ReactNode } from "react";

export interface LessonCompleteProps {
  /** Driven by the lesson hook's `lessonPassed`; once true it stays true, so the announcement lands once. */
  show: boolean;
  /** Extra content for the completion moment, such as the signed-out sign-in invitation. */
  children?: ReactNode;
}

/** The lesson's completion moment: one announced sentence plus its children. Reads no auth state and posts nothing. */
export function LessonComplete({ show, children }: LessonCompleteProps) {
  return (
    <>
      {/* Always mounted and kept to one sentence, so the children aren't read out with it. */}
      <p className="sr-only" role="status">
        {show ? "Lesson complete. Nice work!" : ""}
      </p>
      {show && children}
    </>
  );
}
