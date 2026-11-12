CREATE TABLE IF NOT EXISTS reservas (
    id_reserva SERIAL PRIMARY KEY,
    codigo_reserva VARCHAR(30) UNIQUE NOT NULL,
    uid INTEGER NOT NULL REFERENCES usuarios(uid) ON DELETE RESTRICT,
    fecha_retiro DATE NOT NULL,
    bloque_horario VARCHAR(50),
    observaciones TEXT,
    estado VARCHAR(30) NOT NULL DEFAULT 'PENDIENTE'
        CHECK (estado IN ('PENDIENTE', 'LISTA_PARA_RETIRO', 'RETIRADA', 'CANCELADA', 'VENCIDA')),
    total INTEGER NOT NULL CHECK (total >= 0),
    fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS items_reserva (
    id_item SERIAL PRIMARY KEY,
    id_reserva INTEGER NOT NULL REFERENCES reservas(id_reserva) ON DELETE CASCADE,
    id_variante INTEGER NOT NULL REFERENCES variantes_producto(id_variante) ON DELETE RESTRICT,
    cantidad INTEGER NOT NULL CHECK (cantidad > 0),
    precio_unitario INTEGER NOT NULL CHECK (precio_unitario >= 0),
    subtotal INTEGER NOT NULL CHECK (subtotal >= 0)
);

CREATE INDEX IF NOT EXISTS idx_reservas_uid ON reservas(uid);
CREATE INDEX IF NOT EXISTS idx_reservas_estado ON reservas(estado);
CREATE INDEX IF NOT EXISTS idx_reservas_fecha_retiro ON reservas(fecha_retiro);
CREATE INDEX IF NOT EXISTS idx_items_reserva_id_reserva ON items_reserva(id_reserva);
