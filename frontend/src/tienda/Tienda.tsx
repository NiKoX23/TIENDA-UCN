import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import escudoUcn from '../assets/icons/Escudo-UCN.png';
import type { Usuario } from '../services/auth.service';
import type { Producto } from '../productos/Productos';
import { categorias } from '../productos/Productos';
import { listarProductos, comprarProductos } from '../services/productos.service';
import { useCarrito } from '../hooks/useCarrito';
import Carrito from '../carrito/Carrito';
import { formatearCLP } from '../utils/precio';

interface TiendaProps {
  usuario: Usuario | null;
  tema: 'dark' | 'light';
  onToggleTema: () => void;
  onPerfil: () => void;
  onLogin: () => void;
  onLogout: () => void;
  onAdmin: () => void;
}

function obtenerIniciales(nombre?: string, email?: string) {
  return (nombre || email || 'Usuario')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0]?.toUpperCase())
    .join('');
}

export default function Tienda({ usuario, tema, onToggleTema, onPerfil, onLogin, onLogout, onAdmin }: TiendaProps) {
  const navigate = useNavigate();
  const [categoriaActiva, setCategoriaActiva] = useState<string>('todos');
  const [busqueda, setBusqueda] = useState('');
  const [favoritos, setFavoritos] = useState<string[]>([]);
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [modalLoginAbierto, setModalLoginAbierto] = useState(false);
  const [carritoAbierto, setCarritoAbierto] = useState(false);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [cargandoProductos, setCargandoProductos] = useState(true);
  const [errorProductos, setErrorProductos] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const esInvitado = !usuario;

  const carrito = useCarrito(usuario?.uid);

  useEffect(() => {
    let activo = true;
    listarProductos()
      .then((datos) => {
        if (!activo) return;
        if (Array.isArray(datos)) {
          setProductos(datos);
        } else {
          setErrorProductos(true);
        }
      })
      .catch(() => {
        if (activo) setErrorProductos(true);
      })
      .finally(() => {
        if (activo) setCargandoProductos(false);
      });
    return () => {
      activo = false;
    };
  }, []);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuAbierto(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, []);

  // Si el usuario cierra sesión, el panel del carrito no debe quedar abierto.
  useEffect(() => {
    if (esInvitado) setCarritoAbierto(false);
  }, [esInvitado]);

  const productosFiltrados = useMemo(() => {
    return productos.filter((producto) => {
      const coincideCategoria =
        categoriaActiva === 'todos' ||
        (categoriaActiva === 'favoritos' && favoritos.includes(producto.codigoProducto)) ||
        producto.categoria === categoriaActiva;
      const coincideBusqueda = producto.nombre
        .toLowerCase()
        .includes(busqueda.toLowerCase());
      return coincideCategoria && coincideBusqueda;
    });
  }, [categoriaActiva, busqueda, favoritos, productos]);

  const abrirLogin = () => {
    setModalLoginAbierto(false);
    setMenuAbierto(false);
    onLogin();
  };

  const requiereLogin = () => {
    setModalLoginAbierto(true);
    setMenuAbierto(false);
  };

  const handleFavoritos = () => {
    if (esInvitado) {
      requiereLogin();
      return;
    }

    setCategoriaActiva((actual) => (actual === 'favoritos' ? 'todos' : 'favoritos'));
  };

  const handleToggleFavorito = (codigoProducto: string) => {
    if (esInvitado) {
      requiereLogin();
      return;
    }

    setFavoritos((actuales) =>
      actuales.includes(codigoProducto)
        ? actuales.filter((codigo) => codigo !== codigoProducto)
        : [...actuales, codigoProducto],
    );
  };

  const handleCarrito = () => {
    if (esInvitado) {
      requiereLogin();
      return;
    }

    setCarritoAbierto(true);
  };

  const handleAgregarAlCarrito = (producto: (typeof productos)[number]) => {
    if (esInvitado) {
      requiereLogin();
      return;
    }

    carrito.agregar(producto);
  };

  const handleIrAPagar = async () => {
    try {
      const compra = await comprarProductos(
        carrito.items.map(({ codigoProducto, cantidad }) => ({ codigoProducto, cantidad })),
      );
      carrito.vaciar();
      setCarritoAbierto(false);
      window.alert(`Compra registrada: ${compra.numeroDocumento}`);
    } catch {
      window.alert('No fue posible completar la compra. Revisa el stock disponible.');
    }
  };

  const avatarTexto = esInvitado ? 'IN' : obtenerIniciales(usuario?.nombre, usuario?.email);

  const explorarProductos = () => {
    document.getElementById('productos')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <main className="min-h-screen w-full bg-[radial-gradient(circle_at_top_left,rgba(124,58,237,0.22),transparent_38%),linear-gradient(180deg,#050816,#0b1220)] text-slate-100">
      {modalLoginAbierto && (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-slate-950/80 p-6 backdrop-blur-md" role="presentation" onClick={() => setModalLoginAbierto(false)}>
          <div
            className="w-full max-w-[420px] rounded-[26px] border border-violet-400/30 bg-slate-900 p-7 text-center shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="tienda-login-titulo"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mx-auto mb-4 grid h-[72px] w-[72px] place-items-center rounded-2xl border border-violet-300/30 bg-violet-500/15 text-3xl" aria-hidden="true">🔒</div>
            <h3 id="tienda-login-titulo" className="text-2xl font-bold">Inicia sesión para continuar</h3>
            <p className="mx-auto mb-5 max-w-xs text-sm leading-relaxed text-slate-300">Debes iniciar sesión para comprar y guardar tus favoritos.</p>
            <button type="button" className="rounded-xl bg-gradient-to-r from-violet-600 via-blue-500 to-cyan-400 px-5 py-3 font-extrabold text-white shadow-lg shadow-violet-900/30" onClick={abrirLogin}>
              Inicia sesión aquí
            </button>
          </div>
        </div>
      )}

      <Carrito
        abierto={carritoAbierto}
        items={carrito.items}
        total={carrito.total}
        onCerrar={() => setCarritoAbierto(false)}
        onSumar={carrito.sumarUno}
        onRestar={carrito.restarUno}
        onEliminar={carrito.eliminar}
        onCantidad={carrito.actualizarCantidad}
        onIrAPagar={handleIrAPagar}
      />

      <header className="theme-dark-header sticky top-0 z-20 flex flex-wrap items-center justify-between gap-4 border-b border-slate-400/15 bg-[#070b14] px-6 py-4 max-[720px]:px-4">
        <a className="group flex items-center gap-3 whitespace-nowrap text-base font-bold lowercase tracking-wider text-slate-100" href="/">
          <span className="theme-brand-icon grid h-[52px] w-[52px] shrink-0 place-items-center overflow-hidden rounded-2xl border border-violet-400/40 bg-gradient-to-br from-violet-600 to-blue-500 shadow-lg shadow-violet-900/30 transition duration-200 group-hover:-translate-y-px group-hover:scale-[1.02]" aria-hidden="true">
            <img src={escudoUcn} alt="Escudo UCN" className="h-full w-full object-contain p-1.5" />
          </span>
          tienda ucn
        </a>

        <div className="flex min-w-[220px] max-w-[520px] flex-1 items-center gap-2.5 rounded-2xl border border-slate-400/15 bg-slate-900/80 px-4 py-3 transition focus-within:-translate-y-px focus-within:border-violet-400/70 focus-within:ring-4 focus-within:ring-violet-500/15 max-[720px]:order-3 max-[720px]:max-w-none">
          <svg className="h-[18px] w-[18px] shrink-0 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3-3" />
          </svg>
          <input
            type="search"
            placeholder="buscar poleras, polerones..."
            className="w-full border-0 bg-transparent text-[0.92rem] text-slate-100 outline-none placeholder:text-slate-500"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            className="grid h-11 w-11 place-items-center rounded-xl border border-slate-400/15 bg-slate-900/70 text-slate-300 transition hover:-translate-y-0.5 hover:border-violet-400/40"
            aria-label={`Favoritos (${favoritos.length})`}
            onClick={handleFavoritos}
          >
            <svg className="h-[22px] w-[22px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M12 21s-7-4.35-9.5-8.5C.5 8.5 3 5 6.5 5c2 0 3.5 1.5 5.5 3.5C14 6.5 15.5 5 17.5 5 21 5 23.5 8.5 21.5 12.5 19 16.65 12 21 12 21Z" />
            </svg>
          </button>

          <button
            type="button"
            className="relative grid h-11 w-11 place-items-center rounded-xl border border-slate-400/15 bg-slate-900/70 text-slate-300 transition hover:-translate-y-0.5 hover:border-violet-400/40"
            aria-label={`Carrito (${carrito.cantidadTotal})`}
            onClick={handleCarrito}
          >
            <svg className="h-[22px] w-[22px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M6 8h12l-1 12H7L6 8Z" />
              <path d="M9 8V6a3 3 0 0 1 6 0v2" />
            </svg>
            {carrito.cantidadTotal > 0 && (
              <span className="absolute -right-1 -top-1 grid h-[18px] w-[18px] place-items-center rounded-full bg-gradient-to-br from-violet-600 to-blue-400 text-[10px] font-extrabold text-white" aria-hidden="true">
                {carrito.cantidadTotal}
              </span>
            )}
          </button>

          <button
            type="button"
            className="theme-toggle-control grid h-11 w-11 place-items-center rounded-full border border-slate-400/30 bg-slate-900 text-lg text-white shadow-lg transition hover:-translate-y-px hover:border-violet-400"
            onClick={onToggleTema}
            aria-label={tema === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            title={tema === 'dark' ? 'Modo claro' : 'Modo oscuro'}
          >
            {tema === 'dark' ? '☀' : '☾'}
          </button>

          <div className="relative flex items-center" ref={menuRef}>
            <button
              type="button"
              className={`grid h-11 w-11 place-items-center rounded-full border-2 text-xs font-bold text-white shadow-lg transition hover:-translate-y-0.5 ${esInvitado ? 'border-slate-400/40 bg-slate-600/50' : 'border-violet-300/50 bg-gradient-to-br from-violet-600/50 to-cyan-500/30'}`}
              onClick={() => setMenuAbierto((actual) => !actual)}
              title={esInvitado ? 'Cuenta de invitado' : 'Ver perfil'}
              aria-label={esInvitado ? 'Cuenta de invitado' : 'Ver perfil'}
            >
              {avatarTexto}
            </button>

            {menuAbierto && (
              <div className="absolute right-0 top-[calc(100%+12px)] z-30 flex min-w-44 flex-col gap-2 rounded-2xl border border-slate-400/15 bg-slate-900/95 p-3 shadow-2xl" role="menu" aria-label="Menú del usuario">
                {esInvitado ? (
                  <button
                    type="button"
                    className={`rounded-xl px-3 py-2 text-left text-sm font-semibold ${tema === 'light' ? 'bg-blue-50 text-slate-700 hover:bg-blue-100' : 'bg-violet-500/15 text-slate-100 hover:bg-violet-500/25'}`}
                    onClick={abrirLogin}
                  >
                    Iniciar sesión
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      className={`rounded-xl px-3 py-2 text-left text-sm font-semibold ${tema === 'light' ? 'bg-blue-50 text-slate-700 hover:bg-blue-100' : 'bg-violet-500/15 text-slate-100 hover:bg-violet-500/25'}`}
                      onClick={() => {
                        setMenuAbierto(false);
                        onPerfil();
                      }}
                    >
                      Editar perfil
                    </button>
                    {usuario?.esAdmin && (
                      <button
                        type="button"
                        className={`rounded-xl px-3 py-2 text-left text-sm font-semibold ${tema === 'light' ? 'bg-violet-100 text-violet-700 hover:bg-violet-200' : 'bg-slate-500/15 text-slate-100 hover:bg-slate-500/25'}`}
                        onClick={() => {
                          setMenuAbierto(false);
                          onAdmin();
                        }}
                      >
                        Panel admin
                      </button>
                    )}
                    <button
                      type="button"
                      className="rounded-xl bg-red-500/15 px-3 py-2 text-left text-sm font-semibold text-red-200 hover:bg-red-500/25"
                      onClick={() => {
                        setMenuAbierto(false);
                        onLogout();
                      }}
                    >
                      Cerrar sesión
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      <section className={`theme-banner relative mx-6 my-6 flex items-center justify-between gap-8 overflow-hidden rounded-[22px] border px-[60px] py-10 shadow-2xl max-[768px]:flex-col max-[768px]:gap-8 max-[768px]:px-6 max-[768px]:py-8 max-[640px]:mx-4 max-[640px]:text-center ${tema === 'light' ? 'border-blue-200 bg-gradient-to-br from-sky-100 via-blue-100 to-indigo-100 text-slate-900' : 'border-cyan-400/20 bg-gradient-to-br from-indigo-950 via-slate-950 to-cyan-950 text-white shadow-cyan-950/40'}`}>
        <div className="relative z-[2] max-w-2xl">
          <h1 className="mb-4 text-[2.5rem] font-extrabold leading-tight text-white max-[768px]:text-[2rem]">¡Bienvenido a la Tienda UCN!</h1>
          <p className="mb-8 max-w-xl text-[1.1rem] leading-relaxed text-white/90">Descubre la mejor selección de merchandising oficial, ropa y accesorios exclusivos para nuestra comunidad.</p>
          <button 
            type="button" 
            className="theme-banner-cta rounded-xl bg-white px-7 py-3.5 text-base font-bold text-blue-600 shadow-lg shadow-violet-900/30 transition hover:-translate-y-0.5 hover:shadow-xl" 
            onClick={explorarProductos}
          >
            Explorar Colección
          </button>
        </div>
        <div className="z-[2] grid h-[200px] w-[200px] shrink-0 rotate-[5deg] place-items-center rounded-3xl border border-white/20 bg-white/10 p-6 shadow-[0_0_55px_rgba(125,211,252,0.38)] backdrop-blur-md max-[768px]:h-[150px] max-[768px]:w-[150px]">
          <img src={escudoUcn} alt="Escudo UCN" className="h-full w-full object-contain drop-shadow-[0_0_24px_rgba(255,255,255,0.55)]" aria-hidden="true" />
        </div>
      </section>

      <nav className="flex gap-2.5 overflow-x-auto px-5 pb-2 pt-4">
        {categorias.map((categoria) => (
          <button
            key={categoria.id}
            type="button"
            className={
              categoriaActiva === categoria.id
                ? 'whitespace-nowrap rounded-full bg-gradient-to-r from-violet-600 to-violet-400 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-violet-900/30'
                : 'whitespace-nowrap rounded-full border border-slate-400/15 bg-slate-900/50 px-4 py-2 text-xs font-semibold text-slate-300 hover:border-violet-400/40'
            }
            onClick={() => setCategoriaActiva(categoria.id)}
          >
            {categoria.label}
          </button>
        ))}
      </nav>

      <section id="productos" className="scroll-mt-24 px-5 pb-8 pt-5" aria-labelledby="destacados-titulo">
        <div className="mb-4 flex items-center justify-between">
          <h2 id="destacados-titulo" className="text-base font-bold tracking-tight">destacados</h2>
          <button type="button" className="flex items-center gap-0.5 text-sm font-semibold text-blue-400" onClick={() => setCategoriaActiva('todos')}>
            ver todos
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="m9 6 6 6-6 6" />
            </svg>
          </button>
        </div>

        <div className="grid grid-cols-3 gap-4 max-[768px]:grid-cols-2 max-[480px]:grid-cols-1">
          {cargandoProductos && <p className="text-slate-400">Cargando productos...</p>}
          {errorProductos && <p className="text-slate-400">No fue posible cargar el catálogo.</p>}
          {productosFiltrados.map((producto) => (
            <article className="theme-dark-surface overflow-hidden rounded-[22px] border border-slate-400/15 bg-slate-900/90 transition duration-200 hover:-translate-y-1.5 hover:border-violet-400/40 hover:shadow-2xl" key={producto.codigoProducto}>
              <div className="relative overflow-hidden">
                <div 
                  className="relative flex h-[220px] items-center justify-center overflow-hidden bg-white/[0.03] transition hover:scale-[1.03]"
                  onClick={() => navigate(`/producto/${producto.codigoProducto}`)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter') navigate(`/producto/${producto.codigoProducto}`) }}
                  style={{ cursor: 'pointer' }}
                >
                  <img src={producto.imagen} alt={producto.nombre} className="h-full w-full object-contain p-4 drop-shadow-lg" />
                </div>

                <button
                  type="button"
                  className={`absolute right-3 top-3 z-10 grid rounded-full bg-slate-900/65 p-2 text-slate-400 backdrop-blur ${favoritos.includes(producto.codigoProducto) ? 'text-pink-400' : ''}`}
                  aria-label={favoritos.includes(producto.codigoProducto) ? 'Quitar de favoritos' : 'Agregar a favoritos'}
                  onClick={(e) => { e.stopPropagation(); handleToggleFavorito(producto.codigoProducto); }}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M12 21s-7-4.35-9.5-8.5C.5 8.5 3 5 6.5 5c2 0 3.5 1.5 5.5 3.5C14 6.5 15.5 5 17.5 5 21 5 23.5 8.5 21.5 12.5 19 16.65 12 21 12 21Z" />
                  </svg>
                </button>
              </div>

              <div className="p-4">
                <p 
                  className="cursor-pointer text-sm font-bold text-slate-100"
                  onClick={() => navigate(`/producto/${producto.codigoProducto}`)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter') navigate(`/producto/${producto.codigoProducto}`) }}
                  style={{ cursor: 'pointer' }}
                >
                  {producto.nombre}
                </p>
                <div className="mt-2">
                  <p className="text-lg font-extrabold text-slate-200">{formatearCLP(producto.precio)}</p>
                </div>
                <div className="mt-2">
                  <span className={`rounded-md px-2 py-1 text-xs font-semibold ${producto.stock > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                    {producto.stock > 0 ? `${producto.stock} disponibles` : 'sin stock'}
                  </span>
                </div>
                <button
                  type="button"
                  className="cart-add-button mt-4 w-full rounded-xl border border-blue-400/40 bg-slate-800/70 px-3 py-2.5 text-sm font-bold text-slate-200 transition duration-200 enabled:hover:-translate-y-0.5 enabled:hover:scale-[1.02] enabled:hover:border-blue-400 enabled:hover:bg-blue-600 enabled:hover:text-white enabled:hover:shadow-lg enabled:hover:shadow-blue-900/30 disabled:cursor-not-allowed disabled:opacity-40"
                  onClick={() => handleAgregarAlCarrito(producto)}
                  disabled={producto.stock < 1}
                >
                  {producto.stock > 0 ? 'Agregar al carrito' : 'agotado'}
                </button>
              </div>
            </article>
          ))}

          {productosFiltrados.length === 0 && (
            <p className="text-slate-400">No hay productos que coincidan con tu búsqueda.</p>
          )}
        </div>
      </section>

      <section className="theme-dark-surface mx-5 mb-8 flex items-center gap-4 rounded-[22px] border border-slate-400/15 bg-slate-900/70 px-5 py-4 text-cyan-300">
        <svg className="h-8 w-8 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
          <path d="M3 7h11v9H3z" />
          <path d="M14 10h4l3 3v3h-7z" />
          <circle cx="7.5" cy="18" r="1.5" />
          <circle cx="17.5" cy="18" r="1.5" />
        </svg>
        <div>
          <p className="font-bold">envío gratis</p>
          <p className="text-sm text-slate-300">en compras sobre $30.000</p>
        </div>
      </section>
    </main>
  );
}