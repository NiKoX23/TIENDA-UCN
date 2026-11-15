import { useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import type { Usuario } from '../services/auth.service';
import BackToStore from '../components/BackToStore';
import AdminSectionHeader from '../components/AdminSectionHeader';
import ConfirmModal from '../components/admin/ConfirmModal';
import RoleSelect from '../components/admin/RoleSelect';
import RowMenu from '../components/admin/RowMenu';
import type { AdminRole } from '../components/admin/adminRoles';
import { BrandBlocks } from '../components/brand/BrandFigures';
import { cambiarRol, eliminarUsuario, type AdminUsuario } from '../services/admin.service';
import { listarUsuariosPaginado } from '../services/listados.service';
import InventarioTab from './InventarioTab';
import DashboardTab from './DashboardTab';
import VentasTab from './VentasTab';
import ControlTacTab from './ControlTacTab';
import { exportarTodo, exportarUsuarios } from '../services/export.service';
import { crearVendedorBiblioteca } from '../services/horarios-venta.service';
import { useListaPaginada } from '../hooks/useListaPaginada';
import Paginacion from '../components/Paginacion';
import ReservasPanel from '../reservas/ReservasPanel';
import VendedoresTab from './VendedoresTab';

interface AdminPanelProps {
    tema: 'dark' | 'light';
    onToggleTema: () => void;
    usuario: Usuario;
}

type TabId = 'inicio' | 'inventario' | 'ventas' | 'tac' | 'reservas' | 'vendedores' | 'usuarios';

const TABS: { id: TabId; label: string }[] = [
    { id: 'inicio', label: 'Inicio' },
    { id: 'inventario', label: 'Inventario' },
    { id: 'ventas', label: 'Ventas' },
    { id: 'tac', label: 'Control TAC' },
    { id: 'reservas', label: 'Reservas' },
    { id: 'vendedores', label: 'Vendedores' },
    { id: 'usuarios', label: 'Usuarios' },
];

const CONTENIDO_TAB: Record<TabId, { titulo: string; descripcion: string }> = {
    inicio: {
        titulo: 'Panel de administración',
        descripcion: 'Indicadores del negocio, productos y alertas de inventario.',
    },
    inventario: {
        titulo: 'Inventario',
        descripcion: 'Revisa y administra productos, tallas y stock replicando la planilla de la tienda.',
    },
    ventas: {
        titulo: 'Registro de ventas',
        descripcion: 'Registra y revisa las ventas de la tienda con separación normal vs TAC.',
    },
    tac: {
        titulo: 'Control TAC',
        descripcion: 'Documentos TAC con el estado de las firmas de comprador y vendedor.',
    },
    reservas: {
        titulo: 'Reservas de productos',
        descripcion: 'Consulta las reservas, sus productos, usuarios y estado de retiro.',
    },
    vendedores: {
        titulo: 'Vendedores de biblioteca',
        descripcion: 'Administra vendedores y asigna horarios para las ventas presenciales.',
    },
    usuarios: {
        titulo: 'Usuarios',
        descripcion: 'Busca usuarios por nombre o correo y gestiona sus roles.',
    },
};

function mensajeError(e: unknown): string {
    if (axios.isAxiosError(e)) {
        const msg = (e.response?.data as { message?: string | string[] })?.message;
        if (Array.isArray(msg)) return msg.join(', ');
        if (msg) return msg;
    }
    if (e instanceof Error && e.message) return e.message;
    return 'Ocurrió un error inesperado.';
}

type FiltroRol = AdminRole | 'todos';
type ClaveOrden = 'nombre' | 'rol';
type Confirmacion = { tipo: 'admin' | 'borrar'; usuario: AdminUsuario };
type ToastAdmin = {
    id: number;
    mensaje: string;
    tono: 'success' | 'error';
    deshacer?: () => Promise<void>;
};

function obtenerRol(persona: AdminUsuario): AdminRole {
    if (persona.esAdmin) return 'admin';
    if (persona.esVendedor) return 'vendedor';
    return 'usuario';
}

function normalizarNombre(nombre: string): string {
    return nombre
        .toLocaleLowerCase('es-CL')
        .replace(/(^|[\s'-])([a-záéíóúüñ])/g, (_coincidencia, separador: string, letra: string) =>
            `${separador}${letra.toLocaleUpperCase('es-CL')}`,
        );
}

export default function AdminPanel({ tema, onToggleTema, usuario }: AdminPanelProps) {
    const [tab, setTab] = useState<TabId>('inicio');
    const [busquedaUsuarios, setBusquedaUsuarios] = useState('');
    const [filtroRol, setFiltroRol] = useState<FiltroRol>('todos');
    const [claveOrden, setClaveOrden] = useState<ClaveOrden>('nombre');
    const [ordenAscendente, setOrdenAscendente] = useState(true);
    const [error, setError] = useState('');
    const [exito, setExito] = useState('');
    const [cambiandoUid, setCambiandoUid] = useState<number | null>(null);
    const [confirmacion, setConfirmacion] = useState<Confirmacion | null>(null);
    const [confirmando, setConfirmando] = useState(false);
    const [toast, setToast] = useState<ToastAdmin | null>(null);
    const [deshaciendo, setDeshaciendo] = useState(false);
    const [mostrarTodosPorFiltro, setMostrarTodosPorFiltro] = useState(false);
    const [exportandoTodo, setExportandoTodo] = useState(false);
    const [exportandoUsuarios, setExportandoUsuarios] = useState(false);
    const toastTimer = useRef<number | null>(null);
    const nextToastId = useRef(0);

    // Página, búsqueda y orden se resuelven en el servidor.
    const lista = useListaPaginada(listarUsuariosPaginado, { filtros: {}, busqueda: busquedaUsuarios });
    const errorVisible = error || (lista.error ? 'No se pudo cargar la lista de usuarios. Revisa tu conexión.' : '');
    const usuariosFiltrados = useMemo(() => lista.data
        .filter((persona) => filtroRol === 'todos' || obtenerRol(persona) === filtroRol)
        .sort((a, b) => {
            const valorA = claveOrden === 'nombre' ? normalizarNombre(a.nombre) : obtenerRol(a);
            const valorB = claveOrden === 'nombre' ? normalizarNombre(b.nombre) : obtenerRol(b);
            return valorA.localeCompare(valorB, 'es-CL') * (ordenAscendente ? 1 : -1);
        }), [claveOrden, filtroRol, lista.data, ordenAscendente]);
    const conteoRoles = useMemo(() => ({
        todos: lista.mostrarTodos ? lista.data.length : lista.total,
        usuario: lista.data.filter((persona) => obtenerRol(persona) === 'usuario').length,
        vendedor: lista.data.filter((persona) => obtenerRol(persona) === 'vendedor').length,
        admin: lista.data.filter((persona) => obtenerRol(persona) === 'admin').length,
    }), [lista.data, lista.mostrarTodos, lista.total]);
    const cantidadResultados = filtroRol === 'todos' ? lista.total : usuariosFiltrados.length;

    useEffect(() => () => {
        if (toastTimer.current !== null) window.clearTimeout(toastTimer.current);
    }, []);

    const mostrarToast = (mensaje: string, tono: ToastAdmin['tono'], deshacer?: () => Promise<void>) => {
        if (toastTimer.current !== null) window.clearTimeout(toastTimer.current);
        const nuevoToast = { id: ++nextToastId.current, mensaje, tono, deshacer };
        setToast(nuevoToast);
        toastTimer.current = window.setTimeout(() => setToast(null), deshacer ? 5000 : 3800);
    };

    const seleccionarFiltroRol = (filtro: FiltroRol) => {
        setFiltroRol(filtro);
        if (filtro !== 'todos' && !lista.mostrarTodos) {
            setMostrarTodosPorFiltro(true);
            lista.alternarMostrarTodos();
        } else if (filtro === 'todos' && mostrarTodosPorFiltro) {
            setMostrarTodosPorFiltro(false);
            lista.alternarMostrarTodos();
        }
    };

    const manejarExportarTodo = async () => {
        try {
            setError('');
            setExito('');
            setExportandoTodo(true);
            await exportarTodo();
            setExito('Reporte unificado exportado correctamente.');
        } catch (e: unknown) {
            setError(mensajeError(e));
        } finally {
            setExportandoTodo(false);
        }
    };

    const manejarExportarUsuarios = async () => {
        try {
            setError('');
            setExito('');
            setExportandoUsuarios(true);
            await exportarUsuarios();
            setExito('Usuarios exportados correctamente.');
        } catch (e: unknown) {
            setError(mensajeError(e));
        } finally {
            setExportandoUsuarios(false);
        }
    };

    const cambiarRolDirecto = async (target: AdminUsuario, nuevoRol: 'usuario' | 'vendedor') => {
        try {
            setError('');
            setCambiandoUid(target.uid);
            if (nuevoRol === 'vendedor') {
                if (target.esVendedor) {
                    await cambiarRol(target.uid, false);
                    lista.recargar();
                    mostrarToast(
                        `${normalizarNombre(target.nombre)} ahora tiene rol de vendedor.`,
                        'success',
                        async () => {
                            await cambiarRol(target.uid, true);
                            lista.recargar();
                        },
                    );
                    return;
                }
                await crearVendedorBiblioteca(target.uid);
                lista.recargar();
                mostrarToast(`${normalizarNombre(target.nombre)} ahora es vendedor.`, 'success');
                return;
            }

            await cambiarRol(target.uid, false);
            lista.recargar();
            mostrarToast(
                `Se quitó el rol de administrador a ${normalizarNombre(target.nombre)}.`,
                'success',
                async () => {
                    await cambiarRol(target.uid, true);
                    lista.recargar();
                },
            );
        } catch (e: unknown) {
            mostrarToast(mensajeError(e), 'error');
        } finally {
            setCambiandoUid(null);
        }
    };

    const solicitarCambioRol = (target: AdminUsuario, nuevoRol: AdminRole) => {
        if (target.uid === usuario.uid || nuevoRol === obtenerRol(target)) return;
        if (nuevoRol === 'admin') {
            setConfirmacion({ tipo: 'admin', usuario: target });
            return;
        }
        if (
            nuevoRol === 'vendedor' &&
            ((target.esAdmin && target.esVendedor) || (!target.esAdmin && !target.esVendedor))
        ) {
            void cambiarRolDirecto(target, 'vendedor');
            return;
        }
        if (nuevoRol === 'usuario' && target.esAdmin && !target.esVendedor) {
            void cambiarRolDirecto(target, 'usuario');
        }
    };

    const borrarUsuario = (target: AdminUsuario) => {
        setConfirmacion({ tipo: 'borrar', usuario: target });
    };

    const confirmarAccion = async () => {
        if (!confirmacion) return;
        const accion = confirmacion;
        try {
            setError('');
            setCambiandoUid(accion.usuario.uid);
            setConfirmando(true);
            if (accion.tipo === 'admin') {
                await cambiarRol(accion.usuario.uid, true);
                lista.recargar();
                setConfirmacion(null);
                mostrarToast(`${normalizarNombre(accion.usuario.nombre)} ahora es administrador.`, 'success');
            } else {
                await eliminarUsuario(accion.usuario.uid);
                lista.recargar();
                setConfirmacion(null);
                mostrarToast(`Se eliminó a ${normalizarNombre(accion.usuario.nombre)}.`, 'success');
            }
        } catch {
            mostrarToast(
                accion.tipo === 'admin'
                    ? `No se pudo cambiar el rol de ${normalizarNombre(accion.usuario.nombre)}.`
                    : `No se pudo eliminar a ${normalizarNombre(accion.usuario.nombre)}.`,
                'error',
            );
        } finally {
            setConfirmando(false);
            setCambiandoUid(null);
        }
    };

    const copiarCorreo = async (target: AdminUsuario) => {
        if (!navigator.clipboard?.writeText) {
            mostrarToast('No se pudo acceder al portapapeles en este navegador.', 'error');
            return;
        }
        try {
            await navigator.clipboard.writeText(target.email);
            mostrarToast('Correo copiado al portapapeles.', 'success');
        } catch {
            mostrarToast('No se pudo copiar el correo.', 'error');
        }
    };

    const deshacerCambio = async () => {
        if (!toast?.deshacer) return;
        const accionDeshacer = toast.deshacer;
        if (toastTimer.current !== null) window.clearTimeout(toastTimer.current);
        setDeshaciendo(true);
        try {
            await accionDeshacer();
            mostrarToast('Cambio deshecho.', 'success');
        } catch (e: unknown) {
            mostrarToast(mensajeError(e), 'error');
        } finally {
            setDeshaciendo(false);
        }
    };

    const alternarOrden = (clave: ClaveOrden) => {
        if (claveOrden === clave) {
            setOrdenAscendente((ascendente) => !ascendente);
        } else {
            setClaveOrden(clave);
            setOrdenAscendente(true);
        }
    };

    return (
        <main className="vcm-page vcm-admin-page flex flex-col items-center px-5 pb-12 pt-8">
            <BackToStore className="mb-8 self-start" />

            <div className="vcm-card w-full max-w-6xl overflow-hidden shadow-2xl">
                <div className="vcm-hero vcm-admin-hero px-8 py-9 max-[480px]:px-5">
                    <BrandBlocks variant="hero" />
                    <div key={tab} className="vcm-hero__content max-w-2xl pr-[12%]">
                        <span className="vcm-eyebrow">Tienda UCN · Administración</span>
                        <h1 className="mt-3 text-3xl font-extrabold tracking-tight max-[480px]:text-2xl">{CONTENIDO_TAB[tab].titulo}</h1>
                        <p className="mt-2 text-sm opacity-90">{CONTENIDO_TAB[tab].descripcion}</p>
                        <div className="admin-hero-meta mt-4 flex flex-wrap items-center gap-3">
                            <p className="text-xs opacity-80"><span>Sesión</span> · {usuario.email}</p>
                            <button
                                type="button"
                                className="vcm-btn vcm-btn--surface vcm-btn--sm admin-export-button"
                                onClick={() => void manejarExportarTodo()}
                                disabled={exportandoTodo}
                                aria-busy={exportandoTodo}
                            >
                                {exportandoTodo ? 'Exportando...' : 'Exportar todo'}
                            </button>
                        </div>
                    </div>
                </div>
                <div className="vcm-bar" aria-hidden="true" />

                <div className="p-8 max-[480px]:p-5">
                    <div className="admin-tabs-scroll">
                        <div className="admin-tabs" role="tablist" aria-label="Secciones del panel">
                            {TABS.map((t) => (
                                <button
                                    key={t.id}
                                    type="button"
                                    role="tab"
                                    aria-selected={tab === t.id}
                                    onClick={() => {
                                        setTab(t.id);
                                        if (t.id === 'usuarios') lista.recargar();
                                    }}
                                    className={`vcm-chip${tab === t.id ? ' vcm-chip--active' : ''}`}
                                >
                                    {t.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {errorVisible && <p className="vcm-alert mt-4 text-center" role="alert">{errorVisible}</p>}
                    {exito && <p className="vcm-alert vcm-alert--success mt-4 text-center" role="status">{exito}</p>}

                    <div key={tab} className="vcm-tab-panel" role="tabpanel">
                        {tab === 'inicio' && (
                            <div className="mt-6">
                                <DashboardTab tema={tema} onToggleTema={onToggleTema} />
                            </div>
                        )}

                        {tab === 'inventario' && <InventarioTab />}

                        {tab === 'ventas' && <VentasTab />}

                        {tab === 'tac' && <ControlTacTab />}

                        {tab === 'reservas' && <ReservasPanel administrador />}

                        {tab === 'vendedores' && <VendedoresTab />}

                        {tab === 'usuarios' && (
                            <>
                                <AdminSectionHeader titulo="Usuarios" className="mt-6">
                                    <div className="admin-users-toolbar">
                                        <label className="admin-users-search">
                                            <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                                                <circle cx="8.8" cy="8.8" r="5.8" stroke="currentColor" strokeWidth="1.6" />
                                                <path d="m13.2 13.2 4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                                            </svg>
                                            <input
                                                type="search"
                                                className="vcm-input vcm-input--sm"
                                                placeholder="Buscar usuario o correo..."
                                                aria-label="Buscar usuarios por nombre o correo"
                                                value={busquedaUsuarios}
                                                onChange={(event) => setBusquedaUsuarios(event.target.value)}
                                            />
                                            {busquedaUsuarios && (
                                                <button
                                                    type="button"
                                                    className="admin-users-search__clear"
                                                    aria-label="Limpiar búsqueda"
                                                    title="Limpiar búsqueda"
                                                    onClick={() => setBusquedaUsuarios('')}
                                                >
                                                    ×
                                                </button>
                                            )}
                                        </label>
                                        <div className="admin-users-filters" role="group" aria-label="Filtrar usuarios por rol">
                                            {([
                                                ['todos', 'Todos', conteoRoles.todos],
                                                ['usuario', 'Usuario', conteoRoles.usuario],
                                                ['vendedor', 'Vendedor', conteoRoles.vendedor],
                                                ['admin', 'Admin', conteoRoles.admin],
                                            ] as const).map(([filtro, etiqueta, conteo]) => (
                                                <button
                                                    key={filtro}
                                                    type="button"
                                                    className="admin-users-filter"
                                                    aria-pressed={filtroRol === filtro}
                                                    onClick={() => seleccionarFiltroRol(filtro)}
                                                >
                                                    {etiqueta}<span>{conteo}</span>
                                                </button>
                                            ))}
                                        </div>
                                        <p className="admin-users-result-count" aria-live="polite">
                                            <strong>{cantidadResultados}</strong> {cantidadResultados === 1 ? 'usuario' : 'usuarios'}
                                        </p>
                                        <button
                                            type="button"
                                            className="vcm-btn vcm-btn--surface vcm-btn--sm admin-users-export"
                                            onClick={() => void manejarExportarUsuarios()}
                                            disabled={exportandoUsuarios}
                                            aria-busy={exportandoUsuarios}
                                        >
                                            {exportandoUsuarios ? 'Exportando...' : 'Exportar Excel'}
                                        </button>
                                    </div>
                                </AdminSectionHeader>

                                {lista.cargando && lista.data.length === 0 ? (
                                    <div className="vcm-spinner mt-8">Cargando usuarios...</div>
                                ) : (
                                    <>
                                        {usuariosFiltrados.length > 0 ? (
                                            <div
                                                aria-busy={lista.cargando}
                                                className={`vcm-admin-table-shell vcm-admin-table-shell--users mt-3 transition-opacity ${lista.cargando ? 'opacity-60' : ''}`}
                                            >
                                                <table className="vcm-admin-table vcm-admin-table--users">
                                                    <thead className="vcm-thead">
                                                        <tr>
                                                            <th aria-sort={claveOrden === 'nombre' ? (ordenAscendente ? 'ascending' : 'descending') : 'none'}>
                                                                <button type="button" className="admin-users-sort" onClick={() => alternarOrden('nombre')}>
                                                                    Usuario
                                                                    <span aria-hidden="true">{claveOrden === 'nombre' ? (ordenAscendente ? '↑' : '↓') : '↕'}</span>
                                                                </button>
                                                            </th>
                                                            <th>Proveedor</th>
                                                            <th aria-sort={claveOrden === 'rol' ? (ordenAscendente ? 'ascending' : 'descending') : 'none'}>
                                                                <button type="button" className="admin-users-sort" onClick={() => alternarOrden('rol')}>
                                                                    Rol
                                                                    <span aria-hidden="true">{claveOrden === 'rol' ? (ordenAscendente ? '↑' : '↓') : '↕'}</span>
                                                                </button>
                                                            </th>
                                                            <th>Acciones</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {usuariosFiltrados.map((persona) => {
                                                            const esTu = persona.uid === usuario.uid;
                                                            const rolActual = obtenerRol(persona);
                                                            const proveedorGoogle = persona.proveedorAuth.toLowerCase().includes('google');
                                                            const nombre = normalizarNombre(persona.nombre);
                                                            const inhabilitado = esTu || cambiandoUid !== null;
                                                            return (
                                                                <tr key={persona.uid}>
                                                                    <td>
                                                                        <div className="admin-user-identity">
                                                                            <span className="admin-user-avatar" aria-hidden="true">
                                                                                {nombre.trim().charAt(0).toLocaleUpperCase('es-CL')}
                                                                            </span>
                                                                            <span className="admin-user-identity__text">
                                                                                <span className="admin-user-identity__name">
                                                                                    {nombre}
                                                                                    {esTu && <span className="admin-user-self">Tú</span>}
                                                                                </span>
                                                                                <span className="admin-user-identity__email">{persona.email}</span>
                                                                            </span>
                                                                        </div>
                                                                    </td>
                                                                    <td>
                                                                        <span className="admin-user-provider">
                                                                            {proveedorGoogle ? (
                                                                                <span className="admin-user-provider__google" aria-hidden="true">G</span>
                                                                            ) : (
                                                                                <svg className="admin-user-provider__icon" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                                                                                    <rect x="3" y="4" width="14" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
                                                                                    <path d="m4 6 6 5 6-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                                                                </svg>
                                                                            )}
                                                                            {proveedorGoogle ? 'Google' : 'Correo'}
                                                                        </span>
                                                                    </td>
                                                                    <td>
                                                                        <RoleSelect
                                                                            id={`admin-user-role-${persona.uid}`}
                                                                            value={rolActual}
                                                                            disabled={inhabilitado}
                                                                            loading={cambiandoUid === persona.uid}
                                                                            title={
                                                                                esTu
                                                                                    ? 'No puedes cambiar tu propio rol'
                                                                                    : persona.esVendedor
                                                                                        ? 'Quitar el rol vendedor elimina sus horarios; gestiona esa acción en Vendedores.'
                                                                                        : persona.esAdmin
                                                                                            ? 'Los administradores no pueden asignarse como vendedores.'
                                                                                            : undefined
                                                                            }
                                                                            disableUserOption={persona.esVendedor}
                                                                            disableVendorOption={persona.esAdmin && !persona.esVendedor}
                                                                            onChange={(rol) => solicitarCambioRol(persona, rol)}
                                                                        />
                                                                    </td>
                                                                    <td>
                                                                        <RowMenu
                                                                            label={nombre}
                                                                            onCopyEmail={() => void copiarCorreo(persona)}
                                                                            onChangeRole={!esTu ? () => document.getElementById(`admin-user-role-${persona.uid}`)?.focus() : undefined}
                                                                            onDelete={!esTu ? () => borrarUsuario(persona) : undefined}
                                                                        />
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            </div>
                                        ) : (
                                            <div className="admin-users-empty" role="status">
                                                <span className="admin-users-empty__icon" aria-hidden="true">
                                                    <svg viewBox="0 0 24 24" fill="none">
                                                        <circle cx="10.8" cy="10.8" r="6.8" stroke="currentColor" strokeWidth="1.7" />
                                                        <path d="m16 16 4 4M8 10.8h5.6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                                                    </svg>
                                                </span>
                                                <h3>No encontramos usuarios</h3>
                                                <p>Prueba con otro nombre, correo o filtro de rol.</p>
                                                <button
                                                    type="button"
                                                    className="vcm-btn vcm-btn--surface vcm-btn--sm"
                                                    onClick={() => {
                                                        setBusquedaUsuarios('');
                                                        seleccionarFiltroRol('todos');
                                                    }}
                                                >
                                                    Limpiar búsqueda y filtros
                                                </button>
                                            </div>
                                        )}
                                        {filtroRol === 'todos' && (
                                            <Paginacion
                                                pagina={lista.pagina}
                                                totalPaginas={lista.totalPaginas}
                                                total={lista.total}
                                                desde={lista.desde}
                                                hasta={lista.hasta}
                                                mostrarTodos={lista.mostrarTodos}
                                                etiqueta="usuarios"
                                                onCambiar={lista.irA}
                                                onAlternarMostrarTodos={lista.alternarMostrarTodos}
                                            />
                                        )}
                                    </>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>
            {toast && (
                <div
                    key={toast.id}
                    className={`admin-users-toast admin-users-toast--${toast.tono}`}
                    role={toast.tono === 'error' ? 'alert' : 'status'}
                    aria-live={toast.tono === 'error' ? 'assertive' : 'polite'}
                >
                    <span>{toast.mensaje}</span>
                    {toast.deshacer && (
                        <button type="button" disabled={deshaciendo} onClick={() => void deshacerCambio()}>
                            {deshaciendo ? 'Deshaciendo...' : 'Deshacer'}
                        </button>
                    )}
                    <button
                        type="button"
                        className="admin-users-toast__close"
                        aria-label="Cerrar notificación"
                        onClick={() => setToast(null)}
                    >
                        ×
                    </button>
                </div>
            )}
            <ConfirmModal
                open={confirmacion !== null}
                titleId="admin-users-confirm-title"
                title={confirmacion?.tipo === 'borrar' ? 'Eliminar usuario' : 'Confirmar rol de administrador'}
                description={
                    confirmacion?.tipo === 'borrar'
                        ? `¿Eliminar a ${normalizarNombre(confirmacion.usuario.nombre)}? Esta acción no se puede deshacer.`
                        : `Al hacer administrador a ${confirmacion ? normalizarNombre(confirmacion.usuario.nombre) : ''}, obtendrá acceso para gestionar usuarios, ventas, inventario y vendedores.`
                }
                confirmText={confirmacion?.tipo === 'borrar' ? 'Eliminar usuario' : 'Hacer administrador'}
                destructive={confirmacion?.tipo === 'borrar'}
                loading={confirmando}
                onCancel={() => {
                    if (!confirmando) setConfirmacion(null);
                }}
                onConfirm={() => void confirmarAccion()}
            >
                {confirmacion?.tipo === 'borrar' && (
                    <div className="admin-confirm-user">
                        <span className="admin-user-avatar" aria-hidden="true">
                            {normalizarNombre(confirmacion.usuario.nombre).trim().charAt(0).toLocaleUpperCase('es-CL')}
                        </span>
                        <span>
                            <strong>{normalizarNombre(confirmacion.usuario.nombre)}</strong>
                            <span>{confirmacion.usuario.email}</span>
                        </span>
                    </div>
                )}
            </ConfirmModal>
        </main>
    );
}
