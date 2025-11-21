from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, date
import json
import os

app = FastAPI(title="Sistema de Citas Médicas")

# Configurar CORS para permitir peticiones desde el frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Modelos de datos
class Cita(BaseModel):
    id: Optional[int] = None
    paciente: str
    telefono: str
    centro_salud: str
    especialidad: str
    fecha: str
    hora: str
    motivo: str
    estado: str = "Pendiente"

class Paciente(BaseModel):
    nombre: str
    telefono: str
    email: Optional[str] = None

# Base de datos simulada (en memoria)
citas_db = []
pacientes_db = []
contador_id = 1

# Catálogo de centros de salud y especialidades
CENTROS_SALUD = [
    "Hospital Central",
    "Clínica del Norte",
    "Centro Médico Sur",
    "Hospital Universitario",
    "Clínica Santa María"
]

ESPECIALIDADES = [
    "Medicina General",
    "Pediatría",
    "Cardiología",
    "Dermatología",
    "Ginecología",
    "Traumatología",
    "Oftalmología",
    "Psicología"
]

# Rutas de la API

@app.get("/")
def home():
    return {"mensaje": "API de Citas Médicas funcionando correctamente"}

@app.get("/centros")
def obtener_centros():
    return {"centros": CENTROS_SALUD}

@app.get("/especialidades")
def obtener_especialidades():
    return {"especialidades": ESPECIALIDADES}

@app.post("/citas")
def crear_cita(cita: Cita):
    global contador_id
    cita.id = contador_id
    contador_id += 1
    citas_db.append(cita.dict())
    return {"mensaje": "Cita agendada exitosamente", "cita": cita}

@app.get("/citas")
def obtener_citas():
    return {"citas": citas_db, "total": len(citas_db)}

@app.get("/citas/{cita_id}")
def obtener_cita(cita_id: int):
    for cita in citas_db:
        if cita["id"] == cita_id:
            return {"cita": cita}
    raise HTTPException(status_code=404, detail="Cita no encontrada")

@app.put("/citas/{cita_id}")
def actualizar_cita(cita_id: int, cita_actualizada: Cita):
    for i, cita in enumerate(citas_db):
        if cita["id"] == cita_id:
            cita_actualizada.id = cita_id
            citas_db[i] = cita_actualizada.dict()
            return {"mensaje": "Cita actualizada", "cita": cita_actualizada}
    raise HTTPException(status_code=404, detail="Cita no encontrada")

@app.delete("/citas/{cita_id}")
def cancelar_cita(cita_id: int):
    for i, cita in enumerate(citas_db):
        if cita["id"] == cita_id:
            citas_db.pop(i)
            return {"mensaje": "Cita cancelada exitosamente"}
    raise HTTPException(status_code=404, detail="Cita no encontrada")

@app.get("/estadisticas")
def obtener_estadisticas():
    total_citas = len(citas_db)
    
    # Contar por especialidad
    especialidades_count = {}
    for cita in citas_db:
        esp = cita["especialidad"]
        especialidades_count[esp] = especialidades_count.get(esp, 0) + 1
    
    # Contar por centro de salud
    centros_count = {}
    for cita in citas_db:
        centro = cita["centro_salud"]
        centros_count[centro] = centros_count.get(centro, 0) + 1
    
    # Contar por estado
    estados_count = {}
    for cita in citas_db:
        estado = cita["estado"]
        estados_count[estado] = estados_count.get(estado, 0) + 1
    
    return {
        "total_citas": total_citas,
        "por_especialidad": especialidades_count,
        "por_centro": centros_count,
        "por_estado": estados_count
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)