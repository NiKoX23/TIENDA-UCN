import { useCallback, useSyncExternalStore } from 'react';

/**
 * Suscripción a una media query de CSS.
 * Se usa para los pocos casos donde una adaptation responsive NO puede
 * resolverse con una clase de Tailwind, porque el valor controla un
 * atributo HTML y no una propiedad de estilo.
 *
 * Ejemplo: el `colSpan` de una fila de tabla, que debe coincidir con la
 * cantidad de columnas visibles en cada ancho.
 *
 * El resto de las adaptaciones del proyecto se resuelven en CSS con los
 * tokens de `index.css` (xs:, nav:, wide:, max-sm:, max-md:). No usar esto
 * para lo que una clase ya resuelve.
 */
export function useMediaQuery(query: string): boolean {
    const suscribir = useCallback(
        (alCambiar: () => void) => {
            const consulta = window.matchMedia(query);
            consulta.addEventListener('change', alCambiar);
            return () => consulta.removeEventListener('change', alCambiar);
        },
        [query],
    );

    return useSyncExternalStore(
        suscribir,
        () => window.matchMedia(query).matches,
        () => false,
    );
}
