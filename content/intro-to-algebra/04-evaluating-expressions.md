---
slug: evaluating-expressions
type: tutorial
title: Evaluating Expressions
teaches: [substitution]
---

--explain--

When you know what the letter stands for, you can work out the expression. If $x = 4$, then $2x + 1$ is $2 \times 4 + 1 = 9$. Multiply before you add.

--answer--

What is $3x + 2$ when $x = 4$?

```yaml
- check: equals
  expected: 14
  reason_code: wrong_value
  reason: Replace the letter with its number, multiply first, then add.
```

--answer--

What is $2a + b$ when $a = 5$ and $b = 3$?

```yaml
- check: equals
  expected: 13
  reason_code: wrong_value
  reason: Replace each letter with its own number, multiply first, then add.
```
