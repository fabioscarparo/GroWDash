"""
Router for PV Plant Information.
=================================
Exposes endpoints related to general plant data,
such as name, location, peak power, and current state.
"""

from fastapi import APIRouter, HTTPException, Query, Depends
from services.growatt import get_plant_info
from typing import Optional
from auth import get_current_user

# Create router with prefix /plant
router = APIRouter(
    prefix="/plant",
    tags=["Plant"],
)


@router.get("/info", summary="Plant information")
def plant_info(current_user = Depends(get_current_user)):
    """
    Returns general information about the PV plant:
    name, city, peak power, total energy produced, and status.
    """
    data = get_plant_info()

    if not data:
        raise HTTPException(status_code=404, detail="Plant not found")

    return {
        "name": data.get("name"),
        "city": data.get("city"),
        "country": data.get("country"),
        "plant_capacity_kw": data.get("peak_power"),
        "lifetime_energy_kwh": data.get("total_energy"),
        "current_power_kw": data.get("current_power"),
        "status": data.get("status"),
        "latitude": data.get("latitude"),
        "longitude": data.get("longitude"),
        "plant_installation_date": data.get("create_date"),
    }