import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { comprarProductos, listarProductos } from '../services/productos.service';
import type { Producto } from './Productos';
import type { Usuario } from '../services/auth.service';
import { useCarrito } from '../hooks/useCarrito';
import BackToStore from '../components/BackToStore';
import UserAvatarMenu from '../components/UserAvatarMenu';
import Carrito from '../carrito/Carrito';

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

function categoriaVisual(categoria: string): string {
  const normalizada = categoria.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  if (normalizada.includes('papeleria')) return 'papeleria';
  if (normalizada.includes('accesorio')) return 'accesorios';
  if (normalizada.includes('polera') || normalizada.includes('poleron') || normalizada.includes('vestuario')) return 'vestuario';
  return 'default';
}

function estiloColorProducto(color: string) {
  const nombre = color.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const paleta: [string[], string, string][] = [
    [['blanco', 'white', 'marfil', 'crema'], '#F1F5F9', '#1F2937'],
    [['negro', 'black'], '#1F2937', '#FFFFFF'],
    [['gris', 'gray', 'grey', 'plata'], '#9CA3AF', '#1F2937'],
    [['rosa', 'rosado', 'pink', 'fucsia'], '#F9A8D4', '#831843'],
    [['rojo', 'red', 'burdeo', 'granate', 'vino'], '#DC2626', '#FFFFFF'],
    [['naranjo', 'naranja', 'orange', 'coral'], '#FB923C', '#431407'],
    [['amarillo', 'yellow', 'dorado', 'oro'], '#FDE047', '#422006'],
    [['verde', 'green', 'oliva', 'menta'], '#4ADE80', '#14532D'],
    [['celeste', 'turquesa', 'cyan', 'agua'], '#67E8F9', '#164E63'],
    [['azul', 'blue', 'navy', 'marino'], '#3B82F6', '#FFFFFF'],
    [['morado', 'purpura', 'violeta', 'purple', 'lila'], '#A855F7', '#FFFFFF'],
    [['cafe', 'marron', 'brown', 'beige', 'camel'], '#A16207', '#FFFFFF'],
  ];
  const coincidencia = paleta.find(([nombres]) => nombres.some((nombreColor) => nombre.includes(nombreColor)));
  const [fondo, texto] = coincidencia ? [coincidencia[1], coincidencia[2]] : ['#E2E8F0', '#1F2937'];
  return { backgroundColor: fondo, color: texto, borderColor: fondo };
}

export default function DetalleProducto({ usuario, tema, onToggleTema, onPerfil, onLogin, onLogout, onAdmin }: DetalleProductoProps) {
  const { id } = useParams<{ id: string }>();
  const [producto, setProducto] = useState<Producto | null>(null);
  const [variantes, setVariantes] = useState<Producto[]>([]);
  const [cargando, setCargando] = useState(true);
  const [carritoAbierto, setCarritoAbierto] = useState(false);
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
        const grupo = productos.filter((p) => p.codigoProducto === id);
        setVariantes(grupo);
        setProducto(grupo.find((variante) => variante.stock > 0) || grupo[0] || null);
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
  const variantesDisponibles = variantes.filter((variante) => variante.stock > 0);
  const coloresDisponibles = [...new Set(variantesDisponibles.map((variante) => variante.color).filter((color): color is string => Boolean(color)))];
  const tallasDisponibles = [...new Set(variantesDisponibles
    .filter((variante) => variante.color === producto?.color)
    .map((variante) => variante.talla)
    .filter((talla) => talla && !['única', 'unica', '??nica'].includes(talla.toLowerCase())))];
  const seleccionarVariante = (variante: Producto) => {
    setProducto(variante);
    setCantidad(1);
    setErrorCantidad('');
    setAgregado(false);
    setZoomAbierto(false);
  };
  const seleccionarOpcion = (dimension: 'color' | 'talla', valor: string) => {
    if (!producto) return;
    const variantesConStock = variantes.filter((opcion) => opcion.stock > 0);
    const variante = dimension === 'color'
      ? variantesConStock.find((opcion) => opcion.color === valor && opcion.talla === producto.talla)
        ?? variantesConStock.find((opcion) => opcion.color === valor)
      : variantesConStock.find((opcion) => opcion.color === producto.color && opcion.talla === valor);
    if (variante) seleccionarVariante(variante);
  };
  const cantidadEnCarrito = producto
    ? carrito.items.find((item) => item.idVariante === producto.idVariante)?.cantidad ?? 0
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

  if (cargando) {
    return <div className="storefront-page storefront-detail-state grid min-h-screen place-items-center text-sm font-bold uppercase tracking-[0.18em]">Cargando producto...</div>;
  }

  if (!producto) {
    return (
      <div className="storefront-page storefront-detail-state grid min-h-screen place-items-center gap-4">
        <h2 className="text-2xl font-bold">Producto no encontrado</h2>
        <BackToStore />
      </div>
    );
  }

  return (
    <div className="storefront-page storefront-product-detail-page flex min-h-screen flex-col">
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
      <header className="theme-dark-header storefront-detail-header sticky top-0 z-20 flex items-center justify-between gap-4 border-b px-6 py-4 max-[720px]:px-4">
        <BackToStore />

        <div className="flex items-center gap-3">
          <button
            type="button"
            className="relative grid h-11 w-11 place-items-center rounded-xl border border-slate-400/15 bg-slate-900/70 text-[var(--tienda-text-secondary)] transition hover:-translate-y-0.5 hover:border-violet-400/40"
            aria-label={`Carrito (${carrito.cantidadTotal})`}
            onClick={() => esInvitado ? onLogin() : setCarritoAbierto(true)}
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
            className="theme-toggle-control grid h-11 w-11 place-items-center rounded-full border border-slate-400/30 bg-slate-900 text-lg text-slate-900 dark:text-white font-bold shadow-lg transition hover:-translate-y-px hover:border-violet-400"
            onClick={onToggleTema}
            aria-label={tema === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            title={tema === 'dark' ? 'Modo claro' : 'Modo oscuro'}
          >
            {tema === 'dark' ? '☀' : '☾'}
          </button>

          <UserAvatarMenu usuario={usuario} onLogin={onLogin} onPerfil={onPerfil} onAdmin={onAdmin} onLogout={onLogout} />
        </div>
      </header>

      <main className="flex flex-1 justify-center px-6 py-10 max-[900px]:py-6 max-[640px]:px-4">
        <div className="storefront-detail-card grid w-full max-w-6xl grid-cols-2 gap-12 p-8 max-[900px]:grid-cols-1 max-[900px]:gap-8 max-[640px]:p-5">
          <div
            className={`storefront-detail-media storefront-detail-media--${categoriaVisual(producto.categoria)} relative flex min-h-[420px] cursor-zoom-in items-center justify-center overflow-hidden p-10 max-[640px]:min-h-[300px] max-[640px]:p-6`}
            onClick={() => setZoomAbierto(true)}
            role="button"
            tabIndex={0}
            aria-label={`Ampliar imagen de ${producto.nombre}`}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') setZoomAbierto(true);
            }}
          >
            <img src={producto.imagen} alt={producto.nombre} className="w-full max-w-[400px] object-contain drop-shadow-2xl transition hover:scale-105" />
            <span className="storefront-detail-zoom-hint absolute bottom-3.5 right-4 rounded-full px-2.5 py-1.5 text-xs">Click para ampliar</span>
          </div>
          <div className="flex flex-col justify-center">
            <p className="storefront-detail-category mb-2 text-sm font-bold uppercase">{producto.categoria}</p>
            <h1 className="mb-2 text-4xl font-extrabold leading-tight max-[640px]:text-3xl">{producto.nombre}</h1>
            <p className="storefront-detail-muted mb-6 text-sm">SKU: {producto.sku}</p>
            
            <div className="mb-8 flex items-baseline gap-3">
              <span className="storefront-detail-price text-4xl font-extrabold">
                {new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(producto.precio)}
              </span>
              <span className="storefront-detail-muted text-sm">IVA incluido</span>
            </div>

            <p className="storefront-detail-secondary mb-8 text-lg leading-relaxed">
              {producto.descripcion || 'Sin descripción disponible para este producto.'}
            </p>

            <div className="mb-8 flex flex-col gap-5">
              {tieneTalla && tallasDisponibles.length > 0 && (
                <div className="flex flex-col gap-1">
                  <span className="storefront-detail-muted text-xs font-semibold uppercase">Talla:</span>
                  <div className="flex flex-wrap gap-2">
                    {tallasDisponibles.map((talla) => (
                      <button key={talla} type="button" onClick={() => seleccionarOpcion('talla', talla)} aria-pressed={producto.talla === talla} className={`storefront-detail-option rounded-lg px-4 py-2 text-sm font-bold ${producto.talla === talla ? 'ring-2 ring-pink-500' : ''}`}>
                        {talla}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {coloresDisponibles.length > 1 ? (
                <div className="flex flex-col gap-1">
                  <span className="storefront-detail-muted text-xs font-semibold uppercase">Color: <span className="normal-case">{producto.color}</span></span>
                  <div className="flex flex-wrap gap-2">
                    {coloresDisponibles.map((color) => (
                      <button key={color} type="button" onClick={() => seleccionarOpcion('color', color)} aria-label={`Seleccionar color ${color}`} title={color} aria-pressed={producto.color === color} style={{ ...estiloColorProducto(color), borderColor: '#64748B' }} className={`storefront-detail-option h-9 w-9 rounded-full p-0 ${producto.color === color ? 'ring-2 ring-pink-500 ring-offset-2' : ''}`}>
                        <span className="sr-only">{color}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : coloresDisponibles.length === 1 && (
                <div className="flex flex-col gap-1">
                  <span className="storefront-detail-muted text-xs font-semibold uppercase">Color:</span>
                  <span className="storefront-detail-option w-fit self-start rounded-lg px-5 py-2.5 text-xl font-bold" style={estiloColorProducto(coloresDisponibles[0])}>{coloresDisponibles[0]}</span>
                </div>
              )}
            </div>

            <div className="mb-8">
              <span className={`storefront-stock-badge ${producto.stock <= 0 ? 'storefront-stock-badge--empty' : producto.stock <= 3 ? 'storefront-stock-badge--low' : 'storefront-stock-badge--high'}`}>
                {producto.stock} {producto.stock === 1 ? 'unidad' : 'unidades'}
              </span>
            </div>

            <div className="mb-3 flex items-center justify-between">
              <span className="storefront-detail-muted text-xs font-semibold uppercase">Cantidad</span>
              <div className="storefront-detail-quantity inline-flex items-center gap-4 rounded-xl p-1">
                <button className="storefront-detail-quantity-button grid h-8 w-8 place-items-center rounded-lg text-xl leading-none text-slate-900 dark:text-white font-bold disabled:cursor-not-allowed disabled:opacity-40" type="button" onClick={() => cambiarCantidad(cantidad - 1)} disabled={cantidad <= 1}>−</button>
                <output className="min-w-5 text-center font-extrabold" aria-live="polite">{cantidad}</output>
                <button className="storefront-detail-quantity-button grid h-8 w-8 place-items-center rounded-lg text-xl leading-none text-slate-900 dark:text-white font-bold disabled:cursor-not-allowed disabled:opacity-40" type="button" onClick={incrementarCantidad} disabled={producto.stock < 1}>+</button>
              </div>
            </div>

            {errorCantidad && <p className="storefront-detail-message storefront-detail-message--error mb-3 rounded-lg px-3 py-2 text-sm font-semibold" role="alert">{errorCantidad}</p>}
            {agregado && <p className="storefront-detail-message storefront-detail-message--success mb-3 rounded-lg px-3 py-2 text-sm font-semibold" role="status">Producto agregado al carrito.</p>}

            <button
              type="button"
              className="storefront-detail-add w-full rounded-xl px-4 py-4 font-extrabold text-slate-900 dark:text-white font-bold transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
              onClick={agregarCantidad}
              disabled={producto.stock < 1}
            >
              {producto.stock > 0 ? `Agregar ${cantidad} al carrito` : 'Agotado'}
            </button>
          </div>
        </div>
      </main>

      {zoomAbierto && (
        <div className="storefront-detail-zoom-overlay fixed inset-0 z-[120] grid place-items-center p-6" role="presentation" onClick={cerrarZoom}>
          <div
            className="storefront-detail-zoom-dialog relative flex h-[min(820px,90vh)] w-[min(960px,94vw)] items-center justify-center overflow-hidden rounded-[20px] shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-label={`Imagen ampliada de ${producto.nombre}`}
            onClick={(event) => event.stopPropagation()}
          >
            {/* Botón cerrar */}
            <button
              type="button"
              className="storefront-detail-zoom-close absolute right-4 top-4 z-[140] grid h-10 w-10 cursor-pointer place-items-center rounded-full text-2xl font-bold leading-none shadow-lg transition"
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
              <span className="storefront-detail-zoom-hint pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full px-4 py-1.5 text-xs">
                Pasa el mouse sobre la imagen para hacer zoom
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
