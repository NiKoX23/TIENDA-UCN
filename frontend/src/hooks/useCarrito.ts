import { useCallback, useEffect, useState } from 'react';
import type { Producto } from '../productos/Productos';
import { parsePrecioCLP } from '../utils/precio';

export interface ItemCarrito {
  nombre: string;
  precio: number;
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

/**
 * Maneja el estado del carrito de compras y lo persiste en localStorage,
 * separado por usuario (uid), para que el progreso no se pierda al recargar.
 */
export function useCarrito(uid?: number) {
  const [items, setItems] = useState<ItemCarrito[]>(() => cargarCarrito(uid));

  // Cuando cambia el usuario (login/logout/cambio de cuenta), recarga su carrito.
  useEffect(() => {
    setItems(cargarCarrito(uid));
  }, [uid]);

  // Persiste cada cambio en localStorage bajo la clave del usuario actual.
  useEffect(() => {
    const clave = claveCarrito(uid);
    if (!clave) return;
    localStorage.setItem(clave, JSON.stringify(items));
  }, [items, uid]);

  const agregar = useCallback((producto: Producto) => {
    setItems((actuales) => {
      const existente = actuales.find((item) => item.nombre === producto.nombre);
      if (existente) {
        return actuales.map((item) =>
          item.nombre === producto.nombre ? { ...item, cantidad: item.cantidad + 1 } : item,
        );
      }
      return [
        ...actuales,
        { nombre: producto.nombre, precio: parsePrecioCLP(producto.precio), cantidad: 1 },
      ];
    });
  }, []);

  const sumarUno = useCallback((nombre: string) => {
    setItems((actuales) =>
      actuales.map((item) => (item.nombre === nombre ? { ...item, cantidad: item.cantidad + 1 } : item)),
    );
  }, []);

  const restarUno = useCallback((nombre: string) => {
    setItems((actuales) =>
      actuales
        .map((item) => (item.nombre === nombre ? { ...item, cantidad: item.cantidad - 1 } : item))
        .filter((item) => item.cantidad > 0),
    );
  }, []);

  const actualizarCantidad = useCallback((nombre: string, cantidad: number) => {
    setItems((actuales) => {
      if (!Number.isFinite(cantidad) || cantidad <= 0) {
        return actuales.filter((item) => item.nombre !== nombre);
      }
      return actuales.map((item) =>
        item.nombre === nombre ? { ...item, cantidad: Math.floor(cantidad) } : item,
      );
    });
  }, []);

  const eliminar = useCallback((nombre: string) => {
    setItems((actuales) => actuales.filter((item) => item.nombre !== nombre));
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
