import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { formatearCLP } from '../utils/precio';
import {
    actualizarFirmas,
    listarDocumentosTac,
    type DocumentoTac,
    type FirmaEstado,
} from '../services/ventas.service';

const inputCls =
    'w-full rounded-xl border border-slate-400/20 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 outline-none focus:border-violet-400/60';
const botonSecundarioCls =
    'rounded-xl border border-slate-400/20 bg-slate-950/60 px-3 py-2 text-xs font-bold text-slate-200 transition hover:border-violet-400/50 hover:text-slate-100';

function mensajeError(e: unknown): string {
    if (axios.isAxiosError(e)) {
        const msg = (e.response?.data as { message?: string | string[] })?.message;
        if (Array.isArray(msg)) return msg.join(', ');
        if (msg) return msg;
    }
    return 'Ocurrió un error inesperado.';
}

function badgeEstado(estado: DocumentoTac['estado']) {
    const estilos: Record<string, string> = {
        Aprobado: 'border-emerald-400/40 bg-emerald-500/20 text-emerald-200',
        Pendiente: 'border-amber-400/40 bg-amber-500/20 text-amber-200',
        Rechazado: 'border-red-400/40 bg-red-500/20 text-red-200',
    };
    return `rounded-full border px-2.5 py-1 text-xs font-bold ${estilos[estado]}`;
}

function fechaCorta(iso: string): string {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString('es-CL');
}

const ESTADOS_FIRMA: FirmaEstado[] = ['Firmado', 'Pendiente', 'Rechazado'];

interface FirmaSelectProps {
    valor: FirmaEstado;
    onChange: (estado: FirmaEstado) => void;
    deshabilitado: boolean;
}

function FirmaSelect({ valor, onChange, deshabilitado }: FirmaSelectProps) {
    return (
        <select
            className={inputCls}
            value={valor}
            disabled={deshabilitado}
            onChange={(e) => onChange(e.target.value as FirmaEstado)}
        >
            {ESTADOS_FIRMA.map((e) => (
                <option key={e} value={e}>
                    {e}
                </option>
            ))}
        </select>
    );
}

export default function ControlTacTab() {
    const [documentos, setDocumentos] = useState<DocumentoTac[]>([]);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState('');
    const [exito, setExito] = useState('');
    const [cambiando, setCambiando] = useState<number | null>(null);

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

    const cambiarFirma = async (idTac: number, clave: 'firmaComprador' | 'firmaVendedor', estado: FirmaEstado) => {
        try {
            setError('');
            setExito('');
            setCambiando(idTac);
            const documento = await actualizarFirmas(idTac, { [clave]: estado });
            setDocumentos((actuales) =>
                actuales.map((d) => (d.idTac === idTac ? { ...d, ...documento } : d)),
            );
        } catch (e) {
            setError(mensajeError(e));
        } finally {
            setCambiando(null);
        }
    };

    return (
        <div className="mt-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap gap-2 text-xs font-bold">
                    <span className="rounded-full border border-slate-400/15 bg-slate-950/50 px-3 py-1.5 text-slate-300">
                        {documentos.length} documentos
                    </span>
                    <span className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1.5 text-emerald-200">
                        {resumen.aprobados} aprobados
                    </span>
                    <span className="rounded-full border border-amber-400/20 bg-amber-500/10 px-3 py-1.5 text-amber-200">
                        {resumen.pendientes} pendientes
                    </span>
                    <span className="rounded-full border border-red-400/20 bg-red-500/10 px-3 py-1.5 text-red-200">
                        {resumen.rechazados} rechazados
                    </span>
                    <span className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1.5 text-cyan-200">
                        Monto total {formatearCLP(resumen.monto)}
                    </span>
                </div>
                <button type="button" className={botonSecundarioCls} onClick={cargar} disabled={cargando}>
                    {cargando ? 'Cargando...' : 'Refrescar'}
                </button>
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
                    Cargando documentos TAC...
                </div>
            ) : (
                <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-400/15">
                    <table className="w-full text-left text-sm">
                        <thead className="theme-dark-surface bg-slate-950/50 text-xs uppercase tracking-wider text-slate-400">
                            <tr>
                                <th className="px-4 py-3">N° TAC</th>
                                <th className="px-4 py-3">Producto</th>
                                <th className="px-4 py-3 text-right">Cantidad</th>
                                <th className="px-4 py-3 text-right">Precio TAC</th>
                                <th className="px-4 py-3 text-right">Total</th>
                                <th className="px-4 py-3">Firma comprador</th>
                                <th className="px-4 py-3">Firma vendedor</th>
                                <th className="px-4 py-3">Estado</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-400/10">
                            {documentos.map((d) => {
                                const ocupado = cambiando !== null;
                                return (
                                    <tr key={d.idTac}>
                                        <td className="px-4 py-3">
                                            <p className="font-mono text-xs font-bold text-slate-100">{d.nTac}</p>
                                            <p className="text-xs text-slate-400">{fechaCorta(d.fecha)}</p>
                                        </td>
                                        <td className="px-4 py-3">
                                            <p className="text-slate-100">{d.producto}</p>
                                            <p className="text-xs text-slate-400">
                                                {d.sku} · talla {d.talla || 'única'}
                                                {d.color ? ` · ${d.color}` : ''}
                                            </p>
                                        </td>
                                        <td className="px-4 py-3 text-right font-semibold text-slate-100">{d.cantidad}</td>
                                        <td className="px-4 py-3 text-right text-slate-200">{formatearCLP(d.precioTac)}</td>
                                        <td className="px-4 py-3 text-right font-semibold text-slate-100">{formatearCLP(d.total)}</td>
                                        <td className="min-w-[150px] px-4 py-3">
                                            <FirmaSelect
                                                valor={d.firmaComprador}
                                                deshabilitado={ocupado}
                                                onChange={(estado) => cambiarFirma(d.idTac, 'firmaComprador', estado)}
                                            />
                                        </td>
                                        <td className="min-w-[150px] px-4 py-3">
                                            <FirmaSelect
                                                valor={d.firmaVendedor}
                                                deshabilitado={ocupado}
                                                onChange={(estado) => cambiarFirma(d.idTac, 'firmaVendedor', estado)}
                                            />
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={badgeEstado(d.estado)}>{d.estado}</span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    {documentos.length === 0 && (
                        <p className="px-4 py-6 text-center text-sm text-slate-400">
                            No hay documentos TAC registrados.
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}