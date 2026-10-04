import hashlib
import re
import secrets
from typing import Annotated

from fastapi import Depends, Request, Response
from slowapi.util import get_remote_address
from sqlalchemy import select

from app.config import get_settings
from app.db import SessionDep
from app.models import Account, Learner

LEARNER_COOKIE_NAME = "learner_token"
LEARNER_TOKEN_BYTES = 32
# Junk cookies never reach the database, so they get a fresh identity.
LEARNER_TOKEN_PATTERN = re.compile(r"^[A-Za-z0-9_-]{43}$")


def set_learner_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key=LEARNER_COOKIE_NAME,
        value=token,
        httponly=True,
        secure=get_settings().cookie_secure,
        samesite="lax",
        path="/",
    )


def issue_learner_identity(session: SessionDep, response: Response) -> Learner:
    learner = Learner(token=secrets.token_urlsafe(LEARNER_TOKEN_BYTES))
    session.add(learner)
    session.commit()
    session.refresh(learner)
    set_learner_cookie(response, learner.token)
    return learner


def sign_in_learner(
    session: SessionDep, request: Request, response: Response, account: Account
) -> Learner:
    # A fresh token on sign-in, so a pre-login token can't become a session.
    token = request.cookies.get(LEARNER_COOKIE_NAME)
    learner = None
    if token and LEARNER_TOKEN_PATTERN.fullmatch(token):
        learner = session.scalar(select(Learner).where(Learner.token == token))
    if learner is None:
        learner = Learner()
        session.add(learner)
    learner.token = secrets.token_urlsafe(LEARNER_TOKEN_BYTES)
    learner.account_id = account.id
    session.commit()
    set_learner_cookie(response, learner.token)
    return learner


def get_current_learner(request: Request, response: Response, session: SessionDep) -> Learner:
    token = request.cookies.get(LEARNER_COOKIE_NAME)

    if token and LEARNER_TOKEN_PATTERN.fullmatch(token):
        learner = session.scalar(select(Learner).where(Learner.token == token))
        if learner is not None:
            return learner

    return issue_learner_identity(session, response)


LearnerDep = Annotated[Learner, Depends(get_current_learner)]


def learner_rate_key(request: Request) -> str:
    token = request.cookies.get(LEARNER_COOKIE_NAME)
    if not token or not LEARNER_TOKEN_PATTERN.fullmatch(token):
        return get_remote_address(request)
    return hashlib.sha256(token.encode("utf-8")).hexdigest()
