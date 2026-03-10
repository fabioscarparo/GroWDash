# GroWDash

A modern, clean, and comprehensive dashboard for **Growatt MIN inverters**.

Built with **FastAPI** + **React**, powered by the [PyPi_GrowattServer](https://github.com/indykoning/PyPi_GrowattServer) library and the official Growatt V1 (Token) API.

---

## Why GroWDash?

GroWDash provides an essential and clean designed dashboard with real-time data, historical charts, and advanced analytics for your photovoltaic system. It serves as a more intuitive, feature-rich, and UI-curated alternative to the official ShinePhone App.

---

## ✨ Features

- **Real-Time Power Flow:** Visual representation of energy moving between solar panels, battery, grid, and home.
- **Detailed Energy Breakdown:** Analyze daily, monthly, and yearly yields.
- **Self-Sufficiency Tracking:** Monitor how independent your home is from the grid.
- **Advanced Charts:** Includes Daily Power curves, Battery State of Charge (SOC) tracking, and historical energy comparisons.
- **Device Management:** View detailed inverter configuration, firmware status, and settings.
- **Weather Integration:** Contextualize your solar production with current weather conditions.
- **Mobile-First Design:** Responsive UI built with Tailwind CSS, shadcn/ui, and ApexCharts/Recharts.
- **Dark/Light Mode:** Automatic theme switching based on your system preferences.

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Backend** | Python 3.12+ · FastAPI · Uvicorn |
| **PV Integration** | growattServer (V1 Token API) |
| **Frontend** | React · Vite · Tailwind CSS · shadcn/ui · ApexCharts · Recharts · React Query |
| **Deployment** | Docker · Docker Compose · Nginx (Coming Soon) |

---

## 📂 Project Structure
```text
GroWDash/
├── backend/                  # FastAPI backend
│   ├── routers/              # API endpoints organized by domain
│   │   ├── plant.py          # /plant — plant information
│   │   ├── energy.py         # /energy — energy data, history, daily breakdown
│   │   └── device.py         # /device — inverter details and settings
│   ├── services/
│   │   └── growatt.py        # Growatt V1 API integration layer
│   ├── main.py               # FastAPI app entry point
│   ├── find_plant.py         # Setup script to find Plant ID and Device SN
│   └── requirements.txt      # Python dependencies
├── frontend/                 # React frontend
│   ├── src/
│   │   ├── components/       # Reusable UI cards and charts (PowerFlow, Battery, etc.)
│   │   ├── pages/            # Main views (Overview, History, Device, Settings)
│   │   └── api/              # Backend communication via TanStack Query
├── .env.example              # Environment variables template
├── .gitignore
└── docker-compose.yml        # Docker orchestration (coming soon)
```

---

## 📡 API Endpoints

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
| GET | `/energy/today` | Detailed today data including live power flow |
| GET | `/energy/history` | 5-minute power snapshots for a date range |
| GET | `/energy/aggregate` | Solar energy history aggregated by day / month / year |
| GET | `/energy/daily-breakdown`| Full energy breakdown aggregated by day |

### Device
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/device/list` | All devices connected to the plant |
| GET | `/device/detail` | Inverter firmware, model, status |
| GET | `/device/settings` | Full inverter configuration |

*Interactive API docs available at:* `http://localhost:8000/docs`

---

## 🚀 Getting Started

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

### 2. Set up the Backend

Navigate to the backend folder and create a Python virtual environment to keep dependencies isolated:
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

### 3. Configure Environment Variables

Copy the environment template file into the backend folder:
```bash
# Windows
copy ..\.env.example .env

# Mac/Linux
cp ../.env.example .env
```

Open `.env` and add your Growatt API token:
```env
GROWATT_TOKEN=your_token_here
GROWATT_PLANT_ID=     # leave empty for now
GROWATT_DEVICE_SN=    # leave empty for now
```

---

### 4. Find your Plant ID and Device SN

Run the setup script — it will automatically discover and print the IDs required to complete your `.env` file:
```bash
python find_plant.py
```

Copy the printed values into your `.env` file.

---

### 5. Start the Backend Server
```bash
uvicorn main:app --reload
```
The backend is now running at **http://localhost:8000** 

---

### 6. Set up the Frontend

Open a new terminal, navigate to the frontend folder, and install dependencies:
```bash
cd frontend
npm install
```

Start the development server:
```bash
npm run dev
```

The frontend is now running at **http://localhost:5173**

*(Note: Make sure the backend is also running in your other terminal so the frontend can fetch data).*

---

## 🖼 Frontend Architecture

The frontend is a single-page application built with **React** and **Vite**.

- **Data Fetching:** Handled by **TanStack Query** (`react-query`). Data from the backend is cached and automatically refreshed every 5 minutes to stay in sync with the Growatt API reporting interval.
- **Design System:** Built using **Tailwind CSS** and **shadcn/ui** components.
- **Routing:** Pages are modularized into `Overview`, `History`, `Device`, and `DeviceSettings`.
- **Charts:** A mix of **ApexCharts** (for complex curves) and **Recharts** (via shadcn/ui) are used to build the rich visual analytics.

---

## 🔌 Compatibility

Currently supports **Growatt MIN inverters** via the V1 Token API.
*Note: TLX inverters are identified as MIN in the public API and should work seamlessly as well.*

---

## ⚠️ Disclaimer

This project is not affiliated with Growatt. Use at your own risk.
Only read operations are used by the dashboard — no inverter settings are modified.

---

## 📄 License

MIT