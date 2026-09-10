import { describe, it, expect, vi } from 'vitest';
import { parseLesson } from '../src/content/parse.js';

// ---------------------------------------------------------------------------
// Mock parseCriteria and validateLesson so we can assert they're called
// without hitting "not implemented".
// ---------------------------------------------------------------------------

vi.mock('../src/content/criteria.js', () => ({
  parseCriteria: vi.fn((_yaml: string, _path: string, _step: number) => [
    { check: 'equals', expected: 7, reason_code: 'wrong_total' },
  ]),
}));

vi.mock('../src/content/validate.js', () => ({
  validateLesson: vi.fn(),
}));

import { parseCriteria } from '../src/content/criteria.js';
import { validateLesson } from '../src/content/validate.js';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const TUTORIAL_SOURCE = `---
slug: adding-two-numbers
kind: tutorial
title: Adding two numbers
teaches: [addition, counting-on]
---

--explain--

Adding means putting two amounts together.

--answer--

What is $3 + 4$?

\`\`\`yaml
- check: equals
  expected: 7
  reason_code: wrong_total
\`\`\`
`;

const LAB_SOURCE = `---
slug: practice-addition
kind: lab
title: Practice addition
outcome: Can add single-digit numbers fluently
requires: [addition]
---

--explain--

Try these addition problems on your own.

--answer--

What is $2 + 5$?

\`\`\`yaml
- check: equals
  expected: 7
  reason_code: wrong_total
\`\`\`
`;

// ---------------------------------------------------------------------------
// Happy-path tests
// ---------------------------------------------------------------------------

describe('parseLesson — happy paths', () => {
  it('parses a tutorial lesson with the correct step structure', () => {
    const lesson = parseLesson(TUTORIAL_SOURCE, 'lessons/adding-two-numbers.md');

    expect(lesson.path).toBe('lessons/adding-two-numbers.md');
    expect(lesson.frontmatter).toEqual({
      slug: 'adding-two-numbers',
      kind: 'tutorial',
      title: 'Adding two numbers',
      teaches: ['addition', 'counting-on'],
    });

    expect(lesson.steps).toHaveLength(2);

    expect(lesson.steps[0].kind).toBe('explain');
    expect(lesson.steps[0].body).toContain('Adding means putting two amounts together.');

    expect(lesson.steps[1].kind).toBe('answer');
    expect(lesson.steps[1].body).toContain('What is $3 + 4$?');
    if (lesson.steps[1].kind === 'answer') {
      expect(lesson.steps[1].criteria).toEqual([
        { check: 'equals', expected: 7, reason_code: 'wrong_total' },
      ]);
    }
  });

  it('parses a lab lesson with outcome and requires', () => {
    const lesson = parseLesson(LAB_SOURCE, 'lessons/practice-addition.md');

    expect(lesson.frontmatter).toEqual({
      slug: 'practice-addition',
      kind: 'lab',
      title: 'Practice addition',
      outcome: 'Can add single-digit numbers fluently',
      requires: ['addition'],
    });

    expect(lesson.steps).toHaveLength(2);
    expect(lesson.steps[0].kind).toBe('explain');
    expect(lesson.steps[1].kind).toBe('answer');
  });
});

// ---------------------------------------------------------------------------
// Delegation tests
// ---------------------------------------------------------------------------

describe('parseLesson — delegation', () => {
  it('calls parseCriteria with the yaml content from the answer step', () => {
    vi.mocked(parseCriteria).mockClear();
    parseLesson(TUTORIAL_SOURCE, 'lessons/adding-two-numbers.md');

    expect(parseCriteria).toHaveBeenCalledTimes(1);
    const [yamlArg, pathArg, stepArg] = vi.mocked(parseCriteria).mock.calls[0];
    expect(yamlArg).toContain('check: equals');
    expect(yamlArg).toContain('expected: 7');
    expect(pathArg).toBe('lessons/adding-two-numbers.md');
    expect(stepArg).toBe(2); // step number is 1-indexed
  });

  it('calls validateLesson on the assembled lesson', () => {
    vi.mocked(validateLesson).mockClear();
    parseLesson(TUTORIAL_SOURCE, 'lessons/adding-two-numbers.md');

    expect(validateLesson).toHaveBeenCalledTimes(1);
    const [lessonArg] = vi.mocked(validateLesson).mock.calls[0];
    expect(lessonArg).toHaveProperty('frontmatter');
    expect(lessonArg).toHaveProperty('steps');
    expect(lessonArg).toHaveProperty('path');
  });
});

// ---------------------------------------------------------------------------
// Rejection rules — each test asserts the error message names the file
// and the relevant field or problem.
// ---------------------------------------------------------------------------

describe('parseLesson — rejection rules', () => {
  it('rejects a file with missing frontmatter delimiters', () => {
    const source = `slug: bad
--explain--
Hello`;
    expect(() => parseLesson(source, 'lessons/bad.md')).toThrow('lessons/bad.md');
    expect(() => parseLesson(source, 'lessons/bad.md')).toThrow(/frontmatter/i);
  });

  it('rejects when required field "slug" is missing', () => {
    const source = `---
kind: tutorial
title: Oops
teaches: [x]
---

--explain--

Hello`;
    expect(() => parseLesson(source, 'lessons/oops.md')).toThrow('lessons/oops.md');
    expect(() => parseLesson(source, 'lessons/oops.md')).toThrow('"slug"');
  });

  it('rejects when required field "kind" is missing', () => {
    const source = `---
slug: oops
title: Oops
teaches: [x]
---

--explain--

Hello`;
    expect(() => parseLesson(source, 'lessons/oops.md')).toThrow('lessons/oops.md');
    expect(() => parseLesson(source, 'lessons/oops.md')).toThrow('"kind"');
  });

  it('rejects when required field "title" is missing', () => {
    const source = `---
slug: oops
kind: tutorial
teaches: [x]
---

--explain--

Hello`;
    expect(() => parseLesson(source, 'lessons/oops.md')).toThrow('lessons/oops.md');
    expect(() => parseLesson(source, 'lessons/oops.md')).toThrow('"title"');
  });

  it('rejects an invalid kind value', () => {
    const source = `---
slug: oops
kind: quiz
title: Oops
teaches: [x]
---

--explain--

Hello`;
    expect(() => parseLesson(source, 'lessons/oops.md')).toThrow('lessons/oops.md');
    expect(() => parseLesson(source, 'lessons/oops.md')).toThrow('"kind"');
    expect(() => parseLesson(source, 'lessons/oops.md')).toThrow('quiz');
  });

  it('rejects when slug does not match the filename', () => {
    const source = `---
slug: wrong-slug
kind: tutorial
title: Oops
teaches: [x]
---

--explain--

Hello`;
    expect(() => parseLesson(source, 'lessons/right-slug.md')).toThrow('lessons/right-slug.md');
    expect(() => parseLesson(source, 'lessons/right-slug.md')).toThrow('"slug"');
    expect(() => parseLesson(source, 'lessons/right-slug.md')).toThrow('wrong-slug');
  });

  it('rejects content before the first step marker', () => {
    const source = `---
slug: oops
kind: tutorial
title: Oops
teaches: [x]
---

This is a preamble that shouldn't be here.

--explain--

Hello`;
    expect(() => parseLesson(source, 'lessons/oops.md')).toThrow('lessons/oops.md');
    expect(() => parseLesson(source, 'lessons/oops.md')).toThrow(/before the first step marker/i);
  });

  it('rejects an answer step without a fenced yaml block', () => {
    const source = `---
slug: oops
kind: tutorial
title: Oops
teaches: [x]
---

--answer--

What is 1 + 1?
`;
    expect(() => parseLesson(source, 'lessons/oops.md')).toThrow('lessons/oops.md');
    expect(() => parseLesson(source, 'lessons/oops.md')).toThrow('step 1');
    expect(() => parseLesson(source, 'lessons/oops.md')).toThrow(/yaml criteria block/i);
  });

  it('rejects an answer step with multiple fenced yaml blocks', () => {
    const source = `---
slug: oops
kind: tutorial
title: Oops
teaches: [x]
---

--answer--

What is 1 + 1?

\`\`\`yaml
- check: equals
  expected: 2
  reason_code: a
\`\`\`

\`\`\`yaml
- check: equals
  expected: 3
  reason_code: b
\`\`\`
`;
    expect(() => parseLesson(source, 'lessons/oops.md')).toThrow('lessons/oops.md');
    expect(() => parseLesson(source, 'lessons/oops.md')).toThrow('step 1');
    expect(() => parseLesson(source, 'lessons/oops.md')).toThrow(/2 fenced yaml blocks/i);
  });

  it('rejects an empty body (no steps)', () => {
    const source = `---
slug: oops
kind: tutorial
title: Oops
teaches: [x]
---

`;
    expect(() => parseLesson(source, 'lessons/oops.md')).toThrow('lessons/oops.md');
    expect(() => parseLesson(source, 'lessons/oops.md')).toThrow(/no steps/i);
  });

  it('rejects a lab missing the "outcome" field', () => {
    const source = `---
slug: oops
kind: lab
title: Oops
requires: [x]
---

--explain--

Hello`;
    expect(() => parseLesson(source, 'lessons/oops.md')).toThrow('lessons/oops.md');
    expect(() => parseLesson(source, 'lessons/oops.md')).toThrow('"outcome"');
  });

  it('rejects a lab missing the "requires" field', () => {
    const source = `---
slug: oops
kind: lab
title: Oops
outcome: something
---

--explain--

Hello`;
    expect(() => parseLesson(source, 'lessons/oops.md')).toThrow('lessons/oops.md');
    expect(() => parseLesson(source, 'lessons/oops.md')).toThrow('"requires"');
  });
});
