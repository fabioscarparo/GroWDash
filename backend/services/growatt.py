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

# Credenziali e identificatori letti dal file .env
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

def get_device_detail() -> dict:
    """
    Recupera i dati tecnici dettagliati dell'inverter MIN.
    Include versione firmware, modello, impostazioni hardware
    e parametri di configurazione avanzati.

    Returns:
        dict: Dati tecnici completi dell'inverter.
    """
    api = get_api()
    return api.min_detail(GROWATT_DEVICE_SN)


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
    Recupera i dati energetici dell'inverter per il giorno corrente.
    Restituisce produzione, autoconsumo, immissione in rete e stato.
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
    # Se non vengono fornite date, usa il giorno corrente
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
            limit=100,  # Massimo record per pagina supportato dall'API
        )

        raw_data = result.get("datas", [])

        # Se la pagina è vuota, abbiamo finito
        if not raw_data:
            break

        # Estraiamo solo i campi utili da ogni snapshot
        for record in raw_data:
            history.append({
                # Timestamp dello snapshot (formato: "YYYY-MM-DD HH:MM:SS")
                "time": record.get("time"),

                # Potenza istantanea totale dell'inverter in Watt
                # Negativa = sta prelevando dalla rete, Positiva = sta producendo
                "power_w": record.get("pac", 0),

                # Potenza istantanea erogata verso i carichi domestici in Watt
                "power_to_user_w": record.get("pacToUserTotal", 0),

                # Tensione di rete misurata dall'inverter in Volt
                "voltage_v": record.get("vac1", 0),

                # Temperatura interna dell'inverter in gradi Celsius
                "temperature_c": record.get("temp1", 0),
            })

        # Controlla se esistono altre pagine da scaricare
        # Se il numero di record scaricati finora >= totale disponibile, usciamo
        total = result.get("count", 0)
        if page * 100 >= total:
            break

        # Altrimenti passa alla pagina successiva
        page += 1

    # L'API restituisce i dati dal più recente al più vecchio.
    # Invertiamo la lista per avere l'ordine cronologico corretto
    # (necessario per visualizzare correttamente i grafici)
    history.reverse()
    return history