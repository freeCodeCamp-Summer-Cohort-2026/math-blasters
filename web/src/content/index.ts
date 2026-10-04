import { checkStep } from "./check";
import type {
  AnswerCheck,
  AnswerInputKind,
  Criterion,
  Lesson,
  Module,
  PageLesson,
  PageModule,
} from "./types";
import { parse as parseYaml } from "yaml";
import { parseLesson } from "./parse";
export { validateConcepts, requirementsOf, lockReason } from "./concepts";

const moduleSources = import.meta.glob<string>("@content/**/module.yaml", {
  eager: true,
  query: "?raw",
  import: "default",
});
const moduleEntries = Object.entries(moduleSources);
type ModuleMetadata = {
  slug: string;
  title: string;
  description: string;
  position: number;
  modulePath: string;
};

const modules: ModuleMetadata[] = [];

for (const [path, source] of moduleEntries) {
  const metadata = parseModuleMetadata(source, path);

  modules.push({
    ...metadata,
    modulePath: path.slice(0, path.lastIndexOf("/")),
  });
}

function parseModuleMetadata(
  source: string,
  path: string,
): Omit<ModuleMetadata, "modulePath"> {
  let data: unknown;

  try {
    data = parseYaml(source);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(`${path}: module metadata is not valid YAML — ${reason}`);
  }

  if (typeof data !== "object" || data === null || Array.isArray(data)) {
    throw new Error(`${path}: module metadata must be a YAML mapping of fields.`);
  }

  const record = data as Record<string, unknown>;

  return {
    slug: requireString(record, "slug", path),
    title: requireString(record, "title", path),
    description: requireString(record, "summary", path),
    position: requireNumber(record, "position", path),
  };
}

function requireString(
  data: Record<string, unknown>,
  field: string,
  path: string,
): string {
  const value = data[field];

  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(
      `${path}: the "${field}" field is required and must be a non-empty string.`,
    );
  }

  return value;
}

function requireNumber(
  data: Record<string, unknown>,
  field: string,
  path: string,
): number {
  const value = data[field];

  if (typeof value !== "number") {
    throw new Error(
      `${path}: the "${field}" field is required and must be a number.`,
    );
  }

  return value;
}

const lessonSources = import.meta.glob<string>("@content/**/*.md", { eager: true, query: "?raw", import: "default", });
const lessonEntries = Object.entries(lessonSources).sort(([a], [b]) =>
  a.localeCompare(b),
);
const lessonsByModule = new Map<string, Lesson[]>();
for (let index = 0; index < lessonEntries.length; index++) {
  const [path, source]: [string, string] = lessonEntries[index];
  const modulePath = path.slice(0, path.lastIndexOf("/"));
  
  const lesson = parseLesson(source, path);

  const moduleLessons = lessonsByModule.get(modulePath) ?? [];
  moduleLessons.push(lesson);
  lessonsByModule.set(modulePath, moduleLessons);
}

const contentModules: Module[] = [...modules]
  .sort((a, b) => a.position - b.position)
  .map(({ modulePath, slug, title, description }) => ({
    slug,
    title,
    description,
    lessons: lessonsByModule.get(modulePath) ?? [],
  }));

export { parseLesson } from "./parse";
export * from "./types";

/**
 * Content index containing all registered modules loaded from the real content files at build time.
 */
export const contentIndex: Module[] = contentModules;

// ---------------------------------------------------------------------------
// Accessor Stubs (operating synchronously against contentIndex)
// ---------------------------------------------------------------------------

/**
 * Retrieve all available modules.
 */
export function getModules(): PageModule[] {
  return contentIndex.map(toPageModule);
}

/**
 * Retrieve a module by its slug.
 */
export function getModule(slug: string): PageModule | undefined {
  const module = contentIndex.find((module) => module.slug === slug);

  return module ? toPageModule(module) : undefined;
}

/**
 * Retrieve a lesson by its slug across all modules.
 */
export function getLesson(slug: string): PageLesson | undefined {
  for (const module of contentIndex) {
    const lesson = module.lessons.find((lesson) => lesson.slug === slug);

    if (lesson) {
      return toPageLesson(lesson);
    }
  }

  return undefined;
}

/** Retrieve the slug of the module a lesson belongs to, so a lesson-only route (/lessons/:slug carries no module slug) can still link back to it. */
export function getModuleForLesson(lessonSlug: string): string | undefined {
  const module = contentIndex.find((module) =>
    module.lessons.some((lesson) => lesson.slug === lessonSlug),
  );

  return module?.slug;
}

function toPageLesson(lesson: Lesson): PageLesson {
  const steps = lesson.steps.map((step) => {
    if (step.type === "answer") {
      const { prompt, type, criteria, checking } = step;

      return {
        prompt,
        type,
        input: answerInputKind(criteria),
        ...(checking !== undefined && { checking }),
      };
    }

    return step;
  });

  return {
    ...lesson,
    steps,
  };
}

/** A text field for expressions, lists and word answers; a number field for everything else. */
export function answerInputKind(criteria: Criterion[]): AnswerInputKind {
  const needsText = criteria.some((criterion) => {
    switch (criterion.check) {
      case "equivalent":
      case "set_equals":
        return true;
      case "equals":
      case "equals_any":
        return [criterion.expected].flat().some((value) => typeof value === "string");
      default:
        return false;
    }
  });

  return needsText ? "text" : "number";
}

function toPageModule(module: Module): PageModule {
  return {
    ...module,
    lessons: module.lessons.map(toPageLesson),
  };
}

// ---------------------------------------------------------------------------
// Evaluation Exports
// ---------------------------------------------------------------------------

export { checkStep, checkCriterion, normalizeSubmission } from "./check";
export { reasonSentence, REASON_SENTENCES, GENERIC_REASON_SENTENCE } from "./reasons";

/** Checks one step of a lesson looked up by slug, so pages never hold criteria; undefined unless it is an answer step, like the accessors. */
export function checkAnswer(
  lessonSlug: string,
  stepIndex: number,
  submission: unknown,
): AnswerCheck | undefined {
  const lesson = contentIndex
    .flatMap((module) => module.lessons)
    .find((lesson) => lesson.slug === lessonSlug);
  const step = lesson?.steps[stepIndex];
  if (step?.type !== "answer") return undefined;

  const { passed, reason_code, reason } = checkStep(step, submission);
  return {
    passed,
    ...(reason_code !== undefined && { reason_code }),
    ...(reason !== undefined && { reason }),
  };
}

// useLesson imports checkAnswer back from here; the cycle is safe because it is only read when a submit runs.
export * from "./useLesson";

// ---------------------------------------------------------------------------
// Signature-only Stubs (throw "not implemented")
// ---------------------------------------------------------------------------

/* eslint-disable @typescript-eslint/no-unused-vars */

/**
 * Validate a Lesson domain object against schema rules.
 */
export function validateLesson(_lesson: Lesson, _path?: string): void {
  throw new Error("not implemented");
}

/* eslint-enable @typescript-eslint/no-unused-vars */
