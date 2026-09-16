import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Tienda.css';
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
}

function obtenerIniciales(nombre?: string, email?: string) {
  return (nombre || email || 'Usuario')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0]?.toUpperCase())
    .join('');
}

export default function Tienda({ usuario, tema, onToggleTema, onPerfil, onLogin, onLogout }: TiendaProps) {
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
        if (activo) setProductos(datos);
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

  return (
    <main className="tienda">
      {modalLoginAbierto && (
        <div className="tienda-login-modal-backdrop" role="presentation" onClick={() => setModalLoginAbierto(false)}>
          <div
            className="tienda-login-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="tienda-login-titulo"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="tienda-login-modal-icon" aria-hidden="true">🔒</div>
            <h3 id="tienda-login-titulo">Inicia sesión para continuar</h3>
            <p>Debes iniciar sesión para comprar y guardar tus favoritos.</p>
            <button type="button" className="tienda-login-modal-boton" onClick={abrirLogin}>
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

      <header className="tienda-header">
        <a className="tienda-marca" href="/">
          <span className="tienda-marca-icono" aria-hidden="true">
            <img src={escudoUcn} alt="Escudo UCN" className="tienda-marca-icono-img" />
          </span>
          tienda ucn
        </a>

        <div className="tienda-buscador">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3-3" />
          </svg>
          <input
            type="search"
            placeholder="buscar poleras, polerones..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>

        <div className="tienda-acciones">
          <button
            type="button"
            className="tienda-icono-boton"
            aria-label={`Favoritos (${favoritos.length})`}
            onClick={handleFavoritos}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M12 21s-7-4.35-9.5-8.5C.5 8.5 3 5 6.5 5c2 0 3.5 1.5 5.5 3.5C14 6.5 15.5 5 17.5 5 21 5 23.5 8.5 21.5 12.5 19 16.65 12 21 12 21Z" />
            </svg>
          </button>

          <button
            type="button"
            className="tienda-icono-boton tienda-carrito"
            aria-label={`Carrito (${carrito.cantidadTotal})`}
            onClick={handleCarrito}
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
            aria-label={tema === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            title={tema === 'dark' ? 'Modo claro' : 'Modo oscuro'}
          >
            {tema === 'dark' ? '☀' : '☾'}
          </button>

          <div className="tienda-avatar-wrapper" ref={menuRef}>
            <button
              type="button"
              className={`tienda-avatar ${esInvitado ? 'tienda-avatar--guest' : ''}`}
              onClick={() => setMenuAbierto((actual) => !actual)}
              title={esInvitado ? 'Cuenta de invitado' : 'Ver perfil'}
              aria-label={esInvitado ? 'Cuenta de invitado' : 'Ver perfil'}
            >
              {avatarTexto}
            </button>

            {menuAbierto && (
              <div className="tienda-avatar-menu" role="menu" aria-label="Menú del usuario">
                {esInvitado ? (
                  <button
                    type="button"
                    className="tienda-avatar-menu-boton"
                    onClick={abrirLogin}
                  >
                    Iniciar sesión
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      className="tienda-avatar-menu-boton"
                      onClick={() => {
                        setMenuAbierto(false);
                        onPerfil();
                      }}
                    >
                      Editar perfil
                    </button>
                    <button
                      type="button"
                      className="tienda-avatar-menu-boton tienda-avatar-menu-boton--danger"
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

      <section className="tienda-hero">
        <div className="tienda-hero-content">
          <h1 className="tienda-hero-title">¡Bienvenido a la Tienda UCN!</h1>
          <p className="tienda-hero-subtitle">Descubre la mejor selección de merchandising oficial, ropa y accesorios exclusivos para nuestra comunidad.</p>
          <button 
            type="button" 
            className="tienda-hero-cta" 
            onClick={() => setCategoriaActiva('todos')}
          >
            Explorar Colección
          </button>
        </div>
        <div className="tienda-hero-image-wrapper">
          <img src={escudoUcn} alt="Escudo UCN" className="tienda-hero-image" aria-hidden="true" />
        </div>
      </section>

      <nav className="tienda-categorias">
        {categorias.map((categoria) => (
          <button
            key={categoria.id}
            type="button"
            className={
              categoriaActiva === categoria.id
                ? 'tienda-categoria tienda-categoria--activa'
                : 'tienda-categoria'
            }
            onClick={() => setCategoriaActiva(categoria.id)}
          >
            {categoria.label}
          </button>
        ))}
      </nav>

      <section className="tienda-destacados" aria-labelledby="destacados-titulo">
        <div className="tienda-destacados-header">
          <h2 id="destacados-titulo">destacados</h2>
          <button type="button" className="tienda-ver-todos" onClick={() => setCategoriaActiva('todos')}>
            ver todos
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="m9 6 6 6-6 6" />
            </svg>
          </button>
        </div>

        <div className="tienda-productos">
          {cargandoProductos && <p className="tienda-sin-resultados">Cargando productos...</p>}
          {errorProductos && <p className="tienda-sin-resultados">No fue posible cargar el catálogo.</p>}
          {productosFiltrados.map((producto) => (
            <article className="producto" key={producto.codigoProducto}>
              <div className="producto-imagen-container">
                <div 
                  className="producto-imagen"
                  onClick={() => navigate(`/producto/${producto.codigoProducto}`)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter') navigate(`/producto/${producto.codigoProducto}`) }}
                  style={{ cursor: 'pointer' }}
                >
                  <img src={producto.imagen} alt={producto.nombre} className="producto-imagen-real" />
                </div>

                <button
                  type="button"
                  className={`producto-favorito${favoritos.includes(producto.codigoProducto) ? ' producto-favorito--activo' : ''}`}
                  aria-label={favoritos.includes(producto.codigoProducto) ? 'Quitar de favoritos' : 'Agregar a favoritos'}
                  onClick={(e) => { e.stopPropagation(); handleToggleFavorito(producto.codigoProducto); }}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M12 21s-7-4.35-9.5-8.5C.5 8.5 3 5 6.5 5c2 0 3.5 1.5 5.5 3.5C14 6.5 15.5 5 17.5 5 21 5 23.5 8.5 21.5 12.5 19 16.65 12 21 12 21Z" />
                  </svg>
                </button>
              </div>

              <div className="producto-info">
                <p 
                  className="producto-nombre"
                  onClick={() => navigate(`/producto/${producto.codigoProducto}`)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter') navigate(`/producto/${producto.codigoProducto}`) }}
                  style={{ cursor: 'pointer' }}
                >
                  {producto.nombre}
                </p>
                <div className="producto-precio-wrapper">
                  <p className="producto-precio">{formatearCLP(producto.precio)}</p>
                </div>
                <div className="producto-tallas">
                  <span className={producto.stock > 0 ? 'producto-talla' : 'producto-talla producto-talla--agotada'}>
                    {producto.stock > 0 ? `${producto.stock} disponibles` : 'sin stock'}
                  </span>
                </div>
                <button
                  type="button"
                  className="producto-agregar"
                  onClick={() => handleAgregarAlCarrito(producto)}
                  disabled={producto.stock < 1}
                >
                  {producto.stock > 0 ? 'agregar al carrito' : 'agotado'}
                </button>
              </div>
            </article>
          ))}

          {productosFiltrados.length === 0 && (
            <p className="tienda-sin-resultados">No hay productos que coincidan con tu búsqueda.</p>
          )}
        </div>
      </section>

      <section className="tienda-envio">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
          <path d="M3 7h11v9H3z" />
          <path d="M14 10h4l3 3v3h-7z" />
          <circle cx="7.5" cy="18" r="1.5" />
          <circle cx="17.5" cy="18" r="1.5" />
        </svg>
        <div>
          <p className="tienda-envio-titulo">envío gratis</p>
          <p className="tienda-envio-texto">en compras sobre $30.000</p>
        </div>
      </section>
    </main>
  );
}