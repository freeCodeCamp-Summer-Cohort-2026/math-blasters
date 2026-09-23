# Math Blasters

Math Blasters will teach basic-math topics through short two-minute
**Tutorials** and longer open-ended **Labs**, where learners *do* things in the
browser rather than read about arithmetic.

**None of that is built yet.** This repo is the base template for the
freeCodeCamp Summer 2026 Cohort sprint: the stack is wired up and CI runs.
Everything that makes it a product is an open issue waiting for you.

See [CONTRIBUTING.md](./CONTRIBUTING.md) for the issue-claiming workflow.

## What's in the box

| | |
| --- | --- |
| ✅ Built | React + TypeScript + Vite wiring, FastAPI + SQLAlchemy + Alembic wiring, Postgres, Docker Compose, CI on both suites, design tokens |
| ❌ Not built | Topics, lessons, tutorials, labs, steps, content authoring, progress, accounts, hints, streaks, feedback design — **all of it** |

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
./scripts/dev-setup.sh
```

That starts three services:

- `db` — PostgreSQL, published on port **5433** (not 5432 — see below)
- `api` — FastAPI on [http://localhost:8000](http://localhost:8000)
- `web` — Vite dev server on [http://localhost:5173](http://localhost:5173)

Then open [http://localhost:5173](http://localhost:5173) to view the app.
Interactive API docs are at [http://localhost:8000/docs](http://localhost:8000/docs).

> **Why port 5433?** Plenty of machines already run PostgreSQL on 5432, and the
> container can't bind a port that's taken. Compose publishes the database on
> `5433` instead. Inside the compose network the API still connects to
> `db:5432`. Change `POSTGRES_PORT` in `.env` if 5433 is also busy.

## Troubleshooting

### PostgreSQL port

PostgreSQL is published on host port **5433**, not 5432. The API connects to
`db:5432` inside the Compose network; use `localhost:5433` only when connecting
from your host machine. If 5433 is already in use, change `POSTGRES_PORT` in
`.env` and restart the services.

### `mathblasters_test` does not exist

`scripts/init-test-db.sh` runs only when PostgreSQL initializes an empty data
volume. If your volume predates that script and tests report that
`mathblasters_test` does not exist, choose one of these fixes:

- Recreate the volume, then run setup again:

  ```bash
  docker compose down -v
  ./scripts/dev-setup.sh
  ```

- Keep the existing volume and create the test database by hand:

  ```bash
  docker compose exec db createdb -U mathblasters mathblasters_test
  ```

### Tables are gone but Alembic is stamped at head

If the app returns an internal server error because its tables were removed
while Alembic still reports the database at `head`, rebuild the schema:

```bash
docker compose exec api sh -c "alembic stamp base && alembic upgrade head"
```

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
export COOKIE_SECURE=false   # local HTTP; see below
alembic upgrade head
uvicorn app.main:app --reload

# Frontend — second terminal
cd web
npm install
npm run dev
```

A psycopg `OperationalError: connection refused` means nothing is listening at
the address in `DATABASE_URL` — it isn't a problem with anything else in
`.env`.

### Resetting local learner identity

The API identifies browsers with the `learner_token` cookie. To start with a 
fresh local learner identity, clear that cookie for `localhost` in your
browser's developer tools, then reload the page.

Clearing the cookie creates a new learner on the next API request. This does
not delete database rows. It only makes the browser use a new identity.

### Learner cookies over HTTP

Learner cookies are `Secure` by default, so a browser will only store them over
HTTPS. Local development serves HTTP, which means `COOKIE_SECURE=false` has to
reach the API process or the identity cookie is silently dropped and every
request mints a new learner.

How to set it depends on how you started the API:

- **Docker Compose**: already handled. Compose reads `COOKIE_SECURE` from the
  repository-root `.env` (it ships as `false` in `.env.example`) and passes it
  into the container.
- **Running without Docker**: `export COOKIE_SECURE=false` in the shell you run
  `uvicorn` from, as the commands above do. The root `.env` is **not** picked up
  here: settings resolve `.env` relative to the working directory, and that
  directory is `api/`.

Production deployments serve HTTPS and should leave the variable unset, or set
it to `true`.

## Layout

```
math-blasters/
├── api/
│   ├── app/
│   │   ├── main.py         app factory (shared by uvicorn and the tests)
│   │   ├── config.py       env-driven settings
│   │   ├── db.py           engine, session, SessionDep
│   │   ├── models.py       DeclarativeBase for SQLAlchemy models
│   │   ├── schemas.py      Pydantic schemas and error envelope models
│   │   └── routers/        health.py
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

### Content and Invariants

Content lives directly in the repository (see `web/src/content`) and is evaluated
client-side. Content never enters the database, and the API stores no content and
grades nothing. An automated invariant test enforces that no API response or OpenAPI
schema exposes answers or expected values.

### API

| Method | Route         | Description    |
| ------ | ------------- | -------------- |
| GET    | `/api/health` | Liveness check |

### API Error Envelope Format

All API errors return a standardized JSON envelope structure with appropriate HTTP status codes:

```json
{
  "error": {
    "code": "validation_error",
    "message": "Human-readable error description",
    "details": "Optional validation details or metadata"
  }
}
```

### Styling

`web/src/styles/tokens.css` holds the palette, spacing scale, radii, shadows
and easing, with light and dark values. `global.css` provides base styling.

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
