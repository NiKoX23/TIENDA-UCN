import { useEffect, useRef, useState } from 'react';
import type { PaginaApi } from '../services/paginacion';
import { FILAS_POR_PAGINA_ADMIN } from '../utils/paginacion';

interface Opciones<F> {
    /** Filtros que se envían al servidor (sin la búsqueda). Cambiar cualquiera vuelve a la página 1. */
    filtros: F;
    /** Texto de búsqueda; se envía tras una breve pausa de escritura. */
    busqueda?: string;
    porPagina?: number;
    esperaMs?: number;
}

/**
 * Lista paginada en el servidor.
 * - Cambiar filtros o búsqueda vuelve a la página 1.
 * - Ignora respuestas antiguas si el usuario cambia de filtro mientras carga.
 * - Conserva la página anterior mientras llega la nueva (sin parpadeo).
 * - `recargar()` repite la consulta actual (p. ej. tras crear, editar o borrar).
 */
export function useListaPaginada<T, F extends object>(
    cargar: (parametros: F & { page: number; limit: number; q?: string }) => Promise<PaginaApi<T>>,
    { filtros, busqueda = '', porPagina = FILAS_POR_PAGINA_ADMIN, esperaMs = 300 }: Opciones<F>,
) {
    const [qEstable, setQEstable] = useState(busqueda.trim());
    useEffect(() => {
        const temporizador = window.setTimeout(() => setQEstable(busqueda.trim()), esperaMs);
        return () => window.clearTimeout(temporizador);
    }, [busqueda, esperaMs]);

    const clave = JSON.stringify([qEstable, filtros, porPagina]);
    const [estado, setEstado] = useState({ pagina: 1, clave });
    const pagina = estado.clave === clave ? estado.pagina : 1;

    const [version, setVersion] = useState(0);
    const [respuesta, setRespuesta] = useState<PaginaApi<T> | null>(null);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState<unknown>(null);

    const cargarRef = useRef(cargar);
    useEffect(() => {
        cargarRef.current = cargar;
    });

    useEffect(() => {
        let vigente = true;
        setCargando(true);
        cargarRef
            .current({ ...filtros, page: pagina, limit: porPagina, q: qEstable || undefined })
            .then((resultado) => {
                if (!vigente) return;
                setRespuesta(resultado);
                setError(null);
                // La página pedida quedó fuera de rango (p. ej. se borró su última fila): retrocede.
                if (resultado.data.length === 0 && resultado.total > 0 && resultado.page > resultado.totalPages) {
                    setEstado({ pagina: resultado.totalPages, clave });
                }
            })
            .catch((e: unknown) => {
                if (vigente) setError(e);
            })
            .finally(() => {
                if (vigente) setCargando(false);
            });
        return () => {
            vigente = false;
        };
        // `filtros` entra por `clave` (serializada); `cargar` se lee desde la referencia.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [clave, pagina, version]);

    const total = respuesta?.total ?? 0;
    const totalPaginas = respuesta?.totalPages ?? 1;

    return {
        data: respuesta?.data ?? [],
        total,
        pagina,
        totalPaginas,
        desde: total === 0 ? 0 : (pagina - 1) * porPagina + 1,
        hasta: Math.min(pagina * porPagina, total),
        cargando,
        error,
        irA: (destino: number) => setEstado({ pagina: Math.min(Math.max(1, destino), totalPaginas), clave }),
        recargar: () => setVersion((actual) => actual + 1),
    };
}
