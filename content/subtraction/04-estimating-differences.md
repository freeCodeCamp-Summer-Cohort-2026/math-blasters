---
slug: estimating-differences
type: tutorial
title: Estimating Differences
teaches: [estimating-differences]
---

--explain--

To check an answer quickly, round each number to the nearest ten first. $48 - 21$ is about $50 - 20 = 30$. The exact answer, 27, is close to that estimate.

--answer--

Round each number to the nearest ten, then subtract: $71 - 29$.

```yaml
- check: equals
  expected: 40
  reason_code: wrong_estimate
  reason: Round each number to its nearest ten first, then subtract the rounded numbers.
```

--answer--

About how much is $198 - 102$? Give an estimate, not an exact answer.

```yaml
- check: in_range
  expected:
    min: 90
    max: 105
  reason_code: out_of_range
  reason: Round both numbers to the nearest hundred or ten, then subtract.
```
