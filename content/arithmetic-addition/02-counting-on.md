---
slug: counting-on
type: tutorial
title: Counting On
teaches: [counting-on]
---

--explain--

To add a small number, start at the bigger number and count on. For $9 + 3$, start at 9 and say 10, 11, 12. So $9 + 3 = 12$.

--answer--

Count on to find $8 + 3$.

```yaml
- check: equals
  expected: 11
  reason_code: wrong_sum
  reason: Start at the bigger number and say one more number for each one you add.
```

--answer--

Count on to find $4 + 9$.

```yaml
- check: equals
  expected: 13
  reason_code: wrong_sum
  reason: Start at the bigger number, even when it comes second, then count on the smaller one.
```
