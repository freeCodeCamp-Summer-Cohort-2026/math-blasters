---
slug: adding-two-digit-numbers
type: tutorial
title: Adding Two-Digit Numbers
teaches: [two-digit-addition, carrying]
---

--explain--

Add the tens and the ones separately. For $23 + 14$, the tens make $20 + 10 = 30$ and the ones make $3 + 4 = 7$, so the total is 37.

--answer--

What is $32 + 25$?

```yaml
- check: equals
  expected: 57
  reason_code: wrong_sum
  reason: Add the tens together, then add the ones together, then put them back together.
```

--explain--

When the ones add up to 10 or more, carry a ten. For $27 + 15$, the ones make $7 + 5 = 12$. Keep the 2 and carry 1 ten. The tens are $20 + 10$ plus the carried ten, which is 40. So $27 + 15 = 42$.

--answer--

What is $38 + 45$?

```yaml
- check: equals
  expected: 83
  reason_code: wrong_sum
  reason: Add the ones first. If they make ten or more, carry a ten over to the tens.
```
