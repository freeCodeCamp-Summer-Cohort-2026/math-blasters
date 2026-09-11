import { arithmeticAdditionModule } from "./fixtures";
import type {
  Criterion,
  CriterionResult,
  Lesson,
  Module,
  Step,
  StepResult,
} from "./types";

// Re-export all types & fixtures
export * from "./types";
export * from "./fixtures";

/**
 * Content index containing all registered modules.
 * For now, this is populated with fixture data. It will be swapped for the
 * build-time glob / loader in a subsequent phase without changing the public contract.
 */
export const contentIndex: Module[] = [arithmeticAdditionModule];

// ---------------------------------------------------------------------------
// Accessor Stubs (operating synchronously against contentIndex)
// ---------------------------------------------------------------------------

/**
 * Retrieve all available modules.
 */
export function getModules(): Module[] {
  return contentIndex;
}

/**
 * Retrieve a module by its slug.
 */
export function getModule(slug: string): Module | undefined {
  return contentIndex.find((module) => module.slug === slug);
}

/**
 * Retrieve a lesson by its slug across all modules.
 */
export function getLesson(slug: string): Lesson | undefined {
  for (const module of contentIndex) {
    const lesson = module.lessons.find((l) => l.slug === slug);
    if (lesson) {
      return lesson;
    }
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// Signature-only Stubs (throw "not implemented")
// ---------------------------------------------------------------------------

/* eslint-disable @typescript-eslint/no-unused-vars */

/**
 * Parse raw lesson source into a Lesson domain object.
 */
export function parseLesson(_source: string, _path?: string): Lesson {
  throw new Error("not implemented");
}

/**
 * Validate a Lesson domain object against schema rules.
 */
export function validateLesson(_lesson: Lesson, _path?: string): void {
  throw new Error("not implemented");
}

/**
 * Check a step against a user submission.
 */
export function checkStep(_step: Step, _submission: unknown): StepResult {
  throw new Error("not implemented");
}

/**
 * Check an individual criterion against a user submission.
 */
export function checkCriterion(
  _criterion: Criterion,
  _submission: unknown,
): CriterionResult {
  throw new Error("not implemented");
}

/* eslint-enable @typescript-eslint/no-unused-vars */
