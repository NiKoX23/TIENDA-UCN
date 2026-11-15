import { useNavigate } from 'react-router-dom';
import escudoUcn from '../assets/icons/Escudo-UCN.png';
import { categorias } from '../productos/Productos';
import type { Usuario } from '../services/auth.service';
import UserAvatarMenu from './UserAvatarMenu';
import { BrandLockup } from './brand/BrandLogo';

interface StoreHeaderProps {
  usuario: Usuario | null;
  tema: 'dark' | 'light';
  busqueda: string;
  busquedaPlaceholder?: string;
  categoriaActiva: string;
  favoritos: number;
  carritoCantidad: number;
  onToggleTema: () => void;
  onPerfil: () => void;
  onLogin: () => void;
  onLogout: () => void;
  onAdmin: () => void;
  onBusquedaChange: (value: string) => void;
  onSelectCategoria: (categoria: string) => void;
  onFavoritos: () => void;
  onCarrito: () => void;
}

export default function StoreHeader({
  usuario,
  tema,
  busqueda,
  busquedaPlaceholder = 'Buscar polerones, llaveros, libretas…',
  categoriaActiva,
  favoritos,
  carritoCantidad,
  onToggleTema,
  onPerfil,
  onLogin,
  onLogout,
  onAdmin,
  onBusquedaChange,
  onSelectCategoria,
  onFavoritos,
  onCarrito,
}: StoreHeaderProps) {
  const navigate = useNavigate();
  const categoriasMenu = categorias.filter((categoria) => categoria.id !== 'todos');

  return (
    <header className="vcm-header sticky top-0 z-20 shadow-md shadow-black/10">
      <div className="vcm-bar" aria-hidden="true" />
      <div className="mx-auto flex max-w-[1240px] flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3 sm:px-8">
        <a className="flex items-center gap-3 whitespace-nowrap text-lg font-extrabold" href="/">
          <BrandLockup
            variant={tema === 'dark' ? 'white' : 'color'}
            height={28}
            className="shrink-0"
            partner={<img src={escudoUcn} alt="" />}
          />
          Tienda UCN
        </a>

        <nav className="hidden items-center gap-6 text-sm font-semibold lg:flex" aria-label="Categorías">
          {categoriasMenu.map((categoria) => (
            <button
              key={categoria.id}
              type="button"
              aria-current={categoriaActiva === categoria.id ? 'true' : undefined}
              className={`border-b-2 py-2 text-sm font-semibold capitalize transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 ${
                categoriaActiva === categoria.id
                  ? 'border-[var(--vcm-orange)]'
                  : 'border-transparent opacity-80 hover:border-current hover:opacity-100'
              }`}
              onClick={() => onSelectCategoria(categoria.id)}
            >
              {categoria.label}
            </button>
          ))}
        </nav>

        <div className="relative order-last min-w-[220px] flex-1 max-sm:basis-full lg:order-none lg:ml-auto lg:max-w-[420px]">
          <label htmlFor="tienda-busqueda" className="sr-only">Buscar productos</label>
          <svg className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3-3" />
          </svg>
          <input
            id="tienda-busqueda"
            type="search"
            placeholder={busquedaPlaceholder}
            className="h-11 w-full rounded-[var(--radius)] border border-[var(--vcm-chip-border)] bg-white pl-11 pr-4 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-500 focus:border-[var(--vcm-orange)] focus:ring-4 focus:ring-[var(--vcm-orange)]/30"
            value={busqueda}
            onChange={(event) => onBusquedaChange(event.target.value)}
          />
        </div>

        <div className="ml-auto flex items-center gap-2.5 lg:ml-0">
          <button
            type="button"
            className="vcm-iconbtn"
            aria-label={`Favoritos (${favoritos})`}
            aria-pressed={categoriaActiva === 'favoritos'}
            onClick={onFavoritos}
          >
            <svg className="h-[20px] w-[20px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
              <path d="M12 21s-7-4.35-9.5-8.5C.5 8.5 3 5 6.5 5c2 0 3.5 1.5 5.5 3.5C14 6.5 15.5 5 17.5 5 21 5 23.5 8.5 21.5 12.5 19 16.65 12 21 12 21Z" />
            </svg>
          </button>

          <button
            type="button"
            className="vcm-btn vcm-btn--primary relative gap-2 px-4 text-sm"
            aria-label={`Carrito (${carritoCantidad})`}
            data-reserva-focus-fallback
            onClick={onCarrito}
          >
            <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M6 8h12l-1 12H7L6 8Z" />
              <path d="M9 8V6a3 3 0 0 1 6 0v2" />
            </svg>
            <span className="max-sm:hidden">Carrito</span>
            {carritoCantidad > 0 && (
              <span className="grid h-5 min-w-5 place-items-center rounded-full bg-[var(--vcm-navy)] px-1 text-[11px] font-extrabold text-white" aria-hidden="true">
                {carritoCantidad}
              </span>
            )}
          </button>

          <button
            type="button"
            className="vcm-iconbtn"
            onClick={onToggleTema}
            aria-label={tema === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            title={tema === 'dark' ? 'Modo claro' : 'Modo oscuro'}
          >
            {tema === 'dark' ? '☀' : '☾'}
          </button>

          <UserAvatarMenu
            usuario={usuario}
            onLogin={onLogin}
            onPerfil={onPerfil}
            onReservas={() => navigate('/reservas')}
            onMisHorarios={() => navigate('/mis-horarios')}
            onVendedorReservas={() => navigate('/vendedor/reservas')}
            onMisVentas={() => navigate('/vendedor/ventas')}
            onAdmin={onAdmin}
            onLogout={onLogout}
          />
        </div>
      </div>
    </header>
  );
}
