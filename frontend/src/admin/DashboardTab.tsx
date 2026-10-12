import { useEffect, useState } from 'react';
import axios from 'axios';
import { formatearCLP } from '../utils/precio';
import {
    obtenerResumen,
    type AlertaStock,
    type ResumenDashboard,
} from '../services/dashboard.service';

const botonSecundarioCls =
    'rounded-xl border border-slate-400/20 bg-slate-950/60 px-3 py-2 text-xs font-bold text-slate-200 transition hover:border-violet-400/50 hover:text-slate-100';

function num(n: number): string {
    return n.toLocaleString('es-CL');
}

function pct(n: number): string {
    return `${n.toLocaleString('es-CL', { maximumFractionDigits: 1 })} %`;
}

interface KpiCardProps {
    etiqueta: string;
    valor: string;
    acento?: boolean;
}

function KpiCard({ etiqueta, valor, acento }: KpiCardProps) {
    return (
        <div className="rounded-lg border border-slate-400/15 bg-slate-950/25 px-4 py-3">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{etiqueta}</p>
            <p className={`mt-1 text-xl font-extrabold ${acento ? 'text-violet-300' : 'text-slate-100'}`}>{valor}</p>
        </div>
    );
}

function badgeEstado(estado: AlertaStock['estado'] | 'AGOTADO') {
    const estilos: Record<AlertaStock['estado'], string> = {
        CRITICO: 'border-red-400/40 bg-red-500/20 text-red-200',
        BAJO: 'border-amber-400/40 bg-amber-500/20 text-amber-200',
        NORMAL: 'border-emerald-400/40 bg-emerald-500/20 text-emerald-200',
        ALTO: 'border-cyan-400/40 bg-cyan-500/20 text-cyan-200',
    };
    if (estado === 'AGOTADO') return 'rounded-full border px-2.5 py-1 text-xs font-bold admin-inventory-status--empty';
    return `rounded-full border px-2.5 py-1 text-xs font-bold ${estilos[estado]}`;
}

function TituloSeccion({ children }: { children: string }) {
    return <h2 className="text-base font-extrabold uppercase tracking-wide text-slate-200">{children}</h2>;
}

function mensajeError(e: unknown): string {
    if (axios.isAxiosError(e)) {
        const msg = (e.response?.data as { message?: string | string[] })?.message;
        if (Array.isArray(msg)) return msg.join(', ');
        if (msg) return msg;
    }
    return 'No se pudo cargar el resumen. Revisa tu conexión.';
}

interface DashboardTabProps {
    tema: 'dark' | 'light';
    onToggleTema: () => void;
}

export default function DashboardTab({ tema, onToggleTema }: DashboardTabProps) {
    const [resumen, setResumen] = useState<ResumenDashboard | null>(null);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState('');
    const [busquedaProducto, setBusquedaProducto] = useState('');
    const [ordenProducto, setOrdenProducto] = useState('nombre');
    const [productosVisibles, setProductosVisibles] = useState(4);
    const [busquedaAlerta, setBusquedaAlerta] = useState('');
    const [filtroAlerta, setFiltroAlerta] = useState('todos');
    const [ordenAlerta, setOrdenAlerta] = useState('prioridad');
    const [alertasVisibles, setAlertasVisibles] = useState(4);

    const cargar = async () => {
        setError('');
        setCargando(true);
        try {
            setResumen(await obtenerResumen());
        } catch (e) {
            setError(mensajeError(e));
        } finally {
            setCargando(false);
        }
    };

    useEffect(() => {
        let activo = true;
        obtenerResumen()
            .then((datos) => {
                if (activo) setResumen(datos);
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

    if (cargando) {
        return (
            <div className="mt-8 text-xs font-bold uppercase tracking-[0.18em] text-slate-100 before:mb-3 before:block before:h-10 before:w-10 before:rounded-full before:border-2 before:border-slate-400/20 before:border-r-violet-600 before:border-t-violet-300 before:animate-spin">
                Cargando indicadores...
            </div>
        );
    }

    if (error) {
        return (
            <div className="mt-4 flex flex-col items-center gap-3">
                <p className="w-full rounded-full border border-red-400/20 bg-red-950/30 px-4 py-3 text-center text-sm text-red-200">{error}</p>
                <button type="button" className={botonSecundarioCls} onClick={() => void cargar()}>
                    Reintentar
                </button>
            </div>
        );
    }

    if (!resumen) return null;

    const { general, ventas, controlTac } = resumen;
    const productosFiltrados = resumen.resumenPorProducto
        .filter((producto) => `${producto.nombre} ${producto.codigoProducto}`.toLocaleLowerCase('es-CL').includes(busquedaProducto.toLocaleLowerCase('es-CL')))
        .sort((a, b) => {
            if (ordenProducto === 'stock') return a.stock - b.stock;
            if (ordenProducto === 'vendidos') return b.vendidos - a.vendidos;
            if (ordenProducto === 'porcentaje') return b.porcentajeVendido - a.porcentajeVendido;
            if (ordenProducto === 'nombre') return a.nombre.localeCompare(b.nombre, 'es-CL');
            return b.ingresoNormal - a.ingresoNormal;
        });
    const alertasFiltradas = resumen.alertasStockBajo
        .filter((alerta) => {
            const coincideBusqueda = `${alerta.nombre} ${alerta.codigoProducto} ${alerta.talla} ${alerta.color ?? ''}`
                .toLocaleLowerCase('es-CL').includes(busquedaAlerta.toLocaleLowerCase('es-CL'));
            const estado = alerta.stock === 0 ? 'agotado' : alerta.estado.toLocaleLowerCase('es-CL');
            return coincideBusqueda && (filtroAlerta === 'todos' || estado === filtroAlerta);
        })
        .sort((a, b) => {
            if (ordenAlerta === 'nombre-az') return a.nombre.localeCompare(b.nombre, 'es-CL');
            if (ordenAlerta === 'nombre-za') return b.nombre.localeCompare(a.nombre, 'es-CL');
            if (ordenAlerta === 'stock') return a.stock - b.stock;
            const prioridad = (alerta: AlertaStock) => alerta.stock === 0 ? 0 : alerta.estado === 'CRITICO' ? 1 : alerta.estado === 'BAJO' ? 2 : 3;
            return prioridad(a) - prioridad(b);
        });

    return (
        <div>
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-slate-400">Indicadores calculados por el servicio de analítica.</p>
                <button type="button" className={botonSecundarioCls} onClick={() => void cargar()}>
                    Refrescar
                </button>
            </div>

            <section className="mt-6">
                <TituloSeccion>Resumen general</TituloSeccion>
                <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                    <KpiCard etiqueta="Productos activos" valor={num(general.totalProductos)} />
                    <KpiCard etiqueta="Unidades iniciales" valor={num(general.totalUnidadesIniciales)} />
                    <KpiCard etiqueta="Stock actual" valor={num(general.stockActualTotal)} />
                    <KpiCard etiqueta="Unidades vendidas" valor={num(general.unidadesVendidas)} />
                    <KpiCard etiqueta="% Vendido" valor={pct(general.porcentajeVendido)} acento />
                </div>
            </section>

            <section className="mt-8 border-t border-slate-400/15 pt-5">
                <TituloSeccion>Ventas</TituloSeccion>
                <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <KpiCard etiqueta="Total ventas" valor={num(ventas.totalVentas)} />
                    <KpiCard etiqueta="Ventas normales" valor={num(ventas.ventasNormales)} />
                    <KpiCard etiqueta="Ventas TAC" valor={num(ventas.ventasTac)} />
                    <KpiCard etiqueta="Ingreso normal" valor={formatearCLP(ventas.ingresoNormal)} acento />
                    <KpiCard etiqueta="Ingreso TAC" valor={formatearCLP(ventas.ingresoTac)} />
                    <KpiCard etiqueta="Ingreso total" valor={formatearCLP(ventas.ingresoTotal)} acento />
                    <KpiCard etiqueta="Ganancia total" valor={formatearCLP(ventas.gananciaTotal)} acento />
                </div>
            </section>

            <section className="mt-8 border-t border-slate-400/15 pt-5">
                <TituloSeccion>Control TAC</TituloSeccion>
                <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <KpiCard etiqueta="Total documentos" valor={num(controlTac.totalDocumentos)} />
                    <KpiCard etiqueta="Aprobados" valor={num(controlTac.aprobados)} />
                    <KpiCard etiqueta="Pendientes" valor={num(controlTac.pendientes)} />
                    <KpiCard etiqueta="Monto total" valor={formatearCLP(controlTac.montoTotal)} />
                </div>
            </section>

            <section className="mt-8 border-t border-slate-400/15 pt-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <TituloSeccion>Resumen por producto</TituloSeccion>
                    <div className="flex flex-wrap items-center justify-end gap-2">
                        <button
                            aria-checked={tema === 'dark'}
                            aria-label="Modo oscuro"
                            className="inline-flex items-center gap-2 px-1 py-2 text-xs text-slate-500"
                            onClick={onToggleTema}
                            role="switch"
                            type="button"
                        >
                            Modo oscuro
                            <span className={`relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors ${tema === 'dark' ? 'bg-[var(--primary)]' : 'bg-slate-400/40'}`}>
                                <span
                                    className="pointer-events-none absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform"
                                    style={{ transform: tema === 'dark' ? 'translateX(16px)' : 'translateX(0)' }}
                                />
                            </span>
                        </button>
                        <input
                            aria-label="Buscar producto"
                            className="w-40 rounded-md border border-slate-400/20 bg-slate-950/30 px-3 py-2 text-xs text-slate-200 outline-none placeholder:text-slate-500 focus:border-slate-400/50"
                            onChange={(event) => { setBusquedaProducto(event.target.value); setProductosVisibles(4); }}
                            placeholder="Buscar producto"
                            type="search"
                            value={busquedaProducto}
                        />
                        <select aria-label="Ordenar productos" className="rounded-md border border-slate-400/20 bg-slate-950/30 px-3 py-2 text-xs text-slate-200 outline-none" onChange={(event) => { setOrdenProducto(event.target.value); setProductosVisibles(4); }} value={ordenProducto}>
                            <option value="ingreso">Mayor ingreso</option>
                            <option value="stock">Menor stock</option>
                            <option value="vendidos">Más vendidos</option>
                            <option value="porcentaje">Mayor % vendido</option>
                            <option value="nombre">Nombre A-Z</option>
                        </select>
                    </div>
                </div>
                <div className="mt-3 overflow-x-auto rounded-lg border border-slate-400/15">
                    <table className="w-full min-w-[650px] border-collapse text-left text-sm">
                        <thead className="border-y border-slate-400/20 bg-slate-400/10 text-[11px] font-bold uppercase tracking-wide text-slate-300">
                            <tr>
                                <th className="px-3 py-2 font-semibold">Producto</th>
                                <th className="px-3 py-2 text-center font-semibold">Stock</th>
                                <th className="px-3 py-2 text-center font-semibold">Cant. inicial</th>
                                <th className="px-3 py-2 text-center font-semibold">Vendidos</th>
                                <th className="px-3 py-2 text-center font-semibold">% vendido</th>
                                <th className="px-3 py-2 text-center font-semibold">Ingreso normal</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-400/10">
                            {productosFiltrados.slice(0, productosVisibles).map((prod) => (
                                <tr className="hover:bg-slate-400/[0.04]" key={prod.codigoProducto}>
                                    <td className="px-3 py-2">
                                        <p className="font-medium text-slate-200">{prod.nombre}</p>
                                        <p className="font-mono text-[10px] text-slate-500">{prod.codigoProducto}</p>
                                    </td>
                                    <td className="px-3 py-2 text-center tabular-nums text-slate-300">{num(prod.stock)}</td>
                                    <td className="px-3 py-2 text-center tabular-nums text-slate-300">{num(prod.cantInicial)}</td>
                                    <td className="px-3 py-2 text-center tabular-nums text-slate-300">{num(prod.vendidos)}</td>
                                    <td className="px-3 py-2 text-center tabular-nums text-slate-400">{pct(prod.porcentajeVendido)}</td>
                                    <td className="px-3 py-2 text-center tabular-nums text-slate-300">{formatearCLP(prod.ingresoNormal)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {productosFiltrados.length === 0 && <p className="py-6 text-center text-sm text-slate-500">No hay productos que coincidan.</p>}
                    {productosVisibles < productosFiltrados.length && (
                        <div className="flex justify-center border-t border-slate-400/10 py-3">
                            <button className="rounded-md border border-[var(--primary)] bg-[var(--primary)] px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]" onClick={() => setProductosVisibles((actual) => actual + 4)} type="button">
                                Cargar más productos (+{Math.min(4, productosFiltrados.length - productosVisibles)})
                            </button>
                        </div>
                    )}
                </div>
            </section>

            <section className="mt-6 border-t border-slate-400/15 pt-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <TituloSeccion>Alertas de stock bajo</TituloSeccion>
                        <p className="mt-1 text-xs text-slate-500">{num(resumen.alertasStockBajo.length)} variantes requieren atención</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <input
                            aria-label="Buscar alerta"
                            className="w-36 rounded-md border border-slate-400/20 bg-slate-950/30 px-3 py-2 text-xs text-slate-200 outline-none placeholder:text-slate-500 focus:border-slate-400/50"
                            onChange={(event) => { setBusquedaAlerta(event.target.value); setAlertasVisibles(4); }}
                            placeholder="Buscar alerta"
                            type="search"
                            value={busquedaAlerta}
                        />
                        <select aria-label="Filtrar alertas por estado" className="rounded-md border border-slate-400/20 bg-slate-950/30 px-3 py-2 text-xs text-slate-200 outline-none" onChange={(event) => { setFiltroAlerta(event.target.value); setAlertasVisibles(4); }} value={filtroAlerta}>
                            <option value="todos">Todos los estados</option>
                            <option value="agotado">Agotado</option>
                            <option value="critico">Crítico</option>
                            <option value="bajo">Bajo</option>
                        </select>
                        <select aria-label="Ordenar alertas" className="rounded-md border border-slate-400/20 bg-slate-950/30 px-3 py-2 text-xs text-slate-200 outline-none" onChange={(event) => { setOrdenAlerta(event.target.value); setAlertasVisibles(4); }} value={ordenAlerta}>
                            <option value="prioridad">Prioridad</option>
                            <option value="stock">Menor stock</option>
                            <option value="nombre-az">Nombre A-Z</option>
                            <option value="nombre-za">Nombre Z-A</option>
                        </select>
                    </div>
                </div>
                {alertasFiltradas.length === 0 ? (
                    <p className="mt-3 border-y border-slate-400/15 py-6 text-center text-sm text-slate-500">No hay alertas para estos filtros.</p>
                ) : (
                    <div className="mt-3 overflow-x-auto rounded-lg border border-slate-400/15">
                        <table className="w-full min-w-[560px] border-collapse text-left text-sm">
                            <thead className="border-y border-slate-400/20 bg-slate-400/10 text-[11px] font-bold uppercase tracking-wide text-slate-300">
                                <tr>
                                    <th className="px-3 py-2 font-semibold">Producto</th>
                                    <th className="px-3 py-2 text-center font-semibold">Talla / Color</th>
                                    <th className="px-3 py-2 text-center font-semibold">Stock</th>
                                    <th className="px-3 py-2 text-center font-semibold">Estado</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-400/10">
                                {alertasFiltradas.slice(0, alertasVisibles).map((alerta) => {
                                    const agotado = alerta.stock === 0;
                                    return (
                                        <tr className="hover:bg-slate-400/[0.04]" key={alerta.sku}>
                                            <td className="px-3 py-2">
                                                <p className="font-medium text-slate-200">{alerta.nombre}</p>
                                                <p className="font-mono text-[10px] text-slate-500">{alerta.codigoProducto}</p>
                                            </td>
                                            <td className="px-3 py-2 text-center text-slate-400">{[alerta.talla && alerta.talla.toLowerCase() !== 'unica' ? alerta.talla : '', alerta.color].filter(Boolean).join(' / ') || '—'}</td>
                                            <td className={`px-3 py-2 text-center font-semibold tabular-nums ${agotado ? 'text-red-400' : 'text-slate-300'}`}>{num(alerta.stock)}</td>
                                            <td className="px-3 py-2 text-center"><span className={badgeEstado(agotado ? 'AGOTADO' : alerta.estado)}>{agotado ? 'Agotado' : alerta.estado}</span></td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                        {alertasVisibles < alertasFiltradas.length && (
                            <div className="flex justify-center border-t border-slate-400/10 py-3">
                                <button className="rounded-md border border-[var(--primary)] bg-[var(--primary)] px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]" onClick={() => setAlertasVisibles((actual) => actual + 4)} type="button">
                                    Cargar más alertas (+{Math.min(4, alertasFiltradas.length - alertasVisibles)})
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </section>
        </div>
    );
}