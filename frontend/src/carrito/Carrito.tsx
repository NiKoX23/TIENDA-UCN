import { useEffect } from 'react';
import type { ItemCarrito } from '../hooks/useCarrito';
import { formatearCLP } from '../utils/precio';
import './Carrito.css';

interface CarritoProps {
  abierto: boolean;
  items: ItemCarrito[];
  total: number;
  onCerrar: () => void;
  onSumar: (nombre: string) => void;
  onRestar: (nombre: string) => void;
  onEliminar: (nombre: string) => void;
  onCantidad: (nombre: string, cantidad: number) => void;
  onIrAPagar: () => void;
}

export default function Carrito({
  abierto,
  items,
  total,
  onCerrar,
  onSumar,
  onRestar,
  onEliminar,
  onCantidad,
  onIrAPagar,
}: CarritoProps) {
  useEffect(() => {
    if (!abierto) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCerrar();
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [abierto, onCerrar]);

  if (!abierto) return null;

  const vacio = items.length === 0;

  return (
    <div className="carrito-backdrop" role="presentation" onClick={onCerrar}>
      <aside
        className="carrito-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="carrito-titulo"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="carrito-header">
          <h2 id="carrito-titulo">tu carrito</h2>
          <button type="button" className="carrito-cerrar" onClick={onCerrar} aria-label="Cerrar carrito">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
              <path d="m6 6 12 12M18 6 6 18" />
            </svg>
          </button>
        </header>

        {vacio ? (
          <div className="carrito-vacio">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
              <path d="M6 8h12l-1 12H7L6 8Z" />
              <path d="M9 8V6a3 3 0 0 1 6 0v2" />
            </svg>
            <p>Tu carrito está vacío</p>
            <span>Agrega productos desde la tienda para verlos aquí.</span>
          </div>
        ) : (
          <ul className="carrito-lista">
            {items.map((item) => (
              <li className="carrito-item" key={item.nombre}>
                <div className="carrito-item-info">
                  <p className="carrito-item-nombre">{item.nombre}</p>
                  <p className="carrito-item-precio">{formatearCLP(item.precio)} c/u</p>
                </div>

                <div className="carrito-item-controles">
                  <div className="carrito-cantidad">
                    <button
                      type="button"
                      onClick={() => onRestar(item.nombre)}
                      aria-label={`Quitar una unidad de ${item.nombre}`}
                    >
                      −
                    </button>
                    <input
                      type="number"
                      min={1}
                      value={item.cantidad}
                      onChange={(e) => onCantidad(item.nombre, Number(e.target.value))}
                      aria-label={`Cantidad de ${item.nombre}`}
                    />
                    <button
                      type="button"
                      onClick={() => onSumar(item.nombre)}
                      aria-label={`Agregar una unidad de ${item.nombre}`}
                    >
                      +
                    </button>
                  </div>

                  <p className="carrito-item-subtotal">{formatearCLP(item.precio * item.cantidad)}</p>

                  <button
                    type="button"
                    className="carrito-item-eliminar"
                    onClick={() => onEliminar(item.nombre)}
                    aria-label={`Eliminar ${item.nombre} del carrito`}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
                      <path d="M4 7h16" />
                      <path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
                      <path d="M6 7l1 13h10l1-13" />
                    </svg>
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        <footer className="carrito-footer">
          <div className="carrito-total">
            <span>total</span>
            <strong>{formatearCLP(total)}</strong>
          </div>
          <button type="button" className="carrito-pagar" onClick={onIrAPagar} disabled={vacio}>
            ir a pagar
          </button>
        </footer>
      </aside>
    </div>
  );
}
