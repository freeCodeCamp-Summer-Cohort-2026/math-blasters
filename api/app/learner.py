import re
import secrets
from typing import Annotated

from fastapi import Depends, Request, Response
from sqlalchemy import select

from app.config import get_settings
from app.db import SessionDep
from app.models import Learner

LEARNER_COOKIE_NAME = "learner_token"
LEARNER_TOKEN_BYTES = 32
# Junk cookies never reach the database, so they get a fresh identity.
LEARNER_TOKEN_PATTERN = re.compile(r"^[A-Za-z0-9_-]{43}$")


def get_current_learner(request: Request, response: Response, session: SessionDep) -> Learner:
    token = request.cookies.get(LEARNER_COOKIE_NAME)

    if token and LEARNER_TOKEN_PATTERN.fullmatch(token):
        learner = session.scalar(select(Learner).where(Learner.token == token))
        if learner is not None:
            return learner

    learner = Learner(token=secrets.token_urlsafe(LEARNER_TOKEN_BYTES))
    session.add(learner)
    session.commit()
    session.refresh(learner)

    response.set_cookie(
        key=LEARNER_COOKIE_NAME,
        value=learner.token,
        httponly=True,
        secure=get_settings().cookie_secure,
        samesite="lax",
        path="/",
    )
    return learner


LearnerDep = Annotated[Learner, Depends(get_current_learner)]
