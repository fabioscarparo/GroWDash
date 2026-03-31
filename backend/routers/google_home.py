"""
Google Smart Home Action — OAuth2 + Fulfillment Router
=======================================================

This module implements the server-side half of a Google Smart Home Action,
exposing GroWDash's live inverter data as read-only sensor devices that
Google Home can discover, query, and surface through the Google Assistant.

Architecture overview
---------------------
Google communicates with this router in two distinct phases:

Account linking (OAuth2 Authorization Code flow)
    1. The user taps "Link account" inside the Google Home app.
    2. Google redirects to ``GET /google-home/auth``, which validates the
       ``client_id`` and ``redirect_uri`` and forwards the user to the
       GroWDash frontend linking page.
    3. The user confirms on the frontend; the frontend calls
       ``POST /auth/google-home/code`` to obtain a one-time JWT code.
    4. The frontend redirects back to Google with the code in the query string.
    5. Google immediately calls ``POST /google-home/token`` to exchange the
       code for a long-lived access token and a refresh token.
    6. All subsequent calls from Google carry the access token in the
       ``Authorization: Bearer <token>`` header.

Runtime fulfillment (Smart Home intents)
    Google sends JSON POST requests to ``POST /google-home/fulfillment``
    whenever it needs to sync the device list (``SYNC``), read current sensor
    values (``QUERY``), or disconnect the account (``DISCONNECT``).  Execute
    intents are rejected because sensors are read-only by design.

Exposed devices
---------------
All five devices share the ``action.devices.types.SENSOR`` type and the
``action.devices.traits.SensorState`` trait, making their numeric values
readable through routines, dashboards, and voice queries.

+---------------------+------------------+-------+----------+
| Device ID           | Display name     | Unit  | Source   |
+=====================+==================+=======+==========+
| solar_sensor        | Solar Production | Watts | ppv      |
+---------------------+------------------+-------+----------+
| home_sensor         | Home Consumption | Watts | pacToLocalLoad |
+---------------------+------------------+-------+----------+
| battery_sensor      | Battery SOC      | %     | bmsSoc   |
+---------------------+------------------+-------+----------+
| grid_import_sensor  | Grid Import      | Watts | pacToUserTotal |
+---------------------+------------------+-------+----------+
| grid_export_sensor  | Grid Export      | Watts | pacToGridTotal |
+---------------------+------------------+-------+----------+

Security hardening
------------------
redirect_uri whitelist
    ``GET /google-home/auth`` only accepts the two redirect URIs owned by
    Google (production and sandbox).  Any other value triggers HTTP 400,
    preventing open-redirect attacks that could redirect the authorization
    code to an attacker-controlled endpoint.

Audience-scoped tokens
    ``POST /google-home/token`` mints JWTs with ``aud: "google-home"``.
    ``_verify_google_token`` enforces this audience claim at every
    fulfillment call, so a stolen GroWDash session cookie cannot be used
    to impersonate Google, and vice-versa.

One-time-use authorization codes
    Each code received by ``POST /google-home/token`` is SHA-256-hashed and
    stored in the in-memory set ``_used_codes``.  A second attempt with the
    same code is rejected immediately, eliminating replay attacks within the
    5-minute code TTL window.

    Note: ``_used_codes`` is an in-memory set and is cleared on container
    restart.  For a multi-instance deployment, replace it with a shared
    store such as Redis.

purpose claim
    Authorization codes carry ``purpose: "google-home-oauth"``.  The token
    endpoint refuses any code that lacks this claim, ensuring that a regular
    session JWT cannot be submitted as an OAuth code.

Required environment variables
-------------------------------
GOOGLE_CLIENT_ID     : OAuth2 client ID from Google Cloud Console.
GOOGLE_CLIENT_SECRET : OAuth2 client secret from Google Cloud Console.
GOOGLE_PROJECT_ID    : Actions Console project ID (used to build the
                       redirect URI whitelist, e.g. ``growdash-ab1234``).
FRONTEND_URL         : Base URL of the React frontend, used for the
                       redirect to the linking page
                       (e.g. ``https://your-domain.com``).
JWT_SECRET_KEY       : Shared secret used to sign and verify all JWTs.
"""

from datetime import timedelta
from fastapi import APIRouter, Form, HTTPException, Request
from fastapi.responses import RedirectResponse
from services.growatt import get_energy_today
from auth import create_access_token
import hashlib
import os
import jwt

router = APIRouter(
    prefix="/google-home",
    tags=["Google Home"],
)

# ---------------------------------------------------------------------------
# Module-level configuration
# ---------------------------------------------------------------------------

GOOGLE_CLIENT_ID     = os.getenv("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")

# Hard-coded whitelist of the only redirect URIs Google ever sends.
# Built at import time from the project ID so the set is never empty even
# before the first request arrives.
_project_id = os.getenv("GOOGLE_PROJECT_ID", "")
ALLOWED_REDIRECT_URIS: set[str] = {
    f"https://oauth-redirect.googleusercontent.com/r/{_project_id}",
    f"https://oauth-redirect-sandbox.googleusercontent.com/r/{_project_id}",
}

# In-memory set of SHA-256 hashes of already-consumed authorization codes.
# Prevents replay attacks within the 5-minute code TTL window.
_used_codes: set[str] = set()

# ---------------------------------------------------------------------------
# Device definitions
# ---------------------------------------------------------------------------

#: Static device manifest returned to Google on every SYNC intent.
#: Changing a device's ``id`` will cause Google to re-discover it as a new
#: device, so treat these identifiers as stable public API.
DEVICES: list[dict] = [
    {
        "id": "solar_sensor",
        "type": "action.devices.types.SENSOR",
        "traits": ["action.devices.traits.SensorState"],
        "name": {
            "name": "Solar Production",
            "defaultNames": ["Solar Power", "PV Output"],
        },
        "willReportState": False,
        "attributes": {
            "sensorStatesSupported": [
                {
                    "name": "SolarPower",
                    "numericCapabilities": {"rawValueUnit": "WATTS"},
                }
            ]
        },
        "deviceInfo": {"manufacturer": "GroWDash", "model": "Solar Sensor"},
    },
    {
        "id": "home_sensor",
        "type": "action.devices.types.SENSOR",
        "traits": ["action.devices.traits.SensorState"],
        "name": {
            "name": "Home Consumption",
            "defaultNames": ["Home Power", "Load Power"],
        },
        "willReportState": False,
        "attributes": {
            "sensorStatesSupported": [
                {
                    "name": "HomePower",
                    "numericCapabilities": {"rawValueUnit": "WATTS"},
                }
            ]
        },
        "deviceInfo": {"manufacturer": "GroWDash", "model": "Home Sensor"},
    },
    {
        "id": "battery_sensor",
        "type": "action.devices.types.SENSOR",
        "traits": ["action.devices.traits.SensorState"],
        "name": {
            "name": "Battery",
            "defaultNames": ["Battery SOC", "Battery Charge"],
        },
        "willReportState": False,
        "attributes": {
            "sensorStatesSupported": [
                {
                    "name": "BatterySOC",
                    "numericCapabilities": {"rawValueUnit": "PERCENTAGE"},
                }
            ]
        },
        "deviceInfo": {"manufacturer": "GroWDash", "model": "Battery Sensor"},
    },
    {
        "id": "grid_import_sensor",
        "type": "action.devices.types.SENSOR",
        "traits": ["action.devices.traits.SensorState"],
        "name": {
            "name": "Grid Import",
            "defaultNames": ["Grid Download", "Power from Grid"],
        },
        "willReportState": False,
        "attributes": {
            "sensorStatesSupported": [
                {
                    "name": "GridImport",
                    "numericCapabilities": {"rawValueUnit": "WATTS"},
                }
            ]
        },
        "deviceInfo": {"manufacturer": "GroWDash", "model": "Grid Sensor"},
    },
    {
        "id": "grid_export_sensor",
        "type": "action.devices.types.SENSOR",
        "traits": ["action.devices.traits.SensorState"],
        "name": {
            "name": "Grid Export",
            "defaultNames": ["Grid Upload", "Power to Grid"],
        },
        "willReportState": False,
        "attributes": {
            "sensorStatesSupported": [
                {
                    "name": "GridExport",
                    "numericCapabilities": {"rawValueUnit": "WATTS"},
                }
            ]
        },
        "deviceInfo": {"manufacturer": "GroWDash", "model": "Grid Sensor"},
    },
]

# ---------------------------------------------------------------------------
# Private helpers
# ---------------------------------------------------------------------------

def _get_live_states() -> dict:
    """
    Fetch the latest inverter snapshot and map it to the Google Home
    device state format required by QUERY intent responses.

    Each entry is keyed by device ID and contains the fields Google expects:
    ``status``, ``online``, and ``currentSensorStateData``.

    Returns an empty dict if the Growatt API is unavailable, which causes
    the fulfillment handler to return ``status: OFFLINE`` for every device.

    Returns:
        dict: Mapping of device ID → Google Home state object, or ``{}``
              when no data is available.
    """
    data = get_energy_today()
    if not data:
        return {}

    return {
        "solar_sensor": {
            "status": "SUCCESS",
            "online": True,
            "currentSensorStateData": [
                {"name": "SolarPower", "rawValue": data.get("ppv", 0)}
            ],
        },
        "home_sensor": {
            "status": "SUCCESS",
            "online": True,
            "currentSensorStateData": [
                {"name": "HomePower", "rawValue": data.get("pacToLocalLoad", 0)}
            ],
        },
        "battery_sensor": {
            "status": "SUCCESS",
            "online": True,
            "currentSensorStateData": [
                {"name": "BatterySOC", "rawValue": data.get("bmsSoc", 0)}
            ],
        },
        "grid_import_sensor": {
            "status": "SUCCESS",
            "online": True,
            "currentSensorStateData": [
                {"name": "GridImport", "rawValue": data.get("pacToUserTotal", 0)}
            ],
        },
        "grid_export_sensor": {
            "status": "SUCCESS",
            "online": True,
            "currentSensorStateData": [
                {"name": "GridExport", "rawValue": data.get("pacToGridTotal", 0)}
            ],
        },
    }


def _verify_google_token(token: str) -> str:
    """
    Decode and validate a Bearer token sent by Google to the fulfillment
    endpoint, enforcing that it was explicitly minted for this service.

    Validation steps
    ----------------
    1. Decode the JWT using the shared ``JWT_SECRET_KEY``.
    2. Enforce ``aud == "google-home"`` via the PyJWT ``audience`` parameter.
       This rejects any token that was not issued by ``POST /google-home/token``,
       including ordinary GroWDash session cookies.
    3. Expiry is checked automatically by PyJWT; expired tokens raise
       ``ExpiredSignatureError`` which is translated to HTTP 401.

    Args:
        token: Raw JWT string extracted from the ``Authorization`` header.

    Returns:
        str: The ``sub`` claim value (the GroWDash username).

    Raises:
        HTTPException 401: Token is expired, has wrong audience, or is
                           otherwise invalid.
        HTTPException 500: ``JWT_SECRET_KEY`` is not set in the environment
                           (configuration error, should never reach production).
    """
    secret = os.getenv("JWT_SECRET_KEY")
    if not secret:
        raise HTTPException(status_code=500, detail="Server misconfigured: missing JWT_SECRET_KEY")

    try:
        payload = jwt.decode(
            token,
            secret,
            algorithms=["HS256"],
            audience="google-home",   # rejects tokens without this exact aud claim
        )
        return payload.get("sub")
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


# ---------------------------------------------------------------------------
# OAuth2 endpoints
# ---------------------------------------------------------------------------

@router.get("/auth")
def oauth_authorize(client_id: str, redirect_uri: str, state: str):
    """
    OAuth2 authorization entry point — redirects to the GroWDash linking page.

    Google calls this endpoint when the user begins the account linking flow
    inside the Google Home app.  After validating the incoming parameters the
    handler forwards the user to ``/google-home-link`` on the frontend, passing
    all OAuth context as query parameters so the React page can complete the
    handshake.

    Security
    --------
    ``client_id`` is compared against ``GOOGLE_CLIENT_ID`` from the environment.
    ``redirect_uri`` is matched against ``ALLOWED_REDIRECT_URIS``, a set that
    only contains the two Google-owned callback domains.  Any other value is
    rejected with HTTP 400 to prevent open-redirect abuse.

    Args:
        client_id:    OAuth2 client identifier sent by Google.
        redirect_uri: The Google-owned URL to redirect back to after auth.
        state:        Opaque CSRF token that must be echoed back to Google.

    Returns:
        RedirectResponse: 307 redirect to the frontend linking page.

    Raises:
        HTTPException 400: ``client_id`` does not match or ``redirect_uri``
                           is not in the whitelist.
    """
    if client_id != GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=400, detail="Invalid client_id")

    if redirect_uri not in ALLOWED_REDIRECT_URIS:
        raise HTTPException(status_code=400, detail="Invalid redirect_uri")

    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
    return RedirectResponse(
        f"{frontend_url}/google-home-link"
        f"?redirect_uri={redirect_uri}&state={state}&client_id={client_id}"
    )


@router.post("/token")
async def oauth_token(
    grant_type: str = Form(...),
    code: str = Form(None),
    refresh_token: str = Form(None),
    client_id: str = Form(...),
    client_secret: str = Form(...),
):
    """
    Exchange an authorization code or refresh token for a Google Home access token.

    This endpoint is called exclusively by Google's OAuth2 infrastructure — never
    directly by the frontend.  It supports two grant types:

    ``authorization_code``
        Validates and consumes the one-time JWT code issued by
        ``POST /auth/google-home/code``, then returns a 1-hour access token and a
        30-day refresh token.  Both tokens carry ``aud: "google-home"`` so they
        cannot be used against any other GroWDash endpoint.

    ``refresh_token``
        Issues a fresh 1-hour access token in exchange for a valid refresh token.
        The refresh token must also carry ``aud: "google-home"``.

    One-time code enforcement
    -------------------------
    On ``authorization_code`` grant, the raw code is hashed with SHA-256 and
    stored in ``_used_codes``.  Any subsequent request with the same code is
    immediately rejected, preventing replay attacks within the 5-minute TTL.

    Args:
        grant_type:    ``"authorization_code"`` or ``"refresh_token"``.
        code:          One-time JWT code (required for authorization_code).
        refresh_token: Refresh JWT (required for refresh_token).
        client_id:     Must match ``GOOGLE_CLIENT_ID``.
        client_secret: Must match ``GOOGLE_CLIENT_SECRET``.

    Returns:
        dict: OAuth2 token response containing ``token_type``, ``access_token``,
              ``expires_in``, and (for authorization_code) ``refresh_token``.

    Raises:
        HTTPException 400: Missing or already-used code, wrong purpose claim,
                           invalid JWT, or unsupported grant type.
        HTTPException 401: Client credentials do not match.
    """
    if client_id != GOOGLE_CLIENT_ID or client_secret != GOOGLE_CLIENT_SECRET:
        raise HTTPException(status_code=401, detail="Invalid client credentials")

    secret = os.getenv("JWT_SECRET_KEY")

    # ── Authorization code grant ──────────────────────────────────────────
    if grant_type == "authorization_code":
        if not code:
            raise HTTPException(status_code=400, detail="Missing code")

        # Reject replayed codes before touching the JWT
        code_hash = hashlib.sha256(code.encode()).hexdigest()
        if code_hash in _used_codes:
            raise HTTPException(status_code=400, detail="Code already used")

        try:
            payload = jwt.decode(code, secret, algorithms=["HS256"])
            if payload.get("purpose") != "google-home-oauth":
                raise HTTPException(status_code=400, detail="Invalid code type")
            username = payload.get("sub")
        except jwt.InvalidTokenError:
            raise HTTPException(status_code=400, detail="Invalid code")

        # Mark the code as consumed — one-time use
        _used_codes.add(code_hash)

        access_token = create_access_token(
            {"sub": username, "aud": "google-home"},
            expires_delta=timedelta(hours=1),
        )
        refresh = create_access_token(
            {"sub": username, "aud": "google-home", "type": "refresh"},
            expires_delta=timedelta(days=30),
        )
        return {
            "token_type": "Bearer",
            "access_token": access_token,
            "refresh_token": refresh,
            "expires_in": 3600,
        }

    # ── Refresh token grant ───────────────────────────────────────────────
    elif grant_type == "refresh_token":
        if not refresh_token:
            raise HTTPException(status_code=400, detail="Missing refresh_token")

        try:
            # Audience verification is skipped at decode time and enforced
            # manually below so we can return a specific HTTP 401 rather than
            # an opaque PyJWT exception.
            payload = jwt.decode(
                refresh_token,
                secret,
                algorithms=["HS256"],
                options={"verify_aud": False},
            )
            if payload.get("aud") != "google-home":
                raise HTTPException(status_code=401, detail="Invalid audience")
            username = payload.get("sub")
        except jwt.InvalidTokenError:
            raise HTTPException(status_code=400, detail="Invalid refresh token")

        access_token = create_access_token(
            {"sub": username, "aud": "google-home"},
            expires_delta=timedelta(hours=1),
        )
        return {
            "token_type": "Bearer",
            "access_token": access_token,
            "expires_in": 3600,
        }

    raise HTTPException(status_code=400, detail="Unsupported grant_type")


# ---------------------------------------------------------------------------
# Fulfillment endpoint
# ---------------------------------------------------------------------------

@router.post("/fulfillment")
async def fulfillment(request: Request):
    """
    Google Smart Home fulfillment webhook — handles all Smart Home intents.

    Google sends HTTPS POST requests to this endpoint whenever it needs to
    interact with GroWDash devices.  The request body is a JSON envelope
    containing a ``requestId`` and an ``inputs`` array; each input carries
    one of the following intents:

    ``action.devices.SYNC``
        Returns the full device manifest (``DEVICES``) so Google can build
        its internal device graph.  Called once during linking and again
        whenever the user requests a device re-sync.

    ``action.devices.QUERY``
        Returns the current sensor state for each requested device ID by
        calling ``_get_live_states()``, which fetches a fresh inverter
        snapshot.  If the Growatt API is unavailable, affected devices are
        returned as ``OFFLINE``.

    ``action.devices.EXECUTE``
        Always returns ``notSupported`` because all exposed devices are
        sensors and do not accept commands.

    ``action.devices.DISCONNECT``
        Acknowledges the account unlink event.  The in-memory state
        (``_used_codes``) is not cleared here because the tokens are
        audience-scoped and will expire naturally.

    Authentication
    --------------
    Every request must include ``Authorization: Bearer <token>`` where the
    token was issued by ``POST /google-home/token``.  ``_verify_google_token``
    validates the signature, expiry, and ``aud == "google-home"`` claim.

    Args:
        request: The raw FastAPI request object; the JSON body is read
                 inside the handler via ``await request.json()``.

    Returns:
        dict: Google Smart Home response envelope with ``requestId`` and
              an intent-specific ``payload``.

    Raises:
        HTTPException 400: Missing or malformed request body.
        HTTPException 401: Missing, expired, or wrong-audience Bearer token.
    """
    # ── Authentication ────────────────────────────────────────────────────
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing Bearer token")

    token    = auth_header.split(" ", 1)[1]
    username = _verify_google_token(token)

    # ── Parse request body ────────────────────────────────────────────────
    body       = await request.json()
    request_id = body.get("requestId")
    inputs     = body.get("inputs", [])

    if not inputs:
        raise HTTPException(status_code=400, detail="Empty inputs array")

    intent = inputs[0].get("intent")

    # ── SYNC ──────────────────────────────────────────────────────────────
    if intent == "action.devices.SYNC":
        return {
            "requestId": request_id,
            "payload": {
                # agentUserId is derived from the authenticated username so that
                # each GroWDash account gets its own isolated device namespace
                # in Google Home, rather than sharing a single hardcoded ID.
                "agentUserId": f"growdash_{username}",
                "devices": DEVICES,
            },
        }

    # ── QUERY ─────────────────────────────────────────────────────────────
    elif intent == "action.devices.QUERY":
        requested_ids = [
            d["id"]
            for d in inputs[0].get("payload", {}).get("devices", [])
        ]
        states = _get_live_states()
        return {
            "requestId": request_id,
            "payload": {
                "devices": {
                    dev_id: states.get(
                        dev_id,
                        {"status": "OFFLINE", "online": False},
                    )
                    for dev_id in requested_ids
                },
            },
        }

    # ── EXECUTE ───────────────────────────────────────────────────────────
    elif intent == "action.devices.EXECUTE":
        # Sensors are read-only; commands are never accepted.
        return {
            "requestId": request_id,
            "payload": {
                "commands": [
                    {"ids": [], "status": "ERROR", "errorCode": "notSupported"}
                ]
            },
        }

    # ── DISCONNECT ────────────────────────────────────────────────────────
    elif intent == "action.devices.DISCONNECT":
        # No server-side cleanup needed; tokens expire naturally.
        return {"requestId": request_id}

    raise HTTPException(status_code=400, detail="Unknown intent")