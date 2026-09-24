# Contributing to Math Blasters

Welcome. This is a cohort project, so the goal is that everyone gets a real
piece of work merged - not that the app gets finished fastest.

## Before you start

Get it running first by running `./scripts/dev-setup.sh` from the repository
root. Once services are healthy and http://localhost:5173 loads, your environment is
good. If something in the setup doesn't work, that's a bug worth an issue on
its own.

## Claiming an issue

1. Find an unassigned issue. Anything labelled `good first issue` is scoped to
   be a reasonable first contribution.
2. Comment `I'd like to take this` on it and wait to be assigned. Please don't
   start on an issue someone else is already assigned to.
3. One issue at a time, so nobody gets blocked waiting on you.

If you want to work on something that isn't filed yet, open an issue first and
agree the approach before writing code. That's much cheaper than finding out at
review time.

## Branch and PR workflow

```bash
# Fork the repo on GitHub, then:
git clone https://github.com/<your-username>/math-blasters.git
cd math-blasters
git remote add upstream https://github.com/<org>/math-blasters.git

# Always branch from an up-to-date main
git fetch upstream
git switch -c feat/short-description upstream/main
```

Branch naming: `feat/…`, `fix/…`, `docs/…`, `test/…`, `chore/…`.

Commit messages: describe the change, not the file. `fix: stop progress bar
resetting on refresh` beats `update LessonPlayer.tsx`.

When you open the PR:

- Link the issue with `Closes #123`.
- Keep it to one issue. A PR that fixes three unrelated things is three PRs.
- Include a screenshot or short clip for anything that changes the UI.

## Run the checks before you push

CI runs exactly these. Running them locally saves you a round trip:

```bash
# API
cd api
ruff check .          # lint
ruff format .         # formatting (CI runs `ruff format --check .`)
alembic check         # fails if models.py has drifted from the migrations
pytest                # needs Postgres: docker compose up -d db

# Frontend
cd web
npm run typecheck
npm run lint
npm test
npm run build
```

If you work in Docker, the same checks run as `docker compose exec api ...` and
`docker compose exec web ...` — see
[Testing, linting and type checking](./README.md#testing-linting-and-type-checking)
in the README.

## Adding a lesson

A lesson is a markdown file, not a database row — no migration, no seeder.

An answer step's criteria block may also include two optional fields, `checking` and `hints`:

- `checking` — a plain-language sentence describing what the step is checking. Not shown to learners yet; this is a schema slot for later UI.
- `hints` — an ordered list of sentences to offer a learner who is stuck, in the order they'd be shown.

```
checking: the total number of marbles across all three jars
hints:
  - Count each jar separately first.
  - Add the first two, then add the third.
criteria:
  - check: equals
    expected: 15
    reason_code: wrong_total
```

The bare list of criteria (no `checking`/`hints`) is still valid and means exactly what it always has.

1. New module: add `content/<module-slug>/module.yaml` with `slug`, `title`,
   `summary` and a `position` (modules are ordered by it). Skip this if
   you're adding a lesson to an existing module.
2. Add the lesson at `content/<module-slug>/<NN>-<lesson-slug>.md`, where
   `NN` is a two-digit prefix that orders the lesson within its module
   (`01-`, `02-`, ...).
3. Give it frontmatter — `slug`, `type` (`tutorial` or `lab`), `title`,
   `teaches` — then the body. See
   `content/arithmetic-addition/01-adding-two-numbers.md` for a worked
   example.
4. From `web/`, run `npm run content:check`. It parses every file under
   `content/` and fails on the first malformed one, printing the file and
   the reason. CI runs the same check, so a broken lesson can't land
   quietly.
5. From `web/`, run `npm run content:manifest` to regenerate
   `content/manifest.json` and commit the result. It's the API's only record
   of which slugs are real, so CI fails (`npm run content:manifest -- --check`)
   if a lesson lands without a matching manifest entry.

No code change and no review of `DemoProblem` needed — open the PR like any
other.

## What we look for in review

- **Tests.** New behaviour needs a test. Bug fixes need a test that fails
  before the fix.
- **Content lives in the repo.** The API stores no content and grades nothing.
  Never serialise expected values or answers in API responses.
- **Use the design tokens.** Colours, spacing, radii and easing all live in
  `web/src/styles/tokens.css`. Please don't hard-code hex values in components.
- **Accessibility.** Interactive things must be reachable by keyboard and have
  a sensible accessible name. Animations must respect `prefers-reduced-motion`.
- **It should feel like a game.** "Technically correct but joyless" is a valid
  review comment on this project.

## Questions

Ask in the cohort channel or on the issue itself. Asking early is not a
failure mode; a week of silent struggle is.
