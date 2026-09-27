---
slug: decimal-answers
type: tutorial
title: Decimal Answers
teaches: [decimal-division]
---

--explain--

Instead of a remainder, you can split what is left into parts. 5 pizzas shared between 2 people is 2 whole pizzas each, and the last pizza is split in half. That is $5 \div 2 = 2.5$.

--answer--

What is $7 \div 2$? Give your answer as a decimal.

```yaml
- check: equals
  expected: 3.5
  reason_code: wrong_quotient
  reason: Share out the whole ones first, then split the one left over in half.
```

--answer--

What is $10 \div 3$, rounded to two decimal places?

```yaml
- check: approx
  expected:
    value: 3.33
    epsilon: 0.005
  reason_code: wrong_quotient
  reason: Share out the whole ones first, then keep dividing what is left and round at the second decimal place.
```
