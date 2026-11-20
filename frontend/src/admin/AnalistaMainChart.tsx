import { useMemo, useState } from 'react';
import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  LabelList,
  Legend,
  Line,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { TooltipContentProps, XAxisTickContentProps } from 'recharts';
import type { ResultadoAnalisis } from '../services/analytics.service';
import { formatearCLP } from '../utils/precio';

interface ChartRow {
  mes: string;
  real?: number;
  proyectado?: number;
  limiteInferior?: number;
  limiteSuperior?: number;
  banda?: number;
}

interface ProjectionMonthTickProps extends XAxisTickContentProps {
  projectionMonths: ReadonlySet<string>;
}

type ChartView = 'barras-linea' | 'acumulado';

const CLP_CORTO = new Intl.NumberFormat('es-CL', {
  style: 'currency',
  currency: 'CLP',
  notation: 'compact',
  maximumFractionDigits: 1,
});

function etiquetaMes(mes: string): string {
  const [year, month] = mes.slice(0, 7).split('-').map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString('es-CL', { month: 'short' });
}

function etiquetaMesLarga(mes: string): string {
  const [year, month] = mes.slice(0, 7).split('-').map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString('es-CL', {
    month: 'long',
    year: 'numeric',
  });
}

function prepararDatos(resultado: ResultadoAnalisis): ChartRow[] {
  const rows = new Map<string, ChartRow>();
  for (const dato of resultado.ingresos.datos) {
    const mes = dato.mes.slice(0, 7);
    rows.set(mes, { mes, real: Number(dato.ingreso) });
  }
  for (const dato of resultado.prediccion.proyeccion) {
    const mes = dato.mes.slice(0, 7);
    const row = rows.get(mes) ?? { mes };
    row.real = undefined;
    row.proyectado = Number(dato.ingreso_estimado);
    row.limiteInferior = Math.max(0, Number(dato.limite_inferior));
    row.limiteSuperior = Math.max(row.limiteInferior, Number(dato.limite_superior));
    row.banda = row.limiteSuperior - row.limiteInferior;
    rows.set(mes, row);
  }
  return [...rows.values()]
    .filter((row) => row.real !== undefined || row.proyectado !== undefined)
    .sort((a, b) => a.mes.localeCompare(b.mes));
}

function acumularDatos(rows: ChartRow[]): ChartRow[] {
  let total = 0;
  return rows.map((row) => {
    const acumulado: ChartRow = {
      mes: row.mes,
      real: row.real === undefined ? undefined : total + row.real,
      proyectado: row.proyectado === undefined ? undefined : total + row.proyectado,
      limiteInferior: row.limiteInferior === undefined
        ? undefined
        : Math.max(0, total + row.limiteInferior),
      limiteSuperior: row.limiteSuperior === undefined
        ? undefined
        : total + row.limiteSuperior,
    };
    if (acumulado.limiteInferior !== undefined && acumulado.limiteSuperior !== undefined) {
      acumulado.banda = Math.max(0, acumulado.limiteSuperior - acumulado.limiteInferior);
    }
    total = row.proyectado === undefined
      ? total + (row.real ?? 0)
      : total + row.proyectado;
    return acumulado;
  });
}

function ProjectionMonthTick({
  x,
  y,
  payload,
  textAnchor,
  projectionMonths,
}: ProjectionMonthTickProps) {
  const month = String(payload.value ?? '');
  const projected = projectionMonths.has(month);
  return (
    <g transform={`translate(${x},${y})`}>
      <text
        dy={14}
        textAnchor={textAnchor}
        fill={projected ? 'var(--warning)' : 'var(--ucn-blue)'}
        fontSize={11}
      >
        {etiquetaMes(month)}
      </text>
    </g>
  );
}

export default function AnalistaMainChart({ resultado }: { resultado: ResultadoAnalisis }) {
  const [vista, setVista] = useState<ChartView>('barras-linea');
  const datosMensuales = useMemo(() => prepararDatos(resultado), [resultado]);
  const datos = useMemo(
    () => vista === 'acumulado' ? acumularDatos(datosMensuales) : datosMensuales,
    [datosMensuales, vista],
  );
  const mesesProyectados = useMemo(
    () => new Set(resultado.prediccion.proyeccion.map((mes) => mes.mes.slice(0, 7))),
    [resultado.prediccion.proyeccion],
  );
  const primerMesProyectado = resultado.prediccion.proyeccion[0]?.mes.slice(0, 7);
  const ultimoMesProyectado = resultado.prediccion.proyeccion.at(-1)?.mes.slice(0, 7);
  const soloUnMesProyectado = resultado.prediccion.proyeccion.length === 1;
  const mesesReales = datosMensuales.filter((dato) => dato.real !== undefined);
  const ultimoMesReal = mesesReales[mesesReales.length - 1]?.mes;

  const tooltipContent = ({ active, label }: TooltipContentProps) => {
    if (!active || label === undefined) return null;
    const row = datos.find((dato) => dato.mes === String(label));
    if (!row) return null;

    return (
      <div className="analista-chart-tooltip">
        <strong className="analista-chart-tooltip__title">{etiquetaMesLarga(row.mes)}</strong>
        {row.real !== undefined && (
          <p><span>Real</span><strong>{formatearCLP(row.real)}</strong></p>
        )}
        {row.proyectado !== undefined && (
          <>
            <p><span>Predicción</span><strong>{formatearCLP(row.proyectado)}</strong></p>
            <p><span>Rango inferior</span><strong>{formatearCLP(row.limiteInferior ?? 0)}</strong></p>
            <p><span>Rango superior</span><strong>{formatearCLP(row.limiteSuperior ?? 0)}</strong></p>
          </>
        )}
        {vista === 'acumulado' && <small>Valores acumulados</small>}
      </div>
    );
  };

  const renderMonthTick = (props: XAxisTickContentProps) => (
    <ProjectionMonthTick {...props} projectionMonths={mesesProyectados} />
  );

  return (
    <article className="analista-card analista-main-chart">
      <header className="analista-main-chart__header">
        <div>
          <h2>Ingresos: histórico y proyección</h2>
          <p className="analista-card__caption">Ingresos reales, estimación y rango de confianza por mes</p>
        </div>
        <div className="analista-main-chart__controls" role="group" aria-label="Vista del gráfico">
          <button
            type="button"
            className="analista-main-chart__view"
            aria-pressed={vista === 'barras-linea'}
            onClick={() => setVista('barras-linea')}
          >
            Barras + línea
          </button>
          <button
            type="button"
            className="analista-main-chart__view"
            aria-pressed={vista === 'acumulado'}
            onClick={() => setVista('acumulado')}
          >
            Acumulado
          </button>
        </div>
      </header>
      <div className="analista-chart" role="region" aria-label="Ingresos históricos y proyección por mes">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={datos} margin={{ top: 28, right: 14, bottom: 8, left: 8 }}>
            <CartesianGrid stroke="var(--border)" vertical={false} />
            {primerMesProyectado && ultimoMesProyectado && (
              <ReferenceArea
                x1={primerMesProyectado}
                x2={ultimoMesProyectado}
                fill="var(--vcm-orange)"
                fillOpacity={0.1}
                stroke="none"
                zIndex={0}
                label={{
                  value: 'PROYECCIÓN',
                  position: 'insideTopRight',
                  fill: 'var(--warning)',
                  fontSize: 10,
                  fontWeight: 700,
                }}
              />
            )}
            {ultimoMesReal && (
              <ReferenceLine
                x={ultimoMesReal}
                stroke="var(--border-strong)"
                strokeDasharray="4 4"
                label={{
                  value: 'Último mes real',
                  position: soloUnMesProyectado ? 'insideBottomLeft' : 'insideTopLeft',
                  fill: 'var(--text-soft)',
                  fontSize: 10,
                }}
              />
            )}
            <XAxis
              dataKey="mes"
              tick={renderMonthTick}
              axisLine={{ stroke: 'var(--border)' }}
              tickLine={false}
            />
            <YAxis
              domain={[0, 'auto']}
              tickFormatter={(value: number) => CLP_CORTO.format(value)}
              tick={{ fill: 'var(--text-soft)', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              width={68}
            />
            <Tooltip content={tooltipContent} />
            <Legend />
            <Area
              dataKey="limiteInferior"
              stackId="confianza"
              name="Límite inferior"
              stroke="none"
              fill="transparent"
              legendType="none"
              tooltipType="none"
            />
            <Area
              dataKey="banda"
              stackId="confianza"
              name="Rango de confianza"
              stroke="none"
              fill="var(--vcm-orange)"
              fillOpacity={0.18}
            />
            <Bar
              dataKey="real"
              name="Real"
              stackId="ingresos"
              fill="var(--ucn-blue)"
              radius={[3, 3, 0, 0]}
              maxBarSize={28}
            />
            <Bar
              dataKey="proyectado"
              name="Proyectado"
              stackId="ingresos"
              fill="var(--vcm-orange)"
              stroke="var(--vcm-orange)"
              strokeDasharray="3 2"
              strokeWidth={1.5}
              radius={[3, 3, 0, 0]}
              maxBarSize={28}
            />
            <Line
              dataKey="proyectado"
              name="Predicción"
              type="monotone"
              stroke="var(--vcm-orange)"
              strokeWidth={2}
              strokeDasharray="5 4"
              dot={{ r: 4, fill: 'var(--vcm-orange)', stroke: 'var(--card)' }}
              activeDot={{ r: 5 }}
              legendType="none"
            >
              <LabelList
                dataKey="proyectado"
                position="top"
                fill="var(--warning)"
                fontSize={10}
                formatter={(value) => CLP_CORTO.format(Number(value ?? 0))}
              />
            </Line>
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </article>
  );
}
