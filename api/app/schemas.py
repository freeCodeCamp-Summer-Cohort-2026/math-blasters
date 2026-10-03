"""Pydantic request/response models for the API.

Standardized error response envelopes are defined here.
"""

from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class ErrorDetail(BaseModel):
    code: str
    message: str
    details: Any | None = None


class ErrorEnvelope(BaseModel):
    error: ErrorDetail


class AccountMeGetResponse(BaseModel):
    display_name: str | None
    avatar_url: str | None
    email: str | None
    providers: list[str]


class CompletionPostRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    lesson_slug: str = Field(min_length=1, max_length=255)


class CompletionResponse(BaseModel):
    lesson_slug: str
    completed_at: datetime
