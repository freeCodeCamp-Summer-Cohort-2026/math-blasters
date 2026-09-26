from urllib.parse import parse_qs, urlsplit

import httpx2
import pytest

from app.providers import ProviderProfile
from app.providers.github import GithubProvider


# fixtures
@pytest.fixture
def base_provider():
    """returns a basic provider with a mocked client for testing"""
    return GithubProvider("client_id", "client_secret", "http://localhost:8000/")


# helper
def make_client(handler) -> httpx2.Client:
    """helper function to make a mocked http client"""
    return httpx2.Client(transport=httpx2.MockTransport(handler))


def test_authorize_url(base_provider):
    url = base_provider.authorize_url(state="test-state", code_challenge="test-challenge")
    params = parse_qs(urlsplit(url).query)

    assert params["client_id"] == ["client_id"]
    assert params["redirect_uri"] == ["http://localhost:8000/"]
    assert params["scope"] == ["read:user user:email"]
    assert params["state"] == ["test-state"]
    assert params["code_challenge"] == ["test-challenge"]
    assert params["code_challenge_method"] == ["S256"]


def test_exchange_code(base_provider):
    def handle(req):
        body = req.read()
        assert b"client_secret=client_secret" in body
        assert b"code=test-code" in body
        assert b"code_verifier=mock_verifier" in body
        return httpx2.Response(200, json={"access_token": "gho_secret123"})

    base_provider.http_client = make_client(handle)
    tokens = base_provider.exchange_code(code="test-code", code_verifier="mock_verifier")
    assert tokens["access_token"] == "gho_secret123"


def test_exchange_code_oauth_error_trapping(base_provider):
    """tests that github returns 200 even if the code is invalid"""
    base_provider.http_client = make_client(
        lambda req: httpx2.Response(200, json={"error": "invalid_code"})
    )

    with pytest.raises(Exception) as exc:
        base_provider.exchange_code(code="test-code", code_verifier="mock_verifier")
    assert "invalid_code" in str(exc.value)


def test_fetch_user_profile(base_provider):
    def handle(req):
        assert req.headers["Authorization"] == "Bearer gho_secret123"
        if "/user/emails" in str(req.url):
            return httpx2.Response(
                200,
                json=[
                    {"email": "4EY4o@example.com", "primary": True, "verified": True},
                ],
            )
        return httpx2.Response(
            200, json={"id": 987, "name": "Doe", "login": "d", "avatar_url": "img"}
        )

    base_provider.http_client = make_client(handle)
    tokens = {"access_token": "gho_secret123"}
    profile = base_provider.fetch_profile(tokens)

    assert isinstance(profile, ProviderProfile)
    assert profile.provider_account_id == "987"
    assert profile.email == "4EY4o@example.com"
    assert profile.display_name == "Doe"
