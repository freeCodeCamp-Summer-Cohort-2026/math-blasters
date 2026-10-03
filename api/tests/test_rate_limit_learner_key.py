import secrets

from fastapi import Request
from fastapi.testclient import TestClient

from app.learner import LEARNER_COOKIE_NAME, LEARNER_TOKEN_BYTES
from app.main import create_app


def test_rate_limit_by_learner_cookie_and_ip_fallback():
    app = create_app()
    limiter = app.state.limiter

    @app.get("/api/test-throwaway-learner-key")
    @limiter.limit("1/minute")
    def throwaway_route(request: Request):
        return {"status": "ok"}

    token_1 = secrets.token_urlsafe(LEARNER_TOKEN_BYTES)
    token_2 = secrets.token_urlsafe(LEARNER_TOKEN_BYTES)

    with TestClient(app) as client:
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

        # 3. Request without cookie falls back to IP address
        app_ip = create_app()
        limiter_ip = app_ip.state.limiter

        @app_ip.get("/api/test-throwaway-ip-key")
        @limiter_ip.limit("1/minute")
        def throwaway_ip_route(request: Request):
            return {"status": "ok"}

        with TestClient(app_ip) as client_ip:
            res_no_cookie_1 = client_ip.get("/api/test-throwaway-ip-key")
            assert res_no_cookie_1.status_code == 200

            res_no_cookie_2 = client_ip.get("/api/test-throwaway-ip-key")
            assert res_no_cookie_2.status_code == 429


def test_rate_limit_malformed_cookie_falls_back_to_ip():
    app = create_app()
    limiter = app.state.limiter

    @app.get("/api/test-throwaway-malformed-cookie")
    @limiter.limit("1/minute")
    def throwaway_route(request: Request):
        return {"status": "ok"}

    with TestClient(app) as client:
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
