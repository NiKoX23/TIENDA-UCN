import { useEffect, useState } from 'react';
import { Navigate, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import Login from './login/Login';
import Register from './register/Register';
import { logout, obtenerPerfil } from './services/auth.service';
import type { Usuario } from './services/auth.service';
import Tienda from './tienda/Tienda';
import Perfil from './perfil/Perfil';
import DetalleProducto from './productos/DetalleProducto';

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
        <div className={`min-h-screen ${tema === 'light' ? 'bg-[#f7f9fc] text-[#172033]' : 'bg-[#050816] text-slate-100'}`}>
            {location.pathname !== '/' && !location.pathname.startsWith('/producto/') && (
                <button
                    type="button"
                    className="theme-toggle-control fixed right-[76px] top-[18px] z-[100] grid h-[42px] w-[42px] place-items-center rounded-full border border-slate-400/30 bg-slate-900 text-lg text-white shadow-lg transition hover:-translate-y-px hover:border-violet-400 max-[720px]:right-[68px] max-[720px]:top-3"
                    onClick={() => setTema((actual) => (actual === 'dark' ? 'light' : 'dark'))}
                    aria-label={tema === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
                    title={tema === 'dark' ? 'Modo claro' : 'Modo oscuro'}
                >
                    {tema === 'dark' ? '☀' : '☾'}
                </button>
            )}

            {usuario === undefined ? (
                <div className="grid min-h-screen place-items-center bg-[radial-gradient(circle_at_top,rgba(124,58,237,0.18),transparent_30%),linear-gradient(180deg,#050816,#0b1220)] text-xs font-bold uppercase tracking-[0.18em] text-slate-100 before:mb-4 before:block before:h-11 before:w-11 before:rounded-full before:border-2 before:border-slate-400/20 before:border-r-violet-600 before:border-t-violet-300 before:animate-spin">Cargando...</div>
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
                        element={usuario ? <Perfil tema={tema} usuario={usuario} onLogout={handleLogout} onUpdated={setUsuario} /> : <Navigate to="/login" replace />}
                    />
                    <Route path="/login" element={<Login tema={tema} onAuthenticated={setUsuario} />} />
                    <Route path="/register" element={<Register tema={tema} onAuthenticated={setUsuario} />} />
                </Routes>
            )}
        </div>
    );
}