"""
GroWDash - Backend API
======================
Server FastAPI che funge da ponte tra il frontend React e i server Growatt.
Recupera i dati del tuo impianto fotovoltaico tramite la libreria growattServer
e li espone come API REST in formato JSON.

Avvio in sviluppo:
    uvicorn main:app --reload

Documentazione interattiva (auto-generata da FastAPI):
    http://127.0.0.1:8000/docs
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import plant, energy, device

# Inizializzazione dell'app FastAPI con metadati del progetto
app = FastAPI(
    title="GroWDash API",
    description="API per la dashboard del tuo impianto fotovoltaico Growatt",
    version="0.1.0",
)

# Configurazione CORS (Cross-Origin Resource Sharing)
# Permette al frontend React di farerichieste al backend FastAPI senza essere bloccato dal browser per motivi di sicurezza.
# In produzione frontend e backend sono sullo stesso dominio quindi il CORS non è strettamente necessario, ma è buona pratica mantenerlo.

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",   # Frontend React (Vite)
        "http://localhost:80",     # Frontend in produzione (Docker + Nginx)
        "http://localhost",        # Frontend in produzione (Docker + Nginx)
    ],
    allow_credentials=True,
    allow_methods=["*"],           # Permette tutti i metodi HTTP (GET, POST, ecc.)
    allow_headers=["*"],           # Permette tutti gli header HTTP
)

# Registrazione dei router
app.include_router(plant.router)
app.include_router(energy.router)
app.include_router(device.router)


@app.get("/", summary="Health check", tags=["General"])
def root():
    """
    Endpoint di verifica — conferma che il server è attivo e raggiungibile.
    Utile per monitoring e per il health check del container Docker.
    """
    return {"message": "GroWDash API is running"}