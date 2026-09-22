import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { register } from '../services/auth.service';
import axios from 'axios';
import type { Usuario } from '../services/auth.service';

export default function Register({ tema, onAuthenticated }: { tema: 'dark' | 'light'; onAuthenticated: (usuario: Usuario) => void }) {
    const [nombre, setNombre] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmarPassword, setConfirmarPassword] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {e.preventDefault();

        if (!nombre || !email || !password || !confirmarPassword) {
            setError('Completa todos los campos');
            return;
        }

        if (password !== confirmarPassword) {
            setError('Las contraseñas no coinciden');
            return;
        }

        if (password.length < 6) {
            setError('La contraseña debe tener al menos 6 caracteres');
            return;
        }

        try {
            setError('');
            const usuario = await register(nombre, email, password);
            onAuthenticated(usuario);
            navigate('/');
        } catch (err: unknown) {
            if (axios.isAxiosError(err) && err.response?.status === 409) {
                setError('Ese correo ya está registrado');
            } else {
                setError('No se pudo completar el registro');
            }
        }
    };

    return (
        <div className={`grid min-h-screen place-items-center px-5 py-8 ${tema === 'light' ? 'bg-[#f7f9fc]' : 'bg-[radial-gradient(circle_at_top_left,rgba(124,58,237,0.2),transparent_30%),linear-gradient(180deg,#050816,#0b1220)] text-slate-100'}`}>
            <form className="theme-dark-surface flex w-full max-w-md flex-col gap-4 rounded-[28px] border border-slate-400/20 bg-slate-900/80 p-8 shadow-2xl backdrop-blur-xl max-[480px]:p-6" onSubmit={handleSubmit}>
                <h1 className="mb-3 text-3xl font-extrabold tracking-tight text-slate-50">Crear cuenta</h1>

                <input
                    className="rounded-xl border border-slate-400/20 bg-slate-900/70 px-4 py-3 text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-violet-400 focus:ring-4 focus:ring-violet-500/15"
                    type="text"
                    placeholder="Nombre completo"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                />

                <input
                    className="rounded-xl border border-slate-400/20 bg-slate-900/70 px-4 py-3 text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-violet-400 focus:ring-4 focus:ring-violet-500/15"
                    type="email"
                    placeholder="Correo electrónico"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                />

                <input
                    className="rounded-xl border border-slate-400/20 bg-slate-900/70 px-4 py-3 text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-violet-400 focus:ring-4 focus:ring-violet-500/15"
                    type="password"
                    placeholder="Contraseña"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                />

                <input
                    className="rounded-xl border border-slate-400/20 bg-slate-900/70 px-4 py-3 text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-violet-400 focus:ring-4 focus:ring-violet-500/15"
                    type="password"
                    placeholder="Confirmar contraseña"
                    value={confirmarPassword}
                    onChange={(e) => setConfirmarPassword(e.target.value)}
                />

                {error && <p className="rounded-xl border border-red-400/20 bg-red-950/30 px-3 py-2 text-sm font-semibold text-red-200">{error}</p>}

                <button className="rounded-xl bg-gradient-to-r from-violet-600 via-blue-500 to-cyan-400 px-4 py-3 font-bold text-white shadow-lg shadow-violet-900/30 transition hover:-translate-y-0.5 hover:brightness-105" type="submit">
                    Registrarme
                </button>

                <p className="text-center text-sm text-slate-400">
                    ¿Ya tienes cuenta?{' '}
                    <Link to="/login" className="font-semibold text-violet-300 hover:text-violet-200">
                        Inicia sesión
                    </Link>
                </p>
            </form>
        </div>
    );
}