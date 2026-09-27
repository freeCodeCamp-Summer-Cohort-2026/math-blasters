---
slug: packing-boxes
type: lab
title: Packing Boxes
outcome: Work out how many boxes you need to pack every book.
requires: [sharing-equally, remainders]
---

--explain--

A library is packing 52 books. Each box holds 8 books.

--answer--

How many boxes can be filled completely?

```yaml
- check: equals
  expected: 6
  reason_code: wrong_quotient
  reason: Find how many full groups of eight fit into the books.
```

--answer--

How many books are left over after filling those boxes?

```yaml
- check: equals
  expected: 4
  reason_code: wrong_remainder
  reason: Take the books in the full boxes away from all the books.
```

--answer--

How many boxes are needed to pack every book?

```yaml
- check: equals
  expected: 7
  reason_code: wrong_boxes
  reason: The books that are left over still need a box of their own.
```
