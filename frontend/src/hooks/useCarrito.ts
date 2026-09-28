import { useCallback, useEffect, useState } from 'react';
import type { Producto } from '../productos/Productos';

export interface ItemCarrito {
  idVariante: number;
  codigoProducto: string;
  nombre: string;
  precio: number;
  imagen: string;
  talla: string;
  color: string | null;
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
      const existente = actuales.find((item) => item.idVariante === producto.idVariante);
      if (existente) {
        if (existente.cantidad >= producto.stock) return actuales;
        return actuales.map((item) =>
          item.idVariante === producto.idVariante
            ? { ...item, stock: producto.stock, cantidad: item.cantidad + 1 }
            : item,
        );
      }
      if (producto.stock < 1) return actuales;
      return [
        ...actuales,
        {
          idVariante: producto.idVariante,
          codigoProducto: producto.codigoProducto,
          nombre: producto.nombre,
          precio: producto.precio,
          imagen: producto.imagen,
          talla: producto.talla,
          color: producto.color,
          stock: producto.stock,
          cantidad: 1,
        },
      ];
    });
  }, []);

  const sumarUno = useCallback((idVariante: number) => {
    setItems((actuales) =>
      actuales.map((item) =>
        item.idVariante === idVariante && item.cantidad < item.stock
          ? { ...item, cantidad: item.cantidad + 1 }
          : item,
      ),
    );
  }, []);

  const restarUno = useCallback((idVariante: number) => {
    setItems((actuales) =>
      actuales
        .map((item) => (item.idVariante === idVariante ? { ...item, cantidad: item.cantidad - 1 } : item))
        .filter((item) => item.cantidad > 0),
    );
  }, []);

  const actualizarCantidad = useCallback((idVariante: number, cantidad: number) => {
    setItems((actuales) => {
      if (!Number.isFinite(cantidad) || cantidad <= 0) {
        return actuales.filter((item) => item.idVariante !== idVariante);
      }
      return actuales.map((item) =>
        item.idVariante === idVariante
          ? { ...item, cantidad: Math.min(Math.floor(cantidad), item.stock) }
          : item,
      );
    });
  }, []);

  const eliminar = useCallback((idVariante: number) => {
    setItems((actuales) => actuales.filter((item) => item.idVariante !== idVariante));
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
