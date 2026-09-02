/**
 * Types for the placeholder demo endpoint.
 *
 * Replace these once the real content model is designed (issues #19-#21).
 */

export interface DemoProblem {
  slug: string;
  prompt: string;
  expression: string;
}

export interface CheckResponse {
  correct: boolean;
}
