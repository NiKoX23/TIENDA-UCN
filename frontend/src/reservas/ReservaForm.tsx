import { useEffect, useState, type FormEvent } from 'react';
import type { DatosCrearReserva } from '../services/reservas.service';
import { listarHorariosDisponibles, type HorarioVenta } from '../services/horarios-venta.service';
import { mensajeErrorApi } from '../utils/mensajeErrorApi';
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
  const [idHorario, setIdHorario] = useState('');
  const [consultaHorarios, setConsultaHorarios] = useState<{
    fecha: string;
    horarios: HorarioVenta[];
    error: string;
  } | null>(null);
  const [observaciones, setObservaciones] = useState('');

  useEffect(() => {
    if (!abierto || !fechaRetiro) return;
    let activo = true;
    let enCurso = false;
    const consultarHorarios = async () => {
      if (!activo || enCurso) return;
      enCurso = true;
      try {
        const disponibles = await listarHorariosDisponibles(fechaRetiro);
        if (activo) {
          setConsultaHorarios({
          fecha: fechaRetiro,
          horarios: disponibles,
          error: '',
          });
          setIdHorario((actual) =>
            disponibles.some((horario) => String(horario.idHorario) === actual)
              ? actual
              : '',
          );
        }
      } catch (error: unknown) {
        if (activo) {
          setConsultaHorarios({
            fecha: fechaRetiro,
            horarios: [],
            error: mensajeErrorApi(
              error,
              'No se pudieron consultar los horarios disponibles.',
            ),
          });
        }
      } finally {
        enCurso = false;
      }
    };
    const consultarSiVisible = () => {
      if (document.visibilityState === 'visible') void consultarHorarios();
    };
    void consultarHorarios();
    const intervalo = window.setInterval(consultarSiVisible, 10000);
    window.addEventListener('focus', consultarSiVisible);
    document.addEventListener('visibilitychange', consultarSiVisible);
    return () => {
      activo = false;
      window.clearInterval(intervalo);
      window.removeEventListener('focus', consultarSiVisible);
      document.removeEventListener('visibilitychange', consultarSiVisible);
    };
  }, [abierto, fechaRetiro]);

  const consultaActual = consultaHorarios?.fecha === fechaRetiro
    ? consultaHorarios
    : null;
  const horarios = consultaActual?.horarios ?? [];
  const errorHorarios = consultaActual?.error ?? '';
  const cargandoHorarios = abierto && consultaActual === null;
  const horarioSeleccionadoDisponible = horarios.some(
    (horario) => String(horario.idHorario) === idHorario,
  );

  if (!abierto) return null;

  const enviar = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!horarioSeleccionadoDisponible) return;
    onConfirmar({
      fechaRetiro,
      idHorario: Number(idHorario),
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
            onChange={(event) => {
              setFechaRetiro(event.target.value);
              setIdHorario('');
            }}
            data-modal-initial-focus
            required
          />
        </label>

        <label className="block space-y-1.5 text-sm font-semibold">
          Horario disponible
          <select
            className="vcm-input w-full"
            value={idHorario}
            onChange={(event) => setIdHorario(event.target.value)}
            disabled={cargandoHorarios || horarios.length === 0}
            required
          >
            <option value="">
              {cargandoHorarios
                ? 'Buscando horarios...'
                : horarios.length === 0
                  ? 'No hay horarios disponibles'
                  : 'Selecciona un horario'}
            </option>
            {horarios.map((horario) => (
              <option key={horario.idHorario} value={horario.idHorario}>
                {horario.horaInicio}–{horario.horaTermino} · {horario.vendedor.nombre}
              </option>
            ))}
          </select>
        </label>
        {errorHorarios && <p className="vcm-alert" role="alert">{errorHorarios}</p>}
        {!cargandoHorarios && !errorHorarios && horarios.length === 0 && (
          <p className="text-sm text-[var(--text-soft)]">
            No hay turnos asignados para esta fecha. Prueba con otro día.
          </p>
        )}

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
            disabled={procesando || cargandoHorarios || !horarioSeleccionadoDisponible}
          >
            {procesando ? 'Reservando...' : 'Confirmar reserva'}
          </button>
        </div>
      </form>
    </ReservaModal>
  );
}
