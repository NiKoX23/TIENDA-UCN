ALTER TABLE productos ADD COLUMN IF NOT EXISTS precio_tac integer;
ALTER TABLE productos ADD COLUMN IF NOT EXISTS imagen_url varchar(200);

INSERT INTO categorias (nombre) VALUES
    ('polerones'), ('accesorios'), ('papeleria')
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO productos (
    codigo_producto, id_categoria, nombre, descripcion, marca,
    costo_adquisicion, precio_venta, precio_tac, imagen_url
) VALUES
    ('POLERON-UCN', (SELECT id_categoria FROM categorias WHERE nombre = 'polerones'), 'Poler' || chr(243) || 'n UCN', 'Poler' || chr(243) || 'n oficial UCN', 'UCN', 21000, 24990, 21000, '/productos/poleron-ucn.png'),
    ('LAPIZ-COBRE', (SELECT id_categoria FROM categorias WHERE nombre = 'accesorios'), 'Lapicera de cobre', 'Lapicera de cobre UCN', 'UCN', 15000, 16000, 15000, '/productos/lapicera-cobre.png'),
    ('LIBRETA-UCN', (SELECT id_categoria FROM categorias WHERE nombre = 'papeleria'), 'Libreta UCN', 'Libreta institucional UCN', 'UCN', 5000, 5950, 5000, '/productos/libreta-ucn.png'),
    ('TOTE-BAG-UCN', (SELECT id_categoria FROM categorias WHERE nombre = 'accesorios'), 'Tote bag UCN', 'Bolsa reutilizable UCN', 'UCN', 6000, 6950, 6000, '/productos/tote-bag.png'),
    ('LLAVERO-UCENIN', (SELECT id_categoria FROM categorias WHERE nombre = 'accesorios'), 'Llavero UCENIN', 'Llavero UCENIN', 'UCN', 5000, 5950, 5000, '/productos/llavero-ucenin.png'),
    ('PELUCHE-UCN', (SELECT id_categoria FROM categorias WHERE nombre = 'accesorios'), 'Peluche UCN rosa', 'Peluche UCN color rosa', 'UCN', 10085, 12000, 10085, '/productos/peluche-ucn-rosa.png'),
    ('LLAVERO-MUSEO', (SELECT id_categoria FROM categorias WHERE nombre = 'accesorios'), 'Llavero Museo', 'Llavero del museo UCN', 'UCN', 2500, 2500, 2500, '/productos/llavero-museo.png')
ON CONFLICT (codigo_producto) DO UPDATE SET
    id_categoria = EXCLUDED.id_categoria,
    nombre = EXCLUDED.nombre,
    descripcion = EXCLUDED.descripcion,
    costo_adquisicion = EXCLUDED.costo_adquisicion,
    precio_venta = EXCLUDED.precio_venta,
    precio_tac = EXCLUDED.precio_tac,
    imagen_url = EXCLUDED.imagen_url;

INSERT INTO variantes_producto (codigo_producto, talla, color, sku, stock, stock_minimo)
VALUES
    ('POLERON-UCN', 'unica', NULL, 'POLERON-UCN-UNI', 56, 5),
    ('LAPIZ-COBRE', 'unica', NULL, 'LAPIZ-COBRE-UNI', 36, 5),
    ('LIBRETA-UCN', 'unica', NULL, 'LIBRETA-UCN-UNI', 58, 5),
    ('TOTE-BAG-UCN', 'unica', NULL, 'TOTE-BAG-UCN-UNI', 29, 5),
    ('LLAVERO-UCENIN', 'unica', NULL, 'LLAVERO-UCENIN-UNI', 3, 2),
    ('PELUCHE-UCN', 'unica', 'rosa', 'PELUCHE-UCN-ROSA', 13, 3),
    ('LLAVERO-MUSEO', 'unica', NULL, 'LLAVERO-MUSEO-UNI', 66, 5)
ON CONFLICT (sku) DO UPDATE SET
    stock = EXCLUDED.stock,
    stock_minimo = EXCLUDED.stock_minimo;