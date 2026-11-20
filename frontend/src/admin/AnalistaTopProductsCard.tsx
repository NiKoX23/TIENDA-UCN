import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { DatosPrediccion } from '../services/analytics.service';
import { formatearCLP } from '../utils/precio';

const CLP_CORTO = new Intl.NumberFormat('es-CL', {
  style: 'currency',
  currency: 'CLP',
  notation: 'compact',
  maximumFractionDigits: 1,
});

export default function AnalistaTopProductsCard({ prediccion }: { prediccion: DatosPrediccion }) {
  const productos = [...prediccion.productos]
    .sort((a, b) => b.ingreso_estimado - a.ingreso_estimado)
    .slice(0, 5);

  return (
    <article className="analista-card analista-top-products">
      <header>
        <h2>Top productos proyectados</h2>
        <p className="analista-card__caption">Ingreso estimado para el periodo</p>
      </header>
      {productos.length > 0 ? (
        <div
          className="analista-top-products__chart"
          role="region"
          aria-label="Productos con mayores ingresos proyectados"
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={productos}
              layout="vertical"
              margin={{ top: 8, right: 68, bottom: 4, left: 0 }}
              barCategoryGap={14}
            >
              <CartesianGrid stroke="var(--border)" horizontal={false} />
              <XAxis type="number" hide />
              <YAxis
                type="category"
                dataKey="producto"
                width={112}
                tick={{ fill: 'var(--text-soft)', fontSize: 10 }}
                tickFormatter={(nombre: string) => nombre.length > 18 ? `${nombre.slice(0, 17)}…` : nombre}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                cursor={false}
                formatter={(value) => formatearCLP(Number(value ?? 0))}
                contentStyle={{
                  borderColor: 'var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--surface-strong)',
                  color: 'var(--text)',
                }}
                itemStyle={{ color: 'var(--text)' }}
                labelStyle={{ color: 'var(--text)' }}
              />
              <Bar
                dataKey="ingreso_estimado"
                name="Ingreso estimado"
                fill="var(--vcm-orange)"
                radius={[0, 3, 3, 0]}
                maxBarSize={28}
              >
                <LabelList
                  dataKey="ingreso_estimado"
                  position="right"
                  fill="var(--text)"
                  fontSize={10}
                  formatter={(value) => CLP_CORTO.format(Number(value ?? 0))}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <p className="analista-top-products__empty" role="status">
          No hay productos con ingresos proyectados para estos filtros.
        </p>
      )}
    </article>
  );
}
