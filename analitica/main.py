import os
from datetime import date, datetime
from typing import Any

from fastapi import FastAPI, HTTPException
import psycopg
from psycopg.rows import dict_row

app = FastAPI(title="Analitica Tienda UCN")


def _numero(valor: Any) -> int:
    try:
        return int(valor or 0)
    except (TypeError, ValueError):
        return 0


def _estado(stock: int) -> str:
    if stock <= 5:
        return "CRITICO"
    if stock <= 20:
        return "BAJO"
    if stock <= 50:
        return "NORMAL"
    return "ALTO"


def _configuracion_db() -> dict[str, Any]:
    requeridas = ("DB_NAME", "DB_USER", "DB_PASSWORD")
    faltantes = [nombre for nombre in requeridas if not os.environ.get(nombre)]
    if faltantes:
        raise RuntimeError(f"Faltan variables de base de datos: {', '.join(faltantes)}")
    return {
        "host": os.environ.get("DB_HOST", "localhost"),
        "port": int(os.environ.get("DB_PORT", "5432")),
        "dbname": os.environ["DB_NAME"],
        "user": os.environ["DB_USER"],
        "password": os.environ["DB_PASSWORD"],
        "connect_timeout": 5,
        "row_factory": dict_row,
    }


def _leer_datos():
    productos: dict[str, dict[str, Any]] = {}
    por_sku: dict[str, dict[str, Any]] = {}
    with psycopg.connect(**_configuracion_db()) as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT p.codigo_producto, p.nombre, c.nombre AS categoria,
                       p.precio_venta, p.precio_tac, v.sku, v.talla, v.color,
                       v.stock, v.stock_minimo
                FROM productos p
                JOIN categorias c ON c.id_categoria = p.id_categoria
                JOIN variantes_producto v ON v.codigo_producto = p.codigo_producto
                ORDER BY p.nombre, v.id_variante
                """
            )
            variantes_db = cursor.fetchall()
            cursor.execute(
                """
                SELECT s.id_salida, f.id_factura, f.numero_documento,
                       f.fecha, p.nombre, v.sku, v.color, v.talla,
                       s.cantidad, f.metodo_pago, f.tipo_venta, s.subtotal,
                       COALESCE(p.precio_tac, 0) AS precio_tac
                FROM salidas s
                JOIN facturas f ON f.id_factura = s.id_factura
                JOIN variantes_producto v ON v.id_variante = s.id_variante
                JOIN productos p ON p.codigo_producto = v.codigo_producto
                ORDER BY f.fecha, s.id_salida
                """
            )
            ventas_db = cursor.fetchall()
            cursor.execute(
                """
                SELECT d.id_tac, d.n_tac, d.fecha, d.cantidad, d.total,
                       d.firma_comprador, d.firma_vendedor, d.responsable,
                       p.codigo_producto, p.nombre, c.nombre AS categoria,
                       v.sku, v.talla, v.color, p.precio_venta, p.precio_tac,
                       v.stock, v.stock_minimo
                FROM documentos_tac d
                JOIN variantes_producto v ON v.id_variante = d.id_variante
                JOIN productos p ON p.codigo_producto = v.codigo_producto
                JOIN categorias c ON c.id_categoria = p.id_categoria
                ORDER BY d.fecha, d.id_tac
                """
            )
            tac_db = cursor.fetchall()

    for fila in variantes_db:
        codigo = fila["codigo_producto"]
        sku = fila["sku"]
        variante = {
            "nombre": fila["nombre"],
            "codigoProducto": codigo,
            "categoria": fila["categoria"],
            "color": fila["color"],
            "talla": fila["talla"] or "unica",
            "precio": _numero(fila["precio_venta"]),
            "precioTac": _numero(fila["precio_tac"]),
            "stock": _numero(fila["stock"]),
            "stockMinimo": _numero(fila["stock_minimo"]),
            "sku": sku,
        }
        por_sku[sku] = variante
        producto = productos.setdefault(
            codigo,
            {
                "codigoProducto": codigo,
                "nombre": fila["nombre"],
                "categoria": fila["categoria"],
                "stock": 0,
                "vendidos": 0,
                "ingresoNormal": 0,
                "ingresoTac": 0,
                "cantInicial": 0,
            },
        )
        producto["stock"] += variante["stock"]

    ventas = []
    for fila in ventas_db:
        unidades = _numero(fila["cantidad"])
        subtotal = _numero(fila["subtotal"])
        es_tac = fila["tipo_venta"] == "tac"
        color = fila["color"]
        talla = fila["talla"] or "unica"
        ventas.append(
            {
                "id": fila["id_salida"],
                "idFactura": fila["id_factura"],
                "numeroVenta": fila["numero_documento"],
                "fecha": fila["fecha"].isoformat() if fila["fecha"] else "",
                "producto": fila["nombre"],
                "sku": fila["sku"],
                "variante": " ".join(
                    filter(None, [color, talla if talla != "unica" else ""])
                ),
                "cantidad": unidades,
                "metodoPago": fila["metodo_pago"],
                "tipoVenta": fila["tipo_venta"],
                "subtotal": subtotal,
                "ganancia": 0
                if es_tac
                else subtotal - unidades * _numero(fila["precio_tac"]),
            }
        )

    tac = []
    for fila in tac_db:
        variante = por_sku.get(fila["sku"])
        if variante is None:
            variante = {
                "nombre": fila["nombre"],
                "codigoProducto": fila["codigo_producto"],
                "categoria": fila["categoria"],
                "color": fila["color"],
                "talla": fila["talla"] or "unica",
                "precio": _numero(fila["precio_venta"]),
                "precioTac": _numero(fila["precio_tac"]),
                "stock": _numero(fila["stock"]),
                "stockMinimo": _numero(fila["stock_minimo"]),
                "sku": fila["sku"],
            }
        tac.append(
            {
                "id": fila["id_tac"],
                "fila": fila["id_tac"],
                "numero": str(fila["n_tac"]).strip(),
                "fecha": fila["fecha"].isoformat() if fila["fecha"] else "",
                "sku": fila["sku"],
                "cantidad": _numero(fila["cantidad"]),
                "total": _numero(fila["total"]),
                "firmaComprador": fila["firma_comprador"] or "Pendiente",
                "firmaVendedor": fila["firma_vendedor"] or "Pendiente",
                "responsable": fila["responsable"] or "",
                "variante": variante,
            }
        )
    return productos, por_sku, ventas, tac


def _mensaje_fecha(fecha: Any) -> str:
    if isinstance(fecha, (datetime, date)):
        return fecha.isoformat()
    return str(fecha or "")


@app.get("/")
def estado():
    return {"servicio": "analitica", "estado": "activo"}


@app.get("/resumen")
def resumen():
    try:
        productos, variantes, ventas, tac = _leer_datos()
    except (psycopg.Error, RuntimeError, ValueError) as exc:
        raise HTTPException(status_code=503, detail=f"No se pudo consultar la base de datos: {exc}") from exc

    for venta in ventas:
        if venta["tipoVenta"] != "normal":
            continue
        codigo = variantes[venta["sku"]]["codigoProducto"]
        producto = productos[codigo]
        producto["vendidos"] += venta["cantidad"]
        producto["ingresoNormal"] += venta["subtotal"]
    for documento in tac:
        codigo = documento["variante"]["codigoProducto"]
        producto = productos[codigo]
        producto["vendidos"] += documento["cantidad"]
        producto["ingresoTac"] += documento["total"]

    for producto in productos.values():
        producto["cantInicial"] = producto["stock"] + producto["vendidos"]
        producto["porcentajeVendido"] = round(producto["vendidos"] / producto["cantInicial"] * 100, 1) if producto["cantInicial"] else 0

    ventas_normales = [v for v in ventas if v["tipoVenta"] == "normal"]
    unidades_normales = sum(v["cantidad"] for v in ventas_normales)
    unidades_tac = sum(t["cantidad"] for t in tac)
    ingreso_normal = sum(v["subtotal"] for v in ventas_normales)
    ingreso_tac = sum(t["total"] for t in tac)
    ganancia = sum(v["ganancia"] for v in ventas_normales)
    ids_normales = {v["idFactura"] for v in ventas_normales}
    ventas_sin_folio = sum(1 for v in ventas_normales if v["numeroVenta"] is None)
    ids_tac = {t["numero"] for t in tac}
    tac_por_id = {}
    for documento in tac:
        tac_por_id.setdefault(documento["numero"], documento)
    total_stock = sum(p["stock"] for p in productos.values())
    total_vendidas = unidades_normales + unidades_tac
    total_inicial = total_stock + total_vendidas

    alertas = []
    for sku, variante in variantes.items():
        stock = variante["stock"]
        if stock <= 20:
            alertas.append({
                "codigoProducto": variante["codigoProducto"], "nombre": variante["nombre"],
                "sku": sku, "talla": variante["talla"], "color": variante["color"],
                "stock": stock, "stockMinimo": variante["stockMinimo"], "estado": _estado(stock),
            })
    resumen_lista = list(productos.values())
    resumen_lista.sort(key=lambda p: p["nombre"].lower())
    alertas.sort(key=lambda a: (a["estado"], a["stock"]))
    return {
        "general": {
            "totalProductos": len(productos), "totalUnidadesIniciales": total_inicial,
            "stockActualTotal": total_stock, "unidadesVendidas": total_vendidas,
            "porcentajeVendido": round(total_vendidas / total_inicial * 100, 1) if total_inicial else 0,
        },
        "ventas": {
            "totalVentas": len(ids_normales) + ventas_sin_folio + len(ids_tac),
            "ventasNormales": len(ids_normales) + ventas_sin_folio, "ventasTac": len(ids_tac),
            "ingresoNormal": ingreso_normal, "ingresoTac": ingreso_tac,
            "ingresoTotal": ingreso_normal + ingreso_tac, "gananciaTotal": ganancia,
        },
        "controlTac": {
            "totalDocumentos": len(ids_tac),
            "aprobados": sum(1 for t in tac_por_id.values() if t["firmaComprador"].casefold() == "firmado" and t["firmaVendedor"].casefold() == "firmado"),
            "pendientes": len(ids_tac) - sum(1 for t in tac_por_id.values() if t["firmaComprador"].casefold() == "firmado" and t["firmaVendedor"].casefold() == "firmado"),
            "montoTotal": ingreso_tac,
        },
        "resumenPorProducto": resumen_lista, "alertasStockBajo": alertas,
    }


@app.get("/registro-ventas")
def registro_ventas():
    try:
        _, _, ventas, _ = _leer_datos()
        return [
            {
                "id": venta["id"],
                "numeroVenta": venta["numeroVenta"],
                "fecha": _mensaje_fecha(venta["fecha"]),
                "producto": venta["producto"],
                "sku": venta["sku"],
                "variante": venta["variante"],
                "cantidad": venta["cantidad"],
                "metodoPago": venta["metodoPago"],
                "tipoVenta": venta["tipoVenta"],
                "subtotal": venta["subtotal"],
                "ganancia": venta["ganancia"],
            }
            for venta in ventas
        ]
    except (psycopg.Error, RuntimeError, ValueError) as exc:
        raise HTTPException(status_code=503, detail=f"No se pudo consultar el registro de ventas en la base de datos: {exc}") from exc
