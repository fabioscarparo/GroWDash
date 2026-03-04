"""
Servizio di integrazione con le API Growatt V1.
===============================================
Questo modulo fa da ponte tra FastAPI e la libreria growattServer.
Tutte le chiamate alle API Growatt passano da qui, in modo da avere
un unico punto di controllo e facilitare eventuali modifiche future.
"""

import growattServer
from dotenv import load_dotenv
from datetime import date
import os

# Carica le variabili d'ambiente dal file .env
load_dotenv()

# Legge il token e il plant ID dal file .env
GROWATT_TOKEN = os.getenv("GROWATT_TOKEN")
GROWATT_PLANT_ID = os.getenv("GROWATT_PLANT_ID")
GROWATT_DEVICE_SN = os.getenv("GROWATT_DEVICE_SN")


def get_api() -> growattServer.OpenApiV1:
    """
    Crea e restituisce una sessione autenticata con le API Growatt V1.
    Viene chiamata ogni volta che serve fare una richiesta ai server Growatt.
    """
    return growattServer.OpenApiV1(GROWATT_TOKEN)


def get_plant_info() -> dict:
    """
    Recupera le informazioni generali dell'impianto fotovoltaico.
    Restituisce dati come nome, posizione, potenza di picco e stato.
    """
    api = get_api()
    result = api.plant_list()

    # Prendiamo il primo impianto dalla lista (in caso ce ne siano più di uno, si può estendere per gestirli tutti) 
    plants = result.get("plants", [])
    if not plants:
        return {}
    return plants[0]

def get_energy_today() -> dict:
    """
    Recupera i dati energetici dell'inverter per il giorno corrente.
    Restituisce produzione, autoconsumo, immissione in rete e stato.
    """
    api = get_api()
    data = api.min_energy(GROWATT_DEVICE_SN)
    return data

def get_energy_history(query_date: date = None) -> list:
    """
    Recupera la storia dei dati energetici per una data specifica.
    Ogni record è uno snapshot ogni 5 minuti con potenza e timestamp.
    Se non viene fornita una data, usa il giorno corrente.
    Utile per costruire il grafico della curva di produzione giornaliera.
    """
    if query_date is None:
        query_date = date.today()

    api = get_api()
    result = api.min_energy_history(GROWATT_DEVICE_SN, query_date)

    # Estraiamo solo i dati utili da ogni snapshot
    raw_data = result.get("datas", [])
    history = []
    for record in raw_data:
        history.append({
            "time": record.get("time"),
            "power_w": record.get("pac", 0),           # Potenza istantanea in W
            "power_to_user_w": record.get("pacToUserTotal", 0),  # Potenza verso utenza in W
            "voltage_v": record.get("vac1", 0),        # Tensione di rete in V
            "temperature_c": record.get("temp1", 0),   # Temperatura inverter in °C
        })

    # I dati arrivano dal più recente al più vecchio, vanno invertiti per avere la cronologia corretta
    history.reverse()
    return history