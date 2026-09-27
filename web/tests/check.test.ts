import { describe, it, expect, vi } from "vitest";
import {
  normalizeSubmission,
  checkCriterion,
  checkStep,
} from "../src/content/check";
import { checkEquivalent } from "../src/content/equivalent";
import type {
  EqualsCriterion,
  ApproxCriterion,
  InRangeCriterion,
  EqualsAnyCriterion,
  SetEqualsCriterion,
  EquivalentCriterion,
  ExplainStep,
  AnswerStep,
} from "../src/content/types";
import { arithmeticAdditionModule } from "../src/content/fixtures";
import { parseCriteria } from "../src/content/criteria";

describe("normalizeSubmission", () => {
  it("trims whitespace from input", () => {
    expect(normalizeSubmission("  42  ")).toBe("42");
    expect(normalizeSubmission("\t\n 100 \n\t")).toBe("100");
  });

  it("normalizes unicode minus (U+2212) and dashes to ASCII minus", () => {
    expect(normalizeSubmission("−5")).toBe("-5");
    expect(normalizeSubmission("–42")).toBe("-42");
    expect(normalizeSubmission("—100")).toBe("-100");
  });

  it("normalizes numbers with comma or space thousands separators", () => {
    expect(normalizeSubmission("1,000")).toBe("1000");
    expect(normalizeSubmission("1 000")).toBe("1000");
    expect(normalizeSubmission("1\u00A0000")).toBe("1000");
    expect(normalizeSubmission("-1 000")).toBe("-1000");
    expect(normalizeSubmission("1,000,000")).toBe("1000000");
    expect(normalizeSubmission("1 000 000")).toBe("1000000");
  });

  it("handles numbers passed directly as submission", () => {
    expect(normalizeSubmission(42)).toBe("42");
    expect(normalizeSubmission(0)).toBe("0");
    expect(normalizeSubmission(-15)).toBe("-15");
  });

  it("returns empty string for empty or whitespace-only submissions", () => {
    expect(normalizeSubmission("")).toBe("");
    expect(normalizeSubmission("   ")).toBe("");
    expect(normalizeSubmission("\t\n ")).toBe("");
    expect(normalizeSubmission(null)).toBe("");
    expect(normalizeSubmission(undefined)).toBe("");
  });
});

describe("checkEquivalent() checks", () => {
  it("correct equivalency check", () => {
    const expectedExpr = '1/2'
    const submittedExpr = '1/2'

    const result = checkEquivalent({ check: 'equivalent', expected: expectedExpr }, submittedExpr)

    expect(result).toEqual({ passed: true })
  })

  it("not symbolically equivalency check", () => {
    const criterion: EquivalentCriterion = {
      check: "equivalent",
      expected: "secret_formula_x^2 + 2x + 1",
      reason_code: "not_symbolically_equivalent",
    };

    expect(checkEquivalent(criterion, "x^2 + 2x + 1")).toEqual({
      passed: false,
      reason_code: "not_symbolically_equivalent",
    });
  })

  it("incorrect equivalency check", () => {
    const expectedExpr = '1/2'
    const submittedExpr = '1/3'

    const result = checkEquivalent({ check: 'equivalent', expected: expectedExpr, reason_code: 'not_equivalent' }, submittedExpr)

    expect(result).toEqual({ passed: false, reason_code: 'not_equivalent' })
  })

  // Tests: 1/2 vs 0.5, 2x vs x*2, x+x vs 2x, unparseable input, something that is not equivalent, and a nonsense string like ))(.
  it("1/2 vs 0.5 check", () => {
    const expectedExpr = '1/2'
    const submittedExpr = '0.5'

    const result = checkEquivalent({ check: 'equivalent', expected: expectedExpr }, submittedExpr)

    expect(result).toEqual({ passed: true })
  })

  it("2x vs x*2 check", () => {
    const expectedExpr = '2x'
    const submittedExpr = 'x*2'

    const result = checkEquivalent({ check: 'equivalent', expected: expectedExpr }, submittedExpr)

    expect(result).toEqual({ passed: true })
  })

  it("x+x vs 2x check", () => {
    const expectedExpr = 'x+x'
    const submittedExpr = '2x'

    const result = checkEquivalent({ check: 'equivalent', expected: expectedExpr }, submittedExpr)

    expect(result).toEqual({ passed: true })
  })

  it("unparseable input check", () => {
    const expectedExpr = '1/2'
    const submittedExpr = ')('

    const result = checkEquivalent({ check: 'equivalent', expected: expectedExpr, reason_code: 'not_equivalent' }, submittedExpr)

    expect(result).toEqual({ passed: false, reason_code: 'not_equivalent', error: 'Invalid expression' })
  })

  it("nonsense string ))( check", () => {
    const result = checkEquivalent({ check: 'equivalent', expected: '1/2', reason_code: 'not_equivalent' }, '))(')

    expect(result).toEqual({ passed: false, reason_code: 'not_equivalent', error: 'Invalid expression' })
  })

  it("huge power 9^9^9 fails fast instead of hanging", () => {
    const start = performance.now()
    const result = checkEquivalent({ check: 'equivalent', expected: '1', reason_code: 'not_equivalent' }, '9^9^9')

    expect(performance.now() - start).toBeLessThan(1000)
    expect(result).toEqual({ passed: false, reason_code: 'not_equivalent' })
  })

  it("overly complex expression fails fast instead of hanging", () => {
    const submittedExpr = Array(30).fill('x').join('+')
    const start = performance.now()
    const result = checkEquivalent({ check: 'equivalent', expected: '30x', reason_code: 'not_equivalent' }, submittedExpr)

    expect(performance.now() - start).toBeLessThan(1000)
    expect(result).toEqual({ passed: false, reason_code: 'not_equivalent', error: 'Expression is too complex' })
  })

  it("0.1+0.2 vs 0.3 check tolerates float noise", () => {
    const result = checkEquivalent({ check: 'equivalent', expected: '0.3' }, '0.1+0.2')

    expect(result).toEqual({ passed: true })
  })

  it("evaluate() is not available to submissions", () => {
    const result = checkEquivalent({ check: 'equivalent', expected: '1', reason_code: 'not_equivalent' }, 'evaluate("1")')

    expect(result.passed).toBe(false)
    expect(result.reason_code).toBe('not_equivalent')
  })
})

describe("checkCriterion", () => {
  describe("empty submissions", () => {
    it("never passes any check when submission is empty or whitespace", () => {
      const criterion: EqualsCriterion = {
        check: "equals",
        expected: "",
        reason_code: "empty_expected",
      };

      expect(checkCriterion(criterion, "")).toEqual({
        passed: false,
        reason_code: "empty_expected",
      });
      expect(checkCriterion(criterion, "   ")).toEqual({
        passed: false,
        reason_code: "empty_expected",
      });
      expect(checkCriterion(criterion, null)).toEqual({
        passed: false,
        reason_code: "empty_expected",
      });
      expect(checkCriterion(criterion, undefined)).toEqual({
        passed: false,
        reason_code: "empty_expected",
      });
    });
  });

  describe("equals check", () => {
    it("passes when numeric expected matches normalised numeric submission", () => {
      const criterion: EqualsCriterion = {
        check: "equals",
        expected: 7,
        reason_code: "wrong_sum",
      };

      expect(checkCriterion(criterion, 7)).toEqual({ passed: true });
      expect(checkCriterion(criterion, "7")).toEqual({ passed: true });
      expect(checkCriterion(criterion, "  7  ")).toEqual({ passed: true });
      expect(checkCriterion(criterion, "7.0")).toEqual({ passed: true });
    });

    it("passes with thousands separators and unicode minus", () => {
      const thousandCriterion: EqualsCriterion = {
        check: "equals",
        expected: 1000,
        reason_code: "wrong_thousand",
      };
      expect(checkCriterion(thousandCriterion, "1,000")).toEqual({ passed: true });
      expect(checkCriterion(thousandCriterion, "1 000")).toEqual({ passed: true });

      const negativeCriterion: EqualsCriterion = {
        check: "equals",
        expected: -5,
        reason_code: "wrong_negative",
      };
      expect(checkCriterion(negativeCriterion, "−5")).toEqual({ passed: true });
    });

    it("fails when numeric expected does not match submission", () => {
      const criterion: EqualsCriterion = {
        check: "equals",
        expected: 7,
        reason_code: "wrong_sum",
      };

      expect(checkCriterion(criterion, "8")).toEqual({
        passed: false,
        reason_code: "wrong_sum",
      });
      expect(checkCriterion(criterion, "not_a_number")).toEqual({
        passed: false,
        reason_code: "wrong_sum",
      });
    });

    it("passes and fails string expected comparisons", () => {
      const criterion: EqualsCriterion = {
        check: "equals",
        expected: "parallelogram",
        reason_code: "wrong_shape",
      };

      expect(checkCriterion(criterion, "parallelogram")).toEqual({ passed: true });
      expect(checkCriterion(criterion, "  parallelogram  ")).toEqual({ passed: true });
      expect(checkCriterion(criterion, "rectangle")).toEqual({
        passed: false,
        reason_code: "wrong_shape",
      });
    });
  });

  describe("approx check", () => {
    const criterion: ApproxCriterion = {
      check: "approx",
      expected: { value: 3.14, epsilon: 0.01 },
      reason_code: "wrong_pi",
    };

    it("passes within epsilon and on boundaries", () => {
      expect(checkCriterion(criterion, "3.14")).toEqual({ passed: true });
      expect(checkCriterion(criterion, "3.145")).toEqual({ passed: true });
      expect(checkCriterion(criterion, "3.13")).toEqual({ passed: true });
      expect(checkCriterion(criterion, "3.15")).toEqual({ passed: true });
      expect(checkCriterion(criterion, 3.14)).toEqual({ passed: true });
    });

    it("fails outside epsilon or for non-numeric submissions", () => {
      expect(checkCriterion(criterion, "3.16")).toEqual({
        passed: false,
        reason_code: "wrong_pi",
      });
      expect(checkCriterion(criterion, "3.12")).toEqual({
        passed: false,
        reason_code: "wrong_pi",
      });
      expect(checkCriterion(criterion, "three")).toEqual({
        passed: false,
        reason_code: "wrong_pi",
      });
    });

    it("respects tight authored epsilons without being overridden by tolerance", () => {
      const tightCriterion: ApproxCriterion = {
        check: "approx",
        expected: { value: 1.0, epsilon: 1e-10 },
        reason_code: "not_close_enough",
      };
      expect(checkCriterion(tightCriterion, "1.00000000005")).toEqual({
        passed: true,
      });
      expect(checkCriterion(tightCriterion, "1.0000000002")).toEqual({
        passed: false,
        reason_code: "not_close_enough",
      });
    });
  });

  describe("in_range check", () => {
    const criterion: InRangeCriterion = {
      check: "in_range",
      expected: { min: 1, max: 10 },
      reason_code: "out_of_range",
    };

    it("passes inside range and on inclusive boundaries", () => {
      expect(checkCriterion(criterion, "1")).toEqual({ passed: true });
      expect(checkCriterion(criterion, "10")).toEqual({ passed: true });
      expect(checkCriterion(criterion, "5.5")).toEqual({ passed: true });
      expect(checkCriterion(criterion, 7)).toEqual({ passed: true });
    });

    it("fails outside range or for non-numeric submissions", () => {
      expect(checkCriterion(criterion, "0.99")).toEqual({
        passed: false,
        reason_code: "out_of_range",
      });
      expect(checkCriterion(criterion, "10.01")).toEqual({
        passed: false,
        reason_code: "out_of_range",
      });
      expect(checkCriterion(criterion, "foo")).toEqual({
        passed: false,
        reason_code: "out_of_range",
      });
    });
  });

  describe("equals_any check", () => {
    const criterion: EqualsAnyCriterion = {
      check: "equals_any",
      expected: [2, 4, 6, "even"],
      reason_code: "not_in_choices",
    };

    it("passes when matching any member", () => {
      expect(checkCriterion(criterion, "2")).toEqual({ passed: true });
      expect(checkCriterion(criterion, "4")).toEqual({ passed: true });
      expect(checkCriterion(criterion, 6)).toEqual({ passed: true });
      expect(checkCriterion(criterion, "even")).toEqual({ passed: true });
      expect(checkCriterion(criterion, "  even  ")).toEqual({ passed: true });
    });

    it("fails when matching no member", () => {
      expect(checkCriterion(criterion, "3")).toEqual({
        passed: false,
        reason_code: "not_in_choices",
      });
      expect(checkCriterion(criterion, "odd")).toEqual({
        passed: false,
        reason_code: "not_in_choices",
      });
    });
  });

  describe("set_equals check", () => {
    const numericSetCriterion: SetEqualsCriterion = {
      check: "set_equals",
      expected: [1, 2, 3],
      reason_code: "wrong_set",
    };

    it("passes when comma-separated submission has same elements order-free", () => {
      expect(checkCriterion(numericSetCriterion, "1, 2, 3")).toEqual({ passed: true });
      expect(checkCriterion(numericSetCriterion, "3, 1, 2")).toEqual({ passed: true });
      expect(checkCriterion(numericSetCriterion, " 2 , 3 , 1 ")).toEqual({ passed: true });
      expect(checkCriterion(numericSetCriterion, "2, 1, 2, 3")).toEqual({ passed: true }); // duplicate in submission ignored in sets
    });

    it("handles 3-digit numbers without spaces without misinterpreting commas as thousands separators", () => {
      const threeDigitSetCriterion: SetEqualsCriterion = {
        check: "set_equals",
        expected: [100, 200, 300],
        reason_code: "wrong_set",
      };
      expect(checkCriterion(threeDigitSetCriterion, "100,200,300")).toEqual({
        passed: true,
      });
      expect(checkCriterion(threeDigitSetCriterion, "300, 100, 200")).toEqual({
        passed: true,
      });
    });

    it("handles numbers with thousands separators in sets", () => {
      const thousandSetCriterion: SetEqualsCriterion = {
        check: "set_equals",
        expected: [1000, 2000],
        reason_code: "wrong_set",
      };
      expect(checkCriterion(thousandSetCriterion, "1,000, 2,000")).toEqual({
        passed: true,
      });
      expect(checkCriterion(thousandSetCriterion, "2,000, 1,000")).toEqual({
        passed: true,
      });
      expect(checkCriterion(thousandSetCriterion, "1 000, 2 000")).toEqual({
        passed: true,
      });

      const singleThousandCriterion: SetEqualsCriterion = {
        check: "set_equals",
        expected: [1000],
        reason_code: "wrong_set",
      };
      expect(checkCriterion(singleThousandCriterion, "1,000")).toEqual({
        passed: true,
      });

      const mixedCriterion: SetEqualsCriterion = {
        check: "set_equals",
        expected: [1000, 200, 300],
        reason_code: "wrong_set",
      };
      expect(checkCriterion(mixedCriterion, "1,000, 200, 300")).toEqual({
        passed: true,
      });
    });

    it("fails when missing, extra, or different elements", () => {
      expect(checkCriterion(numericSetCriterion, "1, 2")).toEqual({
        passed: false,
        reason_code: "wrong_set",
      });
      expect(checkCriterion(numericSetCriterion, "1, 2, 3, 4")).toEqual({
        passed: false,
        reason_code: "wrong_set",
      });
      expect(checkCriterion(numericSetCriterion, "4, 5, 6")).toEqual({
        passed: false,
        reason_code: "wrong_set",
      });
    });

    it("passes and fails string set comparisons", () => {
      const stringSetCriterion: SetEqualsCriterion = {
        check: "set_equals",
        expected: ["red", "blue", "green"],
        reason_code: "wrong_colors",
      };

      expect(checkCriterion(stringSetCriterion, "blue, green, red")).toEqual({ passed: true });
      expect(checkCriterion(stringSetCriterion, "red, blue")).toEqual({
        passed: false,
        reason_code: "wrong_colors",
      });
    });
  });

  describe("equivalent check dispatch", () => {
    it("dispatches to checkEquivalent and passes an equivalent answer", () => {
      const criterion: EquivalentCriterion = {
        check: "equivalent",
        expected: "2x + 1",
        reason_code: "not_equivalent",
      };

      expect(checkCriterion(criterion, "1 + 2x")).toEqual({ passed: true });
    });

    it("dispatches to checkEquivalent and returns the authored reason_code", () => {
      const criterion: EquivalentCriterion = {
        check: "equivalent",
        expected: "2x + 1",
        reason_code: "not_equivalent",
      };

      expect(checkCriterion(criterion, "2x + 2")).toEqual({
        passed: false,
        reason_code: "not_equivalent",
      });
    });
  });

  describe("zero-leakage security guarantee", () => {
    it("never returns, logs, or leaks the expected value on failure", () => {
      const secretValue = 987654321;
      const criterion: EqualsCriterion = {
        check: "equals",
        expected: secretValue,
        reason_code: "wrong_secret",
      };

      const logSpy = vi.spyOn(console, "log");
      const warnSpy = vi.spyOn(console, "warn");
      const errorSpy = vi.spyOn(console, "error");

      const result = checkCriterion(criterion, "12345");

      expect(result.passed).toBe(false);
      expect(result.reason_code).toBe("wrong_secret");

      // Verify the result object contains only passed and reason_code, no expected value
      expect(Object.keys(result)).toEqual(["passed", "reason_code"]);
      expect(JSON.stringify(result)).not.toContain(String(secretValue));

      // Verify nothing was logged
      expect(logSpy).not.toHaveBeenCalled();
      expect(warnSpy).not.toHaveBeenCalled();
      expect(errorSpy).not.toHaveBeenCalled();

      logSpy.mockRestore();
      warnSpy.mockRestore();
      errorSpy.mockRestore();
    });
  });
});

describe("checkStep", () => {
  it("returns passed: true with empty results for explain steps", () => {
    const explainStep: ExplainStep = {
      type: "explain",
      content: "This is just an explanation step.",
    };

    const result = checkStep(explainStep, "anything");
    expect(result).toEqual({
      passed: true,
      results: [],
    });
  });

  it("evaluates all criteria for answer steps, passing when all pass", () => {
    const answerStep: AnswerStep = {
      type: "answer",
      prompt: "Enter a number between 1 and 10 that is even",
      criteria: [
        {
          check: "in_range",
          expected: { min: 1, max: 10 },
          reason_code: "out_of_range",
        },
        {
          check: "equals_any",
          expected: [2, 4, 6, 8, 10],
          reason_code: "not_even",
        },
      ],
    };

    const passResult = checkStep(answerStep, "4");
    expect(passResult.passed).toBe(true);
    expect(passResult.results).toHaveLength(2);
    expect(passResult.results[0].passed).toBe(true);
    expect(passResult.results[1].passed).toBe(true);
    expect(passResult.reason_code).toBeUndefined();
  });

  it("evaluates all criteria for answer steps, failing with first reason_code when any fails", () => {
    const answerStep: AnswerStep = {
      type: "answer",
      prompt: "Enter a number between 1 and 10 that is even",
      criteria: [
        {
          check: "in_range",
          expected: { min: 1, max: 10 },
          reason_code: "out_of_range",
        },
        {
          check: "equals_any",
          expected: [2, 4, 6, 8, 10],
          reason_code: "not_even",
        },
      ],
    };

    // Fails second criterion
    const oddResult = checkStep(answerStep, "5");
    expect(oddResult.passed).toBe(false);
    expect(oddResult.results).toHaveLength(2);
    expect(oddResult.results[0].passed).toBe(true);
    expect(oddResult.results[1].passed).toBe(false);
    expect(oddResult.reason_code).toBe("not_even");

    // Fails first criterion
    const outResult = checkStep(answerStep, "12");
    expect(outResult.passed).toBe(false);
    expect(outResult.results).toHaveLength(2);
    expect(outResult.results[0].passed).toBe(false);
    expect(outResult.reason_code).toBe("out_of_range");
  });

  it("checks real fixture criteria correctly", () => {
    const addingLesson = arithmeticAdditionModule.lessons[0];
    const answerStep = addingLesson.steps[1];

    expect(checkStep(answerStep, "7")).toEqual({
      passed: true,
      results: [{ passed: true }],
    });
    expect(checkStep(answerStep, "8")).toEqual({
      passed: false,
      results: [{ passed: false, reason_code: "wrong_total" }],
      reason_code: "wrong_total",
    });
  });
});

describe("authored reason", () => {
  const reason = "Start at 5 and count on 6 more.";

  it("rides along on a failure, never on a pass", () => {
    const criterion: EqualsCriterion = { check: "equals", expected: 11, reason_code: "wrong_sum", reason };
    expect(checkCriterion(criterion, "10")).toEqual({ passed: false, reason_code: "wrong_sum", reason });
    expect(checkCriterion(criterion, "")).toEqual({ passed: false, reason_code: "wrong_sum", reason });
    expect(checkCriterion(criterion, "11")).toEqual({ passed: true });
  });

  it("rides along on an equivalent failure", () => {
    const criterion: EquivalentCriterion = { check: "equivalent", expected: "2x", reason_code: "not_equivalent", reason };
    expect(checkCriterion(criterion, "3x")).toEqual({ passed: false, reason_code: "not_equivalent", reason });
  });

  it("comes from the first failing criterion in a step", () => {
    const step: AnswerStep = {
      type: "answer",
      prompt: "q",
      criteria: [
        { check: "in_range", expected: { min: 0, max: 100 }, reason_code: "out_of_range" },
        { check: "equals", expected: 11, reason_code: "wrong_sum", reason },
      ],
    };
    expect(checkStep(step, "10")).toMatchObject({ passed: false, reason_code: "wrong_sum", reason });
    expect(checkStep(step, "500")).not.toHaveProperty("reason");
  });

  it("is rejected by the parser when blank or not a string", () => {
    expect(() =>
      parseCriteria("- check: equals\n  expected: 1\n  reason_code: bad\n  reason: '  '", "t.md", 1),
    ).toThrow(/Invalid reason/);
    expect(() =>
      parseCriteria("- check: equals\n  expected: 1\n  reason_code: bad\n  reason: 3", "t.md", 1),
    ).toThrow(/Invalid reason/);
  });

  it.each([
    ["equals", "expected: 48173", "The answer is 48173."],
    ["equals, decimal at sentence end", "expected: 3.5", "It comes to 3.5."],
    ["equals, string in another case", "expected: Blue", "Try blue."],
    ["equivalent", "expected: 2*x", "It simplifies to 2*x."],
    ["equals_any", "expected: [7, 9]", "Seven works, and so does 9."],
    ["set_equals", "expected: [1, 2, 3]", "Remember 3 belongs in the set."],
    ["approx", "expected: { value: 3.14, epsilon: 0.01 }", "Close to 3.14 will do."],
  ])("is rejected by the parser when it gives away the answer (%s)", (check, expected, reason) => {
    const kind = check.split(",")[0];
    expect(() =>
      parseCriteria(`- check: ${kind}\n  ${expected}\n  reason_code: r\n  reason: ${reason}`, "t.md", 1),
    ).toThrow(/must not contain the expected value/);
  });

  it.each([
    ["a number that only contains the answer", "expected: 5", "Count on from 15."],
    ["a decimal that only starts with the answer", "expected: 3", "Try 3.5 first, then round."],
    ["in_range, which has no single answer", "expected: { min: 1, max: 10 }", "Pick something between 1 and 10."],
  ])("is accepted when it only resembles the answer (%s)", (_label, expected, reason) => {
    const check = expected.includes("min") ? "in_range" : "equals";
    expect(() =>
      parseCriteria(`- check: ${check}\n  ${expected}\n  reason_code: r\n  reason: ${reason}`, "t.md", 1),
    ).not.toThrow();
  });
});

describe("Trust boundary: malformed expected rejected by parser", () => {
  it("asserts malformed expected shapes are rejected during parseCriteria", () => {
    // Malformed equals (array instead of number/string)
    expect(() =>
      parseCriteria("- check: equals\n  expected: [1, 2]\n  reason_code: bad", "t.md", 1),
    ).toThrow();

    // Malformed approx (string instead of { value, epsilon })
    expect(() =>
      parseCriteria("- check: approx\n  expected: invalid\n  reason_code: bad", "t.md", 1),
    ).toThrow();

    // Malformed in_range (min > max)
    expect(() =>
      parseCriteria(
        "- check: in_range\n  expected:\n    min: 10\n    max: 1\n  reason_code: bad",
        "t.md",
        1,
      ),
    ).toThrow();

    // Malformed equals_any (empty array)
    expect(() =>
      parseCriteria("- check: equals_any\n  expected: []\n  reason_code: bad", "t.md", 1),
    ).toThrow();

    // Malformed set_equals (empty array)
    expect(() =>
      parseCriteria("- check: set_equals\n  expected: []\n  reason_code: bad", "t.md", 1),
    ).toThrow();

    // Malformed equivalent (unparseable expression)
    expect(() =>
      parseCriteria(
        "- check: equivalent\n  expected: '3 + '\n  reason_code: bad",
        "t.md",
        1,
      ),
    ).toThrow();
  });
});
