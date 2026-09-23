import type { Criterion, CriterionResult, Step, StepResult } from "./types";
import { checkEquivalent } from "./equivalent";

/**
 * Normalise raw submission before comparison:
 * - handles numbers and strings
 * - trimmed
 * - unicode minus (U+2212) and dashes (U+2013, U+2014) converted to ASCII '-'
 * - '1,000' and '1 000' read as a thousand
 * - empty or null/undefined submissions return empty string
 */
export function normalizeSubmission(raw: unknown): string {
  if (raw == null) return "";
  const str = typeof raw === "string" ? raw : String(raw);
  const trimmed = str.trim();
  if (trimmed === "") return "";

  // Normalize Unicode minus and dashes to ASCII '-'
  const dashNormalized = trimmed.replace(/[\u2212\u2013\u2014]/g, "-");

  // Normalize thousands separators: "1,000" and "1 000" -> "1000"
  const thousandsNormalized = dashNormalized.replace(
    /(?<=\d)[, \u00A0\u202F](?=\d{3}(?!\d))/g,
    "",
  );

  return thousandsNormalized;
}

function evaluateEquals(
  expected: number | string,
  normalizedSubmission: string,
): boolean {
  if (typeof expected === "number") {
    const num = Number(normalizedSubmission);
    return !Number.isNaN(num) && num === expected;
  }
  return normalizedSubmission === expected;
}

function evaluateApprox(
  expected: { value: number; epsilon: number },
  normalizedSubmission: string,
): boolean {
  const num = Number(normalizedSubmission);
  if (Number.isNaN(num)) return false;
  // Account for IEEE 754 float representation noise without dwarfing small epsilons
  const diff = Math.abs(num - expected.value);
  return (
    diff <= expected.epsilon + Math.max(Number.EPSILON * 4, expected.epsilon * 1e-9)
  );
}

function evaluateInRange(
  expected: { min: number; max: number },
  normalizedSubmission: string,
): boolean {
  const num = Number(normalizedSubmission);
  return !Number.isNaN(num) && num >= expected.min && num <= expected.max;
}

function evaluateEqualsAny(
  expected: (number | string)[],
  normalizedSubmission: string,
): boolean {
  return expected.some((exp) => evaluateEquals(exp, normalizedSubmission));
}

function matchesSet(expected: (number | string)[], items: string[]): boolean {
  if (items.length === 0) return false;

  for (const subItem of items) {
    const hasMatch = expected.some((exp) => evaluateEquals(exp, subItem));
    if (!hasMatch) {
      return false;
    }
  }

  for (const exp of expected) {
    const hasMatch = items.some((subItem) => evaluateEquals(exp, subItem));
    if (!hasMatch) {
      return false;
    }
  }

  return true;
}

function evaluateSetEquals(
  expected: (number | string)[],
  rawSubmission: string,
): boolean {
  // Handles numbers formatted with thousands separators: "1,000", "1,000, 2,000", "1,000, 200, 300"
  const norm = normalizeSubmission(rawSubmission);
  const itemsFromNorm = norm
    .split(",")
    .map((item) => normalizeSubmission(item))
    .filter((item) => item !== "");

  if (matchesSet(expected, itemsFromNorm)) {
    return true;
  }

  // Handles unspaced 3-digit lists like "100,200,300"
  const itemsFromRaw = rawSubmission
    .split(",")
    .map((item) => normalizeSubmission(item))
    .filter((item) => item !== "");

  if (matchesSet(expected, itemsFromRaw)) {
    return true;
  }

  return false;
}

/**
 * Check an individual criterion against a user submission.
 * - Empty submission never passes.
 * - Returns { passed: true } on pass.
 * - Returns { passed: false, reason_code } on failure.
 * - Never returns, logs, or throws the expected value.
 */
export function checkCriterion(
  criterion: Criterion,
  submission: unknown,
): CriterionResult {
  const norm = normalizeSubmission(submission);

  if (norm === "") {
    return {
      passed: false,
      reason_code: criterion.reason_code,
    };
  }

  let passed = false;

  switch (criterion.check) {
    case "equals":
      passed = evaluateEquals(criterion.expected, norm);
      break;
    case "approx":
      passed = evaluateApprox(criterion.expected, norm);
      break;
    case "in_range":
      passed = evaluateInRange(criterion.expected, norm);
      break;
    case "equals_any":
      passed = evaluateEqualsAny(criterion.expected, norm);
      break;
    case "set_equals":
      passed = evaluateSetEquals(
        criterion.expected,
        typeof submission === "string" ? submission : String(submission),
      );
      break;
    case "equivalent":
      // Dispatches to checkEquivalent in equivalent.ts; see that file for stub caveats.
      return checkEquivalent(criterion, submission);
  }

  if (passed) {
    return { passed: true };
  }

  return {
    passed: false,
    reason_code: criterion.reason_code,
  };
}

/**
 * Check a step against a user submission.
 * - For explain steps, returns { passed: true, results: [] }.
 * - For answer steps, evaluates all criteria and returns { passed, results, reason_code }.
 */
export function checkStep(step: Step, submission: unknown): StepResult {
  if (step.type === "explain") {
    return {
      passed: true,
      results: [],
    };
  }

  const results = step.criteria.map((criterion) =>
    checkCriterion(criterion, submission),
  );
  const passed = results.every((r) => r.passed);
  const firstFailing = results.find((r) => !r.passed);

  return {
    passed,
    results,
    reason_code: firstFailing?.reason_code,
  };
}
