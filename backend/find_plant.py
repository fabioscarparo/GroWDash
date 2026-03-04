"""
Script di setup — da eseguire una volta sola per trovare
i valori da inserire nel file .env.

Recupera automaticamente:
- Plant ID dell'impianto
- Serial number dell'inverter

Esecuzione:
    python find_plant.py
"""

import growattServer
from dotenv import load_dotenv
import os

# Carica le variabili dal file .env
load_dotenv()

token = os.getenv("GROWATT_TOKEN")

if not token:
    print("GROWATT_TOKEN non trovato nel file .env")
    exit(1)

# Debug: verifica che il token sia caricato correttamente
print(f"Token caricato: {token}")

# Inizializza la sessione V1 con il token
api = growattServer.OpenApiV1(token)

# ── 1. Impianti ──────────────────────────────────────────
print("\n=== IMPIANTI ===")
result = api.plant_list()
plants = result.get("plants", [])

if not plants:
    print("❌ Nessun impianto trovato")
    exit(1)

for plant in plants:
    print(f"  Nome:     {plant.get('name')}")
    print(f"  Plant ID: {plant.get('plant_id')}")
    print(f"  Città:    {plant.get('city')}, {plant.get('country')}")
    print()

# Prendiamo il primo impianto
plant_id = str(plants[0].get("plant_id"))

# ── 2. Dispositivi ───────────────────────────────────────
print("=== DISPOSITIVI ===")
devices_result = api.device_list(plant_id)
devices = devices_result.get("devices", [])

if not devices:
    print("❌ Nessun dispositivo trovato")
    exit(1)

inverter_sn = None
for device in devices:
    device_type = device.get("type")
    sn = device.get("device_sn")

    # type 7 = inverter MIN, type 3 = meter
    if device_type == 7:
        print(f"  ✅ Inverter trovato!")
        print(f"  Serial Number: {sn}")
        print(f"  Modello:       {device.get('model')}")
        print(f"  Datalogger:    {device.get('datalogger_sn')}")
        inverter_sn = sn
    else:
        print(f"  ℹ️  Altro dispositivo: SN={sn}, tipo={device_type}")
    print()

# ── 3. Riepilogo .env ────────────────────────────────────
print("=== COPIA QUESTI VALORI NEL TUO .env ===")
print(f"  GROWATT_TOKEN={token}")
print(f"  GROWATT_PLANT_ID={plant_id}")
if inverter_sn:
    print(f"  GROWATT_DEVICE_SN={inverter_sn}")