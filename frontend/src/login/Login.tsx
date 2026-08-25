import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { login, loginConGoogle } from '../services/auth.service';
import googleLogo from '../assets/icons/googleLogo.png';
import './Login.css';
import type { Usuario } from '../services/auth.service';

export default function Login({ onAuthenticated }: { onAuthenticated: (usuario: Usuario) => void }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!email || !password) {
            setError('Completa correo y contraseña');
            return;
        }

        try {
            setError('');
            const usuario = await login(email, password);
            onAuthenticated(usuario);
            navigate('/');
        } catch {
            setError('Correo o contraseña incorrectos');
        }
    };

    return (
        <div className="login-container">
            <form className="login-form" onSubmit={handleSubmit}>
                <h1 className="login-form-titulo">Iniciar sesión</h1>

                <input 
                    className="login-form-input"
                    type="email"
                    placeholder="Correo electrónico"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                />

                <input
                    className="login-form-input"
                    type="password"
                    placeholder="Contraseña"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                />

                {error && <p className="login-form-error">{error}</p>}

                <button className="login-form-boton" type="submit">Ingresar</button>

                <div className="login-form-separador">o</div>

                <button type="button" className="login-form-boton-google" onClick={loginConGoogle}>
                    <img src={googleLogo} alt="Google" className="login-form-boton-google-logo"/>
                    Continuar con Google
                </button>

                <p className="login-form-registro">
                    ¿No tienes cuenta?{' '}
                    <Link to="/register" className="login-form-registro-link">
                        Regístrate aquí
                    </Link>
                </p>
            </form>
        </div>
    );
}