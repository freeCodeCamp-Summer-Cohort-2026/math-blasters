from __future__ import annotations

from typing import Any

from starlette.exceptions import HTTPException as StarletteHTTPException


class APIException(StarletteHTTPException):
    """HTTPException with an explicit error code for the standardized error envelope."""

    def __init__(
        self,
        status_code: int,
        code: str,
        message: str,
        details: Any | None = None,
        headers: dict[str, str] | None = None,
    ):
        super().__init__(status_code=status_code, detail=message, headers=headers)
        self.code = code
        self.details = details
