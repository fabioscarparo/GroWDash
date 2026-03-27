"""
Router for Weather and Solar Forecast.
======================================
This router provides access to environmental and prediction data
for the PV plant's specific location.
"""

from fastapi import APIRouter, HTTPException, Query, Depends
from services.growatt import get_plant_info
from services.weather import get_weather, get_solar_forecast
from auth import get_current_user

router = APIRouter(
    prefix="/weather",
    tags=["Weather"],
)

@router.get("/current", summary="Current weather and forecast")
def current_weather(current_user = Depends(get_current_user)):
    """
    Returns the real-time weather conditions for the plant's location.
    
    Coordinates (latitude and longitude) are retrieved automatically 
    from the plant's info stored on the backend.
    """
    plant_info = get_plant_info()
    lat = plant_info.get("latitude")
    lon = plant_info.get("longitude")

    if not lat or not lon:
        raise HTTPException(status_code=404, detail="Plant coordinates not found")

    return get_weather(lat, lon)

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
    plant_info = get_plant_info()
    lat = plant_info.get("latitude")
    lon = plant_info.get("longitude")

    if not lat or not lon:
        raise HTTPException(status_code=404, detail="Plant coordinates not found")

    return get_solar_forecast(lat, lon, tilt, azimuth)
