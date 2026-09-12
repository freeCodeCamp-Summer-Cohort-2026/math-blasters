import { arithmeticAdditionModule } from "./fixtures";
import type {
  Lesson,
  Module,
  PageLesson,
  PageModule,
} from "./types";

export const contentIndex: Module[] = [arithmeticAdditionModule];

export function getModules(): PageModule[] {
  return contentIndex.map(toPageModule);
}

export function getModule(slug: string): PageModule | undefined {
  const module = contentIndex.find((module) => module.slug === slug);

  return module ? toPageModule(module) : undefined;
}

export function getLesson(slug: string): PageLesson | undefined {
  for (const module of contentIndex) {
    const lesson = module.lessons.find((lesson) => lesson.slug === slug);

    if (lesson) {
      return toPageLesson(lesson);
    }
  }

  return undefined;
}

export function toPageLesson(lesson: Lesson): PageLesson {
  const steps = lesson.steps.map((step) => {
    if (step.type === "answer") {
      const { prompt, type } = step;

      return {prompt, type};
    }

    return step;
  });

  return {
    ...lesson,
    steps,
  };
}

export function toPageModule(module: Module): PageModule {
  return {
    ...module,
    lessons: module.lessons.map(toPageLesson),
  };
}