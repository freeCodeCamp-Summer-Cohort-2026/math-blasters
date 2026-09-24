import { parse as parseYaml } from "yaml";
import { parseCriteria } from "./criteria";
import { validateLesson } from "./validate";
import type { AnswerStep, ExplainStep, Lesson, LessonType, Step } from "./types";

const FRONTMATTER_PATTERN = /^---\r?\n([\s\S]*?)\r?\n---[ \t]*\r?\n?/;
const STEP_MARKER_PATTERN = /^--(explain|answer)--[ \t]*$/gm;
const YAML_FENCE_PATTERN = /```yaml\r?\n([\s\S]*?)\r?\n```/g;
const FILENAME_PATTERN = /^(?:\d{2}-)?(.+)\.md$/;
const LESSON_TYPES: LessonType[] = ["tutorial", "lab"];

/**
 * Turn one markdown lesson file into a typed Lesson: split the frontmatter,
 * parse it with the `yaml` package, and split the body on step markers.
 */
export function parseLesson(source: string, path: string): Lesson {
  const { frontmatter, body } = splitFrontmatter(source, path);
  const data = parseFrontmatter(frontmatter, path);

  const slug = requireString(data, "slug", path);
  const title = requireString(data, "title", path);
  const type = requireLessonType(data, path);

  checkSlugMatchesFilename(slug, path);

  const steps = parseSteps(body, path);

  const lesson: Lesson = { slug, title, type, steps };

  const description = optionalString(data, "description", path);
  if (description !== undefined) lesson.description = description;

  const outcome = optionalString(data, "outcome", path);
  if (outcome !== undefined) lesson.outcome = outcome;

  const teaches = optionalStringArray(data, "teaches", path);
  if (teaches !== undefined) lesson.teaches = teaches;

  const requires = optionalStringArray(data, "requires", path);
  if (requires !== undefined) lesson.requires = requires;

  validateLesson(lesson, path);

  return lesson;
}

function splitFrontmatter(
  source: string,
  path: string,
): { frontmatter: string; body: string } {
  const match = FRONTMATTER_PATTERN.exec(source);

  if (!match) {
    throw new Error(
      `${path}: missing frontmatter — a lesson file must start with "---", the YAML frontmatter, then "---".`,
    );
  }

  return { frontmatter: match[1], body: source.slice(match[0].length) };
}

function parseFrontmatter(frontmatter: string, path: string): Record<string, unknown> {
  let data: unknown;

  try {
    data = parseYaml(frontmatter);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(`${path}: frontmatter is not valid YAML — ${reason}`);
  }

  if (typeof data !== "object" || data === null || Array.isArray(data)) {
    throw new Error(`${path}: frontmatter must be a YAML mapping of fields.`);
  }

  return data as Record<string, unknown>;
}

function requireString(data: Record<string, unknown>, field: string, path: string): string {
  const value = data[field];

  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${path}: the "${field}" field is required and must be a non-empty string.`);
  }

  return value;
}

function optionalString(
  data: Record<string, unknown>,
  field: string,
  path: string,
): string | undefined {
  const value = data[field];

  if (value === undefined) return undefined;

  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${path}: the "${field}" field must be a non-empty string.`);
  }

  return value;
}

function optionalStringArray(
  data: Record<string, unknown>,
  field: string,
  path: string,
): string[] | undefined {
  const value = data[field];

  if (value === undefined) return undefined;

  if (
    !Array.isArray(value) ||
    value.length === 0 ||
    !value.every((item) => typeof item === "string" && item.trim() !== "")
  ) {
    throw new Error(`${path}: the "${field}" field must be a non-empty list of strings.`);
  }

  return value;
}

function requireLessonType(data: Record<string, unknown>, path: string): LessonType {
  const value = data.type;

  if (typeof value !== "string" || !LESSON_TYPES.includes(value as LessonType)) {
    throw new Error(
      `${path}: the "type" field must be one of ${LESSON_TYPES.map((type) => `"${type}"`).join(" or ")}.`,
    );
  }

  return value as LessonType;
}

function checkSlugMatchesFilename(slug: string, path: string): void {
  const basename = path.split(/[\\/]/).pop() ?? path;
  const match = FILENAME_PATTERN.exec(basename);

  if (!match) {
    throw new Error(`${path}: filename must look like "<slug>.md" or "<NN>-<slug>.md".`);
  }

  const filenameSlug = match[1];

  if (filenameSlug !== slug) {
    throw new Error(
      `${path}: the "slug" field ("${slug}") must match the filename ("${filenameSlug}").`,
    );
  }
}

interface RawStep {
  type: "explain" | "answer";
  stepNumber: number;
  content: string;
}

function splitIntoRawSteps(body: string, path: string): RawStep[] {
  const matches = [...body.matchAll(STEP_MARKER_PATTERN)];

  if (matches.length === 0) {
    throw new Error(
      `${path}: a lesson must have at least one step, marked with "--explain--" or "--answer--".`,
    );
  }

  const preamble = body.slice(0, matches[0].index).trim();

  if (preamble !== "") {
    throw new Error(
      `${path}: content before the first "--${matches[0][1]}--" marker is not allowed.`,
    );
  }

  return matches.map((match, index) => {
    const start = match.index + match[0].length;
    const end = index + 1 < matches.length ? matches[index + 1].index : body.length;

    return {
      type: match[1] as "explain" | "answer",
      stepNumber: index + 1,
      content: body.slice(start, end).trim(),
    };
  });
}

function parseSteps(body: string, path: string): Step[] {
  const steps = splitIntoRawSteps(body, path).map((rawStep) =>
    rawStep.type === "explain" ? parseExplainStep(rawStep, path) : parseAnswerStep(rawStep, path),
  );

  if (!steps.some((step) => step.type === "answer")) {
    throw new Error(
      `${path}: a lesson must have at least one "--answer--" step — a lesson made only of "--explain--" steps cannot be solved.`,
    );
  }

  return steps;
}

function parseExplainStep(rawStep: RawStep, path: string): ExplainStep {
  if (rawStep.content === "") {
    throw new Error(`${path}: step ${rawStep.stepNumber} ("explain") has no content.`);
  }

  return { type: "explain", content: rawStep.content };
}

function parseAnswerStep(rawStep: RawStep, path: string): AnswerStep {
  const fences = [...rawStep.content.matchAll(YAML_FENCE_PATTERN)];

  if (fences.length === 0) {
    throw new Error(
      `${path}: step ${rawStep.stepNumber} ("answer") is missing its fenced "yaml" criteria block.`,
    );
  }

  if (fences.length > 1) {
    throw new Error(
      `${path}: step ${rawStep.stepNumber} ("answer") must have exactly one fenced "yaml" block, found ${fences.length}.`,
    );
  }

  const [fence] = fences;
  const prompt = rawStep.content.slice(0, fence.index).trim();
  const trailing = rawStep.content.slice(fence.index + fence[0].length).trim();

  if (prompt === "") {
    throw new Error(`${path}: step ${rawStep.stepNumber} ("answer") has no prompt.`);
  }

  if (trailing !== "") {
    throw new Error(
      `${path}: step ${rawStep.stepNumber} ("answer") has content after the "yaml" criteria block.`,
    );
  }

  const parsed = parseCriteria(fence[1], path, rawStep.stepNumber);

  const step: AnswerStep = { type: "answer", prompt, criteria: parsed.criteria };

  if (parsed.checking !== undefined) {
    step.checking = parsed.checking;
  }
  
  if (parsed.hints !== undefined) {
    step.hints = parsed.hints;
  }

  return step;
}
