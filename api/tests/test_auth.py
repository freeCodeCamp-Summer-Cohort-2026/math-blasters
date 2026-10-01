import time
from urllib.parse import parse_qs, urlsplit

import httpx2
import pytest
from fastapi.testclient import TestClient

from app.config import get_settings
from app.main import create_app
from app.providers import ProviderProfile, register
from app.routers.auth import (
    on_profile,
    sign_state_cookie,
    verify_state_cookie,
)
from tests.fake_provider import FakeProvider


class ExchangeTrackingFake(FakeProvider):
    def __init__(self, name="fake"):
        super().__init__(name=name)
        self.exchange_called = False

    def exchange_code(self, code, code_verifier):
        self.exchange_called = True
        return super().exchange_code(code, code_verifier)


@pytest.fixture(autouse=True)
def clean_registry(monkeypatch):
    """Ensure each test runs with a clean provider registry."""
    monkeypatch.setattr("app.providers._registry", {})


@pytest.fixture
def client():
    app = create_app()
    return TestClient(app)


def test_start_unknown_provider_returns_404(client):
    response = client.get("/api/auth/nonexistent/start")
    assert response.status_code == 404
    data = response.json()
    assert data["error"]["code"] == "not_found"
    error_msg = data["error"]["message"].lower()
    assert "not configured" in error_msg or "not found" in error_msg


def test_start_flow_redirects_to_authorize_url_and_sets_cookie(client):
    fake = FakeProvider(name="fake")
    register(fake)

    response = client.get("/api/auth/fake/start", follow_redirects=False)
    assert response.status_code == 307

    location = response.headers.get("location")
    assert location is not None
    assert location.startswith("https://auth.example.com/fake/authorize")

    params = parse_qs(urlsplit(location).query)
    assert "state" in params and len(params["state"][0]) > 0
    assert "code_challenge" in params and len(params["code_challenge"][0]) > 0

    # Cookie checks
    cookie_header = response.headers.get("set-cookie")
    assert cookie_header is not None
    assert "oauth_flow=" in cookie_header
    assert "httponly" in cookie_header.lower()
    assert "samesite=lax" in cookie_header.lower()


def test_start_rejects_disallowed_redirect_target_with_400_validation_error(client):
    fake = FakeProvider(name="fake")
    register(fake)

    # External malicious domain
    resp_ext = client.get("/api/auth/fake/start?next=https://evil.example/phish")
    assert resp_ext.status_code == 400
    data_ext = resp_ext.json()
    assert data_ext["error"]["code"] == "validation_error"
    assert "not allowed" in data_ext["error"]["message"]

    # Protocol-relative URL
    resp_rel = client.get("/api/auth/fake/start?next=//attacker.example/phish")
    assert resp_rel.status_code == 400
    data_rel = resp_rel.json()
    assert data_rel["error"]["code"] == "validation_error"
    assert "not allowed" in data_rel["error"]["message"]

    # Protocol-relative URL with backslash bypass
    resp_bs = client.get(r"/api/auth/fake/start?next=/\attacker.example/phish")
    assert resp_bs.status_code == 400
    data_bs = resp_bs.json()
    assert data_bs["error"]["code"] == "validation_error"
    assert "not allowed" in data_bs["error"]["message"]

    # Userinfo in netloc
    resp_user = client.get("/api/auth/fake/start?next=http://user@localhost:5173")
    assert resp_user.status_code == 400
    data_user = resp_user.json()
    assert data_user["error"]["code"] == "validation_error"
    assert "not allowed" in data_user["error"]["message"]

    resp_user2 = client.get("/api/auth/fake/start?next=http://localhost:5173@evil.example.com")
    assert resp_user2.status_code == 400
    data_user2 = resp_user2.json()
    assert data_user2["error"]["code"] == "validation_error"
    assert "not allowed" in data_user2["error"]["message"]


def test_start_accepts_allowed_redirect_target(client):
    fake = FakeProvider(name="fake")
    register(fake)

    response = client.get("/api/auth/fake/start?next=/dashboard", follow_redirects=False)
    assert response.status_code == 307

    cookie_val = response.cookies.get("oauth_flow")
    assert cookie_val is not None
    payload = verify_state_cookie(cookie_val, get_settings().auth_secret_key)
    assert payload is not None
    assert payload["next"] == "http://localhost:5173/dashboard"


def test_start_cookie_contains_expected_payload_and_valid_signature(client):
    fake = FakeProvider(name="fake")
    register(fake)

    response = client.get("/api/auth/fake/start", follow_redirects=False)
    cookie_val = response.cookies.get("oauth_flow")
    assert cookie_val is not None

    payload = verify_state_cookie(cookie_val, get_settings().auth_secret_key)
    assert payload is not None
    assert payload["provider"] == "fake"
    assert "state" in payload and len(payload["state"]) > 16
    assert "verifier" in payload and len(payload["verifier"]) > 32
    assert "next" in payload
    assert verify_state_cookie(cookie_val, get_settings().auth_secret_key, max_age=-1) is None


def test_start_respects_path_prefix_on_allowed_origin(client, monkeypatch):
    monkeypatch.setattr(
        get_settings(),
        "allowed_post_login_redirects",
        "https://app.example.com/app,/",
    )
    fake = FakeProvider(name="fake")
    register(fake)

    # Allowed path prefix
    resp_ok = client.get(
        "/api/auth/fake/start?next=https://app.example.com/app/dashboard",
        follow_redirects=False,
    )
    assert resp_ok.status_code == 307

    # Disallowed path outside prefix on same origin
    resp_fail = client.get(
        "/api/auth/fake/start?next=https://app.example.com/other",
        follow_redirects=False,
    )
    assert resp_fail.status_code == 400
    assert resp_fail.json()["error"]["code"] == "validation_error"

    # Disallowed sibling path prefix (must not match without path boundary)
    resp_sibling = client.get(
        "/api/auth/fake/start?next=https://app.example.com/application",
        follow_redirects=False,
    )
    assert resp_sibling.status_code == 400
    assert resp_sibling.json()["error"]["code"] == "validation_error"

    # Dot segments, plain or percent-encoded, must not climb out of the prefix
    for escape in ("/app/../admin", "/app/%2e%2e/admin", "/app/..%2fadmin"):
        resp_escape = client.get(
            "/api/auth/fake/start",
            params={"next": f"https://app.example.com{escape}"},
            follow_redirects=False,
        )
        assert resp_escape.status_code == 400
        assert resp_escape.json()["error"]["code"] == "validation_error"


def test_start_never_leaks_secrets(client, monkeypatch):
    fake = FakeProvider(name="fake")
    register(fake)

    secret = "secret-super-confidential-token-12345"
    monkeypatch.setattr(get_settings(), "auth_secret_key", secret)

    response = client.get("/api/auth/fake/start", follow_redirects=False)
    assert secret not in response.headers.get("location", "")
    assert secret not in response.headers.get("set-cookie", "")
    assert secret not in response.text


def test_callback_unknown_provider_returns_404(client):
    response = client.get("/api/auth/nonexistent/callback?code=foo&state=bar")
    assert response.status_code == 404
    data = response.json()
    assert data["error"]["code"] == "not_found"


def test_callback_missing_cookie_returns_400_validation_error(client):
    fake = FakeProvider(name="fake")
    register(fake)

    response = client.get("/api/auth/fake/callback?code=test-code&state=test-state")
    assert response.status_code == 400
    data = response.json()
    assert data["error"]["code"] == "validation_error"


def test_callback_tampered_state_cookie_returns_400_validation_error(client):
    fake = FakeProvider(name="fake")
    register(fake)

    start_resp = client.get("/api/auth/fake/start?next=/dashboard", follow_redirects=False)
    state = parse_qs(urlsplit(start_resp.headers["location"]).query)["state"][0]
    cookie_val = start_resp.cookies.get("oauth_flow")

    payload_b64, _ = cookie_val.split(".", 1)
    tampered_cookie = f"{payload_b64}.bad-hmac-signature-1234567890abcdef"

    client.cookies.set("oauth_flow", tampered_cookie, path="/api/auth")
    response = client.get(
        f"/api/auth/fake/callback?code=good-code&state={state}",
        follow_redirects=False,
    )
    assert response.status_code == 400
    data = response.json()
    assert data["error"]["code"] == "validation_error"
    assert "Missing, invalid, or expired" in data["error"]["message"]

    cookie_header = response.headers.get("set-cookie")
    assert cookie_header is not None
    assert 'oauth_flow=""' in cookie_header or "oauth_flow=;" in cookie_header


def test_callback_non_ascii_cookie_returns_400_validation_error(client):
    fake = FakeProvider(name="fake")
    register(fake)

    headers = httpx2.Headers({"cookie": "oauth_flow=ümlaut_cookie_val_ñ"}, encoding="latin-1")
    response = client.get(
        "/api/auth/fake/callback?code=good-code&state=test-state",
        headers=headers,
        follow_redirects=False,
    )
    assert response.status_code == 400
    data = response.json()
    assert data["error"]["code"] == "validation_error"
    assert "Missing, invalid, or expired" in data["error"]["message"]

    cookie_header = response.headers.get("set-cookie")
    assert cookie_header is not None
    assert 'oauth_flow=""' in cookie_header or "oauth_flow=;" in cookie_header

    # Also verify directly that undecodable non-ascii cookie returns None
    assert verify_state_cookie("ümlaut_cookie_val_ñ_🚀", get_settings().auth_secret_key) is None


def test_callback_non_ascii_state_returns_400_validation_error(client):
    fake = FakeProvider(name="fake")
    register(fake)

    start_resp = client.get("/api/auth/fake/start?next=/dashboard", follow_redirects=False)
    cookie_val = start_resp.cookies.get("oauth_flow")

    client.cookies.set("oauth_flow", cookie_val, path="/api/auth")
    response = client.get(
        "/api/auth/fake/callback?code=good-code&state=ümlaut_state_ñ_🚀",
        follow_redirects=False,
    )
    assert response.status_code == 400
    data = response.json()
    assert data["error"]["code"] == "validation_error"
    assert "state" in data["error"]["message"].lower()

    cookie_header = response.headers.get("set-cookie")
    assert cookie_header is not None
    assert 'oauth_flow=""' in cookie_header or "oauth_flow=;" in cookie_header


def test_callback_expired_state_cookie_returns_400_validation_error(client, monkeypatch):
    fake = FakeProvider(name="fake")
    register(fake)

    settings = get_settings()
    cookie_payload = {
        "state": "expired-state",
        "verifier": "test-verifier-string-1234567890",
        "provider": "fake",
        "next": "/dashboard",
    }
    real_time = time.time()
    expired_cookie = sign_state_cookie(cookie_payload, settings.auth_secret_key)
    # Advance time past max_age (600s) so the cookie is expired when callback verifies it
    monkeypatch.setattr(time, "time", lambda: real_time + 1000)

    client.cookies.set("oauth_flow", expired_cookie, path="/api/auth")
    response = client.get(
        "/api/auth/fake/callback?code=good-code&state=expired-state",
        follow_redirects=False,
    )
    assert response.status_code == 400
    data = response.json()
    assert data["error"]["code"] == "validation_error"
    assert "Missing, invalid, or expired" in data["error"]["message"]

    cookie_header = response.headers.get("set-cookie")
    assert cookie_header is not None
    assert 'oauth_flow=""' in cookie_header or "oauth_flow=;" in cookie_header


def test_callback_happy_path_exchanges_code_calls_hook_and_redirects(client, monkeypatch):
    fake = FakeProvider(name="fake")
    register(fake)

    captured_profiles: list[ProviderProfile] = []
    monkeypatch.setattr("app.routers.auth.on_profile", lambda p: captured_profiles.append(p))

    # 1. Start flow to get cookie and state
    start_resp = client.get("/api/auth/fake/start?next=/dashboard", follow_redirects=False)
    assert start_resp.status_code == 307
    location = start_resp.headers["location"]
    params = parse_qs(urlsplit(location).query)
    state = params["state"][0]
    cookie_val = start_resp.cookies.get("oauth_flow")

    # 2. Callback with valid code and state
    client.cookies.set("oauth_flow", cookie_val, path="/api/auth")
    callback_resp = client.get(
        f"/api/auth/fake/callback?code=test-auth-code&state={state}",
        follow_redirects=False,
    )

    assert callback_resp.status_code == 307
    assert callback_resp.headers["location"] == "http://localhost:5173/dashboard"

    # State cookie should be cleared
    cookie_header = callback_resp.headers.get("set-cookie")
    assert cookie_header is not None
    assert 'oauth_flow=""' in cookie_header or "oauth_flow=;" in cookie_header

    # Profile hook should have been called
    assert len(captured_profiles) == 1
    profile = captured_profiles[0]
    assert profile.provider == "fake"
    assert profile.provider_account_id == "fake-user-123"
    assert profile.email == "user@example.com"


def test_callback_mismatched_state_returns_400_validation_error(client):
    fake = ExchangeTrackingFake()
    register(fake)

    start_resp = client.get("/api/auth/fake/start", follow_redirects=False)
    cookie_val = start_resp.cookies.get("oauth_flow")

    client.cookies.set("oauth_flow", cookie_val, path="/api/auth")
    callback_resp = client.get(
        "/api/auth/fake/callback?code=test-code&state=tampered-state",
        follow_redirects=False,
    )

    assert callback_resp.status_code == 400
    data = callback_resp.json()
    assert data["error"]["code"] == "validation_error"
    assert "state" in data["error"]["message"].lower()

    # Cookie must be cleared upon validation failure
    cookie_header = callback_resp.headers.get("set-cookie")
    assert cookie_header is not None
    assert 'oauth_flow=""' in cookie_header or "oauth_flow=;" in cookie_header

    # Code exchange must NOT be called on state mismatch!
    assert fake.exchange_called is False


def test_callback_missing_state_returns_400_validation_error(client):
    fake = ExchangeTrackingFake()
    register(fake)

    start_resp = client.get("/api/auth/fake/start", follow_redirects=False)
    cookie_val = start_resp.cookies.get("oauth_flow")

    client.cookies.set("oauth_flow", cookie_val, path="/api/auth")
    callback_resp = client.get(
        "/api/auth/fake/callback?code=test-code",
        follow_redirects=False,
    )

    assert callback_resp.status_code == 400
    data = callback_resp.json()
    assert data["error"]["code"] == "validation_error"

    # Cookie must be cleared upon validation failure
    cookie_header = callback_resp.headers.get("set-cookie")
    assert cookie_header is not None
    assert 'oauth_flow=""' in cookie_header or "oauth_flow=;" in cookie_header

    # Code exchange must NOT be called!
    assert fake.exchange_called is False


def test_callback_provider_mismatch_returns_400_validation_error(client):
    fake = FakeProvider(name="fake")
    other = FakeProvider(name="other")
    register(fake)
    register(other)

    start_resp = client.get("/api/auth/fake/start", follow_redirects=False)
    location = start_resp.headers["location"]
    state = parse_qs(urlsplit(location).query)["state"][0]
    cookie_val = start_resp.cookies.get("oauth_flow")

    # Attempt to send the "fake" cookie to "other" callback
    client.cookies.set("oauth_flow", cookie_val, path="/api/auth")
    callback_resp = client.get(
        f"/api/auth/other/callback?code=test-code&state={state}",
        follow_redirects=False,
    )

    assert callback_resp.status_code == 400
    data = callback_resp.json()
    assert data["error"]["code"] == "validation_error"
    assert "mismatch" in data["error"]["message"].lower()


def test_callback_provider_access_denied_redirects_and_clears_cookie(client):
    fake = ExchangeTrackingFake()
    register(fake)

    start_resp = client.get("/api/auth/fake/start?next=/dashboard", follow_redirects=False)
    location = start_resp.headers["location"]
    state = parse_qs(urlsplit(location).query)["state"][0]
    cookie_val = start_resp.cookies.get("oauth_flow")

    client.cookies.set("oauth_flow", cookie_val, path="/api/auth")
    callback_resp = client.get(
        f"/api/auth/fake/callback?error=access_denied&error_description=User+declined&state={state}",
        follow_redirects=False,
    )

    assert callback_resp.status_code == 307
    redirect_loc = callback_resp.headers["location"]
    assert "/dashboard" in redirect_loc
    assert "error=access_denied" in redirect_loc
    assert "error_description=" in redirect_loc
    assert "User" in redirect_loc and "declined" in redirect_loc

    # State cookie should be cleared with proper security flags
    cookie_header = callback_resp.headers.get("set-cookie")
    assert cookie_header is not None
    assert 'oauth_flow=""' in cookie_header or "oauth_flow=;" in cookie_header
    assert "httponly" in cookie_header.lower()
    assert "samesite=lax" in cookie_header.lower()

    # Code exchange must NOT be attempted when access was denied
    assert fake.exchange_called is False


def test_callback_fallback_redirect_respects_settings_allowlist(client, monkeypatch):
    monkeypatch.setattr(
        get_settings(),
        "allowed_post_login_redirects",
        "https://prod.mathblasters.org,/",
    )
    fake = FakeProvider(name="fake")
    register(fake)

    cookie_payload = {
        "state": "state-xyz",
        "verifier": "verifier-xyz",
        "provider": "fake",
        "next": None,
    }
    cookie_val = sign_state_cookie(cookie_payload, get_settings().auth_secret_key)
    client.cookies.set("oauth_flow", cookie_val, path="/api/auth")

    resp = client.get(
        "/api/auth/fake/callback?code=good-code&state=state-xyz",
        follow_redirects=False,
    )
    assert resp.status_code == 307
    assert resp.headers["location"] == "https://prod.mathblasters.org"


def test_callback_provider_error_query_param_sanitization_prevents_open_redirect(client):
    fake = FakeProvider(name="fake")
    register(fake)

    start_resp = client.get("/api/auth/fake/start?next=/dashboard", follow_redirects=False)
    state = parse_qs(urlsplit(start_resp.headers["location"]).query)["state"][0]
    cookie_val = start_resp.cookies.get("oauth_flow")

    client.cookies.set("oauth_flow", cookie_val, path="/api/auth")
    # Attempting to inject a protocol/URL in error param
    callback_resp = client.get(
        f"/api/auth/fake/callback?error=https://evil.com&error_description=Injected%0d%0aHeader:evil&state={state}",
        follow_redirects=False,
    )

    assert callback_resp.status_code == 307
    redirect_loc = callback_resp.headers["location"]
    assert redirect_loc.startswith("http://localhost:5173/dashboard")
    assert "error=provider_error" in redirect_loc
    assert "https://evil.com" not in redirect_loc
    assert "\r" not in redirect_loc and "\n" not in redirect_loc


def test_callback_cookie_target_revalidated_against_allowlist(client, monkeypatch):
    fake = FakeProvider(name="fake")
    register(fake)

    # Cookie was signed with a target that is no longer in allowed_post_login_redirects
    cookie_payload = {
        "state": "state-xyz",
        "verifier": "verifier-xyz",
        "provider": "fake",
        "next": "https://previously-allowed-domain.org/dashboard",
    }
    cookie_val = sign_state_cookie(cookie_payload, get_settings().auth_secret_key)
    client.cookies.set("oauth_flow", cookie_val, path="/api/auth")

    # Current settings allow only localhost:5173
    monkeypatch.setattr(get_settings(), "allowed_post_login_redirects", "http://localhost:5173")

    resp = client.get(
        "/api/auth/fake/callback?code=good-code&state=state-xyz",
        follow_redirects=False,
    )
    assert resp.status_code == 307
    # Must fallback to default target instead of the disallowed target in the cookie
    assert resp.headers["location"] == "http://localhost:5173"


def test_callback_token_exchange_failure_redirects_and_clears_cookie(client):
    class FailingExchangeFake(FakeProvider):
        def __init__(self):
            super().__init__(name="fake")

        def exchange_code(self, code, code_verifier):
            raise httpx2.HTTPError("Secret internal database or provider error")

    fake = FailingExchangeFake()
    register(fake)

    start_resp = client.get("/api/auth/fake/start?next=/dashboard", follow_redirects=False)
    location = start_resp.headers["location"]
    state = parse_qs(urlsplit(location).query)["state"][0]
    cookie_val = start_resp.cookies.get("oauth_flow")

    client.cookies.set("oauth_flow", cookie_val, path="/api/auth")
    callback_resp = client.get(
        f"/api/auth/fake/callback?code=bad-code&state={state}",
        follow_redirects=False,
    )

    assert callback_resp.status_code == 307
    redirect_loc = callback_resp.headers["location"]
    assert "/dashboard" in redirect_loc
    assert "error=provider_error" in redirect_loc
    assert "Secret internal" not in redirect_loc

    # Cookie must be cleared so no half-session remains
    cookie_header = callback_resp.headers.get("set-cookie")
    assert cookie_header is not None
    assert 'oauth_flow=""' in cookie_header or "oauth_flow=;" in cookie_header


def test_callback_unreachable_provider_network_error_redirects_cleanly(client):
    class NetworkErrorFake(FakeProvider):
        def __init__(self):
            super().__init__(name="fake")

        def exchange_code(self, code, code_verifier):
            raise ConnectionError("Connection refused to auth provider")

    fake = NetworkErrorFake()
    register(fake)

    start_resp = client.get("/api/auth/fake/start?next=/dashboard", follow_redirects=False)
    location = start_resp.headers["location"]
    state = parse_qs(urlsplit(location).query)["state"][0]
    cookie_val = start_resp.cookies.get("oauth_flow")

    client.cookies.set("oauth_flow", cookie_val, path="/api/auth")
    callback_resp = client.get(
        f"/api/auth/fake/callback?code=good-code&state={state}",
        follow_redirects=False,
    )

    # Must redirect cleanly with generic provider_error rather than leaking raw exception
    assert callback_resp.status_code == 307
    redirect_loc = callback_resp.headers["location"]
    assert "error=provider_error" in redirect_loc
    assert "Connection refused" not in redirect_loc


def test_callback_provider_timeout_error_redirects_cleanly(client):
    class TimeoutFake(FakeProvider):
        def __init__(self):
            super().__init__(name="fake")

        def exchange_code(self, code, code_verifier):
            raise TimeoutError("Request timed out connecting to provider")

    fake = TimeoutFake()
    register(fake)

    start_resp = client.get("/api/auth/fake/start?next=/dashboard", follow_redirects=False)
    location = start_resp.headers["location"]
    state = parse_qs(urlsplit(location).query)["state"][0]
    cookie_val = start_resp.cookies.get("oauth_flow")

    client.cookies.set("oauth_flow", cookie_val, path="/api/auth")
    callback_resp = client.get(
        f"/api/auth/fake/callback?code=good-code&state={state}",
        follow_redirects=False,
    )

    assert callback_resp.status_code == 307
    redirect_loc = callback_resp.headers["location"]
    assert "error=provider_error" in redirect_loc
    assert "Request timed out" not in redirect_loc


def test_callback_provider_value_error_redirects_and_clears_cookie(client):
    class MalformedProfileFake(FakeProvider):
        def __init__(self):
            super().__init__(name="fake")

        def fetch_profile(self, tokens):
            raise ValueError("Account ID not found in provider response")

    fake = MalformedProfileFake()
    register(fake)

    start_resp = client.get("/api/auth/fake/start?next=/dashboard", follow_redirects=False)
    state = parse_qs(urlsplit(start_resp.headers["location"]).query)["state"][0]
    cookie_val = start_resp.cookies.get("oauth_flow")

    client.cookies.set("oauth_flow", cookie_val, path="/api/auth")
    callback_resp = client.get(
        f"/api/auth/fake/callback?code=good-code&state={state}",
        follow_redirects=False,
    )

    assert callback_resp.status_code == 307
    redirect_loc = callback_resp.headers["location"]
    assert "/dashboard" in redirect_loc
    assert "error=provider_error" in redirect_loc

    # Cookie must be cleared
    cookie_header = callback_resp.headers.get("set-cookie")
    assert cookie_header is not None
    assert 'oauth_flow=""' in cookie_header or "oauth_flow=;" in cookie_header


def test_callback_non_http_provider_error_redirects_cleanly(client):
    class BuggyProvider(FakeProvider):
        def __init__(self):
            super().__init__(name="fake")

        def exchange_code(self, code, code_verifier):
            raise AttributeError("'NoneType' object has no attribute 'get'")

    fake = BuggyProvider()
    register(fake)

    start_resp = client.get("/api/auth/fake/start?next=/dashboard", follow_redirects=False)
    state = parse_qs(urlsplit(start_resp.headers["location"]).query)["state"][0]
    cookie_val = start_resp.cookies.get("oauth_flow")

    client.cookies.set("oauth_flow", cookie_val, path="/api/auth")
    callback_resp = client.get(
        f"/api/auth/fake/callback?code=good-code&state={state}",
        follow_redirects=False,
    )

    assert callback_resp.status_code == 307
    redirect_loc = callback_resp.headers["location"]
    assert "error=provider_error" in redirect_loc
    assert "NoneType" not in redirect_loc

    cookie_header = callback_resp.headers.get("set-cookie")
    assert cookie_header is not None
    assert 'oauth_flow=""' in cookie_header or "oauth_flow=;" in cookie_header


def test_callback_unexpected_os_error_redirects_cleanly(client):
    class FileSystemErrorProvider(FakeProvider):
        def __init__(self):
            super().__init__(name="fake")

        def exchange_code(self, code, code_verifier):
            raise FileNotFoundError("Local configuration or credential file missing")

    fake = FileSystemErrorProvider()
    register(fake)

    start_resp = client.get("/api/auth/fake/start?next=/dashboard", follow_redirects=False)
    state = parse_qs(urlsplit(start_resp.headers["location"]).query)["state"][0]
    cookie_val = start_resp.cookies.get("oauth_flow")

    client.cookies.set("oauth_flow", cookie_val, path="/api/auth")
    callback_resp = client.get(
        f"/api/auth/fake/callback?code=good-code&state={state}",
        follow_redirects=False,
    )

    assert callback_resp.status_code == 307
    redirect_loc = callback_resp.headers["location"]
    assert "error=provider_error" in redirect_loc
    assert "FileNotFoundError" not in redirect_loc

    cookie_header = callback_resp.headers.get("set-cookie")
    assert cookie_header is not None
    assert 'oauth_flow=""' in cookie_header or "oauth_flow=;" in cookie_header


def test_client_secrets_never_leak_in_logs_or_responses(client, monkeypatch, caplog):
    secret_value = "super-secret-client-credential-xyz987"
    monkeypatch.setattr(get_settings(), "github_client_secret", secret_value)
    monkeypatch.setattr(get_settings(), "auth_secret_key", secret_value)

    class SecretCarryingErrorProvider(FakeProvider):
        def __init__(self):
            super().__init__(name="fake")

        def exchange_code(self, code, code_verifier):
            raise RuntimeError(f"Token exchange failed with secret {secret_value}")

    fake = SecretCarryingErrorProvider()
    register(fake)

    # 1. Start flow: secret must not leak in redirect or cookie
    start_resp = client.get("/api/auth/fake/start?next=/dashboard", follow_redirects=False)
    assert secret_value not in start_resp.headers.get("location", "")
    assert secret_value not in start_resp.headers.get("set-cookie", "")

    state = parse_qs(urlsplit(start_resp.headers["location"]).query)["state"][0]
    cookie_val = start_resp.cookies.get("oauth_flow")

    # 2. Callback failure: provider error containing secret must not leak into redirect or logs
    caplog.clear()
    client.cookies.set("oauth_flow", cookie_val, path="/api/auth")
    callback_resp = client.get(
        f"/api/auth/fake/callback?code=good-code&state={state}",
        follow_redirects=False,
    )
    assert callback_resp.status_code == 307
    assert secret_value not in callback_resp.headers.get("location", "")
    assert secret_value not in callback_resp.headers.get("set-cookie", "")

    # Check that error text with secret was not written to logs, but provider name & error type were
    assert secret_value not in caplog.text
    assert "fake" in caplog.text
    assert "RuntimeError" in caplog.text


def test_callback_hook_failure_redirects_with_internal_error(client, monkeypatch, caplog):
    fake = FakeProvider(name="fake")
    register(fake)

    def failing_hook(profile):
        raise RuntimeError("Database write failure during account creation")

    monkeypatch.setattr("app.routers.auth.on_profile", failing_hook)

    start_resp = client.get("/api/auth/fake/start?next=/dashboard", follow_redirects=False)
    location = start_resp.headers["location"]
    state = parse_qs(urlsplit(location).query)["state"][0]
    cookie_val = start_resp.cookies.get("oauth_flow")

    client.cookies.set("oauth_flow", cookie_val, path="/api/auth")
    resp = client.get(
        f"/api/auth/fake/callback?code=good-code&state={state}",
        follow_redirects=False,
    )
    assert resp.status_code == 307
    redirect_loc = resp.headers["location"]
    assert redirect_loc.startswith("http://localhost:5173/dashboard")
    assert "error=internal_error" in redirect_loc
    assert "provider_error" not in redirect_loc
    assert "Database" not in redirect_loc
    # The failure stays diagnosable server-side
    assert "on_profile hook" in caplog.text
    cookie_header = resp.headers.get("set-cookie")
    assert cookie_header is not None
    assert 'oauth_flow=""' in cookie_header or "oauth_flow=;" in cookie_header


def test_on_profile_stub_callable():
    profile = ProviderProfile(
        provider="github",
        provider_account_id="123",
        email="a@b.com",
        email_verified=True,
        display_name="A",
        avatar_url=None,
    )
    assert on_profile(profile) is None


def test_verify_state_cookie_logs_debug_on_decode_error(caplog):
    import logging

    caplog.set_level(logging.DEBUG, logger="api.auth")
    result = verify_state_cookie("not-a-signed-cookie", get_settings().auth_secret_key)
    assert result is None
    assert "Failed to decode state cookie" in caplog.text


def test_production_environment_rejects_insecure_auth_secret_key(monkeypatch):
    get_settings.cache_clear()
    monkeypatch.setenv("ENV", "production")
    monkeypatch.setenv("AUTH_SECRET_KEY", "insecure-dev-secret-key-change-in-production")
    try:
        with pytest.raises(RuntimeError, match="AUTH_SECRET_KEY must be set to a secure"):
            get_settings()
    finally:
        get_settings.cache_clear()


def test_staging_environment_rejects_insecure_auth_secret_key(monkeypatch):
    get_settings.cache_clear()
    monkeypatch.setenv("ENV", "staging")
    monkeypatch.setenv("AUTH_SECRET_KEY", "insecure-dev-secret-key-change-in-production")
    try:
        with pytest.raises(RuntimeError, match="AUTH_SECRET_KEY must be set to a secure"):
            get_settings()
    finally:
        get_settings.cache_clear()


def test_non_development_environment_rejects_short_auth_secret_key(monkeypatch):
    get_settings.cache_clear()
    monkeypatch.setenv("ENV", "staging")
    monkeypatch.setenv("AUTH_SECRET_KEY", "too-short-secret-key")
    try:
        with pytest.raises(RuntimeError, match="at least 32 characters long"):
            get_settings()
    finally:
        get_settings.cache_clear()


def test_development_environment_rejects_custom_short_auth_secret_key(monkeypatch):
    get_settings.cache_clear()
    monkeypatch.setenv("ENV", "development")
    monkeypatch.setenv("AUTH_SECRET_KEY", "short-custom-dev-key")
    try:
        with pytest.raises(RuntimeError, match="at least 32 characters long"):
            get_settings()
    finally:
        get_settings.cache_clear()


def test_production_environment_accepts_secure_auth_secret_key(monkeypatch):
    get_settings.cache_clear()
    monkeypatch.setenv("ENV", "production")
    monkeypatch.setenv("AUTH_SECRET_KEY", "super-secret-production-random-key-9876543210")
    try:
        settings = get_settings()
        assert settings.auth_secret_key == "super-secret-production-random-key-9876543210"
    finally:
        get_settings.cache_clear()


def test_default_environment_fails_closed_and_rejects_insecure_auth_secret_key(
    monkeypatch, tmp_path
):
    # Settings reads .env from the working directory, so run where there is none.
    monkeypatch.chdir(tmp_path)
    get_settings.cache_clear()
    monkeypatch.delenv("ENV", raising=False)
    monkeypatch.setenv("AUTH_SECRET_KEY", "insecure-dev-secret-key-change-in-production")
    try:
        with pytest.raises(RuntimeError, match="AUTH_SECRET_KEY must be set to a secure"):
            get_settings()
    finally:
        get_settings.cache_clear()


def test_development_environment_allows_insecure_auth_secret_key(monkeypatch):
    get_settings.cache_clear()
    monkeypatch.setenv("ENV", "development")
    monkeypatch.setenv("AUTH_SECRET_KEY", "insecure-dev-secret-key-change-in-production")
    try:
        settings = get_settings()
        assert settings.auth_secret_key == "insecure-dev-secret-key-change-in-production"
    finally:
        get_settings.cache_clear()


@pytest.mark.parametrize("allowlist", ["", "/", "/app, /dashboard"])
def test_allowlist_without_absolute_url_is_rejected_at_startup(monkeypatch, allowlist):
    get_settings.cache_clear()
    monkeypatch.setenv("ENV", "development")
    monkeypatch.setenv("ALLOWED_POST_LOGIN_REDIRECTS", allowlist)
    try:
        with pytest.raises(RuntimeError, match="at least one absolute"):
            get_settings()
    finally:
        get_settings.cache_clear()
