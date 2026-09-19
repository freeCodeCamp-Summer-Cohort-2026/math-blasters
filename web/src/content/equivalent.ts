import type { CriterionResult, EquivalentCriterion } from "./types";

/* eslint-disable @typescript-eslint/no-unused-vars */

/**
 * Stub for symbolic math equivalence via mathjs.
 * Throws until symbolic equivalence is fully implemented.
 * Never logs, throws, or returns the authored expected value.
 *
 * Callers (e.g. UI step evaluation) must handle this error or employ an error boundary
 * if evaluating lessons containing "equivalent" criteria prior to that feature landing.
 */
export function checkEquivalent(
  _criterion: EquivalentCriterion,
  _submission: unknown,
): CriterionResult {
  throw new Error("checkEquivalent is not yet implemented");
}

/* eslint-enable @typescript-eslint/no-unused-vars */
