"""
Router for Weather and Solar Forecast.
======================================
This router provides access to environmental and prediction data
for the PV plant's specific location.
"""

import logging

import requests
from fastapi import APIRouter, HTTPException, Query, Depends
from growattServer.exceptions import GrowattV1ApiError
from services.growatt import get_plant_info
from services.weather import get_weather, get_solar_forecast
from auth import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/weather",
    tags=["Weather"],
)


def _resolve_plant_coordinates() -> tuple[float, float]:
    """
    Resolve plant latitude/longitude handling transient Growatt failures as 503.
    """
    try:
        plant_info = get_plant_info()
    except GrowattV1ApiError as exc:
        logger.warning("Growatt plant lookup failed for weather endpoint: %s", exc)
        raise HTTPException(
            status_code=503,
            detail="Growatt API temporarily unavailable. Please retry in a few seconds.",
        ) from exc
    except Exception as exc:
        logger.exception("Unexpected error resolving plant coordinates: %s", exc)
        raise HTTPException(
            status_code=503,
            detail="Unable to resolve plant coordinates right now. Please retry shortly.",
        ) from exc

    lat = plant_info.get("latitude")
    lon = plant_info.get("longitude")

    if lat is None or lon is None:
        raise HTTPException(status_code=404, detail="Plant coordinates not found")

    return lat, lon

@router.get("/current", summary="Current weather and forecast")
def current_weather(current_user = Depends(get_current_user)):
    """
    Returns the real-time weather conditions for the plant's location.
    
    Coordinates (latitude and longitude) are retrieved automatically 
    from the plant's info stored on the backend.
    """
    lat, lon = _resolve_plant_coordinates()
    try:
        return get_weather(lat, lon)
    except requests.RequestException as exc:
        logger.warning("Weather provider request failed: %s", exc)
        raise HTTPException(
            status_code=503,
            detail="Weather service temporarily unavailable. Please retry shortly.",
        ) from exc

@router.get("/solar-forecast", summary="Solar irradiance forecast")
def solar_forecast(
    tilt: float = Query(30, description="Panel tilt in degrees"),
    azimuth: float = Query(180, description="Panel azimuth in degrees (0=North, 180=South)"),
    current_user = Depends(get_current_user)
):
    """
    Returns the predicted hourly solar irradiance (W/m²) for the plant.
    
    Uses Global Tilted Irradiance (GTI) calculated for the specific 
    tilt and azimuth settings provided.
    """
    lat, lon = _resolve_plant_coordinates()
    try:
        return get_solar_forecast(lat, lon, tilt, azimuth)
    except requests.RequestException as exc:
        logger.warning("Solar forecast provider request failed: %s", exc)
        raise HTTPException(
            status_code=503,
            detail="Solar forecast service temporarily unavailable. Please retry shortly.",
        ) from exc
