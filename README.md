# GroWDash

Un'alternativa moderna all'app ShinePhone.

## Perché GroWDash?

GroWDash nasce per offrire una dashboard essenziale, con grafici chiari
e un'interfaccia piacevole, sfruttando le stesse API ufficiali Growatt.

## Stack tecnologico

| Layer | Tecnologia |
|-------|-----------|
| Backend | Python 3.12 + FastAPI |
| Frontend | React + Vite + Tailwind + ApexCharts |
| Cache | Redis |
| Deploy | Docker + Docker Compose |

## Struttura del progetto
```
GroWDash/
├── backend/              # Server FastAPI
│   ├── routers/          # Endpoint API divisi per dominio
│   ├── services/         # Logica di business e integrazione Growatt
│   ├── main.py           # Entry point del server
│   └── .venv/            # Virtual environment Python (non committato)
├── frontend/             # App React
├── .env.example          # Template variabili d'ambiente
├── .gitignore            # File esclusi da Git
└── docker-compose.yml    # Orchestrazione dei container
```

## Avvio in sviluppo

### Backend
```bash
cd backend
python -m venv .venv
.venv\Scripts\activate      # Windows
source .venv/bin/activate   # Mac/Linux
pip install -r requirements.txt
uvicorn main:app --reload
```

API disponibile su: http://127.0.0.1:8000
Documentazione interattiva: http://127.0.0.1:8000/docs

## Variabili d'ambiente

Copia `.env.example` in `.env` e compila con i tuoi dati:
```bash
cp .env.example .env
```

| Variabile | Descrizione |
|-----------|-------------|
| `GROWATT_TOKEN` | Token API V1 dal tuo account ShinePhone |
| `GROWATT_PLANT_ID` | ID del tuo impianto fotovoltaico |