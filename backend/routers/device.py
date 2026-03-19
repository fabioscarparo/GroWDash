"""
Device Router — Inverter Hardware & Configuration Endpoints.
============================================================

This router exposes a set of REST endpoints dedicated to surfacing the
technical state and configuration of the photovoltaic system's hardware
components. It acts as a structured proxy between the Growatt Cloud API
(accessed via the internal `services.growatt` module) and the frontend client,
normalizing raw SDK payloads into clean, consistently-keyed JSON objects.

Available Endpoints:
    GET /device/list     →  Discover all hardware modules registered to the plant.
    GET /device/detail   →  Deep telemetry for the primary inverter and its battery pack.
    GET /device/settings →  Read-only dump of the inverter's current configuration settings.

Authentication:
    All endpoints require a valid session cookie to be present.
    Authentication is enforced via the `get_current_user` dependency injected
    by FastAPI's `Depends()` mechanism on every route handler.

Data Source:
    Raw data originates from the `growattServer` Python library (used server-side),
    which communicates with the official Growatt Cloud OpenAPI under the hood.
"""

from fastapi import APIRouter, HTTPException, Depends
from services.growatt import get_device_detail, get_device_settings, get_device_list
from typing import Optional, Dict, Any, List
from auth import get_current_user


# Create an APIRouter instance scoped to the /device prefix.
# All route handlers registered on this router will inherit this prefix
# and the "Devices" OpenAPI tag for documentation grouping.
router = APIRouter(
    prefix="/device",
    tags=["Devices"],
)


@router.get("/list", summary="List all plant devices")
def device_list(current_user=Depends(get_current_user)):
    """
    Returns the full catalogue of hardware modules registered to the monitored plant.

    This endpoint aggregates the raw device list from the Growatt Cloud API and
    normalizes each entry into a unified schema, regardless of the underlying
    device category.

    Device Types (Growatt numeric identifiers):
        type 3 — SDM Meter / Smart Energy Meter (consumption monitoring module).
        type 7 — MIN Series Inverter (the primary photovoltaic conversion unit).

    Online Status Inference:
        The Growatt API natively exposes the `lost` boolean flag for inverters only.
        Auxiliary modules such as SDM Meters do not carry their own connectivity state.
        To work around this API limitation, we derive the online status for each
        auxiliary device by checking whether its parent Datalogger serial number is
        present in the set of actively reporting dataloggers — i.e., those linked
        to at least one non-lost inverter.

    Returns:
        dict: A JSON object with the following structure:
            {
                "count": int,            # Total number of registered hardware modules.
                "devices": [
                    {
                        "serial_number": str,    # Primary hardware serial (device_sn).
                        "device_id": str,        # Internal Growatt numeric device identifier.  
                        "model": str,            # Commercial model string (e.g., "MIN 6000TL-XH").
                        "type": int,             # Integer device category code (3=Meter, 7=Inverter).
                        "datalogger_sn": str,    # Serial of the Datalogger this device reports through.
                        "manufacturer": str,     # Hardware manufacturer name.
                        "last_update": str,      # Datetime string of the last data synchronization.
                        "is_online": bool        # Inferred or native network connectivity status.
                    },
                    ...
                ]
            }

    Raises:
        HTTPException 404: If the Growatt API returns no registered devices for the plant.
    """
    data = get_device_list()

    if not data:
        raise HTTPException(status_code=404, detail="No devices found for this plant.")

    # Build a set of datalogger serial numbers whose associated inverter is actively online.
    # An inverter is considered online when its `lost` flag is explicitly False.
    # This set is then used to infer connectivity for auxiliary modules (e.g., Meters)
    # that do not natively expose a `lost` attribute in the API response.
    online_dataloggers = {
        d.get("datalogger_sn")
        for d in data
        if d.get("lost") is False and d.get("datalogger_sn")
    }

    return {
        "count": len(data),
        "devices": [
            {
                "serial_number": device.get("device_sn"),
                "device_id": device.get("device_id"),
                "model": device.get("model"),
                "type": device.get("type"),
                "datalogger_sn": device.get("datalogger_sn"),
                "manufacturer": device.get("manufacturer"),
                "last_update": device.get("last_update_time"),
                # For devices with a native `lost` flag (inverters), use it directly.
                # For auxiliary devices (meters), infer status from the parent datalogger.
                "is_online": not device["lost"] if "lost" in device else (
                    device.get("datalogger_sn") in online_dataloggers
                ),
            }
            for device in data
        ],
    }


@router.get("/detail", summary="Primary inverter technical details")
def device_detail(current_user=Depends(get_current_user)):
    """
    Returns comprehensive technical telemetry for the primary MIN inverter
    and its attached Battery DC Converter (BDC) storage module, if present.

    This endpoint normalizes the raw `min_detail` Growatt API payload, which
    contains a deeply nested mix of inverter parameters, battery identifiers,
    and operational configuration beans (e.g., `tlxSetbean`). The response
    is structured into two top-level sections:

        1. Inverter fields — Core identifiers, firmware versions, and connectivity.
        2. Battery block  — BDC hardware identifiers and all State of Charge (SOC)
                            operational boundary parameters extracted from `tlxSetbean`.

    Battery Conditional Rendering:
        The `battery` block is only included in the response if the API returns a
        non-empty `bdc1Sn` serial number, confirming the physical presence of an
        energy storage unit. If no battery is detected, the field is set to null.

    SOC Parameters (sourced from `tlxSetbean`):
        These represent the configured charge/discharge thresholds for the battery
        across different operational modes (on-grid, off-grid, winter mode, etc.).
        They are critical for understanding how the inverter manages energy storage.

    Returns:
        dict: A JSON object with the following structure:
            {
                "serial_number": str,          # Inverter hardware serial (serialNum).
                "model": str,                  # Commercial model label (modelText).
                "firmware_version": str,        # Installed inverter firmware version.
                "monitor_version": str,         # Version of the inverter's monitoring core.
                "communication_version": str,   # WiFi/LAN communication module version.
                "status": int,                  # Numeric operating status code.
                "status_text": str,             # Human-readable operating status string.
                "is_online": bool,              # True if `lost` flag is False.
                "peak_power_w": int,            # Inverter peak power output in Watts (pmax).
                "datalogger_sn": str,           # Serial of the parent Datalogger (dataLogSn).
                "last_update": str,             # Timestamp of the last cloud synchronization.
                "battery": {                    # null if no BDC battery is detected.
                    "serial_number": str,        # Battery pack hardware serial (bdc1Sn).
                    "model": str,                # Battery model identifier (bdc1Model).
                    "version": str,              # BDC firmware/version string (bdc1Version).
                    "system_energy_kwh": int,    # Gross installed capacity (batSysEnergy).
                    "ac_charging_stop_soc": int, # AC charge stop threshold (ubAcChargingStopSOC).
                    "discharge_stop_soc": str,   # Generic discharge stop SOC.
                    "on_grid_discharge_stop_soc": int,          # On-grid mode discharge floor.
                    "win_mode_on_grid_discharge_stop_soc": int, # Winter on-grid discharge floor.
                    "win_mode_off_grid_discharge_stop_soc": int,# Winter off-grid discharge floor.
                    "charge_soc_low_limit": int,   # Minimum charge SOC threshold (wchargeSOCLowLimit).
                    "discharge_soc_low_limit": int,# Minimum discharge SOC (wdisChargeSOCLowLimit).
                    "peak_shaving_backup_soc": int,# SOC reserve for peak-shaving mode.
                    "charge_stop_soc": str         # Generic charge stop SOC.
                }
            }

    Raises:
        HTTPException 404: If the Growatt API returns no data for the configured device serial.
    """
    data = get_device_detail()

    if not data:
        raise HTTPException(status_code=404, detail="Device data unavailable.")

    return {
        "serial_number":         data.get("serialNum"),
        "model":                 data.get("modelText"),
        "firmware_version":      data.get("fwVersion"),
        "monitor_version":       data.get("monitorVersion"),
        "communication_version": data.get("communicationVersion"),
        "status":                data.get("status"),
        "status_text":           data.get("statusText"),
        "is_online":             not data.get("lost", True),
        "peak_power_w":          data.get("pmax"),
        "datalogger_sn":         data.get("dataLogSn"),
        "last_update":           data.get("lastUpdateTimeText"),

        # Battery block: only populated when a BDC serial number is present in the payload.
        # SOC parameters are nested inside `tlxSetbean`, a configuration sub-object
        # that aggregates all threshold settings from the inverter's operational registers.
        "battery": {
            "serial_number":  data.get("bdc1Sn", "N/A"),
            "model":          data.get("bdc1Model", "N/A"),
            "version":        data.get("bdc1Version", "N/A"),
            "system_energy_kwh": data.get("batSysEnergy", 0),

            # SOC operational limits extracted from tlxSetbean
            "ac_charging_stop_soc":             data.get("tlxSetbean", {}).get("ubAcChargingStopSOC", "N/A"),
            "discharge_stop_soc":               data.get("tlxSetbean", {}).get("discharge_stop_soc", ""),
            "on_grid_discharge_stop_soc":        data.get("tlxSetbean", {}).get("onGridDischargeStopSOC", ""),
            "win_mode_on_grid_discharge_stop_soc":  data.get("tlxSetbean", {}).get("winModeOnGridDischargeStopSOC", ""),
            "win_mode_off_grid_discharge_stop_soc": data.get("tlxSetbean", {}).get("winModeOffGridDischargeStopSOC", ""),
            "charge_soc_low_limit":             data.get("tlxSetbean", {}).get("wchargeSOCLowLimit", ""),
            "discharge_soc_low_limit":          data.get("tlxSetbean", {}).get("wdisChargeSOCLowLimit", ""),
            "peak_shaving_backup_soc":          data.get("tlxSetbean", {}).get("ubPeakShavingBackupSOC", ""),
            "charge_stop_soc":                  data.get("tlxSetbean", {}).get("charge_stop_soc", ""),
        } if data.get("bdc1Sn") else None,
    }


@router.get("/settings", summary="Inverter configuration settings")
def device_settings(current_user=Depends(get_current_user)):
    """
    Returns the complete, unfiltered set of configuration settings currently
    programmed on the primary MIN inverter.

    This endpoint acts as a transparent pass-through to the underlying
    `get_device_settings()` service call and does not perform any transformation,
    filtering, or reshaping of the raw Growatt API payload. It is intended for
    diagnostic, debugging, and advanced configuration inspection purposes.

    Use Cases:
        - Introspecting all inverter registers without navigating the Growatt app.
        - Comparing before/after state when changing inverter parameters remotely.
        - Providing data for a future settings management interface.

    Returns:
        dict: The raw, unmodified dictionary of inverter configuration settings
              as returned by the Growatt Cloud API.

    Raises:
        HTTPException 404: If the Growatt API returns an empty settings payload.
    """
    data = get_device_settings()

    if not data:
        raise HTTPException(status_code=404, detail="Inverter settings unavailable.")

    return data