---
slug: factors
type: tutorial
title: Factors
teaches: [factors]
---

--explain--

A **factor** of a number divides it exactly, with nothing left over. The factors of 6 are 1, 2, 3 and 6, because $1 \times 6 = 6$ and $2 \times 3 = 6$. Find factors in pairs that multiply to the number.

--answer--

List every factor of 12, separated by commas.

```yaml
- check: set_equals
  expected: [1, 2, 3, 4, 6, 12]
  reason_code: wrong_set
  reason: Find every pair of numbers that multiply to twelve, and list both numbers in each pair.
```

--answer--

Name one factor of 18 that is not 1 or 18.

```yaml
- check: equals_any
  expected: [2, 3, 6, 9]
  reason_code: wrong_factor
  reason: Try small numbers in turn and check whether they divide eighteen with nothing left over.
```
