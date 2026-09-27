---
slug: times-tables
type: tutorial
title: Times Tables
teaches: [times-tables]
---

--explain--

A times table lists the multiples of a number. The 4 times table goes 4, 8, 12, 16, adding 4 each time. If you know $5 \times 4 = 20$, then $6 \times 4$ is just 4 more: 24.

--answer--

What is $6 \times 7$?

```yaml
- check: equals
  expected: 42
  reason_code: wrong_product
  reason: Start from a fact you know, like five sevens, then add one more seven.
```

--answer--

What is $8 \times 4$?

```yaml
- check: equals
  expected: 32
  reason_code: wrong_product
  reason: Double the number, then double it again, then double once more.
```
