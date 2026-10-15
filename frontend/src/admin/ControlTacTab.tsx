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
    'w-full rounded-xl border border-slate-400/20 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 outline-none focus:border-violet-400/60';
const botonSecundarioCls =
    'rounded-xl border border-slate-400/20 bg-slate-950/60 px-3 py-2 text-xs font-bold text-slate-200 transition hover:border-violet-400/50 hover:text-slate-100';
const botonPeligroCls =
    'rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-xs font-bold text-red-200 transition hover:bg-red-500/20';

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
        <div className="mt-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap gap-2 text-xs font-bold">
                    <span className="rounded-full border border-slate-400/15 bg-slate-950/50 px-3 py-1.5 text-slate-300">
                        {documentos.length} documentos
                    </span>
                    <span className="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1.5 text-emerald-300">
                        {resumen.aprobados} aprobados
                    </span>
                    <span className="rounded-full border border-amber-400/30 bg-amber-500/10 px-3 py-1.5 text-amber-200">
                        {resumen.pendientes} pendientes
                    </span>
                    <span className="rounded-full border border-red-400/30 bg-red-500/10 px-3 py-1.5 text-red-200">
                        {resumen.rechazados} rechazados
                    </span>
                </div>
                <div className="flex gap-2">
                    <button type="button" className={botonSecundarioCls} onClick={cargar} disabled={cargando}>
                        {cargando ? 'Cargando...' : 'Refrescar'}
                    </button>
                    <button type="button" className={botonSecundarioCls} onClick={abrirNuevo}>
                        + Nuevo TAC
                    </button>
                </div>
            </div>

            {error && (
                <p className="mt-4 rounded-full border border-red-400/20 bg-red-950/30 px-4 py-3 text-center text-sm text-red-200">
                    {error}
                </p>
            )}
            {exito && (
                <p className="mt-4 rounded-full border border-emerald-400/20 bg-emerald-950/30 px-4 py-3 text-center text-sm text-emerald-200">
                    {exito}
                </p>
            )}

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-slate-500">{documentosFiltrados.length} de {documentos.length} documentos TAC</p>
                <div className="flex flex-wrap gap-2">
                    <input
                        aria-label="Buscar documentos TAC"
                        className="w-full rounded-md border border-slate-400/20 bg-slate-950/30 px-3 py-2 text-xs text-slate-200 outline-none placeholder:text-slate-500 focus:border-slate-400/50 sm:w-48"
                        onChange={(event) => setBusqueda(event.target.value)}
                        placeholder="Buscar TAC o producto"
                        type="search"
                        value={busqueda}
                    />
                    <select
                        aria-label="Filtrar documentos TAC por estado"
                        className="w-full rounded-md border border-slate-400/20 bg-slate-950/30 px-3 py-2 text-xs text-slate-200 outline-none sm:w-auto"
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
                        className="w-full rounded-md border border-slate-400/20 bg-slate-950/30 px-3 py-2 text-xs text-slate-200 outline-none sm:w-auto"
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
                    className="fixed inset-0 z-[200] flex items-center justify-center overflow-y-auto bg-slate-950/65 p-4 backdrop-blur-md"
                    onClick={cerrarFormulario}
                >
                    <form
                        onSubmit={guardarDocumento}
                        onClick={(e) => e.stopPropagation()}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="tac-form-title"
                        className="my-auto max-h-[min(90vh,720px)] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-400/25 bg-slate-900 p-5 shadow-2xl ring-1 ring-white/10"
                    >
                        <header className="mb-5 flex items-start justify-between gap-4 border-b border-slate-400/15 pb-4">
                            <div>
                                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Control administrativo</p>
                                <h2 id="tac-form-title" className="mt-1 text-lg font-bold text-slate-100">
                                    {editando ? `Documento TAC ${editando.nTac}` : 'Nuevo documento TAC'}
                                </h2>
                                {editando?.tieneVenta && (
                                    <p className="mt-1 text-xs text-amber-200">Asociado a venta: producto, cantidad y precio protegidos.</p>
                                )}
                            </div>
                            <button type="button" aria-label="Cerrar documento" className={botonSecundarioCls} onClick={cerrarFormulario}>Cerrar</button>
                        </header>

                        {error && <p className="mb-4 rounded-lg border border-red-400/25 bg-red-950/40 px-3 py-2 text-sm text-red-200">{error}</p>}

                        {modoEdicion ? (
                            <div className="grid gap-4 sm:grid-cols-2">
                                <label className="text-xs font-bold text-slate-300">
                                    N° TAC
                                    <input className={`${inputCls} mt-1`} maxLength={30} value={formulario.nTac} placeholder="Se genera automáticamente" onChange={(e) => setFormulario({ ...formulario, nTac: e.target.value })} />
                                </label>
                                <label className="text-xs font-bold text-slate-300">
                                    Fecha
                                    <input className={`${inputCls} mt-1`} type="date" required value={formulario.fecha} onChange={(e) => setFormulario({ ...formulario, fecha: e.target.value })} />
                                </label>
                                <label className="text-xs font-bold text-slate-300 sm:col-span-2">
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
                                <label className="text-xs font-bold text-slate-300">
                                    Cantidad
                                    <input className={`${inputCls} mt-1`} type="number" min="1" step="1" required disabled={Boolean(editando?.tieneVenta)} value={formulario.cantidad} onChange={(e) => setFormulario({ ...formulario, cantidad: e.target.value })} />
                                </label>
                                <label className="text-xs font-bold text-slate-300">
                                    Precio TAC unitario
                                    <input className={`${inputCls} mt-1`} type="number" min="0" step="1" required disabled={Boolean(editando?.tieneVenta)} value={formulario.precioTac} onChange={(e) => setFormulario({ ...formulario, precioTac: e.target.value })} />
                                </label>
                                <label className="text-xs font-bold text-slate-300">
                                    Responsable
                                    <input className={`${inputCls} mt-1`} maxLength={50} value={formulario.responsable} onChange={(e) => setFormulario({ ...formulario, responsable: e.target.value })} />
                                </label>
                                <label className="text-xs font-bold text-slate-300">
                                    Firma comprador
                                    <select className={`${inputCls} mt-1`} value={formulario.firmaComprador} onChange={(e) => setFormulario({ ...formulario, firmaComprador: e.target.value as FirmaEstado })}>
                                        {ESTADOS_FIRMA.map((estado) => <option key={estado}>{estado}</option>)}
                                    </select>
                                </label>
                                <label className="text-xs font-bold text-slate-300">
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
                                    <div key={etiqueta} className="rounded-lg border border-slate-400/15 bg-slate-500/[0.035] px-3 py-2">
                                        <dt className="text-[11px] text-slate-400">{etiqueta}</dt>
                                        <dd className="mt-1 text-sm font-medium text-slate-100">{valor}</dd>
                                    </div>
                                ))}
                                <div className="rounded-lg border border-slate-400/15 bg-slate-500/[0.035] px-3 py-2">
                                    <dt className="text-[11px] text-slate-400">Firma comprador</dt>
                                    <dd className="mt-1"><span className={badgeFirma(editando.firmaComprador)}>{editando.firmaComprador}</span></dd>
                                </div>
                                <div className="rounded-lg border border-slate-400/15 bg-slate-500/[0.035] px-3 py-2">
                                    <dt className="text-[11px] text-slate-400">Firma vendedor</dt>
                                    <dd className="mt-1"><span className={badgeFirma(editando.firmaVendedor)}>{editando.firmaVendedor}</span></dd>
                                </div>
                            </dl>
                        ) : null}

                        {modoEdicion && <div className="mt-4 border-t border-slate-400/15 pt-4 text-sm text-slate-300">
                            Total del documento <strong className="ml-2 text-slate-100">{formatearCLP(Number(formulario.cantidad) * Number(formulario.precioTac))}</strong>
                        </div>}

                        <footer className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-slate-400/15 pt-4">
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
                <div className="mt-8 text-xs font-bold uppercase tracking-[0.18em] text-slate-100 before:mb-3 before:block before:h-10 before:w-10 before:rounded-full before:border-2 before:border-slate-400/20 before:border-r-violet-600 before:border-t-violet-300 before:animate-spin">
                    Cargando documentos TAC...
                </div>
            ) : (
                <div className="mt-4 overflow-x-auto rounded-lg border border-slate-400/15 bg-slate-950/10">
                    <table className="w-full min-w-[620px] text-sm">
                        <thead className="border-b border-slate-400/15 text-center text-xs text-slate-400">
                            <tr>
                                <th className="px-3 py-3 font-medium">Documento</th>
                                <th className="px-3 py-3 font-medium">Producto</th>
                                <th className="px-3 py-3 font-medium">Total</th>
                                <th className="px-3 py-3 font-medium">Estado</th>
                                <th className="px-3 py-3 font-medium">Acción</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-400/10">
                            {documentosFiltrados.map((d) => (
                                    <tr key={d.idTac} className="h-14 transition-colors hover:bg-slate-500/[0.04]">
                                        <td className="px-3 py-2 text-center">
                                            <span className="block font-mono text-xs font-bold text-slate-100">{d.nTac}</span>
                                            <span className="text-xs text-slate-400">{fechaCorta(d.fecha)}</span>
                                        </td>
                                        <td className="px-3 py-2 text-center">
                                            <span className="block max-w-[260px] truncate font-medium text-slate-100">{d.producto}</span>
                                            <span className="block truncate text-xs text-slate-400">{d.sku} · {d.talla || 'única'}{d.color ? ` · ${d.color}` : ''}</span>
                                        </td>
                                        <td className="px-3 py-2 text-center font-medium tabular-nums text-slate-100">{formatearCLP(d.total)}</td>
                                        <td className="px-3 py-2 text-center"><span className={badgeEstado(d.estado)}>{d.estado}</span></td>
                                        <td className="px-3 py-2 text-center">
                                            <button type="button" className={botonSecundarioCls} onClick={() => verDocumento(d)}>Ver documento</button>
                                        </td>
                                    </tr>
                            ))}
                        </tbody>
                    </table>
                    {documentosFiltrados.length === 0 && (
                        <p className="px-4 py-6 text-center text-sm text-slate-400">
                            {documentos.length === 0 ? 'No hay documentos TAC registrados.' : 'No hay TAC que coincidan con esos filtros.'}
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}