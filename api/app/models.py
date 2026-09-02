"""SQLAlchemy models.

There is exactly one table here, and it is a **placeholder**.

`DemoProblem` exists only to prove the wiring works end to end: Postgres ->
SQLAlchemy -> FastAPI -> React. It is intentionally not a content model. It
has no notion of topics, lessons, tutorials, labs, steps or success criteria,
and it should be deleted once a real schema exists.

Designing the real content model is issues #19, #20 and #21. Please don't
extend this table into one -- start from the ticket.
"""

from sqlalchemy import Integer, String, Text
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


class DemoProblem(Base):
    """A single hardcoded arithmetic question. Placeholder -- see module docstring."""

    __tablename__ = "demo_problems"

    id: Mapped[int] = mapped_column(primary_key=True)
    slug: Mapped[str] = mapped_column(String(80), unique=True, index=True)
    prompt: Mapped[str] = mapped_column(Text)
    # Rendered above the answer box, e.g. "3 + 4 = ?".
    expression: Mapped[str] = mapped_column(String(120))
    answer: Mapped[int] = mapped_column(Integer)
