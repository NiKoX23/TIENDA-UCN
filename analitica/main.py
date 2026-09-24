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
                """
                SELECT s.id_variante, f.tipo_venta, COALESCE(SUM(s.cantidad), 0)
                FROM salidas s
                JOIN facturas f ON f.id_factura = s.id_factura
                GROUP BY s.id_variante, f.tipo_venta
                """
            )
            vendidas_normales = defaultdict(int)
            vendidas_tac = defaultdict(int)
            for id_variante, tipo, cantidad in cur.fetchall():
                if tipo == "tac":
                    vendidas_tac[int(id_variante)] = int(cantidad or 0)
                else:
                    vendidas_normales[int(id_variante)] = int(cantidad or 0)

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

            cur.execute(
                """
                SELECT tipo_venta, COUNT(*), COALESCE(SUM(total), 0)
                FROM facturas GROUP BY tipo_venta
                """
            )
            ventas_normal = (0, 0)
            ventas_tac = (0, 0)
            for tipo, conteo, ingreso in cur.fetchall():
                par = (int(conteo or 0), int(ingreso or 0))
                if tipo == "tac":
                    ventas_tac = par
                else:
                    ventas_normal = par

            cur.execute(
                """
                SELECT COALESCE(
                    SUM(s.cantidad * (s.precio_unitario - COALESCE(p.precio_tac, 0))),
                    0
                )
                FROM salidas s
                JOIN facturas f ON f.id_factura = s.id_factura
                JOIN variantes_producto v ON v.id_variante = s.id_variante
                JOIN productos p ON p.codigo_producto = v.codigo_producto
                WHERE f.tipo_venta = 'normal'
                """
            )
            ganancia_total = int(cur.fetchone()[0] or 0)

            cur.execute(
                """
                SELECT COUNT(*),
                       COUNT(*) FILTER (
                           WHERE firma_comprador = 'Firmado'
                             AND firma_vendedor = 'Firmado'
                       ),
                       (COUNT(*) FILTER (WHERE firma_comprador = 'Pendiente')
                        + COUNT(*) FILTER (WHERE firma_vendedor = 'Pendiente')),
                       COALESCE(SUM(total), 0)
                FROM documentos_tac
                """
            )
            total_doc, aprobados, pendientes, monto_tac = cur.fetchone()
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
        vendidas_n = vendidas_normales.get(int(id_variante), 0)
        vendidas_t = vendidas_tac.get(int(id_variante), 0)
        vendidas = vendidas_n + vendidas_t
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
        agg["ingresoNormal"] += vendidas_n * precio_venta
        agg["ingresoTac"] += vendidas_t * precio_tac

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
            "totalVentas": ventas_normal[0] + ventas_tac[0],
            "ventasNormales": ventas_normal[0],
            "ventasTac": ventas_tac[0],
            "ingresoNormal": ventas_normal[1],
            "ingresoTac": ventas_tac[1],
            "ingresoTotal": ventas_normal[1] + ventas_tac[1],
            "gananciaTotal": ganancia_total,
        },
        "controlTac": {
            "totalDocumentos": int(total_doc or 0),
            "aprobados": int(aprobados or 0),
            "pendientes": int(pendientes or 0),
            "montoTotal": int(monto_tac or 0),
        },
        "resumenPorProducto": resumen_lista,
        "alertasStockBajo": alertas,
    }