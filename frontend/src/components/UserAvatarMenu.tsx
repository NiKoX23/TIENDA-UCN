import { useEffect, useRef, useState } from 'react';
import { obtenerColorAvatar, obtenerIniciales, type Usuario } from '../services/auth.service';

interface UserAvatarMenuProps {
    usuario: Usuario | null;
    onLogin: () => void;
    onPerfil: () => void;
    onAdmin: () => void;
    onLogout: () => void;
}

export default function UserAvatarMenu({ usuario, onLogin, onPerfil, onAdmin, onLogout }: UserAvatarMenuProps) {
    const [abierto, setAbierto] = useState(false);
    const menuRef = useRef<HTMLDivElement | null>(null);
    const esInvitado = !usuario;
    const rol = esInvitado ? 'Invitado' : usuario.esAdmin ? 'Administrador' : 'Usuario';
    const iniciales = esInvitado ? 'IN' : obtenerIniciales(usuario.nombre, usuario.email);

    useEffect(() => {
        if (!abierto) return;
        const cerrarFuera = (event: PointerEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) setAbierto(false);
        };
        const cerrarEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setAbierto(false);
        };
        document.addEventListener('pointerdown', cerrarFuera);
        document.addEventListener('keydown', cerrarEscape);
        return () => {
            document.removeEventListener('pointerdown', cerrarFuera);
            document.removeEventListener('keydown', cerrarEscape);
        };
    }, [abierto]);

    const ejecutar = (accion: () => void) => {
        setAbierto(false);
        accion();
    };

    return (
        <div className="relative flex items-center" ref={menuRef}>
            <button
                type="button"
                className={`ucn-avatar ${esInvitado ? 'ucn-avatar--guest' : 'ucn-avatar--account'}`}
                style={usuario ? { backgroundColor: obtenerColorAvatar(usuario.uid) } : undefined}
                onClick={() => setAbierto((actual) => !actual)}
                title={esInvitado ? 'Cuenta de invitado' : `Cuenta de ${rol.toLowerCase()}`}
                aria-label={esInvitado ? 'Cuenta de invitado' : `Cuenta de ${usuario.nombre}`}
                aria-haspopup="menu"
                aria-expanded={abierto}
            >
                {iniciales}
            </button>

            {abierto && (
                <div className="ucn-dropdown absolute right-0 top-[calc(100%+10px)] z-50 w-64 max-w-[calc(100vw-1.5rem)] p-2.5" role="menu" aria-label={`Opciones de ${rol.toLowerCase()}`}>
                    <div className="mb-1 border-b border-slate-400/15 px-3 pb-3 pt-1">
                        <p className="truncate text-sm font-bold text-[var(--text)]">{usuario?.nombre ?? 'Sesión de invitado'}</p>
                        {usuario?.email && <p className="mt-0.5 truncate text-xs font-medium text-[var(--text-soft)]">{usuario.email}</p>}
                        <span className={`mt-2 inline-flex rounded-full px-2 py-1 text-xs font-bold ${usuario?.esAdmin ? 'ucn-dropdown-role--admin' : esInvitado ? 'ucn-dropdown-role--guest' : 'ucn-dropdown-role--user'}`}>{rol}</span>
                    </div>
                    {esInvitado ? (
                        <button type="button" role="menuitem" className="ucn-dropdown-item ucn-dropdown-item--guest" onClick={() => ejecutar(onLogin)}>Iniciar sesión</button>
                    ) : (
                        <>
                            <button type="button" role="menuitem" className="ucn-dropdown-item" onClick={() => ejecutar(onPerfil)}>Editar perfil</button>
                            {usuario.esAdmin && <button type="button" role="menuitem" className="ucn-dropdown-item ucn-dropdown-item--admin" onClick={() => ejecutar(onAdmin)}>Panel de administración</button>}
                            <button type="button" role="menuitem" className="ucn-dropdown-item ucn-dropdown-item--danger" onClick={() => ejecutar(onLogout)}>Cerrar sesión</button>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}