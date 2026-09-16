/**
 * Content Contracts & Types
 *
 * Core domain types for modules, lessons, steps, criteria, and evaluation results.
 * This is the fixed contract that all Phase 2 content and UI components import.
 */

// ---------------------------------------------------------------------------
// Criteria (Discriminated Union of all 6 check types)
// ---------------------------------------------------------------------------

export interface EqualsCriterion {
  check: "equals";
  expected: number | string;
  reason_code?: string;
}

export interface ApproxCriterion {
  check: "approx";
  expected: {
    value: number;
    epsilon: number;
  };
  reason_code?: string;
}

export interface InRangeCriterion {
  check: "in_range";
  expected: {
    min: number;
    max: number;
  };
  reason_code?: string;
}

export interface EqualsAnyCriterion {
  check: "equals_any";
  expected: (number | string)[];
  reason_code?: string;
}

export interface SetEqualsCriterion {
  check: "set_equals";
  expected: (number | string)[];
  reason_code?: string;
}

export interface EquivalentCriterion {
  check: "equivalent";
  expected: string;
  reason_code?: string;
}

export type Criterion =
  | EqualsCriterion
  | ApproxCriterion
  | InRangeCriterion
  | EqualsAnyCriterion
  | SetEqualsCriterion
  | EquivalentCriterion;

// ---------------------------------------------------------------------------
// Steps (Discriminated Union)
// ---------------------------------------------------------------------------

export interface ExplainStep {
  type: "explain";
  content: string;
}

export interface AnswerStep {
  type: "answer";
  prompt: string;
  criteria: Criterion[];
}

export type Step = ExplainStep | AnswerStep;

// ---------------------------------------------------------------------------
// Page facing accessors types
// ---------------------------------------------------------------------------

export interface PageAnswerStep {
  type: "answer";
  prompt: string;
}

export type PageStep = ExplainStep | PageAnswerStep;

export type PageLesson = Omit<Lesson, "steps"> & {
  steps: PageStep[];
};

export type PageModule = Omit<Module, "lessons"> & {
  lessons: PageLesson[];
};

// ---------------------------------------------------------------------------
// Lesson & Module Models
// ---------------------------------------------------------------------------

export type LessonType = "tutorial" | "lab";

export interface Lesson {
  slug: string;
  title: string;
  type: LessonType;
  description?: string;
  outcome?: string;
  requires?: string[];
  steps: Step[];
}

export interface Module {
  slug: string;
  title: string;
  description?: string;
  lessons: Lesson[];
}

// ---------------------------------------------------------------------------
// Evaluation Results
// ---------------------------------------------------------------------------

export interface CriterionResult {
  passed: boolean;
  reason_code?: string;
  error?: string;
}

export interface StepResult {
  passed: boolean;
  results: CriterionResult[];
  reason_code?: string;
}
