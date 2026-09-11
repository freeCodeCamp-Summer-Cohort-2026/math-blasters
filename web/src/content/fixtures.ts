import type { Lesson, Module } from "./types";

/**
 * Helper factory to construct a Lesson with sensible defaults for testing.
 * Allows test suites to override only the fields they care about without
 * hand-building boilerplate lesson objects.
 */
export function makeLesson(overrides: Partial<Lesson> = {}): Lesson {
  return {
    slug: "sample-lesson",
    title: "Sample Lesson",
    type: "tutorial",
    description: "A sample lesson for testing.",
    steps: [
      {
        type: "explain",
        content: "This is an explanatory step.",
      },
      {
        type: "answer",
        prompt: "What is $1 + 1$?",
        criteria: [
          {
            check: "equals",
            expected: 2,
            reason_code: "wrong_sum",
          },
        ],
      },
    ],
    ...overrides,
  };
}

/**
 * Hand-written fixture data for the arithmetic-addition module.
 * Serves as the initial content source before build-time content loading is introduced.
 */
export const arithmeticAdditionModule: Module = {
  slug: "arithmetic-addition",
  title: "Arithmetic Addition",
  description:
    "Learn the fundamentals of single-digit addition through interactive tutorials and labs.",
  lessons: [
    // Tutorial: Adding Two Numbers
    {
      slug: "adding-two-numbers",
      title: "Adding Two Numbers",
      type: "tutorial",
      description: "Learn how to add two single-digit numbers together.",
      steps: [
        {
          type: "explain",
          content:
            "Addition is combining two or more numbers together to find a total sum. For example, if you have 3 apples and get 4 more, you count all of them together.",
        },
        {
          type: "answer",
          prompt: "What is $3 + 4$?",
          criteria: [
            {
              check: "equals",
              expected: 7,
              reason_code: "wrong_total",
            },
          ],
        },
      ],
    },
    // Lab: Marbles in Total
    {
      slug: "marbles-in-total",
      title: "Marbles in Total",
      type: "lab",
      description:
        "Practice combining collections of marbles to solve word problems.",
      outcome:
        "Combine groups of marbles to find total sums in applied scenarios.",
      requires: ["addition"],
      steps: [
        {
          type: "explain",
          content:
            "You have a jar with 5 blue marbles and 6 red marbles. Combine them to find the total count.",
        },
        {
          type: "answer",
          prompt: "How many marbles do you have in total?",
          criteria: [
            {
              check: "equals",
              expected: 11,
              reason_code: "wrong_total",
            },
          ],
        },
      ],
    },
  ],
};
