---
slug: arrays-and-order
type: tutorial
title: Arrays and Order
teaches: [arrays, commutativity]
---

--explain--

An **array** puts things in rows and columns. 2 rows of 5 chairs is $2 \times 5 = 10$ chairs. Turn the array on its side and you get 5 rows of 2, still 10. The order you multiply in does not change the answer.

--answer--

A hall has 4 rows of chairs with 6 chairs in each row. How many chairs are there?

```yaml
- check: equals
  expected: 24
  reason_code: wrong_product
  reason: Multiply the number of rows by the number of chairs in one row.
```

--answer--

$7 \times 9 = 63$. What is $9 \times 7$?

```yaml
- check: equals
  expected: 63
  reason_code: wrong_product
  reason: Turning an array on its side keeps the same number of things.
```
