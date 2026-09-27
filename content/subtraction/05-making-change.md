---
slug: making-change
type: lab
title: Making Change
outcome: Work out how much change a shopper gets back after paying.
requires: [taking-away, difference]
---

--explain--

You go to a bookshop with a \$20 note. A comic book costs \$13.

--answer--

You pay for the comic with the \$20 note. How many dollars of change do you get?

```yaml
- check: equals
  expected: 7
  reason_code: wrong_change
  reason: The change is the gap between what you paid and what the comic costs.
```

--answer--

Then you spend \$4 of your change on a pen. How many dollars do you have left?

```yaml
- check: equals
  expected: 3
  reason_code: wrong_change
  reason: Start from the change you just worked out, then take away the cost of the pen.
```
