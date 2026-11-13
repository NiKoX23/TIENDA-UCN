import { useEffect, useState, type FormEvent } from 'react';
import AdminSectionHeader from '../components/AdminSectionHeader';
import ReservaModal from '../reservas/ReservaModal';
import { obtenerIniciales } from '../services/auth.service';
import { mensajeErrorApi } from '../utils/mensajeErrorApi';
import DatePickerField from '../components/pickers/DatePickerField';
import TimePickerField from '../components/pickers/TimePickerField';
import {
  buscarUsuariosVendedores,
  cambiarDisponibilidadHorario,
  crearHorarioVenta,
  crearVendedorBiblioteca,
  eliminarVendedorBiblioteca,
  listarHorariosVenta,
  listarVendedoresBiblioteca,
  type DatosCrearHorario,
  type HorarioVenta,
  type UsuarioElegibleVendedor,
  type VendedorBiblioteca,
} from '../services/horarios-venta.service';

function fechaEnSantiago(): string {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Santiago',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const valores = Object.fromEntries(
    partes.map((parte) => [parte.type, parte.value]),
  );
  return `${valores.year}-${valores.month}-${valores.day}`;
}

function mostrarFecha(fecha: string): string {
  return new Date(`${fecha.slice(0, 10)}T12:00:00`).toLocaleDateString('es-CL', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default function VendedoresTab() {
  const [vendedores, setVendedores] = useState<VendedorBiblioteca[]>([]);
  const [horarios, setHorarios] = useState<HorarioVenta[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [modalVendedor, setModalVendedor] = useState(false);
  const [modalHorario, setModalHorario] = useState(false);
  const [errorModal, setErrorModal] = useState('');
  const [vendedorAEliminar, setVendedorAEliminar] = useState<VendedorBiblioteca | null>(null);
  const [errorEliminar, setErrorEliminar] = useState('');
  const [consultaUsuarios, setConsultaUsuarios] = useState('');
  const [usuariosEncontrados, setUsuariosEncontrados] = useState<UsuarioElegibleVendedor[]>([]);
  const [usuarioSeleccionado, setUsuarioSeleccionado] = useState<UsuarioElegibleVendedor | null>(null);
  const [buscandoUsuarios, setBuscandoUsuarios] = useState(false);
  const [errorBusqueda, setErrorBusqueda] = useState('');
  const [nuevoHorario, setNuevoHorario] = useState<DatosCrearHorario>({
    idVendedor: 0,
    fecha: fechaEnSantiago(),
    horaInicio: '',
    horaTermino: '',
  });
  const [guardando, setGuardando] = useState(false);
  const [eliminandoVendedor, setEliminandoVendedor] = useState<number | null>(null);
  const [cambiandoHorario, setCambiandoHorario] = useState<number | null>(null);
  const [fechaValida, setFechaValida] = useState(true);
  const [horaInicioValida, setHoraInicioValida] = useState(false);
  const [horaTerminoValida, setHoraTerminoValida] = useState(false);

  useEffect(() => {
    let activo = true;
    let enCurso = false;
    const cargarDatos = async (cargaInicial = false) => {
      if (!activo || enCurso) return;
      enCurso = true;
      try {
        const [listaVendedores, listaHorarios] = await Promise.all([
          listarVendedoresBiblioteca(),
          listarHorariosVenta(),
        ]);
        if (!activo) return;
        setVendedores(listaVendedores);
        setHorarios(listaHorarios);
        setError('');
      } catch (e: unknown) {
        if (activo) {
          setError(mensajeErrorApi(e, 'No se pudieron cargar los vendedores y horarios.'));
        }
      } finally {
        enCurso = false;
        if (activo && cargaInicial) setCargando(false);
      }
    };
    const actualizarSiVisible = () => {
      if (document.visibilityState === 'visible') void cargarDatos();
    };
    void cargarDatos(true);
    const intervalo = window.setInterval(actualizarSiVisible, 10000);
    window.addEventListener('focus', actualizarSiVisible);
    document.addEventListener('visibilitychange', actualizarSiVisible);
    return () => {
      activo = false;
      window.clearInterval(intervalo);
      window.removeEventListener('focus', actualizarSiVisible);
      document.removeEventListener('visibilitychange', actualizarSiVisible);
    };
  }, []);

  useEffect(() => {
    const texto = consultaUsuarios.trim();
    if (!modalVendedor || usuarioSeleccionado || texto.length < 3) return;

    let activo = true;
    const temporizador = window.setTimeout(() => {
      setBuscandoUsuarios(true);
      setErrorBusqueda('');
      buscarUsuariosVendedores(texto)
        .then((resultados) => {
          if (activo) setUsuariosEncontrados(resultados);
        })
        .catch((e: unknown) => {
          if (activo) {
            setUsuariosEncontrados([]);
            setErrorBusqueda(mensajeErrorApi(e, 'No se pudo buscar usuarios.'));
          }
        })
        .finally(() => {
          if (activo) setBuscandoUsuarios(false);
        });
    }, 300);
    return () => {
      activo = false;
      window.clearTimeout(temporizador);
    };
  }, [consultaUsuarios, modalVendedor, usuarioSeleccionado]);

  const guardarVendedor = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!usuarioSeleccionado) {
      setErrorModal('Selecciona un usuario registrado para continuar.');
      return;
    }
    try {
      setErrorModal('');
      setGuardando(true);
      const vendedor = await crearVendedorBiblioteca(usuarioSeleccionado.uid);
      setVendedores((actuales) =>
        [...actuales, vendedor].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')),
      );
      setConsultaUsuarios('');
      setUsuarioSeleccionado(null);
      setModalVendedor(false);
    } catch (e: unknown) {
      setErrorModal(mensajeErrorApi(e, 'No se pudo agregar el vendedor.'));
    } finally {
      setGuardando(false);
    }
  };

  const confirmarEliminarVendedor = async () => {
    if (!vendedorAEliminar) return;
    try {
      setErrorEliminar('');
      setError('');
      setEliminandoVendedor(vendedorAEliminar.idVendedor);
      await eliminarVendedorBiblioteca(vendedorAEliminar.idVendedor);
      setVendedores((actuales) =>
        actuales.filter((vendedor) => vendedor.idVendedor !== vendedorAEliminar.idVendedor),
      );
      setHorarios((actuales) =>
        actuales.filter((horario) => horario.idVendedor !== vendedorAEliminar.idVendedor),
      );
      setVendedorAEliminar(null);
    } catch (e: unknown) {
      setErrorEliminar(mensajeErrorApi(e, 'No se pudo eliminar el vendedor.'));
    } finally {
      setEliminandoVendedor(null);
    }
  };

  const guardarHorario = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorModal('');
    if (
      !fechaValida ||
      !horaInicioValida ||
      !horaTerminoValida ||
      rangoHorarioInvalido
    ) {
      return;
    }
    try {
      setErrorModal('');
      setGuardando(true);
      const horario = await crearHorarioVenta(nuevoHorario);
      setHorarios((actuales) =>
        [...actuales, horario].sort((a, b) =>
          `${a.fecha}${a.horaInicio}`.localeCompare(`${b.fecha}${b.horaInicio}`),
        ),
      );
      setNuevoHorario({
        idVendedor: 0,
        fecha: fechaEnSantiago(),
        horaInicio: '',
        horaTermino: '',
      });
      setFechaValida(true);
      setHoraInicioValida(false);
      setHoraTerminoValida(false);
      setModalHorario(false);
    } catch (e: unknown) {
      setErrorModal(mensajeErrorApi(e, 'No se pudo asignar el horario.'));
    } finally {
      setGuardando(false);
    }
  };

  const alternarHorario = async (horario: HorarioVenta) => {
    try {
      setError('');
      setCambiandoHorario(horario.idHorario);
      const actualizado = await cambiarDisponibilidadHorario(
        horario.idHorario,
        !horario.activo,
      );
      setHorarios((actuales) =>
        actuales.map((item) =>
          item.idHorario === actualizado.idHorario ? actualizado : item,
        ),
      );
    } catch (e: unknown) {
      setError(mensajeErrorApi(e, 'No se pudo actualizar la disponibilidad del horario.'));
    } finally {
      setCambiandoHorario(null);
    }
  };

  const vendedoresActivos = vendedores.filter((vendedor) => vendedor.activo);
  const rangoHorarioInvalido = Boolean(
    nuevoHorario.horaInicio &&
    nuevoHorario.horaTermino &&
    nuevoHorario.horaTermino <= nuevoHorario.horaInicio,
  );
  const horariosAEliminar = horarios.filter(
    (horario) => horario.idVendedor === vendedorAEliminar?.idVendedor,
  );

  return (
    <section className="mt-6">
      <AdminSectionHeader
        titulo="Vendedores de biblioteca"
        descripcion="Administra al equipo y asigna turnos presenciales para las reservas."
      >
        <div className="admin-toolbar">
          <button
            type="button"
            className="vcm-btn vcm-btn--surface"
            onClick={() => {
              setErrorModal('');
              setErrorBusqueda('');
              setConsultaUsuarios('');
              setUsuariosEncontrados([]);
              setUsuarioSeleccionado(null);
              setModalVendedor(true);
            }}
          >
            Agregar vendedor
          </button>
          <button
            type="button"
            className="vcm-btn vcm-btn--primary"
            onClick={() => {
              setError('');
              setErrorModal('');
              setNuevoHorario((actual) => ({
                ...actual,
                idVendedor: vendedoresActivos[0]?.idVendedor ?? 0,
                fecha: fechaEnSantiago(),
                horaInicio: '',
                horaTermino: '',
              }));
              setFechaValida(true);
              setHoraInicioValida(false);
              setHoraTerminoValida(false);
              setModalHorario(true);
            }}
            disabled={vendedoresActivos.length === 0}
          >
            Asignar horario
          </button>
        </div>
      </AdminSectionHeader>

      {error && <p className="vcm-alert mb-4" role="alert">{error}</p>}

      <div className="mt-4 grid gap-5 lg:grid-cols-[minmax(260px,0.75fr)_minmax(0,1.5fr)]">
        <section className="vcm-card min-w-0 p-4 sm:p-5" aria-labelledby="vendedores-lista-titulo">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 id="vendedores-lista-titulo" className="text-lg font-extrabold">Vendedores</h3>
          </div>
          {cargando ? (
            <div className="vcm-spinner py-8">Cargando vendedores...</div>
          ) : vendedores.length === 0 ? (
            <p className="py-6 text-center text-sm text-[var(--text-soft)]">
              Aún no hay vendedores registrados.
            </p>
          ) : (
            <ul className="divide-y divide-[var(--border)]">
              {vendedores.map((vendedor) => (
                <li className="flex items-center justify-between gap-3 py-3" key={vendedor.idVendedor}>
                  <span className="flex min-w-0 items-center gap-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[var(--primary-soft)] font-bold text-[var(--vcm-orange)]">
                      {vendedor.nombre.trim().slice(0, 1).toLocaleUpperCase('es-CL')}
                    </span>
                    <span className="min-w-0">
                      <strong className="block truncate">{vendedor.nombre}</strong>
                    </span>
                  </span>
                  <button
                    type="button"
                    className="vcm-btn vcm-btn--danger vcm-btn--sm vendedor-delete-trigger"
                    aria-label={`Eliminar a ${vendedor.nombre}`}
                    onClick={() => {
                      setErrorEliminar('');
                      setVendedorAEliminar(vendedor);
                    }}
                    disabled={eliminandoVendedor !== null}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                      <path d="M4 7h16M10 11v6m4-6v6M6 7l1 14h10l1-14M9 7V4h6v3" />
                    </svg>
                    Eliminar
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="vcm-card min-w-0 p-4 sm:p-5" aria-labelledby="horarios-lista-titulo">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 id="horarios-lista-titulo" className="text-lg font-extrabold">Horarios asignados</h3>
            <span className="text-sm text-[var(--text-soft)]">{horarios.length} turnos</span>
          </div>
          {cargando ? (
            <div className="vcm-spinner py-8">Cargando horarios...</div>
          ) : horarios.length === 0 ? (
            <p className="py-6 text-center text-sm text-[var(--text-soft)]">
              Aún no hay horarios asignados.
            </p>
          ) : (
            <div className="vcm-admin-table-shell overflow-x-auto rounded-[var(--radius)] border border-[var(--border)]">
              <table className="vcm-admin-table w-full min-w-[620px] text-sm">
                <thead className="vcm-thead text-xs uppercase tracking-wider">
                  <tr>
                    <th className="px-3 py-3 text-left">Fecha</th>
                    <th className="px-3 py-3 text-left">Horario</th>
                    <th className="px-3 py-3 text-left">Vendedor</th>
                    <th className="px-3 py-3 text-center">Estado</th>
                    <th className="px-3 py-3 text-center">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {horarios.map((horario) => (
                    <tr key={horario.idHorario}>
                      <td className="px-3 py-3">{mostrarFecha(horario.fecha)}</td>
                      <td className="px-3 py-3 font-semibold tabular-nums">
                        {horario.horaInicio}–{horario.horaTermino}
                      </td>
                      <td className="px-3 py-3">{horario.vendedor.nombre}</td>
                      <td className="px-3 py-3 text-center">
                        <span className={`reserva-status ${horario.activo ? 'reserva-status--lista-para-retiro' : 'reserva-status--cancelada'}`}>
                          {horario.activo ? 'Disponible' : 'Desactivado'}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <button
                          type="button"
                          className="vcm-btn vcm-btn--surface vcm-btn--sm"
                          onClick={() => void alternarHorario(horario)}
                          disabled={cambiandoHorario !== null}
                        >
                          {cambiandoHorario === horario.idHorario
                            ? 'Guardando...'
                            : horario.activo
                              ? 'Desactivar'
                              : 'Activar'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      <ReservaModal
        abierto={modalVendedor}
        tituloId="nuevo-vendedor-titulo"
        onCerrar={() => setModalVendedor(false)}
        clase="max-w-md"
      >
        <form className="space-y-4" onSubmit={(event) => void guardarVendedor(event)}>
          <div>
            <span className="vcm-eyebrow">Equipo de biblioteca</span>
            <h2 id="nuevo-vendedor-titulo" className="mt-2 text-2xl font-extrabold">
              Agregar vendedor
            </h2>
            <p className="mt-1 text-sm text-[var(--text-soft)]">
              Busca una cuenta registrada para asignarla como vendedor.
            </p>
          </div>
          <label className="block space-y-1.5 text-sm font-semibold">
            Buscar por correo o nombre
            <input
              className="vcm-input w-full"
              type="search"
              value={consultaUsuarios}
              onChange={(event) => {
                const texto = event.target.value;
                setConsultaUsuarios(texto);
                setUsuariosEncontrados([]);
                setErrorBusqueda('');
                setBuscandoUsuarios(texto.trim().length >= 3);
              }}
              autoComplete="off"
              placeholder="Escribe al menos 3 caracteres"
              data-modal-initial-focus
            />
          </label>
          {usuarioSeleccionado ? (
            <div className="flex items-center justify-between gap-3 rounded-[var(--radius)] border border-[var(--border-strong)] bg-[var(--surface)] p-3">
              <span className="flex min-w-0 items-center gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[var(--primary-soft)] font-bold text-[var(--vcm-orange)]">
                  {obtenerIniciales(usuarioSeleccionado.nombre, usuarioSeleccionado.email)}
                </span>
                <span className="min-w-0">
                  <strong className="block truncate">{usuarioSeleccionado.nombre}</strong>
                  <span className="block truncate text-xs text-[var(--text-soft)]">
                    {usuarioSeleccionado.email}
                  </span>
                </span>
              </span>
              <button
                type="button"
                className="vcm-btn vcm-btn--surface vcm-btn--sm"
                onClick={() => setUsuarioSeleccionado(null)}
              >
                Quitar
              </button>
            </div>
          ) : consultaUsuarios.trim().length < 3 ? (
            <p className="text-sm text-[var(--text-soft)]">
              Escribe al menos 3 caracteres para buscar.
            </p>
          ) : (
            <div className="min-h-12" aria-live="polite">
              {buscandoUsuarios ? (
                <p className="py-2 text-sm text-[var(--text-soft)]">Buscando usuarios...</p>
              ) : errorBusqueda ? (
                <p className="vcm-alert" role="alert">{errorBusqueda}</p>
              ) : usuariosEncontrados.length > 0 ? (
                <ul className="max-h-56 space-y-1 overflow-y-auto rounded-[var(--radius)] border border-[var(--border)] p-1" role="listbox" aria-label="Usuarios registrados">
                  {usuariosEncontrados.map((usuario) => (
                    <li key={usuario.uid}>
                      <button
                        type="button"
                        className="flex w-full items-center gap-3 rounded-[var(--radius-sm)] p-2 text-left transition-colors hover:bg-[var(--primary-soft)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--vcm-orange)]"
                        role="option"
                        aria-selected="false"
                        onClick={() => {
                          setUsuarioSeleccionado(usuario);
                          setConsultaUsuarios('');
                          setUsuariosEncontrados([]);
                          setErrorModal('');
                        }}
                      >
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[var(--primary-soft)] text-sm font-bold text-[var(--vcm-orange)]">
                          {obtenerIniciales(usuario.nombre, usuario.email)}
                        </span>
                        <span className="min-w-0">
                          <strong className="block truncate text-sm">{usuario.nombre}</strong>
                          <span className="block truncate text-xs text-[var(--text-soft)]">
                            {usuario.email}
                          </span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="py-2 text-sm text-[var(--text-soft)]">
                  No se encontró un usuario registrado con ese correo
                </p>
              )}
            </div>
          )}
          {errorModal && <p className="vcm-alert" role="alert">{errorModal}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" className="vcm-btn vcm-btn--surface" onClick={() => setModalVendedor(false)} disabled={guardando}>
              Cancelar
            </button>
            <button
              type="submit"
              className="vcm-btn vcm-btn--primary"
              disabled={guardando || !usuarioSeleccionado}
            >
              {guardando ? 'Guardando...' : 'Guardar vendedor'}
            </button>
          </div>
        </form>
      </ReservaModal>

      <ReservaModal
        abierto={modalHorario}
        tituloId="asignar-horario-titulo"
        onCerrar={() => setModalHorario(false)}
        clase="max-w-xl"
      >
        <form className="space-y-4" onSubmit={(event) => void guardarHorario(event)}>
          <div>
            <span className="vcm-eyebrow">Ventas presenciales</span>
            <h2 id="asignar-horario-titulo" className="mt-2 text-2xl font-extrabold">
              Asignar horario
            </h2>
            <p className="mt-1 text-sm text-[var(--text-soft)]">
              Los clientes podrán elegir este turno al reservar productos.
            </p>
          </div>
          <label className="block space-y-1.5 text-sm font-semibold">
            Vendedor asignado
            <select
              className="vcm-input w-full"
              value={nuevoHorario.idVendedor || ''}
              onChange={(event) => setNuevoHorario((actual) => ({
                ...actual,
                idVendedor: Number(event.target.value),
              }))}
              required
              data-modal-initial-focus
            >
              <option value="" disabled>Selecciona un vendedor</option>
              {vendedoresActivos.map((vendedor) => (
                <option key={vendedor.idVendedor} value={vendedor.idVendedor}>
                  {vendedor.nombre}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1.5 text-sm font-semibold">
            Fecha de venta presencial
            <DatePickerField
              id="fecha-horario-venta"
              value={nuevoHorario.fecha}
              minDate={fechaEnSantiago()}
              onChange={(fecha) => setNuevoHorario((actual) => ({
                ...actual,
                fecha,
              }))}
              onValidityChange={setFechaValida}
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block space-y-1.5 text-sm font-semibold">
              Hora de inicio
              <TimePickerField
                id="hora-venta-inicio"
                value={nuevoHorario.horaInicio}
                onChange={(horaInicio) => setNuevoHorario((actual) => ({
                  ...actual,
                  horaInicio,
                }))}
                onValidityChange={setHoraInicioValida}
              />
            </label>
            <label className="block space-y-1.5 text-sm font-semibold">
              Hora de término
              <TimePickerField
                id="hora-venta-termino"
                value={nuevoHorario.horaTermino}
                onChange={(horaTermino) => setNuevoHorario((actual) => ({
                  ...actual,
                  horaTermino,
                }))}
                onValidityChange={setHoraTerminoValida}
              />
            </label>
          </div>
          {rangoHorarioInvalido && (
            <p className="vcm-alert" role="alert">
              La hora de término debe ser posterior a la hora de inicio.
            </p>
          )}
          {errorModal && <p className="vcm-alert" role="alert">{errorModal}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" className="vcm-btn vcm-btn--surface" onClick={() => setModalHorario(false)} disabled={guardando}>
              Cancelar
            </button>
            <button
              type="submit"
              className="vcm-btn vcm-btn--primary"
              disabled={
                guardando ||
                vendedoresActivos.length === 0 ||
                !fechaValida ||
                !horaInicioValida ||
                !horaTerminoValida ||
                rangoHorarioInvalido
              }
            >
              {guardando ? 'Asignando...' : 'Asignar horario'}
            </button>
          </div>
        </form>
      </ReservaModal>

      <ReservaModal
        abierto={vendedorAEliminar !== null}
        tituloId="confirmar-eliminar-vendedor-titulo"
        onCerrar={() => {
          if (eliminandoVendedor === null) setVendedorAEliminar(null);
        }}
        clase="max-w-md"
      >
        <div className="vendedor-delete-dialog">
          <div className="vendedor-delete-heading">
            <span className="vendedor-delete-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M12 3 2.8 19h18.4L12 3Z" />
                <path d="M12 9v4m0 3h.01" />
              </svg>
            </span>
            <div>
              <span className="vcm-eyebrow">Confirmación</span>
              <h2 id="confirmar-eliminar-vendedor-titulo" className="mt-1 text-2xl font-extrabold">
                Eliminar vendedor
              </h2>
            </div>
          </div>
          <div className="vendedor-delete-question">
            ¿Deseas eliminar a <strong>{vendedorAEliminar?.nombre}</strong>?
          </div>
          <div className="vendedor-delete-warning">
            <span aria-hidden="true">!</span>
            <p>
              {horariosAEliminar.length > 0
                ? `También se eliminarán ${horariosAEliminar.length} horarios asignados. Las reservas existentes conservarán la hora registrada, pero dejarán de mostrar a este vendedor.`
                : 'No tiene horarios asignados que eliminar.'}
            </p>
          </div>
          {errorEliminar && <p className="vcm-alert" role="alert">{errorEliminar}</p>}
          <div className="vendedor-delete-actions">
            <button
              type="button"
              className="vcm-btn vcm-btn--surface"
              onClick={() => setVendedorAEliminar(null)}
              disabled={eliminandoVendedor !== null}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="vcm-btn vcm-btn--danger vendedor-delete-confirm"
              onClick={() => void confirmarEliminarVendedor()}
              disabled={eliminandoVendedor !== null}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                <path d="M4 7h16M10 11v6m4-6v6M6 7l1 14h10l1-14M9 7V4h6v3" />
              </svg>
              {eliminandoVendedor === vendedorAEliminar?.idVendedor
                ? 'Eliminando...'
                : 'Sí, eliminar'}
            </button>
          </div>
        </div>
      </ReservaModal>
    </section>
  );
}
