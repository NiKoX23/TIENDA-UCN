import os
from collections import defaultdict

import psycopg2
from fastapi import FastAPI, HTTPException

app = FastAPI(title="Analitica Tienda UCN")


def _conexion():
    dsn = os.environ.get("ANALITICA_DB_URL")
    if not dsn:
        raise HTTPException(status_code=500, detail="ANALITICA_DB_URL no está configurada")
    try:
        return psycopg2.connect(dsn)
    except Exception as exc:
        raise HTTPException(
            status_code=503, detail=f"No se pudo conectar a la base de datos: {exc}"
        ) from exc


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
    conexion = _conexion()
    try:
        with conexion.cursor() as cur:
            cur.execute(
                "SELECT id_variante, COALESCE(SUM(cantidad), 0) FROM salidas GROUP BY id_variante"
            )
            vendidas_por_variante = {
                int(fila[0]): int(fila[1]) for fila in cur.fetchall()
            }

            cur.execute(
                """
                SELECT p.codigo_producto, p.nombre, c.nombre, p.precio_venta,
                       COALESCE(p.precio_tac, 0),
                       v.id_variante, v.talla, v.color, v.sku, v.stock, v.stock_minimo
                FROM productos p
                JOIN categorias c ON c.id_categoria = p.id_categoria
                JOIN variantes_producto v ON v.codigo_producto = p.codigo_producto
                WHERE p.activo = TRUE
                """
            )
            productos = cur.fetchall()

            cur.execute("SELECT COUNT(*), COALESCE(SUM(total), 0) FROM facturas")
            total_ventas, ingreso_normal = cur.fetchone()
            total_ventas = int(total_ventas or 0)
            ingreso_normal = int(ingreso_normal or 0)

            cur.execute(
                """
                SELECT COALESCE(
                    SUM(s.cantidad * (s.precio_unitario - COALESCE(p.precio_tac, 0))),
                    0
                )
                FROM salidas s
                JOIN variantes_producto v ON v.id_variante = s.id_variante
                JOIN productos p ON p.codigo_producto = v.codigo_producto
                """
            )
            ganancia_total = int(cur.fetchone()[0] or 0)
    finally:
        conexion.close()

    resumen_por_producto = defaultdict(
        lambda: {
            "codigoProducto": "",
            "nombre": "",
            "categoria": "",
            "cantInicial": 0,
            "stock": 0,
            "vendidos": 0,
            "ingresoNormal": 0,
            "ingresoTac": 0,
        }
    )
    alertas = []

    total_inicial = 0
    total_stock = 0
    total_vendidas = 0

    for fila in productos:
        (
            codigo,
            nombre,
            categoria,
            precio_venta,
            precio_tac,
            id_variante,
            talla,
            color,
            sku,
            stock,
            stock_minimo,
        ) = fila
        stock = int(stock or 0)
        stock_minimo = int(stock_minimo or 0)
        precio_venta = int(precio_venta or 0)
        precio_tac = int(precio_tac or 0)
        vendidas = vendidas_por_variante.get(int(id_variante), 0)
        inicial = stock + vendidas

        total_inicial += inicial
        total_stock += stock
        total_vendidas += vendidas

        agg = resumen_por_producto[codigo]
        agg["codigoProducto"] = codigo
        agg["nombre"] = nombre
        agg["categoria"] = categoria
        agg["cantInicial"] += inicial
        agg["stock"] += stock
        agg["vendidos"] += vendidas
        agg["ingresoNormal"] += vendidas * precio_venta
        agg["ingresoTac"] += vendidas * precio_tac

        if stock <= 20:
            alertas.append(
                {
                    "codigoProducto": codigo,
                    "nombre": nombre,
                    "sku": sku,
                    "talla": talla,
                    "color": color,
                    "stock": stock,
                    "stockMinimo": stock_minimo,
                    "estado": _estado(stock),
                }
            )

    resumen_lista = list(resumen_por_producto.values())
    for agg in resumen_lista:
        agg["porcentajeVendido"] = (
            round(agg["vendidos"] / agg["cantInicial"] * 100, 1)
            if agg["cantInicial"]
            else 0
        )
    resumen_lista.sort(key=lambda r: r["nombre"].lower())
    alertas.sort(key=lambda a: (a["estado"], a["stock"]))

    return {
        "general": {
            "totalProductos": len(resumen_lista),
            "totalUnidadesIniciales": total_inicial,
            "stockActualTotal": total_stock,
            "unidadesVendidas": total_vendidas,
            "porcentajeVendido": (
                round(total_vendidas / total_inicial * 100, 1) if total_inicial else 0
            ),
        },
        "ventas": {
            "totalVentas": total_ventas,
            "ventasNormales": total_ventas,
            "ventasTac": 0,
            "ingresoNormal": ingreso_normal,
            "ingresoTac": 0,
            "ingresoTotal": ingreso_normal,
            "gananciaTotal": ganancia_total,
        },
        "controlTac": {
            "totalDocumentos": 0,
            "aprobados": 0,
            "pendientes": 0,
            "montoTotal": 0,
        },
        "resumenPorProducto": resumen_lista,
        "alertasStockBajo": alertas,
    }