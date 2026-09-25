from api.app.models import Account, OAuthIdentity
from sqlachemy import select
from sqlalchemy.orm import Session


def resolve_account(
    session: Session,
    provider: str,
    provider_account_id: str,
    email: str,
    email_verified: bool,
    display_name: str | None = None,
    avatar_url: str | None = None,
) -> Account:
    """
    Resolves or creates an Account based on OAuth credentials.

    Precedence rules:
    1. Existing (provider, provider_account_id) pair -> Return associated account.
    2. Verified email matches an existing account -> Attach new OAuthIdentity and return account.
    3. No match -> Create new Account and new OAuthIdentity.
    """

    # Rule 1 - Match on OAuth identity tuple (provider, provider_account_id)
    existing_identity = session.scalar(
        select(OAuthIdentity).where(
            OAuthIdentity.provider == provider,
            OAuthIdentity.provider_account_id == provider_account_id,
        )
    )
    if existing_identity:
        return existing_identity.account

    # Rule 2 - Match on verified email to an existing account
    if email_verified:
        existing_account = session.scalar(select(Account).where(Account.email == email))
        if existing_account:
            # Create and attach new identity to existing account
            new_identity = OAuthIdentity(
                account=existing_account,
                provider=provider,
                provider_account_id=provider_account_id,
            )
            session.add(new_identity)
            session.flush()
            return existing_account

    # Ryle 3 - Create new Account and new OAuthIdentity
    new_account = Account(
        email=email,
        email_verified=email_verified,
        display_name=display_name,
        avatar_url=avatar_url,
    )
    session.add(new_account)
    session.flush()  # Ensures new_account.id is populated for the identity relation

    new_identity = OAuthIdentity(
        account_id=new_account.id,
        provider=provider,
        provider_account_id=provider_account_id,
    )
    session.add(new_identity)
    session.flush()

    return new_account
