import type { ResultadoAnalisis } from '../services/analytics.service';
import { formatearCLP } from '../utils/precio';

type SummaryTone = 'stable' | 'leader' | 'alert' | 'up' | 'down' | 'neutral';

interface SummaryItem {
  label: string;
  tone: SummaryTone;
  text: string;
}

function generarResumen(resultado: ResultadoAnalisis): SummaryItem[] {
  const resumen = resultado.resumen;
  const periodo = resumen.meses === 1 ? 'el próximo mes' : `los próximos ${resumen.meses} meses`;
  const tendencia = resumen.tendencia === 'alza'
    ? 'al alza'
    : resumen.tendencia === 'baja'
      ? 'a la baja'
      : 'prácticamente estables';
  const variacion = resumen.variacion_porcentual;
  const trendItem: SummaryItem = {
    label: variacion === null
      ? 'Sin base'
      : resumen.tendencia === 'alza'
        ? 'Alza'
        : resumen.tendencia === 'baja'
          ? 'Baja'
          : 'Estable',
    tone: variacion === null
      ? 'neutral'
      : resumen.tendencia === 'alza'
        ? 'up'
        : resumen.tendencia === 'baja'
          ? 'down'
          : 'stable',
    text: variacion === null
      ? `Para ${periodo}, se estiman ingresos por ${formatearCLP(resumen.ingreso_total_estimado)}. No hay un periodo anterior comparable para calcular la variación.`
      : `Para ${periodo}, se proyectan ventas ${tendencia}, con ingresos estimados de ${formatearCLP(resumen.ingreso_total_estimado)}. La variación es de ${Math.abs(variacion).toLocaleString('es-CL', { maximumFractionDigits: 1 })}% ${variacion >= 0 ? 'más' : 'menos'} que el periodo anterior comparable.`,
  };
  const top = resumen.top_productos_esperados[0];
  const baja = resumen.productos_en_baja[0]?.producto;
  const reponer = resumen.productos_a_reponer[0];
  const items = [trendItem];

  if (top) {
    items.push({
      label: 'Líder',
      tone: 'leader',
      text: `El producto con mayor ingreso proyectado es ${top.producto}, con ${formatearCLP(top.ingreso_estimado)} para el periodo.`,
    });
  }
  if (baja) {
    items.push({
      label: 'Alerta',
      tone: 'alert',
      text: top?.producto === baja
        ? `Aunque lidera el ingreso proyectado, ${baja} tendría un ingreso mensual promedio inferior al de su último mes con ventas.`
        : `La proyección mensual de ${baja} queda por debajo de su último mes con ventas.`,
    });
  }
  if (reponer) {
    items.push({
      label: 'Alerta',
      tone: 'alert',
      text: `El stock de ${reponer.producto} (${reponer.stock} unidades) ${reponer.stock < reponer.stock_minimo ? 'está bajo' : 'llegó al'} mínimo (${reponer.stock_minimo}); conviene revisar su reposición.`,
    });
  }
  return items;
}

export default function AnalistaSummaryCard({ resultado }: { resultado: ResultadoAnalisis }) {
  const items = generarResumen(resultado);
  const pocosDatos = resultado.prediccion.pocos_datos || resultado.resumen.pocos_datos;

  return (
    <article className="analista-card analista-summary">
      <h2>Resumen del análisis</h2>
      {pocosDatos && (
        <p className="analista-summary__notice" role="status" aria-live="polite">
          Hay pocos datos históricos disponibles. La predicción puede tener menor precisión.
        </p>
      )}
      <div className="analista-summary__items">
        {items.map((item, index) => (
          <div className="analista-summary__item" key={`${item.label}-${index}`}>
            <span className={`analista-summary__badge analista-summary__badge--${item.tone}`}>
              {item.label}
            </span>
            <p>{item.text}</p>
          </div>
        ))}
      </div>
      <small>
        Modelo utilizado: {resultado.prediccion.modelo.replaceAll('_', ' ')}.
        {' '}La predicción se calcula con el historial de ventas completadas.
      </small>
    </article>
  );
}
