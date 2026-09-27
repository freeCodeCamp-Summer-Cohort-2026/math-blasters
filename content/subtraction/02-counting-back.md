---
slug: counting-back
type: tutorial
title: Counting Back
teaches: [counting-back]
---

--explain--

To subtract a small number, start at the bigger number and count back. For $11 - 3$, say 10, 9, 8. You land on 8, so $11 - 3 = 8$.

--answer--

Count back to find $15 - 3$.

```yaml
- check: equals
  expected: 12
  reason_code: wrong_difference
  reason: Start at the first number and say one number lower for each one you take away.
```

--answer--

Count back to find $20 - 6$.

```yaml
- check: equals
  expected: 14
  reason_code: wrong_difference
  reason: Count back one step at a time and keep track of how many steps you have taken.
```
