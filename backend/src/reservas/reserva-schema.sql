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

CREATE TABLE IF NOT EXISTS vendedores_biblioteca (
    id_vendedor SERIAL PRIMARY KEY,
    nombre VARCHAR(80) NOT NULL,
    uid INTEGER,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE vendedores_biblioteca
    ADD COLUMN IF NOT EXISTS uid INTEGER;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_vendedores_biblioteca_usuario'
          AND conrelid = 'vendedores_biblioteca'::regclass
    ) THEN
        ALTER TABLE vendedores_biblioteca
            ADD CONSTRAINT fk_vendedores_biblioteca_usuario
            FOREIGN KEY (uid)
            REFERENCES usuarios(uid)
            ON DELETE SET NULL;
    END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_vendedores_biblioteca_uid
    ON vendedores_biblioteca(uid)
    WHERE uid IS NOT NULL;

CREATE TABLE IF NOT EXISTS horarios_venta (
    id_horario SERIAL PRIMARY KEY,
    id_vendedor INTEGER NOT NULL
        REFERENCES vendedores_biblioteca(id_vendedor) ON DELETE RESTRICT,
    fecha DATE NOT NULL,
    hora_inicio TIME NOT NULL,
    hora_termino TIME NOT NULL,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_horarios_venta_rango CHECK (hora_termino > hora_inicio)
);

ALTER TABLE reservas
    ADD COLUMN IF NOT EXISTS id_horario INTEGER;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_reservas_horario_venta'
    ) THEN
        ALTER TABLE reservas
            ADD CONSTRAINT fk_reservas_horario_venta
            FOREIGN KEY (id_horario)
            REFERENCES horarios_venta(id_horario)
            ON DELETE SET NULL;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_reservas_uid ON reservas(uid);
CREATE INDEX IF NOT EXISTS idx_reservas_estado ON reservas(estado);
CREATE INDEX IF NOT EXISTS idx_reservas_fecha_retiro ON reservas(fecha_retiro);
CREATE INDEX IF NOT EXISTS idx_items_reserva_id_reserva ON items_reserva(id_reserva);
CREATE INDEX IF NOT EXISTS idx_horarios_venta_fecha_activo
    ON horarios_venta(fecha, activo);
CREATE INDEX IF NOT EXISTS idx_horarios_venta_vendedor_fecha
    ON horarios_venta(id_vendedor, fecha);
CREATE INDEX IF NOT EXISTS idx_reservas_id_horario ON reservas(id_horario);
