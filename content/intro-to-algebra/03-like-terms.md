---
slug: like-terms
type: tutorial
title: Like Terms
teaches: [like-terms]
---

--explain--

Terms with the same letter can be added together, like counting apples. $2x + 3x$ is two $x$'s and three more, so $5x$ in total. The number in front of the letter is called the **coefficient**.

--answer--

$4a + 2a$ can be written as one term. What is its coefficient?

```yaml
- check: equals
  expected: 6
  reason_code: wrong_coefficient
  reason: Add the numbers in front of the letter.
```

--answer--

$7b - 3b + b$ can be written as one term. What is its coefficient?

```yaml
- check: equals
  expected: 5
  reason_code: wrong_coefficient
  reason: A letter on its own counts as one of that letter. Add and take away the numbers in front.
```
