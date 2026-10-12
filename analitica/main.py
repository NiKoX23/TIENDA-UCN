import os
from datetime import date, datetime
from pathlib import Path

from openpyxl import load_workbook
from fastapi import FastAPI, HTTPException

app = FastAPI(title="Analitica Tienda UCN")
RUTA_EXCEL = Path(
    os.environ.get(
        "INVENTARIO_XLSX_PATH",
        str(Path(__file__).resolve().parent.parent / "docs" / "Inventario.xlsx"),
    )
)


def _estado(stock: int) -> str:
    if stock <= 5:
        return "CRITICO"
    if stock <= 20:
        return "BAJO"
    if stock <= 50:
        return "NORMAL"
    return "ALTO"


@app.get("/")
def estado():
    return {"servicio": "analitica", "estado": "activo"}


@app.get("/resumen")
def resumen():
    try:
        if not RUTA_EXCEL.is_file():
            raise FileNotFoundError(f"No existe el archivo {RUTA_EXCEL}")

        libro = load_workbook(RUTA_EXCEL, data_only=True, read_only=True)
        try:
            inventario = libro["Inventario"]
            dashboard = libro["Dashboard"]

            total_productos = int(dashboard["B4"].value or 0)
            total_inicial = int(dashboard["B5"].value or 0)
            total_stock = int(dashboard["B6"].value or 0)
            total_vendidas = int(dashboard["B7"].value or 0)

            resumen_lista = []
            alertas = []
            for fila in inventario.iter_rows(
                min_row=3, max_row=62, min_col=1, max_col=16, values_only=True
            ):
                nombre = fila[1]
                if not nombre:
                    continue

                nombre = str(nombre).strip()
                codigo = str(fila[15] or nombre).strip()
                cant_inicial = int(fila[4] or 0)
                stock = int(fila[7] or 0)
                vendidos = int(fila[13] or 0) + int(fila[14] or 0)
                estado = str(fila[12] or _estado(stock)).upper()
                resumen_lista.append(
                    {
                        "codigoProducto": codigo,
                        "nombre": nombre,
                        "categoria": _categoria(nombre),
                        "cantInicial": cant_inicial,
                        "stock": stock,
                        "vendidos": vendidos,
                        "porcentajeVendido": (
                            round(vendidos / cant_inicial * 100, 1)
                            if cant_inicial
                            else 0
                        ),
                        "ingresoNormal": int(fila[10] or 0),
                        "ingresoTac": int(fila[11] or 0),
                    }
                )

                if estado != "HISTORICO" and stock <= 20:
                    alertas.append(
                        {
                            "codigoProducto": codigo,
                            "nombre": nombre,
                            "sku": codigo,
                            "talla": str(fila[3] or ""),
                            "color": str(fila[2]) if fila[2] else None,
                            "stock": stock,
                            "stockMinimo": 0,
                            "estado": estado,
                        }
                    )

            ventas = {
                "totalVentas": int(dashboard["B11"].value or 0),
                "ventasNormales": int(dashboard["B12"].value or 0),
                "ventasTac": int(dashboard["B13"].value or 0),
                "ingresoNormal": int(dashboard["B14"].value or 0),
                "ingresoTac": int(dashboard["B15"].value or 0),
                "ingresoTotal": int(dashboard["B16"].value or 0),
                "gananciaTotal": int(dashboard["B17"].value or 0),
            }
            control_tac = {
                "totalDocumentos": int(dashboard["B20"].value or 0),
                "aprobados": int(dashboard["B21"].value or 0),
                "pendientes": int(dashboard["B22"].value or 0),
                "montoTotal": int(dashboard["B23"].value or 0),
            }
        finally:
            libro.close()
    except Exception as exc:
        raise HTTPException(
            status_code=503,
            detail=f"No se pudo leer el resumen desde docs/Inventario.xlsx: {exc}",
        ) from exc

    resumen_lista.sort(key=lambda producto: producto["nombre"].lower())
    alertas.sort(key=lambda alerta: (alerta["estado"], alerta["stock"]))

    return {
        "general": {
            "totalProductos": total_productos,
            "totalUnidadesIniciales": total_inicial,
            "stockActualTotal": total_stock,
            "unidadesVendidas": total_vendidas,
            "porcentajeVendido": (
                round(total_vendidas / total_inicial * 100, 1) if total_inicial else 0
            ),
        },
        "ventas": ventas,
        "controlTac": control_tac,
        "resumenPorProducto": resumen_lista,
        "alertasStockBajo": alertas,
    }


@app.get("/registro-ventas")
def registro_ventas():
    try:
        if not RUTA_EXCEL.is_file():
            raise FileNotFoundError(f"No existe el archivo {RUTA_EXCEL}")

        libro = load_workbook(RUTA_EXCEL, data_only=True, read_only=True)
        try:
            inventario = libro["Inventario"]
            ventas = libro["Registro Ventas"]
            sku_por_producto = {
                str(fila[0]).strip(): str(fila[14]).strip()
                for fila in inventario.iter_rows(
                    min_row=3, max_row=62, min_col=2, max_col=16, values_only=True
                )
                if fila[0] and fila[14]
            }

            registros = []
            for numero_fila, fila in enumerate(
                ventas.iter_rows(
                    min_row=3, max_row=503, min_col=1, max_col=14, values_only=True
                ),
                start=3,
            ):
                producto = str(fila[2] or "").strip()
                if not producto:
                    continue

                fecha = fila[1]
                if isinstance(fecha, (datetime, date)):
                    fecha = fecha.isoformat()
                else:
                    fecha = str(fecha or "")

                registros.append(
                    {
                        "id": numero_fila,
                        "numeroVenta": int(fila[0]) if fila[0] is not None else None,
                        "fecha": fecha,
                        "producto": producto,
                        "sku": sku_por_producto.get(producto, ""),
                        "variante": str(fila[13] or "").strip(),
                        "cantidad": int(fila[3] or 0),
                        "metodoPago": str(fila[4] or "").strip(),
                        "tipoVenta": "tac" if "TAC" in str(fila[5] or "").upper() else "normal",
                        "subtotal": int(fila[9] or 0),
                        "ganancia": int(fila[11] or 0),
                    }
                )
        finally:
            libro.close()
    except Exception as exc:
        raise HTTPException(
            status_code=503,
            detail=f"No se pudo leer el historial desde docs/Inventario.xlsx: {exc}",
        ) from exc

    return registros


def _categoria(nombre: str) -> str:
    nombre = nombre.upper()
    if "POLERON" in nombre:
        return "Polerones"
    if "PELUCHE" in nombre:
        return "Peluches"
    if "LIBRETA" in nombre or "LAPIZ" in nombre:
        return "Papelería"
    if "LLAVERO" in nombre or "TOTE BAG" in nombre:
        return "Accesorios"
    return "Otros"