import re
import secrets
from typing import Annotated

from fastapi import Depends, HTTPException, Request, Response
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError, SQLAlchemyError

from app.config import get_settings
from app.db import SessionDep
from app.models import Learner
from app.schemas import DATABASE_UNAVAILABLE_ERROR

LEARNER_COOKIE_NAME = "learner_token"
LEARNER_TOKEN_BYTES = 32
LEARNER_TOKEN_PATTERN = re.compile(r"^[A-Za-z0-9_-]{43}$")
LEARNER_CREATION_ATTEMPTS = 3


def _database_unavailable(exc: SQLAlchemyError) -> HTTPException:
    return HTTPException(
        status_code=503,
        detail=DATABASE_UNAVAILABLE_ERROR.error.message,
    )


def _rollback(session: SessionDep) -> None:
    rollback = getattr(session, "rollback", None)
    if rollback is not None:
        rollback()


def get_current_learner(request: Request, response: Response, session: SessionDep) -> Learner:
    token = request.cookies.get(LEARNER_COOKIE_NAME)

    try:
        if token and LEARNER_TOKEN_PATTERN.fullmatch(token):
            learner = session.scalar(select(Learner).where(Learner.token == token))
            if learner is not None:
                return learner
    except SQLAlchemyError as exc:
        raise _database_unavailable(exc) from exc

    for _ in range(LEARNER_CREATION_ATTEMPTS):
        learner = Learner(token=secrets.token_urlsafe(LEARNER_TOKEN_BYTES))
        try:
            session.add(learner)
            session.commit()
            session.refresh(learner)
        except IntegrityError:
            _rollback(session)
            continue
        except SQLAlchemyError as exc:
            _rollback(session)
            raise _database_unavailable(exc) from exc

        response.set_cookie(
            key=LEARNER_COOKIE_NAME,
            value=learner.token,
            httponly=True,
            secure=get_settings().cookie_secure,
            samesite="lax",
            path="/",
        )
        return learner

    raise HTTPException(status_code=503, detail="Unable to create learner identity")


LearnerDep = Annotated[Learner, Depends(get_current_learner)]
