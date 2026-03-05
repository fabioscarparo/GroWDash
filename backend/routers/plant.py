"""
Router per le informazioni dell'impianto fotovoltaico.
======================================================
Espone gli endpoint relativi ai dati generali dell'impianto,
come nome, posizione, potenza di picco e stato attuale.
"""

from fastapi import APIRouter, HTTPException
from services.growatt import get_plant_info

# Crea il router con prefisso /plant
router = APIRouter(
    prefix="/plant",
    tags=["Impianto"],
)


@router.get("/info", summary="Informazioni impianto")
def plant_info():
    """
    Restituisce le informazioni generali dell'impianto fotovoltaico:
    nome, città, potenza di picco, energia totale prodotta e stato.
    """
    data = get_plant_info()

    if not data:
        raise HTTPException(status_code=404, detail="Impianto non trovato")

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
        "planet_installation_date": data.get("create_date"),
    }