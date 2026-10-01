"""Auth routes: OAuth code flow, current account, and logout.

Threat Model (Stateless PKCE):
- Storage: Flow state and PKCE verifier are kept in a signed `oauth_flow` cookie
  rather than a server-side cache/session store to remain stateless per spec.
- Front-channel isolation (RFC 7636): The auth code travels in the URL query string;
  the verifier travels strictly in the HTTPS `Cookie` header. Code interception does
  not leak the cookie.
- Confidential client: Token exchange requires the server-held `client_secret`.
  Stolen verifier + code cannot be exchanged directly with the provider.
- Cookie controls: `HttpOnly=True` (no JS access), `SameSite="lax"`, `Secure` in non-dev,
  `Path="/api/auth"`, 10-minute TTL, single-use deletion, and HMAC-SHA256 integrity.
"""

from __future__ import annotations

import base64
import hashlib
import hmac
import logging
import posixpath
import re
import secrets
from typing import Annotated, Any
from urllib.parse import unquote, urlencode, urljoin, urlsplit

from fastapi import APIRouter, Depends, Request, Response, status
from fastapi.responses import RedirectResponse
from itsdangerous import BadData, URLSafeTimedSerializer
from sqlalchemy import select

from app.auth import OptionalCurrentAccountDep
from app.config import Settings, get_settings
from app.db import SessionDep
from app.exceptions import APIException
from app.learner import LEARNER_COOKIE_NAME, LEARNER_TOKEN_PATTERN, issue_learner_identity
from app.models import Learner, OAuthIdentity
from app.providers import ProviderProfile, get_provider
from app.schemas import AccountMeGetResponse

logger = logging.getLogger("api.auth")
router = APIRouter(prefix="/auth", tags=["auth"])


@router.get("/me", response_model=AccountMeGetResponse | None)
def get_me(account: OptionalCurrentAccountDep, session: SessionDep) -> AccountMeGetResponse | None:
    if account is None:
        return None

    providers = session.scalars(
        select(OAuthIdentity.provider).where(OAuthIdentity.account_id == account.id).distinct()
    ).all()

    return AccountMeGetResponse(
        display_name=account.display_name,
        avatar_url=account.avatar_url,
        email=account.email,
        providers=sorted(providers),
    )


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT, response_class=Response)
def logout(request: Request, response: Response, session: SessionDep) -> None:
    token = request.cookies.get(LEARNER_COOKIE_NAME)

    if token and LEARNER_TOKEN_PATTERN.fullmatch(token):
        learner = session.scalar(select(Learner).where(Learner.token == token))
        if learner:
            session.delete(learner)

    issue_learner_identity(session, response)


# Profile hook stub; wire issue #117 points this to resolve_account from #85.
def on_profile(profile: ProviderProfile) -> None:
    logger.warning(
        "OAuth on_profile hook stub called for provider '%s' (account_id=%s); "
        "session creation pending wire issue #117",
        profile.provider,
        profile.provider_account_id,
    )


def generate_pkce_pair() -> tuple[str, str]:
    """Generate a random code_verifier and its S256 code_challenge per RFC 7636."""
    verifier = secrets.token_urlsafe(64)
    digest = hashlib.sha256(verifier.encode("ascii")).digest()
    challenge = base64.urlsafe_b64encode(digest).decode("ascii").rstrip("=")
    return verifier, challenge


def sign_state_cookie(payload: dict[str, Any], secret_key: str) -> str:
    """Serialize and sign payload with an embedded timestamp using URLSafeTimedSerializer."""
    serializer = URLSafeTimedSerializer(secret_key, salt="oauth-flow")
    return serializer.dumps(payload)


def verify_state_cookie(
    cookie_value: str | None,
    secret_key: str,
    max_age: int = 600,
) -> dict[str, Any] | None:
    """Verify signature and timestamp with URLSafeTimedSerializer.
    Return payload dict if valid, else None.
    """
    if not cookie_value:
        return None

    try:
        serializer = URLSafeTimedSerializer(secret_key, salt="oauth-flow")
        data = serializer.loads(cookie_value, max_age=max_age)
        return data if isinstance(data, dict) else None
    except BadData as exc:
        logger.debug("Failed to decode state cookie: %s", exc, exc_info=True)
        return None


def _absolute_allowlist(settings: Settings) -> list[str]:
    return [
        entry
        for entry in settings.allowed_post_login_redirect_list
        if entry.startswith(("http://", "https://"))
    ]


def get_default_redirect_target(settings: Settings) -> str:
    """Return the first absolute allowlist entry; get_settings guarantees there is one."""
    return _absolute_allowlist(settings)[0]


def _matches_path_prefix(target_path: str, allowed_path: str) -> bool:
    allowed = allowed_path.rstrip("/")
    if not allowed:
        return True
    # Resolve dot segments (plain or percent-encoded) so they cannot climb out of the prefix.
    resolved = posixpath.normpath(unquote(target_path)) if target_path else ""
    return resolved == allowed or resolved.startswith(f"{allowed}/")


def clear_cookie_headers(settings: Settings) -> dict[str, str]:
    """Build Set-Cookie header to clear oauth_flow with matching security attributes."""
    secure_flag = "; Secure" if settings.cookie_secure else ""
    hdr = f'oauth_flow=""; Path=/api/auth; Max-Age=0; HttpOnly; SameSite=lax{secure_flag}'
    return {"Set-Cookie": hdr}


_SAFE_ERROR_CODE = re.compile(r"^[a-zA-Z0-9_-]{1,64}$")


def _redirect_clearing_cookie(
    target: str,
    settings: Settings,
    error: str | None = None,
    error_description: str | None = None,
) -> RedirectResponse:
    params: dict[str, str] = {}
    if error:
        params["error"] = error if _SAFE_ERROR_CODE.match(error) else "provider_error"
    if error_description:
        params["error_description"] = re.sub(r"[\r\n\t]", " ", error_description).strip()[:200]

    url = f"{target}{'&' if '?' in target else '?'}{urlencode(params)}" if params else target
    response = RedirectResponse(url=url, status_code=status.HTTP_307_TEMPORARY_REDIRECT)
    response.delete_cookie(
        key="oauth_flow",
        path="/api/auth",
        httponly=True,
        samesite="lax",
        secure=settings.cookie_secure,
    )
    return response


def validate_redirect_target(target: str | None, settings: Settings) -> str:
    """Validate that target matches the allowed post-login redirect allowlist."""
    if not target:
        return get_default_redirect_target(settings)

    if target.startswith(("//", "/\\", "\\")):
        raise APIException(
            status_code=status.HTTP_400_BAD_REQUEST,
            code="validation_error",
            message=f"Redirect target '{target}' is not allowed",
        )

    parsed_allowed = [urlsplit(entry) for entry in _absolute_allowlist(settings)]

    resolved_target = target
    if target.startswith("/"):
        web_origins = [f"{p.scheme}://{p.netloc}" for p in parsed_allowed]
        if web_origins:
            resolved_target = urljoin(web_origins[0], target)

    parsed = urlsplit(resolved_target)
    if parsed.scheme in ("http", "https") and "@" not in parsed.netloc:
        target_origin = f"{parsed.scheme}://{parsed.netloc}"
        for allowed in parsed_allowed:
            allowed_origin = f"{allowed.scheme}://{allowed.netloc}"
            if target_origin == allowed_origin and _matches_path_prefix(parsed.path, allowed.path):
                return resolved_target

    raise APIException(
        status_code=status.HTTP_400_BAD_REQUEST,
        code="validation_error",
        message=f"Redirect target '{target}' is not allowed",
    )


@router.get("/{provider}/start")
def start_oauth(
    provider: str,
    next: str | None = None,
    settings: Annotated[Settings, Depends(get_settings)] = None,
):
    provider_instance = get_provider(provider)
    if provider_instance is None:
        raise APIException(
            status_code=status.HTTP_404_NOT_FOUND,
            code="not_found",
            message=f"OAuth provider '{provider}' is not configured",
        )

    validated_next = validate_redirect_target(next, settings)
    verifier, challenge = generate_pkce_pair()
    state = secrets.token_urlsafe(32)

    cookie_payload = {
        "state": state,
        "verifier": verifier,
        "provider": provider,
        "next": validated_next,
    }
    cookie_value = sign_state_cookie(cookie_payload, settings.auth_secret_key)

    auth_url = provider_instance.authorize_url(state=state, code_challenge=challenge)
    response = RedirectResponse(url=auth_url, status_code=status.HTTP_307_TEMPORARY_REDIRECT)
    response.set_cookie(
        key="oauth_flow",
        value=cookie_value,
        httponly=True,
        samesite="lax",
        secure=settings.cookie_secure,
        path="/api/auth",
        max_age=600,
    )
    return response


@router.get("/{provider}/callback")
def oauth_callback(
    provider: str,
    request: Request,
    code: str | None = None,
    state: str | None = None,
    error: str | None = None,
    error_description: str | None = None,
    settings: Annotated[Settings, Depends(get_settings)] = None,
):
    provider_instance = get_provider(provider)
    if provider_instance is None:
        raise APIException(
            status_code=status.HTTP_404_NOT_FOUND,
            code="not_found",
            message=f"OAuth provider '{provider}' is not configured",
        )

    cookie_val = request.cookies.get("oauth_flow")
    cookie_payload = (
        verify_state_cookie(cookie_val, settings.auth_secret_key) if cookie_val else None
    )
    if not cookie_payload:
        raise APIException(
            status_code=status.HTTP_400_BAD_REQUEST,
            code="validation_error",
            message="Missing, invalid, or expired OAuth state cookie",
            headers=clear_cookie_headers(settings),
        )

    if cookie_payload.get("provider") != provider:
        raise APIException(
            status_code=status.HTTP_400_BAD_REQUEST,
            code="validation_error",
            message=(
                f"OAuth provider mismatch: expected '{cookie_payload.get('provider')}', "
                f"got '{provider}'"
            ),
            headers=clear_cookie_headers(settings),
        )

    expected_state = cookie_payload.get("state")
    if (
        not state
        or not expected_state
        or not isinstance(state, str)
        or not state.isascii()
        or not hmac.compare_digest(state, expected_state)
    ):
        raise APIException(
            status_code=status.HTTP_400_BAD_REQUEST,
            code="validation_error",
            message="Missing or mismatched OAuth state parameter",
            headers=clear_cookie_headers(settings),
        )

    raw_target = cookie_payload.get("next")
    try:
        target = validate_redirect_target(raw_target, settings)
    except APIException:
        target = get_default_redirect_target(settings)

    # Trapping provider-side cancellation or failure before code exchange
    if error:
        return _redirect_clearing_cookie(
            target,
            settings,
            error=error,
            error_description=error_description,
        )

    verifier = cookie_payload.get("verifier")
    if not code or not verifier:
        raise APIException(
            status_code=status.HTTP_400_BAD_REQUEST,
            code="validation_error",
            message="Missing authorization code or verifier",
            headers=clear_cookie_headers(settings),
        )

    try:
        tokens = provider_instance.exchange_code(code=code, code_verifier=verifier)
        profile = provider_instance.fetch_profile(tokens)
    except Exception as exc:
        logger.warning(
            "OAuth code exchange or profile fetch failed for provider '%s': %s",
            provider,
            type(exc).__name__,
        )
        return _redirect_clearing_cookie(target, settings, error="provider_error")

    # A browser navigation should land back in the app, not on a JSON error page.
    try:
        on_profile(profile)
    except Exception:
        logger.exception("Error processing authenticated profile in on_profile hook")
        return _redirect_clearing_cookie(target, settings, error="internal_error")

    return _redirect_clearing_cookie(target, settings)
