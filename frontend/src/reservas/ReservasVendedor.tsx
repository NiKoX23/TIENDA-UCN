import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import BackToStore from '../components/BackToStore';
import StoreHeader from '../components/StoreHeader';
import type { Usuario } from '../services/auth.service';
import ReservasPanel from './ReservasPanel';

interface ReservasVendedorProps {
  usuario: Usuario;
  tema: 'dark' | 'light';
  onToggleTema: () => void;
  onLogout: () => void;
}

export default function ReservasVendedor({
  usuario,
  tema,
  onToggleTema,
  onLogout,
}: ReservasVendedorProps) {
  const [busqueda, setBusqueda] = useState('');
  const navigate = useNavigate();

  return (
    <div className="min-h-screen">
      <StoreHeader
        usuario={usuario}
        tema={tema}
        busqueda={busqueda}
        busquedaPlaceholder="Buscar reserva, nombre o correo"
        categoriaActiva="reservas"
        favoritos={0}
        carritoCantidad={0}
        onToggleTema={onToggleTema}
        onPerfil={() => navigate('/perfil')}
        onLogin={() => navigate('/login')}
        onLogout={onLogout}
        onAdmin={() => navigate('/admin')}
        onBusquedaChange={setBusqueda}
        onSelectCategoria={() => navigate('/')}
        onFavoritos={() => navigate('/')}
        onCarrito={() => navigate('/')}
      />
      <main className="mx-auto w-full max-w-[1080px] px-4 pb-14 pt-8 sm:px-8">
        <BackToStore className="mb-6" />
        <ReservasPanel
          administrador={false}
          vendedor
          busquedaControlada={{ valor: busqueda, alCambiar: setBusqueda }}
        />
      </main>
    </div>
  );
}
