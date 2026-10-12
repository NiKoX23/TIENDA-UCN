import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { formatearCLP } from '../utils/precio';
import { listarInventario, type ItemInventario } from '../services/inventario.service';
import {
    listarRegistroVentas,
    listarRegistroVentasExcel,
    registrarVenta,
    type PayloadRegistrarVenta,
    type RegistroVentaExcelItem,
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

function fechaCorta(iso: string): string {
    if (!iso) return 'Sin fecha';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString('es-CL');
}

type RegistroHistorialVenta = Omit<RegistroVentaExcelItem, 'id' | 'numeroVenta'> & {
    id: string;
    numeroVenta: number | string | null;
    fuente: 'excel' | 'app';
    idFactura?: number;
};

interface BoletaHistorial {
    id: string;
    numeroVenta: number | string | null;
    fecha: string;
    tipoVenta: TipoVenta;
    metodoPago: string;
    fuente: 'excel' | 'app';
    lineas: RegistroHistorialVenta[];
    unidades: number;
    subtotal: number;
    ganancia: number;
}

function combinarRegistros(
    ventasExcel: RegistroVentaExcelItem[],
    ventasApp: RegistroVentaItem[],
): RegistroHistorialVenta[] {
    return [
        ...ventasExcel.map((venta) => ({
            ...venta,
            id: `excel-${venta.id}`,
            fuente: 'excel' as const,
        })),
        ...ventasApp.map((venta) => ({
            id: `app-${venta.idSalida}`,
            idFactura: venta.idFactura,
            numeroVenta: venta.numeroDocumento,
            fecha: venta.fecha,
            producto: venta.producto,
            sku: venta.sku,
            variante: [
                venta.color,
                venta.talla && venta.talla.toLowerCase() !== 'unica' ? venta.talla : '',
            ].filter(Boolean).join(' '),
            cantidad: venta.cantidad,
            metodoPago: venta.metodoPago,
            tipoVenta: venta.tipoVenta,
            subtotal: venta.subtotal,
            ganancia: venta.gananciaTotal,
            fuente: 'app' as const,
        })),
    ];
}

function agruparBoletas(registros: RegistroHistorialVenta[]): BoletaHistorial[] {
    const grupos = new Map<string, RegistroHistorialVenta[]>();
    for (const registro of registros) {
        const clave = registro.fuente === 'app'
            ? `app-${registro.idFactura ?? registro.id}`
            : registro.numeroVenta === null
                ? registro.id
                : `excel-${registro.numeroVenta}`;
        const lineas = grupos.get(clave) ?? [];
        lineas.push(registro);
        grupos.set(clave, lineas);
    }

    return [...grupos.entries()].map(([id, lineas]) => {
        const frecuenciasFecha = new Map<string, number>();
        const frecuenciasPago = new Map<string, number>();
        for (const linea of lineas) {
            if (linea.fecha) frecuenciasFecha.set(linea.fecha, (frecuenciasFecha.get(linea.fecha) ?? 0) + 1);
            if (linea.metodoPago) frecuenciasPago.set(linea.metodoPago, (frecuenciasPago.get(linea.metodoPago) ?? 0) + 1);
        }
        const fecha = [...frecuenciasFecha.entries()].sort((a, b) => b[1] - a[1] || b[0].localeCompare(a[0]))[0]?.[0] ?? '';
        const metodoPago = [...frecuenciasPago.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? '';

        return {
            id,
            numeroVenta: lineas[0].numeroVenta,
            fecha,
            tipoVenta: lineas[0].tipoVenta,
            metodoPago,
            fuente: lineas[0].fuente,
            lineas,
            unidades: lineas.reduce((total, linea) => total + linea.cantidad, 0),
            subtotal: lineas.reduce((total, linea) => total + linea.subtotal, 0),
            ganancia: lineas.reduce((total, linea) => total + linea.ganancia, 0),
        };
    });
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

function ModalVerBoleta({ boleta, onCerrar }: { boleta: BoletaHistorial; onCerrar: () => void }) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={onCerrar}>
            <div
                aria-label="Detalle de boleta"
                aria-modal="true"
                className="theme-dark-surface max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-slate-400/20 bg-slate-900 p-5 shadow-2xl sm:p-7"
                onClick={(event) => event.stopPropagation()}
                role="dialog"
            >
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-400/15 pb-4">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Boleta / factura</p>
                        <h2 className="mt-1 text-xl font-extrabold text-slate-100">
                            Venta {boleta.fuente === 'excel' ? '#' : ''}{boleta.numeroVenta ?? 'sin folio'}
                        </h2>
                    </div>
                    <button className={botonSecundarioCls} onClick={onCerrar} type="button">Cerrar</button>
                </div>

                <dl className="grid grid-cols-2 gap-4 py-4 text-sm sm:grid-cols-3">
                    <div><dt className="text-xs text-slate-500">Fecha</dt><dd className="mt-1 font-medium text-slate-200">{fechaCorta(boleta.fecha)}</dd></div>
                    <div><dt className="text-xs text-slate-500">Tipo de venta</dt><dd className="mt-1 font-medium text-slate-200">{boleta.tipoVenta === 'tac' ? 'TAC' : 'Normal'}</dd></div>
                    <div><dt className="text-xs text-slate-500">Método de pago</dt><dd className="mt-1 font-medium capitalize text-slate-200">{boleta.metodoPago || 'No informado'}</dd></div>
                </dl>

                <div className="overflow-x-auto rounded-lg border border-slate-400/15">
                    <table className="w-full min-w-[600px] border-collapse text-left text-sm">
                        <thead className="border-y border-slate-400/20 bg-slate-400/10 text-[11px] font-bold uppercase tracking-wide text-slate-300">
                            <tr>
                                <th className="px-3 py-2">Producto</th>
                                <th className="px-3 py-2 text-center">Cantidad</th>
                                <th className="px-3 py-2 text-center">Subtotal</th>
                                <th className="px-3 py-2 text-center">Ganancia</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-400/10">
                            {boleta.lineas.map((linea) => (
                                <tr key={linea.id}>
                                    <td className="px-3 py-2">
                                        <p className="font-medium text-slate-200">{linea.producto}</p>
                                        <p className="font-mono text-[10px] text-slate-500">{[linea.sku, linea.variante].filter(Boolean).join(' · ') || '—'}</p>
                                    </td>
                                    <td className="px-3 py-2 text-center tabular-nums text-slate-300">{linea.cantidad}</td>
                                    <td className="px-3 py-2 text-center tabular-nums text-slate-300">{formatearCLP(linea.subtotal)}</td>
                                    <td className="admin-sales-profit px-3 py-2 text-center font-semibold tabular-nums">{formatearCLP(linea.ganancia)}</td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot className="border-t border-slate-400/15 bg-slate-400/5 font-bold text-slate-200">
                            <tr>
                                <td className="px-3 py-3">Total · {boleta.unidades} unidades</td>
                                <td className="px-3 py-3 text-center">{boleta.lineas.length} productos</td>
                                <td className="px-3 py-3 text-center">{formatearCLP(boleta.subtotal)}</td>
                                <td className="admin-sales-profit px-3 py-3 text-center">{formatearCLP(boleta.ganancia)}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>
        </div>
    );
}

export default function VentasTab() {
    const [registro, setRegistro] = useState<RegistroHistorialVenta[]>([]);
    const [productos, setProductos] = useState<ItemInventario[]>([]);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState('');
    const [exito, setExito] = useState('');
    const [modal, setModal] = useState(false);
    const [busqueda, setBusqueda] = useState('');
    const [filtroTipo, setFiltroTipo] = useState('todos');
    const [orden, setOrden] = useState('fecha-desc');
    const [ventasVisibles, setVentasVisibles] = useState(4);
    const [boletaSeleccionada, setBoletaSeleccionada] = useState<BoletaHistorial | null>(null);

    const cargar = async () => {
        try {
            setError('');
            const [excel, app, inv] = await Promise.all([
                listarRegistroVentasExcel(),
                listarRegistroVentas(),
                listarInventario(),
            ]);
            setRegistro(combinarRegistros(excel, app));
            setProductos(inv.filter((p) => p.activo));
        } catch (e) {
            setError(mensajeError(e));
        } finally {
            setCargando(false);
        }
    };

    useEffect(() => {
        let activo = true;
        Promise.all([listarRegistroVentasExcel(), listarRegistroVentas(), listarInventario()])
            .then(([excel, app, inv]) => {
                if (!activo) return;
                setRegistro(combinarRegistros(excel, app));
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
                acc.ganancia += r.ganancia;
                return acc;
            },
            { cantidad: 0, subtotal: 0, ganancia: 0 },
        );
    }, [registro]);
    const boletas = useMemo(() => agruparBoletas(registro), [registro]);

    const ventasFiltradas = useMemo(() => {
        const busquedaNormalizada = busqueda.toLocaleLowerCase('es-CL');
        return boletas
            .filter((boleta) => {
                const productosVenta = boleta.lineas
                    .map((linea) => `${linea.producto} ${linea.sku} ${linea.variante}`)
                    .join(' ');
                const texto = `${boleta.numeroVenta ?? ''} ${productosVenta}`
                    .toLocaleLowerCase('es-CL');
                return texto.includes(busquedaNormalizada)
                    && (filtroTipo === 'todos' || boleta.tipoVenta === filtroTipo);
            })
            .sort((a, b) => {
                if (orden === 'fecha-asc' || orden === 'fecha-desc') {
                    const fechaA = a.fecha ? Date.parse(a.fecha) : Number.NaN;
                    const fechaB = b.fecha ? Date.parse(b.fecha) : Number.NaN;
                    if (Number.isNaN(fechaA) && Number.isNaN(fechaB)) return b.id.localeCompare(a.id);
                    if (Number.isNaN(fechaA)) return 1;
                    if (Number.isNaN(fechaB)) return -1;
                    return orden === 'fecha-asc' ? fechaA - fechaB : fechaB - fechaA;
                }
                if (orden === 'subtotal') return b.subtotal - a.subtotal;
                if (orden === 'cantidad') return b.unidades - a.unidades;
                return (a.lineas[0]?.producto ?? '').localeCompare(b.lineas[0]?.producto ?? '', 'es-CL');
            });
    }, [boletas, busqueda, filtroTipo, orden]);

    const guardar = async (payload: PayloadRegistrarVenta) => {
        try {
            setError('');
            const resultado = await registrarVenta(payload);
            setModal(false);
            setExito(
                `Venta ${payload.tipoVenta.toUpperCase()} registrada · ${resultado.numeroDocumento} · ${formatearCLP(resultado.total)}`,
            );
            const [excel, app, inv] = await Promise.all([
                listarRegistroVentasExcel(),
                listarRegistroVentas(),
                listarInventario(),
            ]);
            setRegistro(combinarRegistros(excel, app));
            setProductos(inv.filter((p) => p.activo));
        } catch (e) {
            setError(mensajeError(e));
        }
    };

    return (
        <div className="mt-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap gap-2 text-xs font-bold">
                    <span className="rounded-full border border-slate-400/15 bg-slate-950/50 px-3 py-1.5 text-slate-300">
                        {boletas.length} boletas · {totales.cantidad} unidades
                    </span>
                    <span className="rounded-full border border-slate-400/15 bg-slate-950/50 px-3 py-1.5 text-slate-300">
                        Ingreso {formatearCLP(totales.subtotal)}
                    </span>
                    <span className="admin-sales-profit-total rounded-full border px-3 py-1.5">
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

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-slate-500">Historial Excel + ventas registradas en la app</p>
                <div className="flex flex-wrap gap-2">
                    <input
                        aria-label="Buscar en el historial de ventas"
                        className="w-44 rounded-md border border-slate-400/20 bg-slate-950/30 px-3 py-2 text-xs text-slate-200 outline-none placeholder:text-slate-500 focus:border-slate-400/50"
                        onChange={(event) => { setBusqueda(event.target.value); setVentasVisibles(4); }}
                        placeholder="Buscar venta o producto"
                        type="search"
                        value={busqueda}
                    />
                    <select aria-label="Filtrar historial por tipo de venta" className="rounded-md border border-slate-400/20 bg-slate-950/30 px-3 py-2 text-xs text-slate-200 outline-none" onChange={(event) => { setFiltroTipo(event.target.value); setVentasVisibles(4); }} value={filtroTipo}>
                        <option value="todos">Todos los tipos</option>
                        <option value="normal">Normal</option>
                        <option value="tac">TAC</option>
                    </select>
                    <select aria-label="Ordenar historial de ventas" className="rounded-md border border-slate-400/20 bg-slate-950/30 px-3 py-2 text-xs text-slate-200 outline-none" onChange={(event) => { setOrden(event.target.value); setVentasVisibles(4); }} value={orden}>
                        <option value="fecha-desc">Fecha reciente</option>
                        <option value="fecha-asc">Fecha antigua</option>
                        <option value="subtotal">Mayor subtotal</option>
                        <option value="cantidad">Mayor cantidad</option>
                        <option value="producto">Producto A-Z</option>
                    </select>
                </div>
            </div>

            {cargando ? (
                <div className="mt-8 text-xs font-bold uppercase tracking-[0.18em] text-slate-100 before:mb-3 before:block before:h-10 before:w-10 before:rounded-full before:border-2 before:border-slate-400/20 before:border-r-violet-600 before:border-t-violet-300 before:animate-spin">
                    Cargando registro de ventas...
                </div>
            ) : (
                <div className="mt-3 overflow-x-auto rounded-lg border border-slate-400/15">
                    <table className="w-full min-w-[820px] border-collapse text-left text-sm">
                        <thead className="border-y border-slate-400/20 bg-slate-400/10 text-[11px] font-bold uppercase tracking-wide text-slate-300">
                            <tr>
                                <th className="px-3 py-2">Boleta</th>
                                <th className="px-3 py-2 text-center">Productos</th>
                                <th className="px-3 py-2 text-center">Unidades</th>
                                <th className="px-3 py-2 text-center">Tipo</th>
                                <th className="px-3 py-2 text-center">Total</th>
                                <th className="px-3 py-2 text-center">Ganancia</th>
                                <th className="px-3 py-2 text-center">Detalle</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-400/10">
                            {ventasFiltradas.slice(0, ventasVisibles).map((boleta) => (
                                <tr className={`hover:bg-slate-400/[0.04] ${boleta.tipoVenta === 'tac' ? 'bg-purple-500/5' : ''}`} key={boleta.id}>
                                    <td className="px-3 py-2">
                                        <p className="font-semibold text-slate-200">{boleta.numeroVenta ? `Venta ${boleta.fuente === 'excel' ? '#' : ''}${boleta.numeroVenta}` : 'Sin folio'}</p>
                                        <p className="text-[10px] text-slate-500">{fechaCorta(boleta.fecha)}</p>
                                    </td>
                                    <td className="px-3 py-2 text-center tabular-nums text-slate-300">{boleta.lineas.length}</td>
                                    <td className="px-3 py-2 text-center font-semibold tabular-nums text-slate-300">{boleta.unidades}</td>
                                    <td className="px-3 py-2 text-center">
                                        <span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${badgeTipo(boleta.tipoVenta)}`}>
                                            {boleta.tipoVenta === 'tac' ? 'TAC' : 'Normal'}
                                        </span>
                                    </td>
                                    <td className="px-3 py-2 text-center font-semibold tabular-nums text-slate-300">{formatearCLP(boleta.subtotal)}</td>
                                    <td className="admin-sales-profit px-3 py-2 text-center font-semibold tabular-nums">{formatearCLP(boleta.ganancia)}</td>
                                    <td className="px-3 py-2 text-center">
                                        <button className={botonSecundarioCls} onClick={() => setBoletaSeleccionada(boleta)} type="button">Ver boleta</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {ventasFiltradas.length === 0 ? (
                        <p className="border-t border-slate-400/10 px-4 py-6 text-center text-sm text-slate-500">
                                No hay boletas que coincidan con estos filtros.
                        </p>
                    ) : ventasVisibles < ventasFiltradas.length && (
                        <div className="flex justify-center border-t border-slate-400/10 py-3">
                            <button className="rounded-md border border-[var(--primary)] bg-[var(--primary)] px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]" onClick={() => setVentasVisibles((actual) => actual + 4)} type="button">
                                Cargar más boletas (+{Math.min(4, ventasFiltradas.length - ventasVisibles)})
                            </button>
                        </div>
                    )}
                </div>
            )}

            {modal && <ModalRegistrarVenta productos={productos} onCerrar={() => setModal(false)} onGuardar={guardar} />}
            {boletaSeleccionada && <ModalVerBoleta boleta={boletaSeleccionada} onCerrar={() => setBoletaSeleccionada(null)} />}
        </div>
    );
}