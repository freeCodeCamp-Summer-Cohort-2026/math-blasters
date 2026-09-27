---
slug: quarters
type: tutorial
title: Quarters
teaches: [quartering]
---

--explain--

A quarter is one of four equal parts. Half of a half is a quarter, so a quarter of 1 is $0.25$.

--answer--

What is a quarter of 1, as a decimal?

```yaml
- check: approx
  expected:
    value: 0.25
    epsilon: 0.001
  reason_code: not_quarter
  reason: A quarter is half of a half. Halve one, then halve it again.
```

--answer--

What is a quarter of 20?

```yaml
- check: equals
  expected: 5
  reason_code: not_quarter
  reason: Split the number into four equal groups. What is in one group?
```
