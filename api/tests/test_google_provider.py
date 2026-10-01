import json
import time
from urllib.parse import parse_qs, urlsplit

import httpx2
import jwt
import pytest
from cryptography.hazmat.primitives.asymmetric import rsa
from jwt.algorithms import RSAAlgorithm

from app.providers import OAuthProvider
from app.providers.google import GoogleProvider

KID = "test-key-123456789"


def new_rsa_key():
    return rsa.generate_private_key(public_exponent=65537, key_size=2048)


@pytest.fixture(scope="module")
def private_key():
    return new_rsa_key()


def jwks_for(private_key, kid=KID):
    jwk = json.loads(RSAAlgorithm.to_jwk(private_key.public_key()))
    jwk.update({"kid": kid, "alg": "RS256", "use": "sig"})
    return {"keys": [jwk]}


@pytest.fixture
def make_token(private_key):
    def _make(overrides=None, *, key=None, kid=KID, drop=()):
        now = int(time.time())
        claims = {
            "iss": "https://accounts.google.com",
            "sub": "1234567890",
            "aud": "client_id",  # must match with provider's client_id
            "name": "John Doe",
            "picture": "http://example.com/johndoe.jpg",
            "email": "zj5jP@example.com",
            "email_verified": True,
            "iat": now,
            "exp": now + 3600,
        }
        claims.update(overrides or {})

        for claim in drop:
            claims.pop(claim, None)

        headers = {"kid": kid} if kid else {}

        return jwt.encode(claims, key or private_key, algorithm="RS256", headers=headers)

    return _make


@pytest.fixture
def base_provider():
    """returns a fresh provider for each test"""
    return GoogleProvider("client_id", "client_secret", "http://localhost:8000/")


def make_client(handler=None):
    """returns a client whose transport is served by a mock transport"""
    handler = handler or (lambda req: httpx2.Response(500))
    return httpx2.Client(transport=httpx2.MockTransport(handler))


def test_satisfies_interface(base_provider):
    assert isinstance(base_provider, OAuthProvider)


def test_authorize_url(base_provider):
    url = base_provider.authorize_url(state="state", code_challenge="code_challenge")
    params = parse_qs(urlsplit(url).query)

    assert params["client_id"] == ["client_id"]
    assert params["redirect_uri"] == ["http://localhost:8000/"]
    assert params["scope"] == ["openid email profile"]
    assert params["state"] == ["state"]
    assert params["code_challenge"] == ["code_challenge"]
    assert params["code_challenge_method"] == ["S256"]
    assert params["response_type"] == ["code"]


def test_code_exchange_success(base_provider):
    def handle(req):
        assert b"grant_type=authorization_code" in req.read()
        return httpx2.Response(200, json={"access_token": "abcd", "id_token": "gho_secret123"})

    base_provider.http_client = make_client(handle)
    tokens = base_provider.exchange_code(code="test-code", code_verifier="mock_verifier")
    assert tokens["access_token"] == "abcd"
    assert tokens["id_token"] == "gho_secret123"


def test_code_exchange_failure(base_provider):
    def handle(req):
        assert b"grant_type=authorization_code" in req.read()
        return httpx2.Response(400)

    base_provider.http_client = make_client(handle)
    with pytest.raises(httpx2.HTTPError):
        base_provider.exchange_code(code="test-code", code_verifier="mock_verifier")


def test_code_exchange_error_body(base_provider):
    def handle(req):
        return httpx2.Response(
            200, json={"error": "invalid_grant", "error_description": "Bad Request"}
        )

    base_provider.http_client = make_client(handle)
    with pytest.raises(httpx2.HTTPError, match="Bad Request"):
        base_provider.exchange_code(code="test-code", code_verifier="mock_verifier")


def test_code_exchange_missing_id_token(base_provider):
    def handle(req):
        return httpx2.Response(200, json={"access_token": "abcd"})

    base_provider.http_client = make_client(handle)
    with pytest.raises(httpx2.HTTPError, match="Google token exchange returned no id_token"):
        base_provider.exchange_code(code="test-code", code_verifier="mock_verifier")


def test_fetch_profile_success(base_provider, private_key, make_token):
    def handle(req):
        return httpx2.Response(200, json=jwks_for(private_key))

    base_provider.http_client = make_client(handle)

    profile = base_provider.fetch_profile({"id_token": make_token()})

    assert profile.provider == "google"
    assert profile.provider_account_id == "1234567890"
    assert profile.email == "zj5jP@example.com"
    assert profile.email_verified is True
    assert profile.display_name == "John Doe"
    assert profile.avatar_url == "http://example.com/johndoe.jpg"


def test_fetch_profile_jwks_server_error(base_provider, make_token):
    def handle(req):
        return httpx2.Response(500)

    base_provider.http_client = make_client(handle)
    with pytest.raises(ValueError, match="Failed to fetch signing keys"):
        base_provider.fetch_profile({"id_token": make_token()})


def test_fetch_profile_missing_id_token(base_provider):
    base_provider.http_client = make_client()  # no jwks server response
    with pytest.raises(ValueError, match="ID token not found or missing from token payload"):
        base_provider.fetch_profile({})


def test_fetch_profile_wrong_audience(base_provider, private_key, make_token):
    base_provider.http_client = make_client(
        lambda req: httpx2.Response(200, json=jwks_for(private_key))
    )

    with pytest.raises(ValueError, match="Invalid Google ID token"):
        base_provider.fetch_profile({"id_token": make_token({"aud": "wrong-audience"})})


def serve_jwks(provider, private_key):
    provider.http_client = make_client(lambda req: httpx2.Response(200, json=jwks_for(private_key)))


def test_fetch_profile_optional_claims_missing(base_provider, private_key, make_token):
    serve_jwks(base_provider, private_key)
    profile = base_provider.fetch_profile(
        {"id_token": make_token(drop=("email", "email_verified", "name", "picture"))}
    )
    assert profile.email is None
    assert profile.email_verified is False
    assert profile.display_name is None
    assert profile.avatar_url is None


def test_fetch_profile_expired(base_provider, private_key, make_token):
    serve_jwks(base_provider, private_key)
    now = int(time.time())
    token = make_token({"iat": now - 7200, "exp": now - 3600})
    with pytest.raises(ValueError) as exc:
        base_provider.fetch_profile({"id_token": token})
    assert isinstance(exc.value.__cause__, jwt.ExpiredSignatureError)


def test_fetch_profile_wrong_issuer(base_provider, private_key, make_token):
    serve_jwks(base_provider, private_key)
    with pytest.raises(ValueError) as exc:
        base_provider.fetch_profile({"id_token": make_token({"iss": "https://evil.example"})})
    assert isinstance(exc.value.__cause__, jwt.InvalidIssuerError)


def test_fetch_profile_forged_signature(base_provider, private_key, make_token):
    serve_jwks(base_provider, private_key)  # publishes the real key
    token = make_token(key=new_rsa_key())  # signed by an attacker
    with pytest.raises(ValueError) as exc:
        base_provider.fetch_profile({"id_token": token})
    assert isinstance(exc.value.__cause__, jwt.InvalidSignatureError)


def test_fetch_profile_bare_issuer_accepted(base_provider, private_key, make_token):
    serve_jwks(base_provider, private_key)
    profile = base_provider.fetch_profile({"id_token": make_token({"iss": "accounts.google.com"})})
    assert profile.provider_account_id == "1234567890"


def test_fetch_profile_false_email_verified(base_provider, private_key, make_token):
    serve_jwks(base_provider, private_key)
    profile = base_provider.fetch_profile({"id_token": make_token({"email_verified": False})})
    assert profile.email_verified is False


def test_fetch_profile_fails_unknown_kid(base_provider, private_key, make_token):
    serve_jwks(base_provider, private_key)
    token = make_token(kid="unknown-kid")
    with pytest.raises(ValueError) as exc:
        base_provider.fetch_profile({"id_token": token})
    assert "Invalid Google ID token" in str(exc.value)


def test_fetch_profile_fails_missing_kid(base_provider, private_key, make_token):
    serve_jwks(base_provider, private_key)
    token = make_token(kid=None)
    with pytest.raises(ValueError, match="Invalid Google ID token") as exc:
        base_provider.fetch_profile({"id_token": token})
    assert isinstance(exc.value.__cause__, jwt.InvalidTokenError)


@pytest.mark.parametrize("body", [["not-an-object"], {"keys": ["not-an-object"]}])
def test_fetch_profile_malformed_jwks(base_provider, make_token, body):
    base_provider.http_client = make_client(lambda req: httpx2.Response(200, json=body))
    with pytest.raises(ValueError, match="Failed to fetch signing keys"):
        base_provider.fetch_profile({"id_token": make_token()})
