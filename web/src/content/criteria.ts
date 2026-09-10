/**
 * Parse the fenced YAML criteria block from an answer step.
 *
 * This is a separate concern from structural parsing and will be
 * implemented in its own issue. Until then, this stub returns an
 * empty array so that callers are not broken at runtime.
 *
 * TODO: Implement real criteria parsing (see downstream issue).
 */

import type { Criterion } from './types.js';

export function parseCriteria(
  _yaml: string,
  _path: string,
  _stepNumber: number,
): Criterion[] {
  // TODO: implement real criteria parsing
  return [];
}
