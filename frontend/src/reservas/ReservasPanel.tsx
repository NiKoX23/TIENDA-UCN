import { useEffect, useMemo, useState } from 'react';
import { formatearCLP } from '../utils/precio';
import { mensajeErrorApi } from '../utils/mensajeErrorApi';
import AdminSectionHeader from '../components/AdminSectionHeader';
import {
  cancelarMiReserva,
  cambiarEstadoReserva,
  listarMisReservas,
  listarTodasLasReservas,
  type EstadoReserva,
  type Reserva,
} from '../services/reservas.service';
import ReservaDetalleModal from './ReservaDetalleModal';
import ReservaModal from './ReservaModal';

interface ReservasPanelProps {
  administrador: boolean;
  onIrTienda?: () => void;
}

const ETIQUETAS_ESTADO: Record<EstadoReserva, string> = {
  PENDIENTE: 'Pendiente',
  LISTA_PARA_RETIRO: 'Lista para retiro',
  RETIRADA: 'Entregada',
  CANCELADA: 'Cancelada',
  VENCIDA: 'Vencida',
};

const ESTADOS_RESERVA: EstadoReserva[] = [
  'PENDIENTE',
  'LISTA_PARA_RETIRO',
  'RETIRADA',
  'CANCELADA',
  'VENCIDA',
];

interface CambioPendiente {
  reserva: Reserva;
  estado: EstadoReserva;
}

function mostrarFecha(fecha: string): string {
  return new Date(`${fecha.slice(0, 10)}T12:00:00`).toLocaleDateString('es-CL', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function opcionesEstado(estado: EstadoReserva): EstadoReserva[] {
  if (estado === 'PENDIENTE') {
    return ['PENDIENTE', 'LISTA_PARA_RETIRO', 'CANCELADA', 'VENCIDA'];
  }
  if (estado === 'LISTA_PARA_RETIRO') {
    return ['LISTA_PARA_RETIRO', 'RETIRADA', 'CANCELADA', 'VENCIDA'];
  }
  return [estado];
}

function claseEstado(estado: EstadoReserva): string {
  return `reserva-status reserva-status--${estado.toLowerCase().replaceAll('_', '-')}`;
}

function IconoCalendario() {
  return (
    <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M16 3v4M8 3v4M3 10h18" />
    </svg>
  );
}

function IconoProductos() {
  return (
    <svg className="absolute left-3 h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="m3 7 9-4 9 4-9 4-9-4Z" />
      <path d="M3 7v10l9 4 9-4V7M12 11v10" />
    </svg>
  );
}

function Miniaturas({ reserva }: { reserva: Reserva }) {
  const visibles = reserva.items.slice(0, 4);
  const restantes = Math.max(0, reserva.items.length - visibles.length);

  return (
    <div className="reserva-thumbnails" aria-label={`${reserva.items.length} productos reservados`}>
      {visibles.map((item, index) => (
        <span
          className="reserva-thumbnail"
          style={{ zIndex: visibles.length - index }}
          key={item.idItem}
        >
          {item.producto.imagenUrl ? (
            <img src={item.producto.imagenUrl} alt="" />
          ) : (
            <span aria-hidden="true">UCN</span>
          )}
        </span>
      ))}
      {restantes > 0 && <span className="reserva-thumbnail reserva-thumbnail--more">+{restantes}</span>}
    </div>
  );
}

export default function ReservasPanel({
  administrador,
  onIrTienda,
}: ReservasPanelProps) {
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [actualizandoId, setActualizandoId] = useState<number | null>(null);
  const [detalleAbierto, setDetalleAbierto] = useState<Reserva | null>(null);
  const [cambioPendiente, setCambioPendiente] = useState<CambioPendiente | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<EstadoReserva | 'TODOS'>('TODOS');
  const [ordenFecha, setOrdenFecha] = useState<'proxima' | 'lejana'>('proxima');

  useEffect(() => {
    let activo = true;
    const cargar = administrador ? listarTodasLasReservas : listarMisReservas;
    cargar()
      .then((datos) => {
        if (activo) setReservas(datos);
      })
      .catch((e: unknown) => {
        if (activo) setError(mensajeErrorApi(e, 'No se pudieron cargar las reservas.'));
      })
      .finally(() => {
        if (activo) setCargando(false);
      });
    return () => {
      activo = false;
    };
  }, [administrador]);

  const reservasVisibles = useMemo(() => {
    const consulta = busqueda.trim().toLocaleLowerCase('es-CL');
    return reservas
      .filter((reserva) => {
        if (filtroEstado !== 'TODOS' && reserva.estado !== filtroEstado) return false;
        if (!consulta) return true;
        return [
          reserva.codigoReserva,
          reserva.usuario?.nombre ?? '',
          reserva.usuario?.email ?? '',
        ].some((valor) => valor.toLocaleLowerCase('es-CL').includes(consulta));
      })
      .sort((a, b) => {
        const orden = a.fechaRetiro.localeCompare(b.fechaRetiro);
        if (orden !== 0) return ordenFecha === 'proxima' ? orden : -orden;
        return b.fechaCreacion.localeCompare(a.fechaCreacion);
      });
  }, [reservas, busqueda, filtroEstado, ordenFecha]);

  const guardarEstado = async (reserva: Reserva, estado: EstadoReserva) => {
    try {
      setError('');
      setActualizandoId(reserva.idReserva);
      const actualizada = administrador
        ? await cambiarEstadoReserva(reserva.idReserva, estado)
        : await cancelarMiReserva(reserva.idReserva);
      setReservas((actuales) =>
        actuales.map((item) =>
          item.idReserva === actualizada.idReserva ? actualizada : item,
        ),
      );
      setDetalleAbierto((actual) =>
        actual?.idReserva === actualizada.idReserva ? actualizada : actual,
      );
    } catch (e: unknown) {
      setError(mensajeErrorApi(e, 'No se pudo actualizar la reserva.'));
    } finally {
      setActualizandoId(null);
    }
  };

  const solicitarCambioEstado = (reserva: Reserva, estado: EstadoReserva) => {
    if (['CANCELADA', 'VENCIDA'].includes(estado)) {
      setCambioPendiente({ reserva, estado });
      return;
    }
    void guardarEstado(reserva, estado);
  };

  const confirmarCambioEstado = () => {
    if (!cambioPendiente) return;
    const cambio = cambioPendiente;
    setCambioPendiente(null);
    void guardarEstado(cambio.reserva, cambio.estado);
  };

  const estadoParaConfirmar = cambioPendiente?.estado;

  return (
    <section
      className={`reservas-panel mx-auto mt-6 w-full ${administrador ? 'max-w-6xl' : ''}`}
      aria-label={administrador ? 'Todas las reservas' : 'Mis reservas'}
      tabIndex={-1}
      data-reserva-focus-fallback
    >
      {administrador ? (
        <AdminSectionHeader
          titulo="Reservas de productos"
          descripcion="Revisa productos, clientes y estados de retiro."
          className="mb-5"
        >
          <div className="admin-toolbar admin-toolbar--reservation">
            <label className="admin-toolbar__field">
              Buscar por código o cliente
              <input
                className="vcm-input"
                type="search"
                value={busqueda}
                onChange={(event) => setBusqueda(event.target.value)}
                placeholder="RES-... o correo"
              />
            </label>
            <label className="admin-toolbar__field">
              Estado
              <select
                className="vcm-input"
                value={filtroEstado}
                onChange={(event) => {
                  const estado = ESTADOS_RESERVA.find((opcion) => opcion === event.target.value);
                  setFiltroEstado(estado ?? 'TODOS');
                }}
              >
                <option value="TODOS">Todos los estados</option>
                {ESTADOS_RESERVA.map((estado) => (
                  <option key={estado} value={estado}>{ETIQUETAS_ESTADO[estado]}</option>
                ))}
              </select>
            </label>
            <label className="admin-toolbar__field">
              Ordenar retiro
              <select
                className="vcm-input"
                value={ordenFecha}
                onChange={(event) => setOrdenFecha(event.target.value === 'lejana' ? 'lejana' : 'proxima')}
              >
                <option value="proxima">Fecha más próxima</option>
                <option value="lejana">Fecha más lejana</option>
              </select>
            </label>
          </div>
        </AdminSectionHeader>
      ) : (
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-extrabold">Mis reservas</h2>
            <p className="mt-1 text-sm text-[var(--text-soft)]">
              Consulta el retiro y seguimiento de tus productos reservados.
            </p>
          </div>
          <span className="text-sm font-semibold text-[var(--text-soft)]">
            {reservas.length} {reservas.length === 1 ? 'reserva' : 'reservas'}
          </span>
        </div>
      )}

      {error && <p className="vcm-alert mb-4" role="alert">{error}</p>}

      {cargando && <div className="vcm-spinner py-10">Cargando reservas...</div>}

      {!cargando && reservas.length === 0 && (
        <div className="reserva-empty vcm-card mx-auto max-w-xl px-6 py-10 text-center">
          <div className="reserva-empty-icon mx-auto grid h-16 w-16 place-items-center rounded-full" aria-hidden="true">
            <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
              <path d="M3 3h2l2.4 12.2a2 2 0 0 0 2 1.6h8.8a2 2 0 0 0 2-1.6L22 8H6" />
              <circle cx="10" cy="21" r="1" />
              <circle cx="18" cy="21" r="1" />
              <path d="M12 5h6M15 2v6" />
            </svg>
          </div>
          <h3 className="mt-4 text-lg font-extrabold">
            {administrador ? 'Todavía no hay reservas' : 'Aún no tienes reservas'}
          </h3>
          <p className="mx-auto mt-2 max-w-sm text-sm text-[var(--text-soft)]">
            {administrador
              ? 'Cuando un cliente reserve productos, verás aquí los detalles para gestionar el retiro.'
              : 'Explora los productos UCN y reserva los que quieras retirar en sede.'}
          </p>
          {!administrador && onIrTienda && (
            <button type="button" className="vcm-btn vcm-btn--primary mt-5" onClick={onIrTienda}>
              Ir a la tienda
            </button>
          )}
        </div>
      )}

      {!cargando && reservas.length > 0 && reservasVisibles.length === 0 && (
        <div className="vcm-card px-5 py-8 text-center text-sm text-[var(--text-soft)]">
          No hay reservas que coincidan con la búsqueda y el filtro.
        </div>
      )}

      {!cargando && administrador && reservasVisibles.length > 0 && (
        <div className="reserva-admin-list mx-auto w-full max-w-6xl overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)]">
          <div className="reserva-admin-heading" aria-hidden="true">
            <span>Código</span>
            <span>Cliente</span>
            <span>Retiro</span>
            <span>Ítems</span>
            <span>Total</span>
            <span>Estado</span>
            <span>Acciones</span>
          </div>
          <div className="divide-y divide-[var(--border)]">
            {reservasVisibles.map((reserva) => (
              <article className="reserva-admin-row" key={reserva.idReserva}>
                <div className="reserva-admin-cell">
                  <span className="reserva-admin-label">Código</span>
                  <strong className="break-all font-extrabold text-[var(--vcm-cyan)]">
                    {reserva.codigoReserva}
                  </strong>
                </div>
                <div className="reserva-admin-cell min-w-0">
                  <span className="reserva-admin-label">Cliente</span>
                  <span className="min-w-0">
                    <strong className="block truncate">{reserva.usuario?.nombre ?? 'Cliente sin nombre'}</strong>
                    <span className="block truncate text-xs text-[var(--text-soft)]">
                      {reserva.usuario?.email ?? 'Correo no disponible'}
                    </span>
                  </span>
                </div>
                <div className="reserva-admin-cell">
                  <span className="reserva-admin-label">Retiro</span>
                  <span>
                    <span className="block font-semibold">{mostrarFecha(reserva.fechaRetiro)}</span>
                    {reserva.bloqueHorario && (
                      <span className="block text-xs text-[var(--text-soft)]">{reserva.bloqueHorario}</span>
                    )}
                    {reserva.horario && (
                      <span className="block text-xs text-[var(--text-soft)]">
                        Vendedor: {reserva.horario.vendedor.nombre}
                      </span>
                    )}
                  </span>
                </div>
                <div className="reserva-admin-cell">
                  <span className="reserva-admin-label">Ítems</span>
                  <span>{reserva.items.length} {reserva.items.length === 1 ? 'producto' : 'productos'}</span>
                </div>
                <div className="reserva-admin-cell">
                  <span className="reserva-admin-label">Total</span>
                  <strong>{formatearCLP(reserva.total)}</strong>
                </div>
                <div className="reserva-admin-cell">
                  <span className="reserva-admin-label">Estado</span>
                  <span className={claseEstado(reserva.estado)}>{ETIQUETAS_ESTADO[reserva.estado]}</span>
                </div>
                <div className="reserva-admin-cell reserva-admin-actions">
                  <span className="reserva-admin-label">Acciones</span>
                  <button
                    type="button"
                    className="vcm-btn vcm-btn--surface vcm-btn--sm relative w-full justify-center"
                    onClick={() => setDetalleAbierto(reserva)}
                  >
                    <IconoProductos />
                    <span className="w-full text-center">Ver productos</span>
                  </button>
                  <label className="sr-only" htmlFor={`estado-reserva-${reserva.idReserva}`}>
                    Cambiar estado de {reserva.codigoReserva}
                  </label>
                  <select
                    id={`estado-reserva-${reserva.idReserva}`}
                    className="vcm-input vcm-input--sm w-full"
                    value={reserva.estado}
                    disabled={actualizandoId !== null}
                    onChange={(event) => {
                      const estado = ESTADOS_RESERVA.find((opcion) => opcion === event.target.value);
                      if (estado && estado !== reserva.estado) solicitarCambioEstado(reserva, estado);
                    }}
                  >
                    {opcionesEstado(reserva.estado).map((estado) => (
                      <option key={estado} value={estado}>{ETIQUETAS_ESTADO[estado]}</option>
                    ))}
                  </select>
                </div>
              </article>
            ))}
          </div>
        </div>
      )}

      {!cargando && !administrador && reservasVisibles.length > 0 && (
        <div className="mx-auto grid w-full max-w-4xl gap-4">
          {reservasVisibles.map((reserva) => (
            <article
              className="reserva-client-card vcm-card overflow-hidden p-4 shadow-lg sm:p-5"
              key={reserva.idReserva}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-wider text-[var(--text-soft)]">Código de reserva</p>
                  <h3 className="mt-1 break-all text-lg font-extrabold text-[var(--vcm-cyan)]">
                    {reserva.codigoReserva}
                  </h3>
                </div>
                <span className={claseEstado(reserva.estado)}>{ETIQUETAS_ESTADO[reserva.estado]}</span>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
                <div className="flex min-w-0 items-center gap-2 text-sm">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[var(--primary-soft)] text-[var(--vcm-orange)]">
                    <IconoCalendario />
                  </span>
                  <span>
                    <span className="block text-xs text-[var(--text-soft)]">Fecha de retiro</span>
                    <strong>{mostrarFecha(reserva.fechaRetiro)}</strong>
                    {reserva.bloqueHorario && (
                      <span className="ml-1 text-xs text-[var(--text-soft)]">· {reserva.bloqueHorario}</span>
                    )}
                    {reserva.horario && (
                      <span className="mt-1 block text-xs text-[var(--text-soft)]">
                        Vendedor: {reserva.horario.vendedor.nombre}
                      </span>
                    )}
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <Miniaturas reserva={reserva} />
                  <div className="text-right">
                    <p className="text-xs text-[var(--text-soft)]">
                      {reserva.items.length} {reserva.items.length === 1 ? 'producto' : 'productos'}
                    </p>
                    <strong className="text-lg">{formatearCLP(reserva.total)}</strong>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex justify-end border-t border-[var(--border)] pt-3">
                <button
                  type="button"
                  className="vcm-btn vcm-btn--surface vcm-btn--sm relative w-full justify-center"
                  onClick={() => setDetalleAbierto(reserva)}
                >
                  <IconoProductos />
                  <span className="w-full text-center">Ver productos reservados</span>
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      <ReservaDetalleModal
        reserva={detalleAbierto}
        onCerrar={() => setDetalleAbierto(null)}
        onCancelar={
          !administrador && detalleAbierto?.estado === 'PENDIENTE'
            ? () => solicitarCambioEstado(detalleAbierto, 'CANCELADA')
            : undefined
        }
        cancelando={actualizandoId === detalleAbierto?.idReserva}
      />

      <ReservaModal
        abierto={cambioPendiente !== null}
        tituloId="reserva-cambio-estado-titulo"
        descripcionId="reserva-cambio-estado-descripcion"
        onCerrar={() => setCambioPendiente(null)}
        clase="max-w-md"
      >
        {cambioPendiente && estadoParaConfirmar && (
          <>
            <span className="vcm-eyebrow">Confirmar cambio</span>
            <h2 id="reserva-cambio-estado-titulo" className="mt-2 text-2xl font-extrabold">
              {estadoParaConfirmar === 'CANCELADA' ? '¿Cancelar reserva?' : '¿Marcar como vencida?'}
            </h2>
            <p id="reserva-cambio-estado-descripcion" className="mt-2 text-sm text-[var(--text-soft)]">
              La reserva <strong className="text-[var(--text)]">{cambioPendiente.reserva.codigoReserva}</strong> cambiará a{' '}
              <strong className="text-[var(--text)]">{ETIQUETAS_ESTADO[estadoParaConfirmar]}</strong>.
              {' '}Las unidades apartadas volverán a estar disponibles.
            </p>
            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                className="vcm-btn vcm-btn--surface"
                onClick={() => setCambioPendiente(null)}
                data-modal-initial-focus
              >
                Volver
              </button>
              <button
                type="button"
                className="vcm-btn vcm-btn--danger"
                onClick={confirmarCambioEstado}
              >
                Confirmar cambio
              </button>
            </div>
          </>
        )}
      </ReservaModal>
    </section>
  );
}
