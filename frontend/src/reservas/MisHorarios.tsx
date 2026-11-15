import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import StoreHeader from '../components/StoreHeader';
import BackToStore from '../components/BackToStore';
import type { Usuario } from '../services/auth.service';
import { listarMisHorarios, type HorarioVenta } from '../services/horarios-venta.service';
import { mensajeErrorApi } from '../utils/mensajeErrorApi';

type FiltroHorarios = 'proximos' | 'pasados' | 'todos';

interface MisHorariosProps {
  usuario: Usuario;
  tema: 'dark' | 'light';
  onToggleTema: () => void;
  onPerfil: () => void;
  onLogin: () => void;
  onLogout: () => void;
  onAdmin: () => void;
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
  const valores = Object.fromEntries(partes.map((parte) => [parte.type, parte.value]));
  return {
    fecha: `${valores.year}-${valores.month}-${valores.day}`,
    hora: `${valores.hour}:${valores.minute}`,
  };
}

function esHorarioPasado(horario: HorarioVenta, ahora: { fecha: string; hora: string }): boolean {
  const fecha = horario.fecha.slice(0, 10);
  return fecha < ahora.fecha || (fecha === ahora.fecha && horario.horaTermino <= ahora.hora);
}

function fechaDelTurno(fecha: string): Date {
  return new Date(`${fecha.slice(0, 10)}T12:00:00Z`);
}

function fechaBreve(fecha: string): { dia: string; semana: string } {
  const date = fechaDelTurno(fecha);
  const dia = new Intl.DateTimeFormat('es-CL', {
    day: 'numeric',
    timeZone: 'UTC',
  }).format(date);
  const semana = new Intl.DateTimeFormat('es-CL', {
    weekday: 'short',
    timeZone: 'UTC',
  }).format(date).replace('.', '').toLocaleUpperCase('es-CL');
  return { dia, semana };
}

function mesBreve(fecha: string): string {
  return new Intl.DateTimeFormat('es-CL', {
    month: 'short',
    timeZone: 'UTC',
  }).format(fechaDelTurno(fecha)).replace('.', '');
}

function mesDelTurno(fecha: string): { clave: string; etiqueta: string } {
  const date = fechaDelTurno(fecha);
  const clave = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
  const texto = new Intl.DateTimeFormat('es-CL', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
  return {
    clave,
    etiqueta: texto.charAt(0).toLocaleUpperCase('es-CL') + texto.slice(1),
  };
}

function minutosHorario(horario: HorarioVenta): number {
  const [horaInicio, minutoInicio] = horario.horaInicio.split(':').map(Number);
  const [horaTermino, minutoTermino] = horario.horaTermino.split(':').map(Number);
  return horaTermino * 60 + minutoTermino - horaInicio * 60 - minutoInicio;
}

function formatearDuracion(minutos: number): string {
  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;
  if (resto === 0) return `${horas} h`;
  if (horas === 0) return `${resto} min`;
  return `${horas} h ${resto} min`;
}

function agruparPorMes(horarios: HorarioVenta[]): Array<[string, { etiqueta: string; horarios: HorarioVenta[] }]> {
  const grupos = new Map<string, { etiqueta: string; horarios: HorarioVenta[] }>();
  for (const horario of horarios) {
    const mes = mesDelTurno(horario.fecha);
    const grupo = grupos.get(mes.clave) ?? { etiqueta: mes.etiqueta, horarios: [] };
    grupo.horarios.push(horario);
    grupos.set(mes.clave, grupo);
  }
  return Array.from(grupos.entries());
}

export default function MisHorarios({
  usuario,
  tema,
  onToggleTema,
  onPerfil,
  onLogin,
  onLogout,
  onAdmin,
}: MisHorariosProps) {
  const [horarios, setHorarios] = useState<HorarioVenta[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [filtro, setFiltro] = useState<FiltroHorarios>('proximos');
  const [busqueda, setBusqueda] = useState('');
  const [intento, setIntento] = useState(0);
  const navigate = useNavigate();
  const ahora = ahoraEnSantiago();
  const proximos = horarios.filter((horario) => !esHorarioPasado(horario, ahora));
  const pasados = horarios
    .filter((horario) => esHorarioPasado(horario, ahora))
    .reverse();
  const proximosActivos = proximos.filter((horario) => horario.activo);
  const proximoTurno = proximosActivos[0];
  const horasProximas = proximosActivos.reduce(
    (total, horario) => total + minutosHorario(horario),
    0,
  );
  const horariosVisibles = filtro === 'proximos'
    ? proximos
    : filtro === 'pasados'
      ? pasados
      : horarios;
  const gruposVisibles = agruparPorMes(horariosVisibles);
  const gruposProximos = agruparPorMes(proximos);
  const gruposPasados = agruparPorMes(pasados);

  useEffect(() => {
    let activo = true;
    listarMisHorarios()
      .then((datos) => {
        if (activo) {
          setHorarios(datos);
          setError('');
        }
      })
      .catch((e: unknown) => {
        if (activo) setError(mensajeErrorApi(e, 'No se pudieron cargar tus horarios.'));
      })
      .finally(() => {
        if (activo) setCargando(false);
      });
    return () => {
      activo = false;
    };
  }, [intento]);

  const renderizarGrupos = (
    grupos: Array<[string, { etiqueta: string; horarios: HorarioVenta[] }]>,
    prefijo: string,
  ) => grupos.map(([clave, grupo]) => (
    <section className="seller-shifts-month" key={`${prefijo}-${clave}`} aria-labelledby={`mes-${prefijo}-${clave}`}>
      <h2 id={`mes-${prefijo}-${clave}`}>{grupo.etiqueta}</h2>
      <ul>
        {grupo.horarios.map((horario) => {
          const fecha = fechaBreve(horario.fecha);
          return (
            <li className="seller-shift-card" key={horario.idHorario}>
              <time className="seller-shift-card__date" dateTime={horario.fecha.slice(0, 10)}>
                <strong>{fecha.dia}</strong>
                <span>{fecha.semana}</span>
              </time>
              <div className="seller-shift-card__detail">
                <strong className="seller-shift-card__time">
                  {horario.horaInicio}–{horario.horaTermino}
                </strong>
                <span className="seller-duration-chip">{formatearDuracion(minutosHorario(horario))}</span>
                <small>Venta presencial · Sede Coquimbo</small>
              </div>
              <span className={`seller-shift-card__status${horario.activo ? ' is-available' : ' is-inactive'}`}>
                <span aria-hidden="true" />
                {horario.activo ? 'Disponible' : 'Desactivado'}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  ));

  return (
    <div className="seller-shifts-page min-h-screen">
      <StoreHeader
        usuario={usuario}
        tema={tema}
        busqueda={busqueda}
        categoriaActiva="horarios"
        favoritos={0}
        carritoCantidad={0}
        onToggleTema={onToggleTema}
        onPerfil={onPerfil}
        onLogin={onLogin}
        onLogout={onLogout}
        onAdmin={onAdmin}
        onBusquedaChange={setBusqueda}
        onSelectCategoria={() => navigate('/')}
        onFavoritos={() => navigate('/')}
        onCarrito={() => navigate('/')}
      />

      <main className="seller-shifts-main mx-auto w-full max-w-[1080px] px-4 pb-14 pt-8 sm:px-8">
        <BackToStore className="mb-6" />
        <header className="seller-shifts-heading">
          <span className="vcm-eyebrow">Panel de vendedor</span>
          <h1>Mis horarios</h1>
          <p>Tus turnos de venta presencial asignados por administración.</p>
        </header>

        <section className="seller-shifts-summary" aria-label="Resumen de turnos">
          <article className="seller-shifts-summary__next">
            <span>Próximo turno</span>
            {proximoTurno ? (
              <>
                <strong>
                  {fechaBreve(proximoTurno.fecha).dia} {mesBreve(proximoTurno.fecha)}
                  {' · '}{proximoTurno.horaInicio}–{proximoTurno.horaTermino}
                </strong>
                <small>Sede Coquimbo</small>
              </>
            ) : (
              <>
                <strong>Sin turnos próximos</strong>
                <small>Cuando administración te asigne un turno, aparecerá aquí.</small>
              </>
            )}
          </article>
          <article className="seller-shifts-summary__metric">
            <span>Turnos próximos</span>
            <strong>{proximosActivos.length}</strong>
          </article>
          <article className="seller-shifts-summary__metric">
            <span>Horas asignadas</span>
            <strong>{formatearDuracion(horasProximas)}</strong>
          </article>
        </section>

        <div className="seller-shifts-filters" role="group" aria-label="Filtrar horarios">
          {([
            ['proximos', 'Próximos'],
            ['pasados', 'Pasados'],
            ['todos', 'Todos'],
          ] as const).map(([id, etiqueta]) => (
            <button
              key={id}
              type="button"
              className={`seller-shifts-filter${filtro === id ? ' is-active' : ''}`}
              aria-pressed={filtro === id}
              onClick={() => setFiltro(id)}
            >
              {etiqueta}
            </button>
          ))}
        </div>

        {error ? (
          <div className="seller-shifts-error" role="alert">
            <p>{error}</p>
            <button
              type="button"
              onClick={() => {
                setCargando(true);
                setError('');
                setIntento((actual) => actual + 1);
              }}
            >
              Reintentar
            </button>
          </div>
        ) : cargando ? (
          <div className="vcm-spinner py-12" role="status">Cargando tus horarios...</div>
        ) : horariosVisibles.length === 0 ? (
          <section className="seller-shifts-empty">
            <span aria-hidden="true">◷</span>
            <h2>
              {filtro === 'pasados'
                ? 'No tienes turnos pasados.'
                : filtro === 'proximos'
                  ? 'No tienes turnos próximos.'
                  : 'Aún no tienes horarios asignados.'}
            </h2>
            <p>Los nuevos turnos que te asigne administración aparecerán aquí.</p>
          </section>
        ) : (
          <div className="seller-shifts-groups">
            {filtro === 'todos' ? (
              <>
                {proximos.length > 0 && (
                  <section className="seller-shifts-list-section" aria-labelledby="turnos-proximos-titulo">
                    <h2 id="turnos-proximos-titulo">Próximos turnos</h2>
                    {renderizarGrupos(gruposProximos, 'proximos')}
                  </section>
                )}
                {pasados.length > 0 && (
                  <section className="seller-shifts-list-section" aria-labelledby="turnos-pasados-titulo">
                    <h2 id="turnos-pasados-titulo">Turnos pasados</h2>
                    {renderizarGrupos(gruposPasados, 'pasados')}
                  </section>
                )}
              </>
            ) : renderizarGrupos(gruposVisibles, filtro)}
          </div>
        )}
      </main>
    </div>
  );
}
