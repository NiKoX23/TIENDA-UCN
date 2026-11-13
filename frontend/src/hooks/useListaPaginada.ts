import { useEffect, useRef, useState } from 'react';
import type { PaginaApi } from '../services/paginacion';
import { FILAS_POR_PAGINA_ADMIN, LIMITE_POR_PAGINA_API } from '../utils/paginacion';

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
    const [mostrarTodos, setMostrarTodos] = useState(false);
    const pagina = mostrarTodos || estado.clave !== clave ? 1 : estado.pagina;

    const [version, setVersion] = useState(0);
    const [respuesta, setRespuesta] = useState<PaginaApi<T> | null>(null);
    const [solicitudCompletada, setSolicitudCompletada] = useState('');
    const [error, setError] = useState<unknown>(null);
    const solicitudActual = JSON.stringify([clave, pagina, version, mostrarTodos]);
    const cargando = solicitudCompletada !== solicitudActual;

    const cargarRef = useRef(cargar);
    useEffect(() => {
        cargarRef.current = cargar;
    });

    useEffect(() => {
        let vigente = true;
        const cargarDatos = async () => {
            const cargarLista = cargarRef.current;
            const resultado = await cargarLista({
                ...filtros,
                page: pagina,
                limit: mostrarTodos ? LIMITE_POR_PAGINA_API : porPagina,
                q: qEstable || undefined,
            });

            if (!mostrarTodos || resultado.totalPages <= 1) return resultado;

            const paginasRestantes = await Promise.all(
                Array.from({ length: resultado.totalPages - 1 }, (_, indice) =>
                    cargarLista({
                        ...filtros,
                        page: indice + 2,
                        limit: LIMITE_POR_PAGINA_API,
                        q: qEstable || undefined,
                    }),
                ),
            );
            return {
                ...resultado,
                data: [resultado, ...paginasRestantes].flatMap((paginaResultado) => paginaResultado.data),
                page: 1,
                limit: LIMITE_POR_PAGINA_API,
                totalPages: 1,
            };
        };

        cargarDatos()
            .then((resultado) => {
                if (!vigente) return;
                setRespuesta(resultado);
                setError(null);
                // La página pedida quedó fuera de rango (p. ej. se borró su última fila): retrocede.
                if (!mostrarTodos && resultado.data.length === 0 && resultado.total > 0 && resultado.page > resultado.totalPages) {
                    setEstado({ pagina: resultado.totalPages, clave });
                }
            })
            .catch((e: unknown) => {
                if (vigente) setError(e);
            })
            .finally(() => {
                if (vigente) setSolicitudCompletada(solicitudActual);
            });
        return () => {
            vigente = false;
        };
        // `filtros` entra por `clave` (serializada); `cargar` se lee desde la referencia.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [clave, pagina, solicitudActual, version, mostrarTodos]);

    const total = respuesta?.total ?? 0;
    const totalPaginas = mostrarTodos ? 1 : respuesta?.totalPages ?? 1;

    return {
        data: respuesta?.data ?? [],
        total,
        pagina: mostrarTodos ? 1 : pagina,
        totalPaginas,
        desde: total === 0 ? 0 : mostrarTodos ? 1 : (pagina - 1) * porPagina + 1,
        hasta: mostrarTodos ? total : Math.min(pagina * porPagina, total),
        cargando,
        error,
        mostrarTodos,
        irA: (destino: number) => setEstado({ pagina: Math.min(Math.max(1, destino), totalPaginas), clave }),
        alternarMostrarTodos: () => {
            setEstado({ pagina: 1, clave });
            setMostrarTodos((actual) => !actual);
        },
        recargar: () => setVersion((actual) => actual + 1),
    };
}
