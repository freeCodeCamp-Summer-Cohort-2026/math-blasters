from fastapi import APIRouter
from sqlalchemy import select

from app.auth import OptionalCurrentAccountDep
from app.db import SessionDep
from app.models import Completion

router = APIRouter(prefix="/progress", tags=["progress"])


@router.get("", response_model=list[str])
def get_progress(
    account: OptionalCurrentAccountDep,
    session: SessionDep,
) -> list[str]:
    if account is None:
        return []

    statement = (
        select(Completion.lesson_slug)
        .where(Completion.account_id == account.id)
        .order_by(Completion.lesson_slug)
    )
    return list(session.scalars(statement).all())
