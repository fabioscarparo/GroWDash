"""
Google Smart Home Action — OAuth2 + Fulfillment Router
=======================================================

SENSOR TYPE MAPPING (why Temperature/CELSIUS for power)
---------------------------------------------------------
Google's SensorState trait has a fixed whitelist of (name, rawValueUnit) pairs.
There is no "WATT" or "KILOWATT" rawValueUnit. The standard workaround used by
commercial solar integrations is to map power readings to Temperature/CELSIUS:

  3.5 kW  →  rawValue: 3.5  →  displayed as "3.5 °" in the app

Residential systems produce 0–15 kW, which maps to 0–15 °C — a physically
plausible temperature range that Google accepts without validation errors.

GOOGLE CLOUD CONSOLE CHECKLIST (do all of these or sensors will stay blank)
-----------------------------------------------------------------------------
1. Cloud Console → APIs & Services → Library → search "HomeGraph API" → ENABLE IT.
   Without HomeGraph API, SYNC succeeds (devices appear) but QUERY requests are
   silently dropped by Google. This is the #1 cause of "connected but no value."

2. Actions Console (console.actions.google.com) → your project:
   - Fulfillment URL : https://<backend>/google-home/fulfillment
   - Account linking → Authorization URL : https://<backend>/google-home/auth
   - Account linking → Token URL         : https://<backend>/google-home/token
   - Client ID / Secret: must match GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET env vars

3. Backend .env must include all four vars:
     GOOGLE_CLIENT_ID=...
     GOOGLE_CLIENT_SECRET=...
     GOOGLE_PROJECT_ID=<actions-project-id>
     FRONTEND_URL=https://<your-frontend>

4. After any code change: unlink and relink the account in Google Home app to
   force a fresh SYNC. Stale SYNC data can cause values to stay blank indefinitely.

5. Use GET /google-home/debug (requires GroWDash session cookie) to verify that
   the backend can reach the Growatt API and that values are non-zero before
   testing in Google Home.
"""

import hashlib
import logging
import os
from datetime import timedelta

import jwt
from fastapi import APIRouter, Depends, Form, HTTPException, Request
from fastapi.responses import RedirectResponse

from auth import create_access_token, get_current_user
from services.growatt import get_energy_today

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/google-home",
    tags=["Google Home"],
)

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")

_project_id = os.getenv("GOOGLE_PROJECT_ID", "")
ALLOWED_REDIRECT_URIS: set[str] = {
    f"https://oauth-redirect.googleusercontent.com/r/{_project_id}",
    f"https://oauth-redirect-sandbox.googleusercontent.com/r/{_project_id}",
}

_used_codes: set[str] = set()

# ---------------------------------------------------------------------------
# Device manifest
# ---------------------------------------------------------------------------

DEVICES: list[dict] = [
    {
        "id": "solar_sensor",
        "type": "action.devices.types.SENSOR",
        "traits": ["action.devices.traits.SensorState"],
        "name": {
            "defaultNames": ["GroWDash Solar"],
            "name": "Solar Production",
            "nicknames": ["Solar", "PV Power", "Solar Power"],
        },
        "willReportState": False,
        "attributes": {
            "sensorStatesSupported": [
                {
                    "name": "Temperature",
                    "numericCapabilities": {"rawValueUnit": "CELSIUS"},
                }
            ]
        },
        "deviceInfo": {
            "manufacturer": "GroWDash",
            "model": "Solar Sensor v1",
            "hwVersion": "1.0",
            "swVersion": "1.0",
        },
    },
    {
        "id": "home_sensor",
        "type": "action.devices.types.SENSOR",
        "traits": ["action.devices.traits.SensorState"],
        "name": {
            "defaultNames": ["GroWDash Home Load"],
            "name": "Home Consumption",
            "nicknames": ["Home", "House Load", "Load Power"],
        },
        "willReportState": False,
        "attributes": {
            "sensorStatesSupported": [
                {
                    "name": "Temperature",
                    "numericCapabilities": {"rawValueUnit": "CELSIUS"},
                }
            ]
        },
        "deviceInfo": {
            "manufacturer": "GroWDash",
            "model": "Home Sensor v1",
            "hwVersion": "1.0",
            "swVersion": "1.0",
        },
    },
    {
        "id": "battery_sensor",
        "type": "action.devices.types.SENSOR",
        "traits": ["action.devices.traits.SensorState"],
        "name": {
            "defaultNames": ["GroWDash Battery"],
            "name": "Battery",
            "nicknames": ["Battery SOC", "Battery Level", "Battery Charge"],
        },
        "willReportState": False,
        "attributes": {
            # Humidity + PERCENTAGE is a valid Google schema combination for 0-100 % values.
            # FilterLifeTime + PERCENTAGE is NOT officially supported and breaks QUERY.
            "sensorStatesSupported": [
                {
                    "name": "Humidity",
                    "numericCapabilities": {"rawValueUnit": "PERCENTAGE"},
                }
            ]
        },
        "deviceInfo": {
            "manufacturer": "GroWDash",
            "model": "Battery Sensor v1",
            "hwVersion": "1.0",
            "swVersion": "1.0",
        },
    },
    {
        "id": "grid_import_sensor",
        "type": "action.devices.types.SENSOR",
        "traits": ["action.devices.traits.SensorState"],
        "name": {
            "defaultNames": ["GroWDash Grid Import"],
            "name": "Grid Import",
            "nicknames": ["Grid Download", "Power from Grid", "Grid Input"],
        },
        "willReportState": False,
        "attributes": {
            "sensorStatesSupported": [
                {
                    "name": "Temperature",
                    "numericCapabilities": {"rawValueUnit": "CELSIUS"},
                }
            ]
        },
        "deviceInfo": {
            "manufacturer": "GroWDash",
            "model": "Grid Import Sensor v1",
            "hwVersion": "1.0",
            "swVersion": "1.0",
        },
    },
    {
        "id": "grid_export_sensor",
        "type": "action.devices.types.SENSOR",
        "traits": ["action.devices.traits.SensorState"],
        "name": {
            "defaultNames": ["GroWDash Grid Export"],
            "name": "Grid Export",
            "nicknames": ["Grid Upload", "Power to Grid", "Grid Output"],
        },
        "willReportState": False,
        "attributes": {
            "sensorStatesSupported": [
                {
                    "name": "Temperature",
                    "numericCapabilities": {"rawValueUnit": "CELSIUS"},
                }
            ]
        },
        "deviceInfo": {
            "manufacturer": "GroWDash",
            "model": "Grid Export Sensor v1",
            "hwVersion": "1.0",
            "swVersion": "1.0",
        },
    },
]

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _safe_float(value) -> float:
    try:
        return float(value) if value is not None else 0.0
    except (ValueError, TypeError):
        return 0.0


def _w_to_kw(watts: float) -> float:
    """Convert Watts to kW for Temperature/CELSIUS sensor mapping.

    0–15 kW is a valid Celsius range that Google accepts without errors.
    """
    return round(watts / 1000.0, 2)


def _build_device_states() -> dict:
    """Fetch live inverter data and build Google Home QUERY device state objects.

    Each device state dict MUST include:
      - "status": "SUCCESS"   ← required by Google; omitting it causes blank values
      - "online": True
      - the trait-specific state field (currentSensorStateData for SensorState)

    Returns an empty dict only if the Growatt API is completely unreachable.
    """
    try:
        data = get_energy_today()
    except Exception as exc:
        logger.error("Growatt API call failed inside Google Home QUERY: %s", exc)
        return {}

    if not data:
        logger.warning("Growatt API returned empty payload for Google Home QUERY")
        return {}

    solar_kw       = _w_to_kw(_safe_float(data.get("ppv")))
    home_kw        = _w_to_kw(_safe_float(data.get("pacToLocalLoad")))
    battery_pct    = round(_safe_float(data.get("bmsSoc")), 1)
    grid_import_kw = _w_to_kw(_safe_float(data.get("pacToUserTotal")))
    grid_export_kw = _w_to_kw(_safe_float(data.get("pacToGridTotal")))

    logger.info(
        "Google Home QUERY values — solar=%.2f kW, home=%.2f kW, "
        "battery=%.1f%%, grid_import=%.2f kW, grid_export=%.2f kW",
        solar_kw, home_kw, battery_pct, grid_import_kw, grid_export_kw,
    )

    # "status": "SUCCESS" is REQUIRED in every device state object for QUERY.
    # Ref: developers.home.google.com/cloud-to-cloud/guides/sensor (official example)
    return {
        "solar_sensor": {
            "status": "SUCCESS",
            "online": True,
            "currentSensorStateData": [
                {"name": "Temperature", "rawValue": solar_kw}
            ],
        },
        "home_sensor": {
            "status": "SUCCESS",
            "online": True,
            "currentSensorStateData": [
                {"name": "Temperature", "rawValue": home_kw}
            ],
        },
        "battery_sensor": {
            "status": "SUCCESS",
            "online": True,
            # "name" must exactly match the declared sensorStatesSupported name.
            "currentSensorStateData": [
                {"name": "Humidity", "rawValue": battery_pct}
            ],
        },
        "grid_import_sensor": {
            "status": "SUCCESS",
            "online": True,
            "currentSensorStateData": [
                {"name": "Temperature", "rawValue": grid_import_kw}
            ],
        },
        "grid_export_sensor": {
            "status": "SUCCESS",
            "online": True,
            "currentSensorStateData": [
                {"name": "Temperature", "rawValue": grid_export_kw}
            ],
        },
    }


def _verify_google_token(token: str) -> str:
    """Validate a Google Home Bearer token (aud == 'google-home')."""
    secret = os.getenv("JWT_SECRET_KEY")
    if not secret:
        raise HTTPException(status_code=500, detail="Server misconfigured: missing JWT_SECRET_KEY")
    try:
        payload = jwt.decode(token, secret, algorithms=["HS256"], audience="google-home")
        return payload.get("sub")
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


# ---------------------------------------------------------------------------
# Debug endpoint (protected by GroWDash session cookie)
# ---------------------------------------------------------------------------

@router.get("/debug", summary="Verify Google Home sensor values (requires session cookie)")
def google_home_debug(current_user=Depends(get_current_user)):
    """Returns the exact JSON that would be sent to Google Home on a QUERY request.

    Use this endpoint from the browser (or curl with the session cookie) to
    verify that:
      1. The Growatt API is reachable from the backend
      2. All sensor values are non-zero (non-zero values = inverter is active)
      3. The response structure matches what Google expects

    If this endpoint returns correct values but Google Home still shows blank,
    the issue is almost certainly the HomeGraph API not being enabled in
    Google Cloud Console.
    """
    states = _build_device_states()
    if not states:
        return {
            "error": "Could not fetch data from Growatt API. Check backend logs.",
            "devices": {},
        }
    return {
        "note": "This is exactly what Google Home receives on a QUERY request.",
        "device_count": len(DEVICES),
        "devices": states,
    }


# ---------------------------------------------------------------------------
# OAuth2 endpoints
# ---------------------------------------------------------------------------

@router.get("/auth")
def oauth_authorize(client_id: str, redirect_uri: str, state: str):
    """OAuth2 authorization entry point — validates params and redirects to linking page."""
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
    """Exchange an authorization code or refresh token for a Google Home access token."""
    if client_id != GOOGLE_CLIENT_ID or client_secret != GOOGLE_CLIENT_SECRET:
        raise HTTPException(status_code=401, detail="Invalid client credentials")

    secret = os.getenv("JWT_SECRET_KEY")

    if grant_type == "authorization_code":
        if not code:
            raise HTTPException(status_code=400, detail="Missing code")

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

        _used_codes.add(code_hash)

        access_token = create_access_token(
            {"sub": username, "aud": "google-home"},
            expires_delta=timedelta(hours=1),
        )
        new_refresh = create_access_token(
            {"sub": username, "aud": "google-home", "type": "refresh"},
            expires_delta=timedelta(days=30),
        )
        return {
            "token_type": "Bearer",
            "access_token": access_token,
            "refresh_token": new_refresh,
            "expires_in": 3600,
        }

    elif grant_type == "refresh_token":
        if not refresh_token:
            raise HTTPException(status_code=400, detail="Missing refresh_token")

        try:
            payload = jwt.decode(
                refresh_token, secret, algorithms=["HS256"],
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
# Fulfillment
# ---------------------------------------------------------------------------

@router.post("/fulfillment")
async def fulfillment(request: Request):
    """Google Smart Home fulfillment webhook — SYNC, QUERY, EXECUTE, DISCONNECT."""
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing Bearer token")

    username = _verify_google_token(auth_header.split(" ", 1)[1])

    body = await request.json()
    request_id = body.get("requestId")
    inputs = body.get("inputs", [])

    if not inputs:
        raise HTTPException(status_code=400, detail="Empty inputs array")

    intent = inputs[0].get("intent")
    logger.info("Google Home intent=%s user=%s", intent, username)

    # SYNC — return device manifest
    if intent == "action.devices.SYNC":
        return {
            "requestId": request_id,
            "payload": {
                "agentUserId": f"growdash_{username}",
                "devices": DEVICES,
            },
        }

    # QUERY — return current sensor values
    # Each device object MUST include "status": "SUCCESS" or Google ignores the values.
    elif intent == "action.devices.QUERY":
        requested_ids = [
            d["id"] for d in inputs[0].get("payload", {}).get("devices", [])
        ]
        states = _build_device_states()

        device_states = {}
        for dev_id in requested_ids:
            if dev_id in states:
                device_states[dev_id] = states[dev_id]
            else:
                # Device not found or API unavailable.
                device_states[dev_id] = {"status": "OFFLINE", "online": False}

        return {
            "requestId": request_id,
            "payload": {"devices": device_states},
        }

    # EXECUTE — sensors are read-only, reject all commands
    elif intent == "action.devices.EXECUTE":
        return {
            "requestId": request_id,
            "payload": {
                "commands": [
                    {"ids": [], "status": "ERROR", "errorCode": "notSupported"}
                ]
            },
        }

    # DISCONNECT — account unlinked, tokens expire naturally
    elif intent == "action.devices.DISCONNECT":
        return {"requestId": request_id}

    raise HTTPException(status_code=400, detail=f"Unknown intent: {intent}")