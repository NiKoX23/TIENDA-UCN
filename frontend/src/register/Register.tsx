import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { register } from "../services/auth.service";
import axios from "axios";
import type { Usuario } from "../services/auth.service";
import AuthShell from "../components/brand/AuthShell";

export default function Register({ onAuthenticated }: { tema: "dark" | "light"; onAuthenticated: (usuario: Usuario) => void }) {
    const [nombre, setNombre] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmarPassword, setConfirmarPassword] = useState("");
    const [error, setError] = useState("");
    const [mostrarPassword, setMostrarPassword] = useState(false);
    const [mostrarConfirmarPassword, setMostrarConfirmarPassword] = useState(false);
    const [cargando, setCargando] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!nombre || !email || !password || !confirmarPassword) {
            setError("Completa todos los campos");
            return;
        }

        if (password !== confirmarPassword) {
            setError("Las contraseñas no coinciden");
            return;
        }

        if (password.length < 6) {
            setError("La contraseña debe tener al menos 6 caracteres");
            return;
        }

        try {
            setError("");
            setCargando(true);
            const usuario = await register(nombre, email, password);
            onAuthenticated(usuario);
            navigate("/");
        } catch (err: unknown) {
            if (axios.isAxiosError(err) && err.response?.status === 409) {
                setError("Ese correo ya está registrado");
            } else {
                setError("No se pudo completar el registro");
            }
        } finally {
            setCargando(false);
        }
    };

    return (
        <AuthShell title="Crear cuenta" onSubmit={handleSubmit}>
            <label className="vcm-auth-field" htmlFor="register-name">
                Nombre completo
                <input id="register-name" className="vcm-input" type="text" placeholder="Nombre completo" value={nombre} onChange={(e) => setNombre(e.target.value)} />
            </label>

            <label className="vcm-auth-field" htmlFor="register-email">
                Correo electrónico
                <input id="register-email" className="vcm-input" type="email" placeholder="Correo electrónico" value={email} onChange={(e) => setEmail(e.target.value)} />
            </label>

            <label className="vcm-auth-field" htmlFor="register-password">
                Contraseña
                <span className="vcm-password-field">
                    <input id="register-password" className="vcm-input" type={mostrarPassword ? "text" : "password"} placeholder="Contraseña" value={password} onChange={(e) => setPassword(e.target.value)} />
                    <button className="vcm-password-toggle" type="button" aria-label={mostrarPassword ? "Ocultar contraseña" : "Mostrar contraseña"} onClick={() => setMostrarPassword((mostrar) => !mostrar)}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M2.5 12s3.5-7 9.5-7 9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7Z" /><circle cx="12" cy="12" r="2.5" /></svg>
                    </button>
                </span>
            </label>

            <label className="vcm-auth-field" htmlFor="register-confirm-password">
                Confirmar contraseña
                <span className="vcm-password-field">
                    <input id="register-confirm-password" className="vcm-input" type={mostrarConfirmarPassword ? "text" : "password"} placeholder="Confirmar contraseña" value={confirmarPassword} onChange={(e) => setConfirmarPassword(e.target.value)} />
                    <button className="vcm-password-toggle" type="button" aria-label={mostrarConfirmarPassword ? "Ocultar contraseña" : "Mostrar contraseña"} onClick={() => setMostrarConfirmarPassword((mostrar) => !mostrar)}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M2.5 12s3.5-7 9.5-7 9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7Z" /><circle cx="12" cy="12" r="2.5" /></svg>
                    </button>
                </span>
            </label>

            {error && <p className="vcm-alert" role="alert"><span aria-hidden="true">!</span> {error}</p>}

            <button className="vcm-btn vcm-btn--primary w-full" type="submit" disabled={cargando} aria-busy={cargando}>
                {cargando && <span className="vcm-button-spinner" aria-hidden="true" />}
                Registrarme
            </button>

            <p className="text-center text-sm text-[var(--text-soft)]">
                ¿Ya tienes cuenta?{" "}
                <Link to="/login" className="font-bold text-[var(--primary)] underline-offset-2 hover:underline">
                    Inicia sesión
                </Link>
            </p>
        </AuthShell>
    );
}
