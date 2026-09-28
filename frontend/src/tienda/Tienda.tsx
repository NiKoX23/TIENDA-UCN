import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import escudoUcn from '../assets/icons/Escudo-UCN.png';
import { obtenerColorAvatar, obtenerIniciales, type Usuario } from '../services/auth.service';
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

function categoriaProducto(categoria: string): string {
  const categoriaNormalizada = categoria.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  if (categoriaNormalizada.includes('papeleria')) return 'papeleria';
  if (categoriaNormalizada.includes('accesorio')) return 'accesorios';
  if (categoriaNormalizada.includes('polera') || categoriaNormalizada.includes('poleron') || categoriaNormalizada.includes('vestuario')) return 'vestuario';
  return 'default';
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
          const agrupados = new Map<string, Producto>();
          for (const producto of datos) {
            const existente = agrupados.get(producto.codigoProducto);
            if (existente) {
              existente.stock += producto.stock;
              continue;
            }
            agrupados.set(producto.codigoProducto, { ...producto });
          }
          setProductos([...agrupados.values()]);
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
        carrito.items.map(({ idVariante, cantidad }) => ({ idVariante, cantidad })),
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
    const destino = document.getElementById('productos');
    if (!destino) return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      destino.scrollIntoView({ block: 'start' });
      return;
    }

    const inicio = window.scrollY;
    const fin = inicio + destino.getBoundingClientRect().top;
    const duracion = 650;
    let comienzo: number | undefined;

    const animarDesplazamiento = (ahora: number) => {
      comienzo ??= ahora;
      const progreso = Math.min((ahora - comienzo) / duracion, 1);
      const suavizado = progreso < 0.5
        ? 4 * progreso ** 3
        : 1 - (-2 * progreso + 2) ** 3 / 2;

      window.scrollTo(0, inicio + (fin - inicio) * suavizado);
      if (progreso < 1) window.requestAnimationFrame(animarDesplazamiento);
    };

    window.requestAnimationFrame(animarDesplazamiento);
  };

  return (
    <main className="storefront-page min-h-screen w-full">
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
            <button type="button" className="ucn-btn-primary w-full" onClick={abrirLogin}>
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
            className="grid h-11 w-11 place-items-center rounded-xl border border-slate-400/15 bg-slate-900/70 text-slate-900 dark:text-slate-100 font-bold transition hover:-translate-y-0.5 hover:border-violet-400/40"
            aria-label={`Favoritos (${favoritos.length})`}
            aria-pressed={categoriaActiva === 'favoritos'}
            onClick={handleFavoritos}
          >
            <svg className="h-[22px] w-[22px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M12 21s-7-4.35-9.5-8.5C.5 8.5 3 5 6.5 5c2 0 3.5 1.5 5.5 3.5C14 6.5 15.5 5 17.5 5 21 5 23.5 8.5 21.5 12.5 19 16.65 12 21 12 21Z" />
            </svg>
          </button>

          <button
            type="button"
            className="relative grid h-11 w-11 place-items-center rounded-xl border border-slate-400/15 bg-slate-900/70 text-slate-900 dark:text-slate-100 font-bold transition hover:-translate-y-0.5 hover:border-violet-400/40"
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
            className="theme-toggle-control grid h-11 w-11 place-items-center rounded-full border border-slate-400/30 bg-slate-900 text-lg text-slate-900 dark:text-white font-bold shadow-lg transition hover:-translate-y-px hover:border-violet-400"
            onClick={onToggleTema}
            aria-label={tema === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            title={tema === 'dark' ? 'Modo claro' : 'Modo oscuro'}
          >
            {tema === 'dark' ? '☀' : '☾'}
          </button>

          <div className="relative flex items-center" ref={menuRef}>
            <button
              type="button"
              className={`ucn-avatar ${esInvitado ? 'ucn-avatar--guest' : 'ucn-avatar--account'}`}
              style={usuario ? { backgroundColor: obtenerColorAvatar(usuario.uid) } : undefined}
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
                    className="rounded-xl bg-blue-100 px-3 py-2 text-left text-sm font-semibold text-slate-900 hover:bg-blue-200"
                    onClick={abrirLogin}
                  >
                    Iniciar sesión
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      className="rounded-xl bg-blue-100 px-3 py-2 text-left text-sm font-semibold text-slate-900 hover:bg-blue-200"
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
                      className="rounded-xl bg-red-100 px-3 py-2 text-left text-sm font-semibold text-red-900 hover:bg-red-200"
                      onClick={() => {
                        setMenuAbierto(false);
                        setCarritoAbierto(false);
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

      <section className="storefront-hero relative mx-6 my-6 flex items-center justify-between gap-8 overflow-hidden rounded-[22px] px-[60px] py-10 max-[768px]:flex-col max-[768px]:gap-8 max-[768px]:px-6 max-[768px]:py-8 max-[640px]:mx-4 max-[640px]:text-center">
        <div className="relative z-[2] max-w-2xl">
          <h1 className="mb-4 text-[2.5rem] font-extrabold leading-tight text-white max-[768px]:text-[2rem]">¡Bienvenido a la Tienda UCN!</h1>
          <p className="mb-8 max-w-xl text-[1.1rem] leading-relaxed text-white/90">Descubre la mejor selección de merchandising oficial, ropa y accesorios exclusivos para nuestra comunidad.</p>
          <button 
            type="button" 
            className="storefront-hero-cta rounded-xl px-7 py-3.5 text-base font-bold transition hover:-translate-y-0.5"
            onClick={explorarProductos}
          >
            Explorar Colección
          </button>
        </div>
        <div className="z-[2] grid h-[200px] w-[200px] shrink-0 rotate-[5deg] place-items-center rounded-3xl border border-white/20 bg-white/10 p-6 shadow-[0_0_55px_rgba(125,211,252,0.38)] backdrop-blur-md max-[768px]:h-[150px] max-[768px]:w-[150px]">
          <img src={escudoUcn} alt="Escudo UCN" className="h-full w-full object-contain drop-shadow-[0_0_24px_rgba(255,255,255,0.55)]" aria-hidden="true" />
        </div>
      </section>

      <nav className="flex gap-2.5 overflow-x-auto px-5 pb-2 pt-4" aria-label="Filtrar por categoría">
        {categorias.map((categoria) => (
          <button
            key={categoria.id}
            type="button"
            className="storefront-category-pill whitespace-nowrap rounded-full px-4 py-2 text-xs font-semibold transition hover:-translate-y-0.5"
            data-category={categoria.id}
            aria-pressed={categoriaActiva === categoria.id}
            onClick={() => setCategoriaActiva(categoria.id)}
          >
            {categoria.label}
          </button>
        ))}
      </nav>

      <section id="productos" className="scroll-mt-24 px-5 pb-8 pt-5" aria-labelledby="destacados-titulo">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 id="destacados-titulo" className="text-base font-bold tracking-tight">Productos destacados</h2>
            {!cargandoProductos && !errorProductos && (
              <p className="mt-1 text-sm text-slate-400" aria-live="polite">
                {productosFiltrados.length} {productosFiltrados.length === 1 ? 'producto' : 'productos'}
              </p>
            )}
          </div>
          <button type="button" className="flex items-center gap-0.5 text-sm font-semibold text-blue-400" onClick={() => { setCategoriaActiva('todos'); setBusqueda(''); }}>
            Ver catálogo completo
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="m9 6 6 6-6 6" />
            </svg>
          </button>
        </div>

        <div className="grid grid-cols-3 gap-4 max-[768px]:grid-cols-2 max-[480px]:grid-cols-1">
          {cargandoProductos && Array.from({ length: 3 }, (_, indice) => (
            <div className="ucn-skeleton h-[350px] rounded-2xl" key={`producto-cargando-${indice}`} aria-hidden="true" />
          ))}
          {errorProductos && (
            <p className="col-span-full rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-medium text-red-800" role="alert">
              No fue posible cargar el catálogo. Intenta actualizar la página en unos momentos.
            </p>
          )}
          {productosFiltrados.map((producto) => (
            <article className={`storefront-product-card storefront-product-card--${categoriaProducto(producto.categoria)} ${producto.stock <= 0 ? 'storefront-product-card--out-of-stock' : ''} transition duration-200 hover:-translate-y-1.5`} key={producto.codigoProducto}>
              <div className="relative overflow-hidden">
                <div 
                  className="storefront-product-media relative flex h-[220px] items-center justify-center overflow-hidden transition hover:scale-[1.03]"
                  onClick={() => navigate(`/producto/${producto.codigoProducto}`)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(`/producto/${producto.codigoProducto}`); } }}
                  style={{ cursor: 'pointer' }}
                >
                  <img src={producto.imagen} alt={producto.nombre} className="h-full w-full object-contain p-1 drop-shadow-lg" />
                </div>

                <span className={`storefront-stock-badge absolute right-3 top-3 z-10 ${producto.stock <= 0 ? 'storefront-stock-badge--empty' : producto.stock <= 3 ? 'storefront-stock-badge--low' : 'storefront-stock-badge--high'}`}>
                  {producto.stock} {producto.stock === 1 ? 'unidad' : 'unidades'}
                </span>

                <button
                  type="button"
                  className={`absolute left-3 top-3 z-10 grid rounded-full bg-slate-900/65 p-2 text-slate-900 dark:text-slate-100 font-bold backdrop-blur ${favoritos.includes(producto.codigoProducto) ? 'text-pink-400' : ''}`}
                  aria-label={favoritos.includes(producto.codigoProducto) ? 'Quitar de favoritos' : 'Agregar a favoritos'}
                  aria-pressed={favoritos.includes(producto.codigoProducto)}
                  onClick={(e) => { e.stopPropagation(); handleToggleFavorito(producto.codigoProducto); }}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M12 21s-7-4.35-9.5-8.5C.5 8.5 3 5 6.5 5c2 0 3.5 1.5 5.5 3.5C14 6.5 15.5 5 17.5 5 21 5 23.5 8.5 21.5 12.5 19 16.65 12 21 12 21Z" />
                  </svg>
                </button>
              </div>

              <div className="p-4">
                <p 
                  className="storefront-product-title cursor-pointer text-sm font-bold"
                  onClick={() => navigate(`/producto/${producto.codigoProducto}`)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(`/producto/${producto.codigoProducto}`); } }}
                  style={{ cursor: 'pointer' }}
                >
                  {producto.nombre}
                </p>
                <div className="mt-2">
                  <p className="storefront-product-price text-lg font-extrabold">{formatearCLP(producto.precio)}</p>
                </div>
                <button
                  type="button"
                  className="ucn-btn-primary storefront-cart-button w-full mt-4 text-center"
                  onClick={() => handleAgregarAlCarrito(producto)}
                  disabled={producto.stock < 1}
                >
                  {producto.stock > 0 ? 'Agregar al carrito' : 'agotado'}
                </button>
              </div>
            </article>
          ))}

          {!cargandoProductos && !errorProductos && productosFiltrados.length === 0 && (
            <div className="col-span-full flex flex-col items-center gap-3 rounded-2xl border border-slate-400/15 bg-slate-900/50 px-6 py-10 text-center">
              <p className="font-semibold text-slate-300">No encontramos productos con esos filtros.</p>
              <button type="button" className="ucn-btn-ghost" onClick={() => { setBusqueda(''); setCategoriaActiva('todos'); }}>
                Limpiar búsqueda y filtros
              </button>
            </div>
          )}
        </div>
      </section>

    </main>
  );
}
