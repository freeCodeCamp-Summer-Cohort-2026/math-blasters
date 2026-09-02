"""FastAPI application factory.

`create_app` is used both by `uvicorn app.main:app` and by the test suite, so
tests exercise the same wiring that runs in production.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.routers import demo, health


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

    for router in (health.router, demo.router):
        app.include_router(router, prefix="/api")

    return app


app = create_app()
