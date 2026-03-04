"""
Servizio di integrazione con le API Growatt V1.
===============================================
Questo modulo fa da ponte tra FastAPI e la libreria growattServer.
Tutte le chiamate alle API Growatt passano da qui, in modo da avere
un unico punto di controllo e facilitare eventuali modifiche future.
"""

import growattServer
from dotenv import load_dotenv
import os

# Carica le variabili d'ambiente dal file .env
load_dotenv()

# Legge il token e il plant ID dal file .env
GROWATT_TOKEN = os.getenv("GROWATT_TOKEN")
GROWATT_PLANT_ID = os.getenv("GROWATT_PLANT_ID")


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