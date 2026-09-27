---
slug: writing-expressions
type: tutorial
title: Writing Expressions
teaches: [writing-expressions]
---

--explain--

An **expression** describes a number using letters. "5 more than $n$" is $n + 5$. "Three times $n$" is $3n$, which means $3 \times n$.

--answer--

Write an expression for "4 more than $n$".

```yaml
- check: equivalent
  expected: "n + 4"
  reason_code: not_equivalent
  reason: More than means you add to the letter.
```

--answer--

Write an expression for "twice a number $y$".

```yaml
- check: equivalent
  expected: "2y"
  reason_code: not_equivalent
  reason: Twice means two lots of the number, so multiply the letter.
```
