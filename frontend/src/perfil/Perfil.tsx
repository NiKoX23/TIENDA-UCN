import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Usuario } from '../services/auth.service';
import { updateProfile } from '../services/auth.service';
import './Perfil.css';

interface PerfilProps {
    usuario: Usuario;
    onLogout: () => void;
    onUpdated: (usuario: Usuario) => void;
}

export default function Perfil({ usuario, onLogout, onUpdated }: PerfilProps) {
    const [nombre, setNombre] = useState(usuario.nombre);
    const [email, setEmail] = useState(usuario.email);
    const [password, setPassword] = useState('');
    const [confirmarPassword, setConfirmarPassword] = useState('');
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setError('');
        setSuccessMessage('');

        if (password && password !== confirmarPassword) {
            setError('Las contraseñas no coinciden');
            return;
        }

        try {
            const usuarioActualizado = await updateProfile(nombre, email, password || undefined);
            onUpdated(usuarioActualizado);
            setPassword('');
            setConfirmarPassword('');
            setSuccessMessage('Perfil actualizado correctamente');
        } catch {
            setError('No se pudo actualizar el perfil. Revisa tus datos.');
        }
    };

    return (
        <main className="perfil">
            <button type="button" className="perfil-volver" onClick={() => navigate('/')}>
                volver a la tienda
            </button>
            <form className="perfil-formulario" onSubmit={handleSubmit}>
                <h1>Mi perfil</h1>
                <label>
                    Nombre
                    <input value={nombre} onChange={(event) => setNombre(event.target.value)} required minLength={2} maxLength={50} />
                </label>
                <label>
                    Correo electrónico
                    <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
                </label>
                <label>
                    Nueva contraseña
                    <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={6} placeholder="Déjala vacía para conservarla" />
                </label>
                <label>
                    Confirmar contraseña
                    <input type="password" value={confirmarPassword} onChange={(event) => setConfirmarPassword(event.target.value)} minLength={6} />
                </label>
                {error && <p className="perfil-mensaje perfil-mensaje--error">{error}</p>}
                {successMessage && <p className="perfil-mensaje perfil-mensaje--exito">{successMessage}</p>}
                <button type="submit" className="perfil-guardar">Guardar cambios</button>
            </form>
            <button type="button" className="perfil-cerrar" onClick={onLogout}>Cerrar sesión</button>
        </main>
    );
}