import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";
import { DEFAULT_CONTENT_DIR } from "../scripts/generate-manifest";
import { arithmeticAdditionModule, makeLesson } from "../src/content/fixtures";
import { parseLesson } from "../src/content/parse";
import {
  GENERIC_REASON_SENTENCE,
  REASON_SENTENCES,
  reasonSentence,
} from "../src/content/reasons";
import type { Lesson } from "../src/content/types";

function lessonFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return lessonFiles(path);
    return entry.name.endsWith(".md") ? [path] : [];
  });
}

/** Codes that reach the sentence map: an authored reason wins, so its criterion needs no entry. */
function reasonCodes(lessons: Lesson[]): string[] {
  return lessons.flatMap((lesson) =>
    lesson.steps.flatMap((step) =>
      step.type === "answer"
        ? step.criteria.filter((c) => !c.reason?.trim()).map((c) => c.reason_code ?? "")
        : [],
    ),
  );
}

const committedLessons = lessonFiles(DEFAULT_CONTENT_DIR).map((path) =>
  parseLesson(readFileSync(path, "utf-8"), relative(join(DEFAULT_CONTENT_DIR, ".."), path)),
);
// contentIndex is the real content now, so the fixture is read directly.
const fixtureLessons = arithmeticAdditionModule.lessons;

describe("reasonSentence", () => {
  it.each(Object.keys(REASON_SENTENCES))("maps %s to a non-empty sentence", (code) => {
    const sentence = reasonSentence(code);
    expect(sentence.trim()).not.toBe("");
    expect(sentence).not.toBe(GENERIC_REASON_SENTENCE);
    expect(sentence).not.toContain(code);
  });

  it("keeps the not-yet tone: no sentence says wrong", () => {
    for (const sentence of [...Object.values(REASON_SENTENCES), GENERIC_REASON_SENTENCE]) {
      expect(sentence).not.toMatch(/\bwrong\b/i);
    }
  });

  it("covers every reason_code the committed lessons and fixtures use", () => {
    const codes = reasonCodes([...committedLessons, ...fixtureLessons]);
    expect(codes.length).toBeGreaterThan(0);
    for (const code of codes) {
      expect(Object.hasOwn(REASON_SENTENCES, code), `no sentence for reason_code "${code}"`).toBe(true);
    }
  });

  it("needs no sentence for a code whose criterion has an authored reason", () => {
    const lesson = makeLesson({
      steps: [
        {
          type: "answer",
          prompt: "What is half of 10?",
          criteria: [
            { check: "equals", expected: 5, reason_code: "not_half", reason: "Split it into two equal groups." },
            { check: "equals", expected: 5, reason_code: "not_quarter", reason: "   " },
          ],
        },
      ],
    });
    expect(reasonCodes([lesson])).toEqual(["not_quarter"]);
  });

  it("falls back to a generic sentence for an unknown code, never the code itself", () => {
    const sentence = reasonSentence("mystery_code_42");
    expect(sentence).toBe(GENERIC_REASON_SENTENCE);
    expect(sentence).not.toContain("mystery_code_42");
  });

  it("falls back when there is no code at all", () => {
    expect(reasonSentence(undefined)).toBe(GENERIC_REASON_SENTENCE);
  });

  it("falls back for object prototype keys", () => {
    expect(reasonSentence("toString")).toBe(GENERIC_REASON_SENTENCE);
    expect(reasonSentence("__proto__")).toBe(GENERIC_REASON_SENTENCE);
  });

  it("prefers an author-written reason over the generic sentence", () => {
    const authored = "Count the red marbles, then count on the blue ones.";
    expect(reasonSentence("wrong_total", authored)).toBe(authored);
    expect(reasonSentence("mystery_code_42", authored)).toBe(authored);
  });

  it("ignores a blank author-written reason", () => {
    expect(reasonSentence("wrong_total", "   ")).toBe(REASON_SENTENCES.wrong_total);
  });
});
