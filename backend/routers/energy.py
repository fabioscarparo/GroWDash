"""
Router per i dati energetici dell'impianto fotovoltaico.
=========================================================
Espone gli endpoint relativi alla produzione di energia,
alla curva di potenza giornaliera e ai dati storici.

Endpoints disponibili:
    GET /energy/today     → Dati aggregati del giorno corrente
    GET /energy/history   → Serie storica snapshot ogni 5 minuti (max 7 giorni)
    GET /energy/aggregate → Storia energetica aggregata per giorno/mese/anno
"""

from fastapi import APIRouter, HTTPException, Query
from datetime import date
from services.growatt import get_energy_today, get_energy_history, get_plant_energy_history, get_plant_energy_overview

# Crea il router con prefisso /energy
# Tutti gli endpoint di questo file saranno raggiungibili sotto /energy/...
router = APIRouter(
    prefix="/energy",
    tags=["Energia"],
)

@router.get("/overview", summary="Panoramica energetica impianto")
def energy_overview():
    """
    Restituisce la panoramica energetica aggregata dell'impianto.
    Perfetto per le KPI card della dashboard:
    produzione oggi, mensile, annuale, totale e CO2 risparmiata.
    """
    data = get_plant_energy_overview()

    if not data:
        raise HTTPException(status_code=404, detail="Dati non disponibili")

    return {
        "today_energy_kwh": data.get("today_energy"),
        "monthly_energy_kwh": data.get("monthly_energy"),
        "yearly_energy_kwh": data.get("yearly_energy"),
        "total_energy_kwh": data.get("total_energy"),
        "current_power_w": data.get("current_power"),
        "carbon_offset_kg": data.get("carbon_offset"),
        "plant_capacity_kw": data.get("peak_power_actual"),
        "timezone": data.get("timezone"),
        "last_update": data.get("last_update_time"),
    }

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
            "today_kwh": data.get("eacToday"), # kWh totali prodotti oggi
            "total_kwh": data.get("eacTotal"), # kWh totali prodotti da quando l'impianto è attivo
            "self_consumption_today_kwh": data.get("eselfToday"), # kWh prodotti dal fotovoltaico e usati dalla casa oggi (autoconsumo)
            "local_load_today_kwh": data.get("elocalLoadToday"), # Kwh consumati in totale oggi (autoconsumo + prelievo da rete)
        },

        # ── Stato inverter ───────────────────────────────
        "inverter": {
            "status": data.get("status"),
            "status_text": data.get("statusText"),
            "temperature_c": data.get("temp1"),
            "is_online": not data.get("lost", True),
            "last_update": data.get("time"),
        },

        # ── Batteria ─────────────────────────────────────
        "battery": {
            "soc_pct": data.get("bmsSoc"), # Stato di carica (State of Charge) della batteria in percentuale
            "charge_today_kwh": data.get("echargeToday"), # kWh caricati nella batteria oggi
            "discharge_today_kwh": data.get("edischargeToday"), # kWh scaricati dalla batteria oggi
            "charge_total_kwh": data.get("echargeTotal"),
            "discharge_total_kwh": data.get("edischargeTotal"),
        },

        # ── Rete elettrica ───────────────────────────────
        "grid": {
            "voltage_v": data.get("vac1"),
            "frequency_hz": data.get("fac"),
            "exported_today_kwh": data.get("etoGridToday"), # kWh esportati in rete oggi
            "imported_today_kwh": data.get("etoUserToday"), # kWh importati dalla rete oggi
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
        "count": len(data),
        "data": data,
    }

@router.get("/aggregate", summary="Storia energetica aggregata per periodo")
def plant_energy_aggregate(
    start_date: date = Query(description="Data di inizio nel formato YYYY-MM-DD."),
    end_date: date = Query(description="Data di fine nel formato YYYY-MM-DD."),
    time_unit: str = Query(
        default="month",
        description="Granularità: 'day' (max 7gg), 'month', 'year'."
    ),
):
    """
    Restituisce la storia energetica dell'impianto aggregata per periodo.
    Usato per i grafici storici: produzione giornaliera, mensile e annuale.

    - **day**   → un record per giorno, intervallo massimo 7 giorni
    - **month** → un record per mese, nessun limite di intervallo
    - **year**  → un record per anno, nessun limite di intervallo
    """
    if time_unit not in ("day", "month", "year"):
        raise HTTPException(
            status_code=400,
            detail="time_unit deve essere 'day', 'month' o 'year'"
        )

    data = get_plant_energy_history(start_date, end_date, time_unit)

    if not data:
        raise HTTPException(status_code=404, detail="Nessun dato disponibile")

    return {
        "start_date": str(start_date),
        "end_date": str(end_date),
        "time_unit": time_unit,
        "count": len(data),
        "data": data,
    }