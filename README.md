# GroWDash

A modern, clean, and comprehensive dashboard for **Growatt MIN inverters**.

Built with **FastAPI** + **React**, powered by the [PyPi_GrowattServer](https://github.com/indykoning/PyPi_GrowattServer) library and the official Growatt V1 (Token) API.

---

## Why GroWDash?

GroWDash provides an essential and clean designed dashboard with real-time data, historical charts, and advanced analytics for your photovoltaic system. It serves as a more intuitive, feature-rich, and UI-curated alternative to the official ShinePhone App, and can be self-hosted on a NAS or any server with optional secure remote access via Cloudflare Tunnel.

---

## ✨ Features

- **Secure Authentication:** JWT flow using **HttpOnly Cookies**, protecting tokens from XSS attacks. Credentials stored only on your machine, hashed with Bcrypt.
- **Real-Time Power Flow:** Visual SVG widget showing live energy moving between solar panels, battery, grid, and home loads.
- **Accurate Energy Data:** Daily totals read directly from the inverter's internal `*Today` cumulative counters — the same source used by ShinePhone — instead of integrating 5-minute power snapshots, eliminating measurement drift.
- **Daily Curve Charts:** Area charts for today's power flows (solar, home, battery, grid) and battery State of Charge (SOC) over the day.
- **Solar Production Forecast:** Hourly estimated output (from Open-Meteo GHI radiation) overlaid with actual measured production on the same area chart, accounting for plant capacity, panel tilt, orientation, and performance ratio.
- **Detailed Energy Breakdown:** Per-day breakdown of all energy flows across months, with interactive month navigation and background prefetch for instant page turns.
- **Solar Production History:** Bar charts aggregated by day, month, or year with gap-free series and future-date filtering.
- **Self-Sufficiency Tracking:** Stacked bar chart showing how home consumption is covered: from solar, battery, or grid — with a monthly self-sufficiency percentage.
- **Energy Breakdown Card:** Today's system output split between self-consumed and exported, plus home consumption split by source.
- **Device Management:** Inverter details, firmware, communication versions, battery pack specs, SOC operational limits, and all connected modules (datalogger, meter).
- **Inverter Settings:** Read-only view of all inverter configuration registers (work mode, battery settings, grid limits, and more).
- **Solar Panel Settings:** User-configurable plant parameters (panel tilt, orientation via interactive compass rose, system efficiency / performance ratio) that feed directly into the forecast model.
- **Weather Widget:** Real-time weather from Open-Meteo using polished Lucide icons mapped to WMO weather codes, with solar production context (cloud cover, rain probability, min/max temperature). On desktop, an **upcoming hours** forecast strip shows the next 4 hours at a glance.
- **Pull-to-Refresh:** Native mobile gesture with haptic feedback and animated indicator to manually force a data refresh. Gesture is automatically suppressed when the touch starts inside a chart or slider, preventing accidental page changes.
- **Swipe Navigation:** Horizontal swipe between pages on mobile, smart-disabled over interactive chart and slider areas.
- **Mobile-First Design:** Responsive layout with a collapsible sidebar on desktop and a fixed bottom navigation bar on mobile, with animated page transitions.
- **Account Settings — Desktop Layout:** Two-column card layout on wider screens, clickable sidebar username for quick access, logout button hidden on desktop (accessible from the sidebar).
- **Dark / Light / System Mode:** Three-way theme selector with smooth transitions.
- **Self-Hosted & Docker-Ready:** Designed to run on a NAS (tested on Synology DSM 7.3) with Docker Compose, accessible remotely via Cloudflare Tunnel without port forwarding.

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Backend** | Python 3.12+ · FastAPI · SQLAlchemy · SQLite · JWT (HttpOnly Cookies) · Passlib · Bcrypt |
| **PV Integration** | **PyPi_GrowattServer** (Open API V1) |
| **Frontend** | React 19 · Vite · Tailwind CSS v4 · shadcn/ui · Recharts · TanStack Query |
| **Deployment** | Docker · Docker Compose · Cloudflare Tunnel |

---

## 📂 Project Structure

```text
GroWDash/
├── backend/                  # FastAPI backend
│   ├── routers/              # API endpoints organized by domain
│   │   ├── auth.py           # /auth — login, logout, /me
│   │   ├── plant.py          # /plant — plant information & coordinates
│   │   ├── energy.py         # /energy — energy data, history, breakdown
│   │   └── device.py         # /device — inverter details & settings
│   ├── utilities/            # Administrative scripts
│   │   ├── find_plant.py     # Discover plant ID and device serial
│   │   ├── create_user.py    # Create new dashboard users
│   │   └── check_db_users.py # List existing dashboard users
│   ├── services/
│   │   └── growatt.py        # Growatt V1 API integration + TTL cache
│   ├── auth.py               # JWT logic, cookie handling
│   ├── database.py           # SQLite connection setup
│   ├── models.py             # User model (SQLAlchemy)
│   ├── main.py               # Application entry point + CORS
│   └── requirements.txt      # Python dependencies
├── frontend/                 # React frontend
│   ├── src/
│   │   ├── api/              # Backend communication layer (fetch wrapper)
│   │   ├── context/          # AuthContext (JWT cookie auth state)
│   │   ├── hooks/            # useGrowatt, useTheme, usePullToRefresh, useSwipeNavigation, useWeather, useSolarForecast, useSolarSettings
│   │   ├── components/       # UI cards, charts, FlowNode, PeriodPicker, WeatherCard, SolarProductionCard, ...
│   │   └── pages/            # Overview, History, Device, DeviceSettings, UserAccount, LoginPage
├── .env.example              # Environment variables template
├── .gitignore
└── docker-compose.yml        # Docker orchestration
```

---

## 📡 API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/token` | Validates credentials, sets **HttpOnly cookie** |
| POST | `/auth/logout` | Clears the authentication cookie |
| GET | `/auth/me` | Returns the current authenticated user |

### General
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Health check |

### Plant (Protected)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/plant/info` | Plant name, location, capacity, coordinates, installation date |

### Energy (Protected)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/energy/overview` | KPI summary: today, month, year, total, CO₂ saved |
| GET | `/energy/today` | Live power flow (W) + daily totals (kWh) + battery + grid |
| GET | `/energy/history` | 5-minute power snapshots for a date range (max 7 days) |
| GET | `/energy/aggregate` | Solar energy aggregated by day / month / year |
| GET | `/energy/daily-breakdown` | Full energy breakdown by day (all flows) |

### Device (Protected)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/device/list` | All devices connected to the plant |
| GET | `/device/detail` | Inverter firmware, model, battery specs, SOC limits |
| GET | `/device/settings` | Full inverter configuration register dump |

*Interactive API docs: `http://localhost:8000/docs`*

---

## 🚀 Getting Started

### Prerequisites
- **Python 3.12+**
- **Node.js 18+** (for local frontend development)
- **Git**
- A **Growatt account** with an API Token (ShinePhone app: **Me → API Token**)

---

### Option A — Local Development

#### 1. Clone the repository

```bash
git clone https://github.com/fabioscarparo/GroWDash.git
cd GroWDash
```

#### 2. Set up the Backend

```bash
cd backend
python -m venv .venv

# Windows
.venv\Scripts\activate
# Mac/Linux
source .venv/bin/activate

pip install -r requirements.txt
```

#### 3. Configure the environment

```bash
# Windows
copy ..\.env.example .env
# Mac/Linux
cp ../.env.example .env
```

Edit `.env` with your values:

```env
GROWATT_TOKEN=your_token_here
GROWATT_PLANT_ID=         # filled in next step
GROWATT_DEVICE_SN=        # filled in next step
JWT_SECRET_KEY=your_random_secret_string
```

> **Tip:** Generate a secure JWT secret with:
> `python -c "import secrets; print(secrets.token_hex(32))"`

#### 4. Discover your Plant ID and Device Serial

```bash
python utilities/find_plant.py
```

Copy the printed `GROWATT_PLANT_ID` and `GROWATT_DEVICE_SN` values into your `.env`.

#### 5. Create a dashboard user

```bash
python utilities/create_user.py
```

#### 6. Start the backend

```bash
uvicorn main:app --reload
```

Backend runs at **http://localhost:8000**.

#### 7. Set up and start the frontend

```bash
cd ../frontend
npm install
npm run dev
```

Frontend runs at **http://localhost:5173**.

---

### Option B — Docker (Recommended for self-hosting)

This is the recommended deployment method, tested on **Synology DSM 7.3** with Container Manager.

#### 1. Prerequisites

- Docker and Docker Compose installed on your server/NAS.
- The project files copied to your server (e.g. `/volume1/docker/growdash` on Synology).
- A `.env` file already configured with all four variables (run steps 3–5 from Option A locally first to populate it, then copy the `growdash.db` database file to the server so your user credentials transfer).

#### 2. `docker-compose.yml`

Below is the reference compose file. Adjust paths to match your environment.

```yaml
services:
  backend:
    build:
      context: /volume1/docker/growdash/backend   # use absolute paths on Synology
    restart: unless-stopped
    env_file:
      - /volume1/docker/growdash/.env
    volumes:
      - /volume1/docker/growdash/backend/growdash.db:/app/growdash.db
    ports:
      - "8000:8000"

  frontend:
    build:
      context: /volume1/docker/growdash/frontend
    restart: unless-stopped
    environment:
      - VITE_API_URL=http://backend:8000
    ports:
      - "5173:80"
    depends_on:
      - backend

  cloudflared:
    image: cloudflare/cloudflared:latest
    restart: unless-stopped
    command: tunnel --no-autoupdate run
    environment:
      - TUNNEL_TOKEN=your_cloudflare_tunnel_token_here
    depends_on:
      - frontend
      - backend
```

> **Note on Synology Container Manager:** The GUI requires absolute paths in `build.context`. Relative paths and symlinks are not resolved correctly. Use the full `/volume1/...` path.

#### 3. Build and start

```bash
docker compose up -d --build
```

Or via the **Synology Container Manager GUI** → Projects → Create → select your `docker-compose.yml`.

#### 4. Managing users in Docker

To create a dashboard user after the containers are running:

```bash
docker exec -it <backend_container_name> python utilities/create_user.py
```

---

### Cloudflare Tunnel (remote access without port forwarding)

Cloudflare Tunnel lets you expose GroWDash to the internet securely without opening ports on your router.

1. Create a free [Cloudflare account](https://dash.cloudflare.com) and add your domain.
2. Go to **Zero Trust → Networks → Tunnels** and create a new tunnel.
3. Copy the tunnel token and set it as `TUNNEL_TOKEN` in your `docker-compose.yml` environment.
4. In the tunnel configuration, add a public hostname pointing to `http://frontend:80` (or `http://localhost:5173` if not using Docker networking).
5. Optionally add a second hostname for the API at `http://backend:8000`.

The `cloudflared` container in the compose file handles the rest automatically.

> **Tip:** Enable Cloudflare Access on the tunnel for an extra authentication layer on top of GroWDash's own login.

---

## 🔄 Updating GroWDash

### Local development

```bash
git pull
cd backend && pip install -r requirements.txt
cd ../frontend && npm install && npm run dev
```

### Docker

After pulling or editing files:

```bash
docker compose up -d --build
```

For Synology Container Manager: stop the project, then rebuild via the GUI — or build `dist/` locally with `npm run build` and copy only the `frontend/dist/` folder to the NAS to avoid compiling on the NAS hardware.

---

## 🖼 Frontend Architecture

The frontend is a single-page application built with **React 19** and **Vite**.

- **Authentication:** `AuthContext` manages session state. Tokens are stored exclusively in **HttpOnly Cookies**, invisible to JavaScript. On mount, the app calls `/auth/me` to validate the session; on logout it calls `/auth/logout` to clear the cookie server-side.
- **Data Fetching:** **TanStack Query** with a 5-minute `refetchInterval` matching the Growatt API update frequency. Historical data uses a 24-hour cache TTL. Long date ranges are split into parallel 7-day chunks on the backend.
- **Design System:** **Tailwind CSS v4** + **shadcn/ui** (New York style, dark mode) with OKLCH color tokens.
- **Charts:** **Recharts** for all production charts (area, bar, stacked bar).
- **Navigation:** Sidebar on desktop, bottom nav on mobile. Horizontal swipe gesture navigates between pages. A global pull-to-refresh chip animates above the page on mobile.

---

## ⚙️ Caching Strategy

| Data type | Cache TTL | Rationale |
|-----------|-----------|-----------|
| Live / today data | 5 minutes | Growatt API update frequency |
| Current month breakdown | 5 minutes | May still be updated today |
| Past months / years | 24 hours | Historical data never changes |
| Weather | 15 minutes | Open-Meteo rate limit courtesy |

All caching is in-memory on the backend (TTL dict). No Redis required.

---

## 🔌 Compatibility

Currently supports **Growatt MIN inverters** via the V1 Token API. TLX inverters are identified as MIN in the public API and should work seamlessly.

---

## ⚠️ Disclaimer

This project is not affiliated with Growatt. Only read operations are used. No inverter settings are modified. Use at your own risk.

---

## 📄 License

MIT — Copyright (c) 2026 Fabio Scarparo