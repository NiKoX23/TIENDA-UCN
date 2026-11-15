import { useEffect, useState } from 'react';
import { Navigate, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import Login from './login/Login';
import Register from './register/Register';
import { logout, obtenerPerfil } from './services/auth.service';
import type { Usuario } from './services/auth.service';
import { claveAvisoTurnosVendedor } from './services/horarios-venta.service';
import TurnoVendedorAviso from './components/TurnoVendedorAviso';
import Tienda from './tienda/Tienda';
import Perfil from './perfil/Perfil';
import DetalleProducto from './productos/DetalleProducto';
import AdminPanel from './admin/AdminPanel';
import MisReservas from './reservas/MisReservas';
import MisHorarios from './reservas/MisHorarios';
import ReservasVendedor from './reservas/ReservasVendedor';
import MisVentas from './ventas/MisVentas';

type Theme = 'dark' | 'light';

function cargarTema(): Theme {
    const guardado = localStorage.getItem('tema');
    return guardado === 'dark' || guardado === 'light' ? guardado : (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
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
        if (usuario) sessionStorage.removeItem(claveAvisoTurnosVendedor(usuario.uid));
        try {
            await logout();
            window.location.replace('/');
        } catch {
            setUsuario(null);
            navigate('/', { replace: true });
        }
    };

    return (
        <div className="app-shell min-h-screen">
            {location.pathname !== '/' &&
                location.pathname !== '/mis-horarios' &&
                !location.pathname.startsWith('/vendedor/') &&
                !location.pathname.startsWith('/producto/') && (
                <button
                    type="button"
                    className="vcm-iconbtn fixed right-[76px] top-[18px] z-[100] text-lg shadow-lg max-[720px]:right-[68px] max-[720px]:top-3"
                    onClick={() => setTema((actual) => (actual === 'dark' ? 'light' : 'dark'))}
                    aria-label={tema === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
                    title={tema === 'dark' ? 'Modo claro' : 'Modo oscuro'}
                >
                    {tema === 'dark' ? '☀' : '☾'}
                </button>
            )}

            {usuario && <TurnoVendedorAviso usuario={usuario} />}

            {usuario === undefined ? (
                <div className="vcm-auth">
                    <span className="vcm-spinner">Cargando...</span>
                </div>
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
                                onAdmin={() => navigate('/admin')}
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
                                onAdmin={() => navigate('/admin')}
                            />
                        }
                    />
                    <Route
                        path="/perfil"
                        element={usuario ? <Perfil tema={tema} usuario={usuario} onLogout={handleLogout} onUpdated={setUsuario} /> : <Navigate to="/login" replace />}
                    />
                    <Route
                        path="/reservas"
                        element={usuario ? <MisReservas /> : <Navigate to="/login" replace />}
                    />
                    <Route
                        path="/mis-horarios"
                        element={
                            usuario?.esVendedor && !usuario.esAdmin ? (
                                <MisHorarios
                                    usuario={usuario}
                                    tema={tema}
                                    onToggleTema={() => setTema((actual) => (actual === 'dark' ? 'light' : 'dark'))}
                                    onPerfil={() => navigate('/perfil')}
                                    onLogin={() => navigate('/login')}
                                    onLogout={handleLogout}
                                    onAdmin={() => navigate('/admin')}
                                />
                            ) : (
                                <Navigate to="/" replace />
                            )
                        }
                    />
                    <Route
                        path="/vendedor/reservas"
                        element={
                            usuario?.esVendedor && !usuario.esAdmin ? (
                                <ReservasVendedor
                                    usuario={usuario}
                                    tema={tema}
                                    onToggleTema={() => setTema((actual) => (actual === 'dark' ? 'light' : 'dark'))}
                                    onLogout={handleLogout}
                                />
                            ) : (
                                <Navigate to="/" replace />
                            )
                        }
                    />
                    <Route
                        path="/vendedor/ventas"
                        element={
                            usuario?.esVendedor && !usuario.esAdmin ? (
                                <MisVentas
                                    usuario={usuario}
                                    tema={tema}
                                    onToggleTema={() => setTema((actual) => (actual === 'dark' ? 'light' : 'dark'))}
                                    onLogout={handleLogout}
                                />
                            ) : (
                                <Navigate to="/" replace />
                            )
                        }
                    />
                    <Route
                        path="/admin"
                        element={!usuario ? <Navigate to="/login" replace /> : usuario.esAdmin ? <AdminPanel tema={tema} onToggleTema={() => setTema((actual) => (actual === 'dark' ? 'light' : 'dark'))} usuario={usuario} /> : <Navigate to="/" replace />}
                    />
                    <Route path="/login" element={<Login tema={tema} onAuthenticated={setUsuario} />} />
                    <Route path="/register" element={<Register tema={tema} onAuthenticated={setUsuario} />} />
                </Routes>
            )}
        </div>
    );
}
