import secrets

import pytest
from fastapi import Request
from fastapi.testclient import TestClient

from app.learner import LEARNER_COOKIE_NAME, LEARNER_TOKEN_BYTES, learner_rate_key, limiter
from app.main import create_app


@pytest.fixture(autouse=True)
def reset_limiter():
    """Reset the global rate limiter storage before and after each test."""
    limiter.reset()
    yield
    limiter.reset()


def test_rate_limit_by_learner_cookie():
    app = create_app()
    limiter_instance = app.state.limiter

    @app.get("/api/test-throwaway-learner-key")
    @limiter_instance.limit("1/minute")
    def throwaway_learner_route(request: Request):
        return {"status": "ok"}

    token_1 = secrets.token_urlsafe(LEARNER_TOKEN_BYTES)
    token_2 = secrets.token_urlsafe(LEARNER_TOKEN_BYTES)

    with TestClient(app, client=("192.168.1.10", 1234)) as client:
        # 1. Two separate valid cookies on separate requests both succeed
        res_learner_1 = client.get(
            "/api/test-throwaway-learner-key",
            headers={"Cookie": f"{LEARNER_COOKIE_NAME}={token_1}"},
        )
        assert res_learner_1.status_code == 200

        res_learner_2 = client.get(
            "/api/test-throwaway-learner-key",
            headers={"Cookie": f"{LEARNER_COOKIE_NAME}={token_2}"},
        )
        assert res_learner_2.status_code == 200

        # 2. Second request with the SAME cookie gets rate limited (429)
        res_learner_2_again = client.get(
            "/api/test-throwaway-learner-key",
            headers={"Cookie": f"{LEARNER_COOKIE_NAME}={token_2}"},
        )
        assert res_learner_2_again.status_code == 429


def test_rate_limit_malformed_cookie_falls_back_to_ip():
    app = create_app()
    limiter_instance = app.state.limiter

    @app.get("/api/test-throwaway-malformed-cookie")
    @limiter_instance.limit("1/minute")
    def throwaway_malformed_route(request: Request):
        return {"status": "ok"}

    with TestClient(app, client=("192.168.1.11", 1234)) as client:
        # 1. Invalid cookie format falls back to IP key
        res_bad_1 = client.get(
            "/api/test-throwaway-malformed-cookie",
            headers={"Cookie": f"{LEARNER_COOKIE_NAME}=invalid_short_token"},
        )
        assert res_bad_1.status_code == 200

        # 2. Second request with another malformed token hits 429
        # because both fell back to the same IP key
        res_bad_2 = client.get(
            "/api/test-throwaway-malformed-cookie",
            headers={"Cookie": f"{LEARNER_COOKIE_NAME}=another_bad_token"},
        )
        assert res_bad_2.status_code == 429


def test_rate_limit_no_cookie_falls_back_to_address():
    app = create_app()
    limiter_instance = app.state.limiter

    @app.get("/api/test-throwaway-ip-key")
    @limiter_instance.limit("1/minute")
    def throwaway_ip_route(request: Request):
        return {"key": learner_rate_key(request)}

    with TestClient(app, client=("192.168.1.12", 1234)) as client:
        res_1 = client.get("/api/test-throwaway-ip-key")
        assert res_1.status_code == 200
        assert res_1.json() == {"key": "192.168.1.12"}

        res_2 = client.get("/api/test-throwaway-ip-key")
        assert res_2.status_code == 429
