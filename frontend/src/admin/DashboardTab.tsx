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
        <div className="rounded-2xl border border-slate-400/15 bg-slate-950/40 p-5">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{etiqueta}</p>
            <p className={`mt-2 text-2xl font-extrabold ${acento ? 'text-violet-300' : 'text-slate-100'}`}>{valor}</p>
        </div>
    );
}

function badgeEstado(estado: AlertaStock['estado']) {
    const estilos: Record<AlertaStock['estado'], string> = {
        CRITICO: 'border-red-400/40 bg-red-500/20 text-red-200',
        BAJO: 'border-amber-400/40 bg-amber-500/20 text-amber-200',
        NORMAL: 'border-emerald-400/40 bg-emerald-500/20 text-emerald-200',
        ALTO: 'border-cyan-400/40 bg-cyan-500/20 text-cyan-200',
    };
    return `rounded-full border px-2.5 py-1 text-xs font-bold ${estilos[estado]}`;
}

function TituloSeccion({ children }: { children: string }) {
    return <h2 className="mt-10 text-sm font-extrabold uppercase tracking-wider text-slate-400">{children}</h2>;
}

function mensajeError(e: unknown): string {
    if (axios.isAxiosError(e)) {
        const msg = (e.response?.data as { message?: string | string[] })?.message;
        if (Array.isArray(msg)) return msg.join(', ');
        if (msg) return msg;
    }
    return 'No se pudo cargar el resumen. Revisa tu conexión.';
}

export default function DashboardTab() {
    const [resumen, setResumen] = useState<ResumenDashboard | null>(null);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState('');

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

    return (
        <div>
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-slate-400">Indicadores calculados por el servicio de analítica.</p>
                <button type="button" className={botonSecundarioCls} onClick={() => void cargar()}>
                    Refrescar
                </button>
            </div>

            <TituloSeccion>Resumen general</TituloSeccion>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                <KpiCard etiqueta="Productos activos" valor={num(general.totalProductos)} />
                <KpiCard etiqueta="Unidades iniciales" valor={num(general.totalUnidadesIniciales)} />
                <KpiCard etiqueta="Stock actual" valor={num(general.stockActualTotal)} />
                <KpiCard etiqueta="Unidades vendidas" valor={num(general.unidadesVendidas)} />
                <KpiCard etiqueta="% Vendido" valor={pct(general.porcentajeVendido)} acento />
            </div>

            <TituloSeccion>Ventas</TituloSeccion>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <KpiCard etiqueta="Total ventas" valor={num(ventas.totalVentas)} />
                <KpiCard etiqueta="Ventas normales" valor={num(ventas.ventasNormales)} />
                <KpiCard etiqueta="Ventas TAC" valor={num(ventas.ventasTac)} />
                <KpiCard etiqueta="Ingreso normal" valor={formatearCLP(ventas.ingresoNormal)} acento />
                <KpiCard etiqueta="Ingreso TAC" valor={formatearCLP(ventas.ingresoTac)} />
                <KpiCard etiqueta="Ingreso total" valor={formatearCLP(ventas.ingresoTotal)} acento />
                <KpiCard etiqueta="Ganancia total" valor={formatearCLP(ventas.gananciaTotal)} acento />
            </div>

            <TituloSeccion>Control TAC</TituloSeccion>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <KpiCard etiqueta="Total documentos" valor={num(controlTac.totalDocumentos)} />
                <KpiCard etiqueta="Aprobados" valor={num(controlTac.aprobados)} />
                <KpiCard etiqueta="Pendientes" valor={num(controlTac.pendientes)} />
                <KpiCard etiqueta="Monto total" valor={formatearCLP(controlTac.montoTotal)} />
            </div>

            <TituloSeccion>Resumen por producto</TituloSeccion>
            <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-400/15 bg-slate-950/30">
                <table className="w-full min-w-[900px] text-left text-sm">
                    <thead className="bg-slate-950/50 text-xs uppercase tracking-wider text-slate-400">
                        <tr>
                            <th className="px-4 py-3">Producto</th>
                            <th className="px-4 py-3">Categoría</th>
                            <th className="px-4 py-3 text-right">Cant. inicial</th>
                            <th className="px-4 py-3 text-right">Stock</th>
                            <th className="px-4 py-3 text-right">Vendidos</th>
                            <th className="px-4 py-3 text-right">% Vendido</th>
                            <th className="px-4 py-3 text-right">Ingreso normal</th>
                            <th className="px-4 py-3 text-right">Ingreso TAC</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-400/10">
                        {resumen.resumenPorProducto.map((prod) => (
                            <tr key={prod.codigoProducto}>
                                <td className="px-4 py-3">
                                    <p className="font-semibold text-slate-100">{prod.nombre}</p>
                                    <p className="font-mono text-xs text-slate-400">{prod.codigoProducto}</p>
                                </td>
                                <td className="px-4 py-3 text-slate-300">{prod.categoria}</td>
                                <td className="px-4 py-3 text-right text-slate-200">{num(prod.cantInicial)}</td>
                                <td className="px-4 py-3 text-right text-slate-200">{num(prod.stock)}</td>
                                <td className="px-4 py-3 text-right text-slate-200">{num(prod.vendidos)}</td>
                                <td className="px-4 py-3 text-right text-slate-300">{pct(prod.porcentajeVendido)}</td>
                                <td className="px-4 py-3 text-right text-slate-200">{formatearCLP(prod.ingresoNormal)}</td>
                                <td className="px-4 py-3 text-right text-slate-300">{formatearCLP(prod.ingresoTac)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {resumen.resumenPorProducto.length === 0 && (
                    <p className="px-4 py-8 text-center text-sm text-slate-400">Sin productos activos.</p>
                )}
            </div>

            <TituloSeccion>Alertas de stock bajo</TituloSeccion>
            {resumen.alertasStockBajo.length === 0 ? (
                <p className="mt-4 rounded-2xl border border-emerald-400/20 bg-emerald-950/30 px-4 py-4 text-sm text-emerald-200">
                    Sin alertas: todos los productos activos tienen stock superior a 20 unidades.
                </p>
            ) : (
                <div className="mt-4 overflow-x-auto rounded-2xl border border-red-400/25 bg-red-950/10">
                    <table className="w-full min-w-[700px] text-left text-sm">
                        <thead className="bg-red-950/30 text-xs uppercase tracking-wider text-red-300">
                            <tr>
                                <th className="px-4 py-3">Producto</th>
                                <th className="px-4 py-3">SKU</th>
                                <th className="px-4 py-3">Talla</th>
                                <th className="px-4 py-3">Color</th>
                                <th className="px-4 py-3 text-right">Stock</th>
                                <th className="px-4 py-3 text-right">Stock mín.</th>
                                <th className="px-4 py-3">Estado</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-red-400/10">
                            {resumen.alertasStockBajo.map((alerta) => (
                                <tr key={alerta.sku}>
                                    <td className="px-4 py-3">
                                        <p className="font-semibold text-slate-100">{alerta.nombre}</p>
                                        <p className="font-mono text-xs text-slate-400">{alerta.codigoProducto}</p>
                                    </td>
                                    <td className="px-4 py-3 font-mono text-xs text-slate-200">{alerta.sku}</td>
                                    <td className="px-4 py-3 text-slate-300">{alerta.talla || 'unica'}</td>
                                    <td className="px-4 py-3 text-slate-300">{alerta.color ?? '—'}</td>
                                    <td className="px-4 py-3 text-right font-extrabold text-red-300">{num(alerta.stock)}</td>
                                    <td className="px-4 py-3 text-right text-slate-400">{num(alerta.stockMinimo)}</td>
                                    <td className="px-4 py-3">
                                        <span className={badgeEstado(alerta.estado)}>{alerta.estado}</span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}