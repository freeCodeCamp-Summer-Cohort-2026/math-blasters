import json


def test_health_reports_ok(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_health_returns_generated_request_id(client):
    response = client.get("/api/health")

    assert response.headers["X-Request-ID"]


def test_health_preserves_inbound_request_id(client):
    request_id = "debug-session-id-1"

    response = client.get("/api/health", headers={"X-Request-ID": request_id})

    assert response.headers["X-Request-ID"] == request_id


def test_health_replaces_unsafe_inbound_request_id(client):
    request_id = "bad request-id"
    response = client.get("/api/health", headers={"X-Request-ID": request_id})

    assert response.headers["X-Request-ID"] != request_id
    assert response.headers["X-Request-ID"]


def test_health_emits_structured_request_log(client, caplog):
    request_id = "debug-session-id-2"

    with caplog.at_level("INFO", logger="api.requests"):
        response = client.get("/api/health", headers={"X-Request-ID": request_id})

    records = [record for record in caplog.records if record.name == "api.requests"]
    assert len(records) == 1
    log_record = json.loads(records[0].message)
    assert log_record["method"] == "GET"
    assert log_record["path"] == "/api/health"
    assert log_record["status"] == response.status_code
    assert isinstance(log_record["duration_ms"], (int, float))
    assert log_record["request_id"] == request_id
