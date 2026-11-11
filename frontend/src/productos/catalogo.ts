import type { Producto } from './Productos';

export interface ProductoCatalogo extends Producto {
  numeroVariantes: number;
}

export function agruparVariantesCatalogo(
  variantes: Producto[],
): ProductoCatalogo[] {
  const grupos = new Map<
    string,
    {
      producto: Producto;
      stockRepresentativo: number;
      stockTotal: number;
      numeroVariantes: number;
    }
  >();

  for (const variante of variantes) {
    const grupo = grupos.get(variante.codigoProducto);
    if (!grupo) {
      grupos.set(variante.codigoProducto, {
        producto: { ...variante },
        stockRepresentativo: variante.stock,
        stockTotal: variante.stock,
        numeroVariantes: 1,
      });
      continue;
    }

    const stockTotal = grupo.stockTotal + variante.stock;
    const productoRepresentativo =
      variante.stock > grupo.stockRepresentativo ? variante : grupo.producto;
    grupos.set(variante.codigoProducto, {
      producto: { ...productoRepresentativo, stock: stockTotal },
      stockRepresentativo: Math.max(grupo.stockRepresentativo, variante.stock),
      stockTotal,
      numeroVariantes: grupo.numeroVariantes + 1,
    });
  }

  return [...grupos.values()].map(({ producto, stockTotal, numeroVariantes }) => ({
    ...producto,
    stock: stockTotal,
    numeroVariantes,
  }));
}

export function descontarStockCatalogo(
  productos: ProductoCatalogo[],
  lineas: Array<{ codigoProducto: string; cantidad: number }>,
): ProductoCatalogo[] {
  const cantidades = new Map<string, number>();
  for (const linea of lineas) {
    cantidades.set(
      linea.codigoProducto,
      (cantidades.get(linea.codigoProducto) ?? 0) + linea.cantidad,
    );
  }

  return productos.map((producto) => ({
    ...producto,
    stock: Math.max(0, producto.stock - (cantidades.get(producto.codigoProducto) ?? 0)),
  }));
}
