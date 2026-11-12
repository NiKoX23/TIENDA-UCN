import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import escudoUcn from '../assets/icons/Escudo-UCN.png';
import type { Usuario } from '../services/auth.service';
import { categorias } from '../productos/Productos';
import {
  agruparVariantesCatalogo,
  descontarStockCatalogo,
  type ProductoCatalogo,
} from '../productos/catalogo';
import { listarProductos, comprarProductos } from '../services/productos.service';
import { useCarrito } from '../hooks/useCarrito';
import Carrito from '../carrito/Carrito';
import UserAvatarMenu from '../components/UserAvatarMenu';
import { BrandLockup } from '../components/brand/BrandLogo';
import { BrandBlocks, PatternStrip } from '../components/brand/BrandFigures';
import { formatearCLP } from '../utils/precio';
import { usePaginacion } from '../hooks/usePaginacion';
import Paginacion from '../components/Paginacion';
import ImagenProducto from '../components/ImagenProducto';

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

// Tono de marca por categoría: define el color del borde superior y del fondo de la imagen.
const fondoPorCategoria: Record<string, string> = {
  vestuario: 'vcm-tone--vestuario',
  accesorios: 'vcm-tone--accesorios',
  papeleria: 'vcm-tone--papeleria',
  default: 'vcm-tone--default',
};

const claseChip = (activo: boolean) => `vcm-chip${activo ? ' vcm-chip--active' : ''}`;

// 16 por página = 4 filas de 4 columnas en pantallas anchas.
const PRODUCTOS_POR_PAGINA = 16;

export default function Tienda({ usuario, tema, onToggleTema, onPerfil, onLogin, onLogout, onAdmin }: TiendaProps) {
  const navigate = useNavigate();
  const [categoriaActiva, setCategoriaActiva] = useState<string>('todos');
  const [busqueda, setBusqueda] = useState('');
  const [orden, setOrden] = useState<Orden>('disponibles');
  const [favoritos, setFavoritos] = useState<string[]>([]);
  const [modalLoginAbierto, setModalLoginAbierto] = useState(false);
  const [carritoAbierto, setCarritoAbierto] = useState(false);
  const [reservaFormAbierto, setReservaFormAbierto] = useState(false);
  const [reservando, setReservando] = useState(false);
  const [errorReserva, setErrorReserva] = useState('');
  const [comprando, setComprando] = useState(false);
  const [errorCompra, setErrorCompra] = useState('');
  const [reservaCreada, setReservaCreada] = useState<Reserva | null>(null);
  const [advertenciaStockReserva, setAdvertenciaStockReserva] = useState(false);
  const [productos, setProductos] = useState<ProductoCatalogo[]>([]);
  const [cargandoProductos, setCargandoProductos] = useState(true);
  const [errorProductos, setErrorProductos] = useState(false);

  const esInvitado = !usuario;

  const carrito = useCarrito(usuario?.uid);
  const sincronizarVariantesCarrito = carrito.sincronizarVariantes;

  useEffect(() => {
    let activo = true;
    listarProductos()
      .then((datos) => {
        if (!activo) return;
        if (Array.isArray(datos)) {
          setProductos(agruparVariantesCatalogo(datos));
          sincronizarVariantesCarrito(datos);
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
  }, [sincronizarVariantesCarrito]);

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

  // Cambiar categoría, búsqueda u orden vuelve a la primera página.
  const paginacion = usePaginacion<Producto>(productosFiltrados, PRODUCTOS_POR_PAGINA, [categoriaActiva, busqueda, orden]);

  const cambiarPagina = (pagina: number) => {
    paginacion.irA(pagina);
    const sinMovimiento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    document.getElementById('productos')?.scrollIntoView({ behavior: sinMovimiento ? 'auto' : 'smooth', block: 'start' });
  };

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
    setErrorCompra('');
    setComprando(true);
    try {
      const lineasCompradas = carrito.items.map(({ codigoProducto, cantidad }) => ({
        codigoProducto,
        cantidad,
      }));
      const compra = await comprarProductos(
        carrito.items.map(({ idVariante, cantidad }) => ({ idVariante, cantidad })),
      );
      setProductos((actuales) => descontarStockCatalogo(actuales, lineasCompradas));
      carrito.vaciar();
      setCarritoAbierto(false);
      let stockActualizado = true;
      try {
        const datosActualizados = await listarProductos();
        if (Array.isArray(datosActualizados)) {
          setProductos(agruparVariantesCatalogo(datosActualizados));
          carrito.sincronizarVariantes(datosActualizados);
          setErrorProductos(false);
        } else {
          stockActualizado = false;
        }
      } catch {
        stockActualizado = false;
      }
      window.alert(
        stockActualizado
          ? `Compra registrada: ${compra.numeroDocumento}`
          : `Compra registrada: ${compra.numeroDocumento}. No se pudo actualizar el catálogo; recarga la página para ver el stock más reciente.`,
      );
    } catch (error: unknown) {
      setErrorCompra(mensajeErrorApi(error, 'No fue posible completar la compra. Revisa el stock disponible.'));
    } finally {
      setComprando(false);
    }
  };

  const handleReservar = () => {
    if (esInvitado) {
      requiereLogin();
      return;
    }
    setErrorReserva('');
    setReservaFormAbierto(true);
  };

  const confirmarReserva = async (
    datos: Omit<DatosCrearReserva, 'lineas'>,
  ) => {
    try {
      setErrorReserva('');
      setReservando(true);
      setAdvertenciaStockReserva(false);
      const reserva = await crearReserva({
        ...datos,
        lineas: carrito.items.map(({ idVariante, cantidad }) => ({
          idVariante,
          cantidad,
        })),
      });
      setProductos((actuales) =>
        descontarStockCatalogo(
          actuales,
          reserva.items.map((item) => ({
            codigoProducto: item.producto.codigoProducto,
            cantidad: item.cantidad,
          })),
        ),
      );
      carrito.vaciar();
      setCarritoAbierto(false);
      setReservaFormAbierto(false);

      try {
        const datosActualizados = await listarProductos();
        if (Array.isArray(datosActualizados)) {
          setProductos(agruparVariantesCatalogo(datosActualizados));
          carrito.sincronizarVariantes(datosActualizados);
          setErrorProductos(false);
        }
      } catch {
        setAdvertenciaStockReserva(true);
      }

      setReservaCreada(reserva);
    } catch (error: unknown) {
      setErrorReserva(
        mensajeErrorApi(
          error,
          'No fue posible crear la reserva. Revisa el stock disponible.',
        ),
      );
    } finally {
      setReservando(false);
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
    <main className="storefront-page min-h-screen w-full">
      {modalLoginAbierto && (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-[color-mix(in_srgb,var(--vcm-navy)_80%,transparent)] p-6 backdrop-blur-md" role="presentation" onClick={() => setModalLoginAbierto(false)}>
          <div
            className="vcm-card w-full max-w-[420px] border-t-4 p-7 text-center shadow-2xl"
            style={{ borderTopColor: 'var(--vcm-orange)' }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="tienda-login-titulo"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mx-auto mb-4 grid h-[72px] w-[72px] place-items-center rounded-[var(--radius)] border border-[var(--border-strong)] bg-[var(--primary-soft)] text-3xl" aria-hidden="true">🔒</div>
            <h3 id="tienda-login-titulo" className="text-2xl font-bold">Inicia sesión para continuar</h3>
            <p className="mx-auto mb-5 max-w-xs text-sm leading-relaxed text-[var(--text-soft)]">Debes iniciar sesión para comprar y guardar tus favoritos.</p>
            <button type="button" className="vcm-btn vcm-btn--primary w-full" onClick={abrirLogin}>
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
        onReservar={handleReservar}
        errorCompra={errorCompra}
        procesandoCompra={comprando}
        bloqueandoAcciones={cargandoProductos || errorProductos}
      />
      <ReservaForm
        abierto={reservaFormAbierto}
        procesando={reservando}
        error={errorReserva}
        onCerrar={() => setReservaFormAbierto(false)}
        onConfirmar={(datos) => void confirmarReserva(datos)}
      />
      <ReservaConfirmacionModal
        reserva={reservaCreada}
        advertenciaStock={advertenciaStockReserva}
        onVerReservas={() => {
          setReservaCreada(null);
          navigate('/reservas');
        }}
        onSeguirComprando={() => setReservaCreada(null)}
      />

      {/* ───────── Header ───────── */}
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
              className="h-11 w-full rounded-[var(--radius)] border border-[var(--vcm-chip-border)] bg-white pl-11 pr-4 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-500 focus:border-[var(--vcm-orange)] focus:ring-4 focus:ring-[var(--vcm-orange)]/30"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </div>

          <div className="ml-auto flex items-center gap-2.5 lg:ml-0">
            <button
              type="button"
              className="vcm-iconbtn"
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
              className="vcm-btn vcm-btn--primary relative gap-2 px-4 text-sm"
              aria-label={`Carrito (${carrito.cantidadTotal})`}
              data-reserva-focus-fallback
              onClick={handleCarrito}
            >
              <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M6 8h12l-1 12H7L6 8Z" />
                <path d="M9 8V6a3 3 0 0 1 6 0v2" />
              </svg>
              <span className="max-sm:hidden">Carrito</span>
              {carrito.cantidadTotal > 0 && (
                <span className="grid h-5 min-w-5 place-items-center rounded-full bg-[var(--vcm-navy)] px-1 text-[11px] font-extrabold text-white" aria-hidden="true">
                  {carrito.cantidadTotal}
                </span>
              )}
            </button>

            <button
              type="button"
              className="vcm-iconbtn text-lg"
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
              onReservas={() => navigate('/reservas')}
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
          <div className="vcm-hero flex min-h-[300px] flex-col justify-center p-8 sm:p-12">
            <BrandBlocks variant="hero" />
            <div className="vcm-hero__content flex flex-col gap-4">
              <span className="vcm-eyebrow">Merchandising oficial · UCN Coquimbo</span>
              <h1 className="max-w-[30rem] text-[2rem] font-extrabold leading-[1.1] sm:text-[2.75rem]">Lleva la UCN contigo, todos los días.</h1>
              <p className="max-w-[460px] text-base leading-relaxed opacity-90">
                Polerones, accesorios y papelería oficial para toda la comunidad universitaria.
              </p>
              <div className="mt-2 flex flex-wrap gap-3">
                <button type="button" className="vcm-btn vcm-btn--primary h-12 px-6" onClick={explorarProductos}>
                  Ver catálogo
                </button>
                {destacado && precioDesdeDestacado !== null && (
                  <button
                    type="button"
                    className="vcm-btn vcm-btn--ghost h-12 px-6"
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
          </div>

          <div className="vcm-card group flex flex-col gap-3.5 p-5 transition duration-200 hover:-translate-y-1 hover:shadow-lg">
            {destacado ? (
              <>
                <button
                  type="button"
                  className="vcm-gradient-bg relative grid min-h-[170px] flex-1 place-items-center overflow-hidden rounded-[var(--radius)]"
                  onClick={() => navigate(`/producto/${destacado.codigoProducto}`)}
                  aria-label={`Ver ${destacado.nombre}`}
                >
                  <span className="absolute left-3 top-3 rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-[var(--vcm-navy)]">Destacado</span>
                  <ImagenProducto src={destacado.imagen} alt={destacado.nombre} className="h-full max-h-[220px] w-full object-contain p-2 transition-transform duration-300 group-hover:scale-105" />
                </button>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[15px] font-bold">{destacado.nombre}</p>
                    <p className="text-[13px] text-[var(--text-soft)]">{destacado.categoria}</p>
                  </div>
                  <p className="text-xl font-extrabold text-[var(--vcm-price)]">{formatearCLP(destacado.precio)}</p>
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
          <label className="ml-auto flex items-center gap-2 text-[13px] text-[var(--text-soft)]">
            Ordenar
            <select
              className="vcm-select"
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
              <p className="text-sm text-[var(--text-soft)]" aria-live="polite">
                {productosFiltrados.length} {productosFiltrados.length === 1 ? 'producto' : 'productos'}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {cargandoProductos && Array.from({ length: 4 }, (_, indice) => (
              <div className="ucn-skeleton h-[360px] rounded-2xl" key={`producto-cargando-${indice}`} aria-hidden="true" />
            ))}
            {errorProductos && (
              <p className="vcm-alert col-span-full px-5 py-4" role="alert">
                No fue posible cargar el catálogo. Intenta actualizar la página en unos momentos.
              </p>
            )}
            {paginacion.visibles.map((producto) => {
              const agotado = producto.stock <= 0;
              const pocas = !agotado && producto.stock <= 3;
              const tipo = categoriaProducto(producto.categoria);
              const eligeVariante = tipo === 'vestuario' || producto.numeroVariantes > 1;
              const esFavorito = favoritos.includes(producto.codigoProducto);
              const irAlDetalle = () =>
              navigate(`/producto/${producto.codigoProducto}?variante=${producto.idVariante}`);

              return (
                <article
                  key={producto.codigoProducto}
                  className={`vcm-card vcm-product ${fondoPorCategoria[tipo]} flex flex-col overflow-hidden transition duration-200 hover:-translate-y-1 hover:shadow-lg ${agotado ? 'opacity-80' : ''}`}
                >
                  <div className="vcm-media relative">
                    <button
                      type="button"
                      className="flex h-[210px] w-full items-center justify-center"
                      onClick={irAlDetalle}
                      aria-label={`Ver ${producto.nombre}`}
                    >
                      <ImagenProducto
                        src={producto.imagen}
                        alt={producto.nombre}
                        loading="lazy"
                        className={`h-full w-full object-contain p-3 ${agotado ? 'grayscale' : ''}`}
                      />
                    </button>
                    <span className="absolute left-3 top-3 rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-[var(--vcm-navy)]">
                      {producto.categoria}
                    </span>
                    <span
                      className={`vcm-stock-badge absolute right-3 top-3 rounded-full px-2.5 py-1 text-[11px] font-bold ${
                        agotado ? 'vcm-stock-badge--empty' : pocas ? 'vcm-stock-badge--low' : 'vcm-stock-badge--available'
                      }`}
                    >
                      {agotado
                        ? 'Agotado'
                        : producto.numeroVariantes > 1
                          ? `${producto.stock} en total`
                          : pocas ? `Últimas ${producto.stock}` : `${producto.stock} unidades`}
                    </span>
                    <button
                      type="button"
                      className={`vcm-favorite-button${esFavorito ? ' vcm-favorite-button--active' : ''}`}
                      aria-label={esFavorito ? 'Quitar de favoritos' : 'Agregar a favoritos'}
                      aria-pressed={esFavorito}
                      onClick={() => handleToggleFavorito(producto.codigoProducto)}
                    >
                      <svg className="h-5 w-5" viewBox="0 0 24 24" fill={esFavorito ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" aria-hidden="true">
                        <path d="M12 21s-7-4.35-9.5-8.5C.5 8.5 3 5 6.5 5c2 0 3.5 1.5 5.5 3.5C14 6.5 15.5 5 17.5 5 21 5 23.5 8.5 21.5 12.5 19 16.65 12 21 12 21Z" />
                      </svg>
                    </button>
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
                    </div>

                    <p className={`text-xl font-extrabold ${agotado ? 'text-[var(--text-muted)]' : 'text-[var(--vcm-price)]'}`}>
                      {formatearCLP(producto.precio)}
                    </p>

                    {/* Los productos con talla/color se eligen en el detalle */}
                    <button
                      type="button"
                      className="vcm-btn vcm-btn--primary mt-auto w-full"
                      onClick={() => (eligeVariante ? irAlDetalle() : handleAgregarAlCarrito(producto))}
                      disabled={agotado}
                    >
                      {agotado
                        ? 'Agotado'
                        : eligeVariante
                          ? tipo === 'vestuario' ? 'Elegir talla y color' : 'Elegir variante'
                          : 'Agregar al carrito'}
                    </button>
                  </div>
                </article>
              );
            })}

            {!cargandoProductos && !errorProductos && productosFiltrados.length === 0 && (
              <div className="vcm-card col-span-full flex flex-col items-center gap-3 px-6 py-10 text-center">
                <p className="font-semibold text-[var(--text-soft)]">No encontramos productos con esos filtros.</p>
                <button type="button" className="vcm-btn vcm-btn--surface" onClick={limpiarFiltros}>
                  Limpiar búsqueda y filtros
                </button>
              </div>
            )}
          </div>

          {!cargandoProductos && !errorProductos && (
            <Paginacion
              pagina={paginacion.pagina}
              totalPaginas={paginacion.totalPaginas}
              total={paginacion.total}
              desde={paginacion.desde}
              hasta={paginacion.hasta}
              etiqueta="productos"
              onCambiar={cambiarPagina}
            />
          )}

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
            { titulo: 'Producto oficial UCN', texto: 'Merchandising con identidad institucional.', tono: 'vcm-tone--vestuario' },
            { titulo: 'Stock actualizado', texto: 'Ves la disponibilidad real de cada producto.', tono: 'vcm-tone--accesorios' },
            { titulo: 'Retiro en sede Coquimbo', texto: 'Completa tu compra y coordina el retiro.', tono: 'vcm-tone--default' },
          ].map((item) => (
            <div key={item.titulo} className={`vcm-card ${item.tono} p-6`} style={{ borderLeft: '4px solid var(--m)' }}>
              <p className="text-base font-bold">{item.titulo}</p>
              <p className="mt-1.5 text-[13px] text-[var(--text-soft)]">{item.texto}</p>
            </div>
          ))}
        </section>
      </div>

      {/* ───────── Footer ───────── */}
      <footer className="vcm-footer mt-14">
        <div className="mx-auto flex max-w-[1240px] flex-wrap items-center justify-between gap-x-8 gap-y-5 px-4 py-9 sm:px-8">
          <BrandLockup variant={tema === 'dark' ? 'white' : 'color'} height={44} partner={<img src={escudoUcn} alt="Universidad Católica del Norte" />} />
          <div className="text-sm sm:text-right">
            <p className="text-base font-extrabold">Tienda UCN</p>
            <p>Universidad Católica del Norte · Sede Coquimbo</p>
          </div>
        </div>
        <PatternStrip cols={20} height={56} seed={5} />
      </footer>
    </main>
  );
}
