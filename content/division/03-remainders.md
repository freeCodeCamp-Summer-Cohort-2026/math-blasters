---
slug: remainders
type: tutorial
title: Remainders
teaches: [remainders]
---

--explain--

Sometimes things do not share out exactly. 13 sweets shared between 4 children gives each child 3 sweets, with 1 sweet left over. The amount left over is the **remainder**.

--answer--

17 pencils are shared equally between 5 pupils. How many pencils does each pupil get?

```yaml
- check: equals
  expected: 3
  reason_code: wrong_quotient
  reason: Find the biggest multiple of five that fits into the pencils without going over.
```

--answer--

How many pencils are left over?

```yaml
- check: equals
  expected: 2
  reason_code: wrong_remainder
  reason: Take away the pencils that were handed out from the total.
```
