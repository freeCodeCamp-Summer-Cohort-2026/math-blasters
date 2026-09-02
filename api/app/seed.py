"""Seed the single demo problem.

Run with `python -m app.seed`, after the schema exists. Idempotent, keyed on
slug. Creating tables is Alembic's job -- this module never touches the schema.

**Placeholder.** When the real content model exists this should load authored
content instead of one hardcoded row -- see issues #19 and #20.
"""

import sys

from sqlalchemy import select
from sqlalchemy.exc import ProgrammingError
from sqlalchemy.orm import Session

from app.db import SessionLocal
from app.models import DemoProblem
from app.routers.demo import DEMO_SLUG

DEMO_PROBLEM = {
    "slug": DEMO_SLUG,
    "prompt": "What is 3 + 4?",
    "expression": "3 + 4 = ?",
    "answer": 7,
}


def seed(session: Session) -> DemoProblem:
    problem = session.scalars(
        select(DemoProblem).where(DemoProblem.slug == DEMO_PROBLEM["slug"])
    ).first()
    if problem is None:
        problem = DemoProblem(slug=DEMO_PROBLEM["slug"])
        session.add(problem)

    problem.prompt = DEMO_PROBLEM["prompt"]
    problem.expression = DEMO_PROBLEM["expression"]
    problem.answer = DEMO_PROBLEM["answer"]

    session.commit()
    return problem


def main() -> int:
    # Schema is Alembic's job, not the seeder's -- run `alembic upgrade head`
    # first. Compose does that automatically before the API starts.
    with SessionLocal() as session:
        try:
            problem = seed(session)
        except ProgrammingError as exc:
            if "does not exist" not in str(exc):
                raise
            print(
                "The database schema is missing. Run migrations first:\n"
                "  alembic upgrade head\n"
                "(docker compose does this automatically when the api starts)",
                file=sys.stderr,
            )
            return 1

    print(f"Seeded demo problem: {problem.slug}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
