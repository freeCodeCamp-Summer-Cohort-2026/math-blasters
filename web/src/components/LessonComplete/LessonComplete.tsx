import type { ReactNode } from "react";

export interface LessonCompleteProps {
  /** True once the lesson has passed and its feedback has moved past "checking". */
  show: boolean;
  /** Extra content for the completion moment, such as the signed-out sign-in invitation. */
  children?: ReactNode;
}

/** The lesson's completion moment: renders its children once shown. The answer step's live region announces it. Reads no auth state and posts nothing. */
export function LessonComplete({ show, children }: LessonCompleteProps) {
  return (
    <>
      {show && children}
    </>
  );
}
