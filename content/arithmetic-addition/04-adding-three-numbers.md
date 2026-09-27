---
slug: adding-three-numbers
type: tutorial
title: Adding Three Numbers
teaches: [adding-three-numbers]
---

--explain--

You can add numbers in any order and get the same total. With three numbers, look for a pair that makes 10 first. For $4 + 7 + 6$, add $4 + 6 = 10$, then $10 + 7 = 17$.

--answer--

What is $3 + 5 + 7$?

```yaml
- check: equals
  expected: 15
  reason_code: wrong_total
  reason: Look for two of the numbers that make ten, add those first, then add the last one.
```

--answer--

What is $8 + 6 + 2$?

```yaml
- check: equals
  expected: 16
  reason_code: wrong_total
  reason: Add the pair that makes ten first, then add the number that is left.
```
