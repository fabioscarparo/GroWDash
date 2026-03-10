"""
Energy router for the PV plant.
=================================
Exposes all endpoints related to energy production, live power flow,
daily power curves and historical data.

Available endpoints:
    GET /energy/overview        → Aggregated KPIs: today, month, year, total, CO₂
    GET /energy/today           → Live power flow and daily energy totals
    GET /energy/history         → 5-minute power snapshots (max 7 days)
    GET /energy/aggregate       → Solar energy history aggregated by day, month or year
    GET /energy/daily-breakdown → Full energy breakdown by day, reconstructed from snapshots
"""

from fastapi import APIRouter, HTTPException, Query, Depends
from datetime import date, datetime
from typing import Optional, Dict, Any, List
from auth import get_current_user
from services.growatt import (
    get_energy_today,
    get_energy_history,
    get_plant_energy_history,
    get_plant_energy_overview,
    get_daily_energy_breakdown,
)

router = APIRouter(
    prefix="/energy",
    tags=["Energy"],
)


@router.get("/overview", summary="Plant energy overview")
def energy_overview(current_user: str = Depends(get_current_user)):
    """
    Returns aggregated energy KPIs for the PV plant.

    Fields:
        today_energy_kwh    — energy produced today (kWh)
        monthly_energy_kwh  — energy produced this month (kWh)
        yearly_energy_kwh   — energy produced this year (kWh)
        total_energy_kwh    — total lifetime energy produced (kWh)
        current_power_w     — current output power from the plant (W)
        carbon_offset_kg    — CO₂ saved, using the European emission factor
                              of 0.4 kg/kWh. Growatt returns a value based on
                              the Chinese factor (~0.168 kg/kWh), so we
                              recalculate it from total lifetime energy.
        plant_capacity_kw   — peak power capacity of the plant (kWp)
        timezone            — plant timezone
        last_update         — timestamp of the last data update
    """
    data = get_plant_energy_overview()

    if not data:
        raise HTTPException(status_code=404, detail="Data not available")

    return {
        "today_energy_kwh":   data.get("today_energy"),
        "monthly_energy_kwh": data.get("monthly_energy"),
        "yearly_energy_kwh":  data.get("yearly_energy"),
        "total_energy_kwh":   data.get("total_energy"),
        "current_power_w":    data.get("current_power"),
        "carbon_offset_kg":   round(float(data.get("total_energy") or 0) * 0.4, 1),
        "plant_capacity_kw":  data.get("peak_power_actual"),
        "timezone":           data.get("timezone"),
        "last_update":        data.get("last_update_time"),
    }


@router.get("/today", summary="Today's energy data including live power flow")
def energy_today(current_user: str = Depends(get_current_user)):
    """
    Returns the live power flow and daily energy totals for the current day.

    Sections:
        flow.live    — instantaneous power values (W) for the Power Flow widget
        flow.today   — cumulative daily energy totals (kWh) for all four nodes
        battery      — state of charge, charge/discharge totals
        grid         — grid voltage and frequency

    Growatt API field reference:
        ppv                → DC power from PV panels (W) — true solar production.
                             We use ppv instead of pac (AC inverter output) because
                             pac excludes the portion that charges the battery in DC.
        pacToLocalLoad     → power delivered to home loads (W)
        pacToGridTotal     → power exported to the grid (W)
        pacToUserTotal     → power imported from the grid (W)
        bdc1ChargePower    → battery DC charge power (W)
        bdc1DischargePower → battery DC discharge power (W)
        bmsSoc             → battery state of charge (0–100%)
        eacToday           → solar energy produced today (kWh)
        elocalLoadToday    → home energy consumed today (kWh)
        echargeToday       → energy charged into battery today (kWh)
        edischargeToday    → energy discharged from battery today (kWh)
        etoGridToday       → energy exported to grid today (kWh)
        etoUserToday       → energy imported from grid today (kWh)
        eselfToday         → self-consumed energy today (kWh)
                             = solar direct to loads + battery discharge.
                             This is NOT equal to solar production alone.
        eacTotal           → total lifetime energy produced by the plant (kWh)
    """
    data = get_energy_today()

    if not data:
        raise HTTPException(status_code=404, detail="Data not available")

    return {
        "flow": {

            # Instantaneous power values — updated every 5 minutes.
            # All values are 0 at night when the inverter is in standby.
            "live": {
                "solar_w":             data.get("ppv", 0),
                "home_w":              data.get("pacToLocalLoad", 0),
                "battery_charge_w":    data.get("bdc1ChargePower", 0),
                "battery_discharge_w": data.get("bdc1DischargePower", 0),
                "grid_export_w":       data.get("pacToGridTotal", 0),
                "grid_import_w":       data.get("pacToUserTotal", 0),
            },

            # Cumulative energy totals since midnight — reset to zero each day.
            "today": {
                "solar_kwh":              data.get("eacToday", 0),
                "home_kwh":               data.get("elocalLoadToday", 0),
                "battery_charged_kwh":    data.get("echargeToday", 0),
                "battery_discharged_kwh": data.get("edischargeToday", 0),
                "grid_exported_kwh":      data.get("etoGridToday", 0),
                "grid_imported_kwh":      data.get("etoUserToday", 0),
                "self_consumed_kwh":      data.get("eselfToday", 0),
                "lifetime_solar_kwh":     data.get("eacTotal", 0),
            },
        },

        # Battery state of charge and daily charge/discharge totals.
        "battery": {
            "soc_pct":             data.get("bmsSoc"),
            "charge_today_kwh":    data.get("echargeToday"),
            "discharge_today_kwh": data.get("edischargeToday"),
            "charge_total_kwh":    data.get("echargeTotal"),
            "discharge_total_kwh": data.get("edischargeTotal"),
        },

        # Grid technical parameters — voltage and frequency.
        "grid": {
            "voltage_v":    data.get("vac1"),
            "frequency_hz": data.get("fac"),
        },
    }


@router.get("/history", summary="5-minute power snapshots for a date range")
def energy_history(
    start_date: date = Query(
        default=None,
        description="Start date in YYYY-MM-DD format. Defaults to today."
    ),
    end_date: date = Query(
        default=None,
        description="End date in YYYY-MM-DD format. Maximum 7 days from start_date. Defaults to start_date."
    ),
    current_user: str = Depends(get_current_user)
):
    """
    Returns a time series of 5-minute energy snapshots for a date range.

    Each record contains: timestamp, instantaneous power flows (W),
    grid voltage, inverter temperature and battery SOC.
    Maximum 7 days per request (Growatt API limit).

    Used to render the daily power curve chart (DailyCurveCard)
    and the battery SOC curve chart (SOCCurveCard).
    """
    data = get_energy_history(start_date, end_date)

    if not data:
        raise HTTPException(status_code=404, detail="No historical data available")

    return {
        "start_date": str(start_date or date.today()),
        "end_date":   str(end_date or start_date or date.today()),
        "count":      len(data),
        "data":       data,
    }



@router.get("/aggregate", summary="Solar energy history aggregated by day, month or year")
def plant_energy_aggregate(
    start_date: date = Query(description="Start date in YYYY-MM-DD format."),
    end_date: date = Query(description="End date in YYYY-MM-DD format."),
    time_unit: str = Query(
        default="month",
        description="Granularity: 'day' (max 7 days), 'month', or 'year'."
    ),
    current_user: str = Depends(get_current_user)
):
    """
    Returns the plant's solar energy history aggregated by period.

    Available granularities:
        day   — one record per day, maximum 7-day range per request
        month — one record per month, no range limit
        year  — one record per year, no range limit

    Note: only solar production is available at this granularity.
    The Growatt API does not provide aggregated consumption, grid or
    battery data for MIN inverters. Use /energy/daily-breakdown for
    a full breakdown of all energy flows at day-level granularity.
    """
    if time_unit not in ("day", "month", "year"):
        raise HTTPException(
            status_code=400,
            detail="time_unit must be 'day', 'month' or 'year'."
        )

    data = get_plant_energy_history(start_date, end_date, time_unit)

    if not data:
        raise HTTPException(status_code=404, detail="No data available")

    return {
        "start_date": str(start_date),
        "end_date":   str(end_date),
        "time_unit":  time_unit,
        "count":      len(data),
        "data":       data,
    }


@router.get("/daily-breakdown", summary="Full energy breakdown aggregated by day")
def energy_daily_breakdown(
    start_date: date = Query(description="Start date in YYYY-MM-DD format."),
    end_date: date = Query(description="End date in YYYY-MM-DD format."),
    current_user: str = Depends(get_current_user)
):
    """
    Returns daily energy totals for all power flows, reconstructed from
    5-minute inverter snapshots.

    Unlike /energy/aggregate, this endpoint includes all energy flows —
    not just solar production. It covers the full energy picture:
    solar, home consumption, grid import/export and battery charge/discharge.

    This is necessary because the Growatt API does not natively provide
    aggregated consumption data for MIN inverters. The values are
    approximated by integrating the 5-minute power readings over time:
        kWh ≈ Σ(W) × (5 / 60) / 1000

    There is no hard limit on the date range — the service layer
    automatically splits long ranges into 7-day chunks and fetches
    them in parallel. Longer ranges are slower on first load but
    are cached for 5 minutes afterwards.

    Typical response times:
        7 days   → ~0.5s  (1 API call)
        30 days  → ~1s    (5 parallel calls)
        365 days → ~4-6s  (53 parallel calls, then cached)

    Fields per day:
        date                    — YYYY-MM-DD
        solar_kwh               — solar energy produced (kWh)
        home_kwh                — home energy consumed (kWh)
        grid_import_kwh         — energy imported from the grid (kWh)
        grid_export_kwh         — energy exported to the grid (kWh)
        battery_charged_kwh     — energy charged into the battery (kWh)
        battery_discharged_kwh  — energy discharged from the battery (kWh)
    """
    data = get_daily_energy_breakdown(start_date, end_date)

    if not data:
        raise HTTPException(status_code=404, detail="No data available")

    return {
        "start_date": str(start_date),
        "end_date":   str(end_date),
        "count":      len(data),
        "data":       data,
    }
