/**
 * Content model types for parsed lesson files.
 *
 * A lesson is a markdown file with YAML frontmatter and a body split
 * into steps by `--explain--` and `--answer--` markers.
 */

// ---------------------------------------------------------------------------
// Criteria (parsed from fenced yaml blocks inside answer steps)
// ---------------------------------------------------------------------------

export interface Criterion {
  check: string;
  expected: unknown;
  reason_code: string;
}

// ---------------------------------------------------------------------------
// Steps
// ---------------------------------------------------------------------------

export interface ExplainStep {
  kind: 'explain';
  body: string;
}

export interface AnswerStep {
  kind: 'answer';
  body: string;
  criteria: Criterion[];
}

export type Step = ExplainStep | AnswerStep;

// ---------------------------------------------------------------------------
// Frontmatter
// ---------------------------------------------------------------------------

export interface TutorialFrontmatter {
  slug: string;
  kind: 'tutorial';
  title: string;
  teaches: string[];
}

export interface LabFrontmatter {
  slug: string;
  kind: 'lab';
  title: string;
  outcome: string;
  requires: string[];
}

export type LessonFrontmatter = TutorialFrontmatter | LabFrontmatter;

// ---------------------------------------------------------------------------
// Parsed lesson
// ---------------------------------------------------------------------------

export interface Lesson {
  frontmatter: LessonFrontmatter;
  steps: Step[];
  path: string;
}
