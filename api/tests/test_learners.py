from sqlalchemy import func, select

from app.learner import LEARNER_COOKIE_NAME
from app.models import Learner


def learner_count(session):
    return session.scalar(select(func.count()).select_from(Learner))


def test_first_request_creates_one_learner(client, session):
    assert learner_count(session) == 0

    response = client.get("/api/health")

    assert response.status_code == 200
    assert learner_count(session) == 1

    cookie = response.cookies.get(LEARNER_COOKIE_NAME)
    assert cookie

    set_cookie = response.headers["set-cookie"]
    assert "HttpOnly" in set_cookie
    assert "SameSite=lax" in set_cookie


def test_second_request_reuses_learner(client, session):
    first_response = client.get("/api/health")
    first_token = first_response.cookies.get(LEARNER_COOKIE_NAME)

    assert first_token
    assert learner_count(session) == 1

    second_response = client.get("/api/health")

    assert second_response.status_code == 200
    assert learner_count(session) == 1

    learner = session.scalar(select(Learner).where(Learner.token == first_token))
    assert learner is not None


def test_unknown_token_creates_fresh_learner(client, session):
    first_response = client.get("/api/health")
    first_token = first_response.cookies.get(LEARNER_COOKIE_NAME)

    assert first_token
    assert learner_count(session) == 1

    client.cookies.set(LEARNER_COOKIE_NAME, "not-a-real-token")
    second_response = client.get("/api/health")

    assert second_response.status_code == 200
    assert learner_count(session) == 2

    replacement_token = second_response.cookies.get(LEARNER_COOKIE_NAME)
    assert replacement_token
    assert replacement_token != "not-a-real-token"
    assert replacement_token != first_token


def test_malformed_token_creates_fresh_learner_without_lookup(client, session):
    response = client.get(
        "/api/health",
        cookies={LEARNER_COOKIE_NAME: "not a valid learner token"},
    )

    assert response.status_code == 200
    assert learner_count(session) == 1
    assert response.cookies.get(LEARNER_COOKIE_NAME)
