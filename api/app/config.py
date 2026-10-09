"""Application settings, read from the environment (or a local .env file)."""

from functools import lru_cache
from pathlib import Path

from limits import parse_many
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

MIN_AUTH_SECRET_KEY_LENGTH = 32
INSECURE_DEV_AUTH_SECRET = "insecure-dev-secret-key-change-in-production"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # postgresql+psycopg://<user>:<password>@<host>:<port>/<database>
    database_url: str = "postgresql+psycopg://mathblasters:mathblasters@localhost:5433/mathblasters"

    # Comma-separated list of origins allowed to call the API from a browser.
    cors_origins: str = "http://localhost:5173"

    # Log-level
    log_level: str = "INFO"

    # Production-safe default; local HTTP development must explicitly opt out.
    cookie_secure: bool = True

    # Default rate limit for POST /api/completions
    completions_rate_limit: str = "20/minute"

    @field_validator("completions_rate_limit")
    @classmethod
    def validate_rate_limit(cls, v: str) -> str:
        try:
            parsed = parse_many(v)
            for limit in parsed:
                if limit.amount < 1:
                    raise ValueError("Rate limit amount must be at least 1")
        except Exception as e:
            raise ValueError(f"Invalid rate limit format '{v}': {e}") from e
        return v

    # Environment mode: 'development', 'test', 'production'
    # Default to production (fail-closed) so deployments without explicit ENV fail safely.
    env: str = "production"

    # Secret key for HMAC-signing OAuth state cookies.
    auth_secret_key: str = INSECURE_DEV_AUTH_SECRET

    # Public base URL of the API (for constructing callback URLs).
    api_base_url: str = "http://localhost:8000"

    # Comma-separated absolute http(s) URLs allowed after login; the first is the default.
    allowed_post_login_redirects: str = "http://localhost:5173"

    # GitHub OAuth credentials (provider registered only when both are present).
    github_client_id: str | None = None
    github_client_secret: str | None = None

    # Google OAuth credentials (provider registered only when both are present).
    google_client_id: str | None = None
    google_client_secret: str | None = None

    # Generated content manifest used to validate completion lesson slugs.
    content_manifest_path: str = str(
        Path(__file__).resolve().parents[2] / "content" / "manifest.json"
    )

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def allowed_post_login_redirect_list(self) -> list[str]:
        return [r.strip() for r in self.allowed_post_login_redirects.split(",") if r.strip()]


@lru_cache
def get_settings() -> Settings:
    settings = Settings()
    is_dev_or_test = settings.env.lower() in ("development", "test")
    if not is_dev_or_test and settings.auth_secret_key == INSECURE_DEV_AUTH_SECRET:
        raise RuntimeError(
            f"AUTH_SECRET_KEY must be set to a secure, unique secret in "
            f"'{settings.env}' environment."
        )
    if len(settings.auth_secret_key) < MIN_AUTH_SECRET_KEY_LENGTH:
        raise RuntimeError(
            f"AUTH_SECRET_KEY must be at least {MIN_AUTH_SECRET_KEY_LENGTH} characters long."
        )
    if not any(
        entry.startswith(("http://", "https://"))
        for entry in settings.allowed_post_login_redirect_list
    ):
        raise RuntimeError(
            "ALLOWED_POST_LOGIN_REDIRECTS must contain at least one absolute http(s) URL."
        )
    return settings
