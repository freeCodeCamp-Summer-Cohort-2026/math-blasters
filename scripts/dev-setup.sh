#!/bin/sh
set -eu

# Always run from the repository root, even when invoked from another directory.
script_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
repo_root=$(CDPATH= cd -- "$script_dir/.." && pwd)
cd "$repo_root"

APP_URL="${APP_URL:-http://localhost:5173}"
API_URL="${API_URL:-http://localhost:8000}"
API_HEALTH_URL="${API_URL}/api/health"
API_DOCS_URL="${API_URL}/docs"

# Create env from env.example if not present already
if [ ! -f .env ]; then
    cp .env.example .env
    echo "Created .env from .env.example"
else
    echo "Using existing .env"
fi

# Start containers with docker compose
echo "Starting Docker Compose services..."
docker compose up --build -d

# Checking API Health
echo "Waiting for $API_HEALTH_URL ..."
attempt=0
while ! docker compose exec -T -e "API_HEALTH_URL=$API_HEALTH_URL" api python -c \
    'import os, urllib.request; urllib.request.urlopen(os.environ["API_HEALTH_URL"], timeout=2)' \
    >/dev/null 2>&1
do
    attempt=$((attempt + 1))
    if [ "$attempt" -ge 60 ]; then
        echo "Timed out waiting for the API health endpoint." >&2
        docker compose ps >&2
        exit 1
    fi
    sleep 1
done

# Seeding demo data
echo "API is healthy. Seeding the demo data..."
docker compose exec -T api python -m app.seed

echo "Setup complete."
echo "App: $APP_URL"
echo "API docs: $API_DOCS_URL"
