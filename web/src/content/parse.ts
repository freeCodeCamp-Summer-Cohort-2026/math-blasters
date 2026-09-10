import * as yaml from 'js-yaml';
import type {
  Lesson,
  LessonFrontmatter,
  Step,
} from './types.js';
import { parseCriteria } from './criteria.js';
import { validateLesson } from './validate.js';

function filenameFromPath(path: string): string {
  const base = path.split('/').pop() ?? '';
  return base.replace(/\.md$/, '');
}

function splitFrontmatter(
  source: string,
  path: string,
): { rawYaml: string; body: string } {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) {
    throw new Error(
      `${path}: Missing or malformed frontmatter. ` +
        `The file must start with "---", followed by YAML fields, followed by a closing "---".`,
    );
  }
  return { rawYaml: match[1], body: match[2] };
}

function parseFrontmatter(
  rawYaml: string,
  path: string,
  expectedSlug: string,
): LessonFrontmatter {
  let parsed: unknown;
  try {
    parsed = yaml.load(rawYaml);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`${path}: Could not parse frontmatter YAML — ${message}`);
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error(
      `${path}: Frontmatter must be a YAML mapping (key: value pairs), not a ${Array.isArray(parsed) ? 'list' : typeof parsed}.`,
    );
  }

  const fm = parsed as Record<string, unknown>;

  requireString(fm, 'slug', path);
  requireString(fm, 'kind', path);
  requireString(fm, 'title', path);

  const kind = fm['kind'] as string;
  if (kind !== 'tutorial' && kind !== 'lab') {
    throw new Error(
      `${path}, field "kind": Expected "tutorial" or "lab", got "${kind}".`,
    );
  }

  const slug = fm['slug'] as string;
  if (slug !== expectedSlug) {
    throw new Error(
      `${path}, field "slug": The slug "${slug}" does not match the filename "${expectedSlug}".`,
    );
  }

  if (kind === 'tutorial') {
    requireStringArray(fm, 'teaches', path);
    return {
      slug,
      kind,
      title: fm['title'] as string,
      teaches: fm['teaches'] as string[],
    };
  }

  requireString(fm, 'outcome', path);
  requireStringArray(fm, 'requires', path);
  return {
    slug,
    kind,
    title: fm['title'] as string,
    outcome: fm['outcome'] as string,
    requires: fm['requires'] as string[],
  };
}

function requireString(
  fm: Record<string, unknown>,
  field: string,
  path: string,
): void {
  if (!(field in fm) || fm[field] === undefined || fm[field] === null) {
    throw new Error(
      `${path}, field "${field}": This required field is missing from the frontmatter.`,
    );
  }
  if (typeof fm[field] !== 'string') {
    throw new Error(
      `${path}, field "${field}": Expected a string, got ${typeof fm[field]}.`,
    );
  }
}

function requireStringArray(
  fm: Record<string, unknown>,
  field: string,
  path: string,
): void {
  if (!(field in fm) || fm[field] === undefined || fm[field] === null) {
    throw new Error(
      `${path}, field "${field}": This required field is missing from the frontmatter.`,
    );
  }
  if (!Array.isArray(fm[field])) {
    throw new Error(
      `${path}, field "${field}": Expected a list, got ${typeof fm[field]}.`,
    );
  }
}

const STEP_MARKER = /^--(explain|answer)--$/;

interface RawSection {
  marker: 'explain' | 'answer';
  content: string;
}

function splitSteps(body: string, path: string): RawSection[] {
  const lines = body.split(/\r?\n/);
  const sections: RawSection[] = [];
  let currentMarker: 'explain' | 'answer' | null = null;
  let currentLines: string[] = [];

  for (const line of lines) {
    const match = line.match(STEP_MARKER);
    if (match) {
      if (currentMarker !== null) {
        sections.push({
          marker: currentMarker,
          content: currentLines.join('\n').trim(),
        });
      } else if (currentLines.join('').trim().length > 0) {
        throw new Error(
          `${path}: Found content before the first step marker. ` +
            `The lesson body must begin with "--explain--" or "--answer--", not a preamble.`,
        );
      }
      currentMarker = match[1] as 'explain' | 'answer';
      currentLines = [];
    } else {
      currentLines.push(line);
    }
  }

  if (currentMarker !== null) {
    sections.push({
      marker: currentMarker,
      content: currentLines.join('\n').trim(),
    });
  }

  return sections;
}

const FENCED_YAML_BLOCK = /^```yaml\r?\n([\s\S]*?)^```$/gm;

function parseStep(
  section: RawSection,
  stepNumber: number,
  path: string,
): Step {
  if (section.marker === 'explain') {
    return { kind: 'explain', body: section.content };
  }

  const yamlBlocks: { yaml: string; index: number }[] = [];
  let match: RegExpExecArray | null;
  const regex = new RegExp(FENCED_YAML_BLOCK.source, 'gm');
  while ((match = regex.exec(section.content)) !== null) {
    yamlBlocks.push({ yaml: match[1], index: match.index });
  }

  if (yamlBlocks.length === 0) {
    throw new Error(
      `${path}, step ${stepNumber}: This answer step is missing a fenced yaml criteria block (\`\`\`yaml ... \`\`\`).`,
    );
  }
  if (yamlBlocks.length > 1) {
    throw new Error(
      `${path}, step ${stepNumber}: This answer step has ${yamlBlocks.length} fenced yaml blocks, but exactly one is expected.`,
    );
  }

  const yamlBlock = yamlBlocks[0];
  const prompt = section.content.slice(0, yamlBlock.index).trim();
  const criteria = parseCriteria(yamlBlock.yaml, path, stepNumber);

  return { kind: 'answer', body: prompt, criteria };
}

export function parseLesson(source: string, path: string): Lesson {
  const expectedSlug = filenameFromPath(path);
  const { rawYaml, body } = splitFrontmatter(source, path);
  const frontmatter = parseFrontmatter(rawYaml, path, expectedSlug);

  const rawSections = splitSteps(body, path);

  if (rawSections.length === 0) {
    throw new Error(
      `${path}: The lesson body has no steps. ` +
        `Add at least one "--explain--" or "--answer--" section.`,
    );
  }

  const steps: Step[] = rawSections.map((section, i) =>
    parseStep(section, i + 1, path),
  );

  const lesson: Lesson = { frontmatter, steps, path };

  validateLesson(lesson);

  return lesson;
}
