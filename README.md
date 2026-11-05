# TIENDA-UCN
Tienda sobre ventas de productos UCN

- rama actual: feat/paginación
- fuente de respaldo: Source Sans 3
- Nginx publica el puerto 80; la aplicación usa 5173 (frontend), 3000 (API), 8000 (analítica) y 5432 (PostgreSQL).
- El backend importa al iniciar las ventas de `docs/Productos.xlsx` una sola vez, agrupándolas por ID y fecha, sin modificar el stock.

<br><br>

### fragmento obtenido de la guía de implementación de claude:
## Decisiones tomadas (a confirmar con la Dirección)
- **Karmina Sans no se incorporó**: el PDF solo trae subconjuntos incrustados de la fuente y es tipografía licenciada. Se usa Source Sans 3 de respaldo. Cuando tengas los `.woff2` con licencia web, déjalos en `public/fonts/` y descomenta los `@font-face` en la línea 64 de `brand-vcm.css` (en nginx verifica que sirva `font/woff2`).
- **Tema oscuro** = fondo `#023359`, primario celeste `#00b0de`, acento naranja `#ffa829`. **Tema claro** = fondo blanco, superficies pastel `#ede7d8`, acento naranja, rojo para detalles.
- **Contraste**: el rojo `#f14e23` sobre blanco da ~3.6:1 de contraste, así que en tema claro el texto pequeño usa un rojo oscurecido, y los botones principales conviene hacerlos naranja con texto azul oscuro (≈6.7:1).
- **Amarillo del gradiente claro** (`#ffc83d`): el manual no da HEX; se estimó de la imagen.
- **Separación entre logos (2x)**: `x` se estimó en 0.45 × alto del logo; la zona de protección en 0.25 × alto. Hay que validarlo contra la página "Diagramación variables".
- **Radios**: reducidos (4/8/12 px) porque la identidad usa bloques rectos.
- **Espaciado**: el manual solo define la zona de protección del logo; se mantiene la escala de Tailwind (múltiplos de 4 px).
- **Figuras**: son una reconstrucción geométrica de las del manual. Si la Dirección entrega el set oficial en SVG, se reemplaza `assets/brand/*.svg`.
- **Logo vertical** (texto bajo el isotipo): aún no generado.