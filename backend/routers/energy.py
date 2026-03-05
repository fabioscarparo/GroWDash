"""
Router per i dati energetici dell'impianto fotovoltaico.
=========================================================
Espone gli endpoint relativi alla produzione di energia,
alla curva di potenza giornaliera e ai dati storici.

Endpoints disponibili:
    GET /energy/today   → Dati aggregati del giorno corrente
    GET /energy/history → Serie storica snapshot ogni 5 minuti
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
    Restituisce i dati energetici del giorno corrente organizzati in 4 sezioni:

    - **production**: energia prodotta oggi, totale storico e autoconsumo
    - **inverter**: stato operativo, temperatura e ultimo aggiornamento
    - **battery**: stato di carica (SOC), energia caricata e scaricata oggi
    - **grid**: tensione, frequenza, energia importata ed esportata oggi
    """
    data = get_energy_today()

    if not data:
        raise HTTPException(status_code=404, detail="Dati non disponibili")

    return {
        # ── Produzione solare ────────────────────────────
        "production": {
            "today_kwh": data.get("eacToday"),           # Energia prodotta oggi
            "total_kwh": data.get("eacTotal"),            # Energia totale da sempre
            "self_consumption_today_kwh": data.get("eselfToday"),   # Autoconsumo oggi
            "local_load_today_kwh": data.get("elocalLoadToday"),    # Carico domestico oggi
        },

        # ── Stato inverter ───────────────────────────────
        "inverter": {
            "status": data.get("status"),                 # Codice stato (0=standby, 1=ok)
            "status_text": data.get("statusText"),        # Testo stato leggibile
            "temperature_c": data.get("temp1"),           # Temperatura in °C
            "is_online": not data.get("lost", True),      # True se l'inverter è raggiungibile
            "last_update": data.get("time"),              # Timestamp ultimo dato ricevuto
        },

        # ── Batteria ─────────────────────────────────────
        "battery": {
            "soc_pct": data.get("bmsSoc"),                # Stato di carica in %
            "charge_today_kwh": data.get("echargeToday"), # Energia caricata oggi
            "discharge_today_kwh": data.get("edischargeToday"),  # Energia scaricata oggi
            "charge_total_kwh": data.get("echargeTotal"),        # Energia caricata totale
            "discharge_total_kwh": data.get("edischargeTotal"),  # Energia scaricata totale
        },

        # ── Rete elettrica ───────────────────────────────
        "grid": {
            "voltage_v": data.get("vac1"),                # Tensione di rete in V
            "frequency_hz": data.get("fac"),              # Frequenza di rete in Hz
            "exported_today_kwh": data.get("etoGridToday"),  # Energia immessa in rete oggi
            "imported_today_kwh": data.get("etoUserToday"),  # Energia prelevata dalla rete oggi
        },
    }


@router.get("/history", summary="Curva di produzione giornaliera")
def energy_history(
    start_date: date = Query(
        default=None,
        description="Data di inizio nel formato YYYY-MM-DD. Default: oggi."
    ),
    end_date: date = Query(
        default=None,
        description="Data di fine nel formato YYYY-MM-DD. Massimo 7 giorni da start_date. Default: uguale a start_date."
    ),
):
    """
    Restituisce la serie storica di snapshot ogni 5 minuti per un intervallo di date.

    Ogni record contiene: timestamp, potenza istantanea, tensione e temperatura.
    Massimo 7 giorni per chiamata (limite API Growatt).
    Usato principalmente per costruire il grafico della curva di produzione.
    """
    data = get_energy_history(start_date, end_date)

    if not data:
        raise HTTPException(status_code=404, detail="Nessun dato storico disponibile")

    return {
        "start_date": str(start_date or date.today()),
        "end_date": str(end_date or start_date or date.today()),
        "count": len(data),  # Numero totale di snapshot restituiti
        "data": data,
    }