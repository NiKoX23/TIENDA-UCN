import { formatearCLP } from '../utils/precio';
import type { EstadoReserva, Reserva } from '../services/reservas.service';
import ReservaModal from './ReservaModal';

const ETIQUETAS_ESTADO: Record<EstadoReserva, string> = {
  PENDIENTE: 'Pendiente',
  LISTA_PARA_RETIRO: 'Lista para retiro',
  RETIRADA: 'Entregada',
  CANCELADA: 'Cancelada',
  VENCIDA: 'Vencida',
};

function mostrarFecha(fecha: string): string {
  return new Date(`${fecha.slice(0, 10)}T12:00:00`).toLocaleDateString('es-CL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

interface ReservaDetalleModalProps {
  reserva: Reserva | null;
  onCerrar: () => void;
  onCancelar?: () => void;
  cancelando?: boolean;
}

export default function ReservaDetalleModal({
  reserva,
  onCerrar,
  onCancelar,
  cancelando = false,
}: ReservaDetalleModalProps) {
  return (
    <ReservaModal
      abierto={reserva !== null}
      tituloId="reserva-detalle-titulo"
      descripcionId="reserva-detalle-descripcion"
      onCerrar={onCerrar}
    >
      {reserva && (
        <>
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <span className="vcm-eyebrow">Productos reservados</span>
              <h2 id="reserva-detalle-titulo" className="mt-2 break-all text-2xl font-extrabold">
                {reserva.codigoReserva}
              </h2>
              <p id="reserva-detalle-descripcion" className="mt-1 text-sm text-[var(--text-soft)]">
                Retiro {mostrarFecha(reserva.fechaRetiro)}
                {reserva.bloqueHorario && ` · ${reserva.bloqueHorario}`}
              </p>
            </div>
            <button
              type="button"
              className="vcm-btn vcm-btn--surface shrink-0 px-3"
              onClick={onCerrar}
              aria-label="Cerrar detalle de reserva"
              data-modal-initial-focus
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="m6 6 12 12M18 6 6 18" />
              </svg>
            </button>
          </div>

          {reserva.usuario && (
            <p className="mt-4 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm">
              <span className="font-bold">{reserva.usuario.nombre}</span>
              <span className="ml-2 text-[var(--text-soft)]">{reserva.usuario.email}</span>
            </p>
          )}

          <ul className="mt-4 max-h-[52vh] divide-y divide-[var(--border)] overflow-y-auto pr-1">
            {reserva.items.map((item) => (
              <li className="flex items-center gap-3 py-3 sm:gap-4" key={item.idItem}>
                {item.producto.imagenUrl ? (
                  <img
                    className="h-14 w-14 shrink-0 rounded-xl border border-[var(--border)] bg-[var(--primary-soft)] object-contain p-1 sm:h-16 sm:w-16"
                    src={item.producto.imagenUrl}
                    alt=""
                  />
                ) : (
                  <div className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-[var(--primary-soft)] text-xs font-extrabold text-[var(--text-soft)]" aria-hidden="true">
                    UCN
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-bold">{item.producto.nombre}</p>
                  <p className="mt-0.5 text-xs text-[var(--text-soft)]">
                    SKU: {item.sku}
                    {item.talla !== 'unica' && ` · Talla: ${item.talla}`}
                    {item.color && ` · Color: ${item.color}`}
                  </p>
                  <p className="mt-1 text-xs text-[var(--text-soft)]">
                    {item.cantidad} × {formatearCLP(item.precioUnitario)}
                  </p>
                </div>
                <strong className="shrink-0 text-sm">{formatearCLP(item.subtotal)}</strong>
              </li>
            ))}
          </ul>

          <div className="mt-3 flex items-center justify-between border-t border-[var(--border)] pt-4">
            <span className="text-sm text-[var(--text-soft)]">Total reservado</span>
            <strong className="text-xl">{formatearCLP(reserva.total)}</strong>
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <span className={`reserva-status reserva-status--${reserva.estado.toLowerCase().replaceAll('_', '-')}`}>
              {ETIQUETAS_ESTADO[reserva.estado]}
            </span>
            {onCancelar && reserva.estado === 'PENDIENTE' && (
              <button
                type="button"
                className="vcm-btn vcm-btn--danger vcm-btn--sm"
                onClick={onCancelar}
                disabled={cancelando}
              >
                {cancelando ? 'Cancelando…' : 'Cancelar reserva'}
              </button>
            )}
          </div>
          {reserva.observaciones && (
            <p className="mt-4 text-sm text-[var(--text-soft)]">
              <span className="font-bold text-[var(--text)]">Observaciones:</span> {reserva.observaciones}
            </p>
          )}
        </>
      )}
    </ReservaModal>
  );
}
