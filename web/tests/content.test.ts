import { describe, it, expect } from "vitest";
import {
  contentIndex,
  makeLesson,
  parseLesson,
  validateLesson,
  checkStep,
  checkCriterion,
  type Criterion,
  type Step,
  getModule,
  getLesson,
  getModules,
  getModuleForLesson,
} from "../src/content";
import { parseCriteria } from "../src/content/criteria";
import { expectNoCriteria } from "./helpers/accessors";

describe("Content Contracts & Fixtures", () => {
  describe("makeLesson helper", () => {
    it("creates a lesson with sensible defaults", () => {
      const lesson = makeLesson();

      expect(lesson.slug).toBe("sample-lesson");
      expect(lesson.title).toBe("Sample Lesson");
      expect(lesson.type).toBe("tutorial");
      expect(lesson.steps).toHaveLength(2);
      expect(lesson.steps[0].type).toBe("explain");
      expect(lesson.steps[1].type).toBe("answer");
    });

    it("applies custom overrides cleanly", () => {
      const custom = makeLesson({
        slug: "custom-lesson",
        title: "Custom Title",
        type: "lab",
        outcome: "Understand fractions",
        requires: ["division"],
      });

      expect(custom.slug).toBe("custom-lesson");
      expect(custom.title).toBe("Custom Title");
      expect(custom.type).toBe("lab");
      expect(custom.outcome).toBe("Understand fractions");
      expect(custom.requires).toEqual(["division"]);
      expect(custom.steps).toHaveLength(2); // Retains default steps unless overridden
    });
  });

  describe("Fixtures", () => {
    it("exports contentIndex with arithmetic-addition module", () => {
      expect(contentIndex).toHaveLength(1);
      expect(contentIndex[0].slug).toBe("arithmetic-addition");
    });

    it("adding-two-numbers tutorial has the expected steps and criteria", () => {
      const lesson = contentIndex[0].lessons.find(
        (l) => l.slug === "adding-two-numbers",
      );
      expect(lesson).toBeDefined();
      expect(lesson?.type).toBe("tutorial");
      expect(lesson?.steps).toHaveLength(2);

      const [explainStep, answerStep] = lesson!.steps;
      expect(explainStep.type).toBe("explain");
      expect(answerStep.type).toBe("answer");

      if (answerStep.type === "answer") {
        expect(answerStep.prompt).toBe("What is $3 + 4$?");
        expect(answerStep.criteria).toEqual([
          {
            check: "equals",
            expected: 7,
            reason_code: "wrong_total",
          },
        ]);
      }
    });

    it("marbles-in-total lab has an outcome and prerequisites", () => {
      const lesson = contentIndex[0].lessons.find(
        (l) => l.slug === "marbles-in-total",
      );
      expect(lesson).toBeDefined();
      expect(lesson?.type).toBe("lab");
      expect(lesson?.outcome).toBeDefined();
      expect(lesson?.requires).toEqual(["addition"]);
    });
  });

  describe("Signature-only stubs", () => {
    it('parseLesson throws "not implemented"', () => {
      expect(() => parseLesson("some source")).toThrow("not implemented");
    });

    it('validateLesson throws "not implemented"', () => {
      const lesson = makeLesson();
      expect(() => validateLesson(lesson)).toThrow("not implemented");
    });
  });

  describe("Evaluation exports", () => {
    it("evaluates checkStep via content export", () => {
      const step: Step = { type: "explain", content: "hello" };
      expect(checkStep(step, "submission")).toEqual({
        passed: true,
        results: [],
      });
    });

    it("evaluates checkCriterion via content export", () => {
      const criterion: Criterion = {
        check: "equals",
        expected: 42,
        reason_code: "wrong_num",
      };
      expect(checkCriterion(criterion, 42)).toEqual({ passed: true });
      expect(checkCriterion(criterion, 43)).toEqual({
        passed: false,
        reason_code: "wrong_num",
      });
    });
  });
});

describe("content accessors", () => {
  it("returns all modules", () => {
    const modules = getModules();

    expect(modules).toHaveLength(contentIndex.length);
    expect(modules[0].slug).toBe(contentIndex[0].slug);
  });

  it("returns a module by slug", () => {
    const expected = contentIndex[0];

    const result = getModule(expected.slug);

    expect(result?.slug).toBe(expected.slug);
  });

  it("returns undefined for an unknown module slug", () => {
    expect(getModule("does-not-exist")).toBeUndefined();
  });

  it("returns a lesson by slug", () => {
    const expected = contentIndex[0].lessons[0];

    const result = getLesson(expected.slug);

    expect(result?.slug).toBe(expected.slug);
  });

  it("returns undefined for an unknown lesson slug", () => {
    expect(getLesson("does-not-exist")).toBeUndefined();
  });

  it("returns the slug of the module a lesson belongs to", () => {
    const module = contentIndex[0];
    const lesson = module.lessons[0];

    expect(getModuleForLesson(lesson.slug)).toBe(module.slug);
  });

  it("returns undefined for an unknown lesson slug from getModuleForLesson", () => {
    expect(getModuleForLesson("does-not-exist")).toBeUndefined();
  });

  it("does not expose criteria from getModules", () => {
    const pageModules = getModules();

    expectNoCriteria(pageModules);
  })

  it("does not expose criteria from getLesson", () => {
    const fixtureLesson = contentIndex[0].lessons[0];
    const lessonSlug = fixtureLesson.slug;

    expect(getLesson(lessonSlug)).toBeDefined();
    expectNoCriteria(getLesson(lessonSlug));
  })

  it("does not expose criteria from getModule", () => {
    const fixtureModule = contentIndex[0];
    const pageModule = getModule(fixtureModule.slug);

    expect(pageModule).toBeDefined();
    expectNoCriteria(pageModule);
  });
});

describe("parseCriteria", () => {
  it("parses an equals criterion", () => {
    const yaml = `- check: equals\n  expected: 7\n  reason_code: wrong_total`;

    expect(parseCriteria(yaml, "lesson.md", 1).criteria).toEqual([{
      check: "equals",
      expected: 7,
      reason_code: "wrong_total",
    }]);
  });
  it("rejects an equals criterion with a malformed expected value", () => {
    const yaml = `- check: equals\n  expected: [1, 2, 3]\n  reason_code: invalid_expected`;

    expect(() => parseCriteria(yaml, "lesson.md", 1)).toThrow();
  });
  it("parses an approx criterion", () => {
    const yaml = `- check: approx\n  expected:\n    value: 3.14\n    epsilon: 0.01\n  reason_code: wrong_pi`;

    expect(parseCriteria(yaml, "lesson.md", 1).criteria).toEqual([{
      check: "approx",
      expected: {
        value: 3.14,
        epsilon: 0.01,
      },
      reason_code: "wrong_pi",
    }]);
  });
  it("rejects an approx criterion with a malformed expected value", () => {
    const yaml = `- check: approx\n  expected: "not an object"\n  reason_code: invalid_expected`;

    expect(() => parseCriteria(yaml, "lesson.md", 1)).toThrow();
  });
  it("rejects an approx criterion with non-numeric value or epsilon", () => {
    const yaml = `- check: approx\n  expected:\n    value: "3.14"\n    epsilon: 0.01\n  reason_code: invalid_expected`;

    expect(() => parseCriteria(yaml, "lesson.md", 1)).toThrow();
  });
  it("rejects an unknown name", () => {
    const yaml = `- check: unknown\n  expected: 42\n  reason_code: invalid_check`;

    expect(() => parseCriteria(yaml, "lesson.md", 1)).toThrow(
      "Unknown check \"unknown\" at lesson.md step 1 index 0. Valid checks are: equals, approx, in_range, equals_any, set_equals, equivalent.",
    );
  });
  it("parses min and max for in_range criterion", () => {
    const yaml = `- check: in_range\n  expected:\n    min: 1\n    max: 10\n  reason_code: out_of_bounds`;

    expect(parseCriteria(yaml, "lesson.md", 1).criteria).toEqual([{
      check: "in_range",
      expected: {
        min: 1,
        max: 10,
      },
      reason_code: "out_of_bounds",
    }]);
  });
  it("rejects an in_range criterion with a malformed expected value", () => {
    const yaml = `- check: in_range\n  expected: "not an object"\n  reason_code: invalid_expected`;

    expect(() => parseCriteria(yaml, "lesson.md", 1)).toThrow();
  });
  it("rejects an in_range criterion where min is greater than max", () => {
    const yaml = `- check: in_range\n  expected:\n    min: 10\n    max: 1\n  reason_code: out_of_bounds`;

    expect(() => parseCriteria(yaml, "lesson.md", 1)).toThrow();
  });
  it("parses an equals_any criterion with numbers", () => {
    const yaml = `- check: equals_any\n  expected: [1, 2, 3]\n  reason_code: not_in_list`;

    expect(parseCriteria(yaml, "lesson.md", 1).criteria).toEqual([{
      check: "equals_any",
      expected: [1, 2, 3],
      reason_code: "not_in_list",
    }]);
  });
  it("rejects an equals_any criterion with a malformed expected value", () => {
    const yaml = `- check: equals_any\n  expected: "not an array"\n  reason_code: invalid_expected`;

    expect(() => parseCriteria(yaml, "lesson.md", 1)).toThrow();
  });
  it("rejects an equals_any criterion with an empty array", () => {
    const yaml = `- check: equals_any\n  expected: []\n  reason_code: not_in_list`;

    expect(() => parseCriteria(yaml, "lesson.md", 1)).toThrow();
  });
  it("parses an equals_any criterion with strings", () => {
    const yaml = `- check: equals_any\n  expected: ["a", "b", "c"]\n  reason_code: not_in_list`;

    expect(parseCriteria(yaml, "lesson.md", 1).criteria).toEqual([{
      check: "equals_any",
      expected: ["a", "b", "c"],
      reason_code: "not_in_list",
    }]);
  });
  it("parses a set_equals criterion with numbers", () => {
    const yaml = `- check: set_equals\n  expected: [1, 2, 3]\n  reason_code: sets_not_equal`;

    expect(parseCriteria(yaml, "lesson.md", 1).criteria).toEqual([{
      check: "set_equals",
      expected: [1, 2, 3],
      reason_code: "sets_not_equal",
    }]);
  });
  it("rejects a set_equals criterion with a malformed expected value", () => {
    const yaml = `- check: set_equals\n  expected: "not an array"\n  reason_code: invalid_expected`;

    expect(() => parseCriteria(yaml, "lesson.md", 1)).toThrow();
  });
  it("rejects a set_equals criterion with an empty array", () => {
    const yaml = `- check: set_equals\n  expected: []\n  reason_code: sets_not_equal`;

    expect(() => parseCriteria(yaml, "lesson.md", 1)).toThrow();
  });
  it("parses a set_equals criterion with strings", () => {
    const yaml = `- check: set_equals\n  expected: ["x", "y", "z"]\n  reason_code: sets_not_equal`;

    expect(parseCriteria(yaml, "lesson.md", 1).criteria).toEqual([{
      check: "set_equals",
      expected: ["x", "y", "z"],
      reason_code: "sets_not_equal",
    }]);
  });
  it("parses an equivalent criterion", () => {
    const yaml = `- check: equivalent\n  expected: "some_expression"\n  reason_code: not_equivalent`;

    expect(parseCriteria(yaml, "lesson.md", 1).criteria).toEqual([{
      check: "equivalent",
      expected: "some_expression",
      reason_code: "not_equivalent",
    }]);
  });
  it("rejects an equivalent criterion with a malformed expected value", () => {
    const yaml = `- check: equivalent\n  expected: 42\n  reason_code: invalid_expected`;

    expect(() => parseCriteria(yaml, "lesson.md", 1)).toThrow();
  });
  it("rejects an equivalent criterion whose expression doesn't parse", () => {
    const yaml = `- check: equivalent\n  expected: "3 + "\n  reason_code: not_equivalent`;

    expect(() => parseCriteria(yaml, "lesson.md", 1)).toThrow();
  });
  it("rejects an empty criteria list", () => {
    const yaml = `[]`;

    expect(() => parseCriteria(yaml, "lesson.md", 1)).toThrow();
  });
  it("rejects a criterion with an empty reason_code", () => {
    const yaml = `- check: equals\n  expected: 42\n  reason_code: ""`;

    expect(() => parseCriteria(yaml, "lesson.md", 1)).toThrow();
  });
  it("rejects a criterion with a missing reason_code", () => {
    const yaml = `- check: equals\n  expected: 42`;

    expect(() => parseCriteria(yaml, "lesson.md", 1)).toThrow();
  });
  it("rejects a criterion with a non-string reason_code", () => {
    const yaml = `- check: equals\n  expected: 42\n  reason_code: 123`;

    expect(() => parseCriteria(yaml, "lesson.md", 1)).toThrow();
  });
  it("rejects a criterion with a whitespace-only reason_code", () => {
    const yaml = `- check: equals\n  expected: 42\n  reason_code: "   "`;

    expect(() => parseCriteria(yaml, "lesson.md", 1)).toThrow();
  });

  // Adding new tests to verify recent changes in parseCriteria
  it("parses bare list form of unchanged criteria", () => {
    const yaml = `- check: equals\n  expected: 2\n  reason_code: wrong`;

    const result = parseCriteria(yaml, "lesson.md", 1);

    expect(result.criteria).toEqual([{
      check: "equals",
      expected: 2,
      reason_code: "wrong",
    }]);

    expect(result.checking).toBeUndefined();
    expect(result.hints).toBeUndefined();
  });

  it("parses mapping form with checking and hints", () => {
    const yaml = `checking: the total number of marbles\nhints:\n  - Count each jar first.\n  - Then add them up.\ncriteria:\n  - check: equals\n    expected: 15\n    reason_code: wrong_total`;

    const result = parseCriteria(yaml, "lesson.md", 1);

    expect(result.checking).toBe("the total number of marbles");
    expect(result.hints).toEqual(["Count each jar first.", "Then add them up."]);
    expect(result.criteria).toEqual([{
      check: "equals",
      expected: 15,
      reason_code: "wrong_total",
    }]);
  });

  it("parses mapping form with neither optional keys", () => {
    const yaml = `criteria:\n  - check: equals\n    expected: 15\n    reason_code: wrong_total`;

    const result = parseCriteria(yaml, "lesson.md", 1);

    expect(result.checking).toBeUndefined();
    expect(result.hints).toBeUndefined();
    expect(result.criteria).toEqual([{
      check: "equals",
      expected: 15,
      reason_code: "wrong_total",
    }]);
  });

  it.each([
    ["no criteria key", `checking: some sentence`],
    ["empty checking", `checking: ""\ncriteria:\n  - check: equals\n    expected: 15\n    reason_code: wrong_total`],
    ["empty hints list", `hints: []\ncriteria:\n  - check: equals\n    expected: 15\n    reason_code: wrong_total`],
    ["unknown key", `hint: oops\ncriteria:\n  - check: equals\n    expected: 15\n    reason_code: wrong_total`],
  ])("rejects mapping form: %s", (_label, yaml) => {
    expect(() => parseCriteria(yaml, "lesson.md", 1)).toThrow();
  });

  // hints should be a list of non-empty strings
  it("rejects mapping form with non-empty hints", () => {
    const yaml = `hints: [""]\ncriteria:\n  - check: equals\n    expected: 15\n    reason_code: wrong_total`;

    expect(() => parseCriteria(yaml, "lesson.md", 1)).toThrow();
  });
});
