interface PaginacionProps {
  pagina: number;
  totalPaginas: number;
  total: number;
  desde: number;
  hasta: number;
  mostrarTodos?: boolean;
  /** Nombre de lo que se pagina, en plural: "productos", "ventas"… */
  etiqueta?: string;
  onCambiar: (pagina: number) => void;
  onAlternarMostrarTodos?: () => void;
  className?: string;
}

type Elemento = number | 'hueco';

/** Primera, última y vecinas de la actual; un hueco solo cuando oculta 2 o más páginas. */
function elementos(pagina: number, total: number): Elemento[] {
  const base = [1, total, pagina - 1, pagina, pagina + 1].filter((n) => n >= 1 && n <= total);
  const unicas = [...new Set(base)].sort((a, b) => a - b);
  const salida: Elemento[] = [];
  unicas.forEach((n, i) => {
    const previa = unicas[i - 1];
    if (i > 0 && n - previa === 2) salida.push(previa + 1);
    else if (i > 0 && n - previa > 2) salida.push('hueco');
    salida.push(n);
  });
  return salida;
}

const Flecha = ({ direccion }: { direccion: 'izquierda' | 'derecha' }) => (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={direccion === 'izquierda' ? 'm15 6-6 6 6 6' : 'm9 6 6 6-6 6'} />
  </svg>
);

export default function Paginacion({
  pagina,
  totalPaginas,
  total,
  desde,
  hasta,
  mostrarTodos = false,
  etiqueta = 'resultados',
  onCambiar,
  onAlternarMostrarTodos,
  className = '',
}: PaginacionProps) {
  if (totalPaginas <= 1 && !mostrarTodos) return null;

  return (
    <nav className={`vcm-pager ${className}`} aria-label={`Paginación de ${etiqueta}`}>
      <p className="vcm-pager__summary" aria-live="polite">
        Mostrando <strong>{desde}–{hasta}</strong> de <strong>{total}</strong> {etiqueta}
      </p>

      <div className="vcm-pager__list">
        {!mostrarTodos && (
          <>
            <button
              type="button"
              className="vcm-pager__btn"
              disabled={pagina <= 1}
              aria-label="Página anterior"
              onClick={() => onCambiar(pagina - 1)}
            >
              <Flecha direccion="izquierda" />
            </button>

            {elementos(pagina, totalPaginas).map((el, i) =>
              el === 'hueco' ? (
                <span key={`hueco-${i}`} className="vcm-pager__gap" aria-hidden="true">…</span>
              ) : (
                <button
                  key={el}
                  type="button"
                  className="vcm-pager__btn vcm-pager__btn--num"
                  aria-current={el === pagina ? 'page' : undefined}
                  aria-label={el === pagina ? `Página ${el}, página actual` : `Ir a la página ${el}`}
                  onClick={() => onCambiar(el)}
                >
                  {el}
                </button>
              ),
            )}

            <span className="vcm-pager__mobile" aria-hidden="true">{pagina} / {totalPaginas}</span>

            <button
              type="button"
              className="vcm-pager__btn"
              disabled={pagina >= totalPaginas}
              aria-label="Página siguiente"
              onClick={() => onCambiar(pagina + 1)}
            >
              <Flecha direccion="derecha" />
            </button>
          </>
        )}
      </div>
      {onAlternarMostrarTodos && (
        <div className="vcm-pager__all">
          <button
            type="button"
            className="vcm-btn vcm-btn--surface vcm-btn--sm"
            aria-pressed={mostrarTodos}
            onClick={onAlternarMostrarTodos}
          >
            {mostrarTodos ? 'Volver a paginar' : 'Mostrar todos'}
          </button>
        </div>
      )}
    </nav>
  );
}
