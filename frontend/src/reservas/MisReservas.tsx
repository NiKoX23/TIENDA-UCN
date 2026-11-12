import BackToStore from '../components/BackToStore';
import { BrandBlocks } from '../components/brand/BrandFigures';
import ReservasPanel from './ReservasPanel';
import { useNavigate } from 'react-router-dom';

export default function MisReservas() {
  const navigate = useNavigate();

  return (
    <main className="vcm-page min-h-screen px-4 pb-12 pt-8 sm:px-6">
      <div className="mx-auto w-full max-w-6xl">
        <BackToStore className="mb-6" />
        <div className="vcm-card mx-auto w-full max-w-5xl overflow-hidden shadow-2xl">
          <div className="vcm-hero relative overflow-hidden px-6 py-8 sm:px-9 sm:py-10">
            <BrandBlocks variant="hero" />
            <div className="vcm-hero__content max-w-2xl">
              <span className="vcm-eyebrow">Tienda UCN · Cuenta</span>
              <h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">Tus reservas</h1>
              <p className="mt-2 max-w-xl text-sm opacity-90 sm:text-base">
                Consulta el retiro y seguimiento de los productos que reservaste.
              </p>
            </div>
          </div>
          <div className="vcm-bar" aria-hidden="true" />
          <div className="p-4 sm:p-7">
            <ReservasPanel administrador={false} onIrTienda={() => navigate('/')} />
          </div>
        </div>
      </div>
    </main>
  );
}
