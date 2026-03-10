"""
GroWDash Initial Environment Setup Utility
==========================================

This utility script is designed to be executed precisely once during the initial 
configuration phase of the GroWDash application. Its sole purpose is to automate 
the discovery of critical hardware identifiers natively assigned by the Growatt 
infrastructure to your specific photovoltaic installation.

Workflow Overview:
------------------
1. **Authentication**: Ingests your primary `GROWATT_TOKEN` environment variable.
2. **Plant Discovery**: Queries the Growatt server to list all registered solar plants 
   tied to your account and automatically extracts the internal `Plant ID` of the first match.
3. **Hardware Enumeration**: Scans the targeted plant to inventory all connected physical 
   devices. It intelligently filters this list to isolate the primary inverter (Type 7).
4. **Configuration Output**: Prints a formatted summary block containing the exact 
   key-value pairs required to populate your project's `.env` configuration file.

Dependencies:
-------------
- `growattServer`: The unofficial Python API client handling protocol communication.
- `python-dotenv`: A utility resolving local `.env` files into active process variables.

Usage:
------
1. Ensure your `.env` contains at least your `GROWATT_TOKEN`.
2. Run directly from the terminal:
   $ python find_plant.py
"""

import growattServer
from dotenv import load_dotenv
import os

# Dynamically parse and load system environment variables from a local `.env` file 
# located in the current working directory.
load_dotenv()

# Extract the critical authentication token required to initialize the Growatt API session.
token = os.getenv("GROWATT_TOKEN")

# Abort execution immediately if the token is missing, as all subsequent network 
# requests would strictly return 401 Unauthorized errors.
if not token:
    print("FATAL ERROR: 'GROWATT_TOKEN' was not discovered in the current environment.")
    print("Please ensure your .env file is properly formatted and positioned relative to this script.")
    exit(1)

# Debug output: visually confirm the token string has loaded successfully into memory.
print(f"Authentication Token verified: {token}")

# Establish a stateful connection utilizing the Growatt OpenAPI V1 protocol standard.
api = growattServer.OpenApiV1(token)

# =========================================================
# Step 1: Plant Infrastructure Discovery
# =========================================================
# A user's account acts as a top-level container holding one or more physical "Plants".
# We must first ascertain the unique numerical identifier assigned to the target installation.
print("\n=== INITIATING PLANT DISCOVERY ===")
result = api.plant_list()
plants = result.get("plants", [])

if not plants:
    print("❌ ERROR: Query returned 0 registered plants associated with the provided token.")
    exit(1)

# Iterate through the server response and enumerate all discovered solar installations.
for plant in plants:
    print(f"  Name:     {plant.get('name')}")
    print(f"  Plant ID: {plant.get('plant_id')}")
    print(f"  Location: {plant.get('city')}, {plant.get('country')}")
    print()

# For simplicity during setup, we automatically latch onto the first plant returned by the server.
plant_id = str(plants[0].get("plant_id"))


# =========================================================
# Step 2: Hardware Appliance Enumeration
# =========================================================
# Using the targeted `plant_id`, we query the server for a manifest of all distinct 
# hardware appliances actively reporting telemetry bounded to this specific installation.
print("=== INITIATING HARDWARE ENUMERATION ===")
devices_result = api.device_list(plant_id)
devices = devices_result.get("devices", [])

if not devices:
    print(f"❌ ERROR: Zero connected hardware devices registered under Plant ID [{plant_id}].")
    exit(1)

inverter_sn = None

# Scan the list of returned hardware appliances sequentially.
for device in devices:
    device_type = device.get("type")
    sn = device.get("device_sn")

    # The Growatt API categorizes devices using internal enum integers. 
    # Known Classifications:
    # - Type 7: Standard hybrid/string Inverters (e.g., MIN TL-XH series)
    # - Type 3: Communication Dataloggers (e.g., ShineWiFi-X) or Smart Meters
    if device_type == 7:
        print(f"  ✅ [SUCCESS] Inverter Discovered.")
        print(f"  Serial Number: {sn}")
        print(f"  Model Variant: {device.get('model')}")
        print(f"  Host Logger:   {device.get('datalogger_sn')}")
        inverter_sn = sn
    else:
        # Acknowledge peripheral devices strictly for verbose output clarity, 
        # but take no deterministic action based upon them.
        print(f"  ℹ️  [SKIPPED] Peripheral Appliance: SN=[{sn}], Type Category=[{device_type}]")
    print()


# =========================================================
# Step 3: Terminal Summary Output
# =========================================================
# Collate the discovered identifiers into an easily highlightable block formatted 
# securely for direct injection into the user's `.env` configuration file.
print("=== CONFIGURATION GENERATION COMPLETE ===")
print("Please append the following strictly formatted values to your `.env` file:\n")
print(f"GROWATT_TOKEN={token}")
print(f"GROWATT_PLANT_ID={plant_id}")
if inverter_sn:
    print(f"GROWATT_DEVICE_SN={inverter_sn}")
print()