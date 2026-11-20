"""Sales analytics backed by completed invoices in the tienda schema."""

from __future__ import annotations

import os
import threading
import time
from collections import OrderedDict
from typing import Any

import jwt
import numpy as np
import pandas as pd
from fastapi import HTTPException, Request
from sqlalchemy import URL, create_engine, text
from sqlalchemy.engine import Engine
from statsmodels.tsa.holtwinters import ExponentialSmoothing


_CACHE_SECONDS = int(os.environ.get("ANALYTICS_CACHE_SECONDS", "300"))
_CACHE_MAX = 64
_cache: OrderedDict[tuple[Any, ...], tuple[float, Any]] = OrderedDict()
_cache_lock = threading.Lock()
_sales_lock = threading.Lock()
_stock_lock = threading.Lock()
_engine_lock = threading.Lock()
_engine: Engine | None = None

_SALES_SQL = text("""
    SELECT date_trunc('month', f.fecha)::date AS mes,
           p.codigo_producto AS producto_id,
           p.nombre AS producto,
           c.nombre AS categoria,
           SUM(s.cantidad)::integer AS unidades,
           SUM(s.subtotal)::numeric AS ingreso
    FROM facturas f
    JOIN salidas s ON s.id_factura = f.id_factura
    JOIN variantes_producto v ON v.id_variante = s.id_variante
    JOIN productos p ON p.codigo_producto = v.codigo_producto
    JOIN categorias c ON c.id_categoria = p.id_categoria
    LEFT JOIN documentos_tac d ON d.id_tac = f.id_tac
    WHERE f.tipo_venta = 'normal'
       OR (f.tipo_venta = 'tac'
           AND d.firma_comprador = 'Firmado'
           AND d.firma_vendedor = 'Firmado')
    GROUP BY date_trunc('month', f.fecha)::date, p.codigo_producto,
             p.nombre, c.nombre
    ORDER BY mes, p.nombre
""")


def _engine_for_db() -> Engine:
    global _engine
    if _engine is not None:
        return _engine
    with _engine_lock:
        if _engine is None:
            user = os.environ.get("ANALYTICS_DB_USER")
            password = os.environ.get("ANALYTICS_DB_PASSWORD")
            if not user or not password:
                raise RuntimeError("Configura ANALYTICS_DB_USER y ANALYTICS_DB_PASSWORD con un usuario PostgreSQL de solo lectura")
            url = URL.create(
                "postgresql+psycopg",
                username=user,
                password=password,
                host=os.environ.get("DB_HOST", "localhost"),
                port=int(os.environ.get("DB_PORT", "5432")),
                database=os.environ.get("DB_NAME", ""),
            )
            _engine = create_engine(url, pool_pre_ping=True, connect_args={"connect_timeout": 5})
    return _engine


def _cache_get(key: tuple[Any, ...]) -> Any | None:
    with _cache_lock:
        entry = _cache.get(key)
        if entry is None:
            return None
        expires, value = entry
        if expires <= time.monotonic():
            del _cache[key]
            return None
        _cache.move_to_end(key)
        return value


def _cache_set(key: tuple[Any, ...], value: Any) -> None:
    with _cache_lock:
        _cache[key] = (time.monotonic() + _CACHE_SECONDS, value)
        _cache.move_to_end(key)
        while len(_cache) > _CACHE_MAX:
            _cache.popitem(last=False)


def _authorized(request: Request) -> dict[str, Any]:
    token = request.headers.get("authorization", "")
    if token.lower().startswith("bearer "):
        token = token[7:].strip()
    else:
        token = request.cookies.get("access_token", "")
    secret = os.environ.get("JWT_SECRET")
    if not secret or not token:
        raise HTTPException(status_code=401, detail="Autenticación requerida")
    try:
        # NestJS currently signs sub as an integer UID. PyJWT 2.10+ rejects
        # non-string subjects by default; keep signature and exp checks active.
        payload = jwt.decode(
            token,
            secret,
            algorithms=["HS256"],
            options={"verify_sub": False},
        )
    except jwt.PyJWTError as exc:
        raise HTTPException(status_code=401, detail="Token inválido o vencido") from exc
    if payload.get("esAdmin") is not True:
        raise HTTPException(status_code=403, detail="Se requiere rol de administrador")
    return payload


def _query_sales() -> pd.DataFrame:
    try:
        engine = _engine_for_db()
        with engine.connect() as connection:
            with connection.begin():
                connection.execute(text("SET TRANSACTION READ ONLY"))
                return pd.read_sql_query(_SALES_SQL, connection)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=503, detail="No se pudieron consultar las ventas") from exc


def _load_sales() -> pd.DataFrame:
    key = ("_sales_frame",)
    cached = _cache_get(key)
    if cached is not None:
        return cached
    # Collapse concurrent cache misses: the three frontend requests share one
    # snapshot instead of issuing three identical aggregate queries.
    with _sales_lock:
        cached = _cache_get(key)
        if cached is not None:
            return cached
        frame = _query_sales()
        _cache_set(key, frame)
        return frame


def _filtered_sales(categoria: str | None, producto_id: str | None) -> pd.DataFrame:
    frame = _load_sales()
    if frame.empty:
        return frame
    if categoria:
        frame = frame[frame["categoria"].str.casefold() == categoria.strip().casefold()]
    if producto_id:
        frame = frame[frame["producto_id"].astype(str) == producto_id.strip()]
    return frame


def ingresos(meses_hist: int, categoria: str | None, producto_id: str | None) -> dict[str, Any]:
    key = ("ingresos", meses_hist, categoria, producto_id)
    cached = _cache_get(key)
    if cached is not None:
        return cached
    frame = _filtered_sales(categoria, producto_id)
    start = pd.Timestamp.now().to_period("M") - (meses_hist - 1)
    if not frame.empty:
        frame = frame[frame["mes"] >= start.start_time.date()]
        frame = frame.groupby("mes", as_index=False).agg(unidades=("unidades", "sum"), ingreso=("ingreso", "sum"))
        frame["mes"] = frame["mes"].astype(str)
        frame["ingreso"] = frame["ingreso"].astype(float)
        result = {"meses_hist": meses_hist, "datos": frame.to_dict(orient="records")}
    else:
        result = {"meses_hist": meses_hist, "datos": []}
    _cache_set(key, result)
    return result


def _forecast(values: pd.Series, months: int) -> tuple[list[float], list[float], list[float], str, bool]:
    count = int((values.fillna(0) != 0).sum())
    if count == 0:
        return [0.0] * months, [0.0] * months, [0.0] * months, "sin_datos", True
    numeric = values.astype(float).fillna(0)
    few = count < 3
    model = "promedio_movil"
    if count >= 12:
        try:
            seasonal = "add" if count >= 24 else None
            fit = ExponentialSmoothing(
                numeric,
                trend="add",
                damped_trend=True,
                seasonal=seasonal,
                seasonal_periods=12 if seasonal else None,
                initialization_method="estimated",
            ).fit(optimized=True)
            forecast = fit.forecast(months).clip(lower=0)
            spread = max(float(numeric.tail(12).std(ddof=0)), float(numeric.tail(12).mean()) * 0.1, 1.0)
            model = "holt_winters"
        except (ValueError, TypeError, ZeroDivisionError):
            forecast, spread, model = _linear_forecast(numeric, months)
    elif count >= 3:
        forecast, spread, model = _linear_forecast(numeric, months)
    else:
        forecast = pd.Series([float(numeric.tail(3).mean())] * months)
        spread = max(float(numeric.std(ddof=0)), float(numeric.mean()) * 0.25, 1.0)
    centers = [max(0.0, float(value)) for value in forecast]
    lower = [max(0.0, value - 1.96 * spread) for value in centers]
    upper = [value + 1.96 * spread for value in centers]
    return centers, lower, upper, model, few


def _linear_forecast(values: pd.Series, months: int) -> tuple[pd.Series, float, str]:
    tail = values.tail(12)
    x = list(range(len(tail)))
    slope, intercept = (0.0, float(tail.mean())) if len(tail) < 2 else np.polyfit(x, tail.to_numpy(), 1)
    forecast = pd.Series([max(0.0, float(intercept + slope * (len(tail) + i))) for i in range(months)])
    spread = max(float(tail.std(ddof=0)), float(tail.mean()) * 0.1, 1.0)
    return forecast, spread, "tendencia_lineal"


def prediccion(meses: int, categoria: str | None, producto_id: str | None) -> dict[str, Any]:
    key = ("prediccion", meses, categoria, producto_id)
    cached = _cache_get(key)
    if cached is not None:
        return cached
    frame = _filtered_sales(categoria, producto_id)
    now = pd.Timestamp.now().to_period("M")
    months = pd.period_range(end=now - 1, periods=12, freq="M")
    if not frame.empty:
        hist = frame.copy()
        hist["mes"] = pd.to_datetime(hist["mes"]).dt.to_period("M")
        monthly = hist.groupby("mes")["ingreso"].sum().reindex(months, fill_value=0)
        centers, lows, highs, model, few = _forecast(monthly, meses)
        product_monthly = hist.groupby(["producto_id", "producto", "categoria", "mes"], as_index=False).agg(unidades=("unidades", "sum"), ingreso=("ingreso", "sum"))
        product_totals = []
        for (pid, name, cat), group in product_monthly.groupby(["producto_id", "producto", "categoria"]):
            series = group.set_index("mes")["ingreso"].reindex(months, fill_value=0)
            predicted, _, _, _, _ = _forecast(series, meses)
            product_totals.append({"producto_id": str(pid), "producto": name, "categoria": cat, "ingreso_estimado": round(sum(predicted), 2), "ultimo_ingreso": float(series.iloc[-1])})
    else:
        monthly = pd.Series(0.0, index=months)
        centers, lows, highs, model, few = _forecast(monthly, meses)
        product_totals = []
    result = {
        "meses": meses,
        "modelo": model,
        "pocos_datos": few,
        "historico": [{"mes": str(month), "ingreso": round(float(monthly.loc[month]), 2)} for month in months],
        "proyeccion": [
            {"mes": str(now + i), "ingreso_estimado": round(centers[i], 2), "limite_inferior": round(lows[i], 2), "limite_superior": round(highs[i], 2)}
            for i in range(meses)
        ],
        "productos": sorted(product_totals, key=lambda p: p["ingreso_estimado"], reverse=True),
    }
    _cache_set(key, result)
    return result


def resumen(
    meses: int,
    categoria: str | None = None,
    producto_id: str | None = None,
) -> dict[str, Any]:
    key = ("resumen", meses, categoria, producto_id)
    cached = _cache_get(key)
    if cached is not None:
        return cached
    frame = _filtered_sales(categoria, producto_id)
    forecast = prediccion(meses, categoria, producto_id)
    historical = frame.copy()
    if not historical.empty:
        historical["mes"] = pd.to_datetime(historical["mes"]).dt.to_period("M")
    end = pd.Timestamp.now().to_period("M") - 1
    previous_period = pd.period_range(end=end - meses, periods=meses, freq="M")
    monthly = historical.groupby("mes")["ingreso"].sum() if not historical.empty else pd.Series(dtype=float)
    previous = float(sum(monthly.get(m, 0.0) for m in previous_period))
    estimated = sum(row["ingreso_estimado"] for row in forecast["proyeccion"])
    change = ((estimated - previous) / previous * 100) if previous else None
    trend = "estable" if change is None or abs(change) < 5 else ("alza" if change > 0 else "baja")
    products = forecast["productos"]
    declining = [
        p for p in products
        if p["ultimo_ingreso"] > 0 and p["ultimo_ingreso"] > p["ingreso_estimado"] / meses
    ]
    stock = _load_stock()
    restock = [item for item in stock if item["stock"] <= item["stock_minimo"] and any(p["producto_id"] == item["producto_id"] and p["ingreso_estimado"] > 0 for p in products)]
    products_below_minimum = sum(item["stock"] < item["stock_minimo"] for item in stock)
    result = {
        "meses": meses,
        "tendencia": trend,
        "variacion_porcentual": round(change, 2) if change is not None else None,
        "ingreso_total_estimado": round(estimated, 2),
        "periodo_anterior_ingreso": round(previous, 2),
        "pocos_datos": forecast["pocos_datos"],
        "productos_bajo_minimo": products_below_minimum,
        "top_productos_esperados": [{"producto_id": p["producto_id"], "producto": p["producto"], "ingreso_estimado": p["ingreso_estimado"]} for p in products[:5]],
        "productos_en_baja": [{"producto_id": p["producto_id"], "producto": p["producto"]} for p in declining[:5]],
        "productos_a_reponer": restock[:10],
    }
    _cache_set(key, result)
    return result


def _query_stock() -> list[dict[str, Any]]:
    try:
        engine = _engine_for_db()
        with engine.connect() as connection:
            with connection.begin():
                connection.execute(text("SET TRANSACTION READ ONLY"))
                frame = pd.read_sql_query(text("""
                    SELECT p.codigo_producto AS producto_id, p.nombre AS producto,
                           SUM(v.stock)::integer AS stock,
                           SUM(v.stock_minimo)::integer AS stock_minimo
                    FROM productos p JOIN variantes_producto v ON v.codigo_producto = p.codigo_producto
                    WHERE p.activo = true GROUP BY p.codigo_producto, p.nombre
                """), connection)
        return frame.to_dict(orient="records")
    except Exception as exc:
        raise HTTPException(status_code=503, detail="No se pudo consultar el inventario") from exc


def _load_stock() -> list[dict[str, Any]]:
    key = ("_stock_snapshot",)
    cached = _cache_get(key)
    if cached is not None:
        return cached
    with _stock_lock:
        cached = _cache_get(key)
        if cached is not None:
            return cached
        stock = _query_stock()
        _cache_set(key, stock)
        return stock
