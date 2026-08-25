from fastapi import FastAPI

app = FastAPI(title="Analitica Tienda UCN")

@app.get("/")
def estado():
    return {"servicio": "analitica", "estado": "activo"}