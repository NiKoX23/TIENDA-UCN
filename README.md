# Tienda UCN

Aplicación web para la venta y reserva de productos oficiales de la Universidad Católica del Norte. Permite consultar el catálogo, comprar productos, reservar unidades para retiro y gestionar ventas e inventario.

## Funcionalidades

- Catálogo de productos con variantes, tallas, colores y disponibilidad.
- Carrito de compras y lista de favoritos.
- Registro e inicio de sesión con correo y contraseña. El acceso con Google está disponible cuando se configuran sus credenciales.
- Reservas para retiro en sede, con seguimiento de estado y consulta del historial personal.
- Panel de administración para inventario, ventas, documentos TAC, reservas y usuarios.
- Exportación de información a Excel.
- Indicadores y análisis de ventas e inventario.

## Componentes

- `frontend`: aplicación de cliente construida con React, TypeScript y Vite.
- `backend`: API construida con NestJS y TypeScript.
- `analitica`: servicio de análisis construido con FastAPI.
- `postgres`: base de datos PostgreSQL.
- `nginx`: punto de entrada para la aplicación, la API y el servicio de análisis.

Los servicios se coordinan mediante Podman Compose. La aplicación queda disponible en `http://localhost`.

## Requisitos

- Podman y Podman Compose.
- Un archivo `.env` en la raíz del proyecto con la configuración de base de datos y autenticación.

## Configuración

El archivo `.env` debe definir:

| Variable | Uso |
| --- | --- |
| `DB_NAME` | Nombre de la base de datos |
| `DB_USER` | Usuario de PostgreSQL |
| `DB_PASSWORD` | Contraseña de PostgreSQL |
| `JWT_SECRET` | Clave usada para firmar las sesiones |
| `CORS_ORIGIN` | Origen autorizado para las solicitudes del backend |

`DB_PORT` usa `5432` por defecto y `BACKEND_PORT` usa `3000`. Para habilitar el inicio de sesión con Google, se deben definir también `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET`.

## Base de datos

Al crear una base de datos nueva, el servicio de PostgreSQL carga `docs/DB.sql` y `docs/catalogo.sql`. Estos scripts de inicialización se ejecutan cuando el volumen de datos está vacío; no se vuelven a aplicar automáticamente sobre una base existente.

El servicio PostgreSQL carga `backend/src/reservas/reserva-schema.sql` automáticamente al crear una base nueva. En un volumen Podman existente, los scripts de inicialización no se repiten. Desde PowerShell, en la raíz del proyecto y con el contenedor `tienda-db` activo, aplica el esquema así:

```powershell
podman cp .\backend\src\reservas\reserva-schema.sql tienda-db:/tmp/reserva-schema.sql
podman exec tienda-db sh -c 'PGPASSWORD="$POSTGRES_PASSWORD" psql -h 127.0.0.1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1 -f /tmp/reserva-schema.sql'
```

La migración `docs/vendedor_responsable_facturas.sql` también se aplica automáticamente al crear una base nueva. En un volumen existente, aplícala después del esquema de reservas:

```powershell
podman cp .\docs\vendedor_responsable_facturas.sql tienda-db:/tmp/vendedor-responsable-facturas.sql
podman exec tienda-db sh -c 'PGPASSWORD="$POSTGRES_PASSWORD" psql -h 127.0.0.1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1 -f /tmp/vendedor-responsable-facturas.sql'
podman compose restart backend
podman compose logs --tail=100 backend
```

## Ejecución

Desde la raíz del repositorio:

```bash
podman-compose -f podman-compose.yml up --build -d
```

Para consultar los registros:

```bash
podman-compose -f podman-compose.yml logs -f
```

La aplicación se sirve en `http://localhost`. Nginx enruta las solicitudes de `/api` al backend y las solicitudes de `/prediccion` al servicio de análisis.

## Desarrollo y validación

El frontend y el backend se pueden ejecutar por separado desde sus directorios, después de instalar sus dependencias:

```bash
cd frontend
npm install
npm run dev
```

```bash
cd backend
npm install
npm run start:dev
```

Para compilar el frontend:

```bash
cd frontend
npm run build
```

Para compilar y ejecutar las pruebas unitarias del backend:

```bash
cd backend
npm run build
npm test
```
