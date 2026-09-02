"""The demo problem endpoint.

**Placeholder.** This exists so a contributor can confirm their setup works:
the request goes to Postgres and the answer is checked on the server. It is
not the shape the real API should take -- see issues #19, #20 and #21 for the
content model, and #12 for what the feedback should actually look like.
"""

from fastapi import APIRouter, HTTPException
from sqlalchemy import select

from app.db import SessionDep
from app.models import DemoProblem
from app.schemas import CheckRequest, CheckResponse, DemoProblemOut

router = APIRouter(prefix="/demo", tags=["demo"])

DEMO_SLUG = "addition-demo"


def _load(session: SessionDep) -> DemoProblem:
    problem = session.scalars(select(DemoProblem).where(DemoProblem.slug == DEMO_SLUG)).first()
    if problem is None:
        raise HTTPException(
            status_code=404,
            detail="No demo problem found. Run: docker compose exec api python -m app.seed",
        )
    return problem


@router.get("/problem", response_model=DemoProblemOut)
def get_problem(session: SessionDep) -> DemoProblem:
    return _load(session)


@router.post("/check", response_model=CheckResponse)
def check_answer(payload: CheckRequest, session: SessionDep) -> CheckResponse:
    """Grade on the server so the answer never reaches the browser."""
    problem = _load(session)
    return CheckResponse(correct=payload.answer == problem.answer)
