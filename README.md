# Math Blasters

Math Blasters will teach basic-math topics through short two-minute
**Tutorials** and longer open-ended **Labs**, where learners *do* things in the
browser rather than read about arithmetic.

**None of that is built yet.** This repo is the base template for the
freeCodeCamp Summer 2026 Cohort sprint: the stack is wired up, CI runs, and a
single hardcoded question proves the pieces talk to each other. Everything that
makes it a product is an open issue waiting for you.

See [CONTRIBUTING.md](./CONTRIBUTING.md) for the issue-claiming workflow.

## What's in the box

| | |
| --- | --- |
| ✅ Built | React + TypeScript + Vite wiring, FastAPI + SQLAlchemy + Alembic wiring, Postgres, Docker Compose, CI on both suites, design tokens, one end-to-end setup check |
| ❌ Not built | Topics, lessons, tutorials, labs, steps, content authoring, progress, accounts, hints, streaks, feedback design — **all of it** |

The one page you get is a *setup check*: it fetches a hardcoded `3 + 4` from
the API, you answer it, and the server grades it. That's it. Its only job is to
tell a new contributor that their environment works.

![The setup check page](./docs/screenshots/setup-check.png)

## Stack

- **Frontend**: React 18 + TypeScript, built with Vite. Plain CSS with custom
  properties — no CSS framework, so there's nothing extra to learn.
- **API**: FastAPI (Python 3.12), SQLAlchemy 2.0, Alembic migrations
- **Database**: PostgreSQL 16
- **Tests**: pytest + httpx2 (API), Vitest + Testing Library (frontend)

No routing library, no state management, no auth. Those are decisions for
whoever picks up the issues that need them.

## Quickstart

```bash
cp .env.example .env
docker compose up --build
```

That starts three services:

- `db` — PostgreSQL, published on port **5433** (not 5432 — see below)
- `api` — FastAPI on [http://localhost:8000](http://localhost:8000)
- `web` — Vite dev server on [http://localhost:5173](http://localhost:5173)

The API applies migrations on startup, so the schema is ready. Load the one
demo row:

```bash
docker compose exec api python -m app.seed
```

Then open [http://localhost:5173](http://localhost:5173). If you see the
question and can answer it, your setup is good. Interactive API docs are at
[http://localhost:8000/docs](http://localhost:8000/docs).

> **Why port 5433?** Plenty of machines already run PostgreSQL on 5432, and the
> container can't bind a port that's taken. Compose publishes the database on
> `5433` instead. Inside the compose network the API still connects to
> `db:5432`. Change `POSTGRES_PORT` in `.env` if 5433 is also busy.

### Running without Docker

You'll need a PostgreSQL server. If you don't already have one,
[installing Docker](https://docs.docker.com/get-docker/) and using the
Quickstart above is genuinely less work than installing Postgres by hand.

If Docker isn't an option, install
[PostgreSQL](https://www.postgresql.org/download/) locally, then:

```bash
createdb mathblasters
createdb mathblasters_test   # only needed to run the API tests
```

```bash
# API — first terminal
cd api
python -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"
export DATABASE_URL="postgresql+psycopg://<user>:<password>@localhost:5432/mathblasters"
alembic upgrade head
python -m app.seed
uvicorn app.main:app --reload

# Frontend — second terminal
cd web
npm install
npm run dev
```

A psycopg `OperationalError: connection refused` means nothing is listening at
the address in `DATABASE_URL` — it isn't a problem with anything else in
`.env`.

## Layout

```
math-blasters/
├── api/
│   ├── app/
│   │   ├── main.py         app factory (shared by uvicorn and the tests)
│   │   ├── config.py       env-driven settings
│   │   ├── db.py           engine, session, SessionDep
│   │   ├── models.py       DemoProblem — PLACEHOLDER, delete it
│   │   ├── schemas.py      Pydantic models for the demo endpoint
│   │   ├── seed.py         inserts the one demo row
│   │   └── routers/        health.py, demo.py
│   ├── alembic/            migrations
│   └── tests/              pytest suite
├── web/
│   ├── src/
│   │   ├── App.tsx         the entire UI, for now
│   │   ├── api/client.ts   typed fetch wrapper
│   │   ├── types.ts
│   │   └── styles/         tokens.css (design tokens), global.css
│   └── tests/              Vitest suite
├── docker-compose.yml
├── instructions.md         repo setup for maintainers
└── .github/workflows/ci.yml
```

### About the placeholder

`DemoProblem` is one table with `prompt`, `expression` and `answer` columns. It
knows nothing about topics, lessons, tutorials, labs, steps or success
criteria, and **it is not the beginning of a content model**.

Designing the real schema is issues #19, #20 and #21. Please start from the
ticket and delete `DemoProblem`, rather than growing it into something it was
never shaped to be.

The one convention worth keeping: `DemoProblemOut` has no `answer` field, and
grading happens in `POST /api/demo/check` on the server. The answer key should
never reach the browser. There's a test asserting that.

### API

| Method | Route                 | Description                        |
| ------ | --------------------- | ---------------------------------- |
| GET    | `/api/health`         | Liveness check                     |
| GET    | `/api/demo/problem`   | The demo question (no answer)      |
| POST   | `/api/demo/check`     | Grade an answer server-side        |

Three endpoints, all placeholders. The real API doesn't exist yet.

### Styling

`web/src/styles/tokens.css` holds the palette, spacing scale, radii, shadows
and easing, with light and dark values. `global.css` styles the setup-check
page and little else.

This is a starting point, not a design system — it exists so contributors have
consistent values to build with instead of inventing hex codes. Pull from the
tokens; don't hard-code colours.

## Testing, linting and type checking

CI runs every check below on each push and pull request — see
[.github/workflows/ci.yml](./.github/workflows/ci.yml). Run them the same way
locally before you open a PR.

### With Docker (recommended)

Bring the stack up once (`docker compose up --build`), then run each check
inside the service that owns it. No local Python or Node install needed.

```bash
# Backend — tests, lint, formatting
docker compose exec api pytest
docker compose exec api ruff check .
docker compose exec api ruff format --check .

# Backend — migrations still match the models
docker compose exec api alembic check

# Frontend — tests, type checking, lint, production build
docker compose exec web npm test
docker compose exec web npm run typecheck
docker compose exec web npm run lint
docker compose exec web npm run build
```

`ruff format .` (no `--check`) and `npm run test:watch` are the fix-it and
watch-mode variants. If a container isn't up, `docker compose up -d api web`
starts just what these need.

The API suite runs against `mathblasters_test`, a throwaway database the `db`
container creates on first start, and rebuilds its schema from scratch every
run. Compose points `TEST_DATABASE_URL` at it, so `docker compose exec api
pytest` never touches the development database serving your browser.

> If you ran the API tests against an older checkout, they may have dropped the
> tables in your *development* database while leaving Alembic stamped at head —
> so the app returns `Internal Server Error` and restarting fixes nothing.
> Rebuild it once:
>
> ```bash
> docker compose exec api sh -c "alembic stamp base && alembic upgrade head"
> docker compose exec api python -m app.seed
> ```

### Without Docker

```bash
# API tests — need a real Postgres. `docker compose up -d db` gives you one.
cd api
pip install -e ".[dev]"
pytest
ruff check .
ruff format --check .

# Frontend
cd web
npm install
npm test
npm run typecheck
npm run lint
npm run build
```

Here `TEST_DATABASE_URL` is unset, so the suite falls back to
`mathblasters_test` on `localhost:5433` — the port compose publishes. Set
`TEST_DATABASE_URL` if yours lives elsewhere.

## What to build

Everything. The open issues on the upstream repo cover the real product:
content authoring, tutorials and labs, ordered checks, progress, hints,
feedback design, streaks and previews.

Maintainers setting the repo up for the first time should read
[instructions.md](./instructions.md).

## License

[MIT](./LICENSE)
