"""
Weather Service — Open-Meteo Integration.
=========================================
This module handles fetching meteorological data and solar irradiance forecasts
from the Open-Meteo API. 

It uses the plant's coordinates and caches results to minimize external API calls
and improve performance.
"""

import requests
from services.growatt import ttl_cache

# Cache TTLs
WEATHER_CACHE_TTL = 900   # 15 minutes
SOLAR_CACHE_TTL   = 3600  # 1 hour

@ttl_cache(ttl=WEATHER_CACHE_TTL)
def get_weather(lat: float, lon: float) -> dict:
    """
    Fetches real-time weather and 2-day daily forecast from Open-Meteo.
    """
    url = "https://api.open-meteo.com/v1/forecast"
    params = {
        "latitude": lat,
        "longitude": lon,
        "current": [
            "temperature_2m",
            "apparent_temperature",
            "weathercode",
            "cloudcover",
            "windspeed_10m",
            "is_day",
        ],
        "daily": [
            "temperature_2m_max",
            "temperature_2m_min",
            "weathercode",
            "precipitation_probability_max",
        ],
        "hourly": [
            "temperature_2m",
            "weathercode",
            "precipitation_probability",
        ],
        "timezone": "auto",
        "forecast_days": 2,
    }
    
    # requests handles list joining automatically for params
    response = requests.get(url, params=params, timeout=10)
    response.raise_for_status()
    return response.json()

@ttl_cache(ttl=SOLAR_CACHE_TTL)
def get_solar_forecast(lat: float, lon: float, tilt: float, azimuth: float) -> dict:
    """
    Fetches hourly Global Tilted Irradiance (GTI) forecast from Open-Meteo.
    
    Open-Meteo azimuth convention: 0=south, -90=east, 90=west, 180=north.
    Input azimuth is compass bearing: 0=N, 90=E, 180=S, 270=W.
    """
    # Convert compass bearing to Open-Meteo azimuth
    om_azimuth = azimuth - 180
    if om_azimuth > 180: om_azimuth -= 360
    if om_azimuth < -180: om_azimuth += 360

    url = "https://api.open-meteo.com/v1/forecast"
    params = {
        "latitude": lat,
        "longitude": lon,
        "hourly": "global_tilted_irradiance",
        "tilt": tilt,
        "azimuth": om_azimuth,
        "timezone": "auto",
        "forecast_days": 1,
    }
    
    response = requests.get(url, params=params, timeout=10)
    response.raise_for_status()
    return response.json()
