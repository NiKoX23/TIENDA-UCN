import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { formatearCLP } from '../utils/precio';
import { listarInventario, type ItemInventario } from '../services/inventario.service';
import {
    actualizarDocumentoTac,
    crearDocumentoTac,
    eliminarDocumentoTac,
    listarDocumentosTac,
    type DocumentoTac,
    type FirmaEstado,
    type PayloadDocumentoTac,
} from '../services/ventas.service';

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
        if (msg) return msg;
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
    const [documentos, setDocumentos] = useState<DocumentoTac[]>([]);
    const [inventario, setInventario] = useState<ItemInventario[]>([]);
    const [cargando, setCargando] = useState(true);
    const [guardando, setGuardando] = useState(false);
    const [error, setError] = useState('');
    const [exito, setExito] = useState('');
    const [busqueda, setBusqueda] = useState('');
    const [filtroEstado, setFiltroEstado] = useState<'todos' | DocumentoTac['estado']>('todos');
    const [orden, setOrden] = useState<'fecha-desc' | 'fecha-asc' | 'total' | 'producto'>('fecha-desc');
    const [editando, setEditando] = useState<DocumentoTac | null>(null);
    const [formularioAbierto, setFormularioAbierto] = useState(false);
    const [modoEdicion, setModoEdicion] = useState(false);
    const [formulario, setFormulario] = useState<FormularioDocumento>(formularioVacio);

    const cargar = async () => {
        try {
            setError('');
            setDocumentos(await listarDocumentosTac());
        } catch (e) {
            setError(mensajeError(e));
        } finally {
            setCargando(false);
        }
    };

    useEffect(() => {
        let activo = true;
        listarDocumentosTac()
            .then((datos) => {
                if (activo) setDocumentos(datos);
            })
            .catch((e: unknown) => {
                if (activo) setError(mensajeError(e));
            })
            .finally(() => {
                if (activo) setCargando(false);
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

    const resumen = useMemo(() => {
        return documentos.reduce(
            (acc, d) => {
                acc.monto += d.total;
                if (d.estado === 'Aprobado') acc.aprobados += 1;
                if (d.estado === 'Pendiente') acc.pendientes += 1;
                if (d.estado === 'Rechazado') acc.rechazados += 1;
                return acc;
            },
            { monto: 0, aprobados: 0, pendientes: 0, rechazados: 0 },
        );
    }, [documentos]);

    const documentosFiltrados = useMemo(() => {
        const termino = busqueda.trim().toLocaleLowerCase('es-CL');
        return documentos
            .filter((documento) => {
                const texto = [
                    documento.nTac,
                    documento.producto,
                    documento.codigoProducto,
                    documento.sku,
                    documento.talla,
                    documento.color,
                    documento.responsable,
                ].filter(Boolean).join(' ').toLocaleLowerCase('es-CL');
                return texto.includes(termino)
                    && (filtroEstado === 'todos' || documento.estado === filtroEstado);
            })
            .sort((a, b) => {
                if (orden === 'fecha-asc' || orden === 'fecha-desc') {
                    const fechaA = Date.parse(a.fecha);
                    const fechaB = Date.parse(b.fecha);
                    return orden === 'fecha-asc' ? fechaA - fechaB : fechaB - fechaA;
                }
                if (orden === 'total') return b.total - a.total;
                return a.producto.localeCompare(b.producto, 'es-CL');
            });
    }, [documentos, busqueda, filtroEstado, orden]);

    const abrirNuevo = () => {
        setEditando(null);
        setFormulario(formularioVacio());
        setModoEdicion(true);
        setFormularioAbierto(true);
        setError('');
        setExito('');
    };

    const verDocumento = (documento: DocumentoTac) => {
        setEditando(documento);
        setFormulario(datosFormulario(documento));
        setModoEdicion(false);
        setFormularioAbierto(true);
        setError('');
        setExito('');
    };

    const guardarDocumento = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!modoEdicion) return;
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
            const guardado = editando
                ? await actualizarDocumentoTac(editando.idTac, payload)
                : await crearDocumentoTac(payload);
            setDocumentos((actuales) => editando
                ? actuales.map((d) => d.idTac === guardado.idTac ? guardado : d)
                : [guardado, ...actuales]);
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
            setDocumentos((actuales) => actuales.filter((d) => d.idTac !== documento.idTac));
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

    return (
        <div className="tac-control-panel mt-6">
            <div className="tac-panel-surface flex flex-wrap items-center justify-between gap-4 rounded-2xl border p-4">
                <div className="flex flex-wrap gap-2.5 text-sm font-semibold">
                    <button type="button" aria-pressed={filtroEstado === 'todos'} onClick={() => setFiltroEstado('todos')} className="tac-filter-chip tac-filter-chip--primary">
                        <strong className="text-base tabular-nums">{documentos.length}</strong><span>documentos</span>
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
                <div className="flex flex-wrap gap-2">
                    <button type="button" className={botonSecundarioCls} onClick={cargar} disabled={cargando}>
                        {cargando ? 'Cargando...' : 'Refrescar'}
                    </button>
                    <button type="button" className={botonPrimarioCls} onClick={abrirNuevo}>
                        + Nuevo TAC
                    </button>
                </div>
            </div>

            {error && (
                <p className="tac-feedback--error mt-4 rounded-xl px-4 py-3 text-center text-sm">
                    {error}
                </p>
            )}
            {exito && (
                <p className="tac-feedback--success mt-4 rounded-xl px-4 py-3 text-center text-sm">
                    {exito}
                </p>
            )}

            <div className="tac-panel-surface mt-5 flex flex-col gap-3 rounded-2xl border p-4 lg:flex-row lg:items-center lg:justify-between">
                <p className="text-sm text-[var(--text-soft)]">{documentosFiltrados.length} de {documentos.length} documentos TAC</p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(220px,1fr)_auto_auto]">
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
            </div>

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
                                        <button type="submit" className={botonSecundarioCls} disabled={guardando || (!varianteSeleccionada && !editando?.tieneVenta)}>{guardando ? 'Guardando...' : editando ? 'Guardar cambios' : 'Crear documento'}</button>
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

            {cargando ? (
                <div className="tac-loading mt-8 text-xs font-bold uppercase tracking-[0.18em] before:mb-3 before:block before:h-10 before:w-10 before:rounded-full before:animate-spin">
                    Cargando documentos TAC...
                </div>
            ) : (
                <div className="tac-table-shell mt-4 overflow-x-auto rounded-2xl border shadow-sm">
                    <table className="tac-document-table w-full min-w-[900px] text-sm">
                        <thead className="sticky top-0 z-10 text-xs uppercase tracking-wide">
                            <tr>
                                <th className="px-5 py-4 text-left font-semibold">Documento</th>
                                <th className="px-5 py-4 text-left font-semibold">Producto</th>
                                <th className="px-5 py-4 text-left font-semibold">Responsable</th>
                                <th className="px-5 py-4 text-right font-semibold">Total</th>
                                <th className="px-5 py-4 text-left font-semibold">Estado</th>
                                <th className="px-5 py-4 text-left font-semibold">Acción</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {documentosFiltrados.map((d) => (
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
                                        <td className="px-5 py-4 text-left">
                                            <button type="button" className="tac-secondary-button min-h-9 rounded-lg px-3 text-xs" onClick={() => verDocumento(d)}>Ver documento</button>
                                        </td>
                                    </tr>
                            ))}
                        </tbody>
                    </table>
                    {documentosFiltrados.length === 0 && (
                        <div className="tac-empty-state px-6 py-12 text-center">
                            <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[var(--bg-800)] text-xl text-[var(--text-soft)]" aria-hidden="true">⌕</div>
                            <p className="mt-3 font-semibold">{documentos.length === 0 ? 'Aún no hay documentos TAC' : 'No encontramos documentos con esos filtros'}</p>
                            <p className="mt-1 text-sm">{documentos.length === 0 ? 'Crea un documento nuevo para verlo aquí.' : 'Prueba con otra búsqueda o estado.'}</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
