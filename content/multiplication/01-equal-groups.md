---
slug: equal-groups
type: tutorial
title: Equal Groups
teaches: [equal-groups]
---

--explain--

Multiplication counts equal groups. 3 plates with 2 cookies each is $3 \times 2 = 6$ cookies. It is a quick way to add the same number again and again: $2 + 2 + 2 = 6$.

--answer--

There are 3 bags with 4 apples in each bag. How many apples are there?

```yaml
- check: equals
  expected: 12
  reason_code: wrong_product
  reason: Add the number in one bag once for every bag.
```

--answer--

What is $5 \times 2$?

```yaml
- check: equals
  expected: 10
  reason_code: wrong_product
  reason: Think of five groups with two in each, and count them all.
```
