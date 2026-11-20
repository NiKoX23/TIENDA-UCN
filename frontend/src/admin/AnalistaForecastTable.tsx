import type { DatosPrediccion } from '../services/analytics.service';
import { formatearCLP } from '../utils/precio';

interface AnalistaForecastTableProps {
  prediccion: DatosPrediccion;
}

function formatearMes(mes: string): string {
  const [year, month] = mes.slice(0, 7).split('-').map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString('es-CL', {
    month: 'long',
    year: 'numeric',
  });
}

function formatearVariacion(variacion: number | null): string {
  if (variacion === null) return '—';
  const valor = variacion.toLocaleString('es-CL', { maximumFractionDigits: 1 });
  return `${variacion > 0 ? '+' : ''}${valor}%`;
}

export default function AnalistaForecastTable({ prediccion }: AnalistaForecastTableProps) {
  const primerMesProyectado = prediccion.proyeccion[0]?.mes.slice(0, 7);
  const historico = [...prediccion.historico]
    .filter((dato) => dato.mes.slice(0, 7) < (primerMesProyectado ?? ''))
    .sort((a, b) => a.mes.localeCompare(b.mes));
  const ingresoAnterior = historico[historico.length - 1]?.ingreso;

  const filas = prediccion.proyeccion.map((dato, index) => {
    const base = index === 0
      ? ingresoAnterior
      : prediccion.proyeccion[index - 1]?.ingreso_estimado;
    const variacion = base !== undefined && base > 0
      ? ((dato.ingreso_estimado - base) / base) * 100
      : null;
    return { ...dato, variacion };
  });

  return (
    <article className="analista-card analista-forecast-table">
      <header>
        <h2>Detalle de meses proyectados</h2>
        <p className="analista-card__caption">
          Rango estimado según la variabilidad histórica; el límite inferior no puede ser menor que $0.
        </p>
      </header>
      {filas.length > 0 ? (
        <div
          className="analista-forecast-table__scroll"
          role="region"
          aria-label="Tabla de detalle de meses proyectados"
          tabIndex={0}
        >
          <table>
            <caption className="analista-visually-hidden">Ingresos proyectados y variación por mes</caption>
            <thead>
              <tr>
                <th scope="col">Mes</th>
                <th scope="col">Límite inferior</th>
                <th scope="col">Predicción</th>
                <th scope="col">Límite superior</th>
                <th scope="col">Variación</th>
              </tr>
            </thead>
            <tbody>
              {filas.map((fila) => (
                <tr key={fila.mes}>
                  <th scope="row">{formatearMes(fila.mes)}</th>
                  <td>{formatearCLP(fila.limite_inferior)}</td>
                  <td className="analista-forecast-table__estimate">{formatearCLP(fila.ingreso_estimado)}</td>
                  <td>{formatearCLP(fila.limite_superior)}</td>
                  <td>
                    <span className={`analista-forecast-table__change${fila.variacion === null ? ' analista-forecast-table__change--none' : fila.variacion > 0 ? ' analista-forecast-table__change--up' : fila.variacion < 0 ? ' analista-forecast-table__change--down' : ''}`}>
                      {formatearVariacion(fila.variacion)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="analista-forecast-table__empty" role="status">
          No hay meses proyectados para estos filtros.
        </p>
      )}
    </article>
  );
}
