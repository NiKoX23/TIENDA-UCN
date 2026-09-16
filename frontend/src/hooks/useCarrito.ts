import { useCallback, useEffect, useState } from 'react';
import type { Producto } from '../productos/Productos';

export interface ItemCarrito {
  codigoProducto: string;
  nombre: string;
  precio: number;
  imagen: string;
  stock: number;
  cantidad: number;
}

function claveCarrito(uid?: number): string | null {
  return uid ? `carrito_${uid}` : null;
}

function cargarCarrito(uid?: number): ItemCarrito[] {
  const clave = claveCarrito(uid);
  if (!clave) return [];

  try {
    const guardado = localStorage.getItem(clave);
    return guardado ? (JSON.parse(guardado) as ItemCarrito[]) : [];
  } catch {
    return [];
  }
}

export function useCarrito(uid?: number) {
  const [items, setItems] = useState<ItemCarrito[]>(() => cargarCarrito(uid));

  useEffect(() => {
    setItems(cargarCarrito(uid));
  }, [uid]);

  useEffect(() => {
    const clave = claveCarrito(uid);
    if (!clave) return;
    localStorage.setItem(clave, JSON.stringify(items));
  }, [items, uid]);

  const agregar = useCallback((producto: Producto) => {
    setItems((actuales) => {
      const existente = actuales.find((item) => item.codigoProducto === producto.codigoProducto);
      if (existente) {
        if (existente.cantidad >= producto.stock) return actuales;
        return actuales.map((item) =>
          item.codigoProducto === producto.codigoProducto
            ? { ...item, stock: producto.stock, cantidad: item.cantidad + 1 }
            : item,
        );
      }
      if (producto.stock < 1) return actuales;
      return [
        ...actuales,
        {
          codigoProducto: producto.codigoProducto,
          nombre: producto.nombre,
          precio: producto.precio,
          imagen: producto.imagen,
          stock: producto.stock,
          cantidad: 1,
        },
      ];
    });
  }, []);

  const sumarUno = useCallback((codigoProducto: string) => {
    setItems((actuales) =>
      actuales.map((item) =>
        item.codigoProducto === codigoProducto && item.cantidad < item.stock
          ? { ...item, cantidad: item.cantidad + 1 }
          : item,
      ),
    );
  }, []);

  const restarUno = useCallback((codigoProducto: string) => {
    setItems((actuales) =>
      actuales
        .map((item) => (item.codigoProducto === codigoProducto ? { ...item, cantidad: item.cantidad - 1 } : item))
        .filter((item) => item.cantidad > 0),
    );
  }, []);

  const actualizarCantidad = useCallback((codigoProducto: string, cantidad: number) => {
    setItems((actuales) => {
      if (!Number.isFinite(cantidad) || cantidad <= 0) {
        return actuales.filter((item) => item.codigoProducto !== codigoProducto);
      }
      return actuales.map((item) =>
        item.codigoProducto === codigoProducto
          ? { ...item, cantidad: Math.min(Math.floor(cantidad), item.stock) }
          : item,
      );
    });
  }, []);

  const eliminar = useCallback((codigoProducto: string) => {
    setItems((actuales) => actuales.filter((item) => item.codigoProducto !== codigoProducto));
  }, []);

  const vaciar = useCallback(() => setItems([]), []);

  const cantidadTotal = items.reduce((suma, item) => suma + item.cantidad, 0);
  const total = items.reduce((suma, item) => suma + item.precio * item.cantidad, 0);

  return {
    items,
    agregar,
    sumarUno,
    restarUno,
    actualizarCantidad,
    eliminar,
    vaciar,
    cantidadTotal,
    total,
  };
}
