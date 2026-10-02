from fastapi import Request
from fastapi.testclient import TestClient

from app.main import create_app


def test_rate_limit_exceeded_envelope():
    app = create_app()
    limiter = app.state.limiter

    @app.get("/api/test-throwaway-rate-limit")
    @limiter.limit("1/minute")
    def throwaway_route(request: Request):
        return {"status": "ok"}

    with TestClient(app) as client:
        # First request succeeds
        res1 = client.get("/api/test-throwaway-rate-limit")
        assert res1.status_code == 200

        # Second request hits the rate limit
        res2 = client.get("/api/test-throwaway-rate-limit")
        assert res2.status_code == 429
        assert res2.json() == {
            "error": {
                "code": "rate_limited",
                "message": "Too many attempts in a row. Wait a minute and try again.",
                "details": None,
            }
        }
