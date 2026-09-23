import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { listarProductos } from '../services/productos.service';
import type { Producto } from './Productos';
import type { Usuario } from '../services/auth.service';
import { useCarrito } from '../hooks/useCarrito';

interface DetalleProductoProps {
  usuario: Usuario | null;
  tema: 'dark' | 'light';
  onToggleTema: () => void;
  onPerfil: () => void;
  onLogin: () => void;
  onLogout: () => void;
  onAdmin: () => void;
}

const categoriasConTalla = new Set(['polerones', 'poleras', 'pantalones']);

export default function DetalleProducto({ usuario, tema, onToggleTema, onPerfil, onLogin, onLogout, onAdmin }: DetalleProductoProps) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [producto, setProducto] = useState<Producto | null>(null);
  const [cargando, setCargando] = useState(true);
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [zoomAbierto, setZoomAbierto] = useState(false);
  const [zoomActivo, setZoomActivo] = useState(false);
  const [zoomOrigen, setZoomOrigen] = useState('50% 50%');
  const imgZoomRef = useRef<HTMLImageElement | null>(null);
  const [cantidad, setCantidad] = useState(1);
  const [errorCantidad, setErrorCantidad] = useState('');
  const [agregado, setAgregado] = useState(false);
  const carrito = useCarrito(usuario?.uid);

  useEffect(() => {
    listarProductos()
      .then((productos) => {
        if (!Array.isArray(productos)) return;
        const prod = productos.find((p) => p.codigoProducto === id);
        setProducto(prod || null);
      })
      .finally(() => setCargando(false));
  }, [id]);

  useEffect(() => {
    if (!zoomAbierto) return;
    const cerrarConEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setZoomActivo(false);
        setZoomAbierto(false);
      }
    };
    document.addEventListener('keydown', cerrarConEscape);
    return () => document.removeEventListener('keydown', cerrarConEscape);
  }, [zoomAbierto]);

  const esInvitado = !usuario;
  const avatarTexto = esInvitado ? 'IN' : usuario.nombre.charAt(0).toUpperCase();

  const moverZoom = (event: React.MouseEvent<HTMLDivElement>) => {
    const contenedor = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - contenedor.left) / contenedor.width) * 100;
    const y = ((event.clientY - contenedor.top) / contenedor.height) * 100;
    setZoomOrigen(`${x}% ${y}%`);
    setZoomActivo(true);
  };

  const cerrarZoom = () => {
    setZoomActivo(false);
    setZoomAbierto(false);
  };

  const tieneTalla = categoriasConTalla.has((producto?.categoria ?? '').toLowerCase());
  const cantidadEnCarrito = producto
    ? carrito.items.find((item) => item.codigoProducto === producto.codigoProducto)?.cantidad ?? 0
    : 0;

  const cambiarCantidad = (nuevaCantidad: number) => {
    if (!producto) return;
    setAgregado(false);
    setErrorCantidad('');
    setCantidad(Math.max(1, Math.min(nuevaCantidad, producto.stock)));
  };

  const incrementarCantidad = () => {
    if (!producto) return;
    if (cantidad >= producto.stock) {
      setErrorCantidad(`No puedes agregar más unidades. Solo hay ${producto.stock} disponibles.`);
      return;
    }
    cambiarCantidad(cantidad + 1);
  };

  const agregarCantidad = () => {
    if (!producto) return;
    if (esInvitado) {
      onLogin();
      return;
    }
    if (cantidadEnCarrito + cantidad > producto.stock) {
      setErrorCantidad(`No puedes agregar ${cantidad} unidades. Solo quedan ${producto.stock - cantidadEnCarrito} disponibles.`);
      return;
    }
    for (let indice = 0; indice < cantidad; indice += 1) carrito.agregar(producto);
    setErrorCantidad('');
    setAgregado(true);
  };

  if (cargando) {
    return <div className="grid min-h-screen place-items-center bg-slate-950 text-sm font-bold uppercase tracking-[0.18em] text-slate-100">Cargando producto...</div>;
  }

  if (!producto) {
    return (
      <div className="grid min-h-screen place-items-center gap-4 bg-slate-950 text-slate-100">
        <h2 className="text-2xl font-bold">Producto no encontrado</h2>
        <button className="rounded-xl bg-violet-600 px-4 py-3 font-semibold" onClick={() => navigate('/')}>Volver a la tienda</button>
      </div>
    );
  }

  return (
    <div className={`flex min-h-screen flex-col bg-[var(--tienda-bg)] text-[var(--tienda-text-primary)] ${tema === 'light' ? '[--tienda-bg:#f0f4f8] [--tienda-surface-1:#fff] [--tienda-surface-2:#f8fafc] [--tienda-text-primary:#0f172a] [--tienda-text-secondary:#334155] [--tienda-text-muted:#64748b]' : '[--tienda-bg:#070b14] [--tienda-surface-1:#0f172a] [--tienda-surface-2:#111827] [--tienda-text-primary:#ebf1ff] [--tienda-text-secondary:#c0cbe0] [--tienda-text-muted:#8897b6]'}`}>
      <header className="theme-dark-header sticky top-0 z-20 flex items-center justify-between gap-4 border-b border-slate-400/15 bg-[var(--tienda-bg)] px-6 py-4 max-[720px]:px-4">
        <button className={`inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-2 font-semibold shadow-sm transition hover:-translate-y-px ${tema === 'light' ? 'border-blue-300 bg-blue-100 text-slate-700 hover:border-blue-500 hover:bg-blue-200' : 'border-blue-400/40 bg-blue-500/20 text-blue-100 hover:border-blue-300 hover:bg-blue-500/35'}`} onClick={() => navigate('/')}>
          <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Volver
        </button>

        <div className="flex items-center gap-3">
          <button
            type="button"
            className="relative grid h-11 w-11 place-items-center rounded-xl border border-slate-400/15 bg-slate-900/70 text-[var(--tienda-text-secondary)] transition hover:-translate-y-0.5 hover:border-violet-400/40"
            aria-label={`Carrito (${carrito.cantidadTotal})`}
            onClick={() => {/* TODO handle carrito */}}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
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
            aria-label="Cambiar tema"
          >
            {tema === 'dark' ? '☀' : '☾'}
          </button>

          <div className="relative flex items-center">
            <button
              type="button"
              className={`grid h-11 w-11 place-items-center rounded-full border-2 text-xs font-bold text-white shadow-lg transition hover:-translate-y-0.5 ${esInvitado ? 'border-slate-400/40 bg-slate-600/50' : 'border-violet-300/50 bg-gradient-to-br from-violet-600/50 to-cyan-500/30'}`}
              onClick={() => setMenuAbierto((a) => !a)}
            >
              {avatarTexto}
            </button>
            {menuAbierto && (
              <div className="absolute right-0 top-[calc(100%+12px)] z-30 flex min-w-44 flex-col gap-2 rounded-2xl border border-slate-400/15 bg-slate-900/95 p-3 shadow-2xl">
                {esInvitado ? (
                  <button type="button" className="rounded-xl bg-violet-500/15 px-3 py-2 text-left text-sm font-semibold text-slate-100 hover:bg-violet-500/25" onClick={onLogin}>
                    Iniciar sesión
                  </button>
                ) : (
                  <>
                    <button type="button" className="rounded-xl bg-violet-500/15 px-3 py-2 text-left text-sm font-semibold text-slate-100 hover:bg-violet-500/25" onClick={onPerfil}>
                      Editar perfil
                    </button>
                    {usuario?.esAdmin && (
                      <button type="button" className="rounded-xl bg-slate-500/15 px-3 py-2 text-left text-sm font-semibold text-slate-100 hover:bg-slate-500/25" onClick={onAdmin}>
                        Panel admin
                      </button>
                    )}
                    <button type="button" className="rounded-xl bg-red-500/15 px-3 py-2 text-left text-sm font-semibold text-red-200 hover:bg-red-500/25" onClick={onLogout}>
                      Cerrar sesión
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="flex flex-1 justify-center px-6 py-10 max-[900px]:py-6 max-[640px]:px-4">
        <div className="theme-dark-surface grid w-full max-w-6xl grid-cols-2 gap-16 rounded-[22px] border border-slate-400/20 bg-[var(--tienda-surface-1)] p-10 shadow-2xl max-[900px]:grid-cols-1 max-[640px]:p-5">
          <div
            className="relative flex min-h-[420px] cursor-zoom-in items-center justify-center overflow-hidden rounded-[20px] border border-slate-400/20 bg-[var(--tienda-surface-2)] p-10"
            onClick={() => setZoomAbierto(true)}
            role="button"
            tabIndex={0}
            aria-label={`Ampliar imagen de ${producto.nombre}`}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') setZoomAbierto(true);
            }}
          >
            <img src={producto.imagen} alt={producto.nombre} className="w-full max-w-[400px] object-contain drop-shadow-2xl transition hover:scale-105" />
            <span className="absolute bottom-3.5 right-4 rounded-full bg-slate-900/75 px-2.5 py-1.5 text-xs text-white">Click para ampliar</span>
          </div>
          <div className="flex flex-col justify-center">
            <p className="mb-2 text-sm font-bold uppercase tracking-[0.1em] text-blue-400">{producto.categoria}</p>
            <h1 className="mb-2 text-4xl font-extrabold leading-tight max-[640px]:text-3xl">{producto.nombre}</h1>
            <p className="mb-6 text-sm text-[var(--tienda-text-muted)]">SKU: {producto.sku}</p>
            
            <div className="mb-8 flex items-baseline gap-3">
              <span className="text-4xl font-extrabold">
                {new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(producto.precio)}
              </span>
              <span className="text-sm text-[var(--tienda-text-muted)]">IVA incluido</span>
            </div>

            <p className="mb-8 text-lg leading-relaxed text-[var(--tienda-text-secondary)]">
              {producto.descripcion || 'Sin descripción disponible para este producto.'}
            </p>

            <div className="mb-8 flex gap-6">
              {tieneTalla && producto.talla && !['única', 'unica', '??nica'].includes(producto.talla.toLowerCase()) && (
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-semibold uppercase tracking-wider text-[var(--tienda-text-muted)]">Talla:</span>
                  <span className="rounded-lg border border-slate-400/20 bg-[var(--tienda-surface-2)] px-4 py-2 text-lg font-bold">{producto.talla}</span>
                </div>
              )}
              {producto.color && (
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-semibold uppercase tracking-wider text-[var(--tienda-text-muted)]">Color:</span>
                  <span className="rounded-lg border border-slate-400/20 bg-[var(--tienda-surface-2)] px-4 py-2 text-lg font-bold">{producto.color}</span>
                </div>
              )}
            </div>

            <div className="mb-8">
              <span className={`rounded-md px-3 py-1.5 text-sm font-semibold ${producto.stock > 0 ? 'bg-green-900/40 text-green-300' : 'bg-red-900/40 text-red-300'}`}>
                {producto.stock > 0 ? `${producto.stock} unidades disponibles` : 'Sin stock'}
              </span>
            </div>

            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--tienda-text-muted)]">Cantidad</span>
              <div className="inline-flex items-center gap-4 rounded-xl border border-slate-400/20 bg-[var(--tienda-surface-2)] p-1">
                <button className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-violet-600 to-blue-400 text-xl leading-none text-white disabled:cursor-not-allowed disabled:opacity-40" type="button" onClick={() => cambiarCantidad(cantidad - 1)} disabled={cantidad <= 1}>−</button>
                <output className="min-w-5 text-center font-extrabold" aria-live="polite">{cantidad}</output>
                <button className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-violet-600 to-blue-400 text-xl leading-none text-white disabled:cursor-not-allowed disabled:opacity-40" type="button" onClick={incrementarCantidad} disabled={producto.stock < 1}>+</button>
              </div>
            </div>

            {errorCantidad && <p className="mb-3 rounded-lg bg-red-900/40 px-3 py-2 text-sm font-semibold text-red-300" role="alert">{errorCantidad}</p>}
            {agregado && <p className="mb-3 rounded-lg bg-green-900/40 px-3 py-2 text-sm font-semibold text-green-300" role="status">Producto agregado al carrito.</p>}

            <button
              type="button"
              className="w-full rounded-xl bg-gradient-to-r from-violet-600 via-blue-500 to-cyan-400 px-4 py-4 font-extrabold text-white shadow-lg shadow-violet-900/30 transition hover:-translate-y-0.5 hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-40"
              onClick={agregarCantidad}
              disabled={producto.stock < 1}
            >
              {producto.stock > 0 ? `Agregar ${cantidad} al carrito` : 'Agotado'}
            </button>
          </div>
        </div>
      </main>

      {zoomAbierto && (
        <div className="fixed inset-0 z-[120] grid place-items-center bg-slate-950/85 p-6" role="presentation" onClick={cerrarZoom}>
          <div
            className="relative flex h-[min(820px,90vh)] w-[min(960px,94vw)] items-center justify-center overflow-hidden rounded-[20px] border border-white/15 bg-slate-900/95 shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-label={`Imagen ampliada de ${producto.nombre}`}
            onClick={(event) => event.stopPropagation()}
          >
            {/* Botón cerrar */}
            <button
              type="button"
              className="absolute right-4 top-4 z-[140] grid h-10 w-10 cursor-pointer place-items-center rounded-full border border-slate-400/40 bg-slate-800/90 text-2xl font-bold leading-none text-slate-200 shadow-lg transition hover:bg-slate-700"
              onClick={cerrarZoom}
              aria-label="Cerrar imagen ampliada"
            >
              ×
            </button>

            {/* Contenedor de zoom: overflow hidden + cursor zoom */}
            <div
              className="h-full w-full cursor-zoom-in overflow-hidden"
              onMouseMove={moverZoom}
              onMouseLeave={() => setZoomActivo(false)}
              onClick={cerrarZoom}
              role="button"
              tabIndex={0}
              aria-label="Cerrar vista ampliada"
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') cerrarZoom();
              }}
            >
              <img
                ref={imgZoomRef}
                src={producto.imagen}
                alt={producto.nombre}
                className="h-full w-full select-none object-contain transition-transform duration-100 ease-out"
                style={{
                  transform: zoomActivo ? 'scale(2.5)' : 'scale(1)',
                  transformOrigin: zoomOrigen,
                }}
                draggable={false}
              />
            </div>

            {/* Instrucción */}
            {!zoomActivo && (
              <span className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-slate-800/80 px-4 py-1.5 text-xs text-slate-300">
                Pasa el mouse sobre la imagen para hacer zoom
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
