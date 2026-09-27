---
slug: making-ten
type: tutorial
title: Making Ten
teaches: [making-ten]
---

--explain--

Some pairs of numbers make 10, like $7 + 3$ and $6 + 4$. They help with harder sums. For $8 + 5$, take 2 from the 5 to make $8 + 2 = 10$. Then add the 3 that is left: $10 + 3 = 13$.

--answer--

What number do you add to 7 to make 10?

```yaml
- check: equals
  expected: 3
  reason_code: wrong_sum
  reason: Count up from the first number until you reach ten, and keep track of how many steps you took.
```

--answer--

Use making ten to find $9 + 6$.

```yaml
- check: equals
  expected: 15
  reason_code: wrong_sum
  reason: Move one from the second number to make ten first, then add what is left.
```
