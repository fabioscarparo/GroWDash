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
from routers import plant, energy

# Inizializzazione dell'app FastAPI con metadati del progetto
app = FastAPI(
    title="GroWDash API",
    description="API per la dashboard del tuo impianto fotovoltaico Growatt",
    version="0.1.0",
)

# Registrazione dei router
app.include_router(plant.router)
app.include_router(energy.router)


@app.get("/", summary="Health check", tags=["General"])
def root():
    """
    Endpoint di verifica — conferma che il server è attivo e raggiungibile.
    Utile per monitoring e per il health check del container Docker.
    """
    return {"message": "GroWDash API is running"}