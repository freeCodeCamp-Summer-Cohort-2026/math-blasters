# Testing, linting and type checking

CI runs every check below on each push and pull request; see
[.github/workflows/ci.yml](../.github/workflows/ci.yml). Run them the same way
locally before you open a PR.

## With Docker (recommended)

Bring the stack up once (`docker compose up --build`), then run each check
inside the service that owns it. No local Python or Node install needed.

```bash
# Backend: tests, lint, formatting
docker compose exec api pytest
docker compose exec api ruff check .
docker compose exec api ruff format --check .

# Backend: migrations still match the models
docker compose exec api alembic check

# Frontend: tests, type checking, lint, production build
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

## Without Docker

```bash
# API tests need a real Postgres; `docker compose up -d db` gives you one.
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
`mathblasters_test` on `localhost:5433`, the port compose publishes. Set
`TEST_DATABASE_URL` if yours lives elsewhere.
