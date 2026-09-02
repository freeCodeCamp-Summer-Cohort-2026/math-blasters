"""Database engine and session wiring."""

from collections.abc import Iterator
from typing import Annotated

from fastapi import Depends
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.config import get_settings

engine = create_engine(get_settings().database_url, pool_pre_ping=True, future=True)

SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


def get_session() -> Iterator[Session]:
    """FastAPI dependency yielding a request-scoped session."""
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


# FastAPI's recommended dependency style: `session: SessionDep` in a route
# signature, rather than a `Depends(...)` call sitting in a default argument.
SessionDep = Annotated[Session, Depends(get_session)]
