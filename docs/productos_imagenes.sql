UPDATE productos
SET imagen_url = '/productos/llavero-pez-ballesta.png'
WHERE codigo_producto = 'LL-PEZ-BALLESTA'
  AND (imagen_url IS NULL OR imagen_url = '/productos/sin-imagen.svg');

UPDATE variantes_producto
SET imagen_url = '/productos/llavero-pez-ballesta.png'
WHERE sku = 'PEZ-BALLESTA-NEGRO'
  AND (imagen_url IS NULL OR imagen_url = '/productos/sin-imagen.svg');

UPDATE productos
SET imagen_url = '/productos/llavero-gaviota.png'
WHERE codigo_producto = 'LL-GAVIOTA'
  AND (imagen_url IS NULL OR imagen_url = '/productos/sin-imagen.svg');

UPDATE variantes_producto
SET imagen_url = '/productos/llavero-gaviota.png'
WHERE sku = 'GAVIOTA-NEGRO'
  AND (imagen_url IS NULL OR imagen_url = '/productos/sin-imagen.svg');

UPDATE productos
SET imagen_url = '/productos/llavero-cachalote.png'
WHERE codigo_producto = 'LL-CACHALOTE'
  AND (imagen_url IS NULL OR imagen_url = '/productos/sin-imagen.svg');

UPDATE variantes_producto
SET imagen_url = '/productos/llavero-cachalote.png'
WHERE sku = 'CACHALOTE-NEGRO'
  AND (imagen_url IS NULL OR imagen_url = '/productos/sin-imagen.svg');

UPDATE productos
SET imagen_url = '/productos/llavero-cangrejo-ermitaño.png'
WHERE codigo_producto = 'LL-ERM-CANGREJO'
  AND (imagen_url IS NULL OR imagen_url = '/productos/sin-imagen.svg');

UPDATE variantes_producto
SET imagen_url = '/productos/llavero-cangrejo-ermitaño.png'
WHERE sku = 'CANGREJO-ERMITANO-NEGRO'
  AND (imagen_url IS NULL OR imagen_url = '/productos/sin-imagen.svg');

UPDATE productos
SET imagen_url = '/productos/llavero-pinguino.png'
WHERE codigo_producto = 'LL-PINGUINO'
  AND (imagen_url IS NULL OR imagen_url = '/productos/sin-imagen.svg');

UPDATE variantes_producto
SET imagen_url = '/productos/llavero-pinguino.png'
WHERE sku = 'PINGUINO-NEGRO'
  AND (imagen_url IS NULL OR imagen_url = '/productos/sin-imagen.svg');

UPDATE productos
SET imagen_url = '/productos/llavero-tiburon.png'
WHERE codigo_producto = 'LL-TIBURON'
  AND (imagen_url IS NULL OR imagen_url = '/productos/sin-imagen.svg');

UPDATE variantes_producto
SET imagen_url = '/productos/llavero-tiburon.png'
WHERE sku = 'TIBURON-NEGRO'
  AND (imagen_url IS NULL OR imagen_url = '/productos/sin-imagen.svg');
