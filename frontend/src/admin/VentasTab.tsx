import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { formatearCLP } from '../utils/precio';
import { listarInventario, type ItemInventario } from '../services/inventario.service';
import {
    listarRegistroVentas,
    registrarVenta,
    type PayloadRegistrarVenta,
    type RegistroVentaItem,
    type TipoVenta,
} from '../services/ventas.service';

const inputCls =
    'w-full rounded-xl border border-slate-400/20 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 outline-none focus:border-violet-400/60';
const labelCls = 'mb-1 block text-xs font-bold uppercase tracking-wider text-slate-400';
const botonSecundarioCls =
    'rounded-xl border border-slate-400/20 bg-slate-950/60 px-3 py-2 text-xs font-bold text-slate-200 transition hover:border-violet-400/50 hover:text-slate-100';
const botonPrimarioCls =
    'rounded-xl bg-gradient-to-r from-violet-600 to-cyan-500 px-4 py-2 text-xs font-bold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50';

function mensajeError(e: unknown): string {
    if (axios.isAxiosError(e)) {
        const msg = (e.response?.data as { message?: string | string[] })?.message;
        if (Array.isArray(msg)) return msg.join(', ');
        if (msg) return msg;
    }
    return 'Ocurrió un error inesperado.';
}

function badgeTipo(tipo: TipoVenta) {
    return tipo === 'tac'
        ? 'border-purple-400/40 bg-purple-500/20 text-purple-200'
        : 'border-slate-400/30 bg-slate-500/15 text-slate-300';
}

function badgeAprobado(valor: NonNullable<RegistroVentaItem['tacAprobado']>) {
    const estilos: Record<string, string> = {
        Si: 'border-emerald-400/40 bg-emerald-500/20 text-emerald-200',
        Pendiente: 'border-amber-400/40 bg-amber-500/20 text-amber-200',
        No: 'border-red-400/40 bg-red-500/20 text-red-200',
    };
    return `rounded-full border px-2.5 py-1 text-xs font-bold ${estilos[valor]}`;
}

function fechaCorta(iso: string): string {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString('es-CL');
}

interface ModalRegistrarProps {
    productos: ItemInventario[];
    onCerrar: () => void;
    onGuardar: (payload: PayloadRegistrarVenta) => void;
}

function ModalRegistrarVenta({ productos, onCerrar, onGuardar }: ModalRegistrarProps) {
    const [sku, setSku] = useState('');
    const [fecha, setFecha] = useState('');
    const [cantidad, setCantidad] = useState('1');
    const [metodoPago, setMetodoPago] = useState('efectivo');
    const [tipoVenta, setTipoVenta] = useState<TipoVenta>('normal');
    const [numeroTac, setNumeroTac] = useState('');
    const [observaciones, setObservaciones] = useState('');

    const producto = productos.find((p) => p.sku === sku);
    const cantidadNum = Number(cantidad);
    const cantidadValida = cantidadNum >= 1;
    const stockSuficiente = producto ? cantidadNum <= producto.stock : false;
    const precio = producto
        ? tipoVenta === 'tac'
            ? producto.precioTac
            : producto.precioVenta
        : 0;
    const subtotal = producto && cantidadValida ? precio * cantidadNum : 0;
    const gananciaUnitaria =
        producto && tipoVenta === 'normal' ? producto.precioVenta - producto.precioTac : 0;
    const puedeGuardar = Boolean(producto && cantidadValida && stockSuficiente);

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
            onClick={onCerrar}
        >
            <div
                className="theme-dark-surface max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-slate-400/20 bg-slate-900 p-6 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                <h2 className="text-lg font-extrabold tracking-tight">Registrar venta</h2>
                <p className="mt-1 text-sm text-slate-400">
                    La venta descuenta stock y genera el registro en la planilla del dashboard.
                </p>

                <div className="mt-4 space-y-4">
                    <div>
                        <label htmlFor="venta-producto" className={labelCls}>
                            Producto
                        </label>
                        <select
                            id="venta-producto"
                            className={inputCls}
                            value={sku}
                            onChange={(e) => setSku(e.target.value)}
                        >
                            <option value="">Selecciona un producto...</option>
                            {productos.map((p) => (
                                <option key={p.sku} value={p.sku}>
                                    {p.nombre} · talla {p.talla || 'única'}
                                    {p.color ? ` · ${p.color}` : ''} · {p.sku} (stock {p.stock})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label htmlFor="venta-cantidad" className={labelCls}>
                                Cantidad
                            </label>
                            <input
                                id="venta-cantidad"
                                type="number"
                                min={1}
                                className={inputCls}
                                value={cantidad}
                                onChange={(e) => setCantidad(e.target.value)}
                            />
                        </div>
                        <div>
                            <label htmlFor="venta-fecha" className={labelCls}>
                                Fecha (opcional)
                            </label>
                            <input
                                id="venta-fecha"
                                type="date"
                                className={inputCls}
                                value={fecha}
                                onChange={(e) => setFecha(e.target.value)}
                            />
                        </div>
                    </div>

                    <div>
                        <label htmlFor="venta-metodo" className={labelCls}>
                            Método de pago
                        </label>
                        <input
                            id="venta-metodo"
                            type="text"
                            className={inputCls}
                            value={metodoPago}
                            onChange={(e) => setMetodoPago(e.target.value)}
                        />
                    </div>

                    <div>
                        <span className={labelCls}>Tipo de venta</span>
                        <div className="flex gap-2">
                            {(['normal', 'tac'] as TipoVenta[]).map((t) => (
                                <button
                                    key={t}
                                    type="button"
                                    onClick={() => setTipoVenta(t)}
                                    className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
                                        tipoVenta === t
                                            ? 'bg-gradient-to-r from-violet-600 to-cyan-500 text-white'
                                            : 'border border-slate-400/20 bg-slate-950/50 text-slate-300 hover:border-violet-400/50'
                                    }`}
                                >
                                    {t === 'tac' ? 'TAC' : 'Normal'}
                                </button>
                            ))}
                        </div>
                    </div>

                    {tipoVenta === 'tac' && (
                        <div>
                            <label htmlFor="venta-tac" className={labelCls}>
                                N° documento TAC (opcional)
                            </label>
                            <input
                                id="venta-tac"
                                type="text"
                                className={inputCls}
                                placeholder="Se genera automáticamente si se deja vacío"
                                value={numeroTac}
                                onChange={(e) => setNumeroTac(e.target.value)}
                            />
                        </div>
                    )}

                    <div>
                        <label htmlFor="venta-obs" className={labelCls}>
                            Observaciones (opcional)
                        </label>
                        <input
                            id="venta-obs"
                            type="text"
                            className={inputCls}
                            value={observaciones}
                            onChange={(e) => setObservaciones(e.target.value)}
                        />
                    </div>
                </div>

                {producto && cantidadValida && (
                    <div className="mt-4 space-y-1 rounded-2xl border border-slate-400/15 bg-slate-950/50 p-4 text-sm">
                        <p className="flex justify-between">
                            <span className="text-slate-400">Precio unitario aplicado</span>
                            <span className="font-semibold text-slate-100">
                                {formatearCLP(precio)}
                                {tipoVenta === 'tac' ? ' (TAC)' : ''}
                            </span>
                        </p>
                        <p className="flex justify-between">
                            <span className="text-slate-400">Ganancia unitaria</span>
                            <span className="font-semibold text-slate-100">
                                {tipoVenta === 'tac' ? formatearCLP(0) : formatearCLP(gananciaUnitaria)}
                            </span>
                        </p>
                        <p className="flex justify-between border-t border-slate-400/10 pt-1">
                            <span className="text-slate-400">Subtotal</span>
                            <span className="font-extrabold text-white">{formatearCLP(subtotal)}</span>
                        </p>
                        {!stockSuficiente && (
                            <p className="text-xs font-bold text-red-300">
                                Stock insuficiente (disponible: {producto.stock}).
                            </p>
                        )}
                    </div>
                )}

                <div className="mt-5 flex justify-end gap-2">
                    <button type="button" className={botonSecundarioCls} onClick={onCerrar}>
                        Cancelar
                    </button>
                    <button
                        type="button"
                        className={botonPrimarioCls}
                        disabled={!puedeGuardar}
                        onClick={() =>
                            onGuardar({
                                sku,
                                cantidad: cantidadNum,
                                metodoPago: metodoPago.trim() || 'efectivo',
                                tipoVenta,
                                numeroTac: numeroTac.trim() || undefined,
                                observaciones: observaciones.trim() || undefined,
                                fecha: fecha || undefined,
                            })
                        }
                    >
                        Registrar venta
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function VentasTab() {
    const [registro, setRegistro] = useState<RegistroVentaItem[]>([]);
    const [productos, setProductos] = useState<ItemInventario[]>([]);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState('');
    const [exito, setExito] = useState('');
    const [modal, setModal] = useState(false);

    const cargar = async () => {
        try {
            setError('');
            const [reg, inv] = await Promise.all([listarRegistroVentas(), listarInventario()]);
            setRegistro(reg);
            setProductos(inv.filter((p) => p.activo));
        } catch (e) {
            setError(mensajeError(e));
        } finally {
            setCargando(false);
        }
    };

    useEffect(() => {
        let activo = true;
        Promise.all([listarRegistroVentas(), listarInventario()])
            .then(([reg, inv]) => {
                if (!activo) return;
                setRegistro(reg);
                setProductos(inv.filter((p) => p.activo));
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

    const totales = useMemo(() => {
        return registro.reduce(
            (acc, r) => {
                acc.cantidad += r.cantidad;
                acc.subtotal += r.subtotal;
                acc.ganancia += r.gananciaTotal;
                return acc;
            },
            { cantidad: 0, subtotal: 0, ganancia: 0 },
        );
    }, [registro]);

    const guardar = async (payload: PayloadRegistrarVenta) => {
        try {
            setError('');
            const resultado = await registrarVenta(payload);
            setModal(false);
            setExito(
                `Venta ${payload.tipoVenta.toUpperCase()} registrada · ${resultado.numeroDocumento} · ${formatearCLP(resultado.total)}`,
            );
            await Promise.all([listarRegistroVentas().then(setRegistro), listarInventario().then((inv) => setProductos(inv.filter((p) => p.activo)))]);
        } catch (e) {
            setError(mensajeError(e));
        }
    };

    return (
        <div className="mt-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap gap-2 text-xs font-bold">
                    <span className="rounded-full border border-slate-400/15 bg-slate-950/50 px-3 py-1.5 text-slate-300">
                        {registro.length} líneas · {totales.cantidad} unidades
                    </span>
                    <span className="rounded-full border border-slate-400/15 bg-slate-950/50 px-3 py-1.5 text-slate-300">
                        Ingreso {formatearCLP(totales.subtotal)}
                    </span>
                    <span className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1.5 text-emerald-200">
                        Ganancia {formatearCLP(totales.ganancia)}
                    </span>
                </div>
                <div className="flex gap-2">
                    <button type="button" className={botonSecundarioCls} onClick={cargar} disabled={cargando}>
                        {cargando ? 'Cargando...' : 'Refrescar'}
                    </button>
                    <button type="button" className={botonPrimarioCls} onClick={() => setModal(true)} disabled={productos.length === 0}>
                        + Registrar venta
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

            {cargando ? (
                <div className="mt-8 text-xs font-bold uppercase tracking-[0.18em] text-slate-100 before:mb-3 before:block before:h-10 before:w-10 before:rounded-full before:border-2 before:border-slate-400/20 before:border-r-violet-600 before:border-t-violet-300 before:animate-spin">
                    Cargando registro de ventas...
                </div>
            ) : (
                <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-400/15">
                    <table className="w-full text-left text-sm">
                        <thead className="theme-dark-surface bg-slate-950/50 text-xs uppercase tracking-wider text-slate-400">
                            <tr>
                                <th className="px-4 py-3">Venta</th>
                                <th className="px-4 py-3">Producto</th>
                                <th className="px-4 py-3 text-right">Cantidad</th>
                                <th className="px-4 py-3">Pago</th>
                                <th className="px-4 py-3">Tipo</th>
                                <th className="px-4 py-3">N° TAC</th>
                                <th className="px-4 py-3">TAC</th>
                                <th className="px-4 py-3 text-right">Precio unit</th>
                                <th className="px-4 py-3 text-right">Subtotal</th>
                                <th className="px-4 py-3 text-right">Ganancia total</th>
                                <th className="px-4 py-3">Obs.</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-400/10">
                            {registro.map((r) => (
                                <tr
                                    key={r.idSalida}
                                    className={r.tipoVenta === 'tac' ? 'bg-purple-500/5' : ''}
                                >
                                    <td className="px-4 py-3">
                                        <p className="font-semibold text-slate-100">{r.numeroDocumento}</p>
                                        <p className="text-xs text-slate-400">{fechaCorta(r.fecha)}</p>
                                    </td>
                                    <td className="px-4 py-3">
                                        <p className="text-slate-100">{r.producto}</p>
                                        <p className="text-xs text-slate-400">
                                            {r.sku} · talla {r.talla || 'única'}
                                            {r.color ? ` · ${r.color}` : ''}
                                        </p>
                                    </td>
                                    <td className="px-4 py-3 text-right font-semibold text-slate-100">{r.cantidad}</td>
                                    <td className="px-4 py-3 capitalize text-slate-300">{r.metodoPago}</td>
                                    <td className="px-4 py-3">
                                        <span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${badgeTipo(r.tipoVenta)}`}>
                                            {r.tipoVenta === 'tac' ? 'TAC' : 'Normal'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 font-mono text-xs text-slate-300">{r.numeroTac ?? '—'}</td>
                                    <td className="px-4 py-3">
                                        {r.tacAprobado ? (
                                            <span className={badgeAprobado(r.tacAprobado)}>{r.tacAprobado}</span>
                                        ) : (
                                            <span className="text-xs text-slate-500">—</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-right text-slate-200">
                                        {formatearCLP(r.precioUnitarioAplicado)}
                                    </td>
                                    <td className="px-4 py-3 text-right font-semibold text-slate-100">
                                        {formatearCLP(r.subtotal)}
                                    </td>
                                    <td className={`px-4 py-3 text-right font-semibold ${r.tipoVenta === 'tac' ? 'text-slate-400' : 'text-emerald-200'}`}>
                                        {formatearCLP(r.gananciaTotal)}
                                    </td>
                                    <td className="max-w-[140px] truncate px-4 py-3 text-xs text-slate-400" title={r.observaciones ?? ''}>
                                        {r.observaciones || '—'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot className="theme-dark-surface bg-slate-950/50 text-sm">
                            <tr>
                                <td className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-400" colSpan={6}>
                                    Totales
                                </td>
                                <td className="px-4 py-3 text-xs font-bold text-slate-300" colSpan={1}></td>
                                <td className="px-4 py-3"></td>
                                <td className="px-4 py-3 text-right font-bold text-slate-100">
                                    {formatearCLP(totales.subtotal)}
                                </td>
                                <td className="px-4 py-3 text-right font-bold text-emerald-200">
                                    {formatearCLP(totales.ganancia)}
                                </td>
                                <td className="px-4 py-3"></td>
                            </tr>
                        </tfoot>
                    </table>
                    {registro.length === 0 && (
                        <p className="px-4 py-6 text-center text-sm text-slate-400">
                            Aún no hay ventas registradas.
                        </p>
                    )}
                </div>
            )}

            {modal && <ModalRegistrarVenta productos={productos} onCerrar={() => setModal(false)} onGuardar={guardar} />}
        </div>
    );
}