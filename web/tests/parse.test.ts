import { describe, it, expect } from "vitest";
import { parseLesson } from "../src/content/parse";

const TUTORIAL_PATH = "content/arithmetic-addition/01-adding-two-numbers.md";
const TUTORIAL_SOURCE = `---
slug: adding-two-numbers
type: tutorial
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

const LAB_PATH = "content/arithmetic-addition/02-marbles-in-total.md";
const LAB_SOURCE = `---
slug: marbles-in-total
type: lab
title: Marbles in total
outcome: Combine groups of marbles to find total sums in applied scenarios.
requires: [addition]
---

--explain--

You have a jar with 5 blue marbles and 6 red marbles. Combine them to find the total count.

--answer--

How many marbles do you have in total?

\`\`\`yaml
- check: equals
  expected: 11
  reason_code: wrong_total
\`\`\`
`;

const MINIMAL_ANSWERED_BODY =
  "--explain--\n\nSome explanation.\n\n--answer--\n\nWhat is 1 + 1?\n\n```yaml\n- check: equals\n  expected: 2\n  reason_code: wrong\n```\n";

const minimalTutorial = (frontmatterExtra = "", body = MINIMAL_ANSWERED_BODY) =>
  `---\nslug: sample-lesson\ntype: tutorial\ntitle: Sample Lesson\n${frontmatterExtra}---\n\n${body}`;

const minimalLab = (frontmatterExtra = "", body = MINIMAL_ANSWERED_BODY) =>
  `---\nslug: sample-lesson\ntype: lab\ntitle: Sample Lesson\n${frontmatterExtra}---\n\n${body}`;

const PATH = "content/sample-module/01-sample-lesson.md";

describe("parseLesson: full examples", () => {
  it("parses the tutorial example into the right step structure", () => {
    const lesson = parseLesson(TUTORIAL_SOURCE, TUTORIAL_PATH);

    expect(lesson.slug).toBe("adding-two-numbers");
    expect(lesson.title).toBe("Adding two numbers");
    expect(lesson.type).toBe("tutorial");
    expect(lesson.teaches).toEqual(["addition", "counting-on"]);
    expect(lesson.outcome).toBeUndefined();
    expect(lesson.requires).toBeUndefined();
    expect(lesson.steps).toHaveLength(2);
    expect(lesson.steps[0]).toEqual({
      type: "explain",
      content: "Adding means putting two amounts together.",
    });
    expect(lesson.steps[1]).toEqual({
      type: "answer",
      prompt: "What is $3 + 4$?",
      criteria: [{ check: "equals", expected: 7, reason_code: "wrong_total" }],
    });
  });

  it("parses the lab example into the right step structure", () => {
    const lesson = parseLesson(LAB_SOURCE, LAB_PATH);

    expect(lesson.slug).toBe("marbles-in-total");
    expect(lesson.type).toBe("lab");
    expect(lesson.outcome).toBe(
      "Combine groups of marbles to find total sums in applied scenarios.",
    );
    expect(lesson.requires).toEqual(["addition"]);
    expect(lesson.teaches).toBeUndefined();
    expect(lesson.steps).toHaveLength(2);
    expect(lesson.steps[1]).toEqual({
      type: "answer",
      prompt: "How many marbles do you have in total?",
      criteria: [{ check: "equals", expected: 11, reason_code: "wrong_total" }],
    });
  });

  it("threads checking and hints from the mapping form onto the answer step", () => {
    const source = `---
slug: adding-two-numbers
type: tutorial
title: Adding two numbers
teaches: [addition, counting-on]
---

--explain--

Adding means putting two amounts together.

--answer--

What is $3 + 4$?

\`\`\`yaml
checking: the total number of marbles across all three jars
hints:
  - Count each jar separately first.
  - Add the first two, then add the third.
criteria:
  - check: equals
    expected: 7
    reason_code: wrong_total
\`\`\`
`;

    const lesson = parseLesson(source, TUTORIAL_PATH);

    expect(lesson.steps[1]).toEqual({
      type: "answer",
      prompt: "What is $3 + 4$?",
      criteria: [{ check: "equals", expected: 7, reason_code: "wrong_total" }],
      checking: "the total number of marbles across all three jars",
      hints: ["Count each jar separately first.", "Add the first two, then add the third."],
    });
  });
});

describe("parseLesson: semantic validation (via validateLesson)", () => {
  it("rejects a lab without an outcome", () => {
    const source = minimalLab();

    expect(() => parseLesson(source, PATH)).toThrow(
      `${PATH}: the "outcome" field is required for a lab lesson.`,
    );
  });

  it("rejects a tutorial with an outcome", () => {
    const source = minimalTutorial("outcome: Not allowed here.\n");

    expect(() => parseLesson(source, PATH)).toThrow(
      `${PATH}: the "outcome" field is not allowed for a tutorial lesson.`,
    );
  });

  it("accepts a valid lab with an outcome", () => {
    const source = minimalLab("outcome: Do the thing.\n");

    expect(() => parseLesson(source, PATH)).not.toThrow();
  });
});

describe("parseLesson: frontmatter and structural rejection rules", () => {
  it("rejects a file with no frontmatter block", () => {
    expect(() => parseLesson("--explain--\n\nHello.\n", PATH)).toThrow(
      `${PATH}: missing frontmatter`,
    );
  });

  it("rejects invalid YAML in the frontmatter", () => {
    const source = "---\nslug: [unterminated\n---\n\n--explain--\n\nHello.\n";

    expect(() => parseLesson(source, PATH)).toThrow(
      `${PATH}: frontmatter is not valid YAML`,
    );
  });

  it("rejects frontmatter that isn't a mapping", () => {
    const source = "---\n- just\n- a\n- list\n---\n\n--explain--\n\nHello.\n";

    expect(() => parseLesson(source, PATH)).toThrow(
      `${PATH}: frontmatter must be a YAML mapping of fields.`,
    );
  });

  it("rejects a missing slug", () => {
    const source =
      "---\ntype: tutorial\ntitle: Sample Lesson\n---\n\n--explain--\n\nHello.\n";

    expect(() => parseLesson(source, PATH)).toThrow(
      `${PATH}: the "slug" field is required and must be a non-empty string.`,
    );
  });

  it("rejects a missing title", () => {
    const source =
      "---\nslug: sample-lesson\ntype: tutorial\n---\n\n--explain--\n\nHello.\n";

    expect(() => parseLesson(source, PATH)).toThrow(
      `${PATH}: the "title" field is required and must be a non-empty string.`,
    );
  });

  it("rejects a type that isn't tutorial or lab", () => {
    const source =
      "---\nslug: sample-lesson\ntype: quiz\ntitle: Sample Lesson\n---\n\n--explain--\n\nHello.\n";

    expect(() => parseLesson(source, PATH)).toThrow(
      `${PATH}: the "type" field must be one of "tutorial" or "lab".`,
    );
  });

  it("rejects a slug that doesn't match the filename", () => {
    const source = minimalTutorial();

    expect(() =>
      parseLesson(source, "content/sample-module/01-different-slug.md"),
    ).toThrow(
      'the "slug" field ("sample-lesson") must match the filename ("different-slug")',
    );
  });

  it("rejects a path that doesn't look like a lesson file", () => {
    const source = minimalTutorial();

    expect(() =>
      parseLesson(source, "content/sample-module/sample-lesson"),
    ).toThrow("filename must look like");
  });

  it("rejects a filename with an extra numeric segment via the slug mismatch it produces", () => {
    const source = minimalTutorial();

    expect(() =>
      parseLesson(source, "content/sample-module/01-02-sample-lesson.md"),
    ).toThrow(
      'the "slug" field ("sample-lesson") must match the filename ("02-sample-lesson")',
    );
  });

  it("rejects content before the first step marker", () => {
    const source = minimalTutorial(
      "",
      "A stray paragraph.\n\n--explain--\n\nHello.\n",
    );

    expect(() => parseLesson(source, PATH)).toThrow(
      `${PATH}: content before the first "--explain--" marker is not allowed.`,
    );
  });

  it("rejects a lesson with no steps at all", () => {
    const source = minimalTutorial("", "Just a paragraph, no markers.\n");

    expect(() => parseLesson(source, PATH)).toThrow(
      `${PATH}: a lesson must have at least one step`,
    );
  });

  it("rejects a lesson made only of explain steps", () => {
    const source = minimalTutorial(
      "",
      "--explain--\n\nFirst part.\n\n--explain--\n\nSecond part.\n",
    );

    expect(() => parseLesson(source, PATH)).toThrow(
      `${PATH}: a lesson must have at least one "--answer--" step`,
    );
  });

  it("rejects an empty explain step", () => {
    const source = minimalTutorial("", "--explain--\n\n");

    expect(() => parseLesson(source, PATH)).toThrow(
      `${PATH}: step 1 ("explain") has no content.`,
    );
  });

  it("rejects an answer step with no fenced yaml block", () => {
    const source = minimalTutorial("", "--answer--\n\nWhat is 1 + 1?\n");

    expect(() => parseLesson(source, PATH)).toThrow(
      `${PATH}: step 1 ("answer") is missing its fenced "yaml" criteria block.`,
    );
  });

  it("rejects an answer step with more than one fenced yaml block", () => {
    const source = minimalTutorial(
      "",
      "--answer--\n\nWhat is 1 + 1?\n\n```yaml\n- check: equals\n  expected: 2\n  reason_code: wrong\n```\n\n```yaml\n- check: equals\n  expected: 2\n  reason_code: wrong\n```\n",
    );

    expect(() => parseLesson(source, PATH)).toThrow(
      `${PATH}: step 1 ("answer") must have exactly one fenced "yaml" block, found 2.`,
    );
  });

  it("rejects an answer step with an empty prompt", () => {
    const source = minimalTutorial(
      "",
      "--answer--\n\n```yaml\n- check: equals\n  expected: 2\n  reason_code: wrong\n```\n",
    );

    expect(() => parseLesson(source, PATH)).toThrow(
      `${PATH}: step 1 ("answer") has no prompt.`,
    );
  });

  it("rejects an answer step with content after the yaml block", () => {
    const source = minimalTutorial(
      "",
      "--answer--\n\nWhat is 1 + 1?\n\n```yaml\n- check: equals\n  expected: 2\n  reason_code: wrong\n```\n\nOne more line.\n",
    );

    expect(() => parseLesson(source, PATH)).toThrow(
      `${PATH}: step 1 ("answer") has content after the "yaml" criteria block.`,
    );
  });

  it("rejects a teaches list that isn't a non-empty array of strings", () => {
    const source = minimalTutorial("teaches: []\n");

    expect(() => parseLesson(source, PATH)).toThrow(
      `${PATH}: the "teaches" field must be a non-empty list of strings.`,
    );
  });

  it("rejects a requires list that isn't a non-empty array of strings", () => {
    const source = minimalLab(
      "requires: [addition, 42]\noutcome: Do the thing.\n",
    );

    expect(() => parseLesson(source, PATH)).toThrow(
      `${PATH}: the "requires" field must be a non-empty list of strings.`,
    );
  });

  it("propagates a malformed criteria block from parseCriteria", () => {
    const source = minimalTutorial(
      "",
      "--answer--\n\nWhat is 1 + 1?\n\n```yaml\n- check: not_a_real_check\n  expected: 2\n```\n",
    );

    expect(() => parseLesson(source, PATH)).toThrow();
  });
});
