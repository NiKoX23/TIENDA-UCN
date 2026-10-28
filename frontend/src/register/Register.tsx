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
            const usuario = await register(nombre, email, password);
            onAuthenticated(usuario);
            navigate("/");
        } catch (err: unknown) {
            if (axios.isAxiosError(err) && err.response?.status === 409) {
                setError("Ese correo ya está registrado");
            } else {
                setError("No se pudo completar el registro");
            }
        }
    };

    return (
        <AuthShell title="Crear cuenta" onSubmit={handleSubmit}>
            <input
                className="vcm-input"
                type="text"
                placeholder="Nombre completo"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
            />

            <input
                className="vcm-input"
                type="email"
                placeholder="Correo electrónico"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
            />

            <input
                className="vcm-input"
                type="password"
                placeholder="Contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
            />

            <input
                className="vcm-input"
                type="password"
                placeholder="Confirmar contraseña"
                value={confirmarPassword}
                onChange={(e) => setConfirmarPassword(e.target.value)}
            />

            {error && <p className="vcm-alert" role="alert">{error}</p>}

            <button className="vcm-btn vcm-btn--primary w-full" type="submit">
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
