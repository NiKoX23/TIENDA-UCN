# API de analítica de ventas

La API conserva los endpoints operativos existentes y añade:

- `GET /analytics/ingresos?meses_hist=12&categoria=&producto_id=`
- `GET /analytics/prediccion?meses=3&categoria=&producto_id=`
- `GET /analytics/resumen?meses=3&categoria=&producto_id=`

Los tres requieren el JWT de la aplicación mediante cookie `access_token` o
`Authorization: Bearer`. Se autoriza únicamente `esAdmin: true` (claim emitida
por el backend actual).

## PostgreSQL de solo lectura

Configura en el entorno del contenedor `ANALYTICS_DB_USER` y
`ANALYTICS_DB_PASSWORD` con credenciales dedicadas. La API falla al iniciar la
consulta si no están configuradas y marca como de solo lectura cada transacción.
No reutilices `DB_USER` de la aplicación para estas credenciales.

Conéctate como propietario de la base y sustituye los valores de ejemplo para
crear y dar permisos al usuario (las credenciales se configuran por separado en
el entorno del servicio):

```sql
CREATE ROLE tienda_analytics LOGIN PASSWORD 'cambia-esta-clave';
GRANT CONNECT ON DATABASE tienda TO tienda_analytics;
GRANT USAGE ON SCHEMA public TO tienda_analytics;
GRANT SELECT ON facturas, salidas, variantes_producto, productos, categorias,
  documentos_tac TO tienda_analytics;
```

La consulta incluye facturas normales y ventas TAC con ambas firmas en estado
`Firmado`. Los TAC pendientes o rechazados no se consideran ventas. Las
reservas vencidas tampoco se incluyen: solo se consultan las salidas vinculadas
a facturas. Los parámetros de filtro se aplican en la API y no se insertan en
SQL dinámico. Los filtros de categoría y producto se aplican también al resumen;
la baja de un producto compara el promedio mensual proyectado con su último mes
con ventas.

Las respuestas de analítica se mantienen en memoria durante cinco minutos por
combinación de parámetros (configurable con `ANALYTICS_CACHE_SECONDS`). Se usa
Holt-Winters a partir de doce meses no nulos, tendencia lineal con menos datos y
promedio móvil cuando solo hay uno o dos meses; los intervalos se calculan con
la dispersión del histórico reciente. La bandera `pocos_datos` se activa si hay
menos de tres meses con ventas.
