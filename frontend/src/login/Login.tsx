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
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!email || !password) {
            setError("Completa correo y contraseña");
            return;
        }

        try {
            setError("");
            const usuario = await login(email, password);
            onAuthenticated(usuario);
            navigate("/");
        } catch {
            setError("Correo o contraseña incorrectos");
        }
    };

    return (
        <AuthShell title="Iniciar sesión" onSubmit={handleSubmit}>
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

            {error && <p className="vcm-alert" role="alert">{error}</p>}

            <button className="vcm-btn vcm-btn--primary w-full" type="submit">Ingresar</button>

            <div className="h-px bg-[var(--border)]" aria-hidden="true" />

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
