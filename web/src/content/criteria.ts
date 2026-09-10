/**
 * Parse the fenced YAML criteria block from an answer step.
 *
 * This is a separate concern from structural parsing and will be
 * implemented in its own issue. Until then, calling this function
 * throws "not implemented".
 */

import type { Criterion } from './types.js';

export function parseCriteria(
  _yaml: string,
  _path: string,
  _stepNumber: number,
): Criterion[] {
  throw new Error('not implemented');
}
