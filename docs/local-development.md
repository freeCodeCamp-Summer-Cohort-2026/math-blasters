# Local development

Everything beyond the quickstart: signing in locally, running without Docker, and fixing the usual setup snags.

## Signing in with GitHub or Google

> [!IMPORTANT]
> **Credential Privacy:** Each contributor must use their own personal credentials for local development. OAuth keys are strictly private and none must ever be committed to version control.

### GitHub Setup

- Go to GitHub Developer Settings > OAuth Apps > **New OAuth App**.
- **Homepage URL:** `http://localhost:5173`
- **Authorization callback URL:** `http://localhost:8000/api/auth/github/callback`
- Copy the Client ID into `GITHUB_CLIENT_ID` and the Client Secret into `GITHUB_CLIENT_SECRET` in your local `.env`.

### Google Setup

- Go to Google Cloud Console and create or select a project.
- Configure OAuth consent screen (External) and create credentials for an **OAuth client ID** (Application type: Web application).
- **Authorized redirect URIs:** `http://localhost:8000/api/auth/google/callback`
- Copy the Client ID into `GOOGLE_CLIENT_ID` and the Client Secret into `GOOGLE_CLIENT_SECRET` in your local `.env`.

### Applying the values

The API reads the provider values once, at startup.

- **Docker Compose**: run `docker compose up -d`. `docker compose restart` keeps the old values; `up -d` recreates the container with the new ones.
- **Running without Docker**: `export` the variables in the shell you run `uvicorn` from, or put them in `api/.env` (the root `.env` is not read there), then restart `uvicorn`.

## API URL configuration

The web app uses a baked-at-build-time API URL because this keeps configuration simple and avoids adding a separate runtime configuration mechanism. When the frontend and API share an origin, the default relative `/api` path requires no `VITE_API_URL`; for cross-origin production deployments, set `VITE_API_URL` to the intended API base URL during the production build. Vite embeds `VITE_API_URL` into the frontend at build time, so the value is visible in the shipped frontend bundle and must never contain secrets.

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
[Quickstart](../README.md#quickstart) is genuinely less work than installing Postgres by hand.

If Docker isn't an option, install
[PostgreSQL](https://www.postgresql.org/download/) locally, then:

```bash
createdb mathblasters
createdb mathblasters_test   # only needed to run the API tests
```

```bash
# API: first terminal
cd api
python -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"
export DATABASE_URL="postgresql+psycopg://<user>:<password>@localhost:5432/mathblasters"
export COOKIE_SECURE=false   # local HTTP; see below
export ENV=development       # allows the dev AUTH_SECRET_KEY; unset means production
alembic upgrade head
uvicorn app.main:app --reload

# Frontend: second terminal
cd web
npm install
npm run dev
```

A psycopg `OperationalError: connection refused` means nothing is listening at
the address in `DATABASE_URL`; it isn't a problem with anything else in
`.env`.

### Signing in locally

- **Unconfigured provider**: with a provider's two variables empty, the app still starts, every route that doesn't need sign-in serves normally, and the UI renders signed out. The sign-in page still shows both buttons; clicking an unconfigured one shows a 404 JSON response with code `not_found` and the message `OAuth provider 'github' is not configured` (or `'google'`).
- **Signing out**: open the account menu in the header and choose **Sign out**. It calls `POST /api/auth/logout`, which gives the browser a new, signed-out identity.
- **Resetting identity**: clearing the cookie is enough, no API restart needed; see [Resetting local learner identity](#resetting-local-learner-identity). Your account stays in the database, and signing in again with the same provider reattaches it. To remove accounts too, drop the local database with `docker compose down -v` and run `./scripts/dev-setup.sh` again. This deletes all local data.

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
