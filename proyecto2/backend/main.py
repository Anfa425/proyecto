from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, date
import json
import os

app = FastAPI(title="Sistema de Citas Médicas")

# Configurar CORS
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
    cedula: Optional[str] = None
    telefono: str
    centro_salud: str
    especialidad: str
    fecha: str
    hora: str
    motivo: str
    estado: str = "Pendiente"

class Usuario(BaseModel):
    cedula: str
    nombre: str
    password: str
    tipo: str  # "paciente" o "administrador"
    telefono: Optional[str] = None
    email: Optional[str] = None

class LoginRequest(BaseModel):
    cedula: str
    password: str

class Examen(BaseModel):
    id: Optional[int] = None
    cedula_paciente: str
    tipo_examen: str
    fecha: str
    resultado: str
    archivo_url: Optional[str] = None

# Base de datos simulada
citas_db = []
usuarios_db = [
    # Usuarios por defecto
    {
        "cedula": "admin",
        "nombre": "Administrador",
        "password": "admin123",
        "tipo": "administrador",
        "telefono": "3001234567",
        "email": "admin@medicitas.com"
    },
    {
        "cedula": "1234567890",
        "nombre": "Juan Pérez",
        "password": "1234",
        "tipo": "paciente",
        "telefono": "3009876543",
        "email": "juan@email.com"
    },
    {
        "cedula": "9876543210",
        "nombre": "María López",
        "password": "1234",
        "tipo": "paciente",
        "telefono": "3001112233",
        "email": "maria@email.com"
    }
]
examenes_db = []
contador_id = 1
contador_examen = 1

# Catálogos
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

# Rutas de autenticación

@app.post("/login")
def login(credentials: LoginRequest):
    for usuario in usuarios_db:
        if usuario["cedula"] == credentials.cedula and usuario["password"] == credentials.password:
            return {
                "success": True,
                "usuario": {
                    "cedula": usuario["cedula"],
                    "nombre": usuario["nombre"],
                    "tipo": usuario["tipo"],
                    "telefono": usuario.get("telefono"),
                    "email": usuario.get("email")
                }
            }
    raise HTTPException(status_code=401, detail="Credenciales inválidas")

@app.post("/registro")
def registro(usuario: Usuario):
    # Verificar si ya existe
    for u in usuarios_db:
        if u["cedula"] == usuario.cedula:
            raise HTTPException(status_code=400, detail="Usuario ya existe")
    
    usuarios_db.append(usuario.dict())
    return {"mensaje": "Usuario registrado exitosamente"}

@app.get("/usuarios")
def obtener_usuarios():
    return {"usuarios": usuarios_db}

# Rutas generales

@app.get("/")
def home():
    return {"mensaje": "API de Citas Médicas funcionando correctamente"}

@app.get("/centros")
def obtener_centros():
    return {"centros": CENTROS_SALUD}

@app.get("/especialidades")
def obtener_especialidades():
    return {"especialidades": ESPECIALIDADES}

# Rutas de citas

@app.post("/citas")
def crear_cita(cita: Cita):
    global contador_id
    cita.id = contador_id
    contador_id += 1
    citas_db.append(cita.dict())
    return {"mensaje": "Cita agendada exitosamente", "cita": cita}

@app.get("/citas")
def obtener_citas(cedula: Optional[str] = None):
    if cedula:
        # Filtrar por cédula del paciente
        citas_paciente = [c for c in citas_db if c.get("cedula") == cedula]
        return {"citas": citas_paciente, "total": len(citas_paciente)}
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

@app.patch("/citas/{cita_id}/confirmar")
def confirmar_cita(cita_id: int):
    for cita in citas_db:
        if cita["id"] == cita_id:
            cita["estado"] = "Confirmada"
            return {"mensaje": "Cita confirmada exitosamente", "cita": cita}
    raise HTTPException(status_code=404, detail="Cita no encontrada")

@app.delete("/citas/{cita_id}")
def cancelar_cita(cita_id: int):
    for i, cita in enumerate(citas_db):
        if cita["id"] == cita_id:
            citas_db.pop(i)
            return {"mensaje": "Cita cancelada exitosamente"}
    raise HTTPException(status_code=404, detail="Cita no encontrada")

# Rutas de exámenes

@app.post("/examenes")
def crear_examen(examen: Examen):
    global contador_examen
    examen.id = contador_examen
    contador_examen += 1
    examenes_db.append(examen.dict())
    return {"mensaje": "Examen registrado exitosamente", "examen": examen}

@app.get("/examenes/{cedula}")
def obtener_examenes(cedula: str):
    examenes_paciente = [e for e in examenes_db if e["cedula_paciente"] == cedula]
    return {"examenes": examenes_paciente, "total": len(examenes_paciente)}

# Estadísticas

@app.get("/estadisticas")
def obtener_estadisticas(cedula: Optional[str] = None):
    citas = citas_db
    if cedula:
        citas = [c for c in citas_db if c.get("cedula") == cedula]
    
    total_citas = len(citas)
    
    # Contar por especialidad
    especialidades_count = {}
    for cita in citas:
        esp = cita["especialidad"]
        especialidades_count[esp] = especialidades_count.get(esp, 0) + 1
    
    # Contar por centro de salud
    centros_count = {}
    for cita in citas:
        centro = cita["centro_salud"]
        centros_count[centro] = centros_count.get(centro, 0) + 1
    
    # Contar por estado
    estados_count = {}
    for cita in citas:
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