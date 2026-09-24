import { parse } from "yaml";
import { parse as parseExpression } from "mathjs";
import type { Criterion } from "./types";

const VALID_CHECKS = ["equals", "approx", "in_range", "equals_any", "set_equals", "equivalent"];
const VALID_CRITERIA_KEYS = ["criteria", "checking", "hints"];

type ParsedAnswerCriteria = {
  criteria: Criterion[];
  checking?: string;
  hints?: string[];
};

export function parseCriteria(yamlSource: string, path: string, stepNumber: number): ParsedAnswerCriteria {
  let parsed = parse(yamlSource);

  let checking: string | undefined;
  let hints: string[] | undefined;

  // Mapping new format 
  if(!Array.isArray(parsed) && typeof parsed === "object" && parsed !== null) {
    const data = parsed as Record<string, unknown>;

    const unknownKeys = Object.keys(data).filter((key) => !VALID_CRITERIA_KEYS.includes(key));

    if (unknownKeys.length > 0) {
      throw new Error(
        `Unknown keys in ${path} at step ${stepNumber}: ${unknownKeys.join(", ")}. Valid keys are: ${VALID_CRITERIA_KEYS.join(", ")}.`,
      );
    }

    if(typeof data.checking !== "undefined") {
      if(typeof data.checking !== "string" || data.checking.trim() === "") {
        throw new Error(`${path}: the "checking" field must be a non-empty string, at step ${stepNumber}.`);
      }

      checking = data.checking;
    }

    if(typeof data.hints !== "undefined") {
      if(!Array.isArray(data.hints) || data.hints.length === 0) {
        throw new Error(`${path}: the "hints" field must be a non-empty list of strings, at step ${stepNumber}.`);
      }

      // check that each hint is a string and not empty
      if(!Array.isArray(data.hints) || !data.hints.every((item) => typeof item === "string" && item.trim() !== "")) {
        throw new Error(`${path}: the "hints" field must be a non-empty list of strings, at step ${stepNumber}.`);
      }

      hints = data.hints;
    }

    parsed = data.criteria;
  }

  // keeping rest of earlier code for backwards compatibility as intended
  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error(
      `Expected a non-empty array of criteria in ${path} at step ${stepNumber}, but got: ${typeof parsed}`,
    );
  }

  parsed.forEach((criterion, index) => {
    if (typeof criterion !== "object" || criterion === null) {
      throw new Error(
        `Invalid criterion at ${path} step ${stepNumber} index ${index}: expected a mapping, but got: ${JSON.stringify(criterion)}`,
      );
    }

    if (!("check" in criterion) || !VALID_CHECKS.includes(criterion.check)) {
      throw new Error(
        `Unknown check "${criterion.check}" at ${path} step ${stepNumber} index ${index}. Valid checks are: ${VALID_CHECKS.join(", ")}.`,
      );
    }

    if (criterion.check === "equals_any" && (!Array.isArray(criterion.expected) || criterion.expected.length === 0)) {
      throw new Error(
        `Invalid expected value for equals_any criterion at ${path} step ${stepNumber} index ${index}: expected a non-empty array, but got: ${JSON.stringify(criterion.expected)}`,
      );
    }
    if (
      criterion.check === "approx" &&
      (typeof criterion.expected !== "object" ||
        criterion.expected === null ||
        typeof criterion.expected.value !== "number" ||
        typeof criterion.expected.epsilon !== "number")
    ) {
      throw new Error(
        `Invalid expected value for approx criterion at ${path} step ${stepNumber} index ${index}: expected an object with numeric "value" and "epsilon" properties, but got: ${JSON.stringify(criterion.expected)}`,
      );
    }
    if (
      criterion.check === "in_range" &&
      (typeof criterion.expected !== "object" ||
        criterion.expected === null ||
        typeof criterion.expected.min !== "number" ||
        typeof criterion.expected.max !== "number" ||
        criterion.expected.min > criterion.expected.max)
    ) {
      throw new Error(
        `Invalid expected value for in_range criterion at ${path} step ${stepNumber} index ${index}: expected an object with numeric "min" and "max" properties where min <= max, but got: ${JSON.stringify(criterion.expected)}`,
      );
    }
    if (criterion.check === "set_equals" && (!Array.isArray(criterion.expected) || criterion.expected.length === 0)) {
      throw new Error(
        `Invalid expected value for set_equals criterion at ${path} step ${stepNumber} index ${index}: expected a non-empty array, but got: ${JSON.stringify(criterion.expected)}`,
      );
    }
    if (criterion.check === "equivalent") {
      if (typeof criterion.expected !== "string") {
        throw new Error(
          `Invalid expected value for equivalent criterion at ${path} step ${stepNumber} index ${index}: expected a string, but got: ${typeof criterion.expected}`,
        );
      }
      try {
        parseExpression(criterion.expected);
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        throw new Error(
          `Invalid expected value for equivalent criterion at ${path} step ${stepNumber} index ${index}: "${criterion.expected}" is not a parseable expression — ${reason}`,
        );
      }
    }
    if (criterion.check === "equals" && (typeof criterion.expected !== "number" && typeof criterion.expected !== "string")) {
      throw new Error(
        `Invalid expected value for equals criterion at ${path} step ${stepNumber} index ${index}: expected a number or string, but got: ${typeof criterion.expected}`,
      );
    }
    if (criterion.reason_code === undefined || typeof criterion.reason_code !== "string" || criterion.reason_code.trim() === "") {
      throw new Error(
        `Invalid reason_code for criterion at ${path} step ${stepNumber} index ${index}: expected a non empty string, but got: ${typeof criterion.reason_code}`,
      );
    }
  });

  return {
    criteria: parsed,
    checking: checking,
    hints: hints,
  };
}
