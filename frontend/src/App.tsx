import { useEffect, useState } from 'react';
import { Navigate, Routes, Route, useNavigate } from 'react-router-dom';
import Login from './login/Login';
import Register from './register/Register';
import { logout, obtenerPerfil } from './services/auth.service';
import type { Usuario } from './services/auth.service';
import Tienda from './tienda/Tienda';
import './App.css';

export default function App() {
    const [usuario, setUsuario] = useState<Usuario | null | undefined>(undefined);
    const navigate = useNavigate();

    useEffect(() => {
        obtenerPerfil().then(setUsuario);
    }, []);

    const handleLogout = async () => {
        try {
            await logout();
        } finally {
            setUsuario(null);
            navigate('/login', { replace: true });
        }
    };

    if (usuario === undefined) {
        return <div className="app-loading">Cargando...</div>;
    }

    return (
        <Routes>
            <Route
                path="/"
                element={usuario ? <Tienda usuario={usuario} onLogout={handleLogout} /> : <Navigate to="/login" replace />}
            />
            <Route path="/login" element={<Login onAuthenticated={setUsuario} />} />
            <Route path="/register" element={<Register onAuthenticated={setUsuario} />} />
        </Routes>
    );
}