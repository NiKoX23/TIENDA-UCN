ALTER TABLE productos ADD COLUMN IF NOT EXISTS precio_tac integer;
ALTER TABLE productos ADD COLUMN IF NOT EXISTS imagen_url varchar(200);
ALTER TABLE variantes_producto ADD COLUMN IF NOT EXISTS imagen_url varchar(200);
ALTER TABLE documentos_tac ADD COLUMN IF NOT EXISTS responsable varchar(50);
ALTER TABLE variantes_producto ALTER COLUMN sku TYPE varchar(30);

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

-- Catálogo sincronizado con docs/Productos.xlsx (hoja Inventario).
INSERT INTO productos (codigo_producto, id_categoria, nombre, descripcion, marca, costo_adquisicion, precio_venta, precio_tac, imagen_url) VALUES
    ('POLERON-TALLAS',(SELECT id_categoria FROM categorias WHERE nombre = 'polerones'),'Polerón UCN','Polerones UCN Coquimbo en distintos colores','UCN',21000,24990,21000,'/productos/poleron-negro.png'),
    ('LAPIZ-COBRE',(SELECT id_categoria FROM categorias WHERE nombre = 'accesorios'),'Lapicera de cobre','Lapicera de cobre UCN','UCN',15000,16000,15000,'/productos/lapicera-cobre.png'),
    ('LIBRETA-UCN',(SELECT id_categoria FROM categorias WHERE nombre = 'papeleria'),'Libreta UCN','Libreta institucional UCN','UCN',5000,5950,5000,'/productos/libreta-ucn.png'),
    ('TOTE-BAG-UCN',(SELECT id_categoria FROM categorias WHERE nombre = 'accesorios'),'Tote bag UCN','Bolsa reutilizable UCN','UCN',6000,6950,6000,'/productos/tote-bag.png'),
    ('LLAVERO-UCENIN',(SELECT id_categoria FROM categorias WHERE nombre = 'accesorios'),'Llavero UCENIN','Llavero UCENIN','UCN',5000,5950,5000,'/productos/llavero-ucenin.png'),
    ('PELUCHE-UCN',(SELECT id_categoria FROM categorias WHERE nombre = 'accesorios'),'Peluche UCN rosa','Peluche UCN color rosa','UCN',10085,12000,10085,'/productos/peluche-ucn-rosa.png'),
    ('LL-TORTUGA',(SELECT id_categoria FROM categorias WHERE nombre = 'accesorios'),'Llavero Tortuga','Llavero con diseño de tortuga','UCN',2500,2500,2500,NULL),
    ('LL-ESTRELLA',(SELECT id_categoria FROM categorias WHERE nombre = 'accesorios'),'Llavero Estrella','Llavero con diseño de estrella','UCN',2500,2500,2500,NULL),
    ('LL-CANGREJO',(SELECT id_categoria FROM categorias WHERE nombre = 'accesorios'),'Llavero Cangrejo','Llavero con diseño de cangrejo','UCN',2500,2500,2500,NULL),
    ('LL-SOLDEMAR',(SELECT id_categoria FROM categorias WHERE nombre = 'accesorios'),'Llavero Soldemar','Llavero Soldemar','UCN',2500,2500,2500,NULL),
    ('LL-PEZ-BALLESTA',(SELECT id_categoria FROM categorias WHERE nombre = 'accesorios'),'Llavero Pez ballesta','Llavero con diseño de pez ballesta','UCN',2500,2500,2500,NULL),
    ('LL-GAVIOTA',(SELECT id_categoria FROM categorias WHERE nombre = 'accesorios'),'Llavero Gaviota','Llavero con diseño de gaviota','UCN',2500,2500,2500,NULL),
    ('LL-CACHALOTE',(SELECT id_categoria FROM categorias WHERE nombre = 'accesorios'),'Llavero Cachalote','Llavero con diseño de cachalote','UCN',2500,2500,2500,NULL),
    ('LL-ERM-CANGREJO',(SELECT id_categoria FROM categorias WHERE nombre = 'accesorios'),'Llavero Cangrejo ermitaño','Llavero con diseño de cangrejo ermitaño','UCN',2500,2500,2500,NULL),
    ('LL-PINGUINO',(SELECT id_categoria FROM categorias WHERE nombre = 'accesorios'),'Llavero Pingüino','Llavero con diseño de pingüino','UCN',2500,2500,2500,NULL),
    ('LL-TIBURON',(SELECT id_categoria FROM categorias WHERE nombre = 'accesorios'),'Llavero Tiburón','Llavero con diseño de tiburón','UCN',2500,2500,2500,NULL)
ON CONFLICT (codigo_producto) DO UPDATE SET id_categoria=EXCLUDED.id_categoria,nombre=EXCLUDED.nombre,descripcion=EXCLUDED.descripcion,costo_adquisicion=EXCLUDED.costo_adquisicion,precio_venta=EXCLUDED.precio_venta,precio_tac=EXCLUDED.precio_tac,imagen_url=EXCLUDED.imagen_url,activo=true;

INSERT INTO variantes_producto (codigo_producto,talla,color,sku,stock,stock_minimo,imagen_url) VALUES
    ('POLERON-TALLAS','S','negro','POL-TN-S',0,0,'/productos/poleron-negro.png'),
    ('POLERON-TALLAS','M','negro','POL-TN-M',2,0,'/productos/poleron-negro.png'),
    ('POLERON-TALLAS','L','negro','POL-TN-L',19,0,'/productos/poleron-negro.png'),
    ('POLERON-TALLAS','XL','negro','POL-TN-XL',6,0,'/productos/poleron-negro.png'),
    ('POLERON-TALLAS','XXL','negro','POL-TN-XXL',0,0,'/productos/poleron-negro.png'),
    ('POLERON-TALLAS','S','azul','POL-TA-S',0,0,'/productos/poleron-azul.png'),
    ('POLERON-TALLAS','M','azul','POL-TA-M',1,0,'/productos/poleron-azul.png'),
    ('POLERON-TALLAS','L','azul','POL-TA-L',18,0,'/productos/poleron-azul.png'),
    ('POLERON-TALLAS','XL','azul','POL-TA-XL',5,0,'/productos/poleron-azul.png'),
    ('POLERON-TALLAS','XXL','azul','POL-TA-XXL',0,0,'/productos/poleron-azul.png'),
    ('LAPIZ-COBRE','unica',NULL,'LAPIZ-COBRE-UNI',24,5,'/productos/lapicera-cobre.png'),
    ('LIBRETA-UCN','unica',NULL,'LIBRETA-UCN-UNI',45,5,'/productos/libreta-ucn.png'),
    ('TOTE-BAG-UCN','unica',NULL,'TOTE-BAG-UCN-UNI',16,5,'/productos/tote-bag.png'),
    ('LLAVERO-UCENIN','unica',NULL,'LLAVERO-UCENIN-UNI',53,2,'/productos/llavero-ucenin.png'),
    ('PELUCHE-UCN','unica','rosa','PELUCHE-UCN-ROSA',1,3,'/productos/peluche-ucn-rosa.png'),
    ('LL-TORTUGA','unica','verde','TORTUGA-VERDE',5,2,'/productos/llavero-tortuga-verde.png'),
    ('LL-TORTUGA','unica','amarillo','TORTUGA-AMARILLO',0,2,'/productos/llavero-tortuga-amarillo.png'),
    ('LL-ESTRELLA','unica','amarillo','ESTRELLA-AMARILLO',0,2,'/productos/llavero-estrella-amarillo.png'),
    ('LL-ESTRELLA','unica','rosa','ESTRELLA-ROSA',8,2,'/productos/llavero-estrella-rosa.png'),
    ('LL-CANGREJO','unica','rojo','CANGREJO-ROJO',3,2,'/productos/llavero-cangrejo-rojo.png'),
    ('LL-SOLDEMAR','unica','negro','SOLDEMAR-NEGRO',7,2,'/productos/llavero-soldemar-negro.png'),
    ('LL-PEZ-BALLESTA','unica','negro','PEZ-BALLESTA-NEGRO',8,2,NULL),
    ('LL-GAVIOTA','unica','negro','GAVIOTA-NEGRO',9,2,NULL),
    ('LL-CACHALOTE','unica','negro','CACHALOTE-NEGRO',10,2,NULL),
    ('LL-ERM-CANGREJO','unica','negro','CANGREJO-ERMITANO-NEGRO',5,2,NULL),
    ('LL-PINGUINO','unica','negro','PINGUINO-NEGRO',5,2,NULL),
    ('LL-TIBURON','unica','negro','TIBURON-NEGRO',4,2,NULL)
ON CONFLICT (sku) DO UPDATE SET codigo_producto=EXCLUDED.codigo_producto,talla=EXCLUDED.talla,color=EXCLUDED.color,stock=EXCLUDED.stock,stock_minimo=EXCLUDED.stock_minimo,imagen_url=EXCLUDED.imagen_url;

INSERT INTO documentos_tac (
    n_tac, fecha, id_variante, cantidad, precio_tac, total, responsable,
    firma_comprador, firma_vendedor
) VALUES
    ('1', '2026-01-09', (SELECT id_variante FROM variantes_producto WHERE sku = 'LLAVERO-UCENIN-UNI'), 15, 5000, 75000, 'PAULA CAVIERES', 'Firmado', 'Firmado'),
    ('2', '2026-01-12', (SELECT id_variante FROM variantes_producto WHERE sku = 'LLAVERO-UCENIN-UNI'), 10, 5000, 50000, 'CAROLINA SALINAS', 'Firmado', 'Firmado'),
    ('3', '2026-03-19', (SELECT id_variante FROM variantes_producto WHERE sku = 'LIBRETA-UCN-UNI'), 3, 5000, 15000, 'CARLOS SOZA', 'Firmado', 'Firmado'),
    ('3', '2026-03-19', (SELECT id_variante FROM variantes_producto WHERE sku = 'LAPIZ-COBRE-UNI'), 3, 15000, 45000, 'CARLOS SOZA', 'Firmado', 'Firmado'),
    ('4', '2026-03-19', (SELECT id_variante FROM variantes_producto WHERE sku = 'PELUCHE-UCN-ROSA'), 19, 10085, 191615, 'GABRIELA LLEWELLYN', 'Pendiente', 'Pendiente'),
    ('5', '2026-05-12', (SELECT id_variante FROM variantes_producto WHERE sku = 'PELUCHE-UCN-ROSA'), 2, 10085, 20170, 'ALEJANDRA VEGA', 'Firmado', 'Firmado'),
    ('7', '2026-05-29', (SELECT id_variante FROM variantes_producto WHERE sku = 'LAPIZ-COBRE-UNI'), 1, 15000, 15000, 'LUIS LANAS', 'Firmado', 'Firmado'),
    ('8', '2026-06-22', (SELECT id_variante FROM variantes_producto WHERE sku = 'PELUCHE-UCN-ROSA'), 1, 10085, 10085, 'CRISTINA MARAMBIO', 'Firmado', 'Firmado'),
    ('9', '2026-06-22', (SELECT id_variante FROM variantes_producto WHERE sku = 'PELUCHE-UCN-ROSA'), 1, 10085, 10085, 'ALEJANDRA VEGA', 'Firmado', 'Firmado'),
    ('10', '2026-08-20', (SELECT id_variante FROM variantes_producto WHERE sku = 'LAPIZ-COBRE-UNI'), 2, 15000, 30000, 'JOHANNA ROJAS', 'Pendiente', 'Pendiente'),
    ('11', '2026-08-20', (SELECT id_variante FROM variantes_producto WHERE sku = 'TOTE-BAG-UCN-UNI'), 6, 6000, 36000, 'JOHANNA ROJAS', 'Pendiente', 'Pendiente'),
    ('12', '2026-09-04', (SELECT id_variante FROM variantes_producto WHERE sku = 'PELUCHE-UCN-ROSA'), 1, 10085, 10085, 'CAROLINA SALINAS', 'Pendiente', 'Pendiente'),
    ('13', '2026-09-04', (SELECT id_variante FROM variantes_producto WHERE sku = 'PELUCHE-UCN-ROSA'), 7, 10085, 70595, 'PAULA CAVIERES', 'Firmado', 'Firmado'),
    ('14', '2026-10-07', (SELECT id_variante FROM variantes_producto WHERE sku = 'LAPIZ-COBRE-UNI'), 5, 15000, 75000, 'CLAUDIA ZULOAGA', 'Pendiente', 'Pendiente'),
    ('14', '2026-10-07', (SELECT id_variante FROM variantes_producto WHERE sku = 'LLAVERO-UCENIN-UNI'), 5, 5000, 25000, 'CLAUDIA ZULOAGA', 'Pendiente', 'Pendiente'),
    ('15', '2026-10-07', (SELECT id_variante FROM variantes_producto WHERE sku = 'LLAVERO-UCENIN-UNI'), 3, 5000, 15000, 'MONICA CASTILLO', 'Pendiente', 'Pendiente');
