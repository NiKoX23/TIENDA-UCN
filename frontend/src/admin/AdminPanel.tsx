import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Usuario } from '../services/auth.service';
import { listarUsuarios, cambiarRol, type AdminUsuario } from '../services/admin.service';

interface AdminPanelProps {
    tema: 'dark' | 'light';
    usuario: Usuario;
}

export default function AdminPanel({ tema, usuario }: AdminPanelProps) {
    const navigate = useNavigate();
    const [usuarios, setUsuarios] = useState<AdminUsuario[]>([]);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState('');
    const [cambiandoUid, setCambiandoUid] = useState<number | null>(null);

    useEffect(() => {
        let activo = true;
        listarUsuarios()
            .then((datos) => {
                if (!activo) return;
                setUsuarios(datos);
            })
            .catch(() => {
                if (activo) setError('No se pudo cargar la lista de usuarios. Revisa tu conexión.');
            })
            .finally(() => {
                if (activo) setCargando(false);
            });
        return () => {
            activo = false;
        };
    }, []);

    const alternarRol = async (target: AdminUsuario) => {
        try {
            setError('');
            setCambiandoUid(target.uid);
            await cambiarRol(target.uid, !target.esAdmin);
            setUsuarios((actuales) =>
                actuales.map((u) => (u.uid === target.uid ? { ...u, esAdmin: !target.esAdmin } : u)),
            );
        } catch {
            setError(`No se pudo cambiar el rol de ${target.nombre}.`);
        } finally {
            setCambiandoUid(null);
        }
    };

    return (
        <main className={`flex min-h-screen flex-col items-center px-5 pb-12 pt-8 ${tema === 'light' ? 'bg-[#f7f9fc]' : 'bg-[radial-gradient(circle_at_top_left,rgba(124,58,237,0.2),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(6,182,212,0.14),transparent_30%),linear-gradient(180deg,#050816,#0b1220)] text-slate-100'}`}>
            <button type="button" className="theme-dark-surface self-start rounded-full border border-slate-400/20 bg-slate-900/70 px-4 py-3 text-slate-200 transition hover:-translate-y-px hover:border-violet-400/50" onClick={() => navigate('/')}>
                volver a la tienda
            </button>

            <div className="theme-dark-surface mt-8 w-full max-w-4xl rounded-[28px] border border-slate-400/20 bg-slate-900/80 p-8 shadow-2xl backdrop-blur-xl">
                <h1 className="text-3xl font-extrabold tracking-tight">Panel de administración</h1>
                <p className="mt-2 text-sm text-slate-400">Gestiona los permisos de administrador de los usuarios.</p>

                {error && <p className="mt-4 rounded-full border border-red-400/20 bg-red-950/30 px-4 py-3 text-center text-sm text-red-200">{error}</p>}

                {cargando ? (
                    <div className="mt-8 text-xs font-bold uppercase tracking-[0.18em] text-slate-100 before:mb-3 before:block before:h-10 before:w-10 before:rounded-full before:border-2 before:border-slate-400/20 before:border-r-violet-600 before:border-t-violet-300 before:animate-spin">Cargando usuarios...</div>
                ) : (
                    <div className="mt-6 overflow-hidden rounded-2xl border border-slate-400/15">
                        <table className="w-full text-left text-sm">
                            <thead className="theme-dark-surface bg-slate-950/50 text-xs uppercase tracking-wider text-slate-400">
                                <tr>
                                    <th className="px-4 py-3">Usuario</th>
                                    <th className="hidden px-4 py-3 sm:table-cell">Proveedor</th>
                                    <th className="px-4 py-3">Rol</th>
                                    <th className="px-4 py-3 text-right">Acción</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-400/10">
                                {usuarios.map((u) => {
                                    const esTu = u.uid === usuario.uid;
                                    const deshabilitado = esTu || cambiandoUid !== null;
                                    return (
                                        <tr key={u.uid}>
                                            <td className="px-4 py-3">
                                                <p className="font-semibold text-slate-100">{u.nombre}</p>
                                                <p className="text-xs text-slate-400">{u.email}</p>
                                            </td>
                                            <td className="hidden px-4 py-3 capitalize text-slate-300 sm:table-cell">{u.proveedorAuth}</td>
                                            <td className="px-4 py-3">
                                                <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${u.esAdmin ? 'bg-violet-500/20 text-violet-200' : 'bg-slate-500/15 text-slate-300'}`}>
                                                    {u.esAdmin ? 'Admin' : 'Usuario'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                {esTu ? (
                                                    <span className="text-xs text-slate-500">Tú</span>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        className={`rounded-xl px-3 py-2 text-xs font-bold transition ${u.esAdmin ? 'bg-amber-500/15 text-amber-200 hover:bg-amber-500/25' : 'bg-violet-500/15 text-violet-200 hover:bg-violet-500/25'} disabled:cursor-not-allowed disabled:opacity-50`}
                                                        disabled={deshabilitado}
                                                        onClick={() => alternarRol(u)}
                                                    >
                                                        {cambiandoUid === u.uid ? '...' : u.esAdmin ? 'Revocar admin' : 'Hacer admin'}
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                        {usuarios.length === 0 && (
                            <p className="px-4 py-6 text-center text-sm text-slate-400">No hay usuarios registrados.</p>
                        )}
                    </div>
                )}
            </div>
        </main>
    );
}