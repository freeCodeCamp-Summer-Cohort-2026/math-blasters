"""Pydantic request/response models for the demo endpoint.

Placeholder alongside `models.DemoProblem` -- replace when the real content
model lands (issues #19, #20, #21).
"""

from typing import Any

from pydantic import BaseModel, ConfigDict


class DemoProblemOut(BaseModel):
    """Note the absence of `answer`: the client is never told the solution."""

    model_config = ConfigDict(from_attributes=True)

    slug: str
    prompt: str
    expression: str


class CheckRequest(BaseModel):
    answer: int


class CheckResponse(BaseModel):
    correct: bool


class ErrorDetail(BaseModel):
    code: str
    message: str
    details: Any | None = None


class ErrorEnvelope(BaseModel):
    error: ErrorDetail
