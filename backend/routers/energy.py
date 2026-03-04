"""
Router per i dati energetici dell'impianto fotovoltaico.
=========================================================
Espone gli endpoint relativi alla produzione di energia,
alla curva di potenza giornaliera e ai dati storici.
"""

from fastapi import APIRouter, HTTPException, Query
from datetime import date
from services.growatt import get_energy_today, get_energy_history

# Crea il router con prefisso /energy
router = APIRouter(
    prefix="/energy",
    tags=["Energia"],
)


@router.get("/today", summary="Dati energetici di oggi")
def energy_today():
    """
    Restituisce i dati energetici del giorno corrente, organizzati in 4 sezioni:
    - Produzione: energia prodotta oggi e totale storico
    - Inverter: stato, temperatura e ultimo aggiornamento
    - Batteria: stato di carica, energia caricata e scaricata oggi
    - Rete: tensione, frequenza, energia importata ed esportata oggi
    """
    data = get_energy_today()

    if not data:
        raise HTTPException(status_code=404, detail="Dati non disponibili")

    return {
        # ── Produzione ──────────────────────────────────
        "production": {
            "today_kwh": data.get("eacToday"),
            "total_kwh": data.get("eacTotal"),
            "self_consumption_today_kwh": data.get("eselfToday"),
            "local_load_today_kwh": data.get("elocalLoadToday"),
        },

        # ── Inverter ────────────────────────────────────
        "inverter": {
            "status": data.get("status"),
            "status_text": data.get("statusText"),
            "temperature_c": data.get("temp1"),
            "is_online": not data.get("lost", True),
            "last_update": data.get("time"),
        },

        # ── Batteria ────────────────────────────────────
        "battery": {
            "soc_pct": data.get("bmsSoc"),
            "charge_today_kwh": data.get("echargeToday"),
            "discharge_today_kwh": data.get("edischargeToday"),
            "charge_total_kwh": data.get("echargeTotal"),
            "discharge_total_kwh": data.get("edischargeTotal"),
        },

        # ── Rete elettrica ──────────────────────────────
        "grid": {
            "voltage_v": data.get("vac1"),
            "frequency_hz": data.get("fac"),
            "exported_today_kwh": data.get("etoGridToday"),
            "imported_today_kwh": data.get("etoUserToday"),
        },
    }


@router.get("/history", summary="Curva di produzione giornaliera")
def energy_history(
    query_date: date = Query(
        default=None,
        description="Data nel formato YYYY-MM-DD. Se non specificata, usa oggi."
    )
):
    """
    Restituisce la serie storica di snapshot ogni 5 minuti per una data.
    Usato per costruire il grafico della curva di produzione giornaliera.
    """
    data = get_energy_history(query_date)

    if not data:
        raise HTTPException(status_code=404, detail="Nessun dato storico disponibile")

    return {
        "date": str(query_date or date.today()),
        "count": len(data),
        "data": data,
    }