"""
Router per i dati energetici dell'impianto fotovoltaico.
=========================================================
Espone gli endpoint relativi alla produzione di energia,
alla curva di potenza giornaliera e ai dati storici.

Endpoints disponibili:
    GET /energy/overview  → KPI aggregati: oggi, mese, anno, totale, CO₂
    GET /energy/today     → Flusso energetico live e totali giornalieri
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

    Campi restituiti:

        today_energy_kwh    — energia prodotta oggi (kWh)
        monthly_energy_kwh  — energia prodotta questo mese (kWh)
        yearly_energy_kwh   — energia prodotta quest'anno (kWh)
        total_energy_kwh    — energia totale prodotta da sempre (kWh)
        current_power_w     — potenza attuale in uscita dall'impianto (W)
        carbon_offset_kg    — CO₂ risparmiata calcolata con fattore europeo 0.4 kg/kWh
        plant_capacity_kw   — potenza di picco dell'impianto (kW)
        timezone            — fuso orario dell'impianto
        last_update         — timestamp dell'ultimo aggiornamento
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

        # CO₂ risparmiata calcolata con il fattore di emissione europeo (0.4 kg/kWh).
        # Il valore restituito da Growatt usa il fattore cinese (circa 0.168 kg/kWh)
        # quindi lo ricalcoliamo dall'energia totale prodotta.
        "carbon_offset_kg": round(float(data.get("total_energy") or 0) * 0.4, 1),

        "plant_capacity_kw": data.get("peak_power_actual"),
        "timezone": data.get("timezone"),
        "last_update": data.get("last_update_time"),
    }

@router.get("/today", summary="Dati energetici di oggi incluso il flusso energetico live")
def energy_today():
    """
    Restituisce il flusso energetico live e i totali del giorno corrente.

    Sezioni:

        flow.live    — potenze istantanee (W) per il widget Power Flow
        flow.today   — totali energetici giornalieri (kWh) per i quattro nodi
        battery      — stato di carica, totali carica/scarica
        grid         — tensione e frequenza di rete

    Nomenclatura dei campi API Growatt:

        ppv                = Power PV — potenza DC prodotta dai pannelli solari (W)
                             È la vera produzione solare, indipendente da batteria e carichi.
                             pac è la potenza AC in uscita dall'inverter — non la usiamo
                             perché esclude la quota che carica la batteria in DC.
        ppv1               = potenza DC stringa 1 (W)
        ppv2               = potenza DC stringa 2 (W)
        pac                = Power AC — potenza AC in uscita dall'inverter (W)
        pacToLocalLoad     = potenza verso i carichi domestici (W)
        pacToGridTotal     = potenza esportata in rete (W)
        pacToUserTotal     = potenza importata dalla rete (W)
        bdc1ChargePower    = Battery DC Charge Power — potenza di carica batteria (W)
        bdc1DischargePower = Battery DC Discharge Power — potenza di scarica batteria (W)
        bmsSoc             = Battery Management System State of Charge — SOC in % (0-100)
    """
    data = get_energy_today()

    if not data:
        raise HTTPException(status_code=404, detail="Dati non disponibili")

    return {
        # ── Flusso energetico live (W) ────────────────────────────────────────
        # Potenze istantanee — aggiornate ogni 5 minuti.
        # Di notte tutti i valori sono 0 (inverter in standby).
        "flow": {
            "live": {
                # ppv = Power PV — vera potenza DC prodotta dai pannelli solari.
                # Non usiamo pac (Power AC) perché è la potenza in uscita dall'inverter
                # e non include la quota che va direttamente a caricare la batteria in DC.
                "solar_w": data.get("ppv", 0),

                # Potenza attualmente consumata dai carichi domestici
                "home_w": data.get("pacToLocalLoad", 0),

                # Potenza in entrata nella batteria (0 se non sta caricando)
                "battery_charge_w": data.get("bdc1ChargePower", 0),

                # Potenza in uscita dalla batteria (0 se non sta scaricando)
                "battery_discharge_w": data.get("bdc1DischargePower", 0),

                # Potenza esportata nella rete pubblica (0 se sta importando)
                "grid_export_w": data.get("pacToGridTotal", 0),

                # Potenza importata dalla rete pubblica (0 se sta esportando)
                "grid_import_w": data.get("pacToUserTotal", 0),
            },

            # ── Totali energetici giornalieri (kWh) ───────────────────────────
            # Valori cumulativi dalla mezzanotte, si azzerano ogni giorno.
            "today": {
                # Energia totale prodotta dai pannelli oggi
                "solar_kwh": data.get("eacToday", 0),

                # Energia totale consumata dai carichi domestici oggi
                "home_kwh": data.get("elocalLoadToday", 0),

                # Energia totale caricata nella batteria oggi
                "battery_charged_kwh": data.get("echargeToday", 0),

                # Energia totale scaricata dalla batteria oggi
                "battery_discharged_kwh": data.get("edischargeToday", 0),

                # Energia totale esportata in rete oggi
                "grid_exported_kwh": data.get("etoGridToday", 0),

                # Energia totale importata dalla rete oggi
                "grid_imported_kwh": data.get("etoUserToday", 0),

                # Energia autoconsumata oggi (uso diretto + scarica batteria)
                "self_consumed_kwh": data.get("eselfToday", 0),

                # Energia totale prodotta dall'impianto da quando è attivo
                "lifetime_solar_kwh": data.get("eacTotal", 0),
            },
        },

        # ── Batteria ──────────────────────────────────────────────────────────
        "battery": {
            # Stato di carica in percentuale (0-100)
            "soc_pct": data.get("bmsSoc"),

            # kWh caricati nella batteria oggi
            "charge_today_kwh": data.get("echargeToday"),

            # kWh scaricati dalla batteria oggi
            "discharge_today_kwh": data.get("edischargeToday"),

            # kWh totali caricati nella batteria da sempre
            "charge_total_kwh": data.get("echargeTotal"),

            # kWh totali scaricati dalla batteria da sempre
            "discharge_total_kwh": data.get("edischargeTotal"),
        },

        # ── Rete elettrica ────────────────────────────────────────────────────
        # Tensione e frequenza sono dati tecnici della rete, non energetici.
        "grid": {
            # Tensione di rete in Volt
            "voltage_v": data.get("vac1"),

            # Frequenza di rete in Hz
            "frequency_hz": data.get("fac"),
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
    Usato principalmente per costruire il grafico della curva di produzione giornaliera.
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

    Granularità disponibili:

        day   — un record per giorno, intervallo massimo 7 giorni
        month — un record per mese, nessun limite di intervallo
        year  — un record per anno, nessun limite di intervallo

    Usato per i grafici storici: produzione giornaliera, mensile e annuale.
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

@router.get("/debug/raw")
def energy_debug_raw():
    """
    Endpoint temporaneo per ispezionare tutti i campi raw di min_energy().
    DA RIMUOVERE prima del deploy in produzione.
    """
    from services.growatt import get_api
    import os
    api = get_api()
    return api.min_energy(os.getenv("GROWATT_DEVICE_SN"))