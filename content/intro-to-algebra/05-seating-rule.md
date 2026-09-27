---
slug: seating-rule
type: lab
title: Seating Rule
outcome: Find a rule that gives the number of seats for any number of tables.
requires: [writing-expressions, substitution]
---

--explain--

A cafe pushes square tables together in a line. 1 table seats 4 people, 2 tables seat 6, and 3 tables seat 8. Each extra table adds 2 seats.

--answer--

Write an expression for the number of seats when there are $n$ tables.

```yaml
- check: equivalent
  expected: "2n + 2"
  reason_code: not_equivalent
  reason: Each table adds two seats, and there is one seat at each end of the line.
```

--answer--

How many seats are there with 10 tables?

```yaml
- check: equals
  expected: 22
  reason_code: wrong_value
  reason: Put the number of tables into your rule, multiply first, then add.
```
