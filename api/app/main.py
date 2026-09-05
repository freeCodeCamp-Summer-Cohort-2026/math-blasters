"""FastAPI application factory.

`create_app` is used both by `uvicorn app.main:app` and by the test suite, so
tests exercise the same wiring that runs in production.
"""

import json
import logging
import re
import time
import uuid

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response

from app.config import get_settings
from app.routers import demo, health

logger = logging.getLogger("api.requests")
SAFE_REQUEST_ID = re.compile(r"^[A-Za-z0-9._:-]{1,128}$")


def configure_request_logger(level_name: str) -> None:
    level = getattr(logging, level_name.upper(), None)
    if not isinstance(level, int):
        raise ValueError(f"Invalid LOG_LEVEL: {level_name}")
    logger.setLevel(level)
    if not logger.hasHandlers():
        handler = logging.StreamHandler()
        handler.setFormatter(logging.Formatter("%(message)s"))
        logger.addHandler(handler)


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        start_time = time.perf_counter()
        inbound_request_id = request.headers.get("X-Request-ID", "")
        request_id = (
            inbound_request_id
            if SAFE_REQUEST_ID.fullmatch(inbound_request_id)
            else str(uuid.uuid4())
        )
        status = 500
        exception = None

        try:
            response = await call_next(request)
            response.headers["X-Request-ID"] = request_id
            status = response.status_code
            return response
        except Exception as exc:
            exception = exc
            raise
        finally:
            log_record = {
                "method": request.method,
                "path": request.url.path,
                "status": status,
                "duration_ms": round((time.perf_counter() - start_time) * 1000, 2),
                "request_id": request_id,
            }
            if exception is not None:
                log_record["error"] = type(exception).__name__
                log_record["error_message"] = str(exception)
            logger.log(logging.ERROR if exception else logging.INFO, json.dumps(log_record))


def create_app() -> FastAPI:
    settings = get_settings()
    configure_request_logger(settings.log_level)

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
        expose_headers=["X-Request-ID"],
    )
    # Add last so this middleware is outermost and logs CORS preflight responses.
    app.add_middleware(RequestLoggingMiddleware)

    for router in (health.router, demo.router):
        app.include_router(router, prefix="/api")

    return app


app = create_app()
