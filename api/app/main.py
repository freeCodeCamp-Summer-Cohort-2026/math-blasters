"""FastAPI application factory.

`create_app` is used both by `uvicorn app.main:app` and by the test suite, so
tests exercise the same wiring that runs in production.
"""

import json
import logging
import time
import uuid

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.routers import demo, health

logger = logging.getLogger("api.requests")


def configure_request_logger(level_name: str) -> None:
    level = getattr(logging, level_name.upper(), None)
    if not isinstance(level, int):
        raise ValueError(f"Invalid LOG_LEVEL: {level_name}")
    logger.setLevel(level)


def create_app() -> FastAPI:
    settings = get_settings()
    configure_request_logger(settings.log_level)

    app = FastAPI(
        title="Math Blasters API",
        version="0.1.0",
        description="Base template. The real API is still to be designed -- see the open issues.",
    )

    @app.middleware("http")
    async def request_logging_middleware(request: Request, call_next):
        start_time = time.perf_counter()
        request_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())
        status = 500

        try:
            response = await call_next(request)
            response.headers["X-Request-ID"] = request_id
            status = response.status_code
            return response
        finally:
            logger.info(
                json.dumps(
                    {
                        "method": request.method,
                        "path": request.url.path,
                        "status": status,
                        "duration_ms": round((time.perf_counter() - start_time) * 1000, 2),
                        "request_id": request_id,
                    }
                )
            )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["X-Request-ID"],
    )

    for router in (health.router, demo.router):
        app.include_router(router, prefix="/api")

    return app


app = create_app()
