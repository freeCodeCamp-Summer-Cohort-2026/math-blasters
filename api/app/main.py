"""FastAPI application factory.

`create_app` is used both by `uvicorn app.main:app` and by the test suite, so
tests exercise the same wiring that runs in production.
"""

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.config import get_settings
from app.routers import demo, health
from app.schemas import ErrorDetail, ErrorEnvelope


def status_code_to_error_code(status_code: int) -> str:
    if status_code == status.HTTP_404_NOT_FOUND:
        return "not_found"
    elif status_code in (
        status.HTTP_422_UNPROCESSABLE_ENTITY,
        status.HTTP_422_UNPROCESSABLE_CONTENT,
    ):
        return "validation_error"
    elif status_code == status.HTTP_429_TOO_MANY_REQUESTS:
        return "rate_limited"
    return "internal"


async def http_exception_handler(request: Request, exc: StarletteHTTPException) -> JSONResponse:
    code = status_code_to_error_code(exc.status_code)
    envelope = ErrorEnvelope(
        error=ErrorDetail(
            code=code,
            message=str(exc.detail),
            details=None,
        )
    )
    return JSONResponse(
        status_code=exc.status_code,
        content=envelope.model_dump(),
    )


async def validation_exception_handler(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    envelope = ErrorEnvelope(
        error=ErrorDetail(
            code="validation_error",
            message="Validation error",
            details=exc.errors(),
        )
    )
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY or status.HTTP_422_UNPROCESSABLE_CONTENT,
        content=envelope.model_dump(),
    )


def create_app() -> FastAPI:
    settings = get_settings()

    app = FastAPI(
        title="Math Blasters API",
        version="0.1.0",
        description="Base template. The real API is still to be designed -- see the open issues.",
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # error handlers
    app.add_exception_handler(StarletteHTTPException, http_exception_handler)
    app.add_exception_handler(RequestValidationError, validation_exception_handler)

    for router in (health.router, demo.router):
        app.include_router(router, prefix="/api")

    return app


app = create_app()
