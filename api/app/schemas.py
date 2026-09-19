"""Pydantic request/response models for the API.

Standardized error response envelopes are defined here.
"""

from typing import Any

from pydantic import BaseModel


class ErrorDetail(BaseModel):
    code: str
    message: str
    details: Any | None = None


class ErrorEnvelope(BaseModel):
    error: ErrorDetail


DATABASE_UNAVAILABLE_ERROR = ErrorEnvelope(
    error=ErrorDetail(
        code="internal",
        message="Database Unavailable",
        details=None,
    )
)
