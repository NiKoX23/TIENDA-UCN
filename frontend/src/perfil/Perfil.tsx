import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Usuario } from '../services/auth.service';
import { updateProfile } from '../services/auth.service';

interface PerfilProps {
    tema: 'dark' | 'light';
    usuario: Usuario;
    onLogout: () => void;
    onUpdated: (usuario: Usuario) => void;
}

export default function Perfil({ tema, usuario, onLogout, onUpdated }: PerfilProps) {
    const [nombre, setNombre] = useState(usuario.nombre);
    const [email, setEmail] = useState(usuario.email);
    const [password, setPassword] = useState('');
    const [confirmarPassword, setConfirmarPassword] = useState('');
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const navigate = useNavigate();

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
        <main className={`flex min-h-screen flex-col items-center px-5 pb-12 pt-8 ${tema === 'light' ? 'bg-[#f7f9fc]' : 'bg-[radial-gradient(circle_at_top_left,rgba(124,58,237,0.2),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(6,182,212,0.14),transparent_30%),linear-gradient(180deg,#050816,#0b1220)] text-slate-100'}`}>
            <button type="button" className="theme-dark-surface self-start rounded-full border border-slate-400/20 bg-slate-900/70 px-4 py-3 text-slate-200 transition hover:-translate-y-px hover:border-violet-400/50" onClick={() => navigate('/')}>
                volver a la tienda
            </button>
            <form className="theme-dark-surface mt-8 w-full max-w-lg rounded-[28px] border border-slate-400/20 bg-slate-900/80 p-8 shadow-2xl backdrop-blur-xl" onSubmit={handleSubmit}>
                <h1 className="mb-5 text-3xl font-extrabold tracking-tight">Mi perfil</h1>
                <label className="mt-4 grid gap-2 font-semibold text-slate-200">
                    Nombre
                    <input className="rounded-xl border border-slate-400/20 bg-slate-900/70 px-4 py-3 font-normal outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-500/15" value={nombre} onChange={(event) => setNombre(event.target.value)} required minLength={2} maxLength={50} />
                </label>
                <label className="mt-4 grid gap-2 font-semibold text-slate-200">
                    Correo electrónico
                    <input className="rounded-xl border border-slate-400/20 bg-slate-900/70 px-4 py-3 font-normal outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-500/15" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
                </label>
                <label className="mt-4 grid gap-2 font-semibold text-slate-200">
                    Nueva contraseña
                    <input className="rounded-xl border border-slate-400/20 bg-slate-900/70 px-4 py-3 font-normal outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-500/15" type="password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={6} placeholder="Déjala vacía para conservarla" />
                </label>
                <label className="mt-4 grid gap-2 font-semibold text-slate-200">
                    Confirmar contraseña
                    <input className="rounded-xl border border-slate-400/20 bg-slate-900/70 px-4 py-3 font-normal outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-500/15" type="password" value={confirmarPassword} onChange={(event) => setConfirmarPassword(event.target.value)} minLength={6} />
                </label>
                {error && <p className="mt-4 rounded-full border border-red-400/20 bg-red-950/30 px-4 py-3 text-center text-sm text-red-200">{error}</p>}
                {successMessage && <p className="mt-4 rounded-full border border-green-400/20 bg-green-950/30 px-4 py-3 text-center text-sm text-green-200">{successMessage}</p>}
                <button type="submit" className="mt-6 w-full rounded-xl bg-gradient-to-r from-violet-600 to-violet-400 px-4 py-3 font-bold text-white shadow-lg shadow-violet-900/30 transition hover:-translate-y-0.5 hover:brightness-105">Guardar cambios</button>
            </form>
            <button type="button" className="mt-5 rounded-full border border-red-400/20 bg-red-950/20 px-4 py-3 text-red-200 transition hover:-translate-y-px hover:bg-red-950/40" onClick={onLogout}>Cerrar sesión</button>
        </main>
    );
}