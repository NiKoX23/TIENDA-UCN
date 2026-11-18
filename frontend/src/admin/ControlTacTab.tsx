import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { formatearCLP } from '../utils/precio';
import ArchivoUpload from '../components/ArchivoUpload';
import {
    obtenerConfiguracionArchivos,
    type ConfiguracionArchivos,
} from '../services/archivos.service';
import { useListaPaginada } from '../hooks/useListaPaginada';
import Paginacion from '../components/Paginacion';
import { listarDocumentosTacPaginado, obtenerResumenTac, type ResumenTac } from '../services/listados.service';
import { listarInventario, type ItemInventario } from '../services/inventario.service';
import {
    actualizarDocumentoTac,
    crearDocumentoTac,
    eliminarDocumentoTac,
    urlArchivoDocumentoTac,
    type DocumentoTac,
    type FirmaEstado,
    type PayloadDocumentoTac,
} from '../services/ventas.service';
import { exportarTac } from '../services/export.service';
import AdminSectionHeader from '../components/AdminSectionHeader';

const inputCls =
    'tac-filter-input w-full';
const botonSecundarioCls =
    'tac-secondary-button';
const botonPrimarioCls =
    'tac-primary-button';
const botonPeligroCls =
    'tac-filter-chip tac-filter-chip--danger min-h-9 rounded-lg px-3 text-xs';

function mensajeError(e: unknown): string {
    if (axios.isAxiosError(e)) {
        const msg = (e.response?.data as { message?: string | string[] })?.message;
        if (Array.isArray(msg)) return msg.join(', ');
        if (msg) {
            if (msg.toLowerCase() === 'file too large') {
                return 'El archivo supera el tamaño máximo permitido.';
            }
            return msg;
        }
    }
    return 'Ocurrió un error inesperado.';
}

function badgeEstado(estado: DocumentoTac['estado']) {
    const clave = estado === 'Aprobado' ? 'approved' : estado === 'Pendiente' ? 'pending' : 'rejected';
    return `tac-state-badge tac-state-badge--${clave} rounded-full border px-2.5 py-1 text-xs font-bold`;
}

function inicialesResponsable(nombre: string): string {
    const partes = nombre.trim().split(/\s+/).filter(Boolean);
    if (partes.length === 0) return '';
    return `${partes[0][0]}${partes.length > 1 ? partes[partes.length - 1][0] : ''}`.toLocaleUpperCase('es-CL');
}

function badgeFirma(estado: FirmaEstado) {
    const clave = estado === 'Firmado' ? 'approved' : estado === 'Pendiente' ? 'pending' : 'rejected';
    return `tac-state-badge tac-state-badge--${clave} rounded-full border px-2.5 py-1 text-xs font-semibold`;
}

function fechaCorta(iso: string): string {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString('es-CL');
}

const ESTADOS_FIRMA: FirmaEstado[] = ['Firmado', 'Pendiente', 'Rechazado'];

interface FormularioDocumento {
    nTac: string;
    fecha: string;
    sku: string;
    cantidad: string;
    precioTac: string;
    responsable: string;
    firmaComprador: FirmaEstado;
    firmaVendedor: FirmaEstado;
}

function fechaHoy(): string {
    const hoy = new Date();
    return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;
}

function formularioVacio(): FormularioDocumento {
    return {
        nTac: '',
        fecha: fechaHoy(),
        sku: '',
        cantidad: '1',
        precioTac: '',
        responsable: '',
        firmaComprador: 'Pendiente',
        firmaVendedor: 'Pendiente',
    };
}

function datosFormulario(documento: DocumentoTac): FormularioDocumento {
    return {
        nTac: documento.nTac,
        fecha: documento.fecha.slice(0, 10),
        sku: documento.sku,
        cantidad: String(documento.cantidad),
        precioTac: String(documento.precioTac),
        responsable: documento.responsable ?? '',
        firmaComprador: documento.firmaComprador,
        firmaVendedor: documento.firmaVendedor,
    };
}

export default function ControlTacTab() {
    const [resumen, setResumen] = useState<ResumenTac>({ total: 0, monto: 0, aprobados: 0, pendientes: 0, rechazados: 0 });
    const [inventario, setInventario] = useState<ItemInventario[]>([]);
    const [guardando, setGuardando] = useState(false);
    const [error, setError] = useState('');
    const [exito, setExito] = useState('');
    const [exportando, setExportando] = useState(false);
    const [busqueda, setBusqueda] = useState('');
    const [filtroEstado, setFiltroEstado] = useState<'todos' | DocumentoTac['estado']>('todos');
    const [orden, setOrden] = useState<'fecha-desc' | 'fecha-asc' | 'total' | 'producto'>('fecha-desc');
    const [editando, setEditando] = useState<DocumentoTac | null>(null);
    const [formularioAbierto, setFormularioAbierto] = useState(false);
    const [modoEdicion, setModoEdicion] = useState(false);
    const [formulario, setFormulario] = useState<FormularioDocumento>(formularioVacio);
    const [archivoPdf, setArchivoPdf] = useState<File | null>(null);
    const [configuracionArchivos, setConfiguracionArchivos] = useState<ConfiguracionArchivos | null>(null);
    const [errorConfiguracionArchivos, setErrorConfiguracionArchivos] = useState('');

    // Filtros, orden y página se resuelven en el servidor; la búsqueda se envía tras una breve pausa.
    const lista = useListaPaginada(listarDocumentosTacPaginado, { filtros: { estado: filtroEstado, orden }, busqueda });
    const cargando = lista.cargando;

    const manejarExportar = async () => {
        try {
            setError('');
            setExito('');
            setExportando(true);
            await exportarTac();
            setExito('Documentos TAC exportados correctamente.');
        } catch (e: unknown) {
            setError(mensajeError(e));
        } finally {
            setExportando(false);
        }
    };

    const cargarResumen = async () => {
        try {
            setResumen(await obtenerResumenTac());
        } catch (e) {
            setError(mensajeError(e));
        }
    };

    const cargar = async () => {
        setError('');
        lista.recargar();
        await cargarResumen();
    };

    useEffect(() => {
        let activo = true;
        obtenerResumenTac()
            .then((datos) => {
                if (activo) setResumen(datos);
            })
            .catch((e: unknown) => {
                if (activo) setError(mensajeError(e));
            });
        return () => {
            activo = false;
        };
    }, []);

    useEffect(() => {
        let activo = true;
        obtenerConfiguracionArchivos()
            .then((configuracion) => {
                if (activo) setConfiguracionArchivos(configuracion);
            })
            .catch((e: unknown) => {
                if (activo) setErrorConfiguracionArchivos(mensajeError(e));
            });
        return () => {
            activo = false;
        };
    }, []);

    useEffect(() => {
        listarInventario()
            .then(setInventario)
            .catch((e: unknown) => setError(mensajeError(e)));
    }, []);

    useEffect(() => {
        if (!formularioAbierto) return;
        const overflowAnterior = document.body.style.overflow;
        const cerrarConEscape = (evento: KeyboardEvent) => {
            if (evento.key === 'Escape') setFormularioAbierto(false);
        };
        document.body.style.overflow = 'hidden';
        window.addEventListener('keydown', cerrarConEscape);
        return () => {
            document.body.style.overflow = overflowAnterior;
            window.removeEventListener('keydown', cerrarConEscape);
        };
    }, [formularioAbierto]);

    const abrirNuevo = () => {
        setEditando(null);
        setArchivoPdf(null);
        setFormulario(formularioVacio());
        setModoEdicion(true);
        setFormularioAbierto(true);
        setError('');
        setExito('');
    };

    const verDocumento = (documento: DocumentoTac) => {
        setEditando(documento);
        setArchivoPdf(null);
        setFormulario(datosFormulario(documento));
        setModoEdicion(false);
        setFormularioAbierto(true);
        setError('');
        setExito('');
    };

    const guardarDocumento = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!modoEdicion) return;
        if (!editando && !archivoPdf) {
            setError('Adjunta el archivo PDF del documento TAC para crearlo.');
            return;
        }
        try {
            setError('');
            setExito('');
            setGuardando(true);
            const payload: PayloadDocumentoTac = {
                nTac: formulario.nTac.trim() || undefined,
                fecha: formulario.fecha,
                ...(!editando?.tieneVenta && {
                    sku: formulario.sku,
                    cantidad: Number(formulario.cantidad),
                    precioTac: Number(formulario.precioTac),
                }),
                responsable: formulario.responsable.trim(),
                firmaComprador: formulario.firmaComprador,
                firmaVendedor: formulario.firmaVendedor,
            };
            if (editando) await actualizarDocumentoTac(editando.idTac, payload, archivoPdf ?? undefined);
            else if (archivoPdf) await crearDocumentoTac(payload, archivoPdf);
            lista.recargar();
            await cargarResumen();
            setEditando(null);
            setFormularioAbierto(false);
            setModoEdicion(false);
            setExito(editando ? 'Documento TAC actualizado.' : 'Documento TAC creado.');
        } catch (e) {
            setError(mensajeError(e));
        } finally {
            setGuardando(false);
        }
    };

    const borrarDocumento = async (documento: DocumentoTac) => {
        if (documento.tieneVenta || !window.confirm(`¿Eliminar el documento ${documento.nTac}?`)) return;
        try {
            setError('');
            setExito('');
            await eliminarDocumentoTac(documento.idTac);
            lista.recargar();
            await cargarResumen();
            setFormularioAbierto(false);
            setEditando(null);
            setExito('Documento TAC eliminado.');
        } catch (e) {
            setError(mensajeError(e));
        }
    };

    const varianteSeleccionada = inventario.find((item) => item.sku === formulario.sku);

    const cerrarFormulario = () => {
        setFormularioAbierto(false);
        setModoEdicion(false);
    };

    const errorVisible = error || (lista.error ? mensajeError(lista.error) : '');

    return (
        <div className="tac-control-panel vcm-admin-view mt-6">
            <div className="tac-panel-surface admin-summary-bar flex flex-wrap items-center justify-between gap-4 rounded-2xl border p-4">
                <div className="flex flex-wrap gap-2.5 text-sm font-semibold">
                    <button type="button" aria-pressed={filtroEstado === 'todos'} onClick={() => setFiltroEstado('todos')} className="tac-filter-chip tac-filter-chip--primary">
                        <strong className="text-base tabular-nums">{resumen.total}</strong><span>documentos</span>
                    </button>
                    <button type="button" aria-pressed={filtroEstado === 'Aprobado'} onClick={() => setFiltroEstado(filtroEstado === 'Aprobado' ? 'todos' : 'Aprobado')} className="tac-filter-chip tac-filter-chip--success">
                        <strong className="text-base tabular-nums">{resumen.aprobados}</strong><span>aprobados</span>
                    </button>
                    <button type="button" aria-pressed={filtroEstado === 'Pendiente'} onClick={() => setFiltroEstado(filtroEstado === 'Pendiente' ? 'todos' : 'Pendiente')} className="tac-filter-chip tac-filter-chip--warning">
                        <strong className="text-base tabular-nums">{resumen.pendientes}</strong><span>pendientes</span>
                    </button>
                    <button type="button" aria-pressed={filtroEstado === 'Rechazado'} onClick={() => setFiltroEstado(filtroEstado === 'Rechazado' ? 'todos' : 'Rechazado')} className="tac-filter-chip tac-filter-chip--danger">
                        <strong className="text-base tabular-nums">{resumen.rechazados}</strong><span>rechazados</span>
                    </button>
                </div>
                <div className="admin-toolbar">
                    <button type="button" className={botonSecundarioCls} onClick={() => void manejarExportar()} disabled={exportando}>
                        {exportando ? 'Exportando...' : 'Exportar Excel'}
                    </button>
                    <button type="button" className={botonSecundarioCls} onClick={cargar} disabled={cargando}>
                        {cargando ? 'Cargando...' : 'Refrescar'}
                    </button>
                    <button type="button" className={botonPrimarioCls} onClick={abrirNuevo}>
                        + Nuevo TAC
                    </button>
                </div>
            </div>

            {errorVisible && (
                <p className="tac-feedback--error mt-4 rounded-xl px-4 py-3 text-center text-sm">
                    {errorVisible}
                </p>
            )}
            {exito && (
                <p className="tac-feedback--success mt-4 rounded-xl px-4 py-3 text-center text-sm">
                    {exito}
                </p>
            )}

            <AdminSectionHeader
                titulo="Control TAC"
                descripcion={`${lista.total} de ${resumen.total} documentos TAC`}
                className="mt-5"
            >
                <div className="admin-toolbar admin-toolbar--filters">
                    <input
                        aria-label="Buscar documentos TAC"
                        className="tac-filter-input sm:w-64"
                        onChange={(event) => setBusqueda(event.target.value)}
                        placeholder="Buscar TAC o producto"
                        type="search"
                        value={busqueda}
                    />
                    <select
                        aria-label="Filtrar documentos TAC por estado"
                        className="tac-filter-input sm:w-auto"
                        onChange={(event) => setFiltroEstado(event.target.value as typeof filtroEstado)}
                        value={filtroEstado}
                    >
                        <option value="todos">Todos los estados</option>
                        <option value="Aprobado">Aprobado</option>
                        <option value="Pendiente">Pendiente</option>
                        <option value="Rechazado">Rechazado</option>
                    </select>
                    <select
                        aria-label="Ordenar documentos TAC"
                        className="tac-filter-input sm:w-auto"
                        onChange={(event) => setOrden(event.target.value as typeof orden)}
                        value={orden}
                    >
                        <option value="fecha-desc">Fecha reciente</option>
                        <option value="fecha-asc">Fecha antigua</option>
                        <option value="total">Mayor total</option>
                        <option value="producto">Producto A-Z</option>
                    </select>
                </div>
            </AdminSectionHeader>

            {formularioAbierto && createPortal(
                <div
                    className="tac-dialog-overlay fixed inset-0 z-[200] flex items-center justify-center overflow-y-auto p-4 backdrop-blur-md"
                    onClick={cerrarFormulario}
                >
                    <form
                        onSubmit={guardarDocumento}
                        onClick={(e) => e.stopPropagation()}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="tac-form-title"
                        className="tac-dialog my-auto max-h-[min(90vh,720px)] w-full max-w-2xl overflow-y-auto rounded-2xl p-5 shadow-2xl"
                    >
                        <header className="tac-dialog-header mb-5 flex items-start justify-between gap-4 border-b pb-4">
                            <div>
                                <p className="tac-dialog-label text-[11px] font-bold uppercase tracking-wider">Control administrativo</p>
                                <h2 id="tac-form-title" className="tac-dialog-title mt-1 text-lg font-bold">
                                    {editando ? `Documento TAC ${editando.nTac}` : 'Nuevo documento TAC'}
                                </h2>
                                {editando?.tieneVenta && (
                                    <p className="tac-dialog-label mt-1 text-xs">Asociado a venta: producto, cantidad y precio protegidos.</p>
                                )}
                            </div>
                            <button type="button" aria-label="Cerrar documento" className={botonSecundarioCls} onClick={cerrarFormulario}>Cerrar</button>
                        </header>

                        {error && <p className="tac-feedback--error mb-4 rounded-lg px-3 py-2 text-sm">{error}</p>}

                        {modoEdicion ? (
                            <div className="grid gap-4 sm:grid-cols-2">
                                <label className="tac-dialog-label text-xs font-bold">
                                    N° TAC
                                    <input className={`${inputCls} mt-1`} maxLength={30} value={formulario.nTac} placeholder="Se genera automáticamente" onChange={(e) => setFormulario({ ...formulario, nTac: e.target.value })} />
                                </label>
                                <label className="tac-dialog-label text-xs font-bold">
                                    Fecha
                                    <input className={`${inputCls} mt-1`} type="date" required value={formulario.fecha} onChange={(e) => setFormulario({ ...formulario, fecha: e.target.value })} />
                                </label>
                                <label className="tac-dialog-label text-xs font-bold sm:col-span-2">
                                    Producto / variante
                                    <select
                                        className={`${inputCls} mt-1`}
                                        required
                                        disabled={Boolean(editando?.tieneVenta)}
                                        value={formulario.sku}
                                        onChange={(e) => {
                                            const variante = inventario.find((item) => item.sku === e.target.value);
                                            setFormulario({ ...formulario, sku: e.target.value, precioTac: variante ? String(variante.precioTac) : formulario.precioTac });
                                        }}
                                    >
                                        <option value="">Selecciona una variante</option>
                                        {inventario.map((item) => <option key={item.sku} value={item.sku}>{item.nombre} · {item.sku} · {item.talla || 'única'}{item.color ? ` · ${item.color}` : ''}</option>)}
                                    </select>
                                </label>
                                <label className="tac-dialog-label text-xs font-bold">
                                    Cantidad
                                    <input className={`${inputCls} mt-1`} type="number" min="1" step="1" required disabled={Boolean(editando?.tieneVenta)} value={formulario.cantidad} onChange={(e) => setFormulario({ ...formulario, cantidad: e.target.value })} />
                                </label>
                                <label className="tac-dialog-label text-xs font-bold">
                                    Precio TAC unitario
                                    <input className={`${inputCls} mt-1`} type="number" min="0" step="1" required disabled={Boolean(editando?.tieneVenta)} value={formulario.precioTac} onChange={(e) => setFormulario({ ...formulario, precioTac: e.target.value })} />
                                </label>
                                <label className="tac-dialog-label text-xs font-bold">
                                    Responsable
                                    <input className={`${inputCls} mt-1`} maxLength={50} value={formulario.responsable} onChange={(e) => setFormulario({ ...formulario, responsable: e.target.value })} />
                                </label>
                                <label className="tac-dialog-label text-xs font-bold">
                                    Firma comprador
                                    <select className={`${inputCls} mt-1`} value={formulario.firmaComprador} onChange={(e) => setFormulario({ ...formulario, firmaComprador: e.target.value as FirmaEstado })}>
                                        {ESTADOS_FIRMA.map((estado) => <option key={estado}>{estado}</option>)}
                                    </select>
                                </label>
                                <label className="tac-dialog-label text-xs font-bold">
                                    Firma vendedor
                                    <select className={`${inputCls} mt-1`} value={formulario.firmaVendedor} onChange={(e) => setFormulario({ ...formulario, firmaVendedor: e.target.value as FirmaEstado })}>
                                        {ESTADOS_FIRMA.map((estado) => <option key={estado}>{estado}</option>)}
                                    </select>
                                </label>
                                <div className="sm:col-span-2">
                                    <ArchivoUpload
                                        id="archivo-tac"
                                        tipo="pdf"
                                        etiqueta={editando ? 'PDF del documento TAC' : 'PDF del documento TAC *'}
                                        ayuda={editando?.tieneArchivoPdf
                                            ? 'El PDF actual se conserva si no seleccionas otro.'
                                            : 'El PDF se cifra antes de guardarse en la base de datos.'}
                                        archivo={archivoPdf}
                                        configuracion={configuracionArchivos}
                                        errorConfiguracion={errorConfiguracionArchivos}
                                        alCambiar={setArchivoPdf}
                                    />
                                </div>
                            </div>
                        ) : editando ? (
                            <dl className="grid gap-3 sm:grid-cols-2">
                                {[
                                    ['Fecha', fechaCorta(editando.fecha)],
                                    ['Producto', editando.producto],
                                    ['SKU / variante', [editando.sku, editando.talla, editando.color].filter(Boolean).join(' · ') || 'Única'],
                                    ['Cantidad', String(editando.cantidad)],
                                    ['Precio TAC', formatearCLP(editando.precioTac)],
                                    ['Total', formatearCLP(editando.total)],
                                    ['Responsable', editando.responsable || 'Sin responsable'],
                                ].map(([etiqueta, valor]) => (
                                    <div key={etiqueta} className="tac-dialog-card rounded-lg px-3 py-2">
                                        <dt className="tac-dialog-muted text-[11px]">{etiqueta}</dt>
                                        <dd className="tac-dialog-strong mt-1 text-sm font-medium">{valor}</dd>
                                    </div>
                                ))}
                                <div className="tac-dialog-card rounded-lg px-3 py-2">
                                    <dt className="tac-dialog-muted text-[11px]">Firma comprador</dt>
                                    <dd className="mt-1"><span className={badgeFirma(editando.firmaComprador)}>{editando.firmaComprador}</span></dd>
                                </div>
                                <div className="tac-dialog-card rounded-lg px-3 py-2">
                                    <dt className="tac-dialog-muted text-[11px]">Firma vendedor</dt>
                                    <dd className="mt-1"><span className={badgeFirma(editando.firmaVendedor)}>{editando.firmaVendedor}</span></dd>
                                </div>
                                <div className="tac-dialog-card rounded-lg px-3 py-2 sm:col-span-2">
                                    <dt className="tac-dialog-muted text-[11px]">Archivo adjunto</dt>
                                    <dd className="tac-dialog-strong mt-1 text-sm font-medium">
                                        {editando.tieneArchivoPdf ? (
                                            <a
                                                className="tac-primary-button inline-flex"
                                                href={urlArchivoDocumentoTac(editando.idTac)}
                                                target="_blank"
                                                rel="noreferrer"
                                            >
                                                Abrir PDF
                                            </a>
                                        ) : 'Sin PDF adjunto'}
                                    </dd>
                                </div>
                            </dl>
                        ) : null}

                        {modoEdicion && <div className="tac-dialog-divider tac-dialog-label mt-4 border-t pt-4 text-sm">
                            Total del documento <strong className="tac-dialog-strong ml-2">{formatearCLP(Number(formulario.cantidad) * Number(formulario.precioTac))}</strong>
                        </div>}

                        <footer className="tac-dialog-divider mt-5 flex flex-wrap items-center justify-between gap-2 border-t pt-4">
                            <div>
                                {editando && !editando.tieneVenta && !modoEdicion && <button type="button" className={botonPeligroCls} onClick={() => borrarDocumento(editando)}>Eliminar documento</button>}
                            </div>
                            <div className="flex gap-2">
                                {modoEdicion ? (
                                    <>
                                        <button type="button" className={botonSecundarioCls} onClick={() => editando ? setModoEdicion(false) : cerrarFormulario()}>Cancelar</button>
                                        <button type="submit" className={botonSecundarioCls} disabled={guardando || (!varianteSeleccionada && !editando?.tieneVenta) || (!editando && !archivoPdf)}>{guardando ? 'Guardando...' : editando ? 'Guardar cambios' : 'Crear documento'}</button>
                                    </>
                                ) : editando ? (
                                    <button type="button" className={botonSecundarioCls} onClick={() => setModoEdicion(true)}>Editar documento</button>
                                ) : null}
                            </div>
                        </footer>
                    </form>
                </div>,
                document.body,
            )}

            {cargando && lista.data.length === 0 ? (
                <div className="tac-loading mt-8 text-xs font-bold uppercase tracking-[0.18em] before:mb-3 before:block before:h-10 before:w-10 before:rounded-full before:animate-spin">
                    Cargando documentos TAC...
                </div>
            ) : (
                <>
                <div aria-busy={cargando} className={`vcm-admin-table-shell tac-table-shell mt-3 overflow-x-auto rounded-2xl border shadow-sm transition-opacity ${cargando ? 'opacity-60' : ''}`}>
                    <table className="tac-document-table vcm-admin-table vcm-admin-table--tac w-full min-w-[900px] text-sm">
                        <thead className="sticky top-0 z-10 text-xs uppercase tracking-wide">
                            <tr>
                                <th className="px-5 py-4 text-left font-semibold">Documento</th>
                                <th className="px-5 py-4 text-left font-semibold">Producto</th>
                                <th className="px-5 py-4 text-left font-semibold">Responsable</th>
                                <th className="px-5 py-4 text-right font-semibold">Total</th>
                                <th className="px-5 py-4 text-left font-semibold">Estado</th>
                                <th className="px-5 py-4 text-center font-semibold">Acción</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {lista.data.map((d) => (
                                    <tr key={d.idTac} className="transition-colors">
                                        <td className="whitespace-nowrap px-5 py-4 text-left">
                                            <span className="font-mono text-sm font-bold tac-doc-number">TAC #{d.nTac}</span>
                                        </td>
                                        <td className="max-w-[300px] px-5 py-4 text-left">
                                            <span className="block truncate tac-product-name">{d.producto}</span>
                                        </td>
                                        <td className="px-5 py-4 text-left">
                                            {d.responsable?.trim() ? (
                                                <div className="flex items-center gap-2.5 whitespace-nowrap">
                                                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full tac-avatar text-[11px] font-bold" aria-hidden="true">{inicialesResponsable(d.responsable)}</span>
                                                    <span className="tac-responsible font-medium">{d.responsable}</span>
                                                </div>
                                            ) : <span className="tac-unassigned">Sin asignar</span>}
                                        </td>
                                        <td className="whitespace-nowrap px-5 py-4 text-right font-semibold tabular-nums tac-total">{formatearCLP(d.total)}</td>
                                        <td className="px-5 py-4 text-left"><span className={`${badgeEstado(d.estado)} inline-flex items-center gap-2`}><span className={`tac-status-dot tac-status-dot--${d.estado === 'Aprobado' ? 'approved' : d.estado === 'Pendiente' ? 'pending' : 'rejected'}`} aria-hidden="true" />{d.estado}</span></td>
                                        <td className="px-5 py-4 text-center">
                                            <button type="button" className="tac-secondary-button min-h-9 rounded-lg px-3 text-xs" onClick={() => verDocumento(d)}>Ver documento</button>
                                        </td>
                                    </tr>
                            ))}
                        </tbody>
                    </table>
                    {lista.data.length === 0 && !cargando && (
                        <div className="tac-empty-state px-6 py-12 text-center">
                            <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[var(--bg-800)] text-xl text-[var(--text-soft)]" aria-hidden="true">⌕</div>
                            <p className="mt-3 font-semibold">{resumen.total === 0 ? 'Aún no hay documentos TAC' : 'No encontramos documentos con esos filtros'}</p>
                            <p className="mt-1 text-sm">{resumen.total === 0 ? 'Crea un documento nuevo para verlo aquí.' : 'Prueba con otra búsqueda o estado.'}</p>
                        </div>
                    )}
                </div>
                <Paginacion
                    pagina={lista.pagina}
                    totalPaginas={lista.totalPaginas}
                    total={lista.total}
                    desde={lista.desde}
                    hasta={lista.hasta}
                    mostrarTodos={lista.mostrarTodos}
                    etiqueta="documentos"
                    onCambiar={lista.irA}
                    onAlternarMostrarTodos={lista.alternarMostrarTodos}
                />
                </>
            )}
        </div>
    );
}
