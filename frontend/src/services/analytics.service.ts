import { api } from './api';

export interface IngresoMensual {
  mes: string;
  unidades: number;
  ingreso: number;
}

export interface ProyeccionMensual {
  mes: string;
  ingreso_estimado: number;
  limite_inferior: number;
  limite_superior: number;
}

export interface ProductoEsperado {
  producto_id: string;
  producto: string;
  categoria: string;
  ingreso_estimado: number;
  ultimo_ingreso: number;
}

export interface DatosIngresos {
  meses_hist: number;
  datos: IngresoMensual[];
}

export interface DatosPrediccion {
  meses: number;
  modelo: string;
  pocos_datos: boolean;
  historico: Array<{ mes: string; ingreso: number }>;
  proyeccion: ProyeccionMensual[];
  productos: ProductoEsperado[];
}

export interface ProductoReponer {
  producto_id: string;
  producto: string;
  stock: number;
  stock_minimo: number;
}

export interface DatosResumenAnalisis {
  meses: number;
  tendencia: 'alza' | 'baja' | 'estable';
  variacion_porcentual: number | null;
  ingreso_total_estimado: number;
  periodo_anterior_ingreso: number;
  productos_bajo_minimo: number;
  pocos_datos: boolean;
  top_productos_esperados: Array<Pick<ProductoEsperado, 'producto_id' | 'producto' | 'ingreso_estimado'>>;
  productos_en_baja: Array<Pick<ProductoEsperado, 'producto_id' | 'producto'>>;
  productos_a_reponer: ProductoReponer[];
}

export interface FiltrosAnalisis {
  mesesHist: number;
  categoria?: string;
  productoId?: string;
  meses: number;
}

export interface ResultadoAnalisis {
  ingresos: DatosIngresos;
  prediccion: DatosPrediccion;
  resumen: DatosResumenAnalisis;
}

export async function obtenerAnalisis(
  filtros: FiltrosAnalisis,
  signal?: AbortSignal,
): Promise<ResultadoAnalisis> {
  const params = {
    categoria: filtros.categoria || undefined,
    producto_id: filtros.productoId || undefined,
  };
  const [ingresos, prediccion, resumen] = await Promise.all([
    api.get<DatosIngresos>('/analista/ingresos', {
      params: { ...params, meses_hist: filtros.mesesHist }, signal,
    }),
    api.get<DatosPrediccion>('/analista/prediccion', {
      params: { ...params, meses: filtros.meses }, signal,
    }),
    api.get<DatosResumenAnalisis>('/analista/resumen', {
      params: { ...params, meses: filtros.meses }, signal,
    }),
  ]);
  return {
    ingresos: ingresos.data,
    prediccion: prediccion.data,
    resumen: resumen.data,
  };
}
