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

@router.get("/today", summary="Dati energetici di oggi incluso il flusso energetico live")
def energy_today():
    """
    Restituisce tutti i dati energetici del giorno corrente, organizzati in sezioni.
    Sezioni:

    - **flow.live**    — potenze istantanee (W) per il widget Power Flow
    - **flow.today**   — totali energetici giornalieri (kWh) per i quattro nodi del sistema
    - **production**   — riepilogo produzione fotovoltaica
    - **inverter**     — stato inverter, temperatura e ultimo aggiornamento
    - **battery**      — stato di carica, totali carica/scarica
    - **grid**         — tensione, frequenza, energia importata/esportata

    Nomenclatura dei campi API Growatt:

    - **pac**                = Power AC, potenza AC in uscita dall'inverter (W)
    - **pacToLocalLoad**     = potenza verso i carichi domestici (W)
    - **pacToGridTotal**     = potenza esportata in rete (W)
    - **pacToUserTotal**     = potenza importata dalla rete (W)
    - **bdc1ChargePower**    = potenza di carica batteria (W)
    - **bdc1DischargePower** = potenza di scarica batteria (W)
    """
    data = get_energy_today()

    if not data:
        raise HTTPException(status_code=404, detail="Data not available")

    return {
        # ── Live power flow (W) ───────────────────────────────────────────────
        # Instantaneous power values — updated every 5 minutes.
        # All values are 0 at night when the inverter is in standby.
        "flow": {
            "live": {
                # AC output power of the inverter — current solar production
                "solar_w": data.get("pac", 0),

                # Power currently consumed by home appliances
                "home_w": data.get("pacToLocalLoad", 0),

                # Power flowing into the battery (0 when not charging)
                "battery_charge_w": data.get("bdc1ChargePower", 0),

                # Power flowing out of the battery (0 when not discharging)
                "battery_discharge_w": data.get("bdc1DischargePower", 0),

                # Power exported to the public grid (0 when importing)
                "grid_export_w": data.get("pacToGridTotal", 0),

                # Power imported from the public grid (0 when exporting)
                "grid_import_w": data.get("pacToUserTotal", 0),
            },

            # ── Daily energy totals (kWh) ─────────────────────────────────────
            # Cumulative values since midnight, reset every day.
            "today": {
                # Total PV energy produced today
                "solar_kwh": data.get("eacToday", 0),

                # Total energy consumed by home appliances today
                "home_kwh": data.get("elocalLoadToday", 0),

                # Total energy charged into the battery today
                "battery_charged_kwh": data.get("echargeToday", 0),

                # Total energy discharged from the battery today
                "battery_discharged_kwh": data.get("edischargeToday", 0),

                # Total energy exported to the grid today
                "grid_exported_kwh": data.get("etoGridToday", 0),

                # Total energy imported from the grid today
                "grid_imported_kwh": data.get("etoUserToday", 0),

                # Energy self-consumed today (direct use + battery discharge)
                "self_consumed_kwh": data.get("eselfToday", 0),
            },

            # Battery state of charge in percent (0-100)
            "battery_soc_pct": data.get("bmsSoc", 0),
        },

        # ── PV production summary ─────────────────────────────────────────────
        "production": {
            "today_kwh": data.get("eacToday"),
            "total_kwh": data.get("eacTotal"),
            "self_consumption_today_kwh": data.get("eselfToday"),
            "local_load_today_kwh": data.get("elocalLoadToday"),
        },

        # ── Inverter status ───────────────────────────────────────────────────
        "inverter": {
            "status": data.get("status"),
            "status_text": data.get("statusText"),
            "temperature_c": data.get("temp1"),
            "is_online": not data.get("lost", True),
            "last_update": data.get("time"),
            "serial_number": data.get("serialNum"),
        },

        # ── Battery ───────────────────────────────────────────────────────────
        "battery": {
            "soc_pct": data.get("bmsSoc"),
            "charge_today_kwh": data.get("echargeToday"),
            "discharge_today_kwh": data.get("edischargeToday"),
            "charge_total_kwh": data.get("echargeTotal"),
            "discharge_total_kwh": data.get("edischargeTotal"),
        },

        # ── Grid ──────────────────────────────────────────────────────────────
        "grid": {
            "voltage_v": data.get("vac1"),
            "frequency_hz": data.get("fac"),
            "exported_today_kwh": data.get("etoGridToday"),
            "imported_today_kwh": data.get("etoUserToday"),
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