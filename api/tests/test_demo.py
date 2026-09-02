"""Tests for the placeholder demo endpoint.

These cover the wiring, not the product. When the real content model lands
(issues #19-#21) these should be replaced wholesale.
"""

from app.seed import DEMO_PROBLEM


def test_problem_is_served(client, seeded):
    response = client.get("/api/demo/problem")
    assert response.status_code == 200

    body = response.json()
    assert body["prompt"] == DEMO_PROBLEM["prompt"]
    assert body["expression"] == DEMO_PROBLEM["expression"]


def test_answer_never_reaches_the_client(client, seeded):
    assert "answer" not in client.get("/api/demo/problem").text


def test_missing_seed_explains_how_to_fix_it(client):
    response = client.get("/api/demo/problem")
    assert response.status_code == 404
    assert "app.seed" in response.json()["detail"]


def test_correct_answer(client, seeded):
    response = client.post("/api/demo/check", json={"answer": DEMO_PROBLEM["answer"]})
    assert response.status_code == 200
    assert response.json() == {"correct": True}


def test_wrong_answer(client, seeded):
    response = client.post("/api/demo/check", json={"answer": DEMO_PROBLEM["answer"] + 1})
    assert response.status_code == 200
    assert response.json() == {"correct": False}


def test_non_numeric_answer_is_rejected(client, seeded):
    assert client.post("/api/demo/check", json={"answer": "banana"}).status_code == 422


def test_seed_is_idempotent(session):
    from app.models import DemoProblem
    from app.seed import seed

    seed(session)
    seed(session)

    assert session.query(DemoProblem).count() == 1
