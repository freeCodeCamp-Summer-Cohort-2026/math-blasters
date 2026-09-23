from types import SimpleNamespace

import pytest
from fastapi import APIRouter
from sqlalchemy import func, select

from app.learner import LEARNER_COOKIE_NAME, LearnerDep
from app.models import Learner


def learner_count(session):
    return session.scalar(select(func.count()).select_from(Learner))


@pytest.fixture
def learner_client(client, monkeypatch):
    monkeypatch.setattr(
        "app.learner.get_settings",
        lambda: SimpleNamespace(cookie_secure=False),
    )

    router = APIRouter()

    @router.get("/api/test-learner")
    def test_learner(learner: LearnerDep):
        return {"id": learner.id}

    client.app.include_router(router)
    return client


def test_first_request_creates_one_learner(learner_client, session):
    assert learner_count(session) == 0

    response = learner_client.get("/api/test-learner")

    assert response.status_code == 200
    assert learner_count(session) == 1

    cookie = response.cookies.get(LEARNER_COOKIE_NAME)
    assert cookie

    set_cookie = response.headers["set-cookie"]
    assert "HttpOnly" in set_cookie
    assert "SameSite=lax" in set_cookie


def test_second_request_reuses_learner(learner_client, session):
    first_response = learner_client.get("/api/test-learner")
    first_token = first_response.cookies.get(LEARNER_COOKIE_NAME)

    assert first_token
    assert learner_count(session) == 1

    second_response = learner_client.get("/api/test-learner")

    assert second_response.status_code == 200
    assert learner_count(session) == 1

    learner = session.scalar(select(Learner).where(Learner.token == first_token))
    assert learner is not None


def test_unknown_token_creates_fresh_learner(learner_client, session):
    first_response = learner_client.get("/api/test-learner")
    first_token = first_response.cookies.get(LEARNER_COOKIE_NAME)

    assert first_token
    assert learner_count(session) == 1

    learner_client.cookies.set(LEARNER_COOKIE_NAME, "not-a-real-token")
    second_response = learner_client.get("/api/test-learner")

    assert second_response.status_code == 200
    assert learner_count(session) == 2

    replacement_token = second_response.cookies.get(LEARNER_COOKIE_NAME)
    assert replacement_token
    assert replacement_token != "not-a-real-token"
    assert replacement_token != first_token


def test_malformed_token_creates_fresh_learner(learner_client, session):
    # A NUL byte fails in the driver, so this passes only while the pattern guards it.
    response = learner_client.get(
        "/api/test-learner",
        headers={"Cookie": f'{LEARNER_COOKIE_NAME}="\000abc"'},
    )

    assert response.status_code == 200
    assert learner_count(session) == 1
    assert response.cookies.get(LEARNER_COOKIE_NAME)


def test_health_does_not_create_learner(client, session):
    response = client.get("/api/health")

    assert response.status_code == 200
    assert learner_count(session) == 0


def test_secure_cookie_setting_is_applied(learner_client, monkeypatch):
    monkeypatch.setattr(
        "app.learner.get_settings",
        lambda: SimpleNamespace(cookie_secure=True),
    )

    response = learner_client.get("/api/test-learner")

    assert "Secure" in response.headers["set-cookie"]
