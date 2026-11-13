import { useMemo, useState } from 'react';

export interface ResultadoPaginacion<T> {
  /** Página actual (1 en adelante), ya acotada al rango válido. */
  pagina: number;
  totalPaginas: number;
  total: number;
  /** Posición (1 en adelante) del primer y último elemento visibles; 0 si no hay datos. */
  desde: number;
  hasta: number;
  visibles: T[];
  mostrarTodos: boolean;
  irA: (pagina: number) => void;
  alternarMostrarTodos: () => void;
}

/**
 * Paginación en el cliente.
 * `reiniciarCon`: valores (filtros, búsqueda, orden…) que al cambiar devuelven la lista a la página 1.
 * Se resuelve al renderizar, sin efectos, para evitar un primer render con la página vieja.
 */
export function usePaginacion<T>(
  items: readonly T[],
  porPagina: number,
  reiniciarCon: ReadonlyArray<string | number | boolean | null | undefined> = [],
): ResultadoPaginacion<T> {
  const clave = reiniciarCon.join('|');
  const [estado, setEstado] = useState({ pagina: 1, clave, mostrarTodos: false });

  const total = items.length;
  const mostrarTodos = estado.clave === clave && estado.mostrarTodos;
  const totalPaginas = mostrarTodos ? 1 : Math.max(1, Math.ceil(total / porPagina));
  const solicitada = mostrarTodos || estado.clave !== clave ? 1 : estado.pagina;
  const pagina = Math.min(Math.max(1, solicitada), totalPaginas);

  const visibles = useMemo(
    () => mostrarTodos ? [...items] : items.slice((pagina - 1) * porPagina, pagina * porPagina),
    [items, mostrarTodos, pagina, porPagina],
  );

  const desde = total === 0 ? 0 : mostrarTodos ? 1 : (pagina - 1) * porPagina + 1;
  const hasta = mostrarTodos ? total : Math.min(pagina * porPagina, total);

  const irA = (destino: number) =>
    setEstado({ pagina: Math.min(Math.max(1, destino), totalPaginas), clave, mostrarTodos: false });
  const alternarMostrarTodos = () =>
    setEstado((actual) => ({
      pagina: 1,
      clave,
      mostrarTodos: !(actual.clave === clave && actual.mostrarTodos),
    }));

  return { pagina, totalPaginas, total, desde, hasta, visibles, mostrarTodos, irA, alternarMostrarTodos };
}
