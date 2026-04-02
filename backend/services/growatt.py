"""
Growatt V1 API integration service.
=====================================
This module acts as the bridge between FastAPI and the growattServer library.
All calls to the Growatt API go through this file, providing a single point
of control and making future changes easier.

A singleton API instance is maintained for the lifetime of the application,
and all responses are cached in memory for 5 minutes to match the Growatt
data update interval.

Required environment variables (.env):
    GROWATT_TOKEN     → V1 API token from your ShinePhone account
    GROWATT_PLANT_ID  → Numeric plant ID
    GROWATT_DEVICE_SN → Serial number of the MIN inverter
"""

import growattServer
from dotenv import load_dotenv
from datetime import date, timedelta, datetime, timezone as dt_timezone
from concurrent.futures import ThreadPoolExecutor, as_completed
from functools import wraps
import threading
import time
import os

load_dotenv()

GROWATT_TOKEN     = os.getenv("GROWATT_TOKEN")
GROWATT_PLANT_ID  = os.getenv("GROWATT_PLANT_ID")
GROWATT_DEVICE_SN = os.getenv("GROWATT_DEVICE_SN")

# Cache TTL in seconds — aligned with the Growatt API update interval
CACHE_TTL = 5 * 60

# ── API instance ──────────────────────────────────────────────────────────────

_api_instance: growattServer.OpenApiV1 | None = None
_api_lock = threading.Lock()

def get_api() -> growattServer.OpenApiV1:
    """
    Returns the singleton Growatt V1 API instance.
    The instance is created on first access (lazy initialization)
    and reused for all subsequent requests.
    Thread-safe via a lock.
    """
    global _api_instance
    if _api_instance is None:
        with _api_lock:
            if _api_instance is None:
                _api_instance = growattServer.OpenApiV1(GROWATT_TOKEN)
    return _api_instance


# ── In-memory TTL cache ───────────────────────────────────────────────────────

_cache: dict = {}
_cache_lock = threading.Lock()

CACHE_TTL         = 300       # 5 minutes — current data
CACHE_TTL_LONG    = 86400     # 24 hours  — historical data that will not change
SAMPLE_INTERVAL_MINUTES = 5
SAMPLE_TO_KWH = SAMPLE_INTERVAL_MINUTES / 60 / 1000

def ttl_cache(key_fn=None, ttl=CACHE_TTL):
    """
    Decorator that adds a TTL-based in-memory cache to a function.

    Cache entries expire after `ttl` seconds. The cache key is computed
    by key_fn(args, kwargs) if provided, otherwise by the function name
    and its arguments.

    Args:
        key_fn: Optional callable that receives (args, kwargs) and returns
                a string cache key.
        ttl:    Cache lifetime in seconds. Defaults to CACHE_TTL (5 min).
                Can be a callable that returns the TTL based on (args, kwargs).

    Usage:
        @ttl_cache()
        def get_something(): ...

        @ttl_cache(key_fn=lambda a, k: f"prefix:{a[0]}", ttl=lambda a, k: 3600 if 'hist' in a[0] else 300)
        def get_dynamic(path): ...
    """
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            cache_key = key_fn(args, kwargs) if key_fn else f"{func.__name__}:{args}:{kwargs}"
            actual_ttl = ttl(args, kwargs) if callable(ttl) else ttl

            with _cache_lock:
                if cache_key in _cache:
                    value, ts, entry_ttl = _cache[cache_key]
                    if time.time() - ts < entry_ttl:
                        return value

            result = func(*args, **kwargs)

            with _cache_lock:
                _cache[cache_key] = (result, time.time(), actual_ttl)

            return result
        return wrapper
    return decorator


def retry_api(retries=3, backoff=2, exceptions=(Exception,)):
    """
    Decorator that retries a function call if it raises specific exceptions.
    Implements exponential backoff between attempts.
    """
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            last_err = None
            for i in range(retries):
                try:
                    return func(*args, **kwargs)
                except exceptions as e:
                    last_err = e
                    if i < retries - 1:
                        sleep_time = backoff ** i
                        time.sleep(sleep_time)
            raise last_err
        return wrapper
    return decorator


def _to_non_negative_float(value) -> float:
    """
    Parses an input into a non-negative float.
    Returns 0.0 for null/invalid/negative values.
    """
    try:
        if value is None:
            return 0.0
        if isinstance(value, str):
            value = value.strip().replace(",", ".")
            if not value:
                return 0.0
        parsed = float(value)
        return parsed if parsed > 0 else 0.0
    except (TypeError, ValueError):
        return 0.0


def _round_kwh(value: float) -> float:
    """Rounds kWh values to 2 decimals with a tiny epsilon for stability."""
    return round(value + 1e-9, 2)


def _empty_integrated_totals() -> dict:
    """Returns a zero-initialized dictionary for integrated daily kWh totals."""
    return {
        "solar_kwh": 0.0,
        "home_kwh": 0.0,
        "grid_import_kwh": 0.0,
        "grid_export_kwh": 0.0,
        "battery_charged_kwh": 0.0,
        "battery_discharged_kwh": 0.0,
    }


def _accumulate_snapshot_energy(totals: dict, snapshot: dict) -> None:
    """
    Adds one 5-minute power snapshot to integrated daily energy totals.
    """
    totals["solar_kwh"] += _to_non_negative_float(snapshot.get("solar_w")) * SAMPLE_TO_KWH
    totals["home_kwh"] += _to_non_negative_float(snapshot.get("home_w")) * SAMPLE_TO_KWH
    totals["grid_import_kwh"] += _to_non_negative_float(snapshot.get("grid_import_w")) * SAMPLE_TO_KWH
    totals["grid_export_kwh"] += _to_non_negative_float(snapshot.get("grid_export_w")) * SAMPLE_TO_KWH
    totals["battery_charged_kwh"] += _to_non_negative_float(snapshot.get("battery_charge_w")) * SAMPLE_TO_KWH
    totals["battery_discharged_kwh"] += _to_non_negative_float(snapshot.get("battery_discharge_w")) * SAMPLE_TO_KWH


def _reconcile_daily_totals(counter_snapshot: dict | None, integrated: dict) -> dict:
    """
    Reconciles inverter cumulative counters with power-integrated estimates.

    Growatt MIN counters can under-report small overnight imports/loads.
    To avoid losing those values, `home_kwh` and `grid_import_kwh` are the
    maximum between cumulative counters and integrated 5-minute power.
    """
    s = counter_snapshot or {}

    solar_counter = _to_non_negative_float(s.get("eacToday"))
    home_counter = _to_non_negative_float(s.get("elocalLoadToday"))
    grid_import_counter = _to_non_negative_float(s.get("etoUserToday"))
    grid_export_counter = _to_non_negative_float(s.get("etoGridToday"))
    battery_charge_counter = _to_non_negative_float(s.get("echargeToday"))
    battery_discharge_counter = _to_non_negative_float(s.get("edischargeToday"))
    self_counter = _to_non_negative_float(s.get("eselfToday"))

    home_eff = max(home_counter, _to_non_negative_float(integrated.get("home_kwh")))
    grid_import_eff = max(grid_import_counter, _to_non_negative_float(integrated.get("grid_import_kwh")))
    self_eff = max(self_counter, max(home_eff - grid_import_eff, 0.0))

    return {
        "solar_kwh": _round_kwh(solar_counter),
        "home_kwh": _round_kwh(home_eff),
        "grid_import_kwh": _round_kwh(grid_import_eff),
        "grid_export_kwh": _round_kwh(grid_export_counter),
        "battery_charged_kwh": _round_kwh(battery_charge_counter),
        "battery_discharged_kwh": _round_kwh(battery_discharge_counter),
        "self_consumed_kwh": _round_kwh(self_eff),
    }


# ── Service functions ─────────────────────────────────────────────────────────

@ttl_cache()
@retry_api()
def get_plant_info() -> dict:
    """
    Returns general information about the PV plant:
    name, location, peak power, total energy and status.

    Returns:
        dict: First plant found, or empty dict if none available.
    """
    api = get_api()
    result = api.plant_list()
    plants = result.get("plants", [])
    if not plants:
        return {}
    return plants[0]


def get_plant_local_date() -> date:
    """
    Calculates the current local date at the PV plant based on its
    configured timezone offset (e.g., 'GMT+1').

    This ensures that 'Today' data is correctly identified regardless
    of the server's system time (which is usually UTC).
    """
    try:
        overview = get_plant_energy_overview()
        tz_str = overview.get("timezone", "GMT+0")

        # Parse 'GMT+N' or 'GMT-N'
        offset = 0
        if "GMT" in tz_str:
            offset_str = tz_str.replace("GMT", "").strip()
            if offset_str:
                offset = int(offset_str)

        # Calculate local time from UTC
        utc_now = datetime.now(dt_timezone.utc)
        local_now = utc_now + timedelta(hours=offset)
        return local_now.date()
    except Exception:
        # Fallback to server date if timezone lookup fails
        return date.today()


@ttl_cache()
@retry_api()
def get_device_list() -> list:
    """
    Returns the list of all devices connected to the plant.
    Includes inverters, meters and any other device connected
    to the datalogger.

    Device types:
        type 3 → Datalogger / meter
        type 7 → MIN inverter

    Returns:
        list: Devices with type, serial number and online status.
    """
    api = get_api()
    result = api.device_list(GROWATT_PLANT_ID)
    return result.get("devices", [])


@ttl_cache()
@retry_api()
def get_device_detail() -> dict:
    """
    Returns detailed technical data for the MIN inverter:
    firmware version, model, operating status and hardware parameters.

    Returns:
        dict: Full technical data of the inverter.
    """
    api = get_api()
    return api.min_detail(GROWATT_DEVICE_SN)


@ttl_cache()
@retry_api()
def get_device_settings() -> dict:
    """
    Returns all settings configured on the MIN inverter:
    working mode, grid limits, battery settings, etc.

    Returns:
        dict: All inverter settings as a flat dictionary.
    """
    api = get_api()
    return api.min_settings(GROWATT_DEVICE_SN)


@ttl_cache()
@retry_api()
def get_energy_today() -> dict:
    """
    Returns all energy data for the MIN inverter for the current day.

    Growatt API field reference:
        ppv                → total DC power from PV panels (W) — true solar production
        pac                → AC output power from inverter (W)
        pacToLocalLoad     → power to home loads (W)
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

    Returns:
        dict: Instantaneous power values (W), daily totals (kWh),
              inverter status and battery state.
    """
    api = get_api()
    return api.min_energy(GROWATT_DEVICE_SN)


@ttl_cache(key_fn=lambda a, k: f"history:{a[0]}:{a[1]}")
@retry_api()
def get_energy_history(start_date: date = None, end_date: date = None) -> list:
    """
    Returns a time series of 5-minute energy snapshots for a date range.

    The Growatt API records one snapshot every 5 minutes, so a full day
    contains approximately 288 records. The API returns a maximum of 100
    records per call — pagination is handled automatically, with all pages
    fetched in parallel for faster response times.

    Args:
        start_date: Start of the range. Defaults to today.
        end_date:   End of the range. Defaults to start_date.

    Returns:
        list: Snapshots ordered from oldest to newest, each containing
              timestamp, power flows (W), voltage and temperature.
    """
    if start_date is None:
        start_date = get_plant_local_date()
    if end_date is None:
        end_date = start_date

    api = get_api()

    # First call to get the total record count
    first = api.min_energy_history(
        GROWATT_DEVICE_SN,
        start_date=start_date,
        end_date=end_date,
        page=1,
        limit=100,
    )
    raw_data = first.get("datas", [])
    total = first.get("count", 0)

    if not raw_data:
        return []

    all_records = list(raw_data)

    # Fetch remaining pages in parallel
    remaining_pages = range(2, (total // 100) + 2) if total > 100 else []

    if remaining_pages:
        def fetch_page(page):
            result = api.min_energy_history(
                GROWATT_DEVICE_SN,
                start_date=start_date,
                end_date=end_date,
                page=page,
                limit=100,
            )
            return result.get("datas", [])

        with ThreadPoolExecutor(max_workers=4) as executor:
            futures = {executor.submit(fetch_page, p): p for p in remaining_pages}
            page_results = {}
            for future in as_completed(futures):
                page_results[futures[future]] = future.result()

        for page in sorted(page_results.keys()):
            all_records.extend(page_results[page])

    # Map to frontend-friendly field names
    history = []
    for record in all_records:
        history.append({
            "time":                record.get("time"),
            "solar_w":             record.get("ppv", 0),
            "home_w":              record.get("pacToLocalLoad", 0),
            "battery_charge_w":    record.get("bdc1ChargePower", 0),
            "battery_discharge_w": record.get("bdc1DischargePower", 0),
            "grid_import_w":       record.get("pacToUserTotal", 0),
            "grid_export_w":       record.get("pacToGridTotal", 0),
            "voltage_v":           record.get("vac1", 0),
            "temperature_c":       record.get("temp1", 0),
            "soc_pct":             record.get("bmsSoc", 0),
        })

    history.reverse()
    return history


@ttl_cache(key_fn=lambda a, k: f"plant_history:{a[0]}:{a[1]}:{a[2]}")
@retry_api()
def get_plant_energy_history(
    start_date: date,
    end_date: date,
    time_unit: str = "month"
) -> list:
    """
    Returns aggregated plant energy history by day, month or year.

    Growatt API limits:
        "day"   → maximum 7 days per call. Longer ranges are automatically
                  split into 7-day chunks and fetched in parallel.
        "month" → no practical limit, automatic pagination.
        "year"  → no practical limit, automatic pagination.

    The API only returns periods with available data, skipping periods
    with zero production. This function fills gaps with energy=0 to
    guarantee a continuous series required for charts.

    Args:
        start_date: Start of the range.
        end_date:   End of the range.
        time_unit:  Granularity — "day", "month" or "year".

    Returns:
        list: Complete list of records with 'date' and 'energy' (kWh),
              sorted chronologically, with no gaps.
    """
    api = get_api()
    results = []

    if time_unit == "day":
        # Build all chunks to fetch
        chunks = []
        chunk_start = start_date
        while chunk_start <= end_date:
            chunk_end = min(chunk_start + timedelta(days=6), end_date)
            chunks.append((chunk_start, chunk_end))
            chunk_start += timedelta(days=7)

        # Fetch all chunks in parallel
        def fetch_chunk(cs, ce):
            result = api.plant_energy_history(
                GROWATT_PLANT_ID,
                start_date=cs,
                end_date=ce,
                time_unit=time_unit,
                page=1,
                perpage=7,
            )
            return result.get("energys", [])

        with ThreadPoolExecutor(max_workers=4) as executor:
            futures = {executor.submit(fetch_chunk, s, e): (s, e) for s, e in chunks}
            chunk_results = {}
            for future in as_completed(futures):
                chunk_results[futures[future][0]] = future.result()

        # Reassemble in chronological order
        for chunk_start, _ in chunks:
            results.extend(chunk_results.get(chunk_start, []))

    else:
        page = 1
        perpage = 100
        while True:
            result = api.plant_energy_history(
                GROWATT_PLANT_ID,
                start_date=start_date,
                end_date=end_date,
                time_unit=time_unit,
                page=page,
                perpage=perpage,
            )
            records = result.get("energys", [])
            if not records:
                break
            results.extend(records)
            total = result.get("count", 0)
            if page * perpage >= total:
                break
            page += 1

    # Fill gaps with zero for missing periods
    energy_map = {str(r["date"]): r["energy"] for r in results}
    complete = []

    if time_unit == "day":
        current = start_date
        while current <= end_date:
            key = current.strftime("%Y-%m-%d")
            complete.append({"date": key, "energy": energy_map.get(key, "0")})
            current += timedelta(days=1)

    elif time_unit == "month":
        current = start_date.replace(day=1)
        end = end_date.replace(day=1)
        while current <= end:
            key = current.strftime("%Y-%m")
            complete.append({"date": key, "energy": energy_map.get(key, "0")})
            if current.month == 12:
                current = current.replace(year=current.year + 1, month=1)
            else:
                current = current.replace(month=current.month + 1)

    elif time_unit == "year":
        for year in range(start_date.year, end_date.year + 1):
            key = str(year)
            complete.append({"date": key, "energy": energy_map.get(key, "0")})

    return complete


@ttl_cache(
    key_fn=lambda a, k: f"daily_breakdown:{a[0]}:{a[1]}",
    ttl=lambda a, k: CACHE_TTL if a[1] >= get_plant_local_date() else CACHE_TTL_LONG
)
def get_daily_energy_breakdown(start_date: date, end_date: date) -> list:
    """
    Returns daily energy totals by reconciling:
      1) the latest *Today cumulative counters for each day, and
      2) integration of 5-minute power snapshots (W -> kWh).

    On some MIN setups, tiny overnight imports are visible in power history but
    not fully reflected in cumulative counters. Reconciliation preserves those
    values while keeping counters as the primary source where reliable.
    """
    end_date = min(end_date, get_plant_local_date())

    @retry_api()
    def fetch_chunk(chunk_start, chunk_end):
        """Fetch all snapshots for a ≤7-day chunk, return only *Today fields."""
        api = growattServer.OpenApiV1(GROWATT_TOKEN)
        snapshots = []
        page = 1
        while True:
            result = api.min_energy_history(
                GROWATT_DEVICE_SN,
                start_date=chunk_start,
                end_date=chunk_end,
                page=page,
                limit=100,
            )
            raw_data = result.get("datas", [])
            if not raw_data:
                break
            for r in raw_data:
                snapshots.append({
                    "time":             r.get("time", ""),
                    "solar_w":          _to_non_negative_float(r.get("ppv")),
                    "home_w":           _to_non_negative_float(r.get("pacToLocalLoad")),
                    "grid_import_w":    _to_non_negative_float(r.get("pacToUserTotal")),
                    "grid_export_w":    _to_non_negative_float(r.get("pacToGridTotal")),
                    "battery_charge_w": _to_non_negative_float(r.get("bdc1ChargePower")),
                    "battery_discharge_w": _to_non_negative_float(r.get("bdc1DischargePower")),
                    "eacToday":         _to_non_negative_float(r.get("eacToday")),
                    "elocalLoadToday":  _to_non_negative_float(r.get("elocalLoadToday")),
                    "etoUserToday":     _to_non_negative_float(r.get("etoUserToday")),
                    "etoGridToday":     _to_non_negative_float(r.get("etoGridToday")),
                    "echargeToday":     _to_non_negative_float(r.get("echargeToday")),
                    "edischargeToday":  _to_non_negative_float(r.get("edischargeToday")),
                    "eselfToday":       _to_non_negative_float(r.get("eselfToday")),
                })
            total = result.get("count", 0)
            if page * 100 >= total:
                break
            page += 1
        return snapshots

    # Split the range into ≤7-day chunks and fetch in parallel
    chunks = []
    chunk_start = start_date
    while chunk_start <= end_date:
        chunks.append((chunk_start, min(chunk_start + timedelta(days=6), end_date)))
        chunk_start += timedelta(days=7)

    all_snapshots = []
    with ThreadPoolExecutor(max_workers=8) as executor:
        for snapshots in executor.map(lambda c: fetch_chunk(*c), chunks):
            all_snapshots.extend(snapshots)

    # For each day:
    #   - keep the latest snapshot for *Today cumulative counters
    #   - integrate all 5-minute power snapshots for reconciliation
    by_date: dict[str, dict] = {}
    integrated_by_date: dict[str, dict] = {}
    for snap in all_snapshots:
        day = snap["time"][:10]
        if not day:
            continue
        if day not in integrated_by_date:
            integrated_by_date[day] = _empty_integrated_totals()
        _accumulate_snapshot_energy(integrated_by_date[day], snap)
        if day not in by_date or snap["time"] > by_date[day]["time"]:
            by_date[day] = snap

    # Build a complete, gap-free series.
    result = []
    current = start_date
    while current <= end_date:
        key = current.strftime("%Y-%m-%d")
        if key in by_date or key in integrated_by_date:
            reconciled = _reconcile_daily_totals(
                by_date.get(key),
                integrated_by_date.get(key, _empty_integrated_totals()),
            )
            result.append({"date": key, **reconciled})
        else:
            result.append({
                "date": key,
                "solar_kwh": 0.0, "home_kwh": 0.0,
                "grid_import_kwh": 0.0, "grid_export_kwh": 0.0,
                "battery_charged_kwh": 0.0, "battery_discharged_kwh": 0.0,
                "self_consumed_kwh": 0.0,
            })
        current += timedelta(days=1)

    return result


@ttl_cache()
@retry_api()
def get_plant_energy_overview() -> dict:
    """
    Returns the energy overview for the PV plant.
    Used for dashboard KPI cards: today, this month, this year,
    total production, current power and CO2 saved.

    Returns:
        dict: Aggregated plant energy data.
    """
    api = get_api()
    return api.plant_energy_overview(GROWATT_PLANT_ID)

