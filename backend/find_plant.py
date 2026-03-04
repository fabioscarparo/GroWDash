"""
Script temporaneo per recuperare le informazioni dell'impianto.
Usato una volta per trovare il Plant ID, poi può essere eliminato.
"""

import growattServer
from dotenv import load_dotenv
import os

# Carica le variabili dal file .env
load_dotenv()

token = os.getenv("GROWATT_TOKEN")

# Debug: verifica che il token sia caricato correttamente
print(f"Token caricato: {token}")

# Inizializza la sessione V1 con il token
api = growattServer.OpenApiV1(token)

# Recupera la lista degli impianti associati all'account
plants = api.plant_list()
print(plants)