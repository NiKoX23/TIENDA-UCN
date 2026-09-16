import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { listarProductos } from '../services/productos.service';
import type { Producto } from './Productos';
import { useCarrito } from '../hooks/useCarrito';
import './DetalleProducto.css';

interface DetalleProductoProps {
  usuario: { uid: number; nombre: string } | null;
  tema: 'dark' | 'light';
  onToggleTema: () => void;
  onPerfil: () => void;
  onLogin: () => void;
  onLogout: () => void;
}

const categoriasConTalla = new Set(['polerones', 'poleras', 'pantalones']);

export default function DetalleProducto({ usuario, tema, onToggleTema, onPerfil, onLogin, onLogout }: DetalleProductoProps) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [producto, setProducto] = useState<Producto | null>(null);
  const [cargando, setCargando] = useState(true);
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [zoomAbierto, setZoomAbierto] = useState(false);
  const [cantidad, setCantidad] = useState(1);
  const [errorCantidad, setErrorCantidad] = useState('');
  const [agregado, setAgregado] = useState(false);
  const carrito = useCarrito(usuario?.uid);

  useEffect(() => {
    listarProductos()
      .then((productos) => {
        const prod = productos.find((p) => p.codigoProducto === id);
        setProducto(prod || null);
      })
      .finally(() => setCargando(false));
  }, [id]);

  useEffect(() => {
    if (!zoomAbierto) return;
    const cerrarConEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setZoomAbierto(false);
    };
    document.addEventListener('keydown', cerrarConEscape);
    return () => document.removeEventListener('keydown', cerrarConEscape);
  }, [zoomAbierto]);

  const esInvitado = !usuario;
  const avatarTexto = esInvitado ? '?' : usuario.nombre.charAt(0).toUpperCase();

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
    return <div className="detalle-loading">Cargando producto...</div>;
  }

  if (!producto) {
    return (
      <div className="detalle-error">
        <h2>Producto no encontrado</h2>
        <button onClick={() => navigate('/')}>Volver a la tienda</button>
      </div>
    );
  }

  return (
    <div className={`detalle-page app-shell--${tema}`}>
      <header className="tienda-header">
        <button className="detalle-volver" onClick={() => navigate('/')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Volver
        </button>

        <div className="tienda-acciones">
          <button
            type="button"
            className="tienda-icono-boton tienda-carrito"
            aria-label={`Carrito (${carrito.cantidadTotal})`}
            onClick={() => {/* TODO handle carrito */}}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M6 8h12l-1 12H7L6 8Z" />
              <path d="M9 8V6a3 3 0 0 1 6 0v2" />
            </svg>
            {carrito.cantidadTotal > 0 && (
              <span className="tienda-carrito-badge" aria-hidden="true">
                {carrito.cantidadTotal}
              </span>
            )}
          </button>

          <button
            type="button"
            className="theme-toggle theme-toggle--header"
            onClick={onToggleTema}
            aria-label="Cambiar tema"
          >
            {tema === 'dark' ? '☀️' : '🌙'}
          </button>

          <div className="tienda-avatar-wrapper">
            <button
              type="button"
              className={`tienda-avatar ${esInvitado ? 'tienda-avatar--guest' : ''}`}
              onClick={() => setMenuAbierto((a) => !a)}
            >
              {avatarTexto}
            </button>
            {menuAbierto && (
              <div className="tienda-avatar-menu">
                {esInvitado ? (
                  <button type="button" className="tienda-avatar-menu-boton" onClick={onLogin}>
                    Iniciar sesión
                  </button>
                ) : (
                  <>
                    <button type="button" className="tienda-avatar-menu-boton" onClick={onPerfil}>
                      Editar perfil
                    </button>
                    <button type="button" className="tienda-avatar-menu-boton tienda-avatar-menu-boton--danger" onClick={onLogout}>
                      Cerrar sesión
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="detalle-main">
        <div className="detalle-container">
          <div
            className="detalle-imagen-wrapper"
            onClick={() => setZoomAbierto(true)}
            role="button"
            tabIndex={0}
            aria-label={`Ampliar imagen de ${producto.nombre}`}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') setZoomAbierto(true);
            }}
          >
            <img src={producto.imagen} alt={producto.nombre} className="detalle-imagen" />
            <span className="detalle-zoom-hint">Click para ampliar</span>
          </div>
          <div className="detalle-info">
            <p className="detalle-categoria">{producto.categoria}</p>
            <h1 className="detalle-nombre">{producto.nombre}</h1>
            <p className="detalle-sku">SKU: {producto.sku}</p>
            
            <div className="detalle-precio-container">
              <span className="detalle-precio">
                {new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(producto.precio)}
              </span>
              <span className="detalle-iva">IVA incluido</span>
            </div>

            <p className="detalle-descripcion">
              {producto.descripcion || 'Sin descripción disponible para este producto.'}
            </p>

            <div className="detalle-atributos">
              {tieneTalla && producto.talla && !['única', 'unica', '??nica'].includes(producto.talla.toLowerCase()) && (
                <div className="detalle-atributo">
                  <span className="atributo-label">Talla:</span>
                  <span className="atributo-valor">{producto.talla}</span>
                </div>
              )}
              {producto.color && (
                <div className="detalle-atributo">
                  <span className="atributo-label">Color:</span>
                  <span className="atributo-valor">{producto.color}</span>
                </div>
              )}
            </div>

            <div className="detalle-stock">
              <span className={producto.stock > 0 ? 'stock-disponible' : 'stock-agotado'}>
                {producto.stock > 0 ? `${producto.stock} unidades disponibles` : 'Sin stock'}
              </span>
            </div>

            <div className="detalle-cantidad-seccion">
              <span className="atributo-label">Cantidad</span>
              <div className="detalle-cantidad-control">
                <button type="button" onClick={() => cambiarCantidad(cantidad - 1)} disabled={cantidad <= 1}>−</button>
                <output aria-live="polite">{cantidad}</output>
                <button type="button" onClick={incrementarCantidad} disabled={producto.stock < 1}>+</button>
              </div>
            </div>

            {errorCantidad && <p className="detalle-cantidad-error" role="alert">{errorCantidad}</p>}
            {agregado && <p className="detalle-cantidad-exito" role="status">Producto agregado al carrito.</p>}

            <button
              type="button"
              className="detalle-btn-agregar"
              onClick={agregarCantidad}
              disabled={producto.stock < 1}
            >
              {producto.stock > 0 ? `Agregar ${cantidad} al carrito` : 'Agotado'}
            </button>
          </div>
        </div>
      </main>

      {zoomAbierto && (
        <div className="detalle-zoom-backdrop" role="presentation" onClick={() => setZoomAbierto(false)}>
          <div className="detalle-zoom-modal" role="dialog" aria-modal="true" aria-label={`Imagen ampliada de ${producto.nombre}`} onClick={(event) => event.stopPropagation()}>
            <button type="button" className="detalle-zoom-cerrar" onClick={() => setZoomAbierto(false)} aria-label="Cerrar imagen ampliada">×</button>
            <img src={producto.imagen} alt={producto.nombre} className="detalle-imagen-ampliada" />
          </div>
        </div>
      )}
    </div>
  );
}
