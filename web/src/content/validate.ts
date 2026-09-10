/**
 * Semantic validation of a parsed lesson's frontmatter and structure.
 *
 * This is a separate concern from structural parsing and will be
 * implemented in its own issue. Until then, calling this function
 * throws "not implemented".
 */

import type { Lesson } from './types.js';

export function validateLesson(_lesson: Lesson): void {
  throw new Error('not implemented');
}
