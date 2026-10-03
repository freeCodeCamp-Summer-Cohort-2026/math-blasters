"""Tests for OAuth account resolution and sign-in identity behavior."""

import secrets
import uuid
from urllib.parse import parse_qs, urlparse

import pytest
from fastapi import APIRouter, Request, Response
from sqlalchemy import func, select

from app.accounts import resolve_account
from app.db import SessionDep
from app.learner import LEARNER_COOKIE_NAME, sign_in_learner
from app.models import Account, Learner, OAuthIdentity
from app.providers import register
from tests.fake_provider import FakeProvider


def row_count(session, model):
    return session.scalar(select(func.count()).select_from(model))


@pytest.fixture
def signed_out_learner(session):
    """Create a learner whose token represents a signed-out identity cookie."""

    def create_learner():
        learner = Learner(token=secrets.token_urlsafe(32))
        session.add(learner)
        session.flush()
        return learner

    return create_learner


@pytest.fixture
def sign_in(client, session):
    """Sign in through a request so the production token rotation runs."""
    router = APIRouter()

    @router.post("/api/test/sign-in")
    def sign_in_route(profile: dict, request: Request, response: Response, db: SessionDep):
        account = resolve_account(db, **profile)
        sign_in_learner(db, request, response, account)
        return {"account_id": str(account.id)}

    client.app.include_router(router)

    def sign_in_as(
        learner: Learner | None,
        *,
        provider: str,
        provider_account_id: str,
        email: str | None,
        email_verified: bool,
    ) -> tuple[Account, str | None, str]:
        previous_token = learner.token if learner is not None else None
        client.cookies.clear()
        if previous_token is not None:
            client.cookies.set(LEARNER_COOKIE_NAME, previous_token)

        response = client.post(
            "/api/test/sign-in",
            json={
                "provider": provider,
                "provider_account_id": provider_account_id,
                "email": email,
                "email_verified": email_verified,
            },
        )
        assert response.status_code == 200
        account = session.get(Account, uuid.UUID(response.json()["account_id"]))

        return account, previous_token, response.cookies[LEARNER_COOKIE_NAME]

    return sign_in_as


@pytest.fixture(autouse=True)
def clean_registry(monkeypatch):
    """Ensure each test runs with a clean provider registry.

    This satisfies the teardown constraint by resetting global tracking states.
    """
    monkeypatch.setattr("app.providers._registry", {})


@pytest.fixture
def fake_provider(clean_registry):
    register(FakeProvider())
    yield


def test_first_sign_in_creates_exactly_one_account_and_identity(
    session, signed_out_learner, sign_in
):
    learner = signed_out_learner()

    sign_in(
        learner,
        provider="github",
        provider_account_id="github-user-1",
        email="ada@example.com",
        email_verified=True,
    )

    assert row_count(session, Account) == 1
    assert row_count(session, OAuthIdentity) == 1


def test_same_provider_id_returns_the_same_account(session):
    first_account = resolve_account(
        session,
        provider="github",
        provider_account_id="github-user-1",
        email="ada@example.com",
        email_verified=True,
    )
    second_account = resolve_account(
        session,
        provider="github",
        provider_account_id="github-user-1",
        email="ada-renamed@example.com",
        email_verified=True,
    )

    assert second_account.id == first_account.id
    assert row_count(session, Account) == 1
    assert row_count(session, OAuthIdentity) == 1


def test_second_provider_with_same_verified_email_attaches_to_account(session):
    first_account = resolve_account(
        session,
        provider="github",
        provider_account_id="github-user-1",
        email="ada@example.com",
        email_verified=True,
    )
    second_account = resolve_account(
        session,
        provider="google",
        provider_account_id="google-user-2",
        email="ada@example.com",
        email_verified=True,
    )

    assert second_account.id == first_account.id
    assert row_count(session, Account) == 1
    assert row_count(session, OAuthIdentity) == 2


def test_same_email_unverified_creates_a_separate_account(session):
    verified_account = resolve_account(
        session,
        provider="github",
        provider_account_id="github-user-1",
        email="ada@example.com",
        email_verified=True,
    )
    unverified_account = resolve_account(
        session,
        provider="google",
        provider_account_id="google-user-2",
        email="ada@example.com",
        email_verified=False,
    )

    assert unverified_account.id != verified_account.id
    assert row_count(session, Account) == 2
    assert row_count(session, OAuthIdentity) == 2


def test_two_signed_out_cookies_for_same_provider_identity_do_not_duplicate_account(
    session, signed_out_learner, sign_in
):
    first_learner = signed_out_learner()
    second_learner = signed_out_learner()
    assert first_learner.token != second_learner.token

    first_account, first_old_token, first_new_token = sign_in(
        first_learner,
        provider="github",
        provider_account_id="github-user-1",
        email="ada@example.com",
        email_verified=True,
    )
    second_account, second_old_token, second_new_token = sign_in(
        second_learner,
        provider="github",
        provider_account_id="github-user-1",
        email="ada@example.com",
        email_verified=True,
    )

    assert first_account.id == second_account.id
    assert first_new_token != first_old_token
    assert second_new_token != second_old_token
    assert row_count(session, Account) == 1
    assert row_count(session, OAuthIdentity) == 1


def test_unverified_account_does_not_capture_a_verified_sign_in(session):
    squatted_account = resolve_account(
        session,
        provider="sloppy",
        provider_account_id="sloppy-user-1",
        email="ada@example.com",
        email_verified=False,
    )
    verified_account = resolve_account(
        session,
        provider="google",
        provider_account_id="google-user-2",
        email="ada@example.com",
        email_verified=True,
    )

    assert verified_account.id != squatted_account.id
    assert row_count(session, Account) == 2


def test_verified_email_joins_the_verified_account_not_an_unverified_one(session):
    session.add(Account(email="ada@example.com", email_verified=False))
    session.flush()
    first_account = resolve_account(
        session,
        provider="github",
        provider_account_id="github-user-1",
        email="ada@example.com",
        email_verified=True,
    )
    second_account = resolve_account(
        session,
        provider="google",
        provider_account_id="google-user-2",
        email="ada@example.com",
        email_verified=True,
    )

    assert second_account.id == first_account.id
    assert second_account.email_verified is True


def test_profile_without_email_creates_an_account(session):
    account = resolve_account(
        session,
        provider="github",
        provider_account_id="github-user-1",
        email=None,
        email_verified=False,
    )

    assert account.email is None
    assert row_count(session, Account) == 1
    assert row_count(session, OAuthIdentity) == 1


def test_sign_in_without_a_cookie_issues_a_signed_in_identity(session, sign_in):
    account, previous_token, new_token = sign_in(
        None,
        provider="github",
        provider_account_id="github-user-1",
        email="ada@example.com",
        email_verified=True,
    )

    assert previous_token is None
    learner = session.scalar(select(Learner).where(Learner.token == new_token))
    assert learner is not None
    assert learner.account_id == account.id


def test_sign_in_rotates_token_and_old_token_no_longer_resolves(
    client, session, signed_out_learner, sign_in
):
    learner = signed_out_learner()
    old_token = learner.token

    account, previous_token, new_token = sign_in(
        learner,
        provider="github",
        provider_account_id="github-user-1",
        email="ada@example.com",
        email_verified=True,
    )

    assert previous_token == old_token
    assert new_token != old_token
    assert session.scalar(select(Learner).where(Learner.token == old_token)) is None

    signed_in_learner = session.scalar(select(Learner).where(Learner.token == new_token))
    assert signed_in_learner is not None
    assert signed_in_learner.account_id == account.id

    # Clear the jar each time, or the response's cookie is sent alongside the set one.
    client.cookies.clear()
    client.cookies.set(LEARNER_COOKIE_NAME, new_token)
    assert client.get("/api/auth/me").json()["email"] == "ada@example.com"
    client.cookies.clear()
    client.cookies.set(LEARNER_COOKIE_NAME, old_token)
    assert client.get("/api/auth/me").json() is None


def test_sign_in_and_out(client, fake_provider):
    assert client.get("/api/auth/me").json() is None
    old_cookie = client.cookies.get(LEARNER_COOKIE_NAME)

    r = client.get("/api/auth/fake/start", follow_redirects=False)
    state = parse_qs(urlparse(r.headers["location"]).query)["state"][0]

    r = client.get(
        "/api/auth/fake/callback",
        params={"code": "any", "state": state},
        follow_redirects=False,
    )
    assert r.status_code == 307
    assert "error" not in r.headers["location"]

    me = client.get("/api/auth/me").json()
    assert me["email"] == "user@example.com"
    assert me["display_name"] == "Fake User"
    assert me["providers"] == ["fake"]
    assert client.cookies.get(LEARNER_COOKIE_NAME) != old_cookie

    assert client.post("/api/auth/logout").status_code == 204
    assert client.get("/api/auth/me").json() is None
