#!/bin/sh
set -eu

# Always run from repository root
script_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
repo_root=$(CDPATH= cd -- "$script_dir/.." && pwd)
cd "$repo_root"

API_URL="${API_URL:-http://localhost:8000}"
API_HEALTH_URL="${API_URL}/api/health"

# Teardown trap for local developer runs (in CI, workflow handles logs on failure and teardown separately)
if [ "${CI:-}" != "true" ]; then
    cleanup() {
        echo "Tearing down Docker Compose services..."
        docker compose down -v >/dev/null 2>&1 || true
    }
    trap cleanup EXIT
fi

echo "=========================================================="
echo "Phase 1: Build compose stack from scratch and launch db & api"
echo "=========================================================="
docker compose up -d --build db api

echo "=========================================================="
echo "Phase 2: Wait for /api/health and verify Alembic migrations"
echo "=========================================================="
echo "Waiting for $API_HEALTH_URL ..."
attempt=0
max_attempts=60
while ! curl --fail --silent --show-error --connect-timeout 2 --max-time 2 "$API_HEALTH_URL" >/dev/null 2>&1; do
    if [ "$attempt" -ge "$max_attempts" ]; then
        echo "ERROR: Timed out waiting for API health endpoint." >&2
        docker compose ps >&2
        exit 1
    fi
    attempt=$((attempt + 1))
    sleep 1
done
echo "API is healthy!"

echo "Verifying Alembic migrations on running container..."
docker compose exec -T api alembic current

echo "=========================================================="
echo "Phase 3: Verify clean clone web build and content bundling"
echo "=========================================================="
(
    cd web
    if [ ! -d node_modules ]; then
        echo "Installing web dependencies..."
        npm ci
    fi
    echo "Running web build..."
    npm run build
)

LESSON_TITLE=$(node -e 'const m = JSON.parse(require("fs").readFileSync("content/manifest.json", "utf8")); console.log(m.modules[0].lessons[0].title);')
echo "Asserting built web bundle contains committed lesson title: '$LESSON_TITLE'..."

if ! grep -rq "$LESSON_TITLE" web/dist/assets; then
    echo "ERROR: Built web bundle in web/dist/assets does not contain lesson title '$LESSON_TITLE'" >&2
    exit 1
fi
echo "Web bundle verified successfully."

echo "=========================================================="
echo "Phase 4: Verify authenticated completion round-trip (#118)"
echo "=========================================================="
LESSON_SLUG=$(node -e 'const m = JSON.parse(require("fs").readFileSync("content/manifest.json", "utf8")); console.log(m.modules[0].lessons[0].slug);')
echo "Selected lesson slug from content/manifest.json: $LESSON_SLUG"

echo "Seeding ephemeral learner in compose database..."
LEARNER_TOKEN=$(docker compose exec -T api python -c '
import secrets
from app.db import SessionLocal
from app.models import Account, Learner

token = secrets.token_urlsafe(32)
with SessionLocal() as session:
    account = Account(email=f"clean-clone-{token[:8]}@example.com")
    learner = Learner(token=token, account=account)
    session.add_all([account, learner])
    session.commit()
print(token)
' | tr -d '\r\n')

if [ -z "$LEARNER_TOKEN" ]; then
    echo "ERROR: Failed to seed ephemeral learner token." >&2
    exit 1
fi

echo "Posting completion to ${API_URL}/api/completions..."
POST_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "${API_URL}/api/completions" \
    -H "Content-Type: application/json" \
    -H "Cookie: learner_token=${LEARNER_TOKEN}" \
    -d "{\"lesson_slug\":\"${LESSON_SLUG}\"}")

if [ "$POST_STATUS" != "201" ]; then
    echo "ERROR: POST /api/completions failed with HTTP status $POST_STATUS (expected 201)" >&2
    exit 1
fi
echo "Completion created successfully (HTTP 201)."

echo "Querying progress from ${API_URL}/api/progress..."
PROGRESS_BODY=$(curl -fsS -X GET "${API_URL}/api/progress" \
    -H "Cookie: learner_token=${LEARNER_TOKEN}")

echo "Progress response: $PROGRESS_BODY"
if ! echo "$PROGRESS_BODY" | grep -q "\"${LESSON_SLUG}\""; then
    echo "ERROR: GET /api/progress did not return slug '${LESSON_SLUG}'" >&2
    exit 1
fi
echo "Completion round-trip verified successfully!"

echo "=========================================================="
echo "All clean clone verifications passed successfully."
echo "=========================================================="
