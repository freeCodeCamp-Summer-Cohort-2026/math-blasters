from app.models import Account, Completion, Learner
from tests.helpers import attach_signed_in_account, row_count


def test_signed_out_progress_is_empty_and_does_not_create_learner(client, session):
    response = client.get("/api/progress")

    assert response.status_code == 200
    assert response.json() == []
    assert row_count(session, Learner) == 0


def test_signed_in_account_without_completions_gets_empty_list(client, session):
    attach_signed_in_account(client, session, email="first@example.com", token="a" * 43)

    response = client.get("/api/progress")

    assert response.status_code == 200
    assert response.json() == []


def test_progress_returns_only_signed_in_accounts_lesson_slugs(client, session):
    account = attach_signed_in_account(client, session, email="first@example.com", token="a" * 43)
    other_account = Account(email="second@example.com")
    session.add(other_account)
    session.flush()

    session.add_all(
        [
            Completion(account_id=account.id, lesson_slug="making-ten"),
            Completion(account_id=account.id, lesson_slug="adding-two-numbers"),
            Completion(account_id=other_account.id, lesson_slug="counting-on"),
        ]
    )
    session.flush()

    response = client.get("/api/progress")

    assert response.status_code == 200
    assert response.json() == ["adding-two-numbers", "making-ten"]


def test_signed_in_account_completion_round_trip(client, session):
    """Full-path test: a signed-in account posts a slug from content/manifest.json,
    and GET /api/progress returns it.
    """
    attach_signed_in_account(client, session, email="learner@example.com", token="a" * 43)

    first_slug = "adding-two-numbers"
    second_slug = "making-ten"
    assert first_slug in client.app.state.lesson_slugs
    assert second_slug in client.app.state.lesson_slugs

    # Progress starts empty for a fresh account
    initial_progress = client.get("/api/progress")
    assert initial_progress.status_code == 200
    assert initial_progress.json() == []

    # POST first completion
    post_resp = client.post("/api/completions", json={"lesson_slug": first_slug})
    assert post_resp.status_code == 201
    assert post_resp.json()["lesson_slug"] == first_slug
    assert isinstance(post_resp.json()["completed_at"], str)

    # Progress now reflects the first slug
    progress_resp = client.get("/api/progress")
    assert progress_resp.status_code == 200
    assert progress_resp.json() == [first_slug]

    # POST second completion
    second_resp = client.post("/api/completions", json={"lesson_slug": second_slug})
    assert second_resp.status_code == 201

    # Progress returns both completed slugs
    progress_resp = client.get("/api/progress")
    assert progress_resp.status_code == 200
    assert progress_resp.json() == [first_slug, second_slug]

    # Repeating a completion is idempotent and doesn't duplicate
    repeat_resp = client.post("/api/completions", json={"lesson_slug": first_slug})
    assert repeat_resp.status_code == 200
    assert repeat_resp.json()["lesson_slug"] == first_slug
    assert isinstance(repeat_resp.json()["completed_at"], str)
    assert repeat_resp.json()["completed_at"] == post_resp.json()["completed_at"]
    assert client.get("/api/progress").json() == [first_slug, second_slug]

    # Signed-out client gets empty progress
    client.cookies.clear()
    signed_out_resp = client.get("/api/progress")
    assert signed_out_resp.status_code == 200
    assert signed_out_resp.json() == []

    # Another signed-in account sees their own (empty) progress
    attach_signed_in_account(client, session, email="other@example.com", token="b" * 43)
    other_resp = client.get("/api/progress")
    assert other_resp.status_code == 200
    assert other_resp.json() == []
