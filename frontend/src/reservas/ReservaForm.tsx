import { useState, type FormEvent } from 'react';
import type { DatosCrearReserva } from '../services/reservas.service';
import ReservaModal from './ReservaModal';

interface ReservaFormProps {
  abierto: boolean;
  procesando: boolean;
  error: string;
  onCerrar: () => void;
  onConfirmar: (datos: Omit<DatosCrearReserva, 'lineas'>) => void;
}

function fechaLocal(): string {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Santiago',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const partesPorNombre = Object.fromEntries(
    partes.map((parte) => [parte.type, parte.value]),
  );
  return `${partesPorNombre.year}-${partesPorNombre.month}-${partesPorNombre.day}`;
}

export default function ReservaForm({
  abierto,
  procesando,
  error,
  onCerrar,
  onConfirmar,
}: ReservaFormProps) {
  const [fechaRetiro, setFechaRetiro] = useState(fechaLocal);
  const [bloqueHorario, setBloqueHorario] = useState('');
  const [observaciones, setObservaciones] = useState('');

  if (!abierto) return null;

  const enviar = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onConfirmar({
      fechaRetiro,
      bloqueHorario: bloqueHorario || undefined,
      observaciones: observaciones.trim() || undefined,
    });
  };

  return (
    <ReservaModal
      abierto={abierto}
      tituloId="reserva-form-titulo"
      onCerrar={procesando ? () => undefined : onCerrar}
      clase="max-w-lg"
    >
      <form className="space-y-4" onSubmit={enviar}>
        <div>
          <span className="vcm-eyebrow">Retiro en sede Coquimbo</span>
          <h2 id="reserva-form-titulo" className="mt-2 text-2xl font-extrabold">
            Reservar productos
          </h2>
          <p className="mt-1 text-sm text-[var(--text-soft)]">
            Apartaremos el stock hasta que retires o canceles la reserva.
          </p>
        </div>

        <label className="block space-y-1.5 text-sm font-semibold">
          Fecha de retiro
          <input
            className="vcm-input w-full"
            type="date"
            min={fechaLocal()}
            value={fechaRetiro}
            onChange={(event) => setFechaRetiro(event.target.value)}
            data-modal-initial-focus
            required
          />
        </label>

        <label className="block space-y-1.5 text-sm font-semibold">
          Bloque horario <span className="font-normal text-[var(--text-soft)]">(opcional)</span>
          <select
            className="vcm-input w-full"
            value={bloqueHorario}
            onChange={(event) => setBloqueHorario(event.target.value)}
          >
            <option value="">Sin preferencia</option>
            <option value="09:00-11:00">09:00–11:00</option>
            <option value="11:00-13:00">11:00–13:00</option>
            <option value="14:00-16:00">14:00–16:00</option>
            <option value="16:00-18:00">16:00–18:00</option>
          </select>
        </label>

        <label className="block space-y-1.5 text-sm font-semibold">
          Observaciones <span className="font-normal text-[var(--text-soft)]">(opcional)</span>
          <textarea
            className="vcm-input min-h-20 w-full resize-y"
            maxLength={500}
            value={observaciones}
            onChange={(event) => setObservaciones(event.target.value)}
          />
        </label>

        {error && <p className="vcm-alert" role="alert">{error}</p>}

        <div className="flex flex-wrap justify-end gap-2 pt-1">
          <button
            type="button"
            className="vcm-btn vcm-btn--surface"
            onClick={onCerrar}
            disabled={procesando}
          >
            Volver
          </button>
          <button
            type="submit"
            className="vcm-btn vcm-btn--primary"
            disabled={procesando}
          >
            {procesando ? 'Reservando...' : 'Confirmar reserva'}
          </button>
        </div>
      </form>
    </ReservaModal>
  );
}
