# GroWDash

A modern, clean, and comprehensive dashboard for **Growatt MIN inverters**.

Built with **FastAPI** + **React**, powered by the [PyPi_GrowattServer](https://github.com/indykoning/PyPi_GrowattServer) library and the official Growatt V1 (Token) API.

---

## Why GroWDash?

GroWDash provides an essential and clean designed dashboard with real-time data, historical charts, and advanced analytics for your photovoltaic system. It serves as a more intuitive, feature-rich, and UI-curated alternative to the official ShinePhone App.

---

## ✨ Features

- **Secure Authentication:** Implementation of a robust JWT flow using **HttpOnly Cookies**.
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
| **Backend** | Python 3.12+ · FastAPI · SQLAlchemy · SQLite · JWT · Passlib |
| **PV Integration** | growattServer (V1 Token API) |
| **Frontend** | React · Vite · Tailwind CSS · shadcn/ui · ApexCharts · Recharts · React Query |
| **Deployment** | Docker · Docker Compose · Nginx (Coming Soon) |

---

## 📂 Project Structure
```text
GroWDash/
├── backend/                  # FastAPI backend
│   ├── routers/              # API endpoints organized by domain
│   │   ├── auth.py           # /auth — token issuance
│   │   ├── plant.py          # /plant — plant information
│   │   ├── energy.py         # /energy — energy data & history
│   │   └── device.py         # /device — inverter details & settings
│   ├── utilities/            # Administrative scripts
│   │   ├── find_plant.py     # Find IDs for initial setup
│   │   ├── create_user.py    # Create new dashboard users
│   │   └── check_db_users.py # List existing dashboard users
│   ├── services/
│   │   └── growatt.py        # Growatt V1 API integration layer
│   ├── auth.py               # Security & JWT logic
│   ├── database.py           # SQLite connection setup
│   ├── models.py             # Database user schemas
│   ├── main.py               # Application entry point
│   └── requirements.txt      # Python dependencies
├── frontend/                 # React frontend
│   ├── src/
│   │   ├── context/          # AuthContext for state management
│   │   ├── components/       # UI cards and charts
│   │   ├── pages/            # Views (Login, Overview, History, etc.)
│   │   └── api/              # Backend communication layer
├── .env.example              # Environment variables template
├── .gitignore                # Root gitignore (OS & IDE files)
└── docker-compose.yml        # Docker orchestration (coming soon)
```

---

## 📡 API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/token` | Validates credentials and issues JWT |

### General
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Health check |

### Plant (Protected)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/plant/info` | Plant name, location, peak power, status |

### Energy (Protected)
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
- **Python 3.12+**
- **Node.js 18+** (for frontend development)
- **Git**
- A **Growatt account** with an API Token (available in the ShinePhone app: **Me → API Token**)

---

### 1. Clone the repository
First, download the project to your local machine:
```bash
git clone https://github.com/fabioscarparo/GroWDash.git
cd GroWDash
```

---

### 2. Set up the Backend

Navigate to the `backend` folder and create a Python virtual environment to keep dependencies isolated:
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

You should see `(.venv)` appear in your terminal prompt. Now, install all required Python dependencies:
```bash
pip install -r requirements.txt
```

---

### 3. Initial Configuration

Copy the environment template file into the `backend` folder to create your local configuration:
```bash
# Windows
copy ..\.env.example .env

# Mac/Linux
cp ../.env.example .env
```

Open the newly created `.env` file and provide the two mandatory values required to start the discovery process:
1. **GROWATT_TOKEN**: This is your primary authorization key. You can find it in the Growatt **ShinePhone App** by navigating to: **Me → API Token**. 
2. **JWT_SECRET_KEY**: A unique security string used to sign your dashboard sessions.

```env
GROWATT_TOKEN=your_token_here
JWT_SECRET_KEY=your_random_secret_string

# Leave these empty for now; the next step will help you find them
GROWATT_PLANT_ID=
GROWATT_DEVICE_SN=
```

> [!TIP]
> **To generate a secure JWT Secret Key**, run this command in your terminal and copy the unique string it produces:
> `python -c "import secrets; print(secrets.token_hex(32))"`

---

### 4. Hardware Discovery (Find your IDs)

GroWDash needs to know exactly which plant and inverter to monitor. We provide an automated utility to fetch these IDs from the Growatt servers.

1. **Run the discovery script**:
   ```bash
   python utilities/find_plant.py
   ```
2. **Update your `.env`**: The script will print a block of configuration at the end. Look for the lines starting with `GROWATT_PLANT_ID` and `GROWATT_DEVICE_SN`. **Copy these whole lines** and paste them into your `.env` file, replacing the empty values.

---

### 5. Initialize the Database

GroWDash uses a local SQLite database to store your dashboard account. You must create at least one user to be able to log in.

1. **Create your User**: Ensure your virtual environment is active, then run the utility:
   ```bash
   # Make sure you are in the /backend folder
   python utilities/create_user.py
   ```
2. Follow the prompts to set your **username** and **password**.
   - This information is stored only on your machine in `growdash.db`.
   - Passwords are securely hashed using **Bcrypt**.
   - If you encounter a "ModuleNotFoundError", ensure you ran `source .venv/bin/activate`.

---

### 5. Start the Backend Server

Launch the FastAPI application using Uvicorn:
```bash
uvicorn main:app --reload
```
The backend is now running at **http://localhost:8000**. You can explore the interactive API documentation at `/docs`.

---

### 6. Set up the Frontend

Open a **new terminal tab**, navigate to the `frontend` folder, and install the necessary Node.js packages:
```bash
cd frontend
npm install
```

Start the Vite development server:
```bash
npm run dev
```

The frontend is now running at **http://localhost:5173**. 

*(Note: Make sure the backend is also running in your other terminal so the frontend can retrieve your data).*

---

## 🖼 Frontend Architecture

The frontend is a single-page application built with **React** and **Vite**.

- **Authentication:** Handled via a custom `AuthContext`. Unlike standard implementations, GroWDash uses **HttpOnly Cookies** to store JWT tokens. This makes the token inaccessible to JavaScript, providing strong protection against XSS attacks—essential for exposing the dashboard in a DMZ or on the internet.
- **Data Fetching:** Managed by **TanStack Query** (`react-query`). Data is cached and automatically refreshed every 5 minutes (standard Growatt reporting interval).
- **Design System:** Built using **Tailwind CSS** and **shadcn/ui** components for a premium, responsive look.
- **Charts:** A combination of **ApexCharts** and **Recharts** delivers rich visual analytics.

---

## 🔌 Compatibility

Currently supports **Growatt MIN inverters** via the V1 Token API.
*Note: TLX inverters are identified as MIN in the public API and should work seamlessly as well.*

---

## ⚠️ Disclaimer
This project is not affiliated with Growatt. Only read operations are used. No inverter settings are modified. Use at your own risk.

---

## 📄 License

MIT