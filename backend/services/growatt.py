"""
Servizio di integrazione con le API Growatt V1.
===============================================
Questo modulo fa da ponte tra FastAPI e la libreria growattServer.
Tutte le chiamate alle API Growatt passano da qui, in modo da avere
un unico punto di controllo e facilitare eventuali modifiche future.

Variabili d'ambiente richieste nel file .env:
    GROWATT_TOKEN     → Token API V1 dal tuo account ShinePhone
    GROWATT_PLANT_ID  → ID numerico dell'impianto
    GROWATT_DEVICE_SN → Serial number dell'inverter MIN
"""

import growattServer
from dotenv import load_dotenv
from datetime import date, timedelta
import os

# Carica le variabili d'ambiente dal file .env
load_dotenv()

# Credenziali e identificatori letti dal file .env
GROWATT_TOKEN = os.getenv("GROWATT_TOKEN")
GROWATT_PLANT_ID = os.getenv("GROWATT_PLANT_ID")
GROWATT_DEVICE_SN = os.getenv("GROWATT_DEVICE_SN")


def get_api() -> growattServer.OpenApiV1:
    """
    Crea e restituisce una sessione autenticata con le API Growatt V1.
    Viene chiamata ogni volta che serve fare una richiesta ai server Growatt.
    Non mantiene la sessione aperta — ogni chiamata crea una nuova istanza.
    """
    return growattServer.OpenApiV1(GROWATT_TOKEN)


def get_plant_info() -> dict:
    """
    Recupera le informazioni generali dell'impianto fotovoltaico.
    Restituisce dati come nome, posizione, potenza di picco e stato.

    Returns:
        dict: Dati del primo impianto trovato, o dizionario vuoto se non trovato.
    """
    api = get_api()
    result = api.plant_list()
    plants = result.get("plants", [])
    if not plants:
        return {}
    return plants[0]


def get_device_list() -> list:
    """
    Recupera la lista di tutti i dispositivi collegati all'impianto.
    Include inverter, meter e qualsiasi altro dispositivo connesso al datalogger.

    Returns:
        list: Lista di dispositivi con tipo, serial number e stato.
    """
    api = get_api()
    result = api.device_list(GROWATT_PLANT_ID)
    return result.get("devices", [])


def get_device_detail() -> dict:
    """
    Recupera i dati tecnici completi dell'inverter MIN combinando
    due sorgenti:
        - min_detail() → dati statici: modello, firmware, versioni
        - min_energy() → dati dinamici: stato reale, temperatura, ultimo aggiornamento

    I due endpoint vengono combinati perché min_detail() restituisce
    uno status_text non corretto ("tlx.status.checking"), mentre
    min_energy() restituisce lo stato reale dell'inverter ("Standby", "Normal", ecc.)

    Returns:
        dict: Dati tecnici completi dell'inverter.
    """
    api = get_api()
    detail = api.min_detail(GROWATT_DEVICE_SN)
    energy = api.min_energy(GROWATT_DEVICE_SN)

    return {
        # Dati statici da min_detail()
        "serial_number": detail.get("serialNum"),
        "model": detail.get("modelText"),
        "firmware_version": detail.get("fwVersion"),
        "monitor_version": detail.get("monitorVersion"),
        "communication_version": detail.get("communicationVersion"),
        "peak_power_w": detail.get("pmax"),
        # Numero seriale del datalogger a cui è collegato l'inverter
        "datalogger_sn": detail.get("dataLogSn"),

        # Dati dinamici da min_energy() — più accurati di min_detail()
        # Codice stato (0 = standby, 1 = normale, ecc.)
        "status": energy.get("status"),
        # Testo stato leggibile (es. "Normal", "Standby", "Fault")
        "status_text": energy.get("statusText"),
        # Temperatura interna dell'inverter in gradi Celsius
        "temperature_c": energy.get("temp1"),
        # Timestamp dell'ultimo aggiornamento dati
        "last_update": energy.get("time"),
    }


def get_device_settings() -> dict:
    """
    Recupera tutte le impostazioni configurate sull'inverter MIN.
    Include modalità di lavoro, limiti di rete, impostazioni batteria, ecc.

    Returns:
        dict: Dizionario con tutte le impostazioni dell'inverter.
    """
    api = get_api()
    return api.min_settings(GROWATT_DEVICE_SN)


def get_energy_today() -> dict:
    """
    Recupera tutti i dati energetici dell'inverter per il giorno corrente.

    Chiama una sola volta api.min_energy() e mappa tutti i campi utili
    in sezioni logiche per il frontend.

    Nomenclatura dei campi API Growatt:
        pac                = Power AC — potenza AC in uscita dall'inverter (W)
        pacToLocalLoad     = Power AC to Local Load — potenza verso i carichi domestici (W)
        pacToGridTotal     = Power AC to Grid — potenza esportata in rete (W)
        pacToUserTotal     = Power AC to User — potenza importata dalla rete (W)
        bdc1ChargePower    = Battery DC Charge Power — potenza di carica batteria (W)
        bdc1DischargePower = Battery DC Discharge Power — potenza di scarica batteria (W)
        bmsSoc             = Battery Management System State of Charge — SOC in % (0-100)

    Returns:
        dict: Potenze istantanee (W), totali giornalieri (kWh), stato inverter e batteria.
    """
    api = get_api()
    data = api.min_energy(GROWATT_DEVICE_SN)
    return data


def get_energy_history(start_date: date = None, end_date: date = None) -> list:
    """
    Recupera la serie storica di snapshot energetici in un intervallo di date.

    L'API Growatt registra uno snapshot ogni 5 minuti, quindi una giornata
    intera contiene circa 288 record. L'API supporta un massimo di 7 giorni
    per singola richiesta.

    Gestione paginazione:
        L'API restituisce massimo 100 record per chiamata. Questa funzione
        gestisce automaticamente la paginazione eseguendo più chiamate
        consecutive fino a scaricare tutti i record disponibili.

    Args:
        start_date: Data di inizio dell'intervallo. Default: oggi.
        end_date:   Data di fine dell'intervallo. Default: uguale a start_date.

    Returns:
        list: Lista di snapshot ordinati dal più vecchio al più recente,
              ognuno contenente timestamp, potenza, tensione e temperatura.
    """
    if start_date is None:
        start_date = date.today()
    if end_date is None:
        end_date = start_date

    api = get_api()
    history = []
    page = 1

    while True:
        result = api.min_energy_history(
            GROWATT_DEVICE_SN,
            start_date=start_date,
            end_date=end_date,
            page=page,
            limit=100,
        )

        raw_data = result.get("datas", [])

        if not raw_data:
            break

        for record in raw_data:
            history.append({
                "time": record.get("time"),
                "power_w": record.get("pac", 0),
                "power_to_user_w": record.get("pacToUserTotal", 0),
                "voltage_v": record.get("vac1", 0),
                "temperature_c": record.get("temp1", 0),
            })

        total = result.get("count", 0)
        if page * 100 >= total:
            break

        page += 1

    history.reverse()
    return history


def get_plant_energy_history(
    start_date: date,
    end_date: date,
    time_unit: str = "month"
) -> list:
    
    """
    Recupera la storia energetica dell'impianto aggregata per giorno/mese/anno.

    Limiti API Growatt:
        - "day"   → massimo 7 giorni per chiamata. Se l'intervallo è più lungo, questa funzione lo spezza automaticamente in chunk da 7 giorni.
        - "month" → nessun limite pratico, paginazione automatica
        - "year"  → nessun limite pratico, paginazione automatica

    Completamento serie:
        L'API restituisce solo i periodi con dati disponibili, saltando quelli
        con produzione zero. Questa funzione riempie i buchi con energy=0
        per garantire una serie continua, necessaria per i grafici.

    Args:
        start_date: Data di inizio.
        end_date:   Data di fine.
        time_unit:  Granularità: "day", "month" o "year".

    Returns:
        list: Lista completa di record con 'date' ed 'energy' (kWh),
            ordinata cronologicamente, senza buchi.
    """

    api = get_api()
    results = []

    if time_unit == "day":
        
        chunk_start = start_date
        while chunk_start <= end_date:
            chunk_end = min(chunk_start + timedelta(days=6), end_date)

            result = api.plant_energy_history(
                GROWATT_PLANT_ID,
                start_date=chunk_start,
                end_date=chunk_end,
                time_unit=time_unit,
                page=1,
                perpage=7,
            )
            results.extend(result.get("energys", []))
            chunk_start += timedelta(days=7)

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

def get_plant_energy_overview() -> dict:
    """
    Recupera la panoramica energetica dell'impianto fotovoltaico.
    Utile per le KPI card della dashboard: produzione oggi, questo mese,
    quest'anno, totale, potenza attuale e CO2 risparmiata.

    Returns:
        dict: Dati aggregati dell'impianto.
    """
    api = get_api()
    return api.plant_energy_overview(GROWATT_PLANT_ID)
