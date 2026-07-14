"""WhatDish backend — FastAPI app wiring the three frontend endpoints.

    POST /api/menus/scan        multipart "image" -> RestaurantMenu
    POST /api/pronunciations    { name }          -> PronunciationResult
    GET  /api/dishes/{id}/audio                    -> { audioUrl }
"""
from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .config import get_settings
from .routers import dishes, menus, pronunciations

settings = get_settings()

logging.basicConfig(
    level=getattr(logging, settings.log_level, logging.INFO),
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)
logger = logging.getLogger("whatdish")


@asynccontextmanager
async def lifespan(_app: FastAPI):
    for message in settings.warnings():
        logger.warning(message)
    logger.info(
        "WhatDish API up | env=%s model=%s guardrail=%s ai_enabled=%s docs=%s",
        settings.app_env,
        settings.model,
        settings.guardrail_model,
        settings.ai_enabled,
        settings.enable_docs,
    )
    yield


# Hide interactive docs (Swagger/ReDoc/OpenAPI) unless enabled — off in prod by default.
_docs = {} if settings.enable_docs else {"docs_url": None, "redoc_url": None, "openapi_url": None}

app = FastAPI(
    title="WhatDish API", version="1.0.0", debug=settings.debug, lifespan=lifespan, **_docs
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(menus.router)
app.include_router(pronunciations.router)
app.include_router(dishes.router)


@app.exception_handler(Exception)
async def _unhandled_exception(request: Request, exc: Exception) -> JSONResponse:
    """Last-resort handler: log via our logger and return a consistent body.

    HTTPException and validation errors keep their own handlers; this only
    catches genuinely unexpected errors (which would otherwise be a bare 500).
    """
    logger.exception("Unhandled error on %s %s", request.method, request.url.path)
    return JSONResponse(status_code=500, content={"message": "Internal server error"})


@app.get("/api/health", tags=["health"])
def health() -> dict[str, object]:
    return {
        "status": "ok",
        "env": settings.app_env,
        "aiEnabled": settings.ai_enabled,
        "model": settings.model,
    }
