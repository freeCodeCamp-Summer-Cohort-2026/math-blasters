---
slug: sharing-pizza
type: lab
title: Sharing Pizza
outcome: Work out how many slices each person gets when a pizza is shared equally.
requires: [halving, quartering]
---

--explain--

A pizza has 12 slices. Four friends share it equally.

--answer--

How many slices does each friend get?

```yaml
- check: equals
  expected: 3
  reason_code: wrong_share
  reason: Share the slices out one at a time until none are left. How many does each friend hold?
```
