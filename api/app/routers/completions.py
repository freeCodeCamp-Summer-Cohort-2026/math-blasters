from fastapi import APIRouter, HTTPException, Response, status
from sqlalchemy.dialects.postgresql import insert

from app.auth import CurrentAccountDep
from app.content_manifest import lesson_slug_exists
from app.db import SessionDep
from app.models import Completion
from app.schemas import CompletionPostRequest, CompletionResponse

router = APIRouter(prefix="/completions", tags=["completions"])


@router.post(
    "",
    response_model=CompletionResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_completion(
    payload: CompletionPostRequest,
    response: Response,
    account: CurrentAccountDep,
    session: SessionDep,
) -> CompletionResponse:
    # The manifest check must pass before the completion table is written.
    if not lesson_slug_exists(payload.lesson_slug):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lesson not found",
        )

    statement = (
        insert(Completion)
        .values(account_id=account.id, lesson_slug=payload.lesson_slug)
        .on_conflict_do_nothing(index_elements=[Completion.account_id, Completion.lesson_slug])
        .returning(Completion.completed_at)
    )
    completed_at = session.execute(statement).scalar_one_or_none()

    if completed_at is None:
        existing = session.get(Completion, (account.id, payload.lesson_slug))
        completed_at = existing.completed_at
        response.status_code = status.HTTP_200_OK

    session.commit()
    return CompletionResponse(
        lesson_slug=payload.lesson_slug,
        completed_at=completed_at,
    )
