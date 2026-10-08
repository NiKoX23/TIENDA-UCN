ALTER TABLE productos ADD COLUMN IF NOT EXISTS precio_tac integer;
ALTER TABLE productos ADD COLUMN IF NOT EXISTS imagen_url varchar(200);
ALTER TABLE variantes_producto ADD COLUMN IF NOT EXISTS imagen_url varchar(200);

CREATE OR REPLACE FUNCTION normalizar_talla_variante()
RETURNS trigger AS $$
DECLARE
    categoria_nombre varchar(50);
BEGIN
    SELECT lower(c.nombre) INTO categoria_nombre
    FROM productos p
    JOIN categorias c ON c.id_categoria = p.id_categoria
    WHERE p.codigo_producto = NEW.codigo_producto;

    IF categoria_nombre NOT IN ('poleron', 'polerones', 'polera', 'poleras', 'pantalon', 'pantalones', 'vestuario', 'ropa') THEN
        NEW.talla := 'unica';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION normalizar_tallas_por_categoria()
RETURNS trigger AS $$
DECLARE
    categoria_nombre varchar(50);
BEGIN
    SELECT lower(nombre) INTO categoria_nombre FROM categorias WHERE id_categoria = NEW.id_categoria;
    IF categoria_nombre NOT IN ('poleron', 'polerones', 'polera', 'poleras', 'pantalon', 'pantalones', 'vestuario', 'ropa') THEN
        UPDATE variantes_producto SET talla = 'unica' WHERE codigo_producto = NEW.codigo_producto;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS variantes_sin_talla_fuera_de_ropa ON variantes_producto;
CREATE TRIGGER variantes_sin_talla_fuera_de_ropa
BEFORE INSERT OR UPDATE OF codigo_producto, talla ON variantes_producto
FOR EACH ROW EXECUTE FUNCTION normalizar_talla_variante();

DROP TRIGGER IF EXISTS producto_categoria_sin_tallas ON productos;
CREATE TRIGGER producto_categoria_sin_tallas
AFTER UPDATE OF id_categoria ON productos
FOR EACH ROW EXECUTE FUNCTION normalizar_tallas_por_categoria();

UPDATE variantes_producto v SET talla = 'unica'
FROM productos p
JOIN categorias c ON c.id_categoria = p.id_categoria
WHERE p.codigo_producto = v.codigo_producto
  AND lower(c.nombre) NOT IN ('poleron', 'polerones', 'polera', 'poleras', 'pantalon', 'pantalones', 'vestuario', 'ropa')
  AND v.talla <> 'unica';

INSERT INTO categorias (nombre) VALUES
    ('polerones'), ('accesorios'), ('papeleria')
ON CONFLICT (nombre) DO NOTHING;

UPDATE productos SET activo = false
WHERE codigo_producto = 'POLERON-UCN';

INSERT INTO productos (
    codigo_producto, id_categoria, nombre, descripcion, marca,
    costo_adquisicion, precio_venta, precio_tac, imagen_url
) VALUES
    ('POLERON-TALLAS', (SELECT id_categoria FROM categorias WHERE nombre = 'polerones'), 'Poler' || chr(243) || 'n UCN', 'Polerones UCN Coquimbo en distintos colores', 'UCN', 21000, 24990, 21000, '/productos/poleron-negro.png'),
    ('LAPIZ-COBRE', (SELECT id_categoria FROM categorias WHERE nombre = 'accesorios'), 'Lapicera de cobre', 'Lapicera de cobre UCN', 'UCN', 15000, 16000, 15000, '/productos/lapicera-cobre.png'),
    ('LIBRETA-UCN', (SELECT id_categoria FROM categorias WHERE nombre = 'papeleria'), 'Libreta UCN', 'Libreta institucional UCN', 'UCN', 5000, 5950, 5000, '/productos/libreta-ucn.png'),
    ('TOTE-BAG-UCN', (SELECT id_categoria FROM categorias WHERE nombre = 'accesorios'), 'Tote bag UCN', 'Bolsa reutilizable UCN', 'UCN', 6000, 6950, 6000, '/productos/tote-bag.png'),
    ('LLAVERO-UCENIN', (SELECT id_categoria FROM categorias WHERE nombre = 'accesorios'), 'Llavero UCENIN', 'Llavero UCENIN', 'UCN', 5000, 5950, 5000, '/productos/llavero-ucenin.png'),
    ('PELUCHE-UCN', (SELECT id_categoria FROM categorias WHERE nombre = 'accesorios'), 'Peluche UCN rosa', 'Peluche UCN color rosa', 'UCN', 10085, 12000, 10085, '/productos/peluche-ucn-rosa.png'),
    ('LL-TORTUGA', (SELECT id_categoria FROM categorias WHERE nombre = 'accesorios'), 'Llavero Tortuga', 'Llavero con diseño de tortuga', 'UCN', 2500, 2500, 2500, '/productos/llavero-tortuga-verde.png'),
    ('LL-ESTRELLA', (SELECT id_categoria FROM categorias WHERE nombre = 'accesorios'), 'Llavero Estrella', 'Llavero con diseño de estrella', 'UCN', 2500, 2500, 2500, '/productos/llavero-estrella-amarillo.png'),
    ('LL-CANGREJO', (SELECT id_categoria FROM categorias WHERE nombre = 'accesorios'), 'Llavero Cangrejo', 'Llavero con diseño de cangrejo', 'UCN', 2500, 2500, 2500, '/productos/llavero-cangrejo-rojo.png'),
    ('LL-SOLDEMAR', (SELECT id_categoria FROM categorias WHERE nombre = 'accesorios'), 'Llavero Soldemar', 'Llavero Soldemar', 'UCN', 2500, 2500, 2500, '/productos/llavero-soldemar-negro.png')
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
    ('LAPIZ-COBRE', 'unica', NULL, 'LAPIZ-COBRE-UNI', 36, 5),
    ('LIBRETA-UCN', 'unica', NULL, 'LIBRETA-UCN-UNI', 58, 5),
    ('TOTE-BAG-UCN', 'unica', NULL, 'TOTE-BAG-UCN-UNI', 29, 5),
    ('LLAVERO-UCENIN', 'unica', NULL, 'LLAVERO-UCENIN-UNI', 3, 2),
    ('PELUCHE-UCN', 'unica', 'rosa', 'PELUCHE-UCN-ROSA', 13, 3),
    ('LL-TORTUGA', 'unica', 'verde', 'TORTUGA-VERDE', 0, 2),
    ('LL-TORTUGA', 'unica', 'amarillo', 'TORTUGA-AMARILLO', 0, 2),
    ('LL-ESTRELLA', 'unica', 'amarillo', 'ESTRELLA-AMARILLO', 0, 2),
    ('LL-ESTRELLA', 'unica', 'rosa', 'ESTRELLA-ROSA', 0, 2),
    ('LL-CANGREJO', 'unica', 'rojo', 'CANGREJO-ROJO', 0, 2),
    ('LL-SOLDEMAR', 'unica', 'negro', 'SOLDEMAR-NEGRO', 0, 2)
ON CONFLICT (sku) DO UPDATE SET
    stock = EXCLUDED.stock,
    stock_minimo = EXCLUDED.stock_minimo;

INSERT INTO variantes_producto (codigo_producto, talla, color, sku, stock, stock_minimo, imagen_url)
VALUES
    ('POLERON-TALLAS', 'M', 'negro', 'POL-TN-M', 1, 0, '/productos/poleron-negro.png'),
    ('POLERON-TALLAS', 'L', 'negro', 'POL-TN-L', 13, 0, '/productos/poleron-negro.png'),
    ('POLERON-TALLAS', 'L', 'azul', 'POL-TA-L', 12, 0, '/productos/poleron-azul.png')
ON CONFLICT (sku) DO UPDATE SET
    codigo_producto = EXCLUDED.codigo_producto,
    talla = EXCLUDED.talla,
    color = EXCLUDED.color,
    stock = EXCLUDED.stock,
    stock_minimo = EXCLUDED.stock_minimo,
    imagen_url = EXCLUDED.imagen_url;

UPDATE variantes_producto SET imagen_url = CASE sku
    WHEN 'TORTUGA-VERDE' THEN '/productos/llavero-tortuga-verde.png'
    WHEN 'TORTUGA-AMARILLO' THEN '/productos/llavero-tortuga-amarillo.png'
    WHEN 'ESTRELLA-AMARILLO' THEN '/productos/llavero-estrella-amarillo.png'
    WHEN 'ESTRELLA-ROSA' THEN '/productos/llavero-estrella-rosa.png'
    WHEN 'CANGREJO-ROJO' THEN '/productos/llavero-cangrejo-rojo.png'
    WHEN 'SOLDEMAR-NEGRO' THEN '/productos/llavero-soldemar-negro.png'
    ELSE imagen_url END
WHERE sku IN ('TORTUGA-VERDE', 'TORTUGA-AMARILLO', 'ESTRELLA-AMARILLO',
    'ESTRELLA-ROSA', 'CANGREJO-ROJO', 'SOLDEMAR-NEGRO');

UPDATE productos SET activo = false
WHERE codigo_producto = 'LLAVERO-MUSEO';
