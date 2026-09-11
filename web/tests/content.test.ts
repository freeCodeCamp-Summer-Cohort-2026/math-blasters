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
} from "../src/content";

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

    it('checkStep throws "not implemented"', () => {
      const step: Step = { type: "explain", content: "hello" };
      expect(() => checkStep(step, "submission")).toThrow("not implemented");
    });

    it('checkCriterion throws "not implemented"', () => {
      const criterion: Criterion = { check: "equals", expected: 42 };
      expect(() => checkCriterion(criterion, 42)).toThrow("not implemented");
    });
  });
});
