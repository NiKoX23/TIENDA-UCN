import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { login, loginConGoogle } from "../services/auth.service";
import googleLogo from "../assets/icons/googleLogo.png";
import type { Usuario } from "../services/auth.service";
import AuthShell from "../components/brand/AuthShell";

export default function Login({ onAuthenticated }: { tema: "dark" | "light"; onAuthenticated: (usuario: Usuario) => void }) {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [mostrarPassword, setMostrarPassword] = useState(false);
    const [cargando, setCargando] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!email || !password) {
            setError("Completa correo y contraseña");
            return;
        }

        try {
            setError("");
            setCargando(true);
            const usuario = await login(email, password);
            onAuthenticated(usuario);
            navigate("/");
        } catch {
            setError("Correo o contraseña incorrectos");
        } finally {
            setCargando(false);
        }
    };

    return (
        <AuthShell title="Iniciar sesión" onSubmit={handleSubmit}>
            <label className="vcm-auth-field" htmlFor="login-email">
                Correo electrónico
                <input id="login-email" className="vcm-input" type="email" placeholder="Correo electrónico" value={email} onChange={(e) => setEmail(e.target.value)} />
            </label>

            <label className="vcm-auth-field" htmlFor="login-password">
                Contraseña
                <span className="vcm-password-field">
                    <input id="login-password" className="vcm-input" type={mostrarPassword ? "text" : "password"} placeholder="Contraseña" value={password} onChange={(e) => setPassword(e.target.value)} />
                    <button className="vcm-password-toggle" type="button" aria-label={mostrarPassword ? "Ocultar contraseña" : "Mostrar contraseña"} onClick={() => setMostrarPassword((mostrar) => !mostrar)}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                            {mostrarPassword ? <><path d="M3 3l18 18" /><path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" /><path d="M9.9 5.2A10.8 10.8 0 0 1 12 5c5.5 0 9 7 9 7a14.8 14.8 0 0 1-3.1 3.8" /><path d="M6.2 6.2C3.9 7.7 3 12 3 12s3.5 7 9 7a9.9 9.9 0 0 0 3-.5" /></> : <><path d="M2.5 12s3.5-7 9.5-7 9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7Z" /><circle cx="12" cy="12" r="2.5" /></>}
                        </svg>
                    </button>
                </span>
            </label>

            {error && <p className="vcm-alert" role="alert"><span aria-hidden="true">!</span> {error}</p>}

            <button className="vcm-btn vcm-btn--primary w-full" type="submit" disabled={cargando} aria-busy={cargando}>
                {cargando && <span className="vcm-button-spinner" aria-hidden="true" />}
                Ingresar
            </button>

            <div className="vcm-auth-divider" aria-hidden="true">o</div>

            <button type="button" className="vcm-btn vcm-btn--surface w-full" onClick={loginConGoogle}>
                <img src={googleLogo} alt="" className="h-5 w-5" />
                Continuar con Google
            </button>

            <p className="text-center text-sm text-[var(--text-soft)]">
                ¿No tienes cuenta?{" "}
                <Link to="/register" className="font-bold text-[var(--primary)] underline-offset-2 hover:underline">
                    Regístrate aquí
                </Link>
            </p>
        </AuthShell>
    );
}
