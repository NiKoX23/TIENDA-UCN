import { useMemo, useState } from 'react';
import './Tienda.css';
import type { Usuario } from '../services/auth.service';

interface TiendaProps {
  usuario: Usuario;
  onPerfil: () => void;
}

interface Talla {
  nombre: string;
  disponible: boolean;
}

interface Producto {
  nombre: string;
  categoria: 'poleras' | 'polerones' | 'pantalones' | 'accesorios';
  precio: string;
  etiqueta?: 'descuento' | 'nuevo';
  etiquetaTexto?: string;
  tallas: Talla[];
}

const productos: Producto[] = [
  //Agregar GET de productos y renderizarlos en la tienda
  {
    nombre: 'Polerón Oversize',
    categoria: 'polerones',
    precio: '$19.990',
    etiqueta: 'descuento',
    etiquetaTexto: '-20%',
    tallas: [
      { nombre: 'S', disponible: true },
      { nombre: 'M', disponible: true },
      { nombre: 'L', disponible: false },
    ],
  },
  {
    nombre: 'Polera Básica',
    categoria: 'poleras',
    precio: '$8.990',
    tallas: [
      { nombre: 'M', disponible: true },
      { nombre: 'L', disponible: true },
      { nombre: 'XL', disponible: true },
    ],
  },
  {
    nombre: 'Mochila Urbana',
    categoria: 'accesorios',
    precio: '$24.990',
    etiqueta: 'nuevo',
    etiquetaTexto: 'nuevo',
    tallas: [{ nombre: 'única', disponible: true }],
  },
];

const categorias = [
  { id: 'todos', label: 'todos' },
  { id: 'poleras', label: 'poleras' },
  { id: 'polerones', label: 'polerones' },
  { id: 'pantalones', label: 'pantalones' },
  { id: 'accesorios', label: 'accesorios' },
] as const;

function obtenerIniciales(nombre?: string, email?: string) {
  return (nombre || email || 'Usuario')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0]?.toUpperCase())
    .join('');
}

export default function Tienda({ usuario, onPerfil }: TiendaProps) {
  const [categoriaActiva, setCategoriaActiva] = useState<string>('todos');
  const [busqueda, setBusqueda] = useState('');
  const [favoritos, setFavoritos] = useState<string[]>([]);
  const [carrito, setCarrito] = useState<string[]>([]);

  const productosFiltrados = useMemo(() => {
    return productos.filter((producto) => {
      const coincideCategoria =
        categoriaActiva === 'todos' ||
        (categoriaActiva === 'favoritos' && favoritos.includes(producto.nombre)) ||
        producto.categoria === categoriaActiva;
      const coincideBusqueda = producto.nombre
        .toLowerCase()
        .includes(busqueda.toLowerCase());
      return coincideCategoria && coincideBusqueda;
    });
  }, [categoriaActiva, busqueda, favoritos]);

  return (
    <main className="tienda">
      <header className="tienda-header">
        <a className="tienda-marca" href="/">
          <span className="tienda-marca-icono" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M8 4 5 7v3h2v10h10V10h2V7l-3-3-2 2H10L8 4Z" />
            </svg>
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
            onClick={() => setCategoriaActiva('favoritos')}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M12 21s-7-4.35-9.5-8.5C.5 8.5 3 5 6.5 5c2 0 3.5 1.5 5.5 3.5C14 6.5 15.5 5 17.5 5 21 5 23.5 8.5 21.5 12.5 19 16.65 12 21 12 21Z" />
            </svg>
          </button>

          <button
            type="button"
            className="tienda-icono-boton tienda-carrito"
            aria-label={`Carrito (${carrito.length})`}
            onClick={() => window.alert(`Tienes ${carrito.length} producto(s) en el carrito.`)}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M6 8h12l-1 12H7L6 8Z" />
              <path d="M9 8V6a3 3 0 0 1 6 0v2" />
            </svg>
            <span className="tienda-carrito-badge">{carrito.length}</span>
          </button>

          <button
            type="button"
            className="tienda-avatar"
            onClick={onPerfil}
            title="Ver perfil"
            aria-label="Ver perfil"
          >
            {obtenerIniciales(usuario.nombre, usuario.email)}
          </button>
        </div>
      </header>

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

      <section className="tienda-banner">
        <div>
          <p className="tienda-banner-etiqueta">nueva colección</p>
          <h1 className="tienda-banner-titulo">invierno 2026, hasta 30% de descuento</h1>
          <button type="button" className="tienda-banner-boton">
            ver colección
          </button>
        </div>
        <svg
          className="tienda-banner-icono"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.2"
          aria-hidden="true"
        >
          <path d="M8 4 5 7v3h2v10h10V10h2V7l-3-3-2 2H10L8 4Z" />
        </svg>
      </section>

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
          {productosFiltrados.map((producto) => (
            <article className="producto" key={producto.nombre}>
              <div className="producto-imagen">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                  <path d="M8 4 5 7v3h2v10h10V10h2V7l-3-3-2 2H10L8 4Z" />
                </svg>

                {producto.etiqueta && (
                  <span
                    className={
                      producto.etiqueta === 'descuento'
                        ? 'producto-etiqueta producto-etiqueta--descuento'
                        : 'producto-etiqueta producto-etiqueta--nuevo'
                    }
                  >
                    {producto.etiquetaTexto}
                  </span>
                )}

                <button
                  type="button"
                  className={`producto-favorito${favoritos.includes(producto.nombre) ? ' producto-favorito--activo' : ''}`}
                  aria-label={favoritos.includes(producto.nombre) ? 'Quitar de favoritos' : 'Agregar a favoritos'}
                  onClick={() => setFavoritos((actuales) => actuales.includes(producto.nombre)
                    ? actuales.filter((nombre) => nombre !== producto.nombre)
                    : [...actuales, producto.nombre])}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M12 21s-7-4.35-9.5-8.5C.5 8.5 3 5 6.5 5c2 0 3.5 1.5 5.5 3.5C14 6.5 15.5 5 17.5 5 21 5 23.5 8.5 21.5 12.5 19 16.65 12 21 12 21Z" />
                  </svg>
                </button>
              </div>

              <div className="producto-info">
                <p className="producto-nombre">{producto.nombre}</p>
                <p className="producto-precio">{producto.precio}</p>
                <div className="producto-tallas">
                  {producto.tallas.map((talla) => (
                    <span
                      key={talla.nombre}
                      className={
                        talla.disponible
                          ? 'producto-talla'
                          : 'producto-talla producto-talla--agotada'
                      }
                    >
                      {talla.nombre}
                    </span>
                  ))}
                </div>
                <button
                  type="button"
                  className="producto-agregar"
                  onClick={() => setCarrito((actual) => [...actual, producto.nombre])}
                >
                  agregar al carrito
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