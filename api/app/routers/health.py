"""Liveness probe, also used by docker-compose and CI to wait for the API."""

from fastapi import APIRouter, HTTPException
from sqlalchemy import text
from sqlalchemy.exc import OperationalError

from app.db import SessionDep

router = APIRouter(tags=["health"])


@router.get("/health")
def health(session: SessionDep) -> dict[str, str]:
    """Health check endpoint, returns 200 if the API is healthy and can connect to the database.
    Returns 503 if the API is unhealthy or cannot connect to the database.
    """
    try:
        session.execute(text("SELECT 1"))
    except OperationalError as exc:
        raise HTTPException(
            status_code=503,
            detail="Database Unavailable",
        ) from exc

    return {"status": "ok", "database": "ok"}
