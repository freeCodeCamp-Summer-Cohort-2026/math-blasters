"""Liveness probe, also used by docker-compose and CI to wait for the API."""

from fastapi import APIRouter
from sqlalchemy import text

from app.db import SessionDep

router = APIRouter(tags=["health"])


@router.get("/health")
def health(session: SessionDep) -> dict[str, str]:
    session.execute(text("SELECT 1"))
    return {"status": "ok", "database": "ok"}
