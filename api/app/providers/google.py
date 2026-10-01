"""
Google OpenID Connect Auth Provider.


GOOGLE OAUTH LOCAL DEVELOPMENT SETUP

Each contributor must register their own Google Cloud console application
because redirect callback URIs map to single host addresses.

Follow these steps to set up your local development environment:

1. Go to: Google Cloud Console (https://console.cloud.google.com/)
2. Create a new project or select an existing development cluster.
3. Navigate to: APIs & Services -> OAuth consent screen. Set user type to "External",
   and add your email as a test user (Testing mode is sufficient).
4. Navigate to: Credentials -> Create Credentials -> OAuth client ID.
   - Application type: Web application
   - Name:             Math Blasters (Local Dev)
   - Authorized redirect URIs: http://localhost:8000/api/auth/google/callback
5. Click "Create", then copy the Client ID and Client Secret values.
6. Paste those credentials directly into your local, uncommitted `.env` file:

   GOOGLE_CLIENT_ID="your_copied_client_id_here"
   GOOGLE_CLIENT_SECRET="your_copied_client_secret_here"

⚠️ SECURITY WARNING: Never commit real credentials or your `.env` file to git.
"""

from urllib.parse import urlencode

import httpx2
import jwt

from app.providers import ProviderProfile

JWKS_URL = "https://www.googleapis.com/oauth2/v3/certs"


GOOGLE_ISSUERS = [
    "accounts.google.com",
    "https://accounts.google.com",
]


class GoogleProvider:
    name = "google"

    def __init__(
        self,
        client_id: str,
        client_secret: str,
        redirect_uri: str,
        http_client: httpx2.Client | None = None,
    ):
        self.client_id = client_id
        self.client_secret = client_secret
        self.redirect_uri = redirect_uri
        self.http_client = http_client or httpx2.Client()

    def __enter__(self):
        return self

    def __exit__(self, *args):
        self.close()

    def close(self):
        self.http_client.close()

    def authorize_url(self, state: str, code_challenge: str) -> str:
        params = {
            "client_id": self.client_id,
            "redirect_uri": self.redirect_uri,
            "scope": "openid email profile",
            "state": state,
            "code_challenge": code_challenge,
            "code_challenge_method": "S256",
            "response_type": "code",
        }

        return f"https://accounts.google.com/o/oauth2/v2/auth?{urlencode(params)}"

    def exchange_code(self, code: str, code_verifier: str) -> dict[str, str]:
        url = "https://oauth2.googleapis.com/token"
        data = {
            "client_id": self.client_id,
            "client_secret": self.client_secret,
            "redirect_uri": self.redirect_uri,
            "code": code,
            "code_verifier": code_verifier,
            "grant_type": "authorization_code",
        }

        headers = {
            "Accept": "application/json",
        }

        response = self.http_client.post(url, data=data, headers=headers)
        response.raise_for_status()
        response_data = response.json()

        if "error" in response_data:
            raise httpx2.HTTPError(
                response_data.get("error_description")
                or response_data.get("error", "GoogleProviderError")
            )

        if "id_token" not in response_data:
            raise httpx2.HTTPError("Google token exchange returned no id_token")

        return response_data

    def _get_signing_key(self, id_token: str):
        kid = jwt.get_unverified_header(id_token).get("kid")
        if not kid or not isinstance(kid, str) or len(kid) > 256:
            raise jwt.InvalidTokenError("Token header has missing or invalid kid")

        response = self.http_client.get(JWKS_URL)
        response.raise_for_status()
        for jwk in response.json().get("keys", []):
            if jwk.get("kid") == kid:
                return jwt.PyJWK.from_dict(jwk).key
        raise jwt.InvalidTokenError("No matching signing key")

    def fetch_profile(self, tokens: dict[str, str]) -> ProviderProfile:
        id_token = tokens.get("id_token")
        if not id_token:
            raise ValueError("ID token not found or missing from token payload")

        try:
            # validate the id_token
            signing_key = self._get_signing_key(id_token)

            claims = jwt.decode(
                id_token,
                signing_key,
                algorithms=["RS256"],
                audience=self.client_id,
                issuer=GOOGLE_ISSUERS,
                options={"require": ["exp", "iat", "iss", "aud", "sub"]},
                leeway=10,  # tolerate small clock skew
            )
        except jwt.PyJWTError as e:
            raise ValueError("Invalid Google ID token") from e
        except (httpx2.HTTPError, ValueError, KeyError, TypeError, AttributeError) as e:
            raise ValueError("Failed to fetch signing keys") from e

        account_id = str(claims.get("sub", "")).strip()
        if not account_id:
            raise ValueError("Google profile is missing the 'sub' claim")

        email = (claims.get("email") or "").strip() or None
        verified = claims.get("email_verified")
        email_verified = verified is True or str(verified).lower() == "true"

        name = claims.get("name")
        picture = claims.get("picture")

        return ProviderProfile(
            provider="google",
            provider_account_id=account_id,
            email=email,
            email_verified=email_verified,
            display_name=str(name) if name is not None else None,
            avatar_url=str(picture) if picture is not None else None,
        )
