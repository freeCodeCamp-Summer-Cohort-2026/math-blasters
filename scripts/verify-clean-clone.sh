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
docker compose up -d --build --wait db api

echo "=========================================================="
echo "Phase 2: Wait for /api/health and verify Alembic migrations"
echo "=========================================================="
echo "Waiting for $API_HEALTH_URL ..."
attempt=0
max_attempts=60
while ! curl --fail --silent --show-error --connect-timeout 2 --max-time 2 "$API_HEALTH_URL" >/dev/null 2>&1; do
    attempt=$((attempt + 1))
    if [ "$attempt" -ge "$max_attempts" ]; then
        echo "ERROR: Timed out waiting for API health endpoint ($max_attempts attempts)." >&2
        docker compose ps >&2
        docker compose logs api >&2
        exit 1
    fi
    if ! docker compose ps --status running -q api | grep -q .; then
        echo "ERROR: API container exited or crashed before becoming healthy." >&2
        docker compose ps >&2
        docker compose logs api >&2
        exit 1
    fi
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

LESSON_TITLE=$(node -e '
    try {
        const m = JSON.parse(require("fs").readFileSync("content/manifest.json", "utf8"));
        const title = m?.modules?.[0]?.lessons?.[0]?.title;
        if (!title || typeof title !== "string" || !title.trim()) {
            console.error("ERROR: No valid lesson title found in content/manifest.json");
            process.exit(1);
        }
        process.stdout.write(title.trim());
    } catch (err) {
        console.error("ERROR: Failed to read content/manifest.json:", err.message);
        process.exit(1);
    }
')

if [ -z "$LESSON_TITLE" ]; then
    echo "ERROR: Extracted lesson title is empty." >&2
    exit 1
fi
echo "Asserting built web bundle contains committed lesson title: '$LESSON_TITLE'..."

if ! grep -r -F -q -- "$LESSON_TITLE" web/dist/assets; then
    echo "ERROR: Built web bundle in web/dist/assets does not contain lesson title '$LESSON_TITLE'" >&2
    exit 1
fi
echo "Web bundle verified successfully."

echo "=========================================================="
echo "Phase 4: Verify authenticated completion round-trip (#118)"
echo "=========================================================="
LESSON_SLUG=$(node -e '
    try {
        const m = JSON.parse(require("fs").readFileSync("content/manifest.json", "utf8"));
        const slug = m?.modules?.[0]?.lessons?.[0]?.slug;
        if (!slug || typeof slug !== "string" || !slug.trim()) {
            console.error("ERROR: No valid lesson slug found in content/manifest.json");
            process.exit(1);
        }
        process.stdout.write(slug.trim());
    } catch (err) {
        console.error("ERROR: Failed to read content/manifest.json:", err.message);
        process.exit(1);
    }
')

if [ -z "$LESSON_SLUG" ]; then
    echo "ERROR: Extracted lesson slug is empty." >&2
    exit 1
fi
echo "Selected lesson slug from content/manifest.json: $LESSON_SLUG"

echo "Seeding ephemeral learner in compose database..."
if ! RAW_TOKEN_OUTPUT=$(docker compose exec -T api python -W ignore -c '
import secrets
from app.db import SessionLocal
from app.models import Account, Learner

token = secrets.token_urlsafe(32)
with SessionLocal() as session:
    account = Account(email=f"clean-clone-{token[:8]}@example.com")
    learner = Learner(token=token, account=account)
    session.add_all([account, learner])
    session.commit()
print(f"TOKEN:{token}")
'); then
    echo "ERROR: Learner seeding script failed." >&2
    echo "Output was: $RAW_TOKEN_OUTPUT" >&2
    exit 1
fi

LEARNER_TOKEN=$(echo "$RAW_TOKEN_OUTPUT" | sed -n 's/^TOKEN://p' | tr -d '\r\n')

case "$LEARNER_TOKEN" in
    *[!A-Za-z0-9_-]*|"")
        echo "ERROR: Failed to capture valid ephemeral learner token." >&2
        echo "Output was: $RAW_TOKEN_OUTPUT" >&2
        exit 1
        ;;
esac

if [ "${#LEARNER_TOKEN}" -ne 43 ]; then
    echo "ERROR: Invalid learner token length (${#LEARNER_TOKEN}, expected 43)." >&2
    echo "Output was: $RAW_TOKEN_OUTPUT" >&2
    exit 1
fi

COMPLETION_PAYLOAD=$(node -e 'console.log(JSON.stringify({ lesson_slug: process.argv[1] }))' "$LESSON_SLUG")

echo "Posting completion to ${API_URL}/api/completions..."
POST_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "${API_URL}/api/completions" \
    -H "Content-Type: application/json" \
    -H "Cookie: learner_token=${LEARNER_TOKEN}" \
    -d "$COMPLETION_PAYLOAD")

if [ "$POST_STATUS" != "201" ]; then
    echo "ERROR: POST /api/completions failed with HTTP status $POST_STATUS (expected 201)" >&2
    exit 1
fi
echo "Completion created successfully (HTTP 201)."

echo "Querying progress from ${API_URL}/api/progress..."
PROGRESS_BODY=$(curl -fsS -X GET "${API_URL}/api/progress" \
    -H "Cookie: learner_token=${LEARNER_TOKEN}")

echo "Progress response: $PROGRESS_BODY"
if ! echo "$PROGRESS_BODY" | node -e '
    const fs = require("fs");
    try {
        const expectedSlug = process.argv[1];
        const raw = fs.readFileSync(0, "utf8");
        const list = JSON.parse(raw);
        if (!Array.isArray(list)) {
            console.error("ERROR: Expected JSON array from /api/progress, received:", typeof list);
            process.exit(1);
        }
        if (!list.includes(expectedSlug)) {
            console.error(`ERROR: Expected slug "${expectedSlug}" not found in progress list:`, list);
            process.exit(1);
        }
    } catch (err) {
        console.error("ERROR: Failed to parse /api/progress response:", err.message);
        process.exit(1);
    }
' "$LESSON_SLUG"; then
    echo "ERROR: GET /api/progress verification failed for slug '${LESSON_SLUG}'." >&2
    exit 1
fi
echo "Completion round-trip verified successfully!"

echo "=========================================================="
echo "All clean clone verifications passed successfully."
echo "=========================================================="
