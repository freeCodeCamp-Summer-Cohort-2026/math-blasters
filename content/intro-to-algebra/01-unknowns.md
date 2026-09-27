---
slug: unknowns
type: tutorial
title: Unknowns
teaches: [unknowns]
---

--explain--

In algebra a letter stands for a number we do not know yet. In $x + 3 = 10$, the letter $x$ is 7, because $7 + 3 = 10$.

--answer--

$x + 5 = 12$. What number is $x$?

```yaml
- check: equals
  expected: 7
  reason_code: wrong_unknown
  reason: Ask which number you would add five to in order to make twelve.
```

--answer--

$y - 4 = 10$. What number is $y$?

```yaml
- check: equals
  expected: 14
  reason_code: wrong_unknown
  reason: Undo the subtraction. Add back what was taken away.
```
