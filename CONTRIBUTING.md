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
`docker compose exec web ...`; see
[docs/testing.md](./docs/testing.md).

### CI Pipeline Secrets

API CI job requires no repository secrets for authentication. All third-party provider calls are completely stubbed out in our test suite. Because no automated test job ever makes an actual network call to authenticate with GitHub or Google, entire test pipeline runs successfully out-of-the-box without requiring live credentials.

## How content works

Worth knowing before you touch anything, because it isn't the usual web app
shape:

- **Content is files in the repo.** Lessons are markdown files under
  `content/`, read into the web app at build time. They're never stored in the
  database or served by the API.
- **Answers are checked in the browser.** The checker in `web/src/content/` is
  one pure function. No network call is involved.
- **The API stores identity and progress, and nothing else.** Who you are, and
  which lesson slugs you've completed.

Adding a lesson is a markdown file and a PR, no code change. The steps are in
the [README](./README.md#adding-a-lesson), and the full format is in
[docs/content-model.md](./docs/content-model.md), along with why grading
isn't server-side.

## What we look for in review

- **Tests.** New behaviour needs a test. Bug fixes need a test that fails
  before the fix.
- **The two invariants.** Every PR is checked against both:
  1. **No expected value is ever rendered.** Not in the DOM, not in a live
     region, not in a feedback sentence.
  2. **The API stores no content and grades nothing.** No endpoint accepts or
     returns an expected value. Grading is not server-side, and nothing should
     say it is.
- **Use the design tokens.** Colours, spacing, radii and easing all live in
  `web/src/styles/tokens.css`. Please don't hard-code hex values in components.
- **Accessibility.** Interactive things must be reachable by keyboard and have
  a sensible accessible name. Animations must respect `prefers-reduced-motion`.
- **It should feel like a game.** "Technically correct but joyless" is a valid
  review comment on this project.

## Questions

Ask in the cohort channel or on the issue itself. Asking early is not a
failure mode; a week of silent struggle is.
