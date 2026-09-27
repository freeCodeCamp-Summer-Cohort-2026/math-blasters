---
slug: planting-a-garden
type: lab
title: Planting a Garden
outcome: Plan a garden bed where every row has the same number of plants.
requires: [equal-groups, times-tables, factors]
---

--explain--

You have 24 seedlings to plant. Every row must have the same number of seedlings, with at least 2 rows and at least 2 seedlings in each row.

--answer--

How many rows could you plant? Give one number of rows that works.

```yaml
- check: equals_any
  expected: [2, 3, 4, 6, 8, 12]
  reason_code: wrong_rows
  reason: The number of rows has to divide the seedlings exactly, and each row needs at least two.
```

--answer--

Each seedling costs \$3. How many dollars do all 24 seedlings cost?

```yaml
- check: equals
  expected: 72
  reason_code: wrong_product
  reason: Multiply the number of seedlings by the cost of one seedling.
```
