import { useLayoutEffect, useState, type RefObject } from 'react';

export interface PopoverPosition {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
}

interface UseAnchoredPopoverOptions {
  abierto: boolean;
  anclaRef: RefObject<HTMLElement | null>;
  panelRef: RefObject<HTMLDivElement | null>;
  anchoMinimo: number;
}

export function useAnchoredPopover({
  abierto,
  anclaRef,
  panelRef,
  anchoMinimo,
}: UseAnchoredPopoverOptions): PopoverPosition | null {
  const [posicion, setPosicion] = useState<PopoverPosition | null>(null);

  useLayoutEffect(() => {
    if (!abierto) return;

    const actualizarPosicion = () => {
      const ancla = anclaRef.current;
      const panel = panelRef.current;
      if (!ancla || !panel) return;

      const rect = ancla.getBoundingClientRect();
      const margen = 8;
      const ancho = Math.min(
        Math.max(rect.width, anchoMinimo),
        window.innerWidth - margen * 2,
      );
      const altoDeseado = Math.min(
        panel.scrollHeight,
        window.innerHeight - margen * 2,
      );
      const espacioAbajo = window.innerHeight - rect.bottom - margen;
      const espacioArriba = rect.top - margen;
      const cabeAbajo = espacioAbajo >= altoDeseado;
      const cabeArriba = espacioArriba >= altoDeseado;
      const abrirArriba = !cabeAbajo && (cabeArriba || espacioArriba > espacioAbajo);
      const espacioElegido = Math.max(
        0,
        abrirArriba ? espacioArriba : espacioAbajo,
      );
      const altoFinal = Math.min(altoDeseado, espacioElegido);
      const izquierda = Math.max(
        margen,
        Math.min(rect.left, window.innerWidth - ancho - margen),
      );
      const arriba = abrirArriba
        ? Math.max(margen, rect.top - altoFinal - margen)
        : Math.min(rect.bottom + margen, window.innerHeight - altoFinal - margen);

      setPosicion({
        top: arriba,
        left: izquierda,
        width: ancho,
        maxHeight: altoFinal,
      });
    };

    const frame = window.requestAnimationFrame(actualizarPosicion);
    window.addEventListener('resize', actualizarPosicion);
    window.addEventListener('scroll', actualizarPosicion, true);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('resize', actualizarPosicion);
      window.removeEventListener('scroll', actualizarPosicion, true);
    };
  }, [abierto, anchoMinimo, anclaRef, panelRef]);

  return abierto ? posicion : null;
}
