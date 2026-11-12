import { useState } from 'react';
import type { Usuario } from '../services/auth.service';
import { updateProfile } from '../services/auth.service';
import AuthShell from '../components/brand/AuthShell';

interface PerfilProps {
    tema: 'dark' | 'light';
    usuario: Usuario;
    onLogout: () => void;
    onUpdated: (usuario: Usuario) => void;
}

export default function Perfil({ usuario, onLogout, onUpdated }: PerfilProps) {
    const [nombre, setNombre] = useState(usuario.nombre);
    const [email, setEmail] = useState(usuario.email);
    const [password, setPassword] = useState('');
    const [confirmarPassword, setConfirmarPassword] = useState('');
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setError('');
        setSuccessMessage('');

        if (password && password !== confirmarPassword) {
            setError('Las contraseñas no coinciden');
            return;
        }

        try {
            const usuarioActualizado = await updateProfile(nombre, email, password || undefined);
            onUpdated(usuarioActualizado);
            setPassword('');
            setConfirmarPassword('');
            setSuccessMessage('Perfil actualizado correctamente');
        } catch {
            setError('No se pudo actualizar el perfil. Revisa tus datos.');
        }
    };

    return (
        <AuthShell title="Mi perfil" onSubmit={handleSubmit}>
            <label className="grid gap-2 font-semibold">
                Nombre
                <input className="vcm-input font-normal" value={nombre} onChange={(event) => setNombre(event.target.value)} required minLength={2} maxLength={50} />
            </label>
            <label className="grid gap-2 font-semibold">
                Correo electrónico
                <input className="vcm-input font-normal" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
            </label>
            <label className="grid gap-2 font-semibold">
                Nueva contraseña
                <input className="vcm-input font-normal" type="password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={6} placeholder="Déjala vacía para conservarla" />
            </label>
            <label className="grid gap-2 font-semibold">
                Confirmar contraseña
                <input className="vcm-input font-normal" type="password" value={confirmarPassword} onChange={(event) => setConfirmarPassword(event.target.value)} minLength={6} />
            </label>
            {error && <p className="vcm-alert text-center" role="alert">{error}</p>}
            {successMessage && <p className="vcm-alert vcm-alert--success text-center" role="status">{successMessage}</p>}
            <button type="submit" className="vcm-btn vcm-btn--primary mt-2 w-full">Guardar cambios</button>
            <button type="button" className="vcm-btn vcm-btn--danger w-full" onClick={onLogout}>Cerrar sesión</button>
        </AuthShell>
    );
}
