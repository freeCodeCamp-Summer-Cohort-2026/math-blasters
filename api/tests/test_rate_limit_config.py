from app.config import Settings
from app.main import app


def test_completions_rate_limit_setting(monkeypatch):
    """Verify that the completions rate limit setting defaults to 20/minute."""
    monkeypatch.delenv("COMPLETIONS_RATE_LIMIT", raising=False)
    settings = Settings(_env_file=None)
    assert settings.completions_rate_limit == "20/minute"


def test_limiter_exists_on_app_state():
    """Verify that the slowapi limiter is correctly initialized on the app state."""
    assert hasattr(app.state, "limiter")
    assert app.state.limiter is not None
