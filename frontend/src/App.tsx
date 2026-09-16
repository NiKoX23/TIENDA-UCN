import { useEffect, useState } from 'react';
import { Navigate, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import Login from './login/Login';
import Register from './register/Register';
import { logout, obtenerPerfil } from './services/auth.service';
import type { Usuario } from './services/auth.service';
import Tienda from './tienda/Tienda';
import Perfil from './perfil/Perfil';
import DetalleProducto from './productos/DetalleProducto';
import './App.css';
import './Theme.css';

type Theme = 'dark' | 'light';

function cargarTema(): Theme {
    return localStorage.getItem('tema') === 'light' ? 'light' : 'dark';
}

export default function App() {
    const [usuario, setUsuario] = useState<Usuario | null | undefined>(undefined);
    const [tema, setTema] = useState<Theme>(cargarTema);
    const location = useLocation();
    const navigate = useNavigate();

    useEffect(() => {
        obtenerPerfil().then(setUsuario);
    }, []);

    useEffect(() => {
        localStorage.setItem('tema', tema);
        document.documentElement.dataset.theme = tema;
    }, [tema]);

    const handleLogout = async () => {
        try {
            await logout();
        } finally {
            setUsuario(null);
            navigate('/', { replace: true });
        }
    };

    return (
        <div className={`app-shell app-shell--${tema}`}>
            {location.pathname !== '/' && !location.pathname.startsWith('/producto/') && (
                <button
                    type="button"
                    className="theme-toggle"
                    onClick={() => setTema((actual) => (actual === 'dark' ? 'light' : 'dark'))}
                    aria-label={tema === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
                    title={tema === 'dark' ? 'Modo claro' : 'Modo oscuro'}
                >
                    {tema === 'dark' ? '☀️' : '🌙'}
                </button>
            )}

            {usuario === undefined ? (
                <div className="app-loading">Cargando...</div>
            ) : (
                <Routes>
                    <Route
                        path="/"
                        element={
                            <Tienda
                                usuario={usuario}
                                tema={tema}
                                onToggleTema={() => setTema((actual) => (actual === 'dark' ? 'light' : 'dark'))}
                                onPerfil={() => navigate('/perfil')}
                                onLogin={() => navigate('/login')}
                                onLogout={handleLogout}
                            />
                        }
                    />
                    <Route
                        path="/producto/:id"
                        element={
                            <DetalleProducto
                                usuario={usuario}
                                tema={tema}
                                onToggleTema={() => setTema((actual) => (actual === 'dark' ? 'light' : 'dark'))}
                                onPerfil={() => navigate('/perfil')}
                                onLogin={() => navigate('/login')}
                                onLogout={handleLogout}
                            />
                        }
                    />
                    <Route
                        path="/perfil"
                        element={usuario ? <Perfil usuario={usuario} onLogout={handleLogout} onUpdated={setUsuario} /> : <Navigate to="/login" replace />}
                    />
                    <Route path="/login" element={<Login onAuthenticated={setUsuario} />} />
                    <Route path="/register" element={<Register onAuthenticated={setUsuario} />} />
                </Routes>
            )}
        </div>
    );
}