import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { register } from '../services/auth.service';
import axios from 'axios';
import './Register.css';
import type { Usuario } from '../services/auth.service';

export default function Register({ onAuthenticated }: { onAuthenticated: (usuario: Usuario) => void }) {
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
        <div className="register-container">
            <form className="register-form" onSubmit={handleSubmit}>
                <h1 className="register-form-titulo">Crear cuenta</h1>

                <input
                    className="register-form-input"
                    type="text"
                    placeholder="Nombre completo"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                />

                <input
                    className="register-form-input"
                    type="email"
                    placeholder="Correo electrónico"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                />

                <input
                    className="register-form-input"
                    type="password"
                    placeholder="Contraseña"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                />

                <input
                    className="register-form-input"
                    type="password"
                    placeholder="Confirmar contraseña"
                    value={confirmarPassword}
                    onChange={(e) => setConfirmarPassword(e.target.value)}
                />

                {error && <p className="register-form-error">{error}</p>}

                <button className="register-form-button" type="submit">
                    Registrarme
                </button>

                <p className="register-form-login">
                    ¿Ya tienes cuenta?{' '}
                    <Link to="/login" className="register-form-login-link">
                        Inicia sesión
                    </Link>
                </p>
            </form>
        </div>
    );
}