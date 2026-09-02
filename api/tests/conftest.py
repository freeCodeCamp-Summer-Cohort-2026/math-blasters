"""Test fixtures.

Tests run against a real Postgres so they exercise the same database the app
uses. `docker compose up -d db` gives you one locally; CI uses a `postgres:16`
service container.
"""

from __future__ import annotations

import os
from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

DEFAULT_TEST_DB = "postgresql+psycopg://mathblasters:mathblasters@localhost:5433/mathblasters_test"
# Overwritten, not `setdefault`-ed: the fixtures below drop_all/create_all whatever
# DATABASE_URL points at, and inside the `api` container that variable is already
# set to the *development* database. TEST_DATABASE_URL is the only knob here.
os.environ["DATABASE_URL"] = os.environ.get("TEST_DATABASE_URL", DEFAULT_TEST_DB)

from app.db import get_session  # noqa: E402
from app.main import create_app  # noqa: E402
from app.models import Base  # noqa: E402
from app.seed import seed  # noqa: E402


@pytest.fixture(scope="session")
def engine():
    # Built straight from the models rather than by running migrations: it's
    # much faster, and each test gets a guaranteed-clean schema. The tradeoff
    # is that these tests would not notice a model change with no matching
    # migration -- CI runs `alembic check` for exactly that.
    eng = create_engine(os.environ["DATABASE_URL"], future=True)
    Base.metadata.drop_all(eng)
    Base.metadata.create_all(eng)
    yield eng
    Base.metadata.drop_all(eng)
    eng.dispose()


@pytest.fixture
def session(engine) -> Iterator[Session]:
    """A session wrapped in a transaction that is rolled back after each test."""
    connection = engine.connect()
    transaction = connection.begin()
    # create_savepoint means code under test can call session.commit() freely --
    # it releases a savepoint, and the rollback below still resets the database.
    factory = sessionmaker(
        bind=connection,
        autoflush=False,
        expire_on_commit=False,
        join_transaction_mode="create_savepoint",
    )
    db = factory()
    try:
        yield db
    finally:
        db.close()
        transaction.rollback()
        connection.close()


@pytest.fixture
def client(session: Session) -> Iterator[TestClient]:
    app = create_app()
    app.dependency_overrides[get_session] = lambda: session
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture
def seeded(session: Session) -> Session:
    seed(session)
    return session
