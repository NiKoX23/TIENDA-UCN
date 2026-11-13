import { useEffect, useRef, useState } from 'react';
import { formatearCLP } from '../utils/precio';
import type { Reserva } from '../services/reservas.service';
import ReservaModal from './ReservaModal';

interface ReservaConfirmacionModalProps {
  reserva: Reserva | null;
  advertenciaStock?: boolean;
  onVerReservas: () => void;
  onSeguirComprando: () => void;
}

function mostrarFecha(fecha: string): string {
  return new Date(`${fecha.slice(0, 10)}T12:00:00`).toLocaleDateString('es-CL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export default function ReservaConfirmacionModal({
  reserva,
  advertenciaStock = false,
  onVerReservas,
  onSeguirComprando,
}: ReservaConfirmacionModalProps) {
  const [estadoCopia, setEstadoCopia] = useState<{
    codigo: string;
    copiado: boolean;
    error?: string;
  } | null>(null);
  const timerCopiado = useRef<number | null>(null);
  const copiado = reserva !== null &&
    estadoCopia?.codigo === reserva.codigoReserva &&
    estadoCopia.copiado;
  const errorCopiar = reserva !== null && estadoCopia?.codigo === reserva.codigoReserva
    ? estadoCopia.error
    : undefined;

  useEffect(() => {
    return () => {
      if (timerCopiado.current !== null) window.clearTimeout(timerCopiado.current);
    };
  }, [reserva?.codigoReserva]);

  const copiarCodigo = async () => {
    if (!reserva) return;
    try {
      await navigator.clipboard.writeText(reserva.codigoReserva);
      setEstadoCopia({ codigo: reserva.codigoReserva, copiado: true });
      if (timerCopiado.current !== null) window.clearTimeout(timerCopiado.current);
      timerCopiado.current = window.setTimeout(() => {
        setEstadoCopia({ codigo: reserva.codigoReserva, copiado: false });
        timerCopiado.current = null;
      }, 1800);
    } catch {
      setEstadoCopia({
        codigo: reserva.codigoReserva,
        copiado: false,
        error: 'No se pudo copiar. Puedes seleccionar el código manualmente.',
      });
    }
  };

  return (
    <ReservaModal
      abierto={reserva !== null}
      tituloId="reserva-confirmacion-titulo"
      descripcionId="reserva-confirmacion-descripcion"
      onCerrar={onSeguirComprando}
      clase="max-w-xl"
      botonCerrar={
        <button
          type="button"
          className="absolute right-4 top-4 z-10 grid h-10 w-10 cursor-pointer place-items-center rounded-[var(--radius)] border-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          style={{
            backgroundColor: 'var(--vcm-orange)',
          }}
          onClick={onSeguirComprando}
          aria-label="Cerrar confirmación"
          title="Cerrar"
          data-modal-initial-focus
        >
          <svg className="pointer-events-none h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="#023359" strokeWidth="2.5" aria-hidden="true">
            <path d="m6 6 12 12M18 6 6 18" />
          </svg>
        </button>
      }
    >
      {reserva && (
        <div className="text-center">

          <div className="reserva-success-icon mx-auto grid h-20 w-20 place-items-center rounded-full" aria-hidden="true">
            <svg className="h-10 w-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="m5 12 4 4L19 6" />
            </svg>
          </div>
          <span className="vcm-eyebrow mt-5 justify-center">Retiro en sede Coquimbo</span>
          <h2 id="reserva-confirmacion-titulo" className="mt-2 text-3xl font-extrabold">
            ¡Reserva creada!
          </h2>
          <p id="reserva-confirmacion-descripcion" className="mt-2 text-sm text-[var(--text-soft)]">
            Guardamos tus productos y apartamos el stock para el retiro.
          </p>

          {advertenciaStock && (
            <p className="vcm-alert mt-4 text-left" role="status">
              La reserva se creó, pero no se pudo actualizar la disponibilidad en pantalla. Recarga la tienda.
            </p>
          )}

          <div className="mt-6 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-4 text-left">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-soft)]">
              Código de reserva
            </span>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
              <strong className="break-all text-xl tracking-wide text-[var(--vcm-cyan)]">
                {reserva.codigoReserva}
              </strong>
              <button
                type="button"
                className="vcm-btn vcm-btn--surface vcm-btn--sm"
                onClick={() => void copiarCodigo()}
              >
                {copiado ? 'Copiado' : 'Copiar código'}
              </button>
            </div>
            {errorCopiar && <p className="mt-2 text-xs text-[var(--text-soft)]" role="status">{errorCopiar}</p>}
          </div>

          <div className="mt-4 flex flex-wrap justify-between gap-3 text-left">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-[var(--text-soft)]">Fecha de retiro</p>
              <p className="mt-1 font-bold">{mostrarFecha(reserva.fechaRetiro)}</p>
              {reserva.horario && (
                <p className="mt-1 text-sm text-[var(--text-soft)]">
                  {reserva.horario.horaInicio}–{reserva.horario.horaTermino}
                  <span className="block">
                    Vendedor: <strong className="text-[var(--text)]">{reserva.horario.vendedor.nombre}</strong>
                  </span>
                </p>
              )}
            </div>
            <div className="text-right">
              <p className="text-xs font-bold uppercase tracking-wider text-[var(--text-soft)]">Total</p>
              <p className="mt-1 text-lg font-extrabold">{formatearCLP(reserva.total)}</p>
            </div>
          </div>

          <ul className="mt-4 space-y-2 text-left">
            {reserva.items.slice(0, 3).map((item) => (
              <li className="flex justify-between gap-3 text-sm" key={item.idItem}>
                <span className="min-w-0 truncate text-[var(--text-soft)]">
                  {item.producto.nombre} × {item.cantidad}
                </span>
                <span className="shrink-0 font-semibold">{formatearCLP(item.subtotal)}</span>
              </li>
            ))}
            {reserva.items.length > 3 && (
              <li className="text-xs text-[var(--text-soft)]">
                Y {reserva.items.length - 3} productos más
              </li>
            )}
          </ul>

          <div className="mt-7 grid gap-2 sm:grid-cols-2">
            <button type="button" className="vcm-btn vcm-btn--primary" onClick={onVerReservas}>
              Ver mis reservas
            </button>
            <button type="button" className="vcm-btn vcm-btn--surface" onClick={onSeguirComprando}>
              Seguir comprando
            </button>
          </div>
        </div>
      )}
    </ReservaModal>
  );
}
