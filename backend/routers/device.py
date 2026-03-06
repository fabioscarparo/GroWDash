"""
Router per i dati tecnici del dispositivo inverter.
====================================================
Espone gli endpoint relativi ai dettagli tecnici e alle
impostazioni dell'inverter MIN.

Endpoints disponibili:
    GET /device/list     → Lista dispositivi collegati all'impianto
    GET /device/detail   → Dati tecnici completi dell'inverter
    GET /device/settings → Impostazioni configurate sull'inverter
"""

from fastapi import APIRouter, HTTPException
from services.growatt import get_device_detail, get_device_settings, get_device_list

# Crea il router con prefisso /device
router = APIRouter(
    prefix="/device",
    tags=["Dispositivi"],
)

@router.get("/list", summary="Lista dispositivi impianto")
def device_list():
    """
    Restituisce la lista di tutti i dispositivi collegati all'impianto.

    Tipi di dispositivo:

        type 3 — meter (contatore di energia)
        type 7 — inverter MIN
    """
    data = get_device_list()

    if not data:
        raise HTTPException(status_code=404, detail="Nessun dispositivo trovato")

    return {
        "count": len(data),
        "devices": [
            {
                "serial_number": device.get("device_sn"), # Numero seriale del dispositivo
                "device_id": device.get("device_id"),
                "model": device.get("model"),
                "type": device.get("type"),                 
                "datalogger_sn": device.get("datalogger_sn"), # Numero seriale del datalogger a cui è collegato
                "manufacturer": device.get("manufacturer"), 
                "last_update": device.get("last_update_time"), # Timestamp dell'ultimo aggiornamento dal dispositivo                
                "is_online": not device.get("lost", True), # True se il dispositivo è raggiungibile tramite il cloud Growatt
            }
            for device in data
        ]
    }


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
        "serial_number": data.get("serialNum"), # Serial number dell'inverter
        "model": data.get("modelText"),
        "firmware_version": data.get("fwVersion"), # Versione firmware installata sull'inverter
        "monitor_version": data.get("monitorVersion"), # Versione del monitor interno dell'inverter
        "communication_version": data.get("communicationVersion"),
        "status": data.get("status"),
        "status_text": data.get("statusText"),
        "is_online": not data.get("lost", True),
        "peak_power_w": data.get("pmax"),
        "datalogger_sn": data.get("dataLogSn"), # Serial number del datalogger a cui è collegato l'inverter
        "last_update": data.get("lastUpdateTimeText"), # Ultimo aggiornamento dall'inverter
    }


@router.get("/settings", summary="Impostazioni inverter")
def device_settings():
    """
    Restituisce tutte le impostazioni configurate sull'inverter MIN.
    """
    data = get_device_settings()

    if not data:
        raise HTTPException(status_code=404, detail="Impostazioni non disponibili")

    return data