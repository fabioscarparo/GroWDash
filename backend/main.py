"""
GroWDash — Core API Gateway
============================

This module is the primary entry point and orchestrator for the GroWDash
FastAPI backend service.  It bridges the React dashboard frontend with the
external Growatt Cloud API and the Google Smart Home platform.

Key responsibilities
--------------------
Application initialisation
    Bootstraps the FastAPI instance with metadata (title, description,
    version) that is surfaced in the auto-generated OpenAPI schema and
    displayed prominently in the Swagger UI and ReDoc documentation pages.

Rate limiting
    Registers a global slowapi ``Limiter`` on ``app.state`` so every router
    can apply per-endpoint rate limits via the ``@limiter.limit()`` decorator.
    The ``RateLimitExceeded`` exception handler ensures clients receive a
    well-formed HTTP 429 response with a ``Retry-After`` header rather than
    an unhandled 500 error.

CORS policy
    Establishes Cross-Origin Resource Sharing rules that allow the React
    frontend (Vite dev server or the nginx container) to call the API across
    origins.  ``allow_credentials=True`` is required by the HttpOnly cookie
    authentication flow — without it browsers silently drop cookies on
    cross-origin requests regardless of the ``SameSite`` attribute.

Router registration
    Each router module owns a single domain of the API surface.  Keeping them
    separate makes each file independently testable and keeps the total line
    count manageable.  Routers currently registered:

    +-----------------------+--------------------------------------------------+
    | Router                | Endpoints                                        |
    +=======================+==================================================+
    | auth                  | POST /auth/token                                 |
    |                       | POST /auth/logout                                |
    |                       | GET  /auth/me                                    |
    |                       | POST /auth/google-home/code                      |
    +-----------------------+--------------------------------------------------+
    | plant                 | GET  /plant/info                                 |
    +-----------------------+--------------------------------------------------+
    | energy                | GET  /energy/overview                            |
    |                       | GET  /energy/today                               |
    |                       | GET  /energy/history                             |
    |                       | GET  /energy/aggregate                           |
    |                       | GET  /energy/daily-breakdown                     |
    +-----------------------+--------------------------------------------------+
    | device                | GET  /device/list                                |
    |                       | GET  /device/detail                              |
    |                       | GET  /device/settings                            |
    +-----------------------+--------------------------------------------------+
    | weather               | GET  /weather/current                            |
    |                       | GET  /weather/solar-forecast                     |
    +-----------------------+--------------------------------------------------+
    | google_home           | GET  /google-home/auth                           |
    |                       | POST /google-home/token                          |
    |                       | POST /google-home/fulfillment                    |
    +-----------------------+--------------------------------------------------+

Health monitoring
    The root ``GET /`` endpoint returns a static JSON payload so Docker,
    Kubernetes, and reverse-proxy health checks can verify that the uvicorn
    process has started and the application layer has initialised correctly.

Architecture notes — rate limiter
-----------------------------------
The ``Limiter`` instance created here is stored on ``app.state.limiter``.
Individual router modules (e.g. ``routers/auth.py``) also instantiate their
own ``Limiter`` objects with the same ``key_func`` — this is the pattern
recommended by slowapi.  At request time slowapi resolves the active limiter
from ``app.state``, so the router-level instance is only used for the
decorator syntax and the two objects do not conflict.

Architecture notes — Cloudflare Tunnel
---------------------------------------
When deployed behind a Cloudflare Tunnel the ``REMOTE_ADDR`` seen by FastAPI
is the tunnel's internal relay address, not the actual client IP.  Rate
limiting is therefore applied per-relay rather than per-client.  If you need
true per-client rate limiting, configure ``get_remote_address`` to read the
``CF-Connecting-IP`` or ``X-Forwarded-For`` header instead.

Usage
-----
Start the development server with live-reloading::

    $ uvicorn main:app --reload

Interactive API documentation (auto-generated by FastAPI):

    Swagger UI : http://127.0.0.1:8000/docs
    ReDoc      : http://127.0.0.1:8000/redoc
"""

import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from routers import auth, device, energy, google_home, plant, weather
import models
from database import engine
from services.growatt import get_plant_info


# ---------------------------------------------------------------------------
# Rate limiter
# ---------------------------------------------------------------------------
# The limiter is created here and attached to app.state so that slowapi can
# locate it at request time across all router modules.  Individual routers
# import a separate Limiter instance solely for the @limiter.limit() decorator
# syntax — see routers/auth.py for the established pattern.
limiter = Limiter(key_func=get_remote_address)
logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Database initialisation
# ---------------------------------------------------------------------------
# create_all is idempotent: it only creates tables that do not already exist
# and never drops or modifies existing schema.  Safe to run on every startup.
models.Base.metadata.create_all(bind=engine)


# ---------------------------------------------------------------------------
# Application instance
# ---------------------------------------------------------------------------
app = FastAPI(
    title="GroWDash API",
    description=(
        "Comprehensive backend API driving the GroWDash photovoltaic "
        "monitoring dashboard.  Integrates with the Growatt Cloud API, "
        "the Open-Meteo weather service, and the Google Smart Home platform."
    ),
    version="0.1.0",
)


# ---------------------------------------------------------------------------
# Rate limiting registration
# ---------------------------------------------------------------------------
# Attaching the limiter to app.state is the mechanism slowapi uses to resolve
# it during request processing.  The exception handler translates the internal
# RateLimitExceeded exception into an HTTP 429 response with a Retry-After
# header so well-behaved clients know when they may retry.
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


# ---------------------------------------------------------------------------
# CORS middleware
# ---------------------------------------------------------------------------
# Browsers block cross-origin requests by default.  A script served from
# http://localhost:5173 would be blocked from calling http://localhost:8000
# unless the server explicitly grants permission via CORS headers.
#
# allow_credentials=True
#     Required for the HttpOnly cookie authentication flow.  Without this flag
#     browsers omit cookies on cross-origin requests regardless of SameSite.
#
# Production note
#     The list below includes several localhost variants for development.
#     Once the Cloudflare Tunnel domain is stable, add it here and consider
#     removing the generic localhost entries to tighten the policy.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",   # Vite development server
        "http://127.0.0.1:5173",
        "http://localhost:8000",   # FastAPI self-reference (Swagger UI)
        "http://127.0.0.1:8000",
        "http://localhost",        # Docker / LAN access without an explicit port
        "http://127.0.0.1",
    ],
    allow_credentials=True,        # required by the HttpOnly cookie auth flow
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Router registration
# ---------------------------------------------------------------------------
# Mounting order does not affect routing — FastAPI matches paths regardless
# of the order routers are registered.  The order here is simply alphabetical
# within logical groups for readability.
app.include_router(auth.router)         # session management + Google Home OAuth codes
app.include_router(plant.router)        # plant metadata
app.include_router(energy.router)       # energy data, history, breakdown
app.include_router(device.router)       # inverter telemetry and settings
app.include_router(weather.router)      # weather + solar irradiance forecast
app.include_router(google_home.router)  # Google Smart Home Action fulfillment


@app.on_event("startup")
def warmup_external_caches() -> None:
    """
    Prime the most requested Growatt cache so first-page weather calls are stable.
    """
    try:
        get_plant_info()
        logger.info("Warmup complete: plant info cache primed.")
    except Exception as exc:
        logger.warning("Warmup skipped: unable to fetch plant info (%s)", exc)


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------

@app.get("/", summary="System health check", tags=["General"])
def root():
    """
    Lightweight liveness probe for the GroWDash API.

    Returns a static JSON payload to confirm that the uvicorn process is
    running and the application has initialised successfully.  Performs no
    database queries, cache lookups, or external API calls.

    Intended consumers
    ------------------
    - Docker ``HEALTHCHECK`` directives.
    - Kubernetes liveness and readiness probes.
    - Nginx and Cloudflare upstream health checks.
    - Developers verifying the server has bound to the expected port.

    Returns:
        dict: ``{"message": "GroWDash API operates nominally and is ready to accept requests."}``
    """
    return {"message": "GroWDash API operates nominally and is ready to accept requests."}
