<p align="center">
  <img src="/assets/Logo.png" alt="GroWDash logo" width="110"/>
</p>

<h1 align="center">GroWDash</h1>

<p align="center">
  <img src="https://img.shields.io/badge/FastAPI-0A2?logo=fastapi&logoColor=white" />
  <img src="https://img.shields.io/badge/React-0A7?logo=react&logoColor=white" />
  <img src="https://img.shields.io/badge/Docker-2496ED?logo=docker&logoColor=white" />
</p>

A modern, clean, and comprehensive dashboard for **Growatt MIN inverters**.

Built with **FastAPI** + **React**, powered by the [PyPi_GrowattServer](https://github.com/indykoning/PyPi_GrowattServer) library and the official Growatt V1 (Token) API.

---

## Why GroWDash?

GroWDash provides an essential and clean designed dashboard with real-time data, historical charts, and advanced analytics for your photovoltaic system. It serves as a more intuitive, feature-rich, and UI-curated alternative to the official ShinePhone App, and can be self-hosted on a NAS or any server with optional secure remote access via Cloudflare Tunnel.

---

## ✨ Features

### 📊 Monitoring & Analytics
- **Real-Time Power Flow:** Visual SVG widget showing live energy moving between solar panels, battery, grid, and home loads.
- **Accurate Energy Data:** Daily totals read directly from the inverter's internal `*Today` cumulative counters, ensuring data consistency with official records.
- **Daily Curve Charts:** High-resolution area charts for today's power flows (Solar, Home, Battery, Grid) and battery State of Charge (SOC).
- **Solar Production Forecast:** Hourly estimated output based on Open-Meteo GHI radiation, overlaid with actual production for performance monitoring.
- **Detailed Energy Breakdown:** Historical view of energy flows across months with interactive navigation and background prefetch.
- **Self-Sufficiency Tracking:** Stacked bar charts visualizing how home consumption is covered (Solar vs Battery vs Grid).
- **Production History:** Bar charts aggregated by day, month, or year with smart future-date filtering.

### 🏠 Integration & Smart Home
- **Google Home Integration:** Native Smart Home Action (OAuth2) allowing you to see Solar Power, Home Load, and Battery SOC directly in the Google Home app.
- **Weather Widget:** Real-time weather proxy to Open-Meteo with cloud cover, rain probability, and temperature data, cached for 15 minutes.
- **Interactive Plant Map:** MapLibre GL map showing plant location with custom themed markers and info popups.

### ⚙️ Device Management
- **Inverter Details:** View firmware versions, communication protocols, and connected datalogger/meter modules.
- **Battery Diagnostics:** Detailed battery pack specifications and State of Charge (SOC) operational limits.
- **Settings Inspector:** Read-only view of all inverter configuration registers (Work Mode, Grid Limits, Battery Settings).
- **Configurable Plant Settings:** User-editable parameters (Tilt, Orientation, Performance Ratio) to tune the solar forecast model.

### 📱 User Experience (UX)
- **Apple-Inspired Design:** Premium interface with glassmorphism, smooth transitions, and high-density widget layouts.
- **Mobile-First Gestures:**
  - **Pull-to-Refresh:** Animated gesture with haptic feedback to force data updates.
  - **Swipe Navigation:** Horizontal swipe between pages on mobile.
  - **Smart Gesture Suppression:** Prevents accidental navigation when interacting with charts or maps.
- **Theme Support:** Modern Dark, Light, and System modes with a dedicated toggle animation.
- **Responsive Layout:** Collapsible sidebar on desktop and a fixed bottom navigation bar on mobile.

### 🔒 Security & Performance
- **Secure Authentication:** JWT-based flow using **HttpOnly Cookies** and Bcrypt password hashing.
- **Timezone-Aware:** Automatic detection of the plant's local timezone for accurate daily resets.
- **Optimized Caching:** Backend TTL-based caching for API responses to respect rate limits and improve speed.
- **Docker-Ready:** Optimized for self-hosting (Synology, NAS) with a pre-configured `docker-compose.yml`.

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Backend** | Python 3.12+ · FastAPI · SQLAlchemy · SQLite · JWT (HttpOnly Cookies) · Passlib · Bcrypt |
| **PV Integration** | **PyPi_GrowattServer** (Open API V1) |
| **Frontend** | React 19 · Vite · Tailwind CSS v4 · shadcn/ui · Recharts · MapLibre GL · TanStack Query |
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
│   │   ├── device.py         # /device — inverter details & settings
│   │   ├── weather.py        # /weather — current weather & solar forecast
│   │   └── google_home.py    # /google-home — OAuth2 & Fulfillment for Google
│   ├── utilities/            # Administrative scripts
│   │   ├── find_plant.py     # Discover plant ID and device serial
│   │   ├── create_user.py    # Create new dashboard users
│   │   └── check_db_users.py # List existing dashboard users
│   ├── services/
│   │   ├── growatt.py        # Growatt V1 API integration + TTL cache
│   │   └── weather.py        # Open-Meteo integration + solar forecast logic
│   ├── auth.py               # JWT logic, cookie handling
│   ├── database.py           # SQLite connection setup
│   ├── models.py             # User model (SQLAlchemy)
│   ├── main.py               # Application entry point + CORS
│   └── requirements.txt      # Python dependencies
├── frontend/                 # React frontend
│   ├── src/
│   │   ├── api/              # Backend communication layer (fetch wrapper)
│   │   ├── context/          # AuthContext (JWT cookie auth state)
│   │   ├── hooks/            # useGrowatt, useTheme, usePullToRefresh, useSwipeNavigation, etc.
│   │   ├── components/       # UI cards, charts, FlowNode, WeatherCard, Map, ...
│   │   └── pages/            # Overview, History, TechnicalInfo, UserAccount, LoginPage, GoogleHomeLinking
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

### Plant & Energy (Protected)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/plant/info` | Plant metadata, coordinates, and capacity |
| GET | `/energy/overview` | KPI summary (Today, Month, Year, CO₂) |
| GET | `/energy/today` | Live power flow + daily totals |
| GET | `/energy/aggregate` | Historical energy by Day/Month/Year |
| GET | `/energy/daily-breakdown` | Full energy flow breakdown by date |

### Device & Services (Protected)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/device/detail` | Firmware, model, battery specs |
| GET | `/device/settings` | Inverter register configuration dump |
| GET | `/weather/current` | Current weather and forecast |
| GET | `/weather/solar-forecast` | Hourly production prediction |
| GET | `/google-home/debug` | Debug Google Home sensor state mapping |

*Interactive API docs: `http://localhost:8000/docs`*

---

## 🚀 Getting Started

### Prerequisites
- **Python 3.12+**
- **Node.js 18+**
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
- A `.env` file already configured with all four variables (run steps 3–5 from Option A locally first to populate it, then copy the `growdash.db` database file to the server).

#### 2. `docker-compose.yml`
Adjust paths in `docker-compose.yml` (Synology requires absolute paths for build contexts).

```bash
docker compose up -d --build
```

Or via the **Synology Container Manager GUI** → Projects → Create → select your `docker-compose.yml`.

#### 4. Managing users in Docker

To create a dashboard user after the containers are running:

```bash
docker exec -it <backend_container> python utilities/create_user.py
```

---

## 🔗 Google Home Integration

GroWDash can expose your photovoltaic data as sensors to Google Home.

1. Set up a **Cloudflare Tunnel** (see below).
2. Create a project in [Actions Console](https://console.actions.google.com).
3. Configure **Account Linking** using your tunnel URL:
   - Authorization URL: `https://your-domain.com/google-home/auth`
   - Token URL: `https://your-domain.com/google-home/token`
4. Deploy the `cloudflared` container or point your fulfillment to `/google-home/fulfillment`.

---

## ☁️ Cloudflare Tunnel

To expose GroWDash safely without port forwarding:
1. Create a Tunnel in **Cloudflare Zero Trust**.
2. Add a Public Hostname for the frontend (`http://frontend:80` in Docker).
3. Add a Public Hostname for the backend (`http://backend:8000`).
4. (Optional) Enable **Cloudflare Access** for additional SSO protection.

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

---

## ⚙️ Caching Strategy

| Data type | Cache TTL | Rationale |
|-----------|-----------|-----------|
| Live / Today data | 5 minutes | Growatt API refresh frequency |
| Past months / years | 24 hours | Static historical data |
| Weather | 15 minutes | Respect rate limits |
| Solar Forecast | 1 hour | Slow-changing irradiance |

---

## ⚠️ Disclaimer
This project is not affiliated with Growatt. It uses only read-only operations via the public API. Use at your own risk.

---

## 📄 License
MIT — Copyright (c) 2026 Fabio Scarparo