import { useEffect, useRef, type ReactNode } from 'react';

interface ReservaModalProps {
  abierto: boolean;
  tituloId: string;
  descripcionId?: string;
  onCerrar: () => void;
  children: ReactNode;
  clase?: string;
}

export default function ReservaModal({
  abierto,
  tituloId,
  descripcionId,
  onCerrar,
  children,
  clase = '',
}: ReservaModalProps) {
  const modalRef = useRef<HTMLDivElement | null>(null);
  const onCerrarRef = useRef(onCerrar);

  useEffect(() => {
    onCerrarRef.current = onCerrar;
  }, [onCerrar]);

  useEffect(() => {
    if (!abierto) return;

    const focoAnterior = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const modal = modalRef.current;
    const focoInicial = modal?.querySelector<HTMLElement>(
      '[data-modal-initial-focus], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled)',
    );
    focoInicial?.focus();

    const manejarTeclado = (event: KeyboardEvent) => {
      const dialogosAbiertos = document.querySelectorAll<HTMLElement>(
        '[role="dialog"][aria-modal="true"]',
      );
      if (dialogosAbiertos[dialogosAbiertos.length - 1] !== modal) return;

      if (event.key === 'Escape') {
        event.preventDefault();
        onCerrarRef.current();
        return;
      }

      if (event.key !== 'Tab' || !modal) return;
      const focos = Array.from(
        modal.querySelectorAll<HTMLElement>(
          'a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((elemento) => elemento.offsetParent !== null);
      if (focos.length === 0) {
        event.preventDefault();
        modal.focus();
        return;
      }
      const primero = focos[0];
      const ultimo = focos[focos.length - 1];
      if (event.shiftKey && document.activeElement === primero) {
        event.preventDefault();
        ultimo.focus();
      } else if (!event.shiftKey && document.activeElement === ultimo) {
        event.preventDefault();
        primero.focus();
      }
    };

    document.addEventListener('keydown', manejarTeclado);
    return () => {
      document.removeEventListener('keydown', manejarTeclado);
      document.body.style.overflow = overflowAnterior;
      if (focoAnterior?.isConnected) {
        focoAnterior.focus();
      } else {
        document
          .querySelector<HTMLElement>('[data-reserva-focus-fallback]')
          ?.focus();
      }
    };
  }, [abierto]);

  if (!abierto) return null;

  return (
    <div
      className="reserva-modal-backdrop fixed inset-0 z-[100] grid place-items-center overflow-y-auto bg-[color-mix(in_srgb,var(--vcm-navy)_78%,transparent)] p-4 backdrop-blur-md"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCerrar();
      }}
    >
      <div
        ref={modalRef}
        className={`reserva-modal-card vcm-card relative my-auto w-full max-w-2xl border-t-4 p-5 shadow-2xl sm:p-7 ${clase}`}
        style={{ borderTopColor: 'var(--vcm-orange)' }}
        role="dialog"
        aria-modal="true"
        aria-labelledby={tituloId}
        aria-describedby={descripcionId}
        tabIndex={-1}
      >
        {children}
      </div>
    </div>
  );
}
