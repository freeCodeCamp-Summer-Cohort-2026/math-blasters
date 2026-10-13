# The content model

How lessons are stored, checked and tracked, and why it works this way. If
you're about to write a lesson, or about to ask "why isn't grading done on the
server?", start here.

## The short version

- **Content is files in the repo.** A lesson is a markdown file under
  `content/`. Adding one means writing that file and opening a PR. No database
  rows, no migration, no seeder, no code change.
- **Content is read at build time.** Vite bundles every lesson into the web app,
  so a lesson renders on first paint with no API call.
- **Answers are checked in the browser.** One pure TypeScript function compares
  what the learner typed against the lesson's criteria. No network involved.
- **The API stores identity and progress, and nothing else.** It knows who you
  are and which lesson slugs you've finished. It has never seen a lesson.

## Where things live

```
content/
  arithmetic-addition/
    module.yaml                  title, summary, position
    01-adding-two-numbers.md     a tutorial
    ...
    06-marbles-in-total.md       a lab
  manifest.json                  generated and committed; the API's list of real slugs
web/src/content/                 the parser, the checker and the build-time index
```

| File | Holds | Read by |
| --- | --- | --- |
| `content/<module>/module.yaml` | `slug` (must match the directory), `title`, `summary`, `position` | the web build |
| `content/<module>/<NN>-<slug>.md` | frontmatter and steps; `NN` orders the lesson in its module | the web build |
| `content/manifest.json` | every module and lesson slug, generated from the files above | the API, to reject a completion for a lesson that doesn't exist |

Modules are ordered by `position`, lessons by their filename prefix. Moving a
lesson is a rename, and the diff says so.

Postgres holds four tables, and none of them holds content:

| Table | What it's for |
| --- | --- |
| `learners` | the cookie identity, including for a signed-out visitor |
| `accounts` | a signed-in learner (GitHub or Google), so progress follows them to another device |
| `oauth_identities` | which GitHub or Google account belongs to which account |
| `completions` | `account_id`, `lesson_slug`, `completed_at`. Progress, for signed-in accounts only |

`completions.lesson_slug` is a plain string, not a foreign key, because there's
no lessons table to point at. `manifest.json` is the check instead.

## Writing a lesson

### The steps

1. **New module only:** add `content/<module-slug>/module.yaml` with `slug`,
   `title`, `summary` and `position`. Skip this when adding to an existing
   module.
2. Add the lesson at `content/<module-slug>/<NN>-<lesson-slug>.md`, where `NN`
   is a two-digit order prefix (`01-`, `02-`, ...).
3. Write the frontmatter and body (see below).
   `content/arithmetic-addition/01-adding-two-numbers.md` is a good one to copy.
4. From `web/`, run `npm run content:validate`. It parses every lesson and stops
   at the first broken one, printing the file and the reason.
5. From `web/`, run `npm run content:manifest` and commit the updated
   `content/manifest.json`.

CI runs both checks, and so does `npm run build`, so a broken lesson or a stale
manifest can't land quietly.

### The lesson file

YAML frontmatter, then a body split into steps by `--explain--` and
`--answer--` markers. It's the same shape as a freeCodeCamp challenge file.

````markdown
---
slug: adding-two-numbers
type: tutorial
title: Adding Two Numbers
teaches: [addition, counting-on]
---

--explain--

Addition is combining two or more numbers together to find a total sum.

--answer--

What is $3 + 4$?

```yaml
- check: equals
  expected: 7
  reason_code: wrong_total
```
````

A lab looks the same, with an `outcome` (what the learner is trying to achieve)
and `requires` in place of `teaches`:

```yaml
---
slug: marbles-in-total
type: lab
title: Marbles in Total
outcome: Combine groups of marbles to find total sums in applied scenarios.
requires: [addition]
---
```

The parser enforces these rules, and each one fails the build, not the learner:

- `slug` matches the filename; `type` is `tutorial` or `lab`.
- `outcome` is required for a lab and not allowed on a tutorial.
- Nothing comes before the first step marker.
- An `--explain--` step is not empty.
- An `--answer--` step is markdown (the prompt) followed by exactly one fenced
  `yaml` block with at least one criterion.
- `teaches` and `requires` are concept slugs. Every concept a lab requires must
  be taught by a tutorial earlier in the same module.

A lab stays locked until the learner has completed the tutorials that teach
what it requires. A lesson is passed when every criterion on every answer step
passes. Nothing else marks it complete.

### Checks

A fixed list, evaluated in the browser. A new lesson needs no code; a new kind
of check does.

| `check` | `expected` | Passes when |
| --- | --- | --- |
| `equals` | number or string | the submission is exactly equal, after normalising |
| `approx` | `{value, epsilon}` | it is within `epsilon` of `value` |
| `in_range` | `{min, max}` | `min <= submission <= max`, inclusive |
| `equals_any` | array | it equals any member |
| `set_equals` | array | the comma-separated submission is the same set, in any order |
| `equivalent` | expression string | mathjs simplifies both sides to the same thing (`2x` and `x*2`) |

An answer step shows a number field, or a text field when any criterion is
`equivalent` or `set_equals`, or has a text `expected`.

An `equivalent` check accepts any expression equal to the answer, so "simplify
$2x + 3x$" is passed by typing `2x + 3x` back. Ask in words, or ask for a
number such as the coefficient.

### Helping a learner who's stuck

The criteria block can also carry `checking` and `hints`:

- `checking`: a plain sentence saying what the step checks. Learners see it in
  the "not yet" feedback after a wrong answer, so it must not give the answer
  away. The parser rejects a `checking` that contains the expected value.
- `hints`: an ordered list of sentences, offered in that order.

```yaml
checking: the total number of marbles across all three jars
hints:
  - Count each jar separately first.
  - Add the first two, then add the third.
criteria:
  - check: equals
    expected: 15
    reason_code: wrong_total
```

A bare list of criteria, with no `checking` or `hints`, is still valid.

Each criterion can also carry a `reason`: a sentence shown when the learner's
answer fails that criterion, in place of the generic sentence for its
`reason_code`. It must not give the answer away either, and the parser
rejects a `reason` that contains the expected value. That check can't cover
`in_range`, which has no single answer, so don't state its `min` or `max` in
the `reason`.

```yaml
criteria:
  - check: equals
    expected: 15
    reason_code: wrong_total
    reason: Count each jar on its own, then add the three counts together.
```

Quote a `reason` that contains `: `, or the YAML breaks:
`reason: "Halve it: divide by two."`. A new `reason_code` needs a sentence in
`web/src/content/reasons.ts` only when some criterion using it has no `reason`.

## The trust model

Expected answers ship in the JavaScript bundle. A curious learner can open
devtools and read them. **That is deliberate.**

In return we get instant feedback with no round trip, lessons that render
without the API, and a lesson that anyone (not only engineers) can add with one
file. Nobody is being graded, certified or ranked here, so nothing important
depends on the answer staying hidden.

What we protect instead is the learning experience, with two invariants. Every
PR is reviewed against them:

1. **No expected value is ever rendered.** Not in the DOM, not in a live region,
   not in a feedback sentence. The learner who wants to try has to try.
   `web/tests/LessonStepper.test.tsx` and `web/tests/NotYetExplanation.test.tsx`
   assert it for a wrong answer.
2. **The API stores no content and grades nothing.** No endpoint accepts or
   returns an expected value, and `POST /api/completions` takes a lesson slug
   and nothing more. `api/tests/test_invariants.py` checks every route in the
   OpenAPI schema.

## Why isn't grading server-side?

Because there's nothing to protect, and a lot to lose.

Server-side grading exists to stop cheating. Math Blasters has no scores,
certificates or leaderboards, so a learner who "cheats" only skips their own
practice. Meanwhile, moving checking to the server would mean every answer
waits on a network call, content has to live in a database and ship through an
API, and adding a lesson becomes a migration or a seeder run rather than a
markdown file.

The API does still validate what it stores: a completion for a slug that isn't
in `manifest.json` gets a 404, and the endpoint is rate limited. That keeps
progress honest about which lessons exist. It doesn't, and isn't meant to,
prove the learner got the answer right.

If a future version needs real assessment (a certificate, a teacher dashboard),
that's the time to revisit this, and it would be a new design, not a tweak.

## How this compares to freeCodeCamp

The model is borrowed from freeCodeCamp's curriculum, with the parts that don't
fit a math app swapped out.

| freeCodeCamp | Math Blasters | Why |
| --- | --- | --- |
| Gatsby + GraphQL, content read at build time | Vite + `import.meta.glob`, content read at build time | Same property: content is in the bundle, not behind an API |
| Markdown + metadata per challenge | The same | |
| Client-side test runner, Babel AST checks | Client-side checker, mathjs | Math has no syntax tree worth inspecting; symbolic equivalence plays the same role |
| Node + Express + MongoDB | FastAPI + Postgres | It was already built, and it stores the same two things: who you are and what you finished |
| Static HTML first, then hydrate | Plain single-page app | SEO isn't a goal here, and build-time content already means first paint needs no API call |

## Deliberately out of scope

Server-side grading, cheat resistance, static pre-rendering, content
versioning, draft and publish states, per-learner difficulty, an authoring UI,
and passwords. Sign-in is delegated to GitHub and Google, so the app never
stores one.
