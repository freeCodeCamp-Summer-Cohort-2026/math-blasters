# Contributing to Math Blasters

Welcome. This is a cohort project, so the goal is that everyone gets a real
piece of work merged - not that the app gets finished fastest.

## Before you start

Get it running first, following the [Quickstart](./README.md#quickstart). If
you can answer the setup-check question in the browser, your environment is
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

## What we look for in review

- **Tests.** New behaviour needs a test. Bug fixes need a test that fails
  before the fix.
- **Answers stay on the server.** Never serialise a correct answer to the
  browser. `DemoProblemOut` omits it and grading happens in the API; keep that
  property as the content model grows.
- **Use the design tokens.** Colours, spacing, radii and easing all live in
  `web/src/styles/tokens.css`. Please don't hard-code hex values in components.
- **Accessibility.** Interactive things must be reachable by keyboard and have
  a sensible accessible name. Animations must respect `prefers-reduced-motion`.
- **It should feel like a game.** "Technically correct but joyless" is a valid
  review comment on this project.

## A note on the placeholder

`DemoProblem` (API) and `App.tsx` (frontend) exist only to prove the stack is
wired up. They are **not** the beginning of the product, and they're small on
purpose.

The content model - what a topic, tutorial, lab, step and success criterion
actually are - is still to be designed, in issues #19, #20 and #21. If your
change involves growing `DemoProblem` into something content-shaped, stop and
pick up those issues instead: it's a design decision the team should agree on
the issue before anyone writes the schema.

## Questions

Ask in the cohort channel or on the issue itself. Asking early is not a
failure mode; a week of silent struggle is.
