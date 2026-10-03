import pytest
from sqlalchemy import func, select

from app.learner import LEARNER_COOKIE_NAME
from app.models import Account, Completion, Learner


def row_count(session, model):
    return session.scalar(select(func.count()).select_from(model))


def attach_signed_in_account(client, session, *, email: str, token: str) -> Account:
    account = Account(email=email)
    learner = Learner(token=token, account=account)
    session.add_all([account, learner])
    session.flush()
    client.cookies.set(LEARNER_COOKIE_NAME, token)
    return account


def test_known_lesson_creates_completion_for_signed_in_account(client, session):
    account = attach_signed_in_account(client, session, email="first@example.com", token="a" * 43)

    response = client.post(
        "/api/completions",
        json={"lesson_slug": "adding-two-numbers"},
    )

    assert response.status_code == 201
    body = response.json()
    assert set(body) == {"lesson_slug", "completed_at"}
    assert body["lesson_slug"] == "adding-two-numbers"
    assert isinstance(body["completed_at"], str)

    completion = session.get(Completion, (account.id, "adding-two-numbers"))
    assert completion is not None
    assert completion.account_id == account.id
    assert completion.lesson_slug == "adding-two-numbers"


def test_unknown_lesson_returns_404_without_creating_completion(client, session):
    attach_signed_in_account(client, session, email="first@example.com", token="a" * 43)

    response = client.post(
        "/api/completions",
        json={"lesson_slug": "unknown-lesson"},
    )

    assert response.status_code == 404
    assert response.json() == {
        "error": {
            "code": "not_found",
            "message": "Lesson not found",
            "details": None,
        }
    }
    assert row_count(session, Completion) == 0


def test_repeating_completion_preserves_original_timestamp(client, session):
    attach_signed_in_account(client, session, email="first@example.com", token="a" * 43)
    payload = {"lesson_slug": "adding-two-numbers"}

    first_response = client.post("/api/completions", json=payload)
    second_response = client.post("/api/completions", json=payload)

    assert first_response.status_code == 201
    assert second_response.status_code == 200
    assert second_response.json() == first_response.json()
    assert row_count(session, Completion) == 1


def test_same_lesson_can_be_completed_by_a_second_account(client, session):
    first_account = attach_signed_in_account(
        client, session, email="first@example.com", token="a" * 43
    )
    first_response = client.post(
        "/api/completions",
        json={"lesson_slug": "adding-two-numbers"},
    )

    client.cookies.clear()
    second_account = attach_signed_in_account(
        client, session, email="second@example.com", token="b" * 43
    )
    second_response = client.post(
        "/api/completions",
        json={"lesson_slug": "adding-two-numbers"},
    )

    assert first_response.status_code == 201
    assert second_response.status_code == 201
    assert first_account.id != second_account.id
    assert session.get(Completion, (first_account.id, "adding-two-numbers")) is not None
    assert session.get(Completion, (second_account.id, "adding-two-numbers")) is not None
    assert row_count(session, Completion) == 2


def test_signed_out_request_returns_401_without_writing_rows(client, session):
    response = client.post(
        "/api/completions",
        json={"lesson_slug": "adding-two-numbers"},
    )

    assert response.status_code == 401
    assert response.json() == {
        "error": {
            "code": "unauthorized",
            "message": "Not authenticated",
            "details": None,
        }
    }
    assert row_count(session, Completion) == 0
    assert row_count(session, Learner) == 0


@pytest.mark.parametrize(
    "payload",
    [
        {"lesson_slug": "adding-two-numbers", "score": 100},
        {"lesson_slug": ""},
        {"lesson_slug": "a" * 256},
    ],
)
def test_invalid_completion_payload_returns_422(client, session, payload):
    attach_signed_in_account(client, session, email="first@example.com", token="a" * 43)

    response = client.post("/api/completions", json=payload)

    assert response.status_code == 422
    assert response.json()["error"]["code"] == "validation_error"
    assert row_count(session, Completion) == 0
