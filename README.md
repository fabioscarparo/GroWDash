# GroWDash

A modern, clean dashboard for **Growatt MIN inverters** 

Built with **FastAPI** + **React**, powered by the [PyPi_GrowattServer](https://github.com/indykoning/PyPi_GrowattServer) library and the official Growatt V1 Token API.

---

## Why GroWDash?

GroWDash provides a clean, essential dashboard with well-designed charts and real-time data from your photovoltaic system.
A more user friendly and UI-curated alternative to the official ShinePhone App

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Python 3.12+ · FastAPI · Uvicorn |
| PV Integration | growattServer (V1 Token API) |
| Frontend | React · Vite · Tailwind CSS · ApexCharts |
| Deployment | Docker · Docker Compose · Nginx |

---

## Project Structure
```
GroWDash/
├── backend/                  # FastAPI backend
│   ├── routers/              # API endpoints organized by domain
│   │   ├── plant.py          # /plant — plant information
│   │   ├── energy.py         # /energy — energy data and history
│   │   └── device.py         # /device — inverter details and settings
│   ├── services/
│   │   └── growatt.py        # Growatt V1 API integration layer
│   ├── main.py               # FastAPI app entry point
│   ├── find_plant.py         # Setup script to find Plant ID and Device SN
│   └── requirements.txt      # Python dependencies
├── frontend/                 # React frontend (coming soon)
├── .env.example              # Environment variables template
├── .gitignore
└── docker-compose.yml        # Docker orchestration (coming soon)
```

---

## API Endpoints

### General
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Health check |

### Plant
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/plant/info` | Plant name, location, peak power, status |

### Energy
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/energy/overview` | KPI summary: today, month, year, total, CO₂ saved |
| GET | `/energy/today` | Detailed today data: production, battery, grid, inverter |
| GET | `/energy/history` | 5-minute power snapshots (max 7 days) |
| GET | `/energy/aggregate` | Aggregated history by day / month / year |

### Device
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/device/list` | All devices connected to the plant |
| GET | `/device/detail` | Inverter firmware, model, status |
| GET | `/device/settings` | Full inverter configuration |

Interactive API docs available at: `http://localhost:8000/docs`

---

## Getting Started

### Prerequisites
- Python 3.12+
- Node.js 18+ (for frontend)
- Git
- A Growatt account with API Token (from ShinePhone app: **Me → API Token**)

---

### 1. Clone the repository
```bash
git clone https://github.com/fabioscarparo/GroWDash.git
cd GroWDash
```

---

### 2. Set up the backend

Navigate to the backend folder and create a Python virtual environment.
This keeps all dependencies isolated from your system Python installation.
```bash
cd backend
python -m venv .venv
```

Activate the virtual environment:
```bash
# Windows
.venv\Scripts\activate

# Mac/Linux
source .venv/bin/activate
```

You should see `(.venv)` appear in your terminal prompt.

Install all required Python dependencies:
```bash
pip install -r requirements.txt
```

---

### 3. Configure environment variables

Copy the environment template file into the backend folder:
```bash
# Windows
copy ..\.env.example .env

# Mac/Linux
cp ../.env.example .env
```

Open `.env` and add your Growatt API token:
```
GROWATT_TOKEN=your_token_here
GROWATT_PLANT_ID=     # leave empty for now
GROWATT_DEVICE_SN=    # leave empty for now
```

---

### 4. Find your Plant ID and Device Serial Number

Run the setup script — it will automatically find and print all the values
you need to complete your `.env` file:
```bash
python find_plant.py
```

Copy the printed values into your `.env` file.

---

### 5. Start the backend server
```bash
uvicorn main:app --reload
```

The backend is now running at **http://localhost:8000**

You can explore all available endpoints interactively at **http://localhost:8000/docs**

---

### 6. Start the frontend (coming soon)

Frontend setup instructions will be added once the React app is complete.

---

## Compatibility

Currently supports **Growatt MIN inverters** via the V1 Token API.
TLX inverters are identified as MIN in the public API and should work too.

---

## Disclaimer

This project is not affiliated with Growatt. Use at your own risk.
Only read operations are used — no inverter settings are modified.

---

## License

MIT