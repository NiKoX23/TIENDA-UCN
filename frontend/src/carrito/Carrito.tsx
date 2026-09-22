import { useEffect } from 'react';
import type { ItemCarrito } from '../hooks/useCarrito';
import { formatearCLP } from '../utils/precio';

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
    <div className="theme-dark-overlay fixed inset-0 z-[70] flex justify-end bg-slate-950/60 backdrop-blur-md" role="presentation" onClick={onCerrar}>
      <aside
        className="theme-dark-surface flex h-full w-[min(420px,100%)] flex-col border-l border-slate-400/15 bg-gradient-to-b from-slate-900 to-slate-950 shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="carrito-titulo"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b border-slate-400/15 px-5 py-5">
          <h2 id="carrito-titulo" className="text-base font-bold text-slate-100">tu carrito</h2>
          <button type="button" className="grid h-9 w-9 place-items-center rounded-lg border border-slate-400/15 bg-slate-900/60 text-slate-300 hover:border-violet-400/40 hover:bg-violet-500/15" onClick={onCerrar} aria-label="Cerrar carrito">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
              <path d="m6 6 12 12M18 6 6 18" />
            </svg>
          </button>
        </header>

        {vacio ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2.5 p-8 text-center text-slate-500">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
              <path d="M6 8h12l-1 12H7L6 8Z" />
              <path d="M9 8V6a3 3 0 0 1 6 0v2" />
            </svg>
            <p className="font-semibold text-slate-300">Tu carrito está vacío</p>
            <span className="max-w-60 text-xs">Agrega productos desde la tienda para verlos aquí.</span>
          </div>
        ) : (
          <ul className="m-0 flex flex-1 list-none flex-col gap-2.5 overflow-y-auto p-3">
            {items.map((item) => (
              <li className="theme-dark-surface flex flex-col gap-2.5 rounded-2xl border border-slate-400/10 bg-slate-800/75 p-3.5" key={item.codigoProducto}>
                <div className="flex items-center gap-3">
                <img src={item.imagen} alt="" className="h-14 w-14 rounded-lg bg-white/5 object-contain" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-slate-100">{item.nombre}</p>
                  <p className="text-xs text-slate-500">{formatearCLP(item.precio)} c/u</p>
                </div>
                </div>

                <div className="flex items-center justify-between gap-2.5">
                  <div className="flex items-center gap-1.5 rounded-lg border border-slate-400/15 bg-slate-950/60 p-1">
                    <button
                      type="button"
                      onClick={() => onRestar(item.codigoProducto)}
                      aria-label={`Quitar una unidad de ${item.nombre}`}
                    >
                      −
                    </button>
                    <input
                      type="number"
                      min={1}
                      value={item.cantidad}
                      onChange={(e) => onCantidad(item.codigoProducto, Number(e.target.value))}
                      aria-label={`Cantidad de ${item.nombre}`}
                    />
                    <button
                      type="button"
                      onClick={() => onSumar(item.codigoProducto)}
                      aria-label={`Agregar una unidad de ${item.nombre}`}
                    >
                      +
                    </button>
                  </div>

                  <p className="whitespace-nowrap text-sm font-bold text-cyan-300">{formatearCLP(item.precio * item.cantidad)}</p>

                  <button
                    type="button"
                    className="grid place-items-center rounded-lg p-1.5 text-slate-500 hover:bg-red-900/20 hover:text-red-300"
                    onClick={() => onEliminar(item.codigoProducto)}
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

        <footer className="flex flex-col gap-3 border-t border-slate-400/15 px-5 pb-5 pt-4">
          <div className="flex items-baseline justify-between text-slate-100">
            <span className="text-xs font-semibold text-slate-500">total</span>
            <strong className="text-xl">{formatearCLP(total)}</strong>
          </div>
          <button type="button" className="rounded-xl bg-gradient-to-r from-violet-600 via-blue-500 to-cyan-400 px-4 py-3 font-extrabold text-white shadow-lg shadow-violet-900/30 transition hover:-translate-y-0.5 hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none" onClick={onIrAPagar} disabled={vacio}>
            ir a pagar
          </button>
        </footer>
      </aside>
    </div>
  );
}
