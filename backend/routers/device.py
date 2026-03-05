"""
Router per i dati tecnici del dispositivo inverter.
====================================================
Espone gli endpoint relativi ai dettagli tecnici e alle
impostazioni dell'inverter MIN.

Endpoints disponibili:
    GET /device/detail   → Dati tecnici dettagliati dell'inverter
    GET /device/settings → Impostazioni configurate sull'inverter
"""

from fastapi import APIRouter, HTTPException
from services.growatt import get_device_detail, get_device_settings

# Crea il router con prefisso /device
router = APIRouter(
    prefix="/device",
    tags=["Dispositivo"],
)


@router.get("/detail", summary="Dettagli tecnici inverter")
def device_detail():
    """
    Restituisce i dati tecnici dettagliati dell'inverter MIN:
    versione firmware, modello, stato operativo e parametri hardware.
    """
    data = get_device_detail()

    if not data:
        raise HTTPException(status_code=404, detail="Dati dispositivo non disponibili")

    return {
        "serial_number": data.get("serialNum"),
        "model": data.get("modelText"),
        "firmware_version": data.get("fwVersion"),
        "monitor_version": data.get("monitorVersion"),
        "communication_version": data.get("communicationVersion"),
        "status": data.get("status"),
        "status_text": data.get("statusText"),
        "is_online": not data.get("lost", True),
        "peak_power_w": data.get("pmax"),
        "datalogger_sn": data.get("dataLogSn"),
        "last_update": data.get("lastUpdateTimeText"),
    }


@router.get("/settings", summary="Impostazioni inverter")
def device_settings():
    """
    Restituisce tutte le impostazioni configurate sull'inverter MIN.
    Utile per visualizzare la configurazione attuale del dispositivo.
    """
    data = get_device_settings()

    if not data:
        raise HTTPException(status_code=404, detail="Impostazioni non disponibili")

    return data