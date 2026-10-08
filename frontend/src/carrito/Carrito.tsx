import { useEffect } from 'react';
import type { ItemCarrito } from '../hooks/useCarrito';
import { formatearCLP } from '../utils/precio';

interface CarritoProps {
  abierto: boolean;
  items: ItemCarrito[];
  total: number;
  onCerrar: () => void;
  onSumar: (idVariante: number) => void;
  onRestar: (idVariante: number) => void;
  onEliminar: (idVariante: number) => void;
  onCantidad: (idVariante: number, cantidad: number) => void;
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
  const cantidadTotal = items.reduce((totalItems, item) => totalItems + item.cantidad, 0);

  return (
    <div className="cart-overlay fixed inset-0 z-[70] flex justify-end" role="presentation" onClick={onCerrar}>
      <aside
        className="cart-panel flex h-full w-[min(420px,100%)] flex-col shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="carrito-titulo"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="cart-header flex items-center justify-between">
          <div>
            <h2 id="carrito-titulo" className="text-base font-bold">Tu carrito</h2>
            <p className="cart-count">{cantidadTotal} {cantidadTotal === 1 ? 'producto' : 'productos'}</p>
          </div>
          <button type="button" className="cart-close grid place-items-center" onClick={onCerrar} aria-label="Cerrar carrito">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
              <path d="m6 6 12 12M18 6 6 18" />
            </svg>
          </button>
        </header>

        {vacio ? (
          <div className="cart-empty flex flex-1 flex-col items-center justify-center gap-2.5 p-8 text-center">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
              <path d="M6 8h12l-1 12H7L6 8Z" />
              <path d="M9 8V6a3 3 0 0 1 6 0v2" />
            </svg>
            <p className="font-semibold">Tu carrito está vacío</p>
            <span className="max-w-60 text-xs">Agrega productos desde la tienda para verlos aquí.</span>
          </div>
        ) : (
          <ul className="cart-items m-0 flex flex-1 list-none flex-col gap-2.5 overflow-y-auto">
            {items.map((item) => (
              <li className="cart-item flex items-center gap-3" key={item.idVariante}>
                <img src={item.imagen} alt={item.nombre} className="cart-image h-14 w-14 shrink-0 rounded-xl object-contain" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold">{item.nombre}</p>
                      {(item.color || item.talla !== 'unica') && <p className="cart-variant truncate">{[item.color, item.talla !== 'unica' ? item.talla : null].filter(Boolean).join(' / ')}</p>}
                      <p className="cart-unit-price">{formatearCLP(item.precio)} c/u</p>
                    </div>
                    <button
                      type="button"
                      className="cart-remove grid shrink-0 place-items-center"
                      onClick={() => onEliminar(item.idVariante)}
                      aria-label={`Eliminar ${item.nombre} del carrito`}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
                        <path d="M4 7h16" />
                        <path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
                        <path d="M6 7l1 13h10l1-13" />
                      </svg>
                    </button>
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-2">
                  <div className="cart-quantity flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => onRestar(item.idVariante)}
                      aria-label={`Quitar una unidad de ${item.nombre}`}
                    >
                      <span aria-hidden="true">−</span>
                    </button>
                    <input
                      type="number"
                      min={1}
                      max={item.stock}
                      value={item.cantidad}
                      onChange={(e) => onCantidad(item.idVariante, Number(e.target.value))}
                      aria-label={`Cantidad de ${item.nombre}`}
                    />
                    <button
                      type="button"
                      onClick={() => onSumar(item.idVariante)}
                      aria-label={`Agregar una unidad de ${item.nombre}`}
                    >
                      <span aria-hidden="true">+</span>
                    </button>
                  </div>

                  <p className="cart-line-total whitespace-nowrap text-sm font-bold">{formatearCLP(item.precio * item.cantidad)}</p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}

        <footer className="cart-footer flex flex-col gap-3">
          <div className="cart-subtotal flex items-baseline justify-between">
            <span>Subtotal</span>
            <span>{formatearCLP(total)}</span>
          </div>
          <div className="cart-total flex items-baseline justify-between">
            <span>Total</span>
            <strong>{formatearCLP(total)}</strong>
          </div>
          <button type="button" className="cart-checkout" onClick={onIrAPagar} disabled={vacio}>
            Ir a pagar <span aria-hidden="true">→</span>
          </button>
          <button type="button" className="cart-continue" onClick={onCerrar}>
            Seguir comprando
          </button>
        </footer>
      </aside>
    </div>
  );
}
