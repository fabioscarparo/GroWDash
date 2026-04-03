"""
Google Smart Home Action — OAuth2 + Fulfillment Router
=======================================================

SENSOR MAPPING RATIONALE
-------------------------
Google Home's SensorState trait has a strict whitelist of (name, rawValueUnit)
pairs. The following mappings are the only validated combinations for our data:

  Power (W) → Temperature / CELSIUS
    Convert watts to kilowatts before sending.
    0–15 kW residential range maps to 0–15 °C, a valid temperature.
    Google Home displays "X.X °" — users interpret this as kW.
    This is the standard workaround used by commercial solar integrations
    (SolarEdge, Fronius, Sungrow) because Google has no "WATT" rawValueUnit.

  Battery SOC (%) → Humidity / PERCENTAGE
    Humidity with PERCENTAGE is a fully supported numeric sensor (0–100).
    Google Home displays "X %" correctly.
    Do NOT use FilterLifeTime + PERCENTAGE — that combination is not in the
    official schema and causes SYNC to silently drop or corrupt the device.

CRITICAL QUERY RESPONSE RULE
------------------------------
The "status" field belongs ONLY in EXECUTE command responses, NOT in QUERY
device states. Including status: "SUCCESS" inside a QUERY device state causes
Google to misparse the payload → sensors appear with no values.
Device states for QUERY must contain only: online + currentSensorStateData.

GOOGLE CLOUD CONSOLE CHECKLIST
--------------------------------
1. Enable "HomeGraph API" in Cloud Console → APIs & Services → Library.
   Without this, SYNC works but QUERY calls are silently dropped.

2. Actions Console → Smart Home project:
   - Fulfillment URL : https://<backend>/google-home/fulfillment
   - Account linking → OAuth:
       Authorization URL : https://<backend>/google-home/auth
       Token URL         : https://<backend>/google-home/token
       Client ID / Secret: must match GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET env vars

3. Backend .env must include:
     GOOGLE_CLIENT_ID=...
     GOOGLE_CLIENT_SECRET=...
     GOOGLE_PROJECT_ID=<actions-project-id>
     FRONTEND_URL=https://<frontend>

4. After deploying, unlink and relink the account in Google Home app to force
   a fresh SYNC. Old entries with no values persist until re-synced.
"""

import hashlib
import logging
import os
from datetime import timedelta

import jwt
from fastapi import APIRouter, Form, HTTPException, Request
from fastapi.responses import RedirectResponse

from auth import create_access_token
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
            # Humidity/PERCENTAGE is the correct validated pair for 0-100 % numeric values.
            # FilterLifeTime+PERCENTAGE is NOT a valid combination in the official schema.
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
    """Convert watts to kilowatts (2 decimal places).

    Residential systems: 0–15 kW → 0–15 °C, valid for Temperature/CELSIUS.
    """
    return round(watts / 1000.0, 2)


def _get_live_states() -> dict:
    """Return current inverter readings as Google Home QUERY device states.

    IMPORTANT: returned dicts must NOT contain "status". That field is only
    valid inside EXECUTE command responses, not QUERY device states.
    Including it in QUERY causes Google to parse the response incorrectly
    and show no values in the Google Home app.
    """
    try:
        data = get_energy_today()
    except Exception as exc:
        logger.warning("Growatt API unavailable for Google Home QUERY: %s", exc)
        return {}

    if not data:
        logger.warning("Growatt API returned empty payload for Google Home QUERY")
        return {}

    solar_kw = _w_to_kw(_safe_float(data.get("ppv")))
    home_kw = _w_to_kw(_safe_float(data.get("pacToLocalLoad")))
    battery_pct = round(_safe_float(data.get("bmsSoc")), 1)
    grid_import_kw = _w_to_kw(_safe_float(data.get("pacToUserTotal")))
    grid_export_kw = _w_to_kw(_safe_float(data.get("pacToGridTotal")))

    logger.debug(
        "Google Home QUERY — solar=%.2fkW home=%.2fkW bat=%.1f%% "
        "grid_in=%.2fkW grid_out=%.2fkW",
        solar_kw, home_kw, battery_pct, grid_import_kw, grid_export_kw,
    )

    return {
        "solar_sensor": {
            "online": True,
            "currentSensorStateData": [
                {"name": "Temperature", "rawValue": solar_kw}
            ],
        },
        "home_sensor": {
            "online": True,
            "currentSensorStateData": [
                {"name": "Temperature", "rawValue": home_kw}
            ],
        },
        "battery_sensor": {
            "online": True,
            # name must exactly match the declared sensorStatesSupported name.
            "currentSensorStateData": [
                {"name": "Humidity", "rawValue": battery_pct}
            ],
        },
        "grid_import_sensor": {
            "online": True,
            "currentSensorStateData": [
                {"name": "Temperature", "rawValue": grid_import_kw}
            ],
        },
        "grid_export_sensor": {
            "online": True,
            "currentSensorStateData": [
                {"name": "Temperature", "rawValue": grid_export_kw}
            ],
        },
    }


def _verify_google_token(token: str) -> str:
    """Decode and verify a Bearer token, enforcing aud == 'google-home'."""
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
# OAuth2 endpoints
# ---------------------------------------------------------------------------

@router.get("/auth")
def oauth_authorize(client_id: str, redirect_uri: str, state: str):
    """OAuth2 authorization entry point — validates params and redirects to the linking page."""
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
    """Google Smart Home fulfillment webhook — handles SYNC, QUERY, EXECUTE, DISCONNECT."""
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

    # SYNC — return device manifest
    if intent == "action.devices.SYNC":
        logger.info("Google Home SYNC — user=%s devices=%d", username, len(DEVICES))
        return {
            "requestId": request_id,
            "payload": {
                "agentUserId": f"growdash_{username}",
                "devices": DEVICES,
            },
        }

    # QUERY — return current sensor values
    # Device state dicts must NOT contain "status" (EXECUTE-only field).
    elif intent == "action.devices.QUERY":
        requested_ids = [
            d["id"] for d in inputs[0].get("payload", {}).get("devices", [])
        ]
        states = _get_live_states()

        device_states = {}
        for dev_id in requested_ids:
            if dev_id in states:
                device_states[dev_id] = states[dev_id]
            else:
                device_states[dev_id] = {"online": False}

        return {
            "requestId": request_id,
            "payload": {"devices": device_states},
        }

    # EXECUTE — sensors are read-only
    elif intent == "action.devices.EXECUTE":
        return {
            "requestId": request_id,
            "payload": {
                "commands": [
                    {"ids": [], "status": "ERROR", "errorCode": "notSupported"}
                ]
            },
        }

    # DISCONNECT — account unlinked
    elif intent == "action.devices.DISCONNECT":
        logger.info("Google Home DISCONNECT — user=%s", username)
        return {"requestId": request_id}

    raise HTTPException(status_code=400, detail=f"Unknown intent: {intent}")