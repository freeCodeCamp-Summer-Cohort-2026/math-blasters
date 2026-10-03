from __future__ import annotations

import subprocess
import sys
from dataclasses import FrozenInstanceError
from pathlib import Path
from urllib.parse import parse_qs, urlsplit

import pytest

import app.providers as providers
from app.config import get_settings
from app.main import create_app
from app.providers import OAuthProvider, ProviderProfile, get_provider, register
from tests.fake_provider import FakeProvider

API_DIR = Path(__file__).resolve().parent.parent


@pytest.fixture(autouse=True)
def clean_registry(monkeypatch):
    monkeypatch.setattr("app.providers._registry", {})
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()


def set_env(monkeypatch, **values):
    for key in (
        "github_client_id",
        "github_client_secret",
        "google_client_id",
        "google_client_secret",
    ):
        monkeypatch.setenv(key.upper(), values.get(key, ""))


def test_fake_provider_satisfies_oauth_provider_protocol():
    fake = FakeProvider()
    assert isinstance(fake, OAuthProvider)


def test_fake_provider_methods():
    fake = FakeProvider()
    url = fake.authorize_url(state="test-state", code_challenge="test-challenge")
    assert "state=test-state" in url
    assert "code_challenge=test-challenge" in url

    tokens = fake.exchange_code(code="test-code", code_verifier="test-verifier")
    assert tokens["access_token"] == "fake-access-token"

    profile = fake.fetch_profile(tokens)
    assert profile.provider == "fake"
    assert profile.provider_account_id == "fake-user-123"
    assert profile.email == "user@example.com"
    assert profile.email_verified is True
    assert profile.display_name == "Fake User"
    assert profile.avatar_url == "https://example.com/avatar.png"


def test_provider_profile_is_frozen():
    profile = ProviderProfile(
        provider="github",
        provider_account_id="12345",
        email="dev@example.com",
        email_verified=True,
        display_name="Dev",
        avatar_url=None,
    )
    with pytest.raises(FrozenInstanceError):
        profile.display_name = "New Name"  # type: ignore[misc]


def test_registry_starts_empty():
    # A fresh interpreter, since the autouse fixture would hide import-time registrations.
    check = (
        "import app.main; from app.providers import _registry; assert _registry == {}, _registry"
    )
    result = subprocess.run(
        [sys.executable, "-c", check], cwd=API_DIR, capture_output=True, text=True
    )
    assert result.returncode == 0, result.stderr


def test_register_and_get_provider():
    fake = FakeProvider()
    register(fake)
    assert get_provider("fake") is fake


def test_register_rejects_duplicate_name():
    register(FakeProvider())
    with pytest.raises(ValueError, match="already registered"):
        register(FakeProvider())


def test_fake_provider_profile_follows_name():
    assert FakeProvider(name="github").fetch_profile({}).provider == "github"
    fake = FakeProvider()
    fake.name = "google"
    assert fake.fetch_profile({}).provider == "google"


def test_fake_provider_encodes_authorize_params():
    state = "a&redirect_uri=https://evil.example#x"
    url = FakeProvider().authorize_url(state=state, code_challenge="c+/=")
    query = parse_qs(urlsplit(url).query)
    assert query == {"state": [state], "code_challenge": ["c+/="]}


def test_get_unknown_provider_returns_none():
    fake = FakeProvider()
    register(fake)
    assert get_provider("nonexistent") is None


def test_nothing_set_registers_nothing(monkeypatch):
    set_env(monkeypatch)
    create_app()
    assert providers._registry == {}


def test_id_without_secret_registers_nothing(monkeypatch):
    set_env(monkeypatch, github_client_id="id", google_client_id="id")
    create_app()
    assert providers._registry == {}


def test_github_id_and_secret_registers_only_github(monkeypatch):
    set_env(monkeypatch, github_client_id="id", github_client_secret="secret")
    create_app()
    assert set(providers._registry) == {"github"}


def test_google_id_and_secret_registers_only_google(monkeypatch):
    set_env(monkeypatch, google_client_id="id", google_client_secret="secret")
    create_app()
    assert set(providers._registry) == {"google"}


def test_create_app_twice_does_not_raise(monkeypatch):
    set_env(
        monkeypatch,
        github_client_id="id",
        github_client_secret="secret",
        google_client_id="id",
        google_client_secret="secret",
    )
    create_app()
    create_app()
    assert set(providers._registry) == {"github", "google"}
