import { useEffect, useState } from 'react';
import type { Usuario } from '../services/auth.service';
import {
  claveAvisoTurnosVendedor,
  listarMisTurnos,
  type HorarioVenta,
} from '../services/horarios-venta.service';
import { mensajeErrorApi } from '../utils/mensajeErrorApi';

interface TurnoVendedorAvisoProps {
  usuario: Usuario;
}

interface ResultadoTurnos {
  uid: number;
  turno: HorarioVenta | null;
  error: string;
}

function ahoraEnSantiago(): { fecha: string; hora: string } {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Santiago',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date());
  const valores = Object.fromEntries(
    partes.map((parte) => [parte.type, parte.value]),
  );
  return {
    fecha: `${valores.year}-${valores.month}-${valores.day}`,
    hora: `${valores.hour}:${valores.minute}`,
  };
}

function fechaEnEspanol(fecha: string): string {
  const [year, month, day] = fecha.slice(0, 10).split('-').map(Number);
  return new Intl.DateTimeFormat('es-CL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'America/Santiago',
  })
    .format(new Date(Date.UTC(year, month - 1, day, 12)))
    .replace(',', '');
}

function mensajeTurno(turno: HorarioVenta): string {
  const ahora = ahoraEnSantiago();
  if (turno.fecha.slice(0, 10) === ahora.fecha && turno.horaInicio <= ahora.hora) {
    return `Tu turno de hoy va de ${turno.horaInicio} a ${turno.horaTermino}.`;
  }
  return `Tu turno empieza el ${fechaEnEspanol(turno.fecha)} a las ${turno.horaInicio} y termina a las ${turno.horaTermino}.`;
}

export default function TurnoVendedorAviso({ usuario }: TurnoVendedorAvisoProps) {
  const [resultado, setResultado] = useState<ResultadoTurnos | null>(null);
  const [cerradoUid, setCerradoUid] = useState<number | null>(null);
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    if (usuario.esAdmin || !usuario.esVendedor) return;

    const uid = usuario.uid;
    const clave = claveAvisoTurnosVendedor(uid);
    if (sessionStorage.getItem(clave) === 'consultado') return;

    let activo = true;
    listarMisTurnos()
      .then((turnos) => {
        if (!activo) return;
        sessionStorage.setItem(clave, 'consultado');
        setResultado({ uid, turno: turnos[0] ?? null, error: '' });
      })
      .catch((error: unknown) => {
        if (!activo) return;
        setResultado({
          uid,
          turno: null,
          error: mensajeErrorApi(error, 'No se pudieron consultar tus turnos.'),
        });
      });

    return () => {
      activo = false;
    };
  }, [usuario.esAdmin, usuario.esVendedor, usuario.uid, intento]);

  if (
    usuario.esAdmin ||
    !usuario.esVendedor ||
    !resultado ||
    resultado.uid !== usuario.uid ||
    cerradoUid === usuario.uid ||
    (!resultado.turno && !resultado.error)
  ) {
    return null;
  }

  return (
    <aside className="seller-shift-notice" role="status" aria-live="polite">
      <span className="seller-shift-notice__icon" aria-hidden="true">◷</span>
      <div className="seller-shift-notice__content">
        <strong className="seller-shift-notice__title">
          {resultado.error ? 'No se pudo consultar tu turno' : 'Próximo turno'}
        </strong>
        <p>
          {resultado.error || (resultado.turno && mensajeTurno(resultado.turno))}
        </p>
        {resultado.error && (
          <button
            type="button"
            className="seller-shift-notice__retry"
            onClick={() => setIntento((actual) => actual + 1)}
          >
            Reintentar
          </button>
        )}
      </div>
      <button
        type="button"
        className="seller-shift-notice__close"
        aria-label="Cerrar aviso de turno"
        onClick={() => setCerradoUid(usuario.uid)}
      >
        ×
      </button>
    </aside>
  );
}
