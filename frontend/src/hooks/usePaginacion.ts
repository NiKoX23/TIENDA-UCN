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
  irA: (pagina: number) => void;
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
  const [estado, setEstado] = useState({ pagina: 1, clave });

  const total = items.length;
  const totalPaginas = Math.max(1, Math.ceil(total / porPagina));
  const solicitada = estado.clave === clave ? estado.pagina : 1;
  const pagina = Math.min(Math.max(1, solicitada), totalPaginas);

  const visibles = useMemo(
    () => items.slice((pagina - 1) * porPagina, pagina * porPagina),
    [items, pagina, porPagina],
  );

  const desde = total === 0 ? 0 : (pagina - 1) * porPagina + 1;
  const hasta = Math.min(pagina * porPagina, total);

  const irA = (destino: number) =>
    setEstado({ pagina: Math.min(Math.max(1, destino), totalPaginas), clave });

  return { pagina, totalPaginas, total, desde, hasta, visibles, irA };
}
