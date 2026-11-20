import type { DatosPrediccion, DatosResumenAnalisis } from '../services/analytics.service';
import { formatearCLP } from '../utils/precio';

interface AnalistaKpiCardsProps {
  prediccion: DatosPrediccion;
  resumen: DatosResumenAnalisis;
}

function formatearMes(mes: string): string {
  const [year, month] = mes.slice(0, 7).split('-').map(Number);
  if (!year || !month) return mes;

  const nombre = new Date(year, month - 1, 1).toLocaleDateString('es-CL', {
    month: 'long',
    year: 'numeric',
  });
  return `${nombre.charAt(0).toLocaleUpperCase('es-CL')}${nombre.slice(1)}`;
}

export default function AnalistaKpiCards({ prediccion, resumen }: AnalistaKpiCardsProps) {
  const ingresoTotal = prediccion.proyeccion.reduce(
    (total, mes) => total + mes.ingreso_estimado,
    0,
  );
  const limiteInferior = prediccion.proyeccion.reduce(
    (total, mes) => total + mes.limite_inferior,
    0,
  );
  const limiteSuperior = prediccion.proyeccion.reduce(
    (total, mes) => total + mes.limite_superior,
    0,
  );
  const mesMayorIngreso = prediccion.proyeccion.reduce<
    DatosPrediccion['proyeccion'][number] | undefined
  >((mayor, mes) => !mayor || mes.ingreso_estimado > mayor.ingreso_estimado ? mes : mayor, undefined);
  const tendencia = resumen.variacion_porcentual === null ? 'sin-base' : resumen.tendencia;
  const etiquetaTendencia = tendencia === 'sin-base'
    ? 'Sin base'
    : tendencia === 'alza'
      ? 'Alza'
      : tendencia === 'baja'
        ? 'Baja'
        : 'Estable';
  const variacion = resumen.variacion_porcentual === null
    ? 'No hay periodo comparable'
    : `${resumen.variacion_porcentual > 0 ? '+' : ''}${resumen.variacion_porcentual.toLocaleString('es-CL', { maximumFractionDigits: 1 })}%`;

  return (
    <section className="analista-kpis" aria-label="Indicadores clave de la proyección">
      <article className="analista-kpi">
        <h2 className="analista-kpi__title">Ingreso proyectado total</h2>
        <p className="analista-kpi__value">{formatearCLP(ingresoTotal)}</p>
        <p className="analista-kpi__detail">
          Rango: {formatearCLP(limiteInferior)} – {formatearCLP(limiteSuperior)}
        </p>
      </article>

      <article className="analista-kpi">
        <h2 className="analista-kpi__title">Variación vs. periodo anterior</h2>
        <div className="analista-kpi__value-row">
          <p className="analista-kpi__value">{variacion}</p>
          <span className={`analista-kpi__pill analista-kpi__pill--${tendencia}`}>
            {etiquetaTendencia}
          </span>
        </div>
        <p className="analista-kpi__detail">
          {resumen.variacion_porcentual === null
            ? 'Sin base histórica para comparar'
            : `Periodo anterior: ${formatearCLP(resumen.periodo_anterior_ingreso)}`}
        </p>
      </article>

      <article className="analista-kpi">
        <h2 className="analista-kpi__title">Mes con mayor ingreso</h2>
        <p className="analista-kpi__value">
          {mesMayorIngreso ? formatearMes(mesMayorIngreso.mes) : 'Sin proyección'}
        </p>
        <p className="analista-kpi__detail">
          {mesMayorIngreso ? `${formatearCLP(mesMayorIngreso.ingreso_estimado)} estimados` : 'No hay meses proyectados'}
        </p>
      </article>

      <article className="analista-kpi">
        <h2 className="analista-kpi__title">Productos bajo el mínimo</h2>
        <p className="analista-kpi__value">{resumen.productos_bajo_minimo}</p>
        <p className="analista-kpi__detail">Revisar reposición de stock</p>
      </article>
    </section>
  );
}
