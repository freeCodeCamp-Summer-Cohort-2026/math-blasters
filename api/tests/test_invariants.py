"""Architectural invariant and API contract tests."""

import re

from fastapi import APIRouter
from fastapi.testclient import TestClient
from pydantic import BaseModel

from app.main import create_app


def test_answer_never_reaches_the_client(client):
    """Invariant: No API response carries an expected value or solution."""
    forbidden_terms = {"answer", "expected", "solution", "correct_answer"}

    openapi_schema = client.app.openapi()
    for path, path_item in openapi_schema.get("paths", {}).items():
        assert "/check" not in path.lower(), f"Forbidden grading path found: {path}"
        assert "/grade" not in path.lower(), f"Forbidden grading path found: {path}"

        for method, op in path_item.items():
            if not isinstance(op, dict):
                continue
            responses = op.get("responses", {})
            for status_code, resp in responses.items():
                content = resp.get("content", {})
                for _media_type, media_schema in content.items():
                    schema_str = str(media_schema).lower()
                    for term in forbidden_terms:
                        assert term not in schema_str, (
                            f"API route {method.upper()} {path} response {status_code} "
                            f"schema mentions '{term}'."
                        )

    components = openapi_schema.get("components", {}).get("schemas", {})
    for schema_name, schema_def in components.items():
        schema_str = str(schema_def).lower()
        for term in forbidden_terms:
            assert term not in schema_str, (
                f"OpenAPI schema '{schema_name}' mentions forbidden content field '{term}'."
            )

    standard_methods = {"GET", "POST", "PUT", "PATCH", "DELETE"}
    for route in client.app.routes:
        raw_path = getattr(route, "path", "")
        methods = getattr(route, "methods", set())
        if not raw_path.startswith("/api"):
            continue
        
        path = re.sub(r"\{[^}]+\}", "dummy", raw_path)

        for method in sorted(methods & standard_methods):
            payloads = [{}] if method == "GET" else [{"json": {}}, {}]
            for kwargs in payloads:
                response = client.request(method, path, **kwargs)
                for term in forbidden_terms:
                    assert term not in response.text.lower(), (
                        f"{method} {path} returned content containing forbidden term '{term}'."
                    )


def test_error_envelope_structure_for_404(client):
    """404 Not Found returns the standardized error envelope."""
    resp_404 = client.get("/api/nonexistent-route")
    assert resp_404.status_code == 404
    data_404 = resp_404.json()
    assert data_404["error"]["code"] == "not_found"
    assert "message" in data_404["error"]
    assert data_404["error"]["details"] is None


def test_validation_error_envelope_and_non_finite_numbers():
    """422 Validation Error returns the envelope and sanitizes non-finite floats."""

    class DummyPayload(BaseModel):
        count: int

    test_router = APIRouter()

    @test_router.post("/test-validation")
    def _validate_endpoint(payload: DummyPayload):
        return {"count": payload.count}

    isolated_app = create_app()
    isolated_app.include_router(test_router)

    with TestClient(isolated_app) as test_client:
        resp_422 = test_client.post("/test-validation", json={"count": "banana"})
        assert resp_422.status_code == 422
        data_422 = resp_422.json()
        assert data_422["error"]["code"] == "validation_error"
        assert "details" in data_422["error"]

        for literal in ("NaN", "Infinity", "-Infinity"):
            response = test_client.post(
                "/test-validation",
                content=f'{{"count": {literal}}}',
                headers={"Content-Type": "application/json"},
            )
            assert response.status_code == 422
            assert response.json()["error"]["details"][0]["input"] is None
