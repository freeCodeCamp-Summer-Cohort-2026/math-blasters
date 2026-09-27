/**
 * Learner-facing sentences for a failed criterion's `reason_code`.
 *
 * The checker only passes through the code an author wrote, so this covers the
 * codes lessons use plus a small vocabulary authors can reuse. Sentences are
 * static: they never quote a submission or an expected value.
 */
export const REASON_SENTENCES: Readonly<Record<string, string>> = {
  wrong_total: "That total isn't there yet. Try counting both groups together again.",
  wrong_sum: "That sum isn't there yet. Try adding the numbers again, one at a time.",
  not_a_number: "That's not a number we can read. Try digits like 12 or 3.5.",
  out_of_range: "That number isn't in the range we're after yet. Check the question for how big or small it should be.",
  wrong_set: "Not every value in that list fits yet. Check each one, separated by commas.",
  not_equivalent: "That expression doesn't work out to the same value yet. Try simplifying it step by step.",
};

export const GENERIC_REASON_SENTENCE = "Not quite yet. Read the question again and give it another go.";

/** Maps a reason code to a sentence; an author-written reason wins, and an unknown code never leaks through. */
export function reasonSentence(reasonCode?: string, authoredReason?: string): string {
  if (authoredReason?.trim()) return authoredReason.trim();
  return reasonCode !== undefined && Object.hasOwn(REASON_SENTENCES, reasonCode)
    ? REASON_SENTENCES[reasonCode]
    : GENERIC_REASON_SENTENCE;
}
