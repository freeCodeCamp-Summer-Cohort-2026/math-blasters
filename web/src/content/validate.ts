import { Lesson } from "./types";

export const validateLesson = (lesson: Lesson, path?: string): void => {
  const lessonPath = typeof path === "string" && path.trim() !== "" ? path : "<unknown lesson>";

  const outcome = typeof lesson.outcome === "string" ? lesson.outcome.trim() : "";

  if (lesson.type === "lab" && outcome === "") {
    throw new Error(
      `${lessonPath}: the "outcome" field is required for a lab lesson.`
    );
  }

  if (lesson.type === "tutorial" && outcome !== "") {
    throw new Error(
      `${lessonPath}: the "outcome" field is not allowed for a tutorial lesson.`
    );
  }
};