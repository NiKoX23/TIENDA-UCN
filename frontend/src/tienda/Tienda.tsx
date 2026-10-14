import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import escudoUcn from '../assets/icons/Escudo-UCN.png';
import type { Usuario } from '../services/auth.service';
import type { Producto } from '../productos/Productos';
import { categorias } from '../productos/Productos';
import { listarProductos, comprarProductos } from '../services/productos.service';
import { useCarrito } from '../hooks/useCarrito';
import Carrito from '../carrito/Carrito';
import UserAvatarMenu from '../components/UserAvatarMenu';
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

type Orden = 'disponibles' | 'menor' | 'mayor';

function categoriaProducto(categoria: string): string {
  const categoriaNormalizada = categoria.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  if (categoriaNormalizada.includes('papeleria')) return 'papeleria';
  if (categoriaNormalizada.includes('accesorio')) return 'accesorios';
  if (categoriaNormalizada.includes('polera') || categoriaNormalizada.includes('poleron') || categoriaNormalizada.includes('vestuario')) return 'vestuario';
  return 'default';
}

const fondoPorCategoria: Record<string, string> = {
  vestuario: 'bg-sky-100 dark:bg-slate-800',
  accesorios: 'bg-orange-50 dark:bg-slate-800',
  papeleria: 'bg-blue-50 dark:bg-slate-800',
  default: 'bg-slate-100 dark:bg-slate-800',
};

const claseChip = (activo: boolean) =>
  `h-11 whitespace-nowrap rounded-full border px-5 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c2570c] ${
    activo
      ? 'border-[#c2570c] bg-[#c2570c] text-white hover:bg-[#a84a0a]'
      : 'border-[#f2a46f] bg-[#fff4eb] text-[#7c2d12] hover:bg-[#f2a46f]'
  }`;

export default function Tienda({ usuario, tema, onToggleTema, onPerfil, onLogin, onLogout, onAdmin }: TiendaProps) {
  const navigate = useNavigate();
  const [categoriaActiva, setCategoriaActiva] = useState<string>('todos');
  const [busqueda, setBusqueda] = useState('');
  const [orden, setOrden] = useState<Orden>('disponibles');
  const [favoritos, setFavoritos] = useState<string[]>([]);
  const [modalLoginAbierto, setModalLoginAbierto] = useState(false);
  const [carritoAbierto, setCarritoAbierto] = useState(false);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [cargandoProductos, setCargandoProductos] = useState(true);
  const [errorProductos, setErrorProductos] = useState(false);

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

  const productosFiltrados = useMemo(() => {
    const filtrados = productos.filter((producto) => {
      const coincideCategoria =
        categoriaActiva === 'todos' ||
        (categoriaActiva === 'favoritos' && favoritos.includes(producto.codigoProducto)) ||
        producto.categoria === categoriaActiva;
      const coincideBusqueda = producto.nombre
        .toLowerCase()
        .includes(busqueda.toLowerCase());
      return coincideCategoria && coincideBusqueda;
    });

    return [...filtrados].sort((a, b) => {
      if (orden === 'menor') return a.precio - b.precio;
      if (orden === 'mayor') return b.precio - a.precio;
      return Number(b.stock > 0) - Number(a.stock > 0);
    });
  }, [categoriaActiva, busqueda, favoritos, productos, orden]);

  // Producto destacado del hero: el primer vestuario con stock; si no hay, el primer producto con stock.
  const destacado = useMemo(
    () =>
      productos.find((p) => categoriaProducto(p.categoria) === 'vestuario' && p.stock > 0) ??
      productos.find((p) => p.stock > 0),
    [productos],
  );

  const precioDesdeDestacado = useMemo(() => {
    if (!destacado) return null;
    const mismos = productos.filter((p) => p.categoria === destacado.categoria && p.stock > 0);
    return Math.min(...mismos.map((p) => p.precio));
  }, [destacado, productos]);

  const hayFiltros = categoriaActiva !== 'todos' || busqueda !== '';

  const abrirLogin = () => {
    setModalLoginAbierto(false);
    onLogin();
  };

  const requiereLogin = () => {
    setModalLoginAbierto(true);
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

  const limpiarFiltros = () => {
    setCategoriaActiva('todos');
    setBusqueda('');
  };

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

  const categoriasMenu = categorias.filter((c) => c.id !== 'todos');

  return (
    <main className="storefront-page min-h-screen w-full text-slate-900 dark:text-slate-100">
      {modalLoginAbierto && (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-slate-950/80 p-6 backdrop-blur-md" role="presentation" onClick={() => setModalLoginAbierto(false)}>
          <div
            className="w-full max-w-[420px] rounded-[26px] border border-violet-400/30 bg-slate-900 p-7 text-center text-slate-100 shadow-2xl"
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

      {/* ───────── Header ───────── */}
      <header className="sticky top-0 z-20 border-b border-white/10 bg-[#0f3d66] shadow-md shadow-slate-900/10 dark:bg-[#0b2a47]">
        <div className="mx-auto flex max-w-[1240px] flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3 sm:px-8">
          <a className="flex items-center gap-3 whitespace-nowrap text-lg font-extrabold text-white" href="/">
            <span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-xl border border-white/20 bg-white" aria-hidden="true">
              <img src={escudoUcn} alt="" className="h-full w-full object-contain p-1" />
            </span>
            Tienda UCN
          </a>

          <nav className="hidden items-center gap-6 text-sm font-semibold lg:flex" aria-label="Categorías">
            {categoriasMenu.map((categoria) => (
              <button
                key={categoria.id}
                type="button"
                aria-current={categoriaActiva === categoria.id ? 'true' : undefined}
                className={`border-b-2 py-2 text-sm font-semibold capitalize transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white ${
                  categoriaActiva === categoria.id
                    ? 'border-[#ffb067] text-white'
                    : 'border-transparent text-white/80 hover:border-white/40 hover:text-white'
                }`}
                onClick={() => {
                  setCategoriaActiva(categoria.id);
                  explorarProductos();
                }}
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
              placeholder="Buscar polerones, llaveros, libretas…"
              className="h-11 w-full rounded-xl border border-transparent bg-white pl-11 pr-4 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-500 focus:border-[#ffb067] focus:ring-4 focus:ring-[#ffb067]/30"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </div>

          <div className="ml-auto flex items-center gap-2.5 lg:ml-0">
            <button
              type="button"
              className={`grid h-11 w-11 place-items-center rounded-xl border bg-white transition hover:bg-slate-100 ${
                categoriaActiva === 'favoritos' ? 'border-pink-400 text-pink-500' : 'border-transparent text-slate-800'
              }`}
              aria-label={`Favoritos (${favoritos.length})`}
              aria-pressed={categoriaActiva === 'favoritos'}
              onClick={handleFavoritos}
            >
              <svg className="h-[20px] w-[20px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                <path d="M12 21s-7-4.35-9.5-8.5C.5 8.5 3 5 6.5 5c2 0 3.5 1.5 5.5 3.5C14 6.5 15.5 5 17.5 5 21 5 23.5 8.5 21.5 12.5 19 16.65 12 21 12 21Z" />
              </svg>
            </button>

            <button
              type="button"
              className="relative flex h-11 items-center gap-2 rounded-xl bg-[#c2570c] px-4 text-sm font-bold text-white transition hover:bg-[#a84a0a] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c2570c]"
              aria-label={`Carrito (${carrito.cantidadTotal})`}
              onClick={handleCarrito}
            >
              <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M6 8h12l-1 12H7L6 8Z" />
                <path d="M9 8V6a3 3 0 0 1 6 0v2" />
              </svg>
              <span className="max-sm:hidden">Carrito</span>
              {carrito.cantidadTotal > 0 && (
                <span className="grid h-5 min-w-5 place-items-center rounded-full bg-white px-1 text-[11px] font-extrabold text-[#a84a0a]" aria-hidden="true">
                  {carrito.cantidadTotal}
                </span>
              )}
            </button>

            <button
              type="button"
              className="grid h-11 w-11 place-items-center rounded-full border border-transparent bg-white text-lg text-slate-800 transition hover:bg-slate-100"
              onClick={onToggleTema}
              aria-label={tema === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
              title={tema === 'dark' ? 'Modo claro' : 'Modo oscuro'}
            >
              {tema === 'dark' ? '☀' : '☾'}
            </button>

            <UserAvatarMenu
              usuario={usuario}
              onLogin={abrirLogin}
              onPerfil={onPerfil}
              onAdmin={onAdmin}
              onLogout={() => {
                setCarritoAbierto(false);
                onLogout();
              }}
            />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1240px] px-4 sm:px-8">
        {/* ───────── Hero ───────── */}
        <section className="grid gap-5 pt-8 lg:grid-cols-[1.4fr_1fr]" aria-label="Bienvenida">
          <div className="flex min-h-[300px] flex-col justify-center gap-4 rounded-3xl bg-[#0f3d66] p-8 text-white sm:p-12 dark:bg-[#0b2a47]">
            <span className="text-[13px] font-bold uppercase tracking-wider text-[#ffc58a]">Merchandising oficial · UCN Coquimbo</span>
            <h1 className="text-[2rem] font-extrabold leading-[1.1] sm:text-[2.75rem]">Lleva la UCN contigo, todos los días.</h1>
            <p className="max-w-[460px] text-base leading-relaxed text-[#cfe0f1]">
              Polerones, accesorios y papelería oficial para toda la comunidad universitaria.
            </p>
            <div className="mt-2 flex flex-wrap gap-3">
              <button
                type="button"
                className="h-12 rounded-xl bg-[#c2570c] px-6 text-[15px] font-bold text-white transition hover:bg-[#a84a0a] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                onClick={explorarProductos}
              >
                Ver catálogo
              </button>
              {destacado && precioDesdeDestacado !== null && (
                <button
                  type="button"
                  className="h-12 rounded-xl border border-[#6f95bb] px-6 text-[15px] font-bold text-white transition hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                  onClick={() => {
                    setCategoriaActiva(destacado.categoria);
                    explorarProductos();
                  }}
                >
                  {destacado.categoria} desde {formatearCLP(precioDesdeDestacado)}
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-3.5 rounded-3xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
            {destacado ? (
              <>
                <button
                  type="button"
                  className={`relative grid min-h-[170px] flex-1 place-items-center overflow-hidden rounded-2xl ${fondoPorCategoria[categoriaProducto(destacado.categoria)]}`}
                  onClick={() => navigate(`/producto/${destacado.codigoProducto}`)}
                  aria-label={`Ver ${destacado.nombre}`}
                >
                  <span className="absolute left-3 top-3 rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-[#0f3d66]">Destacado</span>
                  <img src={destacado.imagen} alt="" className="h-full max-h-[220px] w-full object-contain p-2" />
                </button>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[15px] font-bold">{destacado.nombre}</p>
                    <p className="text-[13px] text-slate-600 dark:text-slate-400">{destacado.categoria}</p>
                  </div>
                  <p className="text-xl font-extrabold text-[#0f3d66] dark:text-blue-300">{formatearCLP(destacado.precio)}</p>
                </div>
              </>
            ) : (
              <div className="ucn-skeleton min-h-[240px] flex-1 rounded-2xl" aria-hidden="true" />
            )}
          </div>
        </section>

        {/* ───────── Filtros ───────── */}
        <div className="flex flex-wrap items-center gap-2.5 pt-7">
          <nav className="flex gap-2.5 overflow-x-auto pb-1" aria-label="Filtrar por categoría">
            {categorias.map((categoria) => (
              <button
                key={categoria.id}
                type="button"
                className={claseChip(categoriaActiva === categoria.id)}
                data-category={categoria.id}
                aria-pressed={categoriaActiva === categoria.id}
                onClick={() => setCategoriaActiva(categoria.id)}
              >
                {categoria.label}
              </button>
            ))}
          </nav>
          <label className="ml-auto flex items-center gap-2 text-[13px] text-slate-600 dark:text-slate-400">
            Ordenar
            <select
              className="h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              value={orden}
              onChange={(e) => setOrden(e.target.value as Orden)}
            >
              <option value="disponibles">Disponibles primero</option>
              <option value="menor">Menor precio</option>
              <option value="mayor">Mayor precio</option>
            </select>
          </label>
        </div>

        {/* ───────── Catálogo ───────── */}
        <section id="productos" className="scroll-mt-24 pt-5" aria-labelledby="catalogo-titulo">
          <div className="mb-4 flex items-baseline gap-3">
            <h2 id="catalogo-titulo" className="text-2xl font-extrabold">Catálogo</h2>
            {!cargandoProductos && !errorProductos && (
              <p className="text-sm text-slate-600 dark:text-slate-400" aria-live="polite">
                {productosFiltrados.length} {productosFiltrados.length === 1 ? 'producto' : 'productos'}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {cargandoProductos && Array.from({ length: 4 }, (_, indice) => (
              <div className="ucn-skeleton h-[360px] rounded-2xl" key={`producto-cargando-${indice}`} aria-hidden="true" />
            ))}
            {errorProductos && (
              <p className="col-span-full rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-medium text-red-800" role="alert">
                No fue posible cargar el catálogo. Intenta actualizar la página en unos momentos.
              </p>
            )}
            {productosFiltrados.map((producto) => {
              const agotado = producto.stock <= 0;
              const pocas = !agotado && producto.stock <= 3;
              const tipo = categoriaProducto(producto.categoria);
              const eligeVariante = tipo === 'vestuario';
              const esFavorito = favoritos.includes(producto.codigoProducto);
              const irAlDetalle = () => navigate(`/producto/${producto.codigoProducto}`);

              return (
                <article
                  key={producto.codigoProducto}
                  className={`flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white transition duration-200 hover:-translate-y-1 hover:shadow-lg dark:border-slate-700 dark:bg-slate-900 ${agotado ? 'opacity-80' : ''}`}
                >
                  <div className={`relative ${fondoPorCategoria[tipo]}`}>
                    <button
                      type="button"
                      className="flex h-[210px] w-full items-center justify-center"
                      onClick={irAlDetalle}
                      aria-label={`Ver ${producto.nombre}`}
                    >
                      <img
                        src={producto.imagen}
                        alt=""
                        className={`h-full w-full object-contain p-3 ${agotado ? 'grayscale' : ''}`}
                      />
                    </button>
                    <span className="absolute left-3 top-3 rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-[#0f3d66]">
                      {producto.categoria}
                    </span>
                    <span
                      className={`absolute right-3 top-3 rounded-full px-2.5 py-1 text-[11px] font-bold text-white ${
                        agotado ? 'bg-slate-600' : pocas ? 'bg-[#a35200]' : 'bg-[#1a6b50]'
                      }`}
                    >
                      {agotado ? 'Agotado' : pocas ? `Últimas ${producto.stock}` : `${producto.stock} unidades`}
                    </span>
                  </div>

                  <div className="flex flex-1 flex-col gap-1.5 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <button
                        type="button"
                        className="text-left text-[15px] font-bold leading-snug hover:underline"
                        onClick={irAlDetalle}
                      >
                        {producto.nombre}
                      </button>
                      <button
                        type="button"
                        className={`-mr-1 -mt-1 grid h-9 w-9 shrink-0 place-items-center rounded-full transition hover:bg-slate-100 dark:hover:bg-slate-800 ${esFavorito ? 'text-pink-500' : 'text-slate-500'}`}
                        aria-label={esFavorito ? 'Quitar de favoritos' : 'Agregar a favoritos'}
                        aria-pressed={esFavorito}
                        onClick={() => handleToggleFavorito(producto.codigoProducto)}
                      >
                        <svg className="h-5 w-5" viewBox="0 0 24 24" fill={esFavorito ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                          <path d="M12 21s-7-4.35-9.5-8.5C.5 8.5 3 5 6.5 5c2 0 3.5 1.5 5.5 3.5C14 6.5 15.5 5 17.5 5 21 5 23.5 8.5 21.5 12.5 19 16.65 12 21 12 21Z" />
                        </svg>
                      </button>
                    </div>

                    <p className={`text-xl font-extrabold ${agotado ? 'text-slate-500' : 'text-[#0f3d66] dark:text-blue-300'}`}>
                      {formatearCLP(producto.precio)}
                    </p>

                    {/* Los productos con talla/color se eligen en el detalle */}
                    <button
                      type="button"
                      className={`mt-auto h-11 w-full rounded-[10px] text-sm font-bold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0f3d66] ${
                        agotado
                          ? 'cursor-not-allowed bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                          : 'bg-[#0f3d66] text-white hover:bg-[#0b2f4f] dark:bg-blue-600 dark:hover:bg-blue-500'
                      }`}
                      onClick={() => (eligeVariante ? irAlDetalle() : handleAgregarAlCarrito(producto))}
                      disabled={agotado}
                    >
                      {agotado ? 'Agotado' : eligeVariante ? 'Elegir talla y color' : 'Agregar al carrito'}
                    </button>
                  </div>
                </article>
              );
            })}

            {!cargandoProductos && !errorProductos && productosFiltrados.length === 0 && (
              <div className="col-span-full flex flex-col items-center gap-3 rounded-2xl border border-slate-200 bg-white px-6 py-10 text-center dark:border-slate-700 dark:bg-slate-900">
                <p className="font-semibold text-slate-700 dark:text-slate-300">No encontramos productos con esos filtros.</p>
                <button type="button" className="ucn-btn-ghost" onClick={limpiarFiltros}>
                  Limpiar búsqueda y filtros
                </button>
              </div>
            )}
          </div>

          {hayFiltros && productosFiltrados.length > 0 && (
            <div className="mt-7 text-center">
              <button type="button" className={claseChip(false)} onClick={limpiarFiltros}>
                Ver catálogo completo
              </button>
            </div>
          )}
        </section>

        {/* ───────── Confianza ───────── */}
        <section className="grid gap-5 pb-4 pt-14 md:grid-cols-3" aria-label="Información de la tienda">
          {[
            { titulo: 'Producto oficial UCN', texto: 'Merchandising con identidad institucional.' },
            { titulo: 'Stock actualizado', texto: 'Ves la disponibilidad real de cada producto.' },
            { titulo: 'Retiro en sede Coquimbo', texto: 'Completa tu compra y coordina el retiro.' },
          ].map((item) => (
            <div key={item.titulo} className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900">
              <p className="text-base font-bold">{item.titulo}</p>
              <p className="mt-1.5 text-[13px] text-slate-600 dark:text-slate-400">{item.texto}</p>
            </div>
          ))}
        </section>
      </div>

      {/* ───────── Footer ───────── */}
      <footer className="mt-14 bg-[#0f3d66] text-[#cfe0f1] dark:bg-[#0b2a47]">
        <div className="mx-auto flex max-w-[1240px] flex-wrap items-center justify-between gap-3 px-4 py-9 text-sm sm:px-8">
          <p className="text-base font-extrabold text-white">Tienda UCN</p>
          <p>Universidad Católica del Norte · Sede Coquimbo</p>
        </div>
      </footer>
    </main>
  );
}