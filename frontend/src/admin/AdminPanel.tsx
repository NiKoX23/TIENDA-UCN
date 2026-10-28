import { useEffect, useState } from 'react';
import type { Usuario } from '../services/auth.service';
import BackToStore from '../components/BackToStore';
import { BrandBlocks } from '../components/brand/BrandFigures';
import { listarUsuarios, cambiarRol, eliminarUsuario, type AdminUsuario } from '../services/admin.service';
import InventarioTab from './InventarioTab';
import DashboardTab from './DashboardTab';
import VentasTab from './VentasTab';
import ControlTacTab from './ControlTacTab';

interface AdminPanelProps {
    tema: 'dark' | 'light';
    onToggleTema: () => void;
    usuario: Usuario;
}

type TabId = 'inicio' | 'inventario' | 'ventas' | 'tac' | 'usuarios';

const TABS: { id: TabId; label: string }[] = [
    { id: 'inicio', label: 'Inicio' },
    { id: 'inventario', label: 'Inventario' },
    { id: 'ventas', label: 'Ventas' },
    { id: 'tac', label: 'Control TAC' },
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
    usuarios: {
        titulo: 'Usuarios',
        descripcion: 'Gestiona los permisos de administrador de los usuarios.',
    },
};

export default function AdminPanel({ tema, onToggleTema, usuario }: AdminPanelProps) {
    const [tab, setTab] = useState<TabId>('inicio');
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

    const borrarUsuario = async (target: AdminUsuario) => {
        const confirmado = window.confirm(`¿Eliminar permanentemente a ${target.nombre} (${target.email})?`);
        if (!confirmado) return;

        try {
            setError('');
            setCambiandoUid(target.uid);
            await eliminarUsuario(target.uid);
            setUsuarios((actuales) => actuales.filter((u) => u.uid !== target.uid));
        } catch {
            setError(`No se pudo eliminar a ${target.nombre}.`);
        } finally {
            setCambiandoUid(null);
        }
    };

    return (
        <main className="vcm-page flex flex-col items-center px-5 pb-12 pt-8">
            <BackToStore className="mb-8 self-start" />

            <div className="vcm-card w-full max-w-6xl overflow-hidden shadow-2xl">
                <div className="vcm-hero vcm-admin-hero px-8 py-9 max-[480px]:px-5">
                    <BrandBlocks variant="right" />
                    <div key={tab} className="vcm-hero__content max-w-2xl pr-[12%]">
                        <span className="vcm-eyebrow">Tienda UCN · Administración</span>
                        <h1 className="mt-3 text-3xl font-extrabold tracking-tight max-[480px]:text-2xl">{CONTENIDO_TAB[tab].titulo}</h1>
                        <p className="mt-2 text-sm opacity-90">{CONTENIDO_TAB[tab].descripcion}</p>
                        <p className="mt-3 text-xs opacity-80">Sesión: {usuario.email}</p>
                    </div>
                </div>
                <div className="vcm-bar" aria-hidden="true" />

                <div className="p-8 max-[480px]:p-5">
                    <div className="flex flex-wrap gap-2" role="tablist" aria-label="Secciones del panel">
                        {TABS.map((t) => (
                            <button
                                key={t.id}
                                type="button"
                                role="tab"
                                aria-selected={tab === t.id}
                                onClick={() => setTab(t.id)}
                                className={`vcm-chip${tab === t.id ? ' vcm-chip--active' : ''}`}
                            >
                                {t.label}
                            </button>
                        ))}
                    </div>

                    <div key={tab} className="vcm-tab-panel" role="tabpanel">
                        {tab === 'inicio' && (
                            <div className="mt-6">
                                <DashboardTab tema={tema} onToggleTema={onToggleTema} />
                            </div>
                        )}

                        {tab === 'inventario' && <InventarioTab />}

                        {tab === 'ventas' && <VentasTab />}

                        {tab === 'tac' && <ControlTacTab />}

                        {tab === 'usuarios' && (
                            <>
                                {error && <p className="vcm-alert mt-4 text-center" role="alert">{error}</p>}

                                {cargando ? (
                                    <div className="vcm-spinner mt-8">Cargando usuarios...</div>
                                ) : (
                                    <div className="mt-6 overflow-hidden rounded-[var(--radius)] border border-[var(--border)]">
                                        <table className="w-full text-left text-sm">
                                            <thead className="vcm-thead text-xs uppercase tracking-wider">
                                                <tr>
                                                    <th className="px-4 py-3">Usuario</th>
                                                    <th className="hidden px-4 py-3 sm:table-cell">Proveedor</th>
                                                    <th className="px-4 py-3">Rol</th>
                                                    <th className="px-4 py-3 text-right">Acción</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-[var(--border)]">
                                                {usuarios.map((u) => {
                                                    const esTu = u.uid === usuario.uid;
                                                    const deshabilitado = esTu || cambiandoUid !== null;
                                                    return (
                                                        <tr key={u.uid} className="transition hover:bg-[var(--primary-soft)]">
                                                            <td className="px-4 py-3">
                                                                <p className="font-semibold">{u.nombre}</p>
                                                                <p className="text-xs text-[var(--text-soft)]">{u.email}</p>
                                                            </td>
                                                            <td className="hidden px-4 py-3 capitalize text-[var(--text-soft)] sm:table-cell">{u.proveedorAuth}</td>
                                                            <td className="px-4 py-3">
                                                                <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${u.esAdmin ? 'bg-[var(--primary-soft)] text-[var(--primary)]' : 'bg-[color-mix(in_srgb,var(--text)_10%,transparent)] text-[var(--text-soft)]'}`}>
                                                                    {u.esAdmin ? 'Admin' : 'Usuario'}
                                                                </span>
                                                            </td>
                                                            <td className="px-4 py-3 text-right">
                                                                {esTu ? (
                                                                    <span className="text-xs text-[var(--text-muted)]">Tú</span>
                                                                ) : (
                                                                    <div className="flex justify-end gap-2">
                                                                        <button
                                                                            type="button"
                                                                            className="vcm-btn vcm-btn--danger vcm-btn--sm"
                                                                            disabled={deshabilitado}
                                                                            onClick={() => void borrarUsuario(u)}
                                                                        >
                                                                            {cambiandoUid === u.uid ? '...' : 'Borrar usuario'}
                                                                        </button>
                                                                        <button
                                                                            type="button"
                                                                            className={`vcm-btn vcm-btn--sm ${u.esAdmin ? 'vcm-btn--surface' : 'vcm-btn--primary'}`}
                                                                            disabled={deshabilitado}
                                                                            onClick={() => alternarRol(u)}
                                                                        >
                                                                            {cambiandoUid === u.uid ? '...' : u.esAdmin ? 'Revocar admin' : 'Hacer admin'}
                                                                        </button>
                                                                    </div>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                        {usuarios.length === 0 && (
                                            <p className="px-4 py-6 text-center text-sm text-[var(--text-soft)]">No hay usuarios registrados.</p>
                                        )}
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>
        </main>
    );
}
